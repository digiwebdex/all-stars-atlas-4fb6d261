import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Plus, MoreHorizontal, Edit2, Trash2, Copy, Eye } from "lucide-react";
import { PROMOTIONS } from "@/lib/content-data";
import { toast } from "sonner";

const CMSPromotions = () => {
  const [search, setSearch] = useState("");
  const [promotions, setPromotions] = useState(PROMOTIONS);
  const filtered = promotions.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.code.toLowerCase().includes(search.toLowerCase()));

  const activeCount = promotions.filter(p => p.status === "active").length;
  const totalUsed = promotions.reduce((sum, p) => sum + p.used, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Promotions</h1>
        <Button><Plus className="w-4 h-4 mr-1.5" /> Create Promotion</Button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: "Active Promotions", value: activeCount }, { label: "Total Redemptions", value: totalUsed.toLocaleString() }, { label: "Promo Codes", value: promotions.length }, { label: "Avg. Usage", value: `${Math.round(totalUsed / promotions.length)}` }].map((s, i) => (
          <Card key={i}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold mt-1">{s.value}</p></CardContent></Card>
        ))}
      </div>
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search promotions..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <Card><CardContent className="p-0">
        <Table>
          <TableHeader><TableRow><TableHead>Promotion</TableHead><TableHead>Code</TableHead><TableHead className="hidden md:table-cell">Discount</TableHead><TableHead className="hidden lg:table-cell">Usage</TableHead><TableHead>Status</TableHead><TableHead className="hidden md:table-cell">Expires</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-12">No promotions found</TableCell></TableRow>
            ) : filtered.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-sm">{p.title}</TableCell>
                <TableCell><div className="flex items-center gap-1"><code className="text-xs bg-muted px-1.5 py-0.5 rounded font-bold">{p.code}</code><button className="text-muted-foreground hover:text-foreground" onClick={() => { navigator.clipboard.writeText(p.code); toast.success("Code copied!"); }}><Copy className="w-3 h-3" /></button></div></TableCell>
                <TableCell className="hidden md:table-cell text-sm">{p.discount} ({p.type})</TableCell>
                <TableCell className="hidden lg:table-cell text-sm">{p.used}/{p.usageLimit}</TableCell>
                <TableCell><Badge variant="outline" className={`text-[10px] capitalize ${p.status === "active" ? "bg-success/10 text-success" : p.status === "scheduled" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>{p.status}</Badge></TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{p.expires}</TableCell>
                <TableCell>
                  <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="end"><DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem><DropdownMenuItem><Edit2 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent></Card>
    </div>
  );
};

export default CMSPromotions;
