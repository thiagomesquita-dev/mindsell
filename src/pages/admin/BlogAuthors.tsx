import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PageHeader } from "@/components/PageHeader";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function BlogAuthors() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

  const { data: authors = [], isLoading } = useQuery({
    queryKey: ["blog-authors"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_authors").select("*").order("name");
      return data || [];
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      let finalAvatar = avatarUrl;
      if (avatarFile) {
        const ext = avatarFile.name.split(".").pop();
        const path = `authors/${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("blog-media").upload(path, avatarFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("blog-media").getPublicUrl(path);
        finalAvatar = urlData.publicUrl;
      }
      const payload = { name, bio: bio || null, avatar_url: finalAvatar || null };
      if (editing) {
        const { error } = await supabase.from("blog_authors").update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_authors").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog-authors"] }); reset(); toast.success("Salvo"); },
    onError: (e: any) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_authors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["blog-authors"] }); toast.success("Excluído"); },
  });

  const reset = () => { setOpen(false); setEditing(null); setName(""); setBio(""); setAvatarUrl(""); setAvatarFile(null); };
  const openEdit = (a: any) => { setEditing(a); setName(a.name); setBio(a.bio || ""); setAvatarUrl(a.avatar_url || ""); setOpen(true); };

  return (
    <div className="space-y-6">
      <PageHeader title="Blog CMS — Autores" description="Gerencie os autores do blog" />
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); else setOpen(true); }}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Novo autor</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} autor</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div><Label>Bio</Label><Textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} /></div>
              <div><Label>Avatar</Label><Input type="file" accept="image/*" onChange={(e) => setAvatarFile(e.target.files?.[0] || null)} /></div>
              <Button onClick={() => save.mutate()} disabled={!name || save.isPending} className="w-full">Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>
      ) : (
        <Table>
          <TableHeader><TableRow><TableHead>Autor</TableHead><TableHead>Bio</TableHead><TableHead className="text-right">Ações</TableHead></TableRow></TableHeader>
          <TableBody>
            {authors.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={a.avatar_url || ""} />
                      <AvatarFallback>{a.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{a.name}</span>
                  </div>
                </TableCell>
                <TableCell className="max-w-[400px] truncate text-muted-foreground">{a.bio || "—"}</TableCell>
                <TableCell className="text-right">
                  <Button size="icon" variant="ghost" onClick={() => openEdit(a)}><Edit2 className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="text-destructive" onClick={() => { if (confirm("Excluir?")) del.mutate(a.id); }}><Trash2 className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
