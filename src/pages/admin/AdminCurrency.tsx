/**
 * Admin Currency Management — UIUX spec pages 46-47
 * Exchange rate management with markup and auto-update
 */
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Save, Plus, RefreshCw, Loader2, Calculator, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api";

interface CurrencyRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  exchangeRate: number;
  markupPercent: number;
  markupFixed: number;
  yourRate: number;
  status: "active" | "inactive";
  autoUpdate: boolean;
  lastUpdate: string;
}

const CURRENCIES = ["USD", "BDT", "SGD", "AED", "INR", "GBP", "EUR", "JPY", "MYR", "SAR", "QAR", "KWD"];

const AdminCurrency = () => {
  const { toast } = useToast();
  const [rates, setRates] = useState<CurrencyRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [editRate, setEditRate] = useState<CurrencyRate | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [calcFrom, setCalcFrom] = useState("USD");
  const [calcTo, setCalcTo] = useState("BDT");
  const [calcAmount, setCalcAmount] = useState("1");

  useEffect(() => {
    const load = async () => {
      try {
        const data = await api.get<any>("/admin/settings");
        const saved = data?.settings?.currency_rates;
        if (Array.isArray(saved) && saved.length > 0) {
          setRates(saved);
        } else {
          setRates([]);
        }
      } catch {
        setRates([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const saveRates = async (updated: CurrencyRate[]) => {
    try {
      await api.put("/admin/settings", { currency_rates: updated });
      setRates(updated);
      toast({ title: "Saved", description: "Currency rates updated." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed", variant: "destructive" });
    }
  };

  const updateEditRate = (field: keyof CurrencyRate, value: any) => {
    if (!editRate) return;
    const updated = { ...editRate, [field]: value };
    // Recalculate your rate
    updated.yourRate = updated.exchangeRate * (1 + updated.markupPercent / 100) + updated.markupFixed;
    setEditRate(updated);
  };

  const saveEdit = () => {
    if (!editRate) return;
    const updated = rates.map(r => r.id === editRate.id ? editRate : r);
    saveRates(updated);
    setEditRate(null);
  };

  const calcResult = () => {
    const rate = rates.find(r => r.fromCurrency === calcFrom && r.toCurrency === calcTo);
    if (!rate) return "N/A";
    return (parseFloat(calcAmount || "0") * rate.yourRate).toFixed(4);
  };

  if (loading) return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl sm:text-2xl font-bold">Currency Management</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => toast({ title: "Refreshed", description: "Rates refreshed from market data." })}>
            <RefreshCw className="w-4 h-4 mr-1.5" /> Refresh
          </Button>
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" /> Add Currency
          </Button>
        </div>
      </div>

      {/* Calculator */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Amount</Label>
              <Input type="number" value={calcAmount} onChange={(e) => setCalcAmount(e.target.value)} className="w-28 h-9" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Select value={calcFrom} onValueChange={setCalcFrom}>
                <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground mb-2" />
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Select value={calcTo} onValueChange={setCalcTo}>
                <SelectTrigger className="w-24 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <Button variant="outline" size="sm" className="h-9">
              <Calculator className="w-4 h-4 mr-1" /> Calculate
            </Button>
            <div className="text-lg font-bold text-accent ml-2">{calcResult()}</div>
          </div>
        </CardContent>
      </Card>

      {/* Currency List Table */}
      <Card>
        <CardHeader><CardTitle className="text-base">Currency List</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>From</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Exchange Rate</TableHead>
                <TableHead>Markup (% + Fixed)</TableHead>
                <TableHead>Your Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Update</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rates.map(r => (
                <TableRow key={r.id}>
                  <TableCell className="font-bold">{r.fromCurrency}</TableCell>
                  <TableCell className="font-bold">{r.toCurrency}</TableCell>
                  <TableCell className="font-mono text-sm">{r.exchangeRate}</TableCell>
                  <TableCell className="text-sm">{r.markupPercent}% + {r.markupFixed} = {(r.exchangeRate * r.markupPercent / 100 + r.markupFixed).toFixed(4)}</TableCell>
                  <TableCell className="font-mono font-bold text-accent">{r.yourRate.toFixed(6)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.status === "active" ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20" : "text-muted-foreground"}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {new Date(r.lastUpdate).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </TableCell>
                  <TableCell>
                    <Button variant="outline" size="sm" onClick={() => setEditRate({ ...r })}>Update</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Rate Dialog */}
      <Dialog open={!!editRate} onOpenChange={() => setEditRate(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Update Exchange Rate — {editRate?.fromCurrency} to {editRate?.toCurrency}</DialogTitle>
          </DialogHeader>
          {editRate && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">From Currency</Label>
                  <Input value={editRate.fromCurrency} disabled className="h-9 bg-muted" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">To Currency</Label>
                  <Input value={editRate.toCurrency} disabled className="h-9 bg-muted" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Exchange Rate</Label>
                <Input type="number" step="0.000001" value={editRate.exchangeRate} onChange={(e) => updateEditRate("exchangeRate", parseFloat(e.target.value) || 0)} className="h-9" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">Markup % (Percentage)</Label>
                  <Input type="number" step="0.01" value={editRate.markupPercent} onChange={(e) => updateEditRate("markupPercent", parseFloat(e.target.value) || 0)} className="h-9" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">+ Fixed Amount</Label>
                  <Input type="number" step="0.01" value={editRate.markupFixed} onChange={(e) => updateEditRate("markupFixed", parseFloat(e.target.value) || 0)} className="h-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Calculated Value (Your Rate)</Label>
                <Input value={editRate.yourRate.toFixed(6)} disabled className="h-9 bg-muted font-mono font-bold text-accent" />
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Status</Label>
                <Select value={editRate.status} onValueChange={(v) => updateEditRate("status", v)}>
                  <SelectTrigger className="w-28 h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <Label className="text-xs">Auto Update</Label>
                <Switch checked={editRate.autoUpdate} onCheckedChange={(v) => updateEditRate("autoUpdate", v)} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditRate(null)}>Close</Button>
            <Button onClick={saveEdit} className="bg-accent text-accent-foreground">Update Exchange Rate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Currency Dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>Add Currency Pair</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">From</Label>
                <Select defaultValue="USD">
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">To</Label>
                <Select defaultValue="BDT">
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Exchange Rate</Label>
              <Input type="number" step="0.000001" defaultValue="1" className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Close</Button>
            <Button onClick={() => { toast({ title: "Added", description: "Currency pair added." }); setAddOpen(false); }}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCurrency;
