import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plane, ArrowRight, User, Clock, Luggage, Shield, CreditCard,
  UtensilsCrossed, Armchair, Plus, Briefcase, Users, FileText,
  ArrowLeftRight, AlertCircle,
} from "lucide-react";
import { Link, useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useCmsPageContent } from "@/hooks/useCmsContent";
import { useAuth } from "@/hooks/useAuth";
import AuthGateModal from "@/components/AuthGateModal";
import type { BookingFormField } from "@/lib/cms-defaults";

const RenderField = ({ field }: { field: BookingFormField }) => {
  if (!field.visible) return null;
  const cls = field.thirdWidth ? "space-y-1.5" : field.halfWidth ? "space-y-1.5" : "space-y-1.5 sm:col-span-2";
  if (field.type === "select") {
    return (
      <div className={cls}>
        <Label>{field.label}</Label>
        <Select><SelectTrigger className="h-11"><SelectValue placeholder={field.placeholder || "Select"} /></SelectTrigger>
          <SelectContent>{(field.options || []).map(o => <SelectItem key={o} value={o.toLowerCase()}>{o}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    );
  }
  if (field.type === "textarea") {
    return (
      <div className="space-y-1.5 sm:col-span-2">
        <Label>{field.label}</Label>
        <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder={field.placeholder} />
      </div>
    );
  }
  return (
    <div className={cls}>
      <Label>{field.label}</Label>
      <Input type={field.type} placeholder={field.placeholder} className="h-11" />
    </div>
  );
};

/* ─── Airline logo helper ─── */
function getAirlineLogo(code?: string): string | null {
  if (!code) return null;
  return `https://images.kiwi.com/airlines/64/${code}.png`;
}

function fmtTime(dt?: string) {
  if (!dt) return "—";
  try { const d = new Date(dt); return isNaN(d.getTime()) ? dt : d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return dt; }
}
function fmtDate(dt?: string) {
  if (!dt) return "—";
  try { const d = new Date(dt); return isNaN(d.getTime()) ? dt : d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }); } catch { return dt; }
}

/* ─── Meal options ─── */
const MEAL_OPTIONS = [
  { id: "standard", name: "Standard Meal", price: 0, desc: "Included with your fare" },
  { id: "vegetarian", name: "Vegetarian", price: 0, desc: "Lacto-ovo vegetarian meal" },
  { id: "vegan", name: "Vegan", price: 200, desc: "Plant-based meal" },
  { id: "halal", name: "Halal Meal", price: 0, desc: "Halal certified preparation" },
  { id: "kosher", name: "Kosher Meal", price: 300, desc: "Kosher certified meal" },
  { id: "child", name: "Child Meal", price: 0, desc: "Kid-friendly options" },
  { id: "diabetic", name: "Diabetic Meal", price: 0, desc: "Low sugar, balanced nutrition" },
];

const BAGGAGE_OPTIONS = [
  { id: "extra5", name: "+5 kg Extra Baggage", price: 500, desc: "Total: 25kg checked" },
  { id: "extra10", name: "+10 kg Extra Baggage", price: 900, desc: "Total: 30kg checked" },
  { id: "extra15", name: "+15 kg Extra Baggage", price: 1200, desc: "Total: 35kg checked" },
  { id: "extra20", name: "+20 kg Extra Baggage", price: 1500, desc: "Total: 40kg checked" },
  { id: "sport", name: "Sports Equipment", price: 2000, desc: "Golf, ski, surfboard etc." },
  { id: "fragile", name: "Fragile Handling", price: 800, desc: "Priority fragile handling" },
];

const SEAT_CLASSES = [
  { id: "standard", name: "Standard Seat", price: 0, desc: "Pre-assigned at check-in", icon: "🪑" },
  { id: "window", name: "Window Seat", price: 300, desc: "Enjoy the view", icon: "🪟" },
  { id: "aisle", name: "Aisle Seat", price: 300, desc: "Easy access", icon: "🚶" },
  { id: "extra-leg", name: "Extra Legroom", price: 800, desc: "More space for comfort", icon: "🦵" },
  { id: "front", name: "Front Row", price: 600, desc: "Quick exit after landing", icon: "⬆️" },
  { id: "emergency", name: "Emergency Exit Row", price: 500, desc: "Maximum legroom", icon: "🚪" },
];

