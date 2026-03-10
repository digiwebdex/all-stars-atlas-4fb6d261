import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, Edit2, Trash2, Eye, Megaphone, Bell, Image, MonitorSmartphone, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

const statusColors: Record<string, string> = {
  active: "bg-success/10 text-success",
  scheduled: "bg-primary/10 text-primary",
  draft: "bg-muted text-muted-foreground",
  expired: "bg-warning/10 text-warning",
};

const emptyPopup = { title: "", content: "", imageUrl: "", ctaText: "", ctaUrl: "", trigger: "on_load", delay: 3, frequency: "once_per_session", status: "draft", startDate: "", endDate: "", pages: "all" };
const emptyBanner = { title: "", position: "top_bar", bgColor: "#3b82f6", textColor: "#ffffff", ctaText: "", ctaUrl: "", status: "draft", startDate: "", endDate: "", dismissible: true };
const emptyPush = { title: "", body: "", type: "promotional", status: "draft", audience: "all_users", scheduledAt: "" };

const CMSPopups = () => {
  const { toast } = useToast();
  const { data: apiData } = useQuery({ queryKey: ['cms', 'popups'], queryFn: () => api.get('/cms/popups'), retry: 1 });
  const [popups, setPopups] = useState<any[]>([]);
  const [banners, setBanners] = useState<any[]>([]);
  const [pushNotifs, setPushNotifs] = useState<any[]>([]);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    if (apiData && !initialized) {
      const d = apiData as any;
      setPopups(d.popups || []);
      setBanners(d.banners || []);
      setPushNotifs(d.push || []);
      setInitialized(true);
    }
  }, [apiData, initialized]);

  // Popup state
  const [showPopupDialog, setShowPopupDialog] = useState(false);
  const [editingPopup, setEditingPopup] = useState<any>(null);
  const [popupForm, setPopupForm] = useState(emptyPopup);

  // Banner state
  const [showBannerDialog, setShowBannerDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<any>(null);
  const [bannerForm, setBannerForm] = useState(emptyBanner);

  // Push state
  const [showPushDialog, setShowPushDialog] = useState(false);
  const [editingPush, setEditingPush] = useState<any>(null);
  const [pushForm, setPushForm] = useState(emptyPush);

  // ── Popup CRUD ──
  const savePopup = async () => {
    if (!popupForm.title) { toast({ title: "Error", description: "Title is required", variant: "destructive" }); return; }
    try {
      if (editingPopup) {
        await api.put(`/cms/popups/${editingPopup.id}`, popupForm);
        setPopups(prev => prev.map(p => p.id === editingPopup.id ? { ...p, ...popupForm } : p));
      } else {
        const result = await api.post('/cms/popups', popupForm) as any;
        setPopups(prev => [{ ...popupForm, id: result?.id || `POP-${Date.now()}` }, ...prev]);
      }
      toast({ title: editingPopup ? "Updated" : "Created", description: `Popup "${popupForm.title}" saved.` });
    } catch {
      toast({ title: "Error", description: "Failed to save popup", variant: "destructive" });
    }
    setShowPopupDialog(false); setEditingPopup(null); setPopupForm(emptyPopup);
  };
  const deletePopup = async (p: any) => {
    try { await api.delete(`/cms/popups/${p.id}`); } catch {}
    setPopups(prev => prev.filter(x => x.id !== p.id));
    toast({ title: "Deleted", description: `"${p.title}" removed.` });
  };

  // ── Banner CRUD ──
  const saveBanner = async () => {
    if (!bannerForm.title) { toast({ title: "Error", description: "Title is required", variant: "destructive" }); return; }
    try {
      if (editingBanner) {
        await api.put(`/cms/banners/${editingBanner.id}`, bannerForm);
        setBanners(prev => prev.map(b => b.id === editingBanner.id ? { ...b, ...bannerForm } : b));
      } else {
        const result = await api.post('/cms/banners', bannerForm) as any;
        setBanners(prev => [{ ...bannerForm, id: result?.id || `BNR-${Date.now()}` }, ...prev]);
      }
      toast({ title: editingBanner ? "Updated" : "Created", description: `Banner "${bannerForm.title}" saved.` });
    } catch {
      toast({ title: "Error", description: "Failed to save banner", variant: "destructive" });
    }
    setShowBannerDialog(false); setEditingBanner(null); setBannerForm(emptyBanner);
  };
  const deleteBanner = async (b: any) => {
    try { await api.delete(`/cms/banners/${b.id}`); } catch {}
    setBanners(prev => prev.filter(x => x.id !== b.id));
    toast({ title: "Deleted", description: `"${b.title}" removed.` });
  };

  // ── Push CRUD ──
  const savePush = async () => {
    if (!pushForm.title) { toast({ title: "Error", description: "Title is required", variant: "destructive" }); return; }
    try {
      if (editingPush) {
        await api.put(`/cms/push/${editingPush.id}`, pushForm);
        setPushNotifs(prev => prev.map(p => p.id === editingPush.id ? { ...p, ...pushForm } : p));
      } else {
        const result = await api.post('/cms/push', pushForm) as any;
        setPushNotifs(prev => [{ ...pushForm, id: result?.id || `PUSH-${Date.now()}` }, ...prev]);
      }
      toast({ title: editingPush ? "Updated" : "Created", description: `Notification "${pushForm.title}" saved.` });
    } catch {
      toast({ title: "Error", description: "Failed to save notification", variant: "destructive" });
    }
    setShowPushDialog(false); setEditingPush(null); setPushForm(emptyPush);
  };
  const deletePush = async (p: any) => {
    try { await api.delete(`/cms/push/${p.id}`); } catch {}
    setPushNotifs(prev => prev.filter(x => x.id !== p.id));
    toast({ title: "Deleted", description: `"${p.title}" removed.` });
  };

  const stats = {
    activePopups: popups.filter(p => p.status === "active").length,
    activeBanners: banners.filter(b => b.status === "active").length,
    activePush: pushNotifs.filter(p => p.status === "active").length,
    totalItems: popups.length + banners.length + pushNotifs.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Popups, Banners & Notifications</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">Manage promotional popups, announcement banners, and push notifications</p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Active Popups", value: stats.activePopups, icon: MonitorSmartphone, color: "text-primary" },
          { label: "Active Banners", value: stats.activeBanners, icon: Image, color: "text-success" },
          { label: "Push Templates", value: stats.activePush, icon: Bell, color: "text-warning" },
          { label: "Total Items", value: stats.totalItems, icon: Megaphone, color: "text-accent" },
        ].map((s, i) => (
          <Card key={i}><CardContent className="flex items-center gap-3 p-4">
            <div className={`w-10 h-10 rounded-lg bg-muted flex items-center justify-center ${s.color}`}><s.icon className="w-5 h-5" /></div>
            <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="text-xl font-bold">{s.value}</p></div>
          </CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="popups" className="space-y-4">
        <TabsList><TabsTrigger value="popups">Popups</TabsTrigger><TabsTrigger value="banners">Ad Banners</TabsTrigger><TabsTrigger value="push">Push Notifications</TabsTrigger></TabsList>

        {/* ═══ POPUPS TAB ═══ */}
        <TabsContent value="popups" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPopup(null); setPopupForm(emptyPopup); setShowPopupDialog(true); }}><Plus className="w-4 h-4 mr-1.5" /> New Popup</Button>
          </div>
          <Card><CardContent className="p-0 table-responsive">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead className="hidden md:table-cell">Trigger</TableHead><TableHead className="hidden md:table-cell">Pages</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Validity</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {popups.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No popups created</TableCell></TableRow>
                ) : popups.map(p => (
                  <TableRow key={p.id}>
                    <TableCell><div><p className="text-sm font-medium">{p.title}</p><p className="text-[10px] text-muted-foreground line-clamp-1">{p.content}</p></div></TableCell>
                    <TableCell className="hidden md:table-cell text-sm capitalize">{p.trigger?.replace(/_/g, ' ')}</TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px] capitalize">{p.pages}</Badge></TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${statusColors[p.status] || ''}`}>{p.status}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{p.startDate || '—'} → {p.endDate || '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingPopup(p); setPopupForm({ title: p.title, content: p.content, imageUrl: p.imageUrl || "", ctaText: p.ctaText || "", ctaUrl: p.ctaUrl || "", trigger: p.trigger, delay: p.delay || 3, frequency: p.frequency || "once_per_session", status: p.status, startDate: p.startDate || "", endDate: p.endDate || "", pages: p.pages || "all" }); setShowPopupDialog(true); }}><Edit2 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deletePopup(p)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ═══ BANNERS TAB ═══ */}
        <TabsContent value="banners" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingBanner(null); setBannerForm(emptyBanner); setShowBannerDialog(true); }}><Plus className="w-4 h-4 mr-1.5" /> New Banner</Button>
          </div>
          <Card><CardContent className="p-0 table-responsive">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead className="hidden md:table-cell">Position</TableHead><TableHead className="hidden md:table-cell">Preview</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Validity</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {banners.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No banners created</TableCell></TableRow>
                ) : banners.map(b => (
                  <TableRow key={b.id}>
                    <TableCell><div><p className="text-sm font-medium">{b.title}</p><p className="text-[10px] text-muted-foreground">{b.ctaText}</p></div></TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px] capitalize">{b.position?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="h-6 w-24 rounded text-[9px] flex items-center justify-center font-bold" style={{ backgroundColor: b.bgColor, color: b.textColor }}>Preview</div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${statusColors[b.status] || ''}`}>{b.status}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{b.startDate || '—'} → {b.endDate || '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingBanner(b); setBannerForm({ title: b.title, position: b.position, bgColor: b.bgColor, textColor: b.textColor, ctaText: b.ctaText || "", ctaUrl: b.ctaUrl || "", status: b.status, startDate: b.startDate || "", endDate: b.endDate || "", dismissible: b.dismissible ?? true }); setShowBannerDialog(true); }}><Edit2 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deleteBanner(b)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>

        {/* ═══ PUSH NOTIFICATIONS TAB ═══ */}
        <TabsContent value="push" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => { setEditingPush(null); setPushForm(emptyPush); setShowPushDialog(true); }}><Plus className="w-4 h-4 mr-1.5" /> New Notification</Button>
          </div>
          <Card><CardContent className="p-0 table-responsive">
            <Table>
              <TableHeader><TableRow><TableHead>Title</TableHead><TableHead className="hidden md:table-cell">Type</TableHead><TableHead className="hidden md:table-cell">Audience</TableHead><TableHead>Status</TableHead><TableHead className="hidden lg:table-cell">Schedule</TableHead><TableHead className="w-10"></TableHead></TableRow></TableHeader>
              <TableBody>
                {pushNotifs.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-12">No notifications created</TableCell></TableRow>
                ) : pushNotifs.map(p => (
                  <TableRow key={p.id}>
                    <TableCell><div><p className="text-sm font-medium">{p.title}</p><p className="text-[10px] text-muted-foreground line-clamp-1">{p.body}</p></div></TableCell>
                    <TableCell className="hidden md:table-cell"><Badge variant="outline" className="text-[10px] capitalize">{p.type?.replace(/_/g, ' ')}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-sm capitalize">{p.audience?.replace(/_/g, ' ')}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${statusColors[p.status] || ''}`}>{p.status}</Badge></TableCell>
                    <TableCell className="hidden lg:table-cell text-xs text-muted-foreground">{p.scheduledAt || '—'}</TableCell>
                    <TableCell>
                      <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setEditingPush(p); setPushForm({ title: p.title, body: p.body, type: p.type, status: p.status, audience: p.audience, scheduledAt: p.scheduledAt || "" }); setShowPushDialog(true); }}><Edit2 className="w-4 h-4 mr-2" /> Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive" onClick={() => deletePush(p)}><Trash2 className="w-4 h-4 mr-2" /> Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent></Card>
        </TabsContent>
      </Tabs>

      {/* ═══ POPUP DIALOG ═══ */}
      <Dialog open={showPopupDialog} onOpenChange={(o) => { setShowPopupDialog(o); if (!o) { setEditingPopup(null); setPopupForm(emptyPopup); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingPopup ? "Edit Popup" : "Create Popup"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={popupForm.title} onChange={e => setPopupForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Welcome Offer — ৳500 Off!" /></div>
            <div className="space-y-1.5"><Label>Content</Label><Textarea value={popupForm.content} onChange={e => setPopupForm(f => ({ ...f, content: e.target.value }))} rows={3} placeholder="Popup message content..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>CTA Button Text</Label><Input value={popupForm.ctaText} onChange={e => setPopupForm(f => ({ ...f, ctaText: e.target.value }))} placeholder="Book Now" /></div>
              <div className="space-y-1.5"><Label>CTA URL</Label><Input value={popupForm.ctaUrl} onChange={e => setPopupForm(f => ({ ...f, ctaUrl: e.target.value }))} placeholder="/flights" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Trigger</Label>
                <Select value={popupForm.trigger} onValueChange={v => setPopupForm(f => ({ ...f, trigger: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="on_load">On Page Load</SelectItem>
                    <SelectItem value="exit_intent">Exit Intent</SelectItem>
                    <SelectItem value="scroll_50">Scroll 50%</SelectItem>
                    <SelectItem value="time_delay">Time Delay</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Frequency</Label>
                <Select value={popupForm.frequency} onValueChange={v => setPopupForm(f => ({ ...f, frequency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once_per_session">Once Per Session</SelectItem>
                    <SelectItem value="once_per_day">Once Per Day</SelectItem>
                    <SelectItem value="once_per_week">Once Per Week</SelectItem>
                    <SelectItem value="every_visit">Every Visit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Show On Pages</Label>
                <Select value={popupForm.pages} onValueChange={v => setPopupForm(f => ({ ...f, pages: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Pages</SelectItem>
                    <SelectItem value="homepage">Homepage Only</SelectItem>
                    <SelectItem value="blog">Blog Pages</SelectItem>
                    <SelectItem value="booking">Booking Pages</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={popupForm.status} onValueChange={v => setPopupForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={popupForm.startDate} onChange={e => setPopupForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={popupForm.endDate} onChange={e => setPopupForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="space-y-1.5"><Label>Image URL (optional)</Label><Input value={popupForm.imageUrl} onChange={e => setPopupForm(f => ({ ...f, imageUrl: e.target.value }))} placeholder="https://..." /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={savePopup}>{editingPopup ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ BANNER DIALOG ═══ */}
      <Dialog open={showBannerDialog} onOpenChange={(o) => { setShowBannerDialog(o); if (!o) { setEditingBanner(null); setBannerForm(emptyBanner); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{editingBanner ? "Edit Banner" : "Create Banner"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={bannerForm.title} onChange={e => setBannerForm(f => ({ ...f, title: e.target.value }))} placeholder="Flash Sale — 40% Off!" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Position</Label>
                <Select value={bannerForm.position} onValueChange={v => setBannerForm(f => ({ ...f, position: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="top_bar">Top Announcement Bar</SelectItem>
                    <SelectItem value="homepage_hero">Homepage Hero Overlay</SelectItem>
                    <SelectItem value="homepage_mid">Homepage Mid-Section</SelectItem>
                    <SelectItem value="sidebar">Sidebar Banner</SelectItem>
                    <SelectItem value="footer_above">Above Footer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={bannerForm.status} onValueChange={v => setBannerForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="scheduled">Scheduled</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Background Color</Label><div className="flex gap-2"><Input type="color" value={bannerForm.bgColor} onChange={e => setBannerForm(f => ({ ...f, bgColor: e.target.value }))} className="w-12 h-11 p-1 cursor-pointer" /><Input value={bannerForm.bgColor} onChange={e => setBannerForm(f => ({ ...f, bgColor: e.target.value }))} className="flex-1" /></div></div>
              <div className="space-y-1.5"><Label>Text Color</Label><div className="flex gap-2"><Input type="color" value={bannerForm.textColor} onChange={e => setBannerForm(f => ({ ...f, textColor: e.target.value }))} className="w-12 h-11 p-1 cursor-pointer" /><Input value={bannerForm.textColor} onChange={e => setBannerForm(f => ({ ...f, textColor: e.target.value }))} className="flex-1" /></div></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>CTA Text</Label><Input value={bannerForm.ctaText} onChange={e => setBannerForm(f => ({ ...f, ctaText: e.target.value }))} placeholder="Shop Now →" /></div>
              <div className="space-y-1.5"><Label>CTA URL</Label><Input value={bannerForm.ctaUrl} onChange={e => setBannerForm(f => ({ ...f, ctaUrl: e.target.value }))} placeholder="/flights" /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Start Date</Label><Input type="date" value={bannerForm.startDate} onChange={e => setBannerForm(f => ({ ...f, startDate: e.target.value }))} /></div>
              <div className="space-y-1.5"><Label>End Date</Label><Input type="date" value={bannerForm.endDate} onChange={e => setBannerForm(f => ({ ...f, endDate: e.target.value }))} /></div>
            </div>
            <div className="flex items-center gap-2"><Switch checked={bannerForm.dismissible} onCheckedChange={v => setBannerForm(f => ({ ...f, dismissible: v }))} /><Label>User can dismiss</Label></div>
            {/* Live Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs">Preview</Label>
              <div className="rounded-lg px-4 py-3 text-center font-bold text-sm" style={{ backgroundColor: bannerForm.bgColor, color: bannerForm.textColor }}>
                {bannerForm.title || "Banner Preview"} {bannerForm.ctaText && <span className="ml-2 underline">{bannerForm.ctaText}</span>}
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveBanner}>{editingBanner ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ PUSH DIALOG ═══ */}
      <Dialog open={showPushDialog} onOpenChange={(o) => { setShowPushDialog(o); if (!o) { setEditingPush(null); setPushForm(emptyPush); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editingPush ? "Edit Notification" : "Create Push Notification"}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-1.5"><Label>Title *</Label><Input value={pushForm.title} onChange={e => setPushForm(f => ({ ...f, title: e.target.value }))} placeholder="Flash Sale: 50% Off!" /></div>
            <div className="space-y-1.5"><Label>Body</Label><Textarea value={pushForm.body} onChange={e => setPushForm(f => ({ ...f, body: e.target.value }))} rows={2} placeholder="Notification message..." /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Type</Label>
                <Select value={pushForm.type} onValueChange={v => setPushForm(f => ({ ...f, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="promotional">Promotional</SelectItem>
                    <SelectItem value="transactional">Transactional</SelectItem>
                    <SelectItem value="booking_reminder">Booking Reminder</SelectItem>
                    <SelectItem value="price_alert">Price Alert</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5"><Label>Audience</Label>
                <Select value={pushForm.audience} onValueChange={v => setPushForm(f => ({ ...f, audience: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_users">All Users</SelectItem>
                    <SelectItem value="booked_users">Users with Bookings</SelectItem>
                    <SelectItem value="wishlist_users">Wishlist Users</SelectItem>
                    <SelectItem value="specific_user">Specific User</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5"><Label>Schedule</Label><Input value={pushForm.scheduledAt} onChange={e => setPushForm(f => ({ ...f, scheduledAt: e.target.value }))} placeholder="Mar 15, 2026 — 10:00 AM" /></div>
              <div className="space-y-1.5"><Label>Status</Label>
                <Select value={pushForm.status} onValueChange={v => setPushForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="draft">Draft</SelectItem></SelectContent>
                </Select>
              </div>
            </div>
            {/* Push Preview */}
            <div className="space-y-1.5">
              <Label className="text-xs">Preview</Label>
              <div className="border rounded-lg p-3 flex items-start gap-3 bg-muted/30">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Bell className="w-5 h-5 text-primary" /></div>
                <div><p className="text-sm font-bold">{pushForm.title || "Notification Title"}</p><p className="text-xs text-muted-foreground mt-0.5">{pushForm.body || "Notification body text..."}</p></div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={savePush}>{editingPush ? "Update" : "Create"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CMSPopups;
