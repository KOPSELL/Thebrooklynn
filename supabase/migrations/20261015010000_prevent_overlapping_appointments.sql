-- Prevent overlapping active appointments for the same barber, shop, and date.
-- This trigger is scoped to the booking row's own barbershop and does not modify existing appointments.
CREATE OR REPLACE FUNCTION public.prevent_overlapping_barbershop_appointments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_service_name text;
  new_service_duration integer;
  new_start integer;
  new_end integer;
BEGIN
  IF lower(trim(coalesce(NEW.status::text, ''))) IN ('cancelled', 'canceled', 'cancelado', 'cancelada') THEN
    RETURN NEW;
  END IF;

  -- Serialize booking attempts for the same shop/barber/day so simultaneous requests cannot both pass.
  PERFORM pg_advisory_xact_lock(
    hashtext(coalesce(NEW.barbershop_id::text, '')),
    hashtext(NEW.barber_id::text || ':' || NEW.appointment_date::text)
  );

  SELECT lower(trim(s.name)), s.duration_minutes
    INTO new_service_name, new_service_duration
  FROM public.services s
  WHERE s.id = NEW.service_id;

  IF NOT FOUND THEN
    new_service_duration := 30;
  END IF;

  IF new_service_name = 'corte' THEN
    new_service_duration := 60;
  ELSE
    new_service_duration := coalesce(new_service_duration, 30);
  END IF;

  new_start := extract(hour FROM NEW.appointment_time)::integer * 60
             + extract(minute FROM NEW.appointment_time)::integer;
  new_end := new_start + new_service_duration;

  IF EXISTS (
    SELECT 1
    FROM public.appointments a
    LEFT JOIN public.services s ON s.id = a.service_id
    WHERE a.barbershop_id IS NOT DISTINCT FROM NEW.barbershop_id
      AND a.barber_id = NEW.barber_id
      AND a.appointment_date = NEW.appointment_date
      AND a.id IS DISTINCT FROM NEW.id
      AND lower(trim(coalesce(a.status::text, ''))) NOT IN ('cancelled', 'canceled', 'cancelado', 'cancelada')
      AND new_start < (
        extract(hour FROM a.appointment_time)::integer * 60
        + extract(minute FROM a.appointment_time)::integer
        + CASE
            WHEN lower(trim(coalesce(s.name, ''))) = 'corte' THEN 60
            ELSE coalesce(s.duration_minutes, 30)
          END
      )
      AND (
        extract(hour FROM a.appointment_time)::integer * 60
        + extract(minute FROM a.appointment_time)::integer
      ) < new_end
  ) THEN
    RAISE EXCEPTION 'HORARIO_JA_OCUPADO'
      USING ERRCODE = '23P01';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prevent_overlapping_barbershop_appointments
  ON public.appointments;

CREATE TRIGGER prevent_overlapping_barbershop_appointments
BEFORE INSERT OR UPDATE ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.prevent_overlapping_barbershop_appointments();