const AddOnCard = ({ item, selected, onSelect }: { item: { id: string; name: string; price: number; desc: string; icon?: string }; selected: boolean; onSelect: () => void }) => (
  <label className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
    selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
  }`}>
    <Checkbox checked={selected} onCheckedChange={onSelect} />
    {item.icon && <span className="text-lg">{item.icon}</span>}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium">{item.name}</p>
      <p className="text-xs text-muted-foreground">{item.desc}</p>
    </div>
    <span className={`text-sm font-bold shrink-0 ${item.price === 0 ? "text-success" : "text-primary"}`}>
      {item.price === 0 ? "Free" : `৳${item.price}`}
    </span>
  </label>
);

/* ─── Compact flight segment card ─── */
const FlightSegmentCard = ({ flight, label, labelColor }: { flight: any; label: string; labelColor: string }) => {
  const logo = getAirlineLogo(flight?.airlineCode);
  const legs = flight?.legs || [];

  if (!flight) return (
    <Card className="border-dashed">
      <CardContent className="py-8 text-center">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">No {label.toLowerCase()} flight selected</p>
      </CardContent>
    </Card>
  );

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Badge className={`${labelColor} border-0 text-[10px] px-2`}>{label}</Badge>
            <span className="font-bold">{flight.origin} → {flight.destination}</span>
          </CardTitle>
          <Badge className="bg-success/10 text-success text-[10px]">Confirmed</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-xl">
          {logo && <img src={logo} alt={flight.airline} className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
          <div className="text-center">
            <p className="text-xl font-black">{fmtTime(flight.departureTime)}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">{flight.origin}</p>
          </div>
          <div className="flex-1 flex flex-col items-center gap-0.5">
            <p className="text-[10px] text-muted-foreground">{flight.duration}</p>
            <div className="w-full flex items-center gap-0">
              <div className="w-1.5 h-1.5 rounded-full border-[1.5px] border-primary" />
              <div className="flex-1 h-px bg-border" />
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>
            <p className="text-[10px] text-success font-semibold">{flight.stops === 0 ? "Non-stop" : `${flight.stops} Stop`}</p>
          </div>
          <div className="text-center">
            <p className="text-xl font-black">{fmtTime(flight.arrivalTime)}</p>
            <p className="text-[10px] text-muted-foreground font-semibold">{flight.destination}</p>
          </div>
        </div>

        {/* Leg details */}
        {legs.length > 0 && (
          <div className="mt-3 space-y-2">
            {legs.map((leg: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{leg.flightNumber}</span>
                {leg.aircraft && <span>· {leg.aircraft}</span>}
                <span>· {leg.duration || `${leg.durationMinutes}m`}</span>
                {leg.originTerminal && <span>· T{leg.originTerminal}</span>}
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-3 mt-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1"><Luggage className="w-3 h-3" /> {flight.baggage || "20kg"}</span>
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {fmtDate(flight.departureTime)}</span>
          <span>{flight.airline} · {flight.flightNumber} · {flight.cabinClass || "Economy"}</span>
        </div>
      </CardContent>
    </Card>
  );
};

const FlightBooking = () => {
  const [step, setStep] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: page, isLoading } = useCmsPageContent("/flights/book");
  const { toast } = useToast();
  const config = page?.bookingConfig;

  const [selectedMeal, setSelectedMeal] = useState("standard");
  const [selectedBaggage, setSelectedBaggage] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState("standard");

  // Passenger form state
  const [passengers, setPassengers] = useState([{
    title: "", firstName: "", lastName: "", dob: "", nationality: "", passport: "", passportExpiry: "", email: "", phone: "",
  }]);

  const [searchParams] = useSearchParams();
  const location = useLocation();
  const locationState = location.state as any;
  const isRoundTrip = searchParams.get("roundTrip") === "true" || !!locationState?.returnFlight;

  const outboundFlight = locationState?.outboundFlight || null;
  const returnFlight = locationState?.returnFlight || null;

  // Costs
  const mealCost = MEAL_OPTIONS.find(m => m.id === selectedMeal)?.price || 0;
  const baggageCost = selectedBaggage.reduce((sum, id) => sum + (BAGGAGE_OPTIONS.find(b => b.id === id)?.price || 0), 0);
  const seatCost = SEAT_CLASSES.find(s => s.id === selectedSeat)?.price || 0;
  const addOnTotal = mealCost + baggageCost + seatCost;
  const outboundPrice = outboundFlight?.price || 0;
  const returnPrice = returnFlight?.price || 0;
  const baseFare = outboundPrice + returnPrice;
  const taxes = Math.round(baseFare * 0.12);
  const serviceCharge = 250;
  const grandTotal = baseFare + taxes + serviceCharge + addOnTotal;

  const handleFinalAction = () => {
    // Validate passenger
    const p = passengers[0];
    if (!p.firstName || !p.lastName) {
      toast({ title: "Missing Info", description: "Please fill in all passenger details.", variant: "destructive" });
      setStep(2);
      return;
    }

    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }

    navigate("/booking/confirmation", {
      state: {
        booking: {
          type: "Flight",
          bookingRef: `ST-FL-${Date.now().toString(36).toUpperCase()}`,
          route: isRoundTrip
            ? `${outboundFlight?.origin || "—"} ⇄ ${outboundFlight?.destination || "—"}`
            : `${outboundFlight?.origin || "—"} → ${outboundFlight?.destination || "—"}`,
          flightNo: outboundFlight?.flightNumber || "—",
          airline: outboundFlight?.airline || "—",
          airlineCode: outboundFlight?.airlineCode,
          class: outboundFlight?.cabinClass || "Economy",
          departTime: fmtTime(outboundFlight?.departureTime),
          arriveTime: fmtTime(outboundFlight?.arrivalTime),
          date: fmtDate(outboundFlight?.departureTime),
          stops: outboundFlight?.stops === 0 ? "Non-stop" : `${outboundFlight?.stops || 0} Stop`,
          passenger: `${passengers[0].title} ${passengers[0].firstName} ${passengers[0].lastName}`.trim(),
          pnr: `${Date.now().toString(36).toUpperCase().slice(-6)}`,
          isRoundTrip,
          outbound: outboundFlight,
          returnFlight: returnFlight,
          baseFare, taxes, serviceCharge,
          addOns: addOnTotal,
          meal: MEAL_OPTIONS.find(m => m.id === selectedMeal)?.name,
          seat: SEAT_CLASSES.find(s => s.id === selectedSeat)?.name,
          extraBaggage: selectedBaggage.map(id => BAGGAGE_OPTIONS.find(b => b.id === id)?.name).filter(Boolean),
          total: grandTotal,
          paymentMethod: "Card",
          passengers,
        },
      },
    });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-muted/30 pt-20 lg:pt-28 pb-10"><div className="container mx-auto px-4"><Skeleton className="h-96 w-full rounded-xl" /></div></div>;
  }

  const STEPS = [
    { label: "Flight Details", icon: Plane },
    { label: "Passenger Info", icon: Users },
    { label: "Extras", icon: Plus },
    { label: "Review & Pay", icon: CreditCard },
  ];

  return (
    <div className="min-h-screen bg-muted/30 pt-20 lg:pt-28 pb-10">
      <div className="container mx-auto px-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-1 sm:gap-2 mb-8">
          {STEPS.map((s, i) => {
            const Icon = s.icon;
            return (
              <div key={i} className="flex items-center gap-1 sm:gap-2">
                <button
                  onClick={() => i + 1 < step && setStep(i + 1)}
                  className={`flex items-center gap-1.5 px-2 sm:px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                    step > i + 1 ? "bg-success/10 text-success cursor-pointer" :
                    step === i + 1 ? "bg-primary text-primary-foreground" :
                    "bg-muted text-muted-foreground"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < STEPS.length - 1 && <div className="w-4 sm:w-8 h-px bg-border" />}
              </div>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* ─── STEP 1: Flight Details ─── */}
            {step === 1 && (
              <>
                <FlightSegmentCard flight={outboundFlight} label="Outbound" labelColor="bg-primary/10 text-primary" />
                {isRoundTrip && (
                  <FlightSegmentCard flight={returnFlight} label="Return" labelColor="bg-amber-500/10 text-amber-600" />
                )}
                {!isRoundTrip && !outboundFlight && (
                  <Card className="border-dashed">
                    <CardContent className="py-8 text-center">
                      <p className="text-sm text-muted-foreground">Loading flight details...</p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* ─── STEP 2: Passenger Information ─── */}
            {step === 2 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" /> Passenger Details
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Enter details exactly as they appear on your passport/ID</p>
                </CardHeader>
                <CardContent>
                  {passengers.map((pax, pi) => (
                    <div key={pi} className="space-y-4">
                      {pi > 0 && <Separator className="my-4" />}
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="outline" className="text-xs">Passenger {pi + 1}</Badge>
                        {pi === 0 && <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Primary Contact</Badge>}
                      </div>
                      <div className="grid sm:grid-cols-4 gap-4">
                        <div className="space-y-1.5">
                          <Label>Title *</Label>
                          <Select value={pax.title} onValueChange={(v) => {
                            const updated = [...passengers]; updated[pi].title = v; setPassengers(updated);
                          }}>
                            <SelectTrigger className="h-11"><SelectValue placeholder="Title" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Mr">Mr</SelectItem>
                              <SelectItem value="Mrs">Mrs</SelectItem>
                              <SelectItem value="Ms">Ms</SelectItem>
                              <SelectItem value="Master">Master</SelectItem>
                              <SelectItem value="Miss">Miss</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5 sm:col-span-1">
                          <Label>First Name *</Label>
                          <Input value={pax.firstName} onChange={(e) => {
                            const updated = [...passengers]; updated[pi].firstName = e.target.value; setPassengers(updated);
                          }} placeholder="As on passport" className="h-11" />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Last Name *</Label>
                          <Input value={pax.lastName} onChange={(e) => {
                            const updated = [...passengers]; updated[pi].lastName = e.target.value; setPassengers(updated);
                          }} placeholder="As on passport" className="h-11" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label>Date of Birth *</Label>
                          <Input type="date" value={pax.dob} onChange={(e) => {
                            const updated = [...passengers]; updated[pi].dob = e.target.value; setPassengers(updated);
                          }} className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Nationality *</Label>
                          <Input value={pax.nationality} onChange={(e) => {
                            const updated = [...passengers]; updated[pi].nationality = e.target.value; setPassengers(updated);
                          }} placeholder="e.g. Bangladeshi" className="h-11" />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Passport Number</Label>
                          <Input value={pax.passport} onChange={(e) => {
                            const updated = [...passengers]; updated[pi].passport = e.target.value; setPassengers(updated);
                          }} placeholder="e.g. AB1234567" className="h-11" />
                        </div>
                      </div>
                      <div className="grid sm:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <Label>Passport Expiry</Label>
                          <Input type="date" value={pax.passportExpiry} onChange={(e) => {
                            const updated = [...passengers]; updated[pi].passportExpiry = e.target.value; setPassengers(updated);
                          }} className="h-11" />
                        </div>
                        {pi === 0 && (
                          <>
                            <div className="space-y-1.5">
                              <Label>Email *</Label>
                              <Input type="email" value={pax.email} onChange={(e) => {
                                const updated = [...passengers]; updated[pi].email = e.target.value; setPassengers(updated);
                              }} placeholder="email@example.com" className="h-11" />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Phone *</Label>
                              <Input type="tel" value={pax.phone} onChange={(e) => {
                                const updated = [...passengers]; updated[pi].phone = e.target.value; setPassengers(updated);
                              }} placeholder="+880 1XXX-XXXXXX" className="h-11" />
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ─── STEP 3: Extras (Meal, Baggage, Seat) ─── */}
            {step === 3 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Plus className="w-5 h-5 text-primary" /> Customize Your Flight</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="meal" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 mb-4">
                      <TabsTrigger value="meal" className="gap-1.5 text-xs sm:text-sm"><UtensilsCrossed className="w-3.5 h-3.5" /> Meal</TabsTrigger>
                      <TabsTrigger value="baggage" className="gap-1.5 text-xs sm:text-sm"><Luggage className="w-3.5 h-3.5" /> Baggage</TabsTrigger>
                      <TabsTrigger value="seat" className="gap-1.5 text-xs sm:text-sm"><Armchair className="w-3.5 h-3.5" /> Seat</TabsTrigger>
                    </TabsList>
                    <TabsContent value="meal" className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-2">Select your preferred meal for this flight.</p>
                      {MEAL_OPTIONS.map(meal => (
                        <AddOnCard key={meal.id} item={meal} selected={selectedMeal === meal.id} onSelect={() => setSelectedMeal(meal.id)} />
                      ))}
                    </TabsContent>
                    <TabsContent value="baggage" className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Included: 20kg Checked + 7kg Cabin</p>
                          <p className="text-xs text-muted-foreground">Your fare includes standard baggage allowance</p>
                        </div>
                      </div>
                      {BAGGAGE_OPTIONS.map(bag => (
                        <AddOnCard key={bag.id} item={bag} selected={selectedBaggage.includes(bag.id)}
                          onSelect={() => setSelectedBaggage(prev => prev.includes(bag.id) ? prev.filter(x => x !== bag.id) : [...prev, bag.id])}
                        />
                      ))}
                    </TabsContent>
                    <TabsContent value="seat" className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-2">Choose your preferred seating.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {SEAT_CLASSES.map(seat => (
                          <AddOnCard key={seat.id} item={seat} selected={selectedSeat === seat.id} onSelect={() => setSelectedSeat(seat.id)} />
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* ─── STEP 4: Review & Payment ─── */}
            {step === 4 && (
              <>
                {/* Review summary */}
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><FileText className="w-5 h-5 text-primary" /> Booking Review</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    {/* Flights summary */}
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Flight Itinerary</h4>
                      <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                        <div className="flex items-center gap-3">
                          <Badge className="bg-primary/10 text-primary border-0 text-[10px]">Outbound</Badge>
                          <span className="text-sm font-semibold">{outboundFlight?.origin} → {outboundFlight?.destination}</span>
                          <span className="text-xs text-muted-foreground">{fmtDate(outboundFlight?.departureTime)}</span>
                          <span className="text-xs">{fmtTime(outboundFlight?.departureTime)} – {fmtTime(outboundFlight?.arrivalTime)}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{outboundFlight?.airline} {outboundFlight?.flightNumber}</span>
                        </div>
                        {isRoundTrip && returnFlight && (
                          <div className="flex items-center gap-3">
                            <Badge className="bg-amber-500/10 text-amber-600 border-0 text-[10px]">Return</Badge>
                            <span className="text-sm font-semibold">{returnFlight.origin} → {returnFlight.destination}</span>
                            <span className="text-xs text-muted-foreground">{fmtDate(returnFlight.departureTime)}</span>
                            <span className="text-xs">{fmtTime(returnFlight.departureTime)} – {fmtTime(returnFlight.arrivalTime)}</span>
                            <span className="text-xs text-muted-foreground ml-auto">{returnFlight.airline} {returnFlight.flightNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Passenger summary */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Passengers</h4>
                      {passengers.map((p, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm p-2 bg-muted/30 rounded-lg">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="font-medium">{p.title} {p.firstName} {p.lastName}</span>
                          {p.passport && <span className="text-xs text-muted-foreground">Passport: {p.passport}</span>}
                        </div>
                      ))}
                    </div>

                    {/* Extras summary */}
                    {addOnTotal > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Selected Extras</h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedMeal !== "standard" && <Badge variant="outline" className="text-xs"><UtensilsCrossed className="w-3 h-3 mr-1" />{MEAL_OPTIONS.find(m => m.id === selectedMeal)?.name}</Badge>}
                          {selectedBaggage.map(id => <Badge key={id} variant="outline" className="text-xs"><Luggage className="w-3 h-3 mr-1" />{BAGGAGE_OPTIONS.find(b => b.id === id)?.name}</Badge>)}
                          {selectedSeat !== "standard" && <Badge variant="outline" className="text-xs"><Armchair className="w-3 h-3 mr-1" />{SEAT_CLASSES.find(s => s.id === selectedSeat)?.name}</Badge>}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Payment */}
                <Card>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5 text-primary" /> Payment</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {(config?.paymentMethods || ["Credit/Debit Card", "bKash", "Nagad", "Bank Transfer"]).map((m: string) => (
                        <label key={m} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/40 cursor-pointer transition-colors">
                          <Checkbox />
                          <span className="text-sm font-medium">{m}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex items-start gap-2 mt-3">
                      <Checkbox id="agree" className="mt-0.5" />
                      <label htmlFor="agree" className="text-xs text-muted-foreground">
                        I agree to the <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link> and <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link>
                      </label>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
              {step < 4 ? (
                <Button onClick={() => setStep(step + 1)} className="font-bold">Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
              ) : (
                <Button className="font-bold shadow-lg shadow-primary/20" onClick={handleFinalAction}>
                  <Shield className="w-4 h-4 mr-1" /> Confirm & Pay ৳{grandTotal.toLocaleString()}
                </Button>
              )}
            </div>
          </div>

          {/* ─── FARE SUMMARY SIDEBAR ─── */}
          <div>
            <Card className="sticky top-28">
              <CardHeader><CardTitle className="text-base">Fare Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                {isRoundTrip ? (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Outbound</span>
                      <span className="font-semibold">৳{outboundPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Return</span>
                      <span className="font-semibold">৳{returnPrice.toLocaleString()}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Base Fare</span>
                      <span className="font-semibold">৳{baseFare.toLocaleString()}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Base Fare</span>
                    <span className="font-semibold">৳{baseFare.toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes & Fees</span>
                  <span className="font-semibold">৳{taxes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span className="font-semibold">৳{serviceCharge}</span>
                </div>

                {addOnTotal > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Add-ons</p>
                    {mealCost > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1"><UtensilsCrossed className="w-3 h-3" /> {MEAL_OPTIONS.find(m => m.id === selectedMeal)?.name}</span>
                        <span className="font-medium">৳{mealCost}</span>
                      </div>
                    )}
                    {baggageCost > 0 && selectedBaggage.map(id => {
                      const bag = BAGGAGE_OPTIONS.find(b => b.id === id);
                      return bag ? (
                        <div key={id} className="flex justify-between text-xs">
                          <span className="text-muted-foreground flex items-center gap-1"><Luggage className="w-3 h-3" /> {bag.name}</span>
                          <span className="font-medium">৳{bag.price}</span>
                        </div>
                      ) : null;
                    })}
                    {seatCost > 0 && (
                      <div className="flex justify-between text-xs">
                        <span className="text-muted-foreground flex items-center gap-1"><Armchair className="w-3 h-3" /> {SEAT_CLASSES.find(s => s.id === selectedSeat)?.name}</span>
                        <span className="font-medium">৳{seatCost}</span>
                      </div>
                    )}
                  </>
                )}

                <Separator />
                <div className="flex justify-between text-base">
                  <span className="font-bold">Total</span>
                  <span className="font-black text-primary">৳{grandTotal.toLocaleString()}</span>
                </div>
                {isRoundTrip && (
                  <p className="text-[10px] text-muted-foreground text-center">Round-trip fare for 1 passenger</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AuthGateModal open={authOpen} onOpenChange={setAuthOpen} onAuthenticated={() => { setAuthOpen(false); handleFinalAction(); }} title="Sign in to complete your booking" />
    </div>
  );
};

export default FlightBooking;
