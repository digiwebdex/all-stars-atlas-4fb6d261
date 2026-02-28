import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, MapPin, Star, ArrowRight, Heart, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { useMedicalHospitals } from "@/hooks/useApiData";
import DataLoader from "@/components/DataLoader";

const MedicalServices = () => {
  const [country, setCountry] = useState("all");
  const [treatment, setTreatment] = useState("all");
  const { data, isLoading, error, refetch } = useMedicalHospitals({ country: country !== "all" ? country : undefined, treatment: treatment !== "all" ? treatment : undefined });
  const hospitals = (data as any)?.hospitals || [];

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground pt-20 lg:pt-28 pb-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3"><Stethoscope className="w-8 h-8" /> Medical Tourism</h1>
          <p className="text-primary-foreground/80 mt-2 max-w-2xl">World-class healthcare at affordable prices.</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-40 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Countries</SelectItem><SelectItem value="india">India</SelectItem><SelectItem value="thailand">Thailand</SelectItem><SelectItem value="singapore">Singapore</SelectItem><SelectItem value="turkey">Turkey</SelectItem><SelectItem value="malaysia">Malaysia</SelectItem></SelectContent>
            </Select>
            <Select value={treatment} onValueChange={setTreatment}>
              <SelectTrigger className="w-44 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"><SelectValue placeholder="Treatment" /></SelectTrigger>
              <SelectContent><SelectItem value="all">All Treatments</SelectItem><SelectItem value="cardiac">Cardiac</SelectItem><SelectItem value="dental">Dental</SelectItem><SelectItem value="orthopedic">Orthopedic</SelectItem><SelectItem value="eye">Eye Care</SelectItem><SelectItem value="cosmetic">Cosmetic Surgery</SelectItem><SelectItem value="cancer">Cancer Treatment</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <DataLoader isLoading={isLoading} error={error} skeleton="cards" retry={refetch}>
          {hospitals.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><p className="font-semibold">No hospitals found</p></CardContent></Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {hospitals.map((hospital: any) => (
                <Card key={hospital.id} className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="relative h-48 overflow-hidden">
                    <img src={hospital.image} alt={hospital.name} className="w-full h-full object-cover" />
                    {hospital.accredited && <Badge className="absolute top-3 left-3 bg-success text-success-foreground"><Shield className="w-3 h-3 mr-1" /> JCI Accredited</Badge>}
                    <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur flex items-center justify-center"><Heart className="w-4 h-4 text-muted-foreground" /></button>
                  </div>
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between mb-2">
                      <div><h3 className="font-bold text-lg">{hospital.name}</h3><p className="text-sm text-muted-foreground flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {hospital.country} {hospital.city}</p></div>
                      <div className="flex items-center gap-1 text-sm"><Star className="w-4 h-4 fill-warning text-warning" /><span className="font-bold">{hospital.rating}</span></div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-3">{(hospital.specialties || []).map((s: string) => <Badge key={s} variant="secondary" className="text-[10px] font-semibold">{s}</Badge>)}</div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div><p className="text-xs text-muted-foreground">Packages</p><p className="font-bold text-primary">{hospital.price}</p></div>
                      <Button size="sm" className="font-bold" asChild><Link to={`/medical/book?hospital=${hospital.id}`}>Enquire <ArrowRight className="w-4 h-4 ml-1" /></Link></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DataLoader>
      </div>
    </div>
  );
};

export default MedicalServices;
