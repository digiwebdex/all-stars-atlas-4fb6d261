import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { Plane, Clock, ArrowRight, Filter, X, Luggage, Wifi, UtensilsCrossed, SlidersHorizontal, ChevronDown, ChevronUp, Shield } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useFlightSearch } from "@/hooks/useApiData";
import { useCmsPageContent } from "@/hooks/useCmsContent";
import DataLoader from "@/components/DataLoader";

/* ─── airline logo helper ─── */
const AIRLINE_LOGOS: Record<string, string> = {
  "Biman Bangladesh": "https://images.seeklogo.com/logo-png/52/1/biman-bangladesh-airlines-logo-png_seeklogo-524035.png",
  "US-Bangla Airlines": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/05/US-Bangla_Airlines_Logo.svg/200px-US-Bangla_Airlines_Logo.svg.png",
  "Novoair": "https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/Novoair_Logo.svg/200px-Novoair_Logo.svg.png",
  "Emirates": "https://upload.wikimedia.org/wikipedia/commons/thumb/d/d0/Emirates_logo.svg/200px-Emirates_logo.svg.png",
  "Qatar Airways": "https://upload.wikimedia.org/wikipedia/en/thumb/9/9b/Qatar_Airways_Logo.svg/200px-Qatar_Airways_Logo.svg.png",
  "Singapore Airlines": "https://upload.wikimedia.org/wikipedia/en/thumb/6/6b/Singapore_Airlines_Logo_2.svg/200px-Singapore_Airlines_Logo_2.svg.png",
  "Thai Airways": "https://upload.wikimedia.org/wikipedia/en/thumb/5/51/Thai_Airways_logo.svg/200px-Thai_Airways_logo.svg.png",
  "IndiGo": "https://upload.wikimedia.org/wikipedia/commons/thumb/6/69/IndiGo_Airlines_logo.svg/200px-IndiGo_Airlines_logo.svg.png",
  "Air Arabia": "https://upload.wikimedia.org/wikipedia/commons/thumb/8/8c/Air_Arabia_Logo.svg/200px-Air_Arabia_Logo.svg.png",
  "Malaysia Airlines": "https://upload.wikimedia.org/wikipedia/commons/thumb/2/2c/Malaysia_Airlines_Logo.svg/200px-Malaysia_Airlines_Logo.svg.png",
  "Turkish Airlines": "https://upload.wikimedia.org/wikipedia/commons/thumb/0/00/Turkish_Airlines_logo_2019_compact.svg/200px-Turkish_Airlines_logo_2019_compact.svg.png",
  "Cathay Pacific": "https://upload.wikimedia.org/wikipedia/en/thumb/1/17/Cathay_Pacific_logo.svg/200px-Cathay_Pacific_logo.svg.png",
  "Air India": "https://upload.wikimedia.org/wikipedia/en/thumb/2/2f/Air_India_Logo.svg/200px-Air_India_Logo.svg.png",
  "SriLankan Airlines": "https://upload.wikimedia.org/wikipedia/en/thumb/b/b4/SriLankan_Airlines_logo.svg/200px-SriLankan_Airlines_logo.svg.png",
  "Regent Airways": "https://upload.wikimedia.org/wikipedia/en/5/54/Regent_Airways_Logo.png",
};

function getAirlineLogo(airline: string, providedLogo?: string): string | null {
  if (providedLogo && providedLogo.startsWith("http")) return providedLogo;
  return AIRLINE_LOGOS[airline] || null;
}

function formatTime(datetime?: string): string {
  if (!datetime) return "--:--";
  try {
    const d = new Date(datetime);
    if (isNaN(d.getTime())) return datetime;
    return d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return datetime;
  }
}

