import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, MoreHorizontal, Eye, Ban, CheckCircle2, UserPlus, Download, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAdminUsers } from "@/hooks/useApiData";
import { api } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import DataLoader from "@/components/DataLoader";
import { mockAdminUsers } from "@/lib/mock-data";

const AdminUsers = () => {
  const [search, setSearch] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [showViewUser, setShowViewUser] = useState<any>(null);
  const [newUser, setNewUser] = useState({ name: "", email: "", phone: "", role: "customer" });
  const [actionLoading, setActionLoading] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data, isLoading, error, refetch } = useAdminUsers(search ? { search } : undefined);

  const apiUsers = (data as any)?.users?.map((u: any) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone || "—",
    role: u.role || "customer",
    status: u.status || "active",
    bookings: u.bookings || 0,
    joined: u.joined || "—",
  })) || [];

  const apiStats = (data as any)?.stats;
  const users = apiUsers.length > 0 ? apiUsers : mockAdminUsers.users;

  const stats = apiStats || {
    total: users.length,
    active: users.filter((u: any) => u.status === "active").length,
    suspended: users.filter((u: any) => u.status === "suspended" || u.status === "inactive").length,
    newThisMonth: 0,
  };

  const filtered = search && apiUsers.length === 0
    ? users.filter((u: any) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()))
    : users;

  const handleSuspend = async (user: any) => {
    setActionLoading(true);
    try {
      const newVerified = user.status === "active" ? false : true;
      await api.put(`/admin/users/${user.id}`, { emailVerified: newVerified });
      toast({ title: user.status === "active" ? "User Suspended" : "User Activated", description: `${user.name} has been updated` });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not update user", variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    try {
      await api.delete(`/admin/users/${user.id}`);
      toast({ title: "User Deleted", description: `${user.name} has been removed` });
      qc.invalidateQueries({ queryKey: ['admin', 'users'] });
      refetch();
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Could not delete user", variant: "destructive" });
    }
  };

  const handleExport = () => {
    const csv = ["Name,Email,Phone,Status,Bookings,Joined", ...users.map((u: any) => `${u.name},${u.email},${u.phone},${u.status},${u.bookings},${u.joined}`)].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported", description: "Users CSV downloaded" });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold">Users</h1>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="flex-1 sm:flex-initial" onClick={handleExport}><Download className="w-4 h-4 mr-1.5" /> Export</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Total Users", value: stats.total }, { label: "Active", value: stats.active }, { label: "Suspended", value: stats.suspended }, { label: "New (30d)", value: stats.newThisMonth }].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold mt-1">{s.value}</p></CardContent></Card>
        ))}
      </div>

      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search users..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>

      <DataLoader isLoading={isLoading} error={null} skeleton="table" retry={refetch}>
        <Card><CardContent className="p-0 table-responsive">
          <Table>
            <TableHeader><TableRow><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Phone</TableHead><TableHead className="hidden lg:table-cell">Joined</TableHead><TableHead className="hidden sm:table-cell">Bookings</TableHead><TableHead>Status</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No users found</TableCell></TableRow>
              ) : filtered.map((u: any) => (
                <TableRow key={u.id}>
                  <TableCell><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-muted-foreground">{u.email}</p></TableCell>
                  <TableCell className="hidden md:table-cell text-sm">{u.phone}</TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{u.joined}</TableCell>
                  <TableCell className="hidden sm:table-cell text-sm">{u.bookings}</TableCell>
                  <TableCell><Badge variant="outline" className={`text-[11px] capitalize ${u.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{u.status}</Badge></TableCell>
                  <TableCell>
                    <DropdownMenu modal={false}><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setShowViewUser(u)}><Eye className="w-4 h-4 mr-2" /> View Profile</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleSuspend(u)} disabled={actionLoading}>
                          {u.status === "active" ? <><Ban className="w-4 h-4 mr-2" /> Suspend</> : <><CheckCircle2 className="w-4 h-4 mr-2" /> Activate</>}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteUser(u)}>Delete User</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent></Card>
      </DataLoader>

      <Dialog open={!!showViewUser} onOpenChange={() => setShowViewUser(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>User Profile</DialogTitle></DialogHeader>
          {showViewUser && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><p className="text-xs text-muted-foreground">Name</p><p className="font-semibold">{showViewUser.name}</p></div>
                <div><p className="text-xs text-muted-foreground">Email</p><p className="font-semibold">{showViewUser.email}</p></div>
                <div><p className="text-xs text-muted-foreground">Phone</p><p className="font-semibold">{showViewUser.phone}</p></div>
                <div><p className="text-xs text-muted-foreground">Role</p><Badge variant="outline" className="capitalize">{showViewUser.role}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Status</p><Badge variant="outline" className={`text-[11px] capitalize ${showViewUser.status === "active" ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>{showViewUser.status}</Badge></div>
                <div><p className="text-xs text-muted-foreground">Bookings</p><p className="font-semibold">{showViewUser.bookings}</p></div>
                <div><p className="text-xs text-muted-foreground">Joined</p><p className="font-semibold">{showViewUser.joined}</p></div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminUsers;
