import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Check, Shield, ArrowRight } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";

const ESIMPurchase = () => {
  const [searchParams] = useSearchParams();
  const country = searchParams.get("country") || "Thailand";
  const plan = searchParams.get("plan") || "3 GB";

  return (
    <div className="min-h-screen bg-muted/30 pt-20 lg:pt-28 pb-10">
      <div className="container mx-auto px-4 max-w-3xl">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2"><Smartphone className="w-6 h-6 text-primary" /> Purchase eSIM</h1>

        <div className="grid md:grid-cols-5 gap-6">
          <div className="md:col-span-3 space-y-5">
            <Card>
              <CardHeader><CardTitle className="text-lg">Your Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5"><Label>Full Name</Label><Input placeholder="Full name" className="h-11" /></div>
                  <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="you@example.com" className="h-11" /></div>
                </div>
                <div className="space-y-1.5"><Label>Phone Number</Label><Input type="tel" placeholder="+880 1XXX-XXXXXX" className="h-11" /></div>
                <div className="space-y-1.5"><Label>Activation Date</Label><Input type="date" className="h-11" /></div>
              </CardContent>
            </Card>

            <Button asChild className="w-full h-12 font-bold shadow-lg shadow-primary/20">
              <Link to="/booking/confirmation"><Shield className="w-4 h-4 mr-1" /> Complete Purchase</Link>
            </Button>
          </div>

          <div className="md:col-span-2">
            <Card className="sticky top-28">
              <CardHeader><CardTitle className="text-base">Order Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="text-center p-4 bg-primary/5 rounded-xl">
                  <Badge className="mb-2">{country.charAt(0).toUpperCase() + country.slice(1)}</Badge>
                  <h3 className="text-2xl font-black">{plan}</h3>
                  <p className="text-muted-foreground">15 Days</p>
                </div>
                <div className="space-y-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><Check className="w-3 h-3 text-success" /> 4G/5G Speed</div>
                  <div className="flex items-center gap-1"><Check className="w-3 h-3 text-success" /> Instant QR Delivery</div>
                  <div className="flex items-center gap-1"><Check className="w-3 h-3 text-success" /> No Physical SIM</div>
                </div>
                <Separator />
                <div className="flex justify-between text-base"><span className="font-bold">Total</span><span className="font-black text-primary">৳1,200</span></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ESIMPurchase;
