import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import {
  Plane, Building2, FileText, Palmtree, Stethoscope, Car,
  Smartphone, PhoneCall, Receipt, ArrowLeftRight, Search, Users,
  MapPin, ChevronDown, Wifi, Globe, Zap, CreditCard
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { TREATMENT_TYPES, CAR_TYPES, RECHARGE_OPERATORS, BILL_CATEGORIES } from "@/lib/constants";

const tabs = [
  { id: "flight", label: "Flight", icon: Plane },
  { id: "hotel", label: "Hotel", icon: Building2 },
  { id: "holiday", label: "Holiday", icon: Palmtree },
  { id: "visa", label: "Visa", icon: FileText },
  { id: "medical", label: "Medical", icon: Stethoscope },
  { id: "cars", label: "Cars", icon: Car },
  { id: "esim", label: "eSIM", icon: Smartphone },
  { id: "recharge", label: "Recharge", icon: PhoneCall },
  { id: "paybill", label: "Pay Bill", icon: Receipt },
];

const SearchWidget = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("flight");
  const [tripType, setTripType] = useState("roundtrip");
  const [departDate, setDepartDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [travelDate, setTravelDate] = useState<Date>();
  const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });
  const [cabinClass, setCabinClass] = useState("economy");
  const [fareType, setFareType] = useState("regular");

  // Medical
  const [medicalDate, setMedicalDate] = useState<Date>();
  const [treatmentType, setTreatmentType] = useState("");
  // Cars
  const [pickupDate, setPickupDate] = useState<Date>();
  const [dropoffDate, setDropoffDate] = useState<Date>();
  // eSIM
  const [esimDate, setEsimDate] = useState<Date>();
  // Recharge
  const [rechargeOperator, setRechargeOperator] = useState("");
  const [rechargeNumber, setRechargeNumber] = useState("");
  const [rechargeAmount, setRechargeAmount] = useState("");
  const [rechargeType, setRechargeType] = useState("prepaid");
  // Pay Bill
  const [billCategory, setBillCategory] = useState("");
  const [billerName, setBillerName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [billAmount, setBillAmount] = useState("");

  const totalPax = passengers.adults + passengers.children + passengers.infants;

  const handleFlightSearch = () => {
    const params = new URLSearchParams({
      from: 'DAC', to: 'CXB', tripType,
      adults: String(passengers.adults), children: String(passengers.children), infants: String(passengers.infants),
      cabin: cabinClass, fare: fareType,
    });
    if (departDate) params.set('depart', format(departDate, 'yyyy-MM-dd'));
    if (returnDate && tripType === 'roundtrip') params.set('return', format(returnDate, 'yyyy-MM-dd'));
    navigate(`/flights?${params.toString()}`);
  };

  const handleHotelSearch = () => {
    const params = new URLSearchParams({ destination: "Cox's Bazar" });
    if (checkIn) params.set('checkIn', format(checkIn, 'yyyy-MM-dd'));
    if (checkOut) params.set('checkOut', format(checkOut, 'yyyy-MM-dd'));
    navigate(`/hotels?${params.toString()}`);
  };

  const handleVisaSearch = () => navigate('/visa');
  const handleHolidaySearch = () => navigate('/holidays');

  const handleMedicalSearch = () => {
    const params = new URLSearchParams();
    if (treatmentType) params.set('treatment', treatmentType);
    if (medicalDate) params.set('date', format(medicalDate, 'yyyy-MM-dd'));
    navigate(`/medical?${params.toString()}`);
  };

  const handleCarSearch = () => {
    const params = new URLSearchParams();
    if (pickupDate) params.set('pickup', format(pickupDate, 'yyyy-MM-dd'));
    if (dropoffDate) params.set('dropoff', format(dropoffDate, 'yyyy-MM-dd'));
    navigate(`/cars?${params.toString()}`);
  };

  const handleEsimSearch = () => {
    const params = new URLSearchParams();
    if (esimDate) params.set('activation', format(esimDate, 'yyyy-MM-dd'));
    navigate(`/esim?${params.toString()}`);
  };

  const handleRecharge = () => {
    const params = new URLSearchParams();
    if (rechargeOperator) params.set('operator', rechargeOperator);
    if (rechargeNumber) params.set('number', rechargeNumber);
    if (rechargeAmount) params.set('amount', rechargeAmount);
    params.set('type', rechargeType);
    navigate(`/recharge?${params.toString()}`);
  };

  const handlePayBill = () => {
    const params = new URLSearchParams();
    if (billCategory) params.set('category', billCategory);
    if (billerName) params.set('biller', billerName);
    if (accountNumber) params.set('account', accountNumber);
    if (billAmount) params.set('amount', billAmount);
    navigate(`/paybill?${params.toString()}`);
  };

  const tabContent: Record<string, React.ReactNode> = {
    flight: (
      <div className="space-y-4">
        {/* Trip type + controls */}
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center justify-between gap-3">
          <RadioGroup value={tripType} onValueChange={setTripType} className="flex gap-1.5 flex-wrap">
            {[
              { value: "oneway", label: "One Way" },
              { value: "roundtrip", label: "Round Trip" },
              { value: "multicity", label: "Multi City" },
            ].map((t) => (
              <label
                key={t.value}
                className={`px-3 sm:px-4 py-1.5 rounded-full text-[12px] sm:text-[13px] font-semibold cursor-pointer transition-all border ${
                  tripType === t.value
                    ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                    : "bg-transparent text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                <RadioGroupItem value={t.value} className="sr-only" />
                {t.label}
              </label>
            ))}
          </RadioGroup>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs gap-1.5 h-8 rounded-lg font-semibold flex-1 sm:flex-none">
                  <Users className="w-3.5 h-3.5" />
                  {totalPax} Traveller{totalPax > 1 ? "s" : ""}
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72" align="end">
                <div className="space-y-3">
                  {[
                    { key: "adults" as const, label: "Adults", desc: "12+ years" },
                    { key: "children" as const, label: "Children", desc: "2-11 years" },
                    { key: "infants" as const, label: "Infants", desc: "Under 2" },
                  ].map((p) => (
                    <div key={p.key} className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-semibold">{p.label}</div>
                        <div className="text-xs text-muted-foreground">{p.desc}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" className="h-8 w-8 text-xs rounded-lg"
                          onClick={() => setPassengers(prev => ({ ...prev, [p.key]: Math.max(p.key === "adults" ? 1 : 0, prev[p.key] - 1) }))}>−</Button>
                        <span className="w-5 text-center text-sm font-bold">{passengers[p.key]}</span>
                        <Button variant="outline" size="icon" className="h-8 w-8 text-xs rounded-lg"
                          onClick={() => setPassengers(prev => ({ ...prev, [p.key]: prev[p.key] + 1 }))}>+</Button>
                      </div>
                    </div>
                  ))}
                  <div className="pt-2 border-t border-border">
                    <Select value={cabinClass} onValueChange={setCabinClass}>
                      <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["Economy", "Premium Economy", "Business", "First"].map(c => (
                          <SelectItem key={c} value={c.toLowerCase().replace(" ", "-")}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>

            <Select value={cabinClass} onValueChange={setCabinClass}>
              <SelectTrigger className="h-8 w-auto text-xs border gap-1 rounded-lg font-semibold flex-1 sm:flex-none">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["Economy", "Premium Economy", "Business", "First"].map(c => (
                  <SelectItem key={c} value={c.toLowerCase().replace(" ", "-")}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Search Fields */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
          <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">From</div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-lg sm:text-xl font-black text-primary tracking-tight">DAC</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">Dhaka</div>
                <div className="text-[11px] text-muted-foreground truncate">Hazrat Shahjalal Intl Airport</div>
              </div>
            </div>
          </div>

          <div className="flex md:hidden items-center justify-center py-1">
            <button className="w-9 h-9 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-sm">
              <ArrowLeftRight className="w-4 h-4 rotate-90" />
            </button>
          </div>
          <div className="hidden md:flex items-center justify-center -mx-4 z-10">
            <button className="w-10 h-10 rounded-full bg-card border-2 border-primary/30 flex items-center justify-center text-primary hover:bg-primary hover:text-primary-foreground transition-all shadow-md hover:shadow-lg hover:scale-110">
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">To</div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-lg sm:text-xl font-black text-primary tracking-tight">CXB</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-bold truncate">Cox's Bazar</div>
                <div className="text-[11px] text-muted-foreground truncate">Cox's Bazar Airport</div>
              </div>
            </div>
          </div>

          <div className={`${tripType === "roundtrip" ? "col-span-1 sm:col-span-1" : ""} md:col-span-2 search-field border-b md:border-b-0 flex-col items-start`}>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Departure</div>
            <Popover>
              <PopoverTrigger className="w-full text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black">{departDate ? format(departDate, "dd") : "26"}</span>
                  <div>
                    <div className="text-sm font-bold">{departDate ? format(departDate, "MMM''yy") : "Feb'26"}</div>
                    <div className="text-[11px] text-muted-foreground">{departDate ? format(departDate, "EEEE") : "Thursday"}</div>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={departDate} onSelect={setDepartDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>

          {tripType === "roundtrip" && (
            <div className="md:col-span-2 search-field border-b md:border-b-0 flex-col items-start">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Return</div>
              <Popover>
                <PopoverTrigger className="w-full text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-xl sm:text-2xl font-black">{returnDate ? format(returnDate, "dd") : "28"}</span>
                    <div>
                      <div className="text-sm font-bold">{returnDate ? format(returnDate, "MMM''yy") : "Feb'26"}</div>
                      <div className="text-[11px] text-muted-foreground">{returnDate ? format(returnDate, "EEEE") : "Saturday"}</div>
                    </div>
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={returnDate} onSelect={setReturnDate} initialFocus />
                </PopoverContent>
              </Popover>
            </div>
          )}

          <div className={`${tripType === "roundtrip" ? "md:col-span-2" : "md:col-span-4"} flex items-center justify-center p-3`}>
            <Button onClick={handleFlightSearch} className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 hover:shadow-secondary/40 transition-all active:scale-[0.98]">
              <Search className="w-5 h-5 mr-2" /> Search
            </Button>
          </div>
        </div>

        {/* Fare Type */}
        <div className="flex flex-wrap gap-4 sm:gap-5">
          {["Regular", "Student", "Umrah"].map((f) => (
            <label key={f} className="flex items-center gap-2 cursor-pointer text-sm group" onClick={() => setFareType(f.toLowerCase())}>
              <div className={`w-[18px] h-[18px] rounded-full border-2 flex items-center justify-center transition-all ${
                fareType === f.toLowerCase() ? "border-primary bg-primary/5" : "border-muted-foreground/30 group-hover:border-primary/40"
              }`}>
                {fareType === f.toLowerCase() && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
              </div>
              <span className={`font-medium ${fareType === f.toLowerCase() ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                {f} Fare
              </span>
            </label>
          ))}
        </div>
      </div>
    ),

    hotel: (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
        <div className="md:col-span-4 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Destination</div>
          <div className="flex items-center gap-2 w-full">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Cox's Bazar</div>
              <div className="text-[11px] text-muted-foreground">Cox's Bazar, Bangladesh</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:contents">
          <div className="md:col-span-2 search-field border-b md:border-b-0 border-r md:border-r flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Check-in</div>
            <Popover>
              <PopoverTrigger className="w-full text-left">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-2xl font-black">{checkIn ? format(checkIn, "dd") : "27"}</span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold">{checkIn ? format(checkIn, "MMM''yy") : "Feb'26"}</div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground">{checkIn ? format(checkIn, "EEEE") : "Friday"}</div>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={checkIn} onSelect={setCheckIn} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="md:col-span-2 search-field border-b md:border-b-0 flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Check-out</div>
            <Popover>
              <PopoverTrigger className="w-full text-left">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <span className="text-xl sm:text-2xl font-black">{checkOut ? format(checkOut, "dd") : "01"}</span>
                  <div>
                    <div className="text-xs sm:text-sm font-bold">{checkOut ? format(checkOut, "MMM''yy") : "Mar'26"}</div>
                    <div className="text-[10px] sm:text-[11px] text-muted-foreground">{checkOut ? format(checkOut, "EEEE") : "Sunday"}</div>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={checkOut} onSelect={setCheckOut} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="md:col-span-2 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Guests</div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black">02</span>
            <div>
              <div className="text-sm font-bold">Guests</div>
              <div className="text-[11px] text-muted-foreground">1 Room</div>
            </div>
          </div>
        </div>
        <div className="md:col-span-2 flex items-center justify-center p-3">
          <Button onClick={handleHotelSearch} className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 hover:shadow-secondary/40 transition-all active:scale-[0.98]">
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </div>
    ),

    visa: (
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
        <div className="sm:col-span-2 md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Country</div>
          <div className="flex items-center gap-2 w-full">
            <span className="text-xl font-black text-primary">🇹🇭</span>
            <div>
              <div className="text-sm font-bold">Thailand</div>
              <div className="text-[11px] text-muted-foreground">Tourist Visa</div>
            </div>
          </div>
        </div>
        <div className="search-field border-b md:border-b-0 flex-col items-start md:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Travel Date</div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black">09</span>
            <div>
              <div className="text-sm font-bold">Mar'26</div>
              <div className="text-[11px] text-muted-foreground">Monday</div>
            </div>
          </div>
        </div>
        <div className="search-field border-b md:border-b-0 flex-col items-start md:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Return Date</div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black">08</span>
            <div>
              <div className="text-sm font-bold">Apr'26</div>
              <div className="text-[11px] text-muted-foreground">Wednesday</div>
            </div>
          </div>
        </div>
        <div className="sm:col-span-2 md:col-span-2 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Travellers</div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black">01</span>
            <div>
              <div className="text-sm font-bold">Traveller</div>
              <div className="text-[11px] text-muted-foreground">Bangladeshi</div>
            </div>
          </div>
        </div>
        <div className="sm:col-span-2 md:col-span-3 flex items-center justify-center p-3">
          <Button onClick={handleVisaSearch} className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 transition-all active:scale-[0.98]">
            <Search className="w-5 h-5 mr-2" /> Search
          </Button>
        </div>
      </div>
    ),

    holiday: (
      <div className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
          <div className="md:col-span-5 search-field border-b md:border-b-0 flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Destination</div>
            <div className="flex items-center gap-2 w-full">
              <span className="text-xl font-black text-primary">🇧🇩</span>
              <div>
                <div className="text-sm font-bold">Cox's Bazar</div>
                <div className="text-[11px] text-muted-foreground">Bangladesh</div>
              </div>
            </div>
          </div>
          <div className="md:col-span-4 search-field border-b md:border-b-0 flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Travel Date</div>
            <Popover>
              <PopoverTrigger className="w-full text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xl sm:text-2xl font-black">{travelDate ? format(travelDate, "dd") : "25"}</span>
                  <div>
                    <div className="text-sm font-bold">{travelDate ? format(travelDate, "MMM''yy") : "Feb'26"}</div>
                    <div className="text-[11px] text-muted-foreground">{travelDate ? format(travelDate, "EEEE") : "Wednesday"}</div>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={travelDate} onSelect={setTravelDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="md:col-span-3 flex items-center justify-center p-3">
            <Button onClick={handleHolidaySearch} className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 transition-all active:scale-[0.98]">
              <Search className="w-5 h-5 mr-2" /> Search
            </Button>
          </div>
        </div>
        <button className="text-sm text-primary font-semibold hover:underline">+ Add another city</button>
      </div>
    ),

    // ====== MEDICAL TOURISM ======
    medical: (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
        <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Destination</div>
          <div className="flex items-center gap-2 w-full">
            <Globe className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <Select defaultValue="india">
                <SelectTrigger className="border-0 p-0 h-auto text-sm font-bold shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="india">🇮🇳 India</SelectItem>
                  <SelectItem value="thailand">🇹🇭 Thailand</SelectItem>
                  <SelectItem value="singapore">🇸🇬 Singapore</SelectItem>
                  <SelectItem value="malaysia">🇲🇾 Malaysia</SelectItem>
                  <SelectItem value="turkey">🇹🇷 Turkey</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-[11px] text-muted-foreground">Medical Tourism</div>
            </div>
          </div>
        </div>
        <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Treatment</div>
          <Select value={treatmentType} onValueChange={setTreatmentType}>
            <SelectTrigger className="border-0 p-0 h-auto text-sm font-bold shadow-none focus:ring-0">
              <SelectValue placeholder="Select treatment" />
            </SelectTrigger>
            <SelectContent>
              {TREATMENT_TYPES.map(t => (
                <SelectItem key={t} value={t.toLowerCase().replace(/ /g, '-')}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-2 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Travel Date</div>
          <Popover>
            <PopoverTrigger className="w-full text-left">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black">{medicalDate ? format(medicalDate, "dd") : "—"}</span>
                <div>
                  <div className="text-sm font-bold">{medicalDate ? format(medicalDate, "MMM''yy") : "Select"}</div>
                  <div className="text-[11px] text-muted-foreground">{medicalDate ? format(medicalDate, "EEEE") : "Date"}</div>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={medicalDate} onSelect={setMedicalDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="md:col-span-2 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Patients</div>
          <div className="flex items-center gap-2">
            <span className="text-xl sm:text-2xl font-black">01</span>
            <div>
              <div className="text-sm font-bold">Patient</div>
              <div className="text-[11px] text-muted-foreground">+ Companion</div>
            </div>
          </div>
        </div>
        <div className="md:col-span-2 flex items-center justify-center p-3">
          <Button onClick={handleMedicalSearch} className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 transition-all active:scale-[0.98]">
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </div>
    ),

    // ====== CAR RENTAL ======
    cars: (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
        <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Pickup Location</div>
          <div className="flex items-center gap-2 w-full">
            <MapPin className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Dhaka</div>
              <div className="text-[11px] text-muted-foreground">Hazrat Shahjalal Airport</div>
            </div>
          </div>
        </div>
        <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Drop-off Location</div>
          <div className="flex items-center gap-2 w-full">
            <MapPin className="w-5 h-5 text-secondary shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold">Cox's Bazar</div>
              <div className="text-[11px] text-muted-foreground">Same as pickup or different</div>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 md:contents">
          <div className="md:col-span-2 search-field border-b md:border-b-0 border-r flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Pickup Date</div>
            <Popover>
              <PopoverTrigger className="w-full text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black">{pickupDate ? format(pickupDate, "dd") : "—"}</span>
                  <div>
                    <div className="text-xs font-bold">{pickupDate ? format(pickupDate, "MMM''yy") : "Select"}</div>
                    <div className="text-[10px] text-muted-foreground">{pickupDate ? format(pickupDate, "EEEE") : "Date"}</div>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={pickupDate} onSelect={setPickupDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
          <div className="md:col-span-2 search-field border-b md:border-b-0 flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Drop-off Date</div>
            <Popover>
              <PopoverTrigger className="w-full text-left">
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black">{dropoffDate ? format(dropoffDate, "dd") : "—"}</span>
                  <div>
                    <div className="text-xs font-bold">{dropoffDate ? format(dropoffDate, "MMM''yy") : "Select"}</div>
                    <div className="text-[10px] text-muted-foreground">{dropoffDate ? format(dropoffDate, "EEEE") : "Date"}</div>
                  </div>
                </div>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dropoffDate} onSelect={setDropoffDate} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="md:col-span-2 flex items-center justify-center p-3">
          <Button onClick={handleCarSearch} className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 transition-all active:scale-[0.98]">
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </div>
    ),

    // ====== eSIM ======
    esim: (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
        <div className="md:col-span-4 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Destination Country</div>
          <div className="flex items-center gap-2 w-full">
            <Wifi className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <Select defaultValue="thailand">
                <SelectTrigger className="border-0 p-0 h-auto text-sm font-bold shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="thailand">🇹🇭 Thailand</SelectItem>
                  <SelectItem value="malaysia">🇲🇾 Malaysia</SelectItem>
                  <SelectItem value="singapore">🇸🇬 Singapore</SelectItem>
                  <SelectItem value="india">🇮🇳 India</SelectItem>
                  <SelectItem value="uae">🇦🇪 UAE</SelectItem>
                  <SelectItem value="turkey">🇹🇷 Turkey</SelectItem>
                  <SelectItem value="uk">🇬🇧 United Kingdom</SelectItem>
                  <SelectItem value="usa">🇺🇸 United States</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-[11px] text-muted-foreground">eSIM Data Plan</div>
            </div>
          </div>
        </div>
        <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Data Plan</div>
          <Select defaultValue="3gb-15d">
            <SelectTrigger className="border-0 p-0 h-auto text-sm font-bold shadow-none focus:ring-0"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="1gb-7d">1 GB — 7 Days</SelectItem>
              <SelectItem value="3gb-15d">3 GB — 15 Days</SelectItem>
              <SelectItem value="5gb-30d">5 GB — 30 Days</SelectItem>
              <SelectItem value="10gb-30d">10 GB — 30 Days</SelectItem>
              <SelectItem value="unlimited-30d">Unlimited — 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Activation Date</div>
          <Popover>
            <PopoverTrigger className="w-full text-left">
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black">{esimDate ? format(esimDate, "dd") : "—"}</span>
                <div>
                  <div className="text-sm font-bold">{esimDate ? format(esimDate, "MMM''yy") : "Select"}</div>
                  <div className="text-[11px] text-muted-foreground">{esimDate ? format(esimDate, "EEEE") : "Date"}</div>
                </div>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={esimDate} onSelect={setEsimDate} initialFocus />
            </PopoverContent>
          </Popover>
        </div>
        <div className="md:col-span-2 flex items-center justify-center p-3">
          <Button onClick={handleEsimSearch} className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 transition-all active:scale-[0.98]">
            <Search className="w-5 h-5" />
          </Button>
        </div>
      </div>
    ),

    // ====== RECHARGE ======
    recharge: (
      <div className="space-y-4">
        <div className="flex gap-2">
          {["prepaid", "postpaid"].map(t => (
            <button key={t} onClick={() => setRechargeType(t)}
              className={`px-4 py-1.5 rounded-full text-[13px] font-semibold cursor-pointer transition-all border ${
                rechargeType === t
                  ? "bg-primary text-primary-foreground border-primary shadow-md shadow-primary/20"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
          <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Operator</div>
            <Select value={rechargeOperator} onValueChange={setRechargeOperator}>
              <SelectTrigger className="border-0 p-0 h-auto text-sm font-bold shadow-none focus:ring-0">
                <SelectValue placeholder="Select operator" />
              </SelectTrigger>
              <SelectContent>
                {RECHARGE_OPERATORS.map(op => (
                  <SelectItem key={op.id} value={op.id}>{op.logo} {op.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Phone Number</div>
            <div className="flex items-center gap-2 w-full">
              <PhoneCall className="w-4 h-4 text-primary shrink-0" />
              <Input value={rechargeNumber} onChange={e => setRechargeNumber(e.target.value)}
                placeholder="01XXX-XXXXXX" className="border-0 p-0 h-auto text-sm font-bold shadow-none focus-visible:ring-0" />
            </div>
          </div>
          <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Amount (৳)</div>
            <div className="flex items-center gap-2 w-full">
              <Zap className="w-4 h-4 text-secondary shrink-0" />
              <Input value={rechargeAmount} onChange={e => setRechargeAmount(e.target.value)}
                placeholder="Enter amount" type="number" className="border-0 p-0 h-auto text-sm font-bold shadow-none focus-visible:ring-0" />
            </div>
          </div>
          <div className="md:col-span-3 flex items-center justify-center p-3">
            <Button onClick={handleRecharge} className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 transition-all active:scale-[0.98]">
              <Zap className="w-5 h-5 mr-2" /> Recharge
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {[50, 100, 200, 500, 1000].map(amt => (
            <button key={amt} onClick={() => setRechargeAmount(String(amt))}
              className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
                rechargeAmount === String(amt) ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
              }`}>
              ৳{amt}
            </button>
          ))}
        </div>
      </div>
    ),

    // ====== PAY BILL ======
    paybill: (
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border border-border rounded-2xl overflow-hidden bg-background shadow-sm">
        <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Category</div>
          <div className="flex items-center gap-2 w-full">
            <Receipt className="w-5 h-5 text-primary shrink-0" />
            <Select value={billCategory} onValueChange={setBillCategory}>
              <SelectTrigger className="border-0 p-0 h-auto text-sm font-bold shadow-none focus:ring-0">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {BILL_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat.toLowerCase().replace(/ /g, '-')}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="md:col-span-3 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Biller Name</div>
          <Input value={billerName} onChange={e => setBillerName(e.target.value)}
            placeholder="e.g. DPDC, Titas Gas" className="border-0 p-0 h-auto text-sm font-bold shadow-none focus-visible:ring-0" />
        </div>
        <div className="md:col-span-2 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Account No.</div>
          <Input value={accountNumber} onChange={e => setAccountNumber(e.target.value)}
            placeholder="Account/Subscriber #" className="border-0 p-0 h-auto text-sm font-bold shadow-none focus-visible:ring-0" />
        </div>
        <div className="md:col-span-2 search-field border-b md:border-b-0 flex-col items-start">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Amount (৳)</div>
          <div className="flex items-center gap-2 w-full">
            <CreditCard className="w-4 h-4 text-secondary shrink-0" />
            <Input value={billAmount} onChange={e => setBillAmount(e.target.value)}
              placeholder="Amount" type="number" className="border-0 p-0 h-auto text-sm font-bold shadow-none focus-visible:ring-0" />
          </div>
        </div>
        <div className="md:col-span-2 flex items-center justify-center p-3">
          <Button onClick={handlePayBill} className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 transition-all active:scale-[0.98]">
            <CreditCard className="w-5 h-5 mr-2" /> Pay
          </Button>
        </div>
      </div>
    ),
  };

  return (
    <div className="glass-card-hero rounded-2xl overflow-hidden">
      {/* Tabs */}
      <div className="flex items-center gap-0 px-2 sm:px-3 pt-2 sm:pt-3 overflow-x-auto scrollbar-none border-b border-border/40 -webkit-overflow-scrolling-touch">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`search-tab whitespace-nowrap shrink-0 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm ${
              activeTab === tab.id ? "search-tab-active" : ""
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden xs:inline sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-3 sm:p-4 md:p-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {tabContent[activeTab]}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SearchWidget;
