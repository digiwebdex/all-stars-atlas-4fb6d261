import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import {
  Plane, Building2, FileText, Palmtree, Stethoscope, Car,
  Smartphone, PhoneCall, Receipt, ArrowLeftRight, Search, Users,
  MapPin, ChevronDown
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

  const totalPax = passengers.adults + passengers.children + passengers.infants;

  const tabContent = {
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

        {/* Search Fields — stacks vertically on mobile */}
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

          {/* Swap — centered between fields on desktop, inline row on mobile */}
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

          {/* Dates — 2-col on mobile when roundtrip, full width otherwise */}
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

          {/* Search button */}
          <div className={`${tripType === "roundtrip" ? "md:col-span-2" : "md:col-span-4"} flex items-center justify-center p-3`}>
            <Button className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 hover:shadow-secondary/40 transition-all active:scale-[0.98]">
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
        {/* Check-in/out — side by side on mobile via grid */}
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
          <Button className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 hover:shadow-secondary/40 transition-all active:scale-[0.98]">
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
          <Button className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 transition-all active:scale-[0.98]">
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
            <Button className="w-full h-12 md:h-full md:min-h-[56px] rounded-xl bg-secondary text-secondary-foreground hover:bg-secondary/90 text-base font-extrabold shadow-xl shadow-secondary/25 transition-all active:scale-[0.98]">
              <Search className="w-5 h-5 mr-2" /> Search
            </Button>
          </div>
        </div>
        <button className="text-sm text-primary font-semibold hover:underline">+ Add another city</button>
      </div>
    ),
  };

  return (
    <div className="glass-card-hero rounded-2xl overflow-hidden">
      {/* Tabs — horizontally scrollable on mobile */}
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
            {tabContent[activeTab as keyof typeof tabContent] || (
              <div className="py-10 sm:py-12 text-center text-muted-foreground">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                  {(() => { const TabIcon = tabs.find(t => t.id === activeTab)?.icon || Plane; return <TabIcon className="w-6 h-6 sm:w-7 sm:h-7" />; })()}
                </div>
                <p className="text-base sm:text-lg font-bold mb-1">{tabs.find(t => t.id === activeTab)?.label}</p>
                <p className="text-sm">Coming soon — this service will be available shortly.</p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default SearchWidget;
