import { createClient } from "@supabase/supabase-js";

const EXTERNAL_NOTIFICATIONS_URL = import.meta.env.VITE_EXTERNAL_NOTIFICATIONS_URL;
const EXTERNAL_NOTIFICATIONS_PUBLISHABLE_KEY =
  import.meta.env.VITE_EXTERNAL_NOTIFICATIONS_PUBLISHABLE_KEY;

export const externalNotifications = createClient(
  EXTERNAL_NOTIFICATIONS_URL,
  EXTERNAL_NOTIFICATIONS_PUBLISHABLE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  },
);