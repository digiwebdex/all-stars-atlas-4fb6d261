import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Receipt, CreditCard, CheckCircle2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { BILL_CATEGORIES } from "@/lib/constants";

const PayBillPage = () => {
  const [searchParams] = useSearchParams();
  const [category, setCategory] = useState(searchParams.get("category") || "");
  const [biller, setBiller] = useState(searchParams.get("biller") || "");
  const [account, setAccount] = useState(searchParams.get("account") || "");
  const [amount, setAmount] = useState(searchParams.get("amount") || "");
  const [submitted, setSubmitted] = useState(false);
  const { toast } = useToast();

  const handleSubmit = () => {
    if (!category || !biller || !account || !amount) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Success", description: "Bill payment submitted!" });
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-8 pb-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-success" />
            </div>
            <h2 className="text-xl font-bold">Payment Successful!</h2>
            <p className="text-sm text-muted-foreground">৳{Number(amount).toLocaleString()} paid to {biller}</p>
            <p className="text-xs text-muted-foreground">Account: {account}</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => setSubmitted(false)}>Pay Another Bill</Button>
              <Button asChild><Link to="/">Go Home</Link></Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 pt-20 lg:pt-28 pb-10">
      <div className="container mx-auto px-4 max-w-lg">
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-primary" /> Pay Bill
        </h1>

        <Card>
          <CardContent className="p-6 space-y-5">
            <div className="space-y-1.5">
              <Label>Bill Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {BILL_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat.toLowerCase().replace(/ /g, '-')}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Biller Name</Label>
              <Input value={biller} onChange={e => setBiller(e.target.value)} placeholder="e.g. DPDC, Titas Gas" className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label>Account / Subscriber Number</Label>
              <Input value={account} onChange={e => setAccount(e.target.value)} placeholder="Enter account number" className="h-11" />
            </div>

            <div className="space-y-1.5">
              <Label>Amount (৳)</Label>
              <Input value={amount} onChange={e => setAmount(e.target.value)} placeholder="Enter amount" type="number" className="h-11" />
            </div>

            <Separator />

            {amount && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Bill Amount</span><span className="font-semibold">৳{Number(amount).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-muted-foreground">Service Charge</span><span className="font-semibold">৳10</span></div>
                <Separator />
                <div className="flex justify-between text-base"><span className="font-bold">Total</span><span className="font-black text-primary">৳{(Number(amount) + 10).toLocaleString()}</span></div>
              </div>
            )}

            <Button onClick={handleSubmit} className="w-full h-12 font-bold">
              <CreditCard className="w-5 h-5 mr-2" /> Pay Bill
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PayBillPage;
