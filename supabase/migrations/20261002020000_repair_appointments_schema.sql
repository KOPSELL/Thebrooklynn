-- Repair the production appointments table created with an incompatible legacy schema.
-- Production currently has zero appointments, so it is safe to rebuild this table.

DROP TABLE IF EXISTS public.appointments;

CREATE TABLE public.appointments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  barber_id UUID NOT NULL REFERENCES public.barbers(id),
  service_id UUID NOT NULL REFERENCES public.services(id),
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view appointments"
ON public.appointments
FOR SELECT
USING (true);

CREATE POLICY "Anyone can create appointments"
ON public.appointments
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Anyone can update appointments"
ON public.appointments
FOR UPDATE
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete appointments"
ON public.appointments
FOR DELETE
USING (true);
