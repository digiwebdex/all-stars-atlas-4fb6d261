import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Mail, Plus, Eye, PenLine, MoreHorizontal, Trash2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { EMAIL_TEMPLATES } from "@/lib/content-data";

const CMSEmailTemplates = () => {
  const [templates, setTemplates] = useState(EMAIL_TEMPLATES);
  const [search, setSearch] = useState("");
  const filtered = templates.filter(t => t.name.toLowerCase().includes(search.toLowerCase()) || t.trigger.toLowerCase().includes(search.toLowerCase()));

  const toggleActive = (id: number) => {
    setTemplates(templates.map(t => t.id === id ? { ...t, active: !t.active } : t));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Email Templates</h1><p className="text-sm text-muted-foreground mt-1">{templates.length} templates • {templates.filter(t => t.active).length} active</p></div>
        <Button className="font-bold"><Plus className="w-4 h-4 mr-1" /> New Template</Button>
      </div>
      <div className="relative max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search templates..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <div className="space-y-3">
        {filtered.map((t) => (
          <Card key={t.id} className="hover:shadow-md transition-shadow">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Mail className="w-5 h-5" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm">{t.name}</h3>
                <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[9px]">{t.trigger}</Badge>
                  <span className="text-[10px] text-muted-foreground">Edited {t.lastEdited}</span>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Switch checked={t.active} onCheckedChange={() => toggleActive(t.id)} />
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end"><DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> Preview</DropdownMenuItem><DropdownMenuItem><PenLine className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CMSEmailTemplates;
