-- Thebrooklynn: set the Corte service duration to one hour.
-- Run this migration in the Supabase SQL Editor if migrations are not deployed automatically.
UPDATE public.services
SET duration_minutes = 60
WHERE lower(trim(name)) = 'corte'
  AND barbershop_id = '836d4853-d45e-44cb-9b87-14b88fc0fe48';