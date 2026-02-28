import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Car, ArrowRight, User, Shield } from "lucide-react";
import { Link } from "react-router-dom";

const CarBooking = () => {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-muted/30 pt-20 lg:pt-28 pb-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-8">
          {["Vehicle Details", "Driver Info", "Review & Pay"].map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step > i + 1 ? "bg-success text-success-foreground" : step === i + 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>{i + 1}</div>
              <span className={`text-sm font-medium hidden sm:block ${step === i + 1 ? "text-foreground" : "text-muted-foreground"}`}>{s}</span>
              {i < 2 && <div className="w-8 sm:w-16 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-lg flex items-center gap-2"><Car className="w-5 h-5 text-primary" /> Vehicle Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-muted/50 rounded-xl">
                  <h3 className="font-bold text-lg">Toyota Corolla — Sedan</h3>
                  <p className="text-sm text-muted-foreground">4 seats • Petrol • Automatic</p>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Pickup Location</Label><Input placeholder="Dhaka Airport" className="h-11" /></div>
                  <div className="space-y-1.5"><Label>Drop-off Location</Label><Input placeholder="Cox's Bazar" className="h-11" /></div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Pickup Date & Time</Label><Input type="datetime-local" className="h-11" /></div>
                  <div className="space-y-1.5"><Label>Drop-off Date & Time</Label><Input type="datetime-local" className="h-11" /></div>
                </div>
              </CardContent>
            </Card>

            {step >= 2 && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Renter Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Full Name</Label><Input placeholder="As per driving license" className="h-11" /></div>
                    <div className="space-y-1.5"><Label>Driving License No.</Label><Input placeholder="License number" className="h-11" /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="you@example.com" className="h-11" /></div>
                    <div className="space-y-1.5"><Label>Phone</Label><Input type="tel" placeholder="+880 1XXX-XXXXXX" className="h-11" /></div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-3">
              {step > 1 && <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>}
              {step < 3 ? (
                <Button onClick={() => setStep(step + 1)} className="font-bold">Continue <ArrowRight className="w-4 h-4 ml-1" /></Button>
              ) : (
                <Button asChild className="font-bold shadow-lg shadow-primary/20">
                  <Link to="/booking/confirmation"><Shield className="w-4 h-4 mr-1" /> Confirm & Pay ৳3,500</Link>
                </Button>
              )}
            </div>
          </div>

          <div>
            <Card className="sticky top-28">
              <CardHeader><CardTitle className="text-base">Booking Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Vehicle</span><span className="font-semibold">Toyota Corolla</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Duration</span><span className="font-semibold">1 Day</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span className="font-semibold">৳3,500/day</span></div>
                <Separator />
                <div className="flex justify-between text-base"><span className="font-bold">Total</span><span className="font-black text-primary">৳3,500</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CarBooking;
