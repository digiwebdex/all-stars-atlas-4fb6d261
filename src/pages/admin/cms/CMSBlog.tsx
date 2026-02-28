import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { PenLine, Plus, Search, Eye, Trash2, MoreHorizontal, Calendar, User } from "lucide-react";
import { useCMSBlog } from "@/hooks/useApiData";
import DataLoader from "@/components/DataLoader";

const statusColors: Record<string, string> = { published: "bg-success/10 text-success", draft: "bg-muted text-muted-foreground", scheduled: "bg-warning/10 text-warning" };

const CMSBlog = () => {
  const [search, setSearch] = useState("");
  const { data, isLoading, error, refetch } = useCMSBlog();
  const posts = ((data as any)?.posts || []).filter((p: any) => p.title?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div><h1 className="text-2xl font-bold">Blog & Articles</h1><p className="text-sm text-muted-foreground mt-1">Publish travel content and guides</p></div>
        <Button className="font-bold"><Plus className="w-4 h-4 mr-1" /> New Post</Button>
      </div>
      <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input placeholder="Search posts..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
      <DataLoader isLoading={isLoading} error={error} skeleton="table" retry={refetch}>
        <div className="space-y-3">
          {posts.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground"><p className="font-semibold">No posts found</p></CardContent></Card>
          ) : posts.map((post: any) => (
            <Card key={post.id} className="hover:shadow-md transition-shadow">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0"><PenLine className="w-5 h-5" /></div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm truncate">{post.title}</h3>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {post.author}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                    {post.views > 0 && <span className="flex items-center gap-1"><Eye className="w-3 h-3" /> {post.views?.toLocaleString()}</span>}
                  </div>
                </div>
                {post.category && <Badge variant="outline" className="text-[10px] hidden sm:inline-flex">{post.category}</Badge>}
                <Badge className={`${statusColors[post.status] || ''} text-[10px] font-semibold`}>{post.status}</Badge>
                <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                  <DropdownMenuContent align="end"><DropdownMenuItem><Eye className="w-4 h-4 mr-2" /> View</DropdownMenuItem><DropdownMenuItem><PenLine className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem><DropdownMenuItem className="text-destructive"><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem></DropdownMenuContent>
                </DropdownMenu>
              </CardContent>
            </Card>
          ))}
        </div>
      </DataLoader>
    </div>
  );
};

export default CMSBlog;
