import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Search, MoreHorizontal, Eye, Edit2, Trash2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminBookings } from "@/hooks/useApiData";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import DataLoader from "@/components/DataLoader";
import { mockAdminBookings } from "@/lib/mock-data";

const statusColors: Record<string, string> = {
  confirmed: "bg-success/10 text-success", pending: "bg-warning/10 text-warning",
  cancelled: "bg-destructive/10 text-destructive", completed: "bg-primary/10 text-primary",
};

const AdminBookings = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [viewBooking, setViewBooking] = useState<any>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useAdminBookings({
    ...(search ? { search } : {}),
    ...(statusFilter !== "all" ? { status: statusFilter } : {}),
  });

  const apiBookings = (data as any)?.data?.map((b: any) => ({
    id: b.bookingRef || b.id,
    rawId: b.id,
    customer: b.user?.name || "Unknown",
    email: b.user?.email || "",
    type: b.bookingType || "flight",
    route: b.details?.route || b.details?.destination || "—",
    date: b.bookedAt ? new Date(b.bookedAt).toLocaleDateString('en-GB') : "—",
    status: b.status,
    amount: `৳${(b.totalAmount || 0).toLocaleString()}`,
    rawAmount: b.totalAmount || 0,
    paymentMethod: b.paymentMethod || "—",
    paymentStatus: b.paymentStatus || "—",
    details: b.details || {},
  })) || [];

  const bookings = apiBookings.length > 0 ? apiBookings : mockAdminBookings.bookings;

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b: any) => b.status === "confirmed").length,
    pending: bookings.filter((b: any) => b.status === "pending").length,
    cancelled: bookings.filter((b: any) => b.status === "cancelled").length,
  };

  const filtered = bookings.filter((b: any) => {
    if (statusFilter !== "all" && b.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return b.id?.toLowerCase().includes(q) || b.customer?.toLowerCase().includes(q) || b.route?.toLowerCase().includes(q);
    }
    return true;
  });

  const handleCancel = async (b: any) => {
    try {
      await api.put(`/admin/bookings/${b.rawId || b.id}`, { status: "cancelled" });
      toast({ title: "Booking Cancelled", description: `Booking ${b.id} has been cancelled` });
      qc.invalidateQueries({ queryKey: ['admin', 'bookings'] });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not cancel booking", variant: "destructive" });
    }
  };

  const handleExport = () => {
    const csv = ["ID,Customer,Type,Route,Date,Status,Amount", ...bookings.map((b: any) => `${b.id},${b.customer},${b.type},${b.route},${b.date},${b.status},${b.amount}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "bookings.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Bookings CSV downloaded" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">All Bookings</h1>
        <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={handleExport}><Download className="w-4 h-4 mr-1.5" /> Export CSV</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Bookings", value: stats.total }, { label: "Confirmed", value: stats.confirmed }, { label: "Pending", value: stats.pending }, { label: "Cancelled", value: stats.cancelled }].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold mt-1">{s.value}</p></CardContent></Card>
        ))}
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search bookings..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[140px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="confirmed">Confirmed</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="cancelled">Cancelled</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
        </Select>
      </div>
      <DataLoader isLoading={isLoading} error={null} skeleton="table" retry={refetch}>
        <Card><CardContent className="p-0 table-responsive">
          <Table>
            <TableHeader><TableRow><TableHead>ID</TableHead><TableHead>Customer</TableHead><TableHead className="hidden md:table-cell">Type</TableHead><TableHead className="hidden lg:table-cell">Route</TableHead><TableHead className="hidden md:table-cell">Date</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Amount</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-12">No bookings found</TableCell></TableRow>
              ) : filtered.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.id}</TableCell>
                  <TableCell><div><p className="text-sm font-medium">{b.customer}</p><p className="text-xs text-muted-foreground">{b.email}</p></div></TableCell>
                  <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px]">{b.type}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-sm">{b.route}</TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{b.date}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[11px] capitalize ${statusColors[b.status] || ''}`}>{b.status}</Badge></TableCell>
                  <TableCell className="text-right font-semibold text-sm">{b.amount}</TableCell>
                  <TableCell>
                    <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setViewBooking(b)}><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem>
                        {b.status !== "cancelled" && <DropdownMenuItem className="text-destructive" onClick={() => handleCancel(b)}><Trash2 className="w-4 h-4 mr-2" /> Cancel</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </DataLoader>

      <Dialog open={!!viewBooking} onOpenChange={() => setViewBooking(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Booking Details</DialogTitle></DialogHeader>
          {viewBooking && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Booking ID</p><p className="font-bold font-mono">{viewBooking.id}</p></div>
                <div><p className="text-xs text-muted-foreground">Customer</p><p className="font-bold">{viewBooking.customer}</p></div>
                <div><p className="text-xs text-muted-foreground">Type</p><Badge variant="outline">{viewBooking.type}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Route</p><p className="font-bold">{viewBooking.route}</p></div>
                <div><p className="text-xs text-muted-foreground">Date</p><p className="font-bold">{viewBooking.date}</p></div>
                <div><p className="text-xs text-muted-foreground">Amount</p><p className="font-bold text-primary">{viewBooking.amount}</p></div>
                <div><p className="text-xs text-muted-foreground">Payment Method</p><p className="font-bold">{viewBooking.paymentMethod}</p></div>
                <div><p className="text-xs text-muted-foreground">Payment Status</p><p className="font-bold capitalize">{viewBooking.paymentStatus}</p></div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={`capitalize ${statusColors[viewBooking.status] || ''}`}>{viewBooking.status}</Badge>
                {viewBooking.status !== "cancelled" && (
                  <Button size="sm" variant="destructive" onClick={() => { handleCancel(viewBooking); setViewBooking(null); }}>
                    <Trash2 className="w-3.5 h-3.5 mr-1" /> Cancel Booking
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminBookings;
