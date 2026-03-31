
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS intencao_cliente numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS capacidade_percebida numeric DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS firmeza_compromisso numeric DEFAULT NULL;

COMMENT ON COLUMN public.analyses.intencao_cliente IS 'Índice de intenção do cliente (0-100). Peso 0.40 na chance_pagamento.';
COMMENT ON COLUMN public.analyses.capacidade_percebida IS 'Índice de capacidade percebida de pagamento (0-100). Peso 0.35 na chance_pagamento.';
COMMENT ON COLUMN public.analyses.firmeza_compromisso IS 'Índice de firmeza do compromisso assumido (0-100). Peso 0.25 na chance_pagamento.';