/* ─── filter panel ─── */
const FilterPanel = ({
  priceRange, setPriceRange, airlines, selectedAirlines, toggleAirline, onReset,
}: {
  priceRange: number[]; setPriceRange: (v: number[]) => void;
  airlines: string[]; selectedAirlines: string[]; toggleAirline: (a: string) => void;
  onReset: () => void;
}) => (
  <div className="space-y-6">
    <div>
      <h4 className="text-sm font-bold mb-3">Price Range</h4>
      <Slider value={priceRange} onValueChange={setPriceRange} min={2000} max={80000} step={100} className="mb-2" />
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>৳{priceRange[0].toLocaleString()}</span>
        <span>৳{priceRange[1].toLocaleString()}</span>
      </div>
    </div>
    <div>
      <h4 className="text-sm font-bold mb-3">Airlines</h4>
      <div className="space-y-2">
        {airlines.map((a: string) => (
          <label key={a} className="flex items-center gap-2 cursor-pointer">
            <Checkbox checked={selectedAirlines.includes(a)} onCheckedChange={() => toggleAirline(a)} />
            <span className="text-sm">{a}</span>
          </label>
        ))}
      </div>
    </div>
  </div>
);

/* ─── flight card ─── */
const FlightCard = ({
  flight, cheapest, isExpanded, onToggleExpand,
}: {
  flight: any; cheapest: number; isExpanded: boolean; onToggleExpand: () => void;
}) => {
  const logo = getAirlineLogo(flight.airline, flight.logo || flight.airlineLogo);
  const departTime = flight.departTime || formatTime(flight.departureTime);
  const arriveTime = flight.arriveTime || formatTime(flight.arrivalTime);
  const fromCode = flight.from || flight.origin || "";
  const toCode = flight.to || flight.destination || "";
  const flightNo = flight.flightNo || flight.flightNumber || "";
  const cabin = flight.class || flight.cabinClass || "";
  const baggage = flight.baggage || "20kg";
  const duration = flight.duration || "";
  const stops = flight.stops ?? 0;
  const price = flight.price ?? 0;
  const refundable = flight.refundable ?? false;

  return (
    <Card className={`hover:shadow-lg transition-all overflow-hidden ${isExpanded ? "ring-1 ring-primary/30" : ""}`}>
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Main info */}
          <div className="flex-1 p-4 sm:p-5">
            {/* Airline header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {logo ? (
                  <img src={logo} alt={flight.airline} className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; (e.target as HTMLImageElement).parentElement!.innerHTML = `<span class="text-xs font-bold text-muted-foreground">${(flight.airlineCode || flight.airline?.slice(0, 2) || "").toUpperCase()}</span>`; }} />
                ) : (
                  <span className="text-xs font-bold text-muted-foreground">{(flight.airlineCode || flight.airline?.slice(0, 2) || "").toUpperCase()}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold truncate">{flight.airline}</p>
                <p className="text-xs text-muted-foreground">{flightNo}{cabin ? ` • ${cabin}` : ""}{flight.aircraft ? ` • ${flight.aircraft}` : ""}</p>
              </div>
              <div className="flex items-center gap-1.5">
                {price === cheapest && price > 0 && (
                  <Badge className="bg-success/10 text-success border-0 text-[10px] font-bold">Cheapest</Badge>
                )}
                {refundable && (
                  <Badge variant="outline" className="text-[10px] border-success/30 text-success">Refundable</Badge>
                )}
              </div>
            </div>

            {/* Time line */}
            <div className="flex items-center gap-4">
              <div className="text-center min-w-[70px]">
                <p className="text-xl sm:text-2xl font-black tracking-tight">{departTime}</p>
                <p className="text-xs font-semibold text-muted-foreground">{fromCode}</p>
              </div>
              <div className="flex-1 flex flex-col items-center gap-1">
                <p className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {duration}
                </p>
                <div className="w-full flex items-center gap-1">
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-primary" />
                  <div className="flex-1 h-[2px] bg-gradient-to-r from-primary/60 to-primary relative">
                    <Plane className="w-4 h-4 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rotate-0" />
                  </div>
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                </div>
                <p className={`text-[11px] font-semibold ${stops === 0 ? "text-success" : "text-amber-500"}`}>
                  {stops === 0 ? "Non-stop" : `${stops} Stop${stops > 1 ? "s" : ""}`}
                </p>
              </div>
              <div className="text-center min-w-[70px]">
                <p className="text-xl sm:text-2xl font-black tracking-tight">{arriveTime}</p>
                <p className="text-xs font-semibold text-muted-foreground">{toCode}</p>
              </div>
            </div>

            {/* Amenities */}
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Luggage className="w-3.5 h-3.5" /> {baggage}</span>
              {flight.amenities?.includes("meal") && <span className="flex items-center gap-1"><UtensilsCrossed className="w-3.5 h-3.5" /> Meal</span>}
              {flight.amenities?.includes("wifi") && <span className="flex items-center gap-1"><Wifi className="w-3.5 h-3.5" /> WiFi</span>}
            </div>

            {/* Details toggle */}
            <button className="flex items-center gap-1 mt-3 text-xs text-primary font-semibold hover:underline" onClick={onToggleExpand}>
              Flight Details {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Price */}
          <div className="sm:w-48 border-t sm:border-t-0 sm:border-l border-border p-4 sm:p-5 flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 bg-muted/30">
            <div className="text-right">
              {flight.originalPrice && <p className="text-xs text-muted-foreground line-through">৳{flight.originalPrice.toLocaleString()}</p>}
              <p className="text-2xl font-black text-primary">৳{price.toLocaleString()}</p>
              <p className="text-[10px] text-muted-foreground">per person</p>
            </div>
            <Button className="font-bold shadow-lg shadow-primary/20 h-10 px-6" asChild>
              <Link to={`/flights/book?flightId=${flight.id}`}>Select <ArrowRight className="w-4 h-4 ml-1" /></Link>
            </Button>
          </div>
        </div>

        {/* Expanded details */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
              <div className="border-t border-border p-4 sm:p-5 bg-muted/20">
                <div className="grid sm:grid-cols-3 gap-6">
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Flight Info</h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Aircraft</span><span className="font-medium">{flight.aircraft || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-medium">{duration || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Flight No</span><span className="font-medium">{flightNo || "—"}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Class</span><span className="font-medium">{cabin || "—"}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Baggage</h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Checked</span><span className="font-medium">{baggage}</span></div>
                      <div className="flex justify-between"><span className="text-muted-foreground">Cabin</span><span className="font-medium">{flight.cabinBag || "7kg"}</span></div>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Fare Rules</h4>
                    <div className="space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted-foreground">Refundable</span><span className="font-medium">{refundable ? "Yes" : "No"}</span></div>
                      {flight.fareRules && <p className="text-sm text-muted-foreground flex items-start gap-1 mt-1"><Shield className="w-4 h-4 shrink-0 mt-0.5" /> {flight.fareRules}</p>}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
};

/* ─── main page ─── */
const FlightResults = () => {
  const { data: page } = useCmsPageContent("/flights");
  const listing = page?.listingConfig;
  const [searchParams] = useSearchParams();
  const [sortBy, setSortBy] = useState("cheapest");
  const [priceRange, setPriceRange] = useState([2000, 80000]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [expandedFlight, setExpandedFlight] = useState<string | null>(null);

  const departDate = searchParams.get("depart");
  const hasRequiredParams = !!searchParams.get("from") && !!searchParams.get("to") && !!departDate;

  const params = hasRequiredParams ? {
    from: searchParams.get("from")!,
    to: searchParams.get("to")!,
    date: departDate!,
    adults: searchParams.get("adults") || undefined,
    class: searchParams.get("class") || searchParams.get("cabin") || undefined,
    sort: sortBy,
    priceMin: priceRange[0],
    priceMax: priceRange[1],
  } : undefined;

  const { data: rawData, isLoading, error, refetch } = useFlightSearch(params);
  const apiData = (rawData as any) || {};
  const flights = apiData.data || apiData.flights || [];
  const airlines = useMemo(() => apiData.airlines || [...new Set(flights.map((f: any) => f.airline).filter(Boolean))], [apiData.airlines, flights]);
  const cheapest = useMemo(() => apiData.cheapest || (flights.length > 0 ? Math.min(...flights.map((f: any) => f.price || Infinity)) : 0), [apiData.cheapest, flights]);

  const fromCode = searchParams.get("from") || "";
  const toCode = searchParams.get("to") || "";

  const toggleAirline = (a: string) => setSelectedAirlines(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]);

  const filtered = flights.filter((f: any) =>
    (selectedAirlines.length === 0 || selectedAirlines.includes(f.airline)) &&
    (f.price >= priceRange[0] && f.price <= priceRange[1])
  );

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-card border-b border-border pt-20 lg:pt-28 pb-4">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
                {fromCode || "—"} <ArrowRight className="w-5 h-5 text-primary" /> {toCode || "—"}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {departDate || ""} • {searchParams.get("adults") || 1} traveller(s) • <strong className="text-foreground">{filtered.length} flights</strong> found
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild><Link to="/">Modify Search</Link></Button>
              {cheapest > 0 && <Badge className="bg-success/10 text-success border-0 font-semibold h-9 px-3">Cheapest from ৳{cheapest.toLocaleString()}</Badge>}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {!hasRequiredParams ? (
          <Card><CardContent className="py-16 text-center">
            <Plane className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
            <h2 className="text-lg font-bold mb-2">No Search Criteria</h2>
            <p className="text-muted-foreground mb-4">Please use the search widget to search for flights with departure date.</p>
            <Button asChild><Link to="/">Search Flights</Link></Button>
          </CardContent></Card>
        ) : (
          <div className="flex gap-6">
            <aside className="hidden lg:block w-64 shrink-0">
              <Card className="sticky top-28"><CardContent className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold flex items-center gap-2"><SlidersHorizontal className="w-4 h-4" /> Filters</h3>
                  <Button variant="ghost" size="sm" className="text-xs text-primary h-7" onClick={() => { setSelectedAirlines([]); setPriceRange([2000, 80000]); }}>Reset</Button>
                </div>
                <FilterPanel priceRange={priceRange} setPriceRange={setPriceRange} airlines={airlines} selectedAirlines={selectedAirlines} toggleAirline={toggleAirline} onReset={() => { setSelectedAirlines([]); setPriceRange([2000, 80000]); }} />
              </CardContent></Card>
            </aside>

            <div className="flex-1 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex gap-1 overflow-x-auto scrollbar-none">
                  {(listing?.flightSortOptions || [
                    { value: "cheapest", label: "Cheapest" },
                    { value: "earliest", label: "Earliest" },
                    { value: "fastest", label: "Fastest" },
                  ]).map((s) => (
                    <button key={s.value} onClick={() => setSortBy(s.value)}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                        sortBy === s.value ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground hover:text-foreground"
                      }`}>{s.label}</button>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="lg:hidden" onClick={() => setShowFilters(true)}><Filter className="w-4 h-4 mr-1" /> Filters</Button>
              </div>

              <DataLoader isLoading={isLoading} error={error} skeleton="cards" retry={refetch}>
                {filtered.length === 0 ? (
                  <Card><CardContent className="py-12 text-center text-muted-foreground">
                    <Plane className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="font-semibold">No flights found</p>
                    <p className="text-sm mt-1">Try adjusting your filters or search criteria</p>
                  </CardContent></Card>
                ) : filtered.map((flight: any) => (
                  <FlightCard
                    key={flight.id}
                    flight={flight}
                    cheapest={cheapest}
                    isExpanded={expandedFlight === flight.id}
                    onToggleExpand={() => setExpandedFlight(expandedFlight === flight.id ? null : flight.id)}
                  />
                ))}
              </DataLoader>
            </div>
          </div>
        )}
      </div>

      {/* Mobile filter drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-card overflow-y-auto p-5">
            <div className="flex items-center justify-between mb-5"><h3 className="font-bold">Filters</h3><button onClick={() => setShowFilters(false)}><X className="w-5 h-5" /></button></div>
            <FilterPanel priceRange={priceRange} setPriceRange={setPriceRange} airlines={airlines} selectedAirlines={selectedAirlines} toggleAirline={toggleAirline} onReset={() => { setSelectedAirlines([]); setPriceRange([2000, 80000]); }} />
            <Button className="w-full mt-6" onClick={() => setShowFilters(false)}>Apply Filters</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FlightResults;
