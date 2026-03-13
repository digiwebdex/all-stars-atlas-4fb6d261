/**
 * Ancillary services API — Seat Maps, Extra Baggage, Meals
 * 100% API-driven — NO mock/fallback data. Zero-mock enforcement.
 *
 * Strategy (Option C — Hybrid):
 *   PRE-BOOKING:  BFM search data (baggage allowance from search results)
 *   POST-BOOKING: Sabre SOAP GAO (requires PNR) → TTI
 *   Seat Maps:    Sabre SOAP EnhancedSeatMapRQ (no PNR needed)
 *
 * If no real data available, return empty arrays.
 */

const express = require('express');
const router = express.Router();

// Lazy-load to avoid circular deps
let _ttiHelpers = null;
function getTTIHelpers() {
  if (!_ttiHelpers) {
    try { _ttiHelpers = require('./tti-flights'); } catch { _ttiHelpers = {}; }
  }
  return _ttiHelpers;
}

let _sabreSoap = null;
function getSabreSoap() {
  if (!_sabreSoap) {
    try { _sabreSoap = require('./sabre-soap'); } catch { _sabreSoap = {}; }
  }
  return _sabreSoap;
}

/**
 * GET /api/flights/ancillaries
 *
 * Pre-booking (no PNR): Returns BFM-extracted baggage as includedBaggage.
 *   Meals/extra baggage arrays will be empty (GAO needs PNR).
 *
 * Post-booking (with PNR): Tries Sabre SOAP GAO → TTI for real ancillary offers.
 */
router.get('/ancillaries', async (req, res) => {
  try {
    const {
      airlineCode, origin, destination, itineraryRef, cabinClass,
      flightNumber, departureDate, departureTime, adults, children,
      pnr, // POST-BOOKING: PNR/booking ref for GAO
    } = req.query;

    let meals = [];
    let baggage = [];
    let source = 'none';

    // ── POST-BOOKING PATH: Sabre SOAP GAO (requires PNR context) ──
    if (pnr && airlineCode && flightNumber && origin && destination && departureDate) {
      try {
        const sabreSoap = getSabreSoap();
        if (sabreSoap.getAncillaryOffers) {
          console.log(`[Ancillaries] Trying Sabre SOAP GAO (PNR: ${pnr}) for ${airlineCode}${flightNumber} ${origin}-${destination}`);
          const sabreResult = await sabreSoap.getAncillaryOffers({
            origin, destination, departureDate, departureTime,
            marketingCarrier: airlineCode, flightNumber,
            cabinClass: cabinClass || 'Economy',
            adults: parseInt(adults) || 1,
            children: parseInt(children) || 0,
            pnr, // Pass PNR for booking-context GAO
          });

          if (sabreResult && !sabreResult._error) {
            source = 'sabre';
            if (sabreResult.meals?.length > 0) {
              meals = sabreResult.meals.map(m => ({
                id: m.id || m.code, code: m.code, name: m.name,
                price: m.price || 0, description: m.description || m.name,
                category: 'airline', currency: m.currency || 'BDT',
              }));
            }
            if (sabreResult.baggage?.length > 0) {
              baggage = sabreResult.baggage.map(b => ({
                id: b.id || b.code, name: b.name,
                price: b.price || 0, weight: b.weight || null,
                description: b.description || b.name, type: 'checked',
                currency: b.currency || 'BDT',
              }));
            }
            console.log(`[Ancillaries] Sabre SOAP GAO: ${meals.length} meals, ${baggage.length} baggage options`);
          } else {
            console.log(`[Ancillaries] Sabre SOAP GAO returned error: ${sabreResult?._error ? sabreResult.message : 'no data'}`);
          }
        }
      } catch (sabreErr) {
        console.log(`[Ancillaries] Sabre SOAP GAO failed: ${sabreErr.message}`);
      }
    }

    // ── POST-BOOKING FALLBACK: TTI — for Air Astra / S2 airlines ──
    if (source === 'none' && pnr && ['2A', 'S2'].includes(airlineCode) && itineraryRef) {
      try {
        const tti = getTTIHelpers();
        if (tti.getTTIConfig && tti.ttiRequest) {
          const config = await tti.getTTIConfig();
          if (config) {
            const ancillaryRequest = {
              RequestInfo: { AuthenticationKey: config.key },
              ItineraryRef: itineraryRef,
              ServiceTypes: ['MEAL', 'BAGGAGE', 'SEAT'],
            };
            try {
              const response = await tti.ttiRequest('GetAncillaries', ancillaryRequest);
              if (response && !response.ResponseInfo?.Error) {
                source = 'tti';
                if (response.Meals?.length > 0) {
                  meals = response.Meals.map(m => ({
                    id: m.Code || m.Ref, code: m.Code, name: m.Name || m.Description,
                    price: m.Amount || 0, description: m.Description || '', category: 'airline',
                  }));
                }
                if (response.BaggageOptions?.length > 0) {
                  baggage = response.BaggageOptions.map(b => ({
                    id: b.Code || b.Ref, name: b.Name || `+${b.Weight}kg`,
                    price: b.Amount || 0, weight: b.Weight || null,
                    description: b.Description || '', type: 'checked',
                  }));
                }
                console.log(`[Ancillaries] TTI data loaded for ${airlineCode}`);
              }
            } catch (ttiErr) {
              console.log(`[Ancillaries] TTI not available: ${ttiErr.message}`);
            }
          }
        }
      } catch (err) {
        console.log('[Ancillaries] TTI config not available');
      }
    }

    // ── PRE-BOOKING: BFM-sourced included baggage (always available from search) ──
    if (source === 'none' && !pnr) {
      source = 'bfm';
      console.log(`[Ancillaries] Pre-booking mode — returning BFM baggage data for ${airlineCode}${flightNumber}`);
    }

    // Included baggage comes from BFM search results (passed as query params)
    const includedChecked = req.query.checkedBaggage || null;
    const includedCabin = req.query.handBaggage || null;

    res.json({
      meals,
      baggage,
      source,
      includedBaggage: {
        checked: includedChecked || null,
        cabin: includedCabin || null,
      },
      airline: airlineCode,
      // Signal to frontend whether GAO data is available (post-booking only)
      gaoAvailable: source === 'sabre' || source === 'tti',
      preBooking: !pnr,
    });
  } catch (err) {
    console.error('[Ancillaries] Error:', err.message);
    res.status(500).json({ message: 'Failed to load ancillary services' });
  }
});

