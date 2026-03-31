ALTER TABLE public.company_carteiras
  ADD COLUMN comissao_recebida_periodo numeric DEFAULT NULL,
  ADD COLUMN quantidade_pagamentos_periodo integer DEFAULT NULL,
  ADD COLUMN periodo_referencia text DEFAULT NULL;