import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import { Search, ArrowRight, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { InstitutionalHeader } from "@/components/InstitutionalHeader";
import { InstitutionalFooter } from "@/components/InstitutionalFooter";

export default function BlogList() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 12;

  const { data: categories = [] } = useQuery({
    queryKey: ["blog-categories-public"],
    queryFn: async () => {
      const { data } = await supabase.from("blog_categories").select("*").order("name");
      return data || [];
    },
  });

  const { data: postsData, isLoading } = useQuery({
    queryKey: ["blog-posts-public", search, categoryFilter, page],
    queryFn: async () => {
      let query = supabase
        .from("blog_posts")
        .select("*, blog_categories(name, slug), blog_authors(name, avatar_url)", { count: "exact" })
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("is_featured", { ascending: false })
        .order("published_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) query = query.ilike("title", `%${search}%`);
      if (categoryFilter) query = query.eq("category_id", categoryFilter);

      const { data, count, error } = await query;
      if (error) throw error;
      return { posts: data || [], total: count || 0 };
    },
  });

  const posts = postsData?.posts || [];
  const total = postsData?.total || 0;
  const featured = posts.find((p) => p.is_featured);
  const rest = posts.filter((p) => p.id !== featured?.id);

  return (
    <div className="min-h-screen bg-background">
      <InstitutionalHeader />

      {/* SEO */}
      <title>Blog — MindSell | Inteligência em Cobrança</title>
      <meta name="description" content="Artigos sobre vendas, negociação, IA e gestão de equipes de vendas. Dicas e estratégias para melhorar sua operação." />

      <main className="pt-24 pb-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-heading font-bold text-foreground mb-4">Blog MindSell</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Artigos sobre vendas, negociação, inteligência artificial e gestão de equipes.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Buscar artigos..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(0); }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button size="sm" variant={!categoryFilter ? "default" : "outline"} onClick={() => { setCategoryFilter(null); setPage(0); }}>
                Todos
              </Button>
              {categories.map((c) => (
                <Button key={c.id} size="sm" variant={categoryFilter === c.id ? "default" : "outline"} onClick={() => { setCategoryFilter(c.id); setPage(0); }}>
                  {c.name}
                </Button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : (
            <>
              {/* Featured */}
              {featured && page === 0 && !search && !categoryFilter && (
                <Link to={`/blog/${featured.slug}`} className="block mb-12 group">
                  <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
                    {featured.cover_image_url && (
                      <img src={featured.cover_image_url} alt={featured.title} className="w-full h-64 sm:h-80 object-cover" />
                    )}
                    <div className="p-6 sm:p-8">
                      <Badge className="mb-3">{(featured as any).blog_categories?.name || "Artigo"}</Badge>
                      <h2 className="text-2xl sm:text-3xl font-heading font-bold text-foreground group-hover:text-primary transition-colors mb-3">
                        {featured.title}
                      </h2>
                      <p className="text-muted-foreground mb-4 line-clamp-2">{featured.excerpt}</p>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{(featured as any).blog_authors?.name}</span>
                        {featured.published_at && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(featured.published_at), "dd MMM yyyy", { locale: ptBR })}
                          </span>
                        )}
                        {featured.reading_time_min && <span>{featured.reading_time_min} min de leitura</span>}
                      </div>
                    </div>
                  </div>
                </Link>
              )}

              {/* Grid */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {rest.map((post) => (
                  <Link key={post.id} to={`/blog/${post.slug}`} className="group">
                    <article className="border border-border rounded-xl overflow-hidden bg-card hover:shadow-lg transition-shadow h-full flex flex-col">
                      {post.cover_image_url && (
                        <img src={post.cover_image_url} alt={post.title} className="w-full h-48 object-cover" loading="lazy" />
                      )}
                      <div className="p-5 flex-1 flex flex-col">
                        {(post as any).blog_categories?.name && (
                          <Badge variant="secondary" className="self-start mb-2 text-xs">{(post as any).blog_categories.name}</Badge>
                        )}
                        <h3 className="font-heading font-semibold text-foreground group-hover:text-primary transition-colors mb-2 line-clamp-2">
                          {post.title}
                        </h3>
                        <p className="text-sm text-muted-foreground line-clamp-3 flex-1">{post.excerpt}</p>
                        <div className="flex items-center justify-between mt-4 text-xs text-muted-foreground">
                          <span>{(post as any).blog_authors?.name || ""}</span>
                          {post.published_at && <span>{format(new Date(post.published_at), "dd/MM/yyyy", { locale: ptBR })}</span>}
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>

              {posts.length === 0 && (
                <p className="text-center text-muted-foreground py-20">Nenhum artigo encontrado.</p>
              )}

              {/* Pagination */}
              {total > PAGE_SIZE && (
                <div className="flex justify-center gap-2 mt-12">
                  <Button variant="outline" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
                  <span className="flex items-center px-4 text-sm text-muted-foreground">
                    Página {page + 1} de {Math.ceil(total / PAGE_SIZE)}
                  </span>
                  <Button variant="outline" disabled={(page + 1) * PAGE_SIZE >= total} onClick={() => setPage((p) => p + 1)}>Próxima</Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* CTA */}
      <section className="bg-primary/5 border-t border-border py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl font-heading font-bold text-foreground mb-4">
            Transforme sua operação de vendas com IA
          </h2>
          <p className="text-muted-foreground mb-6">
            O MindSell analisa negociações, treina operadores e gera insights em tempo real.
          </p>
          <Link to="/planos">
            <Button size="lg">
              Começar agora <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </div>
      </section>

      <InstitutionalFooter />
    </div>
  );
}