/**
 * GET /api/flights/seat-map
 * Priority: Sabre SOAP → TTI → No data (zero-mock)
 * NO generated/fake layouts. Real API data only.
 * NOTE: EnhancedSeatMapRQ does NOT require PNR — works pre-booking!
 */
router.get('/seat-map', async (req, res) => {
  try {
    const { airlineCode, flightNumber, aircraft, itineraryRef, cabinClass, origin, destination, departureDate } = req.query;

    let seatLayout = null;
    let source = 'none';

    // ── Priority 1: Sabre SOAP — real seat map for any airline (no PNR needed) ──
    if (airlineCode && flightNumber && origin && destination && departureDate) {
      try {
        const sabreSoap = getSabreSoap();
        if (sabreSoap.getSeatMap) {
          console.log(`[SeatMap] Trying Sabre SOAP for ${airlineCode}${flightNumber} ${origin}-${destination}`);
          const BD_AIRPORTS = ['DAC', 'CXB', 'CGP', 'ZYL', 'JSR', 'RJH', 'SPD', 'BZL', 'IRD', 'TKR'];
          const isDomestic = BD_AIRPORTS.includes(origin) && BD_AIRPORTS.includes(destination);

          const sabreResult = await sabreSoap.getSeatMap({
            origin, destination, departureDate,
            marketingCarrier: airlineCode,
            operatingCarrier: airlineCode,
            flightNumber: flightNumber.replace(/^[A-Z]{2}/i, ''),
            cabinClass: cabinClass || 'Economy',
            isDomestic,
          });

          if (sabreResult && sabreResult.rows && sabreResult.rows.length > 0) {
            source = 'sabre';
            seatLayout = sabreResult;
            console.log(`[SeatMap] Sabre SOAP: ${sabreResult.totalRows} rows, ${sabreResult.columns?.length} columns`);
          }
        }
      } catch (sabreErr) {
        console.log(`[SeatMap] Sabre SOAP not available: ${sabreErr.message}`);
      }
    }

    // ── Priority 2: Sabre REST /v1/offers/getseats fallback (requires PNR) ──
    if (!seatLayout && req.query.pnr && airlineCode && flightNumber && origin && destination && departureDate) {
      try {
        const { getSeatsRest } = require('./sabre-flights');
        if (getSeatsRest) {
          console.log(`[SeatMap] Trying Sabre REST GetSeats for ${airlineCode}${flightNumber} (PNR: ${req.query.pnr})`);
          const restResult = await getSeatsRest({
            origin, destination, departureDate, airlineCode,
            flightNumber: flightNumber.replace(/^[A-Z]{2}/i, ''),
            cabinClass: cabinClass || 'Economy',
            pnr: req.query.pnr,
          });
          if (restResult && restResult.rows && restResult.rows.length > 0) {
            source = 'sabre-rest';
            seatLayout = restResult;
            console.log(`[SeatMap] Sabre REST: ${restResult.totalRows} rows`);
          }
        }
      } catch (restErr) {
        console.log(`[SeatMap] Sabre REST not available: ${restErr.message}`);
      }
    }

    // ── Priority 3: TTI — for Air Astra / S2 ──
    if (!seatLayout && ['2A', 'S2'].includes(airlineCode) && itineraryRef) {
      try {
        const tti = getTTIHelpers();
        if (tti.getTTIConfig && tti.ttiRequest) {
          const config = await tti.getTTIConfig();
          if (config) {
            const seatMapRequest = {
              RequestInfo: { AuthenticationKey: config.key },
              ItineraryRef: itineraryRef,
              FlightNumber: flightNumber,
            };
            try {
              const response = await tti.ttiRequest('GetSeatMap', seatMapRequest);
              if (response && !response.ResponseInfo?.Error && response.SeatMap) {
                source = 'tti';
                seatLayout = response.SeatMap;
                console.log(`[SeatMap] TTI data loaded for ${flightNumber}`);
              }
            } catch (ttiErr) {
              console.log(`[SeatMap] TTI not available: ${ttiErr.message}`);
            }
          }
        }
      } catch (err) {
        console.log('[SeatMap] TTI config not available');
      }
    }

    // No fallback — zero-mock. If no real data, return null layout.
    res.json({
      flightNumber, aircraft: aircraft || null,
      cabinClass: cabinClass || 'Economy',
      layout: seatLayout, source,
      available: !!seatLayout,
    });
  } catch (err) {
    console.error('[SeatMap] Error:', err.message);
    res.status(500).json({ message: 'Failed to load seat map' });
  }
});

