import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Smartphone, Check, ArrowRight, Signal } from "lucide-react";
import { Link } from "react-router-dom";
import { useESIMPlans } from "@/hooks/useApiData";
import { useCmsPageContent } from "@/hooks/useCmsContent";
import DataLoader from "@/components/DataLoader";

const ESIMPlans = () => {
  const [selectedCountry, setSelectedCountry] = useState("all");
  const { data: page } = useCmsPageContent("/esim");
  const listing = page?.listingConfig;

  const { data: rawData, isLoading, error, refetch } = useESIMPlans({ country: selectedCountry !== "all" ? selectedCountry : undefined });
  const apiData = (rawData as any) || {};
  const plans = apiData.data || [];
  // Group plans by country for display
  const groupedByCountry = plans.reduce((acc: any, plan: any) => {
    const key = plan.country || 'Other';
    if (!acc[key]) acc[key] = { id: key, country: key, flag: '', plans: [] };
    acc[key].plans.push(plan);
    return acc;
  }, {} as Record<string, any>);
  const countries = Object.values(groupedByCountry);

  const countryFilters = listing?.esimCountries || [
    { value: "thailand", label: "Thailand" }, { value: "malaysia", label: "Malaysia" },
    { value: "singapore", label: "Singapore" }, { value: "india", label: "India" },
  ];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className={`bg-gradient-to-r ${page?.hero.gradient || "from-primary to-accent"} text-primary-foreground pt-20 lg:pt-28 pb-10`}>
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3"><Smartphone className="w-8 h-8" /> {page?.hero.title || "eSIM Data Plans"}</h1>
          <p className="text-primary-foreground/80 mt-2 max-w-2xl">{page?.hero.subtitle}</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Select value={selectedCountry} onValueChange={setSelectedCountry}>
              <SelectTrigger className="w-44 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {countryFilters.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 space-y-8">
        <DataLoader isLoading={isLoading} error={error} skeleton="cards" retry={refetch}>
          {countries.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><p className="font-semibold">No eSIM plans available</p></CardContent></Card>
          ) : countries.map((country: any) => (
            <div key={country.id}>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><span className="text-2xl">{country.flag}</span> {country.country}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {(country.plans || []).map((plan: any, i: number) => (
                  <Card key={i} className={`hover:shadow-lg transition-all ${i === (country.plans?.length || 0) - 1 ? 'ring-1 ring-primary' : ''}`}>
                    <CardContent className="p-5 text-center space-y-3">
                      {i === (country.plans?.length || 0) - 1 && <Badge className="bg-primary text-primary-foreground">Best Value</Badge>}
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><Signal className="w-6 h-6 text-primary" /></div>
                      <h3 className="text-2xl font-black">{plan.dataAmount || plan.data}</h3>
                      <p className="text-sm text-muted-foreground">{plan.duration}</p>
                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center justify-center gap-1"><Check className="w-3 h-3 text-success" /> 4G/5G Data</div>
                        <div className="flex items-center justify-center gap-1"><Check className="w-3 h-3 text-success" /> Instant Activation</div>
                        {plan.calls && <div className="flex items-center justify-center gap-1"><Check className="w-3 h-3 text-success" /> Local Calls</div>}
                      </div>
                      <p className="text-2xl font-black text-primary">৳{plan.price?.toLocaleString()}</p>
                      <Button className="w-full font-bold" size="sm" asChild>
                        <Link to={`/esim/purchase?country=${plan.country?.toLowerCase()}&plan=${plan.dataAmount || plan.data}`}>Buy Now <ArrowRight className="w-4 h-4 ml-1" /></Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </DataLoader>
      </div>
    </div>
  );
};

export default ESIMPlans;
