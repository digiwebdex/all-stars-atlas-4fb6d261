import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Upload, Grid3X3, List, MoreHorizontal, Trash2, Download, Copy, Eye, Image, FileText, Film } from "lucide-react";
import { MEDIA_FILES } from "@/lib/content-data";
import { toast } from "sonner";

const typeIcons: Record<string, typeof Image> = { image: Image, document: FileText, video: Film };

const CMSMedia = () => {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [media] = useState(MEDIA_FILES);
  const filtered = media.filter(m => m.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div><h1 className="text-2xl font-bold">Media Library</h1><p className="text-sm text-muted-foreground mt-1">{media.length} files • {media.filter(m => m.type === "image").length} images, {media.filter(m => m.type === "video").length} videos</p></div>
        <Button><Upload className="w-4 h-4 mr-1.5" /> Upload Files</Button>
      </div>
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-md w-full"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search media..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
        <div className="flex gap-1 border border-border rounded-lg p-0.5">
          <button onClick={() => setView("grid")} className={`p-2 rounded-md transition-colors ${view === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><Grid3X3 className="w-4 h-4" /></button>
          <button onClick={() => setView("list")} className={`p-2 rounded-md transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}><List className="w-4 h-4" /></button>
        </div>
      </div>
      <div className="border-2 border-dashed border-border rounded-xl p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
        <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" /><p className="text-sm font-medium">Drag & drop files here or click to browse</p><p className="text-xs text-muted-foreground mt-1">Support: JPG, PNG, GIF, PDF, MP4 • Max 25MB</p>
      </div>
      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((m) => { const Icon = typeIcons[m.type] || FileText; return (
            <Card key={m.id} className="group overflow-hidden hover:shadow-lg transition-shadow">
              <div className="aspect-square relative bg-muted">
                {m.type === "image" && m.url ? <img src={m.url} alt={m.name} className="w-full h-full object-cover" loading="lazy" /> : <div className="w-full h-full flex items-center justify-center"><Icon className="w-12 h-12 text-muted-foreground/30" /></div>}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" className="h-8 w-8"><Eye className="w-4 h-4" /></Button>
                  <Button size="icon" variant="secondary" className="h-8 w-8" onClick={() => { navigator.clipboard.writeText(m.url); toast.success("URL copied!"); }}><Copy className="w-4 h-4" /></Button>
                </div>
              </div>
              <CardContent className="p-3"><p className="text-xs font-medium truncate">{m.name}</p><p className="text-[10px] text-muted-foreground">{m.size}</p></CardContent>
            </Card>
          ); })}
        </div>
      ) : (
        <Card><CardContent className="p-0"><div className="divide-y divide-border">
          {filtered.map((m) => { const Icon = typeIcons[m.type] || FileText; return (
            <div key={m.id} className="flex items-center gap-4 p-4 hover:bg-muted/50 transition-colors">
              <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
                {m.type === "image" && m.url ? <img src={m.url} alt={m.name} className="w-full h-full object-cover" /> : <Icon className="w-6 h-6 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0"><p className="text-sm font-medium truncate">{m.name}</p><p className="text-xs text-muted-foreground">{m.size} • {m.uploaded}</p></div>
              <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end"><DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> Preview</DropdownMenuItem><DropdownMenuItem onClick={() => { navigator.clipboard.writeText(m.url); toast.success("URL copied!"); }}><Copy className="w-4 h-4 mr-2" /> Copy URL</DropdownMenuItem><DropdownMenuItem><Download className="w-4 h-4 mr-2" /> Download</DropdownMenuItem><DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent>
              </DropdownMenu>
            </div>
          ); })}
        </div></CardContent></Card>
      )}
    </div>
  );
};

export default CMSMedia;
