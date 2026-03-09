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
  UtensilsCrossed, Armchair, Plus, Minus, ChevronDown, ChevronUp, Briefcase, Baby,
} from "lucide-react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useFlightDetails } from "@/hooks/useApiData";
import { useCmsPageContent } from "@/hooks/useCmsContent";
import { useAuth } from "@/hooks/useAuth";
import AuthGateModal from "@/components/AuthGateModal";
import type { BookingFormField } from "@/lib/cms-defaults";

const iconMap: Record<string, any> = { Plane, User, CreditCard, Shield };

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

/* ─── Baggage add-ons ─── */
const BAGGAGE_OPTIONS = [
  { id: "extra5", name: "+5 kg Extra Baggage", price: 500, desc: "Total: 25kg checked" },
  { id: "extra10", name: "+10 kg Extra Baggage", price: 900, desc: "Total: 30kg checked" },
  { id: "extra15", name: "+15 kg Extra Baggage", price: 1200, desc: "Total: 35kg checked" },
  { id: "extra20", name: "+20 kg Extra Baggage", price: 1500, desc: "Total: 40kg checked" },
  { id: "sport", name: "Sports Equipment", price: 2000, desc: "Golf, ski, surfboard etc." },
  { id: "fragile", name: "Fragile Handling", price: 800, desc: "Priority fragile handling" },
];

/* ─── Seat map (simplified) ─── */
const SEAT_CLASSES = [
  { id: "standard", name: "Standard Seat", price: 0, desc: "Pre-assigned at check-in", icon: "🪑" },
  { id: "window", name: "Window Seat", price: 300, desc: "Enjoy the view", icon: "🪟" },
  { id: "aisle", name: "Aisle Seat", price: 300, desc: "Easy access", icon: "🚶" },
  { id: "extra-leg", name: "Extra Legroom", price: 800, desc: "More space for comfort", icon: "🦵" },
  { id: "front", name: "Front Row", price: 600, desc: "Quick exit after landing", icon: "⬆️" },
  { id: "emergency", name: "Emergency Exit Row", price: 500, desc: "Maximum legroom", icon: "🚪" },
];

