-- Atualiza o catálogo de serviços da The Brooklyn Barbearia.
-- Execute esta migration no Supabase do projeto feloxrkstqptipfxrmkf.

UPDATE public.services SET price = 35 WHERE lower(trim(name)) = 'corte';
UPDATE public.services SET price = 35 WHERE lower(trim(name)) = 'barba';
UPDATE public.services SET price = 70, name = 'Corte + barba + sobrancelha'
WHERE lower(trim(name)) IN ('corte + barba', 'corte + barba + sobrancelha');
UPDATE public.services SET price = 30 WHERE lower(trim(name)) = 'pigmentação';

INSERT INTO public.services (name, price, duration_minutes)
SELECT v.name, v.price, v.duration_minutes
FROM (VALUES
  ('Cavanhaque', 25, 20),
  ('Rapar', 25, 20),
  ('Sobrancelha', 10, 10),
  ('Acabamento', 10, 10),
  ('Pigmentação', 30, 20),
  ('Corte + barba + sobrancelha', 70, 60)
) AS v(name, price, duration_minutes)
WHERE NOT EXISTS (
  SELECT 1 FROM public.services s WHERE lower(trim(s.name)) = lower(v.name)
);

-- Ajusta durações padrão dos serviços existentes quando necessário.
UPDATE public.services SET duration_minutes = 30 WHERE lower(trim(name)) = 'corte';
UPDATE public.services SET duration_minutes = 20 WHERE lower(trim(name)) = 'barba';
