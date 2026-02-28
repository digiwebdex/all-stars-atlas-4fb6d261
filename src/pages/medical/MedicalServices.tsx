import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Stethoscope, MapPin, Star, ArrowRight, Heart, Shield, Clock, Search } from "lucide-react";
import { Link } from "react-router-dom";

const mockHospitals = [
  { id: 1, name: "Apollo Hospitals", city: "Chennai, India", country: "🇮🇳", rating: 4.8, reviews: 2340, specialties: ["Cardiac", "Orthopedic", "Oncology"], price: "From ৳45,000", image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=400", accredited: true },
  { id: 2, name: "Bumrungrad International", city: "Bangkok, Thailand", country: "🇹🇭", rating: 4.9, reviews: 3150, specialties: ["General Checkup", "Dental", "Eye Care"], price: "From ৳35,000", image: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=400", accredited: true },
  { id: 3, name: "Fortis Healthcare", city: "Delhi, India", country: "🇮🇳", rating: 4.7, reviews: 1890, specialties: ["Cardiac", "Neurology", "Fertility"], price: "From ৳40,000", image: "https://images.unsplash.com/photo-1551076805-e1869033e561?w=400", accredited: true },
  { id: 4, name: "Mount Elizabeth", city: "Singapore", country: "🇸🇬", rating: 4.9, reviews: 2780, specialties: ["Cancer Treatment", "Organ Transplant"], price: "From ৳120,000", image: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=400", accredited: true },
  { id: 5, name: "Istanbul Memorial", city: "Istanbul, Turkey", country: "🇹🇷", rating: 4.6, reviews: 1560, specialties: ["Cosmetic Surgery", "Dental", "Eye Care"], price: "From ৳30,000", image: "https://images.unsplash.com/photo-1504439468489-c8920d796a29?w=400", accredited: false },
  { id: 6, name: "Prince Court Medical", city: "Kuala Lumpur, Malaysia", country: "🇲🇾", rating: 4.7, reviews: 1980, specialties: ["General Checkup", "Cardiac", "Orthopedic"], price: "From ৳38,000", image: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400", accredited: true },
];

const MedicalServices = () => {
  const [country, setCountry] = useState("all");
  const [treatment, setTreatment] = useState("all");

  const filtered = mockHospitals.filter(h => {
    if (country !== "all" && !h.city.toLowerCase().includes(country)) return false;
    if (treatment !== "all" && !h.specialties.some(s => s.toLowerCase().includes(treatment))) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground pt-20 lg:pt-28 pb-10">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3">
            <Stethoscope className="w-8 h-8" /> Medical Tourism
          </h1>
          <p className="text-primary-foreground/80 mt-2 max-w-2xl">World-class healthcare at affordable prices. We handle flights, visas, hospital appointments, and accommodation.</p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Select value={country} onValueChange={setCountry}>
              <SelectTrigger className="w-40 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"><SelectValue placeholder="Country" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                <SelectItem value="india">India</SelectItem>
                <SelectItem value="thailand">Thailand</SelectItem>
                <SelectItem value="singapore">Singapore</SelectItem>
                <SelectItem value="turkey">Turkey</SelectItem>
                <SelectItem value="malaysia">Malaysia</SelectItem>
              </SelectContent>
            </Select>
            <Select value={treatment} onValueChange={setTreatment}>
              <SelectTrigger className="w-44 bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground"><SelectValue placeholder="Treatment" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Treatments</SelectItem>
                <SelectItem value="cardiac">Cardiac</SelectItem>
                <SelectItem value="dental">Dental</SelectItem>
                <SelectItem value="orthopedic">Orthopedic</SelectItem>
                <SelectItem value="eye">Eye Care</SelectItem>
                <SelectItem value="cosmetic">Cosmetic Surgery</SelectItem>
                <SelectItem value="cancer">Cancer Treatment</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(hospital => (
            <Card key={hospital.id} className="overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
              <div className="relative h-48 overflow-hidden">
                <img src={hospital.image} alt={hospital.name} className="w-full h-full object-cover" />
                {hospital.accredited && (
                  <Badge className="absolute top-3 left-3 bg-success text-success-foreground">
                    <Shield className="w-3 h-3 mr-1" /> JCI Accredited
                  </Badge>
                )}
                <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-card/80 backdrop-blur flex items-center justify-center hover:bg-card transition-colors">
                  <Heart className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{hospital.name}</h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" /> {hospital.country} {hospital.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-bold">{hospital.rating}</span>
                    <span className="text-muted-foreground text-xs">({hospital.reviews.toLocaleString()})</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {hospital.specialties.map(s => (
                    <Badge key={s} variant="secondary" className="text-[10px] font-semibold">{s}</Badge>
                  ))}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Packages</p>
                    <p className="font-bold text-primary">{hospital.price}</p>
                  </div>
                  <Button size="sm" className="font-bold" asChild>
                    <Link to={`/medical/book?hospital=${hospital.id}`}>
                      Enquire <ArrowRight className="w-4 h-4 ml-1" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MedicalServices;
