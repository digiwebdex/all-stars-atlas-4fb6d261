import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Wifi, Globe, Check, ArrowRight, Signal } from "lucide-react";
import { Link } from "react-router-dom";

const esimPlans = [
  { id: 1, country: "Thailand", flag: "🇹🇭", plans: [
    { data: "1 GB", duration: "7 Days", price: 500, calls: false },
    { data: "3 GB", duration: "15 Days", price: 1200, calls: false },
    { data: "5 GB", duration: "30 Days", price: 2000, calls: true },
    { data: "Unlimited", duration: "30 Days", price: 4500, calls: true },
  ]},
  { id: 2, country: "Malaysia", flag: "🇲🇾", plans: [
    { data: "1 GB", duration: "7 Days", price: 450, calls: false },
    { data: "3 GB", duration: "15 Days", price: 1100, calls: false },
    { data: "5 GB", duration: "30 Days", price: 1800, calls: true },
    { data: "Unlimited", duration: "30 Days", price: 4000, calls: true },
  ]},
  { id: 3, country: "Singapore", flag: "🇸🇬", plans: [
    { data: "1 GB", duration: "7 Days", price: 600, calls: false },
    { data: "3 GB", duration: "15 Days", price: 1500, calls: true },
    { data: "5 GB", duration: "30 Days", price: 2500, calls: true },
    { data: "Unlimited", duration: "30 Days", price: 5500, calls: true },
  ]},
  { id: 4, country: "India", flag: "🇮🇳", plans: [
    { data: "2 GB", duration: "7 Days", price: 300, calls: false },
    { data: "5 GB", duration: "15 Days", price: 800, calls: false },
    { data: "10 GB", duration: "30 Days", price: 1500, calls: true },
    { data: "Unlimited", duration: "30 Days", price: 3000, calls: true },
  ]},
];

const ESIMPlans = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");

  const filtered = selectedCountry === "all" ? esimPlans : esimPlans.filter(p => p.country.toLowerCase() === selectedCountry);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-gradient-to-r from-primary to-accent text-primary-foreground pt-20 lg:pt-28 pb-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Smartphone className="w-8 h-8" /> eSIM Data Plans
          </h1>
          <p className="text-primary-foreground/80 mt-2 max-w-2xl">Stay connected worldwide. Instant activation, no physical SIM needed.</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-44 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="thailand">Thailand</SelectItem>
                <SelectItem value="malaysia">Malaysia</SelectItem>
                <SelectItem value="singapore">Singapore</SelectItem>
                <SelectItem value="india">India</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        {filtered.map(country => (
          <div key={country.id}>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">{country.flag}</span> {country.country}
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {country.plans.map((plan, i) => (
                <Card key={i} className={`hover:shadow-lg transition-all ${i === country.plans.length - 1 ? 'ring-1 ring-primary' : ''}`}>
                  <CardContent className="p-5 text-center space-y-3">
                    {i === country.plans.length - 1 && <Badge className="bg-primary text-primary-foreground">Best Value</Badge>}
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                      <Signal className="w-6 h-6 text-primary" />
                    </div>
                    <h3 className="text-2xl font-black">{plan.data}</h3>
                    <p className="text-sm text-muted-foreground">{plan.duration}</p>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <div className="flex items-center justify-center gap-1"><Check className="w-3 h-3 text-success" /> 4G/5G Data</div>
                      <div className="flex items-center justify-center gap-1"><Check className="w-3 h-3 text-success" /> Instant Activation</div>
                      {plan.calls && <div className="flex items-center justify-center gap-1"><Check className="w-3 h-3 text-success" /> Local Calls</div>}
                    </div>
                    <p className="text-2xl font-black text-primary">৳{plan.price.toLocaleString()}</p>
                    <Button className="w-full font-bold" size="sm" asChild>
                      <Link to={`/esim/purchase?country=${country.country.toLowerCase()}&plan=${plan.data}`}>
                        Buy Now <ArrowRight className="w-4 h-4 ml-1" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ESIMPlans;