/* ─── Add-on selection card component ─── */
const AddOnCard = ({ item, selected, onSelect }: { item: { id: string; name: string; price: number; desc: string; icon?: string }; selected: boolean; onSelect: () => void }) => (
  <label
    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
      selected ? "border-primary bg-primary/5 shadow-sm" : "border-border hover:border-primary/40"
    }`}
  >
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

const FlightBooking = () => {
  const [step, setStep] = useState(1);
  const [authOpen, setAuthOpen] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { data: page, isLoading } = useCmsPageContent("/flights/book");
  const { toast } = useToast();
  const config = page?.bookingConfig;

  // Add-on selections
  const [selectedMeal, setSelectedMeal] = useState("standard");
  const [selectedBaggage, setSelectedBaggage] = useState<string[]>([]);
  const [selectedSeat, setSelectedSeat] = useState("standard");

  const [searchParams] = useSearchParams();
  const flightId = searchParams.get("flightId");
  const { data: flightRaw } = useFlightDetails(flightId || undefined);
  const selectedFlight = (flightRaw as any)?.data || (flightRaw as any) || null;

  // Calculate add-on costs
  const mealCost = MEAL_OPTIONS.find(m => m.id === selectedMeal)?.price || 0;
  const baggageCost = selectedBaggage.reduce((sum, id) => sum + (BAGGAGE_OPTIONS.find(b => b.id === id)?.price || 0), 0);
  const seatCost = SEAT_CLASSES.find(s => s.id === selectedSeat)?.price || 0;
  const addOnTotal = mealCost + baggageCost + seatCost;
  const baseFare = selectedFlight?.price || 0;
  const taxes = Math.round(baseFare * 0.12);
  const serviceCharge = 250;
  const grandTotal = baseFare + taxes + serviceCharge + addOnTotal;

  const handleFinalAction = () => {
    if (!isAuthenticated) {
      setAuthOpen(true);
      return;
    }
    navigate("/booking/confirmation", {
      state: {
        booking: {
          type: "Flight",
          bookingRef: `ST-FL-${Date.now().toString(36).toUpperCase()}`,
          route: `${selectedFlight?.origin || "DAC"} → ${selectedFlight?.destination || "CXB"}`,
          flightNo: selectedFlight?.flightNumber || "—",
          airline: selectedFlight?.airline || "—",
          class: selectedFlight?.cabinClass || "Economy",
          departTime: selectedFlight?.departureTime ? new Date(selectedFlight.departureTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—",
          arriveTime: selectedFlight?.arrivalTime ? new Date(selectedFlight.arrivalTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—",
          date: selectedFlight?.departureTime ? new Date(selectedFlight.departureTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—",
          stops: selectedFlight?.stops === 0 ? "Non-stop" : `${selectedFlight?.stops || 0} Stop`,
          passenger: "Traveller",
          baseFare,
          taxes,
          serviceCharge,
          addOns: addOnTotal,
          meal: MEAL_OPTIONS.find(m => m.id === selectedMeal)?.name,
          seat: SEAT_CLASSES.find(s => s.id === selectedSeat)?.name,
          extraBaggage: selectedBaggage.map(id => BAGGAGE_OPTIONS.find(b => b.id === id)?.name).filter(Boolean),
          total: grandTotal,
          paymentMethod: "Card",
        },
      },
    });
  };

  if (isLoading) {
    return <div className="min-h-screen bg-muted/30 pt-20 lg:pt-28 pb-10"><div className="container mx-auto px-4"><Skeleton className="h-96 w-full rounded-xl" /></div></div>;
  }

  const steps = config?.steps || [];
  const totalSteps = Math.max(steps.length, 1) + 1; // +1 for add-ons step

  // Insert add-ons step before payment
  const addOnsStepIndex = Math.max(steps.length, 1); // Right before payment
  const paymentStepIndex = addOnsStepIndex + 1;

  return (
    <div className="min-h-screen bg-muted/30 pt-20 lg:pt-28 pb-10">
      <div className="container mx-auto px-4">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[...steps.map((s: any) => s.label), "Extras", "Payment"].map((label, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step > i + 1 ? "bg-success text-success-foreground" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`text-sm font-medium hidden sm:block ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{label}</span>
              {i < steps.length + 1 && <div className="w-8 sm:w-16 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            {/* Flight summary card */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2"><Plane className="w-5 h-5 text-primary" /> Flight Details</CardTitle>
                  <Badge className="bg-success/10 text-success text-xs">Confirmed Fare</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-xl">
                  <div className="text-center">
                    <p className="text-2xl font-black">{selectedFlight?.departureTime ? new Date(selectedFlight.departureTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{selectedFlight?.origin || "—"}</p>
                  </div>
                  <div className="flex-1 flex flex-col items-center gap-1">
                    <p className="text-[11px] text-muted-foreground font-medium">{selectedFlight?.duration || "—"}</p>
                    <div className="w-full flex items-center gap-1">
                      <div className="w-2 h-2 rounded-full border-2 border-primary" />
                      <div className="flex-1 h-px bg-border" />
                      <div className="w-2 h-2 rounded-full bg-primary" />
                    </div>
                    <p className="text-[11px] text-success font-semibold">{selectedFlight?.stops === 0 ? "Non-stop" : `${selectedFlight?.stops || 0} Stop`}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-black">{selectedFlight?.arrivalTime ? new Date(selectedFlight.arrivalTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—"}</p>
                    <p className="text-xs font-semibold text-muted-foreground">{selectedFlight?.destination || "—"}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Luggage className="w-3.5 h-3.5" /> {selectedFlight?.baggage || "20kg"}</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {selectedFlight?.departureTime ? new Date(selectedFlight.departureTime).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" }) : "—"}</span>
                  <span>{selectedFlight?.airline || "—"} • {selectedFlight?.flightNumber || "—"} • {selectedFlight?.cabinClass || "Economy"}</span>
                </div>
              </CardContent>
            </Card>

            {/* Dynamic form steps */}
            {steps.map((formStep: any, si: number) => {
              if (step < si + 1) return null;
              if (step > si + 1) return null; // Only show current step
              const gridCls = formStep.fields?.some((f: BookingFormField) => f.thirdWidth) ? "grid sm:grid-cols-3 gap-4" : "grid sm:grid-cols-2 gap-4";
              return (
                <Card key={si}>
                  <CardHeader><CardTitle className="text-lg flex items-center gap-2">
                    {si === 1 ? <User className="w-5 h-5 text-primary" /> : <Plane className="w-5 h-5 text-primary" />}
                    {formStep.label}
                  </CardTitle></CardHeader>
                  <CardContent>
                    <div className={gridCls}>
                      {(formStep.fields || []).filter((f: BookingFormField) => f.visible).map((f: BookingFormField) => <RenderField key={f.id} field={f} />)}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* ─── ADD-ONS STEP (Enterprise features) ─── */}
            {step === addOnsStepIndex && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-primary" /> Customize Your Flight
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="meal" className="w-full">
                    <TabsList className="w-full grid grid-cols-3 mb-4">
                      <TabsTrigger value="meal" className="gap-1.5 text-xs sm:text-sm">
                        <UtensilsCrossed className="w-3.5 h-3.5" /> Meal
                      </TabsTrigger>
                      <TabsTrigger value="baggage" className="gap-1.5 text-xs sm:text-sm">
                        <Luggage className="w-3.5 h-3.5" /> Baggage
                      </TabsTrigger>
                      <TabsTrigger value="seat" className="gap-1.5 text-xs sm:text-sm">
                        <Armchair className="w-3.5 h-3.5" /> Seat
                      </TabsTrigger>
                    </TabsList>

                    {/* Meal Selection */}
                    <TabsContent value="meal" className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-2">Select your preferred meal for this flight.</p>
                      {MEAL_OPTIONS.map(meal => (
                        <AddOnCard
                          key={meal.id}
                          item={meal}
                          selected={selectedMeal === meal.id}
                          onSelect={() => setSelectedMeal(meal.id)}
                        />
                      ))}
                    </TabsContent>

                    {/* Baggage Add-ons */}
                    <TabsContent value="baggage" className="space-y-3">
                      <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg mb-2">
                        <Briefcase className="w-4 h-4 text-muted-foreground" />
                        <div>
                          <p className="text-sm font-medium">Included: 20kg Checked + 7kg Cabin</p>
                          <p className="text-xs text-muted-foreground">Your fare includes standard baggage allowance</p>
                        </div>
                      </div>
                      {BAGGAGE_OPTIONS.map(bag => (
                        <AddOnCard
                          key={bag.id}
                          item={bag}
                          selected={selectedBaggage.includes(bag.id)}
                          onSelect={() => setSelectedBaggage(prev =>
                            prev.includes(bag.id) ? prev.filter(x => x !== bag.id) : [...prev, bag.id]
                          )}
                        />
                      ))}
                    </TabsContent>

                    {/* Seat Selection */}
                    <TabsContent value="seat" className="space-y-3">
                      <p className="text-sm text-muted-foreground mb-2">Choose your preferred seating.</p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {SEAT_CLASSES.map(seat => (
                          <AddOnCard
                            key={seat.id}
                            item={seat}
                            selected={selectedSeat === seat.id}
                            onSelect={() => setSelectedSeat(seat.id)}
                          />
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* ─── PAYMENT STEP ─── */}
            {step === paymentStepIndex && (
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
                  {config?.termsText && (
                    <div className="flex items-start gap-2 mt-3">
                      <Checkbox id="agree" className="mt-0.5" />
                      <label htmlFor="agree" className="text-xs text-muted-foreground">
                        {config.termsText.split("Terms & Conditions")[0]}
                        <Link to="/terms" className="text-primary hover:underline">Terms & Conditions</Link>
                        {config.termsText.includes("Refund Policy") && <> and <Link to="/refund-policy" className="text-primary hover:underline">Refund Policy</Link></>}
                      </label>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Navigation buttons */}
            <div className="flex gap-3">
              {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
              {step < paymentStepIndex ? (
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
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base Fare</span>
                  <span className="font-semibold">৳{baseFare.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Taxes & Fees</span>
                  <span className="font-semibold">৳{taxes.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Service Charge</span>
                  <span className="font-semibold">৳{serviceCharge}</span>
                </div>

                {/* Add-on costs */}
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
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AuthGateModal open={authOpen} onOpenChange={setAuthOpen} onAuthenticated={() => { setAuthOpen(false); navigate("/booking/confirmation"); }} title="Sign in to book your flight" />
    </div>
  );
};

export default FlightBooking;
