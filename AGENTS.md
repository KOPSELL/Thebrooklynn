# Architecture rules

- Keep appointments and all scheduling reads/writes in Lovable Cloud; use the external Supabase project only for barber push-subscription storage and OneSignal notification delivery, so scheduling remains unaffected by notification availability.