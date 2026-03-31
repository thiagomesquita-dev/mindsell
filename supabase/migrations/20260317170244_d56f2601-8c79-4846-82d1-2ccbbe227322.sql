
ALTER TABLE public.operators
  ADD COLUMN valor_pago_periodo numeric DEFAULT NULL,
  ADD COLUMN periodo_referencia text DEFAULT NULL;
