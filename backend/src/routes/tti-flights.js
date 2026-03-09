/**
 * TTI/ZENITH API proxy for Air Astra flight search
 * Docs: https://emea.ttinteractive.com/Contenu/Documentation/PublicApi/Html/Default.html
 */

const TTI_API_URL = process.env.TTI_API_URL || 'http://tstws2.ttinteractive.com/Zenith/TTI.PublicApi.Services/JsonSaleEngineService.svc';
const TTI_API_KEY = process.env.TTI_API_KEY || '';

/**
 * Call a TTI JSON WCF endpoint
 */
async function ttiRequest(method, body) {
  const url = `${TTI_API_URL}/${method}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`TTI ${method} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

/**
 * Search flights via TTI SearchFlights endpoint
 * @param {object} params - { origin, destination, departDate, returnDate?, adults, children, infants, cabinClass }
 * @returns {object} normalized flight results
 */
async function searchFlights({ origin, destination, departDate, returnDate, adults = 1, children = 0, infants = 0, cabinClass }) {
  if (!TTI_API_KEY) throw new Error('TTI_API_KEY not configured');

  // Build passengers
  const passengers = [];
  if (adults > 0) passengers.push({ PassengerTypeCode: 'ADT', PassengerQuantity: parseInt(adults) });
  if (children > 0) passengers.push({ PassengerTypeCode: 'CHD', PassengerQuantity: parseInt(children) });
  if (infants > 0) passengers.push({ PassengerTypeCode: 'INF', PassengerQuantity: parseInt(infants) });

  // Build origin-destinations
  const originDestinations = [
    { OriginCode: origin, DestinationCode: destination, TargetDate: `/Date(${new Date(departDate).getTime()})/` }
  ];
  if (returnDate) {
    originDestinations.push(
      { OriginCode: destination, DestinationCode: origin, TargetDate: `/Date(${new Date(returnDate).getTime()})/` }
    );
  }

  const fareSettings = {};
  if (cabinClass) {
    // Map cabin class to TTI booking class codes if needed
    fareSettings.SaleCurrencyCode = 'BDT';
  }

  const request = {
    RequestInfo: { AuthenticationKey: TTI_API_KEY },
    Passengers: passengers,
    OriginDestinations: originDestinations,
    FareDisplaySettings: { SaleCurrencyCode: 'BDT' },
  };

  const response = await ttiRequest('SearchFlights', request);

  // Check for errors
  if (response.ResponseInfo && response.ResponseInfo.Errors && response.ResponseInfo.Errors.length > 0) {
    const errMsg = response.ResponseInfo.Errors.map(e => e.Message || e.Code || 'Unknown').join('; ');
    throw new Error(`TTI search error: ${errMsg}`);
  }

  return normalizeTTIResponse(response, origin, destination);
}

/**
 * Parse TTI /Date(timestamp)/ format
 */
function parseTTIDate(dateStr) {
  if (!dateStr) return null;
  const match = dateStr.match(/\/Date\((-?\d+)([+-]\d{4})?\)\//);
  if (match) return new Date(parseInt(match[1]));
  return new Date(dateStr);
}

/**
 * Format duration minutes to "Xh Ym"
 */
function formatDuration(minutes) {
  if (!minutes) return '';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m}m`;
}

/**
 * Normalize TTI SearchFlightsResponse into our standard format
 */
function normalizeTTIResponse(response, originCode, destinationCode) {
  const segments = response.Segments || [];
  const fareInfo = response.FareInfo || {};
  const itineraries = fareInfo.Itineraries || [];
  const etTicketFares = fareInfo.ETTicketFares || [];

  // Build segment map by Ref
  const segmentMap = {};
  for (const seg of segments) {
    segmentMap[seg.Ref] = seg;
  }

  // Build itinerary-to-fare map
  const itinFareMap = {};
  for (const fare of etTicketFares) {
    if (fare.RefItinerary) {
      if (!itinFareMap[fare.RefItinerary]) itinFareMap[fare.RefItinerary] = [];
      itinFareMap[fare.RefItinerary].push(fare);
    }
  }

  const flights = [];

  for (const itin of itineraries) {
    const airODs = itin.AirOriginDestinations || [];
    const fares = itinFareMap[itin.Ref] || [];

    // Get total price from itinerary SaleCurrencyAmount or sum fares
    let totalPrice = 0;
    let currency = 'BDT';
    if (itin.SaleCurrencyAmount) {
      totalPrice = itin.SaleCurrencyAmount.Amount || itin.SaleCurrencyAmount.Value || 0;
      currency = itin.SaleCurrencyAmount.CurrencyCode || 'BDT';
    } else if (fares.length > 0) {
      for (const f of fares) {
        if (f.SaleCurrencyAmount) {
          totalPrice += f.SaleCurrencyAmount.Amount || f.SaleCurrencyAmount.Value || 0;
          currency = f.SaleCurrencyAmount.CurrencyCode || currency;
        }
      }
    }

    // Extract segments for this itinerary
    const itinSegments = [];
    for (const od of airODs) {
      const segRefs = od.SegmentReferences || od.Segments || [];
      for (const segRef of segRefs) {
        const ref = segRef.Ref || segRef.RefSegment || segRef;
        const seg = segmentMap[ref] || segmentMap[segRef];
        if (seg) itinSegments.push(seg);
      }
    }

    if (itinSegments.length === 0) continue;

    // Build leg details
    const legs = itinSegments.map(seg => {
      const fi = seg.FlightInfo || {};
      return {
        origin: seg.OriginCode,
        destination: seg.DestinationCode,
        departureTime: parseTTIDate(fi.DepartureDate)?.toISOString() || null,
        arrivalTime: parseTTIDate(fi.ArrivalDate)?.toISOString() || null,
        durationMinutes: fi.DurationMinutes || 0,
        duration: formatDuration(fi.DurationMinutes),
        flightNumber: `${seg.AirlineDesignator || ''}${fi.FlightNumber || ''}`,
        airlineCode: seg.AirlineDesignator || '',
        operatingAirline: fi.OperatingAirlineDesignator || seg.AirlineDesignator || '',
        aircraft: fi.EquipmentText || fi.EquipmentCode || '',
        originTerminal: fi.OriginAirportTerminal || '',
        destinationTerminal: fi.DestinationAirportTerminal || '',
        stops: (fi.Stops || []).map(s => ({
          code: s.AirportCode || s.Code || '',
          duration: s.DurationMinutes || 0,
        })),
      };
    });

    const firstLeg = legs[0];
    const lastLeg = legs[legs.length - 1];

    // Total duration
    let totalDurationMin = 0;
    for (const leg of legs) totalDurationMin += leg.durationMinutes;
    // Add layover time between legs
    for (let i = 1; i < legs.length; i++) {
      if (legs[i].departureTime && legs[i - 1].arrivalTime) {
        const layover = (new Date(legs[i].departureTime).getTime() - new Date(legs[i - 1].arrivalTime).getTime()) / 60000;
        if (layover > 0) totalDurationMin += layover;
      }
    }

    const stopsCount = legs.length - 1;
    const stopCodes = legs.slice(0, -1).map(l => l.destination);

    // Get fare details
    const fareDetails = [];
    for (const f of fares) {
      const odFares = f.OriginDestinationFares || [];
      for (const odf of odFares) {
        const couponFares = odf.ETCouponFares || odf.CouponFares || [];
        for (const cf of couponFares) {
          fareDetails.push({
            fareBasis: cf.FareBasisCode || '',
            bookingClass: cf.BookingClassCode || '',
            cabinClass: cf.CabinClassCode || '',
          });
        }
      }
    }

    const cabinClass = fareDetails[0]?.cabinClass || '';
    const cabinName = cabinClass === 'Y' ? 'Economy' : cabinClass === 'C' ? 'Business' : cabinClass === 'F' ? 'First' : cabinClass === 'W' ? 'Premium Economy' : cabinClass || 'Economy';

    flights.push({
      id: `tti-${itin.Ref}`,
      source: 'tti',
      airline: getAirlineName(firstLeg.airlineCode),
      airlineCode: firstLeg.airlineCode,
      airlineLogo: null, // Frontend has the logo map
      flightNumber: firstLeg.flightNumber,
      origin: firstLeg.origin,
      destination: lastLeg.destination,
      departureTime: firstLeg.departureTime,
      arrivalTime: lastLeg.arrivalTime,
      duration: formatDuration(totalDurationMin),
      durationMinutes: totalDurationMin,
      stops: stopsCount,
      stopCodes: stopCodes,
      cabinClass: cabinName,
      price: totalPrice,
      currency: currency,
      refundable: false, // TTI doesn't provide this in search
      baggage: '20kg',
      aircraft: firstLeg.aircraft,
      legs: legs,
      itineraryRef: itin.Ref,
      validatingAirline: itin.ValidatingAirlineDesignator || firstLeg.airlineCode,
      fareDetails: fareDetails,
      // Store raw for PrepareFlights later
      _ttiItineraryRef: itin.Ref,
    });
  }

  return flights;
}

/**
 * Airline code to name mapping (Air Astra & common airlines)
 */
function getAirlineName(code) {
  const names = {
    'S2': 'Air Astra',
    'BG': 'Biman Bangladesh',
    'BS': 'US-Bangla Airlines',
    'VQ': 'Novoair',
    'RX': 'Regent Airways',
    'EK': 'Emirates',
    'QR': 'Qatar Airways',
    'SQ': 'Singapore Airlines',
    'TG': 'Thai Airways',
    '6E': 'IndiGo',
    'G9': 'Air Arabia',
    'MH': 'Malaysia Airlines',
    'TK': 'Turkish Airlines',
    'CX': 'Cathay Pacific',
    'AI': 'Air India',
    'UL': 'SriLankan Airlines',
    'SV': 'Saudi Arabian Airlines',
    'FZ': 'flydubai',
    'WY': 'Oman Air',
    'GF': 'Gulf Air',
    'PG': 'Bangkok Airways',
    'OZ': 'Asiana Airlines',
    'KE': 'Korean Air',
    'NH': 'ANA',
    'JL': 'Japan Airlines',
    'LH': 'Lufthansa',
    'BA': 'British Airways',
    'AF': 'Air France',
    'KL': 'KLM',
    'LO': 'LOT Polish Airlines',
    'SK': 'SAS',
    'ET': 'Ethiopian Airlines',
  };
  return names[code] || code;
}

module.exports = { searchFlights, ttiRequest, getAirlineName };
