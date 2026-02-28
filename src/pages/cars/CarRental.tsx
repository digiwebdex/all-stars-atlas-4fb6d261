import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Car, MapPin, Star, Users, Fuel, Settings2, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CAR_TYPES } from "@/lib/constants";

const mockCars = [
  { id: 1, name: "Toyota Corolla", type: "Sedan", seats: 4, fuel: "Petrol", transmission: "Auto", price: 3500, image: "https://images.unsplash.com/photo-1590362891991-f776e747a588?w=400", rating: 4.7, reviews: 120 },
  { id: 2, name: "Honda CR-V", type: "SUV", seats: 5, fuel: "Petrol", transmission: "Auto", price: 5500, image: "https://images.unsplash.com/photo-1568844293986-8d0400f85cfc?w=400", rating: 4.8, reviews: 89 },
  { id: 3, name: "Toyota HiAce", type: "Van", seats: 10, fuel: "Diesel", transmission: "Manual", price: 7000, image: "https://images.unsplash.com/photo-1544636331-e26879cd4d9b?w=400", rating: 4.5, reviews: 67 },
  { id: 4, name: "Suzuki Swift", type: "Economy", seats: 4, fuel: "Petrol", transmission: "Auto", price: 2500, image: "https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=400", rating: 4.4, reviews: 156 },
  { id: 5, name: "Toyota Land Cruiser", type: "Luxury", seats: 7, fuel: "Diesel", transmission: "Auto", price: 12000, image: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=400", rating: 4.9, reviews: 45 },
  { id: 6, name: "Hyundai H-1", type: "Minibus", seats: 12, fuel: "Diesel", transmission: "Auto", price: 8500, image: "https://images.unsplash.com/photo-1549317661-bd32c8ce0b2c?w=400", rating: 4.6, reviews: 78 },
];

const CarRental = () => {
  const [carType, setCarType] = useState("all");
  const [sortBy, setSortBy] = useState("price");

  const filtered = mockCars
    .filter(c => carType === "all" || c.type.toLowerCase() === carType.toLowerCase())
    .sort((a, b) => sortBy === "price" ? a.price - b.price : b.rating - a.rating);

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="bg-card border-b border-border pt-20 lg:pt-28 pb-4">
        <div className="container mx-auto px-4">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Car className="w-6 h-6 text-primary" /> Car Rental
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Dhaka → Cox's Bazar • {filtered.length} vehicles available</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex flex-wrap gap-3 mb-6">
          <Select value={carType} onValueChange={setCarType}>
            <SelectTrigger className="w-36"><SelectValue placeholder="Car Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {CAR_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="price">Lowest Price</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(car => (
            <Card key={car.id} className="overflow-hidden hover:shadow-lg transition-all">
              <div className="h-48 overflow-hidden">
                <img src={car.image} alt={car.name} className="w-full h-full object-cover" />
              </div>
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-bold text-lg">{car.name}</h3>
                    <Badge variant="secondary" className="text-[10px] mt-1">{car.type}</Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-bold">{car.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-muted-foreground mt-3">
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" /> {car.seats} seats</span>
                  <span className="flex items-center gap-1"><Fuel className="w-3.5 h-3.5" /> {car.fuel}</span>
                  <span className="flex items-center gap-1"><Settings2 className="w-3.5 h-3.5" /> {car.transmission}</span>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Per day</p>
                    <p className="text-xl font-black text-primary">৳{car.price.toLocaleString()}</p>
                  </div>
                  <Button size="sm" className="font-bold" asChild>
                    <Link to={`/cars/book?id=${car.id}`}>Book <ArrowRight className="w-4 h-4 ml-1" /></Link>
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

export default CarRental;
