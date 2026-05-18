import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/PageHeader";
import { Upload, Trash2, Copy } from "lucide-react";
import { toast } from "sonner";

export default function BlogMediaLibrary() {
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: media = [], isLoading } = useQuery({
    queryKey: ["blog-media"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_media").select("*").order("created_at", { ascending: false });
      return data || [];
    },
  });

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.split(".").pop();
        const path = `media/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("blog-media").upload(path, file);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("blog-media").getPublicUrl(path);
        await supabase.from("blog_media").insert({
          file_url: urlData.publicUrl,
          title: file.name,
          alt_text: file.name.replace(/\.[^.]+$/, ""),
        });
      }
      qc.invalidateQueries({ queryKey: ["blog-media"] });
      toast.success("Upload concluído");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  const del = useMutation({
    mutationFn: async (item: any) => {
      const { error } = await supabase.from("blog_media").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog-media"] }); setSelected(null); toast.success("Excluído"); },
  });

  const copyUrl = (url: string) => { navigator.clipboard.writeText(url); toast.success("URL copiada"); };

  return (
    <div className="space-y-6">
      <PageHeader title="Blog CMS — Mídia" description="Gerencie imagens e arquivos do blog" />
      <div className="flex justify-end">
        <label>
          <Button disabled={uploading} asChild>
            <span><Upload className="h-4 w-4 mr-2" /> {uploading ? "Enviando..." : "Upload"}</span>
          </Button>
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => upload(e.target.files)} />
        </label>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {media.map((m) => (
            <Card key={m.id} className="cursor-pointer hover:ring-2 ring-primary transition-all" onClick={() => setSelected(m)}>
              <CardContent className="p-2">
                <img src={m.file_url} alt={m.alt_text || ""} className="w-full h-32 object-cover rounded" />
                <p className="text-xs text-muted-foreground mt-1 truncate">{m.title || "—"}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selected} onOpenChange={(v) => { if (!v) setSelected(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Detalhes da mídia</DialogTitle></DialogHeader>
          {selected && (
            <div className="space-y-4">
              <img src={selected.file_url} alt={selected.alt_text || ""} className="w-full max-h-64 object-contain rounded" />
              <div><Label>URL</Label><div className="flex gap-2"><Input readOnly value={selected.file_url} /><Button size="icon" variant="outline" onClick={() => copyUrl(selected.file_url)}><Copy className="h-4 w-4" /></Button></div></div>
              <div><Label>Alt Text</Label><p className="text-sm text-muted-foreground">{selected.alt_text || "—"}</p></div>
              <Button variant="destructive" className="w-full" onClick={() => { if (confirm("Excluir?")) del.mutate(selected); }}>
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
