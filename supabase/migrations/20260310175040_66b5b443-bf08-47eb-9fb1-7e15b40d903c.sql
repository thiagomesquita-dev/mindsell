
-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'supervisor', 'gestor');

-- Companies table
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_empresa TEXT NOT NULL,
  plano TEXT NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  nome TEXT NOT NULL DEFAULT '',
  empresa_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- User roles table (separate from profiles per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to get user's empresa_id
CREATE OR REPLACE FUNCTION public.get_user_empresa_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT empresa_id FROM public.profiles WHERE id = _user_id
$$;

-- Analyses table
CREATE TABLE public.analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  empresa_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  operador TEXT NOT NULL,
  carteira TEXT NOT NULL,
  canal TEXT NOT NULL,
  transcricao TEXT,
  audio_urls TEXT[] DEFAULT '{}',
  resumo TEXT,
  pontos_fortes TEXT[] DEFAULT '{}',
  pontos_melhorar TEXT[] DEFAULT '{}',
  sugestoes TEXT[] DEFAULT '{}',
  aida_atencao JSONB,
  aida_interesse JSONB,
  aida_desejo JSONB,
  aida_acao JSONB,
  tecnica_usada TEXT,
  objecao TEXT,
  tom_operador TEXT,
  risco_quebra NUMERIC,
  chance_pagamento NUMERIC,
  erro_principal TEXT,
  nota_qa NUMERIC,
  nivel_habilidade TEXT,
  mensagem_ideal TEXT,
  conformidade TEXT,
  score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Companies: users can see their own company
CREATE POLICY "Users can view own company"
ON public.companies FOR SELECT TO authenticated
USING (id = public.get_user_empresa_id(auth.uid()));

-- Profiles: users can view/update own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (id = auth.uid());

CREATE POLICY "Users can insert own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (id = auth.uid());

-- User roles: users can view own roles
CREATE POLICY "Users can view own roles"
ON public.user_roles FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Analyses: users can only see analyses from their company
CREATE POLICY "Users can view company analyses"
ON public.analyses FOR SELECT TO authenticated
USING (empresa_id = public.get_user_empresa_id(auth.uid()));

CREATE POLICY "Users can insert analyses"
ON public.analyses FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid() 
  AND empresa_id = public.get_user_empresa_id(auth.uid())
);

CREATE POLICY "Users can update own analyses"
ON public.analyses FOR UPDATE TO authenticated
USING (user_id = auth.uid());

-- Admins/supervisors can view all company profiles
CREATE POLICY "Admins can view company profiles"
ON public.profiles FOR SELECT TO authenticated
USING (
  empresa_id = public.get_user_empresa_id(auth.uid())
);

-- Trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, nome)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'nome', '')
  );
  -- Default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'supervisor');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for audios
INSERT INTO storage.buckets (id, name, public)
VALUES ('audios', 'audios', false);

-- Storage RLS policies
CREATE POLICY "Authenticated users can upload audios"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'audios');

CREATE POLICY "Users can view own audios"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'audios');
