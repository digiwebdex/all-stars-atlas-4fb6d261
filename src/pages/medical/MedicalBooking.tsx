import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Stethoscope, ArrowRight, User, Shield } from "lucide-react";
import { Link } from "react-router-dom";
import { TREATMENT_TYPES } from "@/lib/constants";

const MedicalBooking = () => {
  const [step, setStep] = useState(1);

  return (
    <div className="min-h-screen bg-muted/30 pt-20 lg:pt-28 pb-10">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-center gap-2 mb-8">
          {["Treatment Details", "Patient Info", "Review & Submit"].map((s, i) => (
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
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-primary" /> Treatment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Treatment Type</Label>
                    <Select>
                      <SelectTrigger className="h-11"><SelectValue placeholder="Select treatment" /></SelectTrigger>
                      <SelectContent>
                        {TREATMENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Preferred Hospital</Label>
                    <Input placeholder="e.g. Apollo Hospitals" className="h-11" />
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>Preferred Travel Date</Label>
                    <Input type="date" className="h-11" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Destination Country</Label>
                    <Select defaultValue="india">
                      <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="india">India</SelectItem>
                        <SelectItem value="thailand">Thailand</SelectItem>
                        <SelectItem value="singapore">Singapore</SelectItem>
                        <SelectItem value="malaysia">Malaysia</SelectItem>
                        <SelectItem value="turkey">Turkey</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>Medical History / Notes</Label>
                  <textarea className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="Describe your condition or medical history..." />
                </div>
              </CardContent>
            </Card>

            {step >= 2 && (
              <Card>
                <CardHeader><CardTitle className="text-lg flex items-center gap-2"><User className="w-5 h-5 text-primary" /> Patient Details</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5"><Label>First Name</Label><Input placeholder="First name" className="h-11" /></div>
                    <div className="space-y-1.5"><Label>Last Name</Label><Input placeholder="Last name" className="h-11" /></div>
                    <div className="space-y-1.5"><Label>Date of Birth</Label><Input type="date" className="h-11" /></div>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Email</Label><Input type="email" placeholder="you@example.com" className="h-11" /></div>
                    <div className="space-y-1.5"><Label>Phone</Label><Input type="tel" placeholder="+880 1XXX-XXXXXX" className="h-11" /></div>
                  </div>
                  <Separator />
                  <p className="text-xs text-muted-foreground font-semibold">Passport Information</p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Passport Number</Label><Input placeholder="A12345678" className="h-11" /></div>
                    <div className="space-y-1.5"><Label>Passport Expiry</Label><Input type="date" className="h-11" /></div>
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
                  <Link to="/booking/confirmation"><Shield className="w-4 h-4 mr-1" /> Submit Enquiry</Link>
                </Button>
              )}
            </div>
          </div>

          <div>
            <Card className="sticky top-28">
              <CardHeader><CardTitle className="text-base">Enquiry Summary</CardTitle></CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Treatment</span><span className="font-semibold">Cardiac Surgery</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Hospital</span><span className="font-semibold">Apollo Hospitals</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Destination</span><span className="font-semibold">India</span></div>
                <Separator />
                <p className="text-xs text-muted-foreground">Our medical tourism team will contact you within 24 hours with a detailed treatment plan and cost estimate.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MedicalBooking;
