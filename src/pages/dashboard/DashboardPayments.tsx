import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Upload, Smartphone, Building2, CheckCircle2, Clock, Copy, ArrowRight, Banknote, QrCode } from "lucide-react";
import { useState } from "react";
import { useDashboardPayments, useSubmitPayment } from "@/hooks/useApiData";
import DataLoader from "@/components/DataLoader";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  Approved: "bg-success/10 text-success",
  Pending: "bg-warning/10 text-warning",
  Rejected: "bg-destructive/10 text-destructive",
};

const DashboardPayments = () => {
  const [showMakePayment, setShowMakePayment] = useState(false);
  const { data, isLoading, error, refetch } = useDashboardPayments();
  const submitPayment = useSubmitPayment();
  const { toast } = useToast();

  const paymentMethods = (data as any)?.paymentMethods || [];
  const pendingPayments = (data as any)?.pendingPayments || [];
  const paymentHistory = (data as any)?.paymentHistory || [];
  const bankAccounts = (data as any)?.bankAccounts || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Payments</h1>
        <Button onClick={() => setShowMakePayment(!showMakePayment)}><Banknote className="w-4 h-4 mr-1.5" /> Make Payment</Button>
      </div>

      <DataLoader isLoading={isLoading} error={error} skeleton="dashboard" retry={refetch}>
        {/* Saved Payment Methods */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div><CardTitle className="text-lg">Payment Methods</CardTitle><CardDescription>Your saved payment methods</CardDescription></div>
              <Button size="sm" variant="outline">Add New</Button>
            </div>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <p className="text-sm text-muted-foreground">No saved payment methods</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {paymentMethods.map((method: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                      {method.type === "mobile" ? <Smartphone className="w-5 h-5" /> : <CreditCard className="w-5 h-5" />}
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{method.name}</p><p className="text-xs text-muted-foreground">•••• {method.last4}</p></div>
                    <Badge variant="outline" className="bg-success/10 text-success text-[10px]">Active</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Payments */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Pending Payments</CardTitle></CardHeader>
          <CardContent>
            {pendingPayments.length === 0 ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4"><CheckCircle2 className="w-4 h-4 text-success" /> No pending payments</div>
            ) : (
              <div className="space-y-4">
                {pendingPayments.map((p: any) => (
                  <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border border-warning/30 bg-warning/5">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-lg bg-warning/10 flex items-center justify-center"><Clock className="w-5 h-5 text-warning" /></div>
                      <div><p className="text-sm font-semibold">{p.title}</p><p className="text-xs text-muted-foreground">{p.booking} • Due: {p.due}</p></div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold">{p.amount}</span>
                      <Button size="sm" onClick={() => setShowMakePayment(true)}>Pay Now <ArrowRight className="w-3.5 h-3.5 ml-1" /></Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Make Payment Section */}
        {showMakePayment && (
          <Card className="border-primary/30">
            <CardHeader><CardTitle className="text-lg">Make Payment</CardTitle><CardDescription>Select a payment method and submit your payment</CardDescription></CardHeader>
            <CardContent>
              <Tabs defaultValue="bank" className="w-full">
                <TabsList className="w-full grid grid-cols-4 mb-4">
                  <TabsTrigger value="bank">Bank Deposit</TabsTrigger>
                  <TabsTrigger value="transfer">Bank Transfer</TabsTrigger>
                  <TabsTrigger value="mobile">Mobile Banking</TabsTrigger>
                  <TabsTrigger value="card">Card</TabsTrigger>
                </TabsList>
                <TabsContent value="bank" className="space-y-4">
                  {bankAccounts.length > 0 && (
                    <div className="bg-muted/50 rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">Deposit to one of these accounts</p>
                      {bankAccounts.map((acc: any, i: number) => (
                        <div key={i} className="flex items-start gap-3 p-3 bg-card rounded-lg border border-border mb-2 last:mb-0">
                          <Building2 className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                          <div className="flex-1 text-sm space-y-0.5">
                            <p className="font-bold">{acc.bank}</p><p className="text-muted-foreground">{acc.accName}</p>
                            <p className="font-mono font-semibold">{acc.accNo}</p>
                            <p className="text-xs text-muted-foreground">Branch: {acc.branch} • Routing: {acc.routing}</p>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0"><Copy className="w-3.5 h-3.5" /></Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-3">
                    <Button className="font-bold shadow-lg shadow-primary/20">Submit Payment</Button>
                    <Button variant="outline" onClick={() => setShowMakePayment(false)}>Cancel</Button>
                  </div>
                </TabsContent>
                <TabsContent value="transfer" className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Transaction Reference</Label><Input className="h-11" placeholder="Your bank ref number" /></div>
                    <div className="space-y-1.5"><Label>Amount (৳)</Label><Input type="number" className="h-11" /></div>
                  </div>
                  <div className="flex gap-3"><Button className="font-bold">Submit</Button><Button variant="outline" onClick={() => setShowMakePayment(false)}>Cancel</Button></div>
                </TabsContent>
                <TabsContent value="mobile" className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Payment Method</Label>
                      <Select><SelectTrigger className="h-11"><SelectValue placeholder="Select" /></SelectTrigger><SelectContent><SelectItem value="bkash">bKash</SelectItem><SelectItem value="nagad">Nagad</SelectItem><SelectItem value="rocket">Rocket</SelectItem></SelectContent></Select>
                    </div>
                    <div className="space-y-1.5"><Label>Transaction ID</Label><Input className="h-11" placeholder="e.g. 8G7K4L2M9N" /></div>
                  </div>
                  <div className="flex gap-3"><Button className="font-bold">Verify & Submit</Button><Button variant="outline" onClick={() => setShowMakePayment(false)}>Cancel</Button></div>
                </TabsContent>
                <TabsContent value="card" className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label>Card Number</Label><Input className="h-11" placeholder="4242 4242 4242 4242" /></div>
                    <div className="space-y-1.5"><Label>Cardholder Name</Label><Input className="h-11" placeholder="JOHN DOE" /></div>
                  </div>
                  <div className="flex gap-3"><Button className="font-bold shadow-lg shadow-primary/20">Pay Securely</Button><Button variant="outline" onClick={() => setShowMakePayment(false)}>Cancel</Button></div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Payment History */}
        <Card>
          <CardHeader><CardTitle className="text-lg">Payment History</CardTitle></CardHeader>
          <CardContent className="p-0">
            {paymentHistory.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">No payment history</div>
            ) : (
              <div className="divide-y divide-border">
                {paymentHistory.map((txn: any) => (
                  <div key={txn.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {txn.method?.includes("bKash") || txn.method?.includes("Nagad") ? <Smartphone className="w-5 h-5 text-primary" /> :
                       txn.method?.includes("Card") ? <CreditCard className="w-5 h-5 text-primary" /> : <Building2 className="w-5 h-5 text-primary" />}
                    </div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-semibold">{txn.method}</p><p className="text-xs text-muted-foreground">{txn.id} • {txn.booking} • {txn.date}</p></div>
                    <Badge className={`text-[10px] font-semibold ${statusColors[txn.status] || ''}`}>{txn.status}</Badge>
                    <span className="text-sm font-bold">{txn.amount}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </DataLoader>
    </div>
  );
};

export default DashboardPayments;
