import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Clock, ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect } from "react";
import { InstitutionalHeader } from "@/components/InstitutionalHeader";
import { InstitutionalFooter } from "@/components/InstitutionalFooter";

function renderMarkdown(md: string): string {
  return md
    .replace(/^### (.*$)/gim, '<h3 class="text-xl font-heading font-semibold mt-8 mb-3">$1</h3>')
    .replace(/^## (.*$)/gim, '<h2 class="text-2xl font-heading font-bold mt-10 mb-4">$1</h2>')
    .replace(/^# (.*$)/gim, '<h1 class="text-3xl font-heading font-bold mt-12 mb-6">$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="rounded-lg my-6 w-full" loading="lazy" />')
    .replace(
      /\[([^\]]+)\]\(([^)]+)\)/g,
      '<a href="$2" class="text-primary underline hover:no-underline" target="_blank" rel="noopener noreferrer">$1</a>',
    )
    .replace(/^- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*$)/gim, '<li class="ml-4 list-decimal">$2</li>')
    .replace(
      /^> (.*$)/gim,
      '<blockquote class="border-l-4 border-primary pl-4 italic text-muted-foreground my-4">$1</blockquote>',
    )
    .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-sm">$1</code>')
    .replace(/\n\n/g, '</p><p class="mb-4">')
    .replace(/\n/g, "<br />")
    .replace(/^(.+)$/gm, (match) => {
      if (match.startsWith("<")) return match;
      return match;
    });
}

/**
 * Sanitiza HTML usando um iframe sandboxed no próprio browser —
 * sem dependência externa. Remove scripts, event handlers (on*) e
 * atributos perigosos antes de entregar ao dangerouslySetInnerHTML.
 */
function sanitizeHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  const ALLOWED_TAGS = new Set([
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "strong",
    "em",
    "a",
    "img",
    "ul",
    "ol",
    "li",
    "blockquote",
    "code",
    "pre",
    "br",
    "span",
    "div",
  ]);
  const ALLOWED_ATTRS = new Set(["href", "src", "alt", "class", "target", "rel", "loading"]);

  function clean(node: Element) {
    // Remover elementos não permitidos (mas manter filhos)
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.ELEMENT_NODE) {
        const el = child as Element;
        const tag = el.tagName.toLowerCase();

        if (!ALLOWED_TAGS.has(tag)) {
          // Substituir elemento proibido pelos seus filhos
          while (el.firstChild) node.insertBefore(el.firstChild, el);
          node.removeChild(el);
          continue;
        }

        // Remover atributos não permitidos e event handlers (on*)
        for (const attr of Array.from(el.attributes)) {
          if (!ALLOWED_ATTRS.has(attr.name) || attr.name.startsWith("on")) {
            el.removeAttribute(attr.name);
            continue;
          }
          // Bloquear javascript: e data: URIs em href e src
          if (attr.name === "href" || attr.name === "src") {
            const val = attr.value.trim().toLowerCase().replace(/\s/g, "");
            if (val.startsWith("javascript:") || val.startsWith("data:")) {
              el.removeAttribute(attr.name);
            }
          }
        }

        // Forçar links externos a abrirem em nova aba com noopener
        if (tag === "a") {
          el.setAttribute("target", "_blank");
          el.setAttribute("rel", "noopener noreferrer");
        }

        clean(el);
      }
    }
  }

  clean(doc.body);
  return doc.body.innerHTML;
}

function renderSafeMarkdown(md: string): string {
  return sanitizeHtml(`<p class="mb-4">${renderMarkdown(md)}</p>`);
}

