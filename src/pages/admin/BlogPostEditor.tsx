import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { ArrowLeft, Save, Eye } from "lucide-react";

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function estimateReadingTime(content: string): number {
  const words = content.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

interface PostForm {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  cover_image_url: string;
  og_image_url: string;
  author_id: string;
  category_id: string;
  status: string;
  meta_title: string;
  meta_description: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  noindex: boolean;
  is_featured: boolean;
  published_at: string;
  priority: number;
}

const defaultForm: PostForm = {
  title: "", slug: "", excerpt: "", content: "",
  cover_image_url: "", og_image_url: "", author_id: "", category_id: "",
  status: "draft", meta_title: "", meta_description: "",
  canonical_url: "", og_title: "", og_description: "",
  noindex: false, is_featured: false, published_at: "", priority: 0,
};

export default function BlogPostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isEditing = !!id;
  const [form, setForm] = useState<PostForm>(defaultForm);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_categories").select("*").order("name");
      return data || [];
    },
  });

  const { data: authors = [] } = useQuery({
    queryKey: ["blog-authors"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_authors").select("*").order("name");
      return data || [];
    },
  });

  const { data: existingPost } = useQuery({
    queryKey: ["blog-post", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase.from("blog_posts").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (existingPost) {
      setForm({
        title: existingPost.title || "",
        slug: existingPost.slug || "",
        excerpt: existingPost.excerpt || "",
        content: existingPost.content || "",
        cover_image_url: existingPost.cover_image_url || "",
        og_image_url: existingPost.og_image_url || "",
        author_id: existingPost.author_id || "",
        category_id: existingPost.category_id || "",
        status: existingPost.status || "draft",
        meta_title: existingPost.meta_title || "",
        meta_description: existingPost.meta_description || "",
        canonical_url: existingPost.canonical_url || "",
        og_title: existingPost.og_title || "",
        og_description: existingPost.og_description || "",
        noindex: existingPost.noindex || false,
        is_featured: existingPost.is_featured || false,
        published_at: existingPost.published_at ? existingPost.published_at.slice(0, 16) : "",
        priority: existingPost.priority || 0,
      });
    }
  }, [existingPost]);

  const uploadCover = async (): Promise<string | null> => {
    if (!coverFile) return form.cover_image_url || null;
    setUploading(true);
    try {
      const ext = coverFile.name.split(".").pop();
      const path = `covers/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("blog-media").upload(path, coverFile);
      if (error) throw error;
      const { data: urlData } = supabase.storage.from("blog-media").getPublicUrl(path);
      return urlData.publicUrl;
    } finally {
      setUploading(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async (publish: boolean) => {
      const coverUrl = await uploadCover();
      const readingTime = estimateReadingTime(form.content);
      const status = publish ? "published" : form.status === "published" ? "published" : "draft";
      const payload = {
        title: form.title,
        slug: form.slug,
        excerpt: form.excerpt,
        content: form.content,
        cover_image_url: coverUrl,
        og_image_url: form.og_image_url || coverUrl,
        author_id: form.author_id || null,
        category_id: form.category_id || null,
        status,
        meta_title: form.meta_title || form.title,
        meta_description: form.meta_description || form.excerpt,
        canonical_url: form.canonical_url || null,
        og_title: form.og_title || form.meta_title || form.title,
        og_description: form.og_description || form.meta_description || form.excerpt,
        noindex: form.noindex,
        is_featured: form.is_featured,
        reading_time_min: readingTime,
        published_at: publish && !form.published_at ? new Date().toISOString() : form.published_at || null,
        priority: form.priority,
      };

      if (isEditing) {
        const { error } = await supabase.from("blog_posts").update(payload).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("blog_posts").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      toast.success(isEditing ? "Artigo atualizado" : "Artigo criado");
      navigate("/admin/blog");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (key: keyof PostForm, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/admin/blog")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader title={isEditing ? "Editar artigo" : "Novo artigo"} description="" />
      </div>

      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Conteúdo</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4 mt-4">
          <div className="grid gap-4">
            <div>
              <Label>Título</Label>
              <Input value={form.title} onChange={(e) => { set("title", e.target.value); if (!isEditing) set("slug", slugify(e.target.value)); }} placeholder="Título do artigo" />
            </div>
            <div>
              <Label>Slug</Label>
              <Input value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="url-do-artigo" />
            </div>
            <div>
              <Label>Resumo / Excerpt</Label>
              <Textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} placeholder="Resumo curto do artigo" rows={3} />
            </div>
            <div>
              <Label>Conteúdo (Markdown)</Label>
              <Textarea value={form.content} onChange={(e) => set("content", e.target.value)} placeholder="Escreva o conteúdo do artigo em Markdown..." rows={20} className="font-mono text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Categoria</Label>
                <Select value={form.category_id} onValueChange={(v) => set("category_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Autor</Label>
                <Select value={form.author_id} onValueChange={(v) => set("author_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {authors.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Imagem de capa</Label>
              {form.cover_image_url && (
                <img src={form.cover_image_url} alt="Capa" className="w-full max-h-48 object-cover rounded-lg mb-2" />
              )}
              <Input type="file" accept="image/*" onChange={(e) => setCoverFile(e.target.files?.[0] || null)} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="seo" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Meta Tags</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Meta Title</Label>
                <Input value={form.meta_title} onChange={(e) => set("meta_title", e.target.value)} placeholder={form.title} />
                <p className="text-xs text-muted-foreground mt-1">{(form.meta_title || form.title).length}/60 caracteres</p>
              </div>
              <div>
                <Label>Meta Description</Label>
                <Textarea value={form.meta_description} onChange={(e) => set("meta_description", e.target.value)} placeholder={form.excerpt} rows={2} />
                <p className="text-xs text-muted-foreground mt-1">{(form.meta_description || form.excerpt || "").length}/160 caracteres</p>
              </div>
              <div>
                <Label>Canonical URL</Label>
                <Input value={form.canonical_url} onChange={(e) => set("canonical_url", e.target.value)} placeholder="https://mindsell.ia.br/blog/..." />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.noindex} onCheckedChange={(v) => set("noindex", v)} />
                <Label>Noindex (não indexar)</Label>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Open Graph</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>OG Title</Label>
                <Input value={form.og_title} onChange={(e) => set("og_title", e.target.value)} placeholder={form.meta_title || form.title} />
              </div>
              <div>
                <Label>OG Description</Label>
                <Textarea value={form.og_description} onChange={(e) => set("og_description", e.target.value)} rows={2} />
              </div>
              <div>
                <Label>OG Image URL</Label>
                <Input value={form.og_image_url} onChange={(e) => set("og_image_url", e.target.value)} placeholder="URL da imagem para compartilhamento" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle>Publicação</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="published">Publicado</SelectItem>
                    <SelectItem value="scheduled">Agendado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data de publicação</Label>
                <Input type="datetime-local" value={form.published_at} onChange={(e) => set("published_at", e.target.value)} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_featured} onCheckedChange={(v) => set("is_featured", v)} />
                <Label>Destaque na home do blog</Label>
              </div>
              <div>
                <Label>Prioridade (maior = primeiro)</Label>
                <Input type="number" value={form.priority} onChange={(e) => set("priority", parseInt(e.target.value) || 0)} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={() => saveMutation.mutate(false)} disabled={saveMutation.isPending || uploading}>
          <Save className="h-4 w-4 mr-2" /> Salvar rascunho
        </Button>
        <Button onClick={() => saveMutation.mutate(true)} disabled={saveMutation.isPending || uploading}>
          <Eye className="h-4 w-4 mr-2" /> {form.status === "published" ? "Atualizar" : "Publicar"}
        </Button>
      </div>
    </div>
  );
}
