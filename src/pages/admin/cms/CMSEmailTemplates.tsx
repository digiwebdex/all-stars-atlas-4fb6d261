import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Mail, Plus, Eye, PenLine, MoreHorizontal, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useCMSEmailTemplates } from "@/hooks/useApiData";
import DataLoader from "@/components/DataLoader";

const CMSEmailTemplates = () => {
  const { data, isLoading, error, refetch } = useCMSEmailTemplates();
  const templates = (data as any)?.templates || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Email Templates</h1><p className="text-sm text-muted-foreground mt-1">Manage transactional and notification email templates</p></div>
        <Button className="font-bold"><Plus className="w-4 h-4 mr-1" /> New Template</Button>
      </div>
      <DataLoader isLoading={isLoading} error={error} skeleton="table" retry={refetch}>
        {templates.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground"><p className="font-semibold">No email templates</p></CardContent></Card>
        ) : (
          <div className="space-y-3">
            {templates.map((t: any) => (
              <Card key={t.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><Mail className="w-5 h-5" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm">{t.name}</h3>
                    <p className="text-xs text-muted-foreground truncate">{t.subject}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Trigger: {t.trigger} · Edited {t.lastEdited}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch checked={t.active} />
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end"><DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> Preview</DropdownMenuItem><DropdownMenuItem><PenLine className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DataLoader>
    </div>
  );
};

export default CMSEmailTemplates;
