-- Enforce tenant ownership on new appointments and changes to their ownership fields.
-- Existing rows can still have status/price fields updated without revalidating legacy ownership.
-- Apply this SQL migration to the shared Supabase project for database-level isolation.

CREATE OR REPLACE FUNCTION public.enforce_appointment_barbershop_ownership()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  barber_shop_id uuid;
  service_shop_id uuid;
  barber_is_active boolean;
BEGIN
  IF NEW.barbershop_id IS NULL THEN
    RAISE EXCEPTION 'BARBERSHOP_ID_REQUIRED';
  END IF;

  SELECT b.barbershop_id, b.active
    INTO barber_shop_id, barber_is_active
  FROM public.barbers b
  WHERE b.id = NEW.barber_id;

  IF NOT FOUND
     OR barber_shop_id IS DISTINCT FROM NEW.barbershop_id
     OR barber_is_active IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'BARBER_DOES_NOT_BELONG_TO_BARBERSHOP';
  END IF;

  SELECT s.barbershop_id
    INTO service_shop_id
  FROM public.services s
  WHERE s.id = NEW.service_id;

  IF NOT FOUND OR service_shop_id IS DISTINCT FROM NEW.barbershop_id THEN
    RAISE EXCEPTION 'SERVICE_DOES_NOT_BELONG_TO_BARBERSHOP';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_appointment_barbershop_ownership
  ON public.appointments;

CREATE TRIGGER enforce_appointment_barbershop_ownership
BEFORE INSERT OR UPDATE OF barbershop_id, barber_id, service_id
ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION public.enforce_appointment_barbershop_ownership();
