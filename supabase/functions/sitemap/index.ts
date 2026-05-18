// supabase/functions/sitemap/index.ts
//
// Gera sitemap.xml dinâmico com todos os posts publicados.
// Configure no seu domínio para responder em: mindsell.ia.br/sitemap.xml
// (via redirect no Cloudflare, Vercel rewrites, ou nginx proxy_pass)
//
// Deploy: supabase functions deploy sitemap --no-verify-jwt

import { createClient } from "npm:@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const BASE_URL = "https://mindsell.ia.br";

// Rotas estáticas do site institucional
const STATIC_ROUTES = [
  { url: "/", priority: "1.0", changefreq: "weekly" },
  { url: "/blog", priority: "0.9", changefreq: "daily" },
  { url: "/planos", priority: "0.8", changefreq: "monthly" },
];

Deno.serve(async () => {
  // Buscar todos os posts publicados
  const { data: posts } = await supabase
    .from("blog_posts")
    .select("slug, updated_at, published_at")
    .eq("status", "published")
    .order("published_at", { ascending: false });

  const staticUrls = STATIC_ROUTES.map(
    ({ url, priority, changefreq }) => `
  <url>
    <loc>${BASE_URL}${url}</loc>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`,
  ).join("");

  const postUrls = (posts ?? []).map((post) => {
    const lastmod = (post.updated_at || post.published_at || "").split("T")[0];
    return `
  <url>
    <loc>${BASE_URL}/blog/${post.slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>`;
  }).join("");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticUrls}
${postUrls}
</urlset>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600", // cache 1h
    },
  });
});
