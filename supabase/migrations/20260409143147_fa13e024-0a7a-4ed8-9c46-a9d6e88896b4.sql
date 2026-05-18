
-- Blog Categories
CREATE TABLE public.blog_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog categories" ON public.blog_categories FOR SELECT USING (true);
CREATE POLICY "Founder can insert blog categories" ON public.blog_categories FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can update blog categories" ON public.blog_categories FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can delete blog categories" ON public.blog_categories FOR DELETE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Blog Authors
CREATE TABLE public.blog_authors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  bio text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_authors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog authors" ON public.blog_authors FOR SELECT USING (true);
CREATE POLICY "Founder can insert blog authors" ON public.blog_authors FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can update blog authors" ON public.blog_authors FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can delete blog authors" ON public.blog_authors FOR DELETE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Blog Tags
CREATE TABLE public.blog_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog tags" ON public.blog_tags FOR SELECT USING (true);
CREATE POLICY "Founder can insert blog tags" ON public.blog_tags FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can update blog tags" ON public.blog_tags FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can delete blog tags" ON public.blog_tags FOR DELETE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Blog Posts
CREATE TABLE public.blog_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  slug text NOT NULL UNIQUE,
  excerpt text,
  content text,
  cover_image_url text,
  og_image_url text,
  author_id uuid REFERENCES public.blog_authors(id) ON DELETE SET NULL,
  category_id uuid REFERENCES public.blog_categories(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'scheduled')),
  meta_title text,
  meta_description text,
  canonical_url text,
  og_title text,
  og_description text,
  noindex boolean NOT NULL DEFAULT false,
  is_featured boolean NOT NULL DEFAULT false,
  reading_time_min integer,
  related_post_ids uuid[] DEFAULT '{}'::uuid[],
  priority integer DEFAULT 0,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published blog posts" ON public.blog_posts FOR SELECT USING (status = 'published' AND (published_at IS NULL OR published_at <= now()));
CREATE POLICY "Founder can view all blog posts" ON public.blog_posts FOR SELECT TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can insert blog posts" ON public.blog_posts FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can update blog posts" ON public.blog_posts FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can delete blog posts" ON public.blog_posts FOR DELETE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Blog Post Tags (junction)
CREATE TABLE public.blog_post_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES public.blog_tags(id) ON DELETE CASCADE,
  UNIQUE(post_id, tag_id)
);
ALTER TABLE public.blog_post_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog post tags" ON public.blog_post_tags FOR SELECT USING (true);
CREATE POLICY "Founder can insert blog post tags" ON public.blog_post_tags FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can delete blog post tags" ON public.blog_post_tags FOR DELETE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Blog Media
CREATE TABLE public.blog_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_url text NOT NULL,
  alt_text text,
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.blog_media ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view blog media" ON public.blog_media FOR SELECT USING (true);
CREATE POLICY "Founder can insert blog media" ON public.blog_media FOR INSERT TO authenticated WITH CHECK ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can update blog media" ON public.blog_media FOR UPDATE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can delete blog media" ON public.blog_media FOR DELETE TO authenticated USING ((auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');

-- Updated_at triggers
CREATE TRIGGER set_blog_categories_updated_at BEFORE UPDATE ON public.blog_categories FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_blog_authors_updated_at BEFORE UPDATE ON public.blog_authors FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER set_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Indexes
CREATE INDEX idx_blog_posts_slug ON public.blog_posts(slug);
CREATE INDEX idx_blog_posts_status ON public.blog_posts(status);
CREATE INDEX idx_blog_posts_published_at ON public.blog_posts(published_at);
CREATE INDEX idx_blog_posts_category_id ON public.blog_posts(category_id);
CREATE INDEX idx_blog_posts_author_id ON public.blog_posts(author_id);
CREATE INDEX idx_blog_categories_slug ON public.blog_categories(slug);
CREATE INDEX idx_blog_tags_slug ON public.blog_tags(slug);

-- Storage bucket for blog media
INSERT INTO storage.buckets (id, name, public) VALUES ('blog-media', 'blog-media', true);

CREATE POLICY "Anyone can view blog media files" ON storage.objects FOR SELECT USING (bucket_id = 'blog-media');
CREATE POLICY "Founder can upload blog media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'blog-media' AND (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can update blog media files" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'blog-media' AND (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
CREATE POLICY "Founder can delete blog media files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'blog-media' AND (auth.jwt() ->> 'email') = 'thiago@thiagoanalytics.com.br');
