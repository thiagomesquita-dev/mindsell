import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Plus, Edit2, Trash2, Eye, Star, StarOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/PageHeader";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function BlogPosts() {
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<"all" | "draft" | "published" | "scheduled">("all");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["blog-posts-admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(name), blog_authors(name)")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("blog_posts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] });
      toast.success("Artigo excluído");
    },
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, featured }: { id: string; featured: boolean }) => {
      const { error } = await supabase.from("blog_posts").update({ is_featured: featured }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["blog-posts-admin"] }),
  });

  const filtered = filter === "all" ? posts : posts.filter((p) => p.status === filter);

  const statusBadge = (status: string) => {
    switch (status) {
      case "published": return <Badge className="bg-green-600">Publicado</Badge>;
      case "draft": return <Badge variant="secondary">Rascunho</Badge>;
      case "scheduled": return <Badge className="bg-blue-600">Agendado</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Blog CMS — Artigos" description="Gerencie os artigos do blog" />
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["all", "draft", "published", "scheduled"] as const).map((f) => (
            <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
              {f === "all" ? "Todos" : f === "draft" ? "Rascunhos" : f === "published" ? "Publicados" : "Agendados"}
            </Button>
          ))}
        </div>
        <Link to="/admin/blog/new">
          <Button><Plus className="h-4 w-4 mr-2" /> Novo artigo</Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Autor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Publicação</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((post) => (
              <TableRow key={post.id}>
                <TableCell className="font-medium max-w-[300px] truncate">
                  <div className="flex items-center gap-2">
                    {post.is_featured && <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 shrink-0" />}
                    {post.title}
                  </div>
                </TableCell>
                <TableCell>{(post as any).blog_categories?.name || "—"}</TableCell>
                <TableCell>{(post as any).blog_authors?.name || "—"}</TableCell>
                <TableCell>{statusBadge(post.status)}</TableCell>
                <TableCell>
                  {post.published_at ? format(new Date(post.published_at), "dd/MM/yyyy", { locale: ptBR }) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => toggleFeatured.mutate({ id: post.id, featured: !post.is_featured })}>
                      {post.is_featured ? <StarOff className="h-4 w-4" /> : <Star className="h-4 w-4" />}
                    </Button>
                    {post.status === "published" && (
                      <a href={`https://mindsell.ia.br/blog/${post.slug}`} target="_blank" rel="noopener noreferrer">
                        <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      </a>
                    )}
                    <Link to={`/admin/blog/edit/${post.id}`}>
                      <Button size="icon" variant="ghost"><Edit2 className="h-4 w-4" /></Button>
                    </Link>
                    <Button size="icon" variant="ghost" className="text-destructive" onClick={() => {
                      if (confirm("Excluir este artigo?")) deleteMutation.mutate(post.id);
                    }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-12">
                  Nenhum artigo encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