/**
 * GET /api/flights/sabre-soap-diagnostic
 * Tests both EnhancedSeatMapRQ and GetAncillaryOffersRQ with a real flight.
 */
router.get('/sabre-soap-diagnostic', async (req, res) => {
  const { origin, destination, departureDate, airlineCode, flightNumber, cabinClass, pnr } = req.query;

  if (!origin || !destination || !departureDate || !airlineCode || !flightNumber) {
    return res.json({
      error: 'Required params: origin, destination, departureDate, airlineCode, flightNumber',
      example: '/api/flights/sabre-soap-diagnostic?origin=DAC&destination=BOM&departureDate=2026-03-20&airlineCode=AI&flightNumber=2184',
      note: 'Add &pnr=ABCDEF to test GetAncillaryOffersRQ (requires existing PNR)',
    });
  }

  const results = { seatMap: null, ancillaries: null, errors: [] };

  try {
    const sabreSoap = getSabreSoap();

    // ── Test 1: EnhancedSeatMapRQ (no PNR needed) ──
    console.log(`[DIAG] Testing EnhancedSeatMapRQ for ${airlineCode}${flightNumber} ${origin}-${destination} ${departureDate}`);
    try {
      const BD_AIRPORTS = ['DAC', 'CXB', 'CGP', 'ZYL', 'JSR', 'RJH', 'SPD', 'BZL', 'IRD', 'TKR'];
      const isDomestic = BD_AIRPORTS.includes(origin) && BD_AIRPORTS.includes(destination);
      const seatMapResult = await sabreSoap.getSeatMap({
        origin, destination, departureDate,
        marketingCarrier: airlineCode,
        operatingCarrier: airlineCode,
        flightNumber: String(flightNumber).replace(/^[A-Z]{2}/i, ''),
        cabinClass: cabinClass || 'Economy',
        isDomestic,
      });
      results.seatMap = {
        success: !!(seatMapResult && !seatMapResult._error && seatMapResult.rows?.length > 0),
        source: 'sabre-soap',
        totalRows: seatMapResult?.totalRows || 0,
        columns: seatMapResult?.columns || [],
        exitRows: seatMapResult?.exitRows || [],
        sampleRow: seatMapResult?.rows?.[0] || null,
        totalSeats: seatMapResult?.rows?.reduce((sum, r) => sum + r.seats.length, 0) || 0,
        occupiedSeats: seatMapResult?.rows?.reduce((sum, r) => sum + r.seats.filter(s => s.status === 'occupied').length, 0) || 0,
        seatsWithPrices: seatMapResult?.rows?.reduce((sum, r) => sum + r.seats.filter(s => s.price > 0).length, 0) || 0,
        rawData: seatMapResult,
        errorXml: seatMapResult?._error ? seatMapResult.rawXml : undefined,
      };
      console.log(`[DIAG] SeatMap: ${results.seatMap.success ? 'SUCCESS' : 'NO DATA'} — ${results.seatMap.totalSeats} seats`);
    } catch (err) {
      results.seatMap = { success: false, error: err.message };
      results.errors.push(`SeatMap: ${err.message}`);
    }

    // ── Test 2: GetAncillaryOffersRQ (requires PNR) ──
    if (pnr) {
      console.log(`[DIAG] Testing GetAncillaryOffersRQ (PNR: ${pnr}) for ${airlineCode}${flightNumber}`);
      try {
        const ancillaryResult = await sabreSoap.getAncillaryOffers({
          origin, destination, departureDate,
          marketingCarrier: airlineCode,
          flightNumber: String(flightNumber).replace(/^[A-Z]{2}/i, ''),
          cabinClass: cabinClass || 'Economy',
          adults: 1, children: 0,
          pnr,
        });
        results.ancillaries = {
          success: !!(ancillaryResult && !ancillaryResult._error && (ancillaryResult.meals?.length > 0 || ancillaryResult.baggage?.length > 0)),
          source: ancillaryResult?.source || 'sabre-soap',
          mealsCount: ancillaryResult?.meals?.length || 0,
          baggageCount: ancillaryResult?.baggage?.length || 0,
          otherCount: ancillaryResult?.other?.length || 0,
          meals: ancillaryResult?.meals || [],
          baggage: ancillaryResult?.baggage || [],
          other: ancillaryResult?.other || [],
          rawData: ancillaryResult,
          errorXml: ancillaryResult?._error ? ancillaryResult.rawXml : undefined,
        };
        console.log(`[DIAG] Ancillaries: ${results.ancillaries.success ? 'SUCCESS' : 'NO DATA'}`);
      } catch (err) {
        results.ancillaries = { success: false, error: err.message };
        results.errors.push(`Ancillaries: ${err.message}`);
      }
    } else {
      results.ancillaries = {
        skipped: true,
        reason: 'GetAncillaryOffersRQ requires PNR. Add &pnr=ABCDEF to test.',
        note: 'Pre-booking ancillary data (baggage) comes from BFM search results.',
      };
    }

  } catch (err) {
    results.errors.push(`General: ${err.message}`);
  }

  res.json({
    diagnostic: 'Sabre SOAP Ancillary & SeatMap Test',
    flight: `${airlineCode}${flightNumber}`,
    route: `${origin} → ${destination}`,
    date: departureDate,
    pnr: pnr || 'NOT PROVIDED (GAO skipped)',
    timestamp: new Date().toISOString(),
    architecture: {
      seatMap: 'EnhancedSeatMapRQ — works pre-booking (no PNR needed)',
      ancillaries: 'GetAncillaryOffersRQ — requires PNR (post-booking only)',
      preBooking: 'Baggage allowance extracted from BFM search response',
    },
    ...results,
  });
});

module.exports = router;