export default function BlogPost() {
  const { slug } = useParams();

  const {
    data: post,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["blog-post-public", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("blog_posts")
        .select("*, blog_categories(name, slug), blog_authors(name, bio, avatar_url)")
        .eq("slug", slug!)
        .eq("status", "published")
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const { data: relatedPosts = [] } = useQuery({
    queryKey: ["blog-related", post?.category_id, post?.id],
    queryFn: async () => {
      if (!post?.category_id) return [];
      const { data } = await supabase
        .from("blog_posts")
        .select("id, title, slug, cover_image_url, published_at, excerpt")
        .eq("status", "published")
        .eq("category_id", post.category_id)
        .neq("id", post.id)
        .order("published_at", { ascending: false })
        .limit(3);
      return data || [];
    },
    enabled: !!post?.category_id,
  });

  useEffect(() => {
    if (!post) return;
    const title = post.meta_title || post.title;
    const desc = post.meta_description || post.excerpt || "";
    document.title = `${title} | MindSell Blog`;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };
    setMeta("description", desc);
    setMeta("og:title", post.og_title || title, "property");
    setMeta("og:description", post.og_description || desc, "property");
    setMeta("og:type", "article", "property");
    setMeta("og:url", `https://mindsell.ia.br/blog/${post.slug}`, "property");
    if (post.og_image_url || post.cover_image_url)
      setMeta("og:image", post.og_image_url || post.cover_image_url || "", "property");
    setMeta("twitter:card", "summary_large_image", "name");
    setMeta("twitter:title", post.og_title || title, "name");
    setMeta("twitter:description", post.og_description || desc, "name");

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = post.canonical_url || `https://mindsell.ia.br/blog/${post.slug}`;

    if (post.noindex) setMeta("robots", "noindex, nofollow");

    let ld = document.getElementById("blog-jsonld");
    if (!ld) {
      ld = document.createElement("script");
      ld.id = "blog-jsonld";
      ld.setAttribute("type", "application/ld+json");
      document.head.appendChild(ld);
    }
    ld.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: title,
      description: desc,
      image: post.og_image_url || post.cover_image_url || undefined,
      datePublished: post.published_at,
      dateModified: post.updated_at,
      author: { "@type": "Person", name: (post as any).blog_authors?.name || "MindSell" },
      publisher: { "@type": "Organization", name: "MindSell", url: "https://mindsell.ia.br" },
      mainEntityOfPage: { "@type": "WebPage", "@id": `https://mindsell.ia.br/blog/${post.slug}` },
    });

    return () => {
      document.title = "MindSell";
      ld?.remove();
    };
  }, [post]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !post) {
    return (
      <div className="min-h-screen bg-background">
        <InstitutionalHeader />
        <div className="pt-32 text-center">
          <h1 className="text-2xl font-bold mb-4">Artigo não encontrado</h1>
          <Link to="/blog">
            <Button variant="outline">Voltar ao blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const author = (post as any).blog_authors;
  const category = (post as any).blog_categories;

  return (
    <div className="min-h-screen bg-background">
      <InstitutionalHeader />

      <main className="pt-24 pb-16 px-4 sm:px-6">
        <article className="max-w-3xl mx-auto">
          <Link
            to="/blog"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="h-3 w-3" /> Voltar ao blog
          </Link>

          {category && <Badge className="mb-4">{category.name}</Badge>}

          <h1 className="text-3xl sm:text-4xl font-heading font-bold text-foreground mb-4">{post.title}</h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-8">
            {author && (
              <div className="flex items-center gap-2">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={author.avatar_url || ""} />
                  <AvatarFallback>{author.name?.charAt(0)}</AvatarFallback>
                </Avatar>
                <span>{author.name}</span>
              </div>
            )}
            {post.published_at && (
              <span className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(post.published_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            )}
            {post.reading_time_min && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" /> {post.reading_time_min} min
              </span>
            )}
          </div>

          {post.cover_image_url && (
            <img src={post.cover_image_url} alt={post.title} className="w-full rounded-xl mb-8 max-h-96 object-cover" />
          )}

          <div
            className="prose prose-lg max-w-none text-foreground/90 [&_p]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-10 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3"
            dangerouslySetInnerHTML={{ __html: renderSafeMarkdown(post.content || "") }}
          />
        </article>

        {/* Related */}
        {relatedPosts.length > 0 && (
          <section className="max-w-3xl mx-auto mt-16 pt-8 border-t border-border">
            <h2 className="text-xl font-heading font-bold mb-6">Artigos relacionados</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              {relatedPosts.map((rp) => (
                <Link
                  key={rp.id}
                  to={`/blog/${rp.slug}`}
                  className="group border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                >
                  {rp.cover_image_url && (
                    <img src={rp.cover_image_url} alt={rp.title} className="w-full h-32 object-cover" loading="lazy" />
                  )}
                  <div className="p-3">
                    <h3 className="text-sm font-medium group-hover:text-primary transition-colors line-clamp-2">
                      {rp.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="max-w-3xl mx-auto mt-16 bg-primary/5 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-heading font-bold mb-3">Quer melhorar sua operação de vendas?</h2>
          <p className="text-muted-foreground mb-4">
            Conheça o MindSell e veja como IA pode transformar seus resultados.
          </p>
          <Link to="/planos">
            <Button>
              Começar agora <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        </section>
      </main>

      <InstitutionalFooter />
    </div>
  );
}
