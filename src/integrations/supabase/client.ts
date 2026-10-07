import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";
import { brokeredPreviewStorage } from "./previewAuthStorage";

const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://feloxrkstqptipfxrmkf.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_h2TgIb-kj3PvmWFR7H1f-Q_zw-MydM5";

export const supabase = createClient<Database>(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
  {
    auth: {
      storage: brokeredPreviewStorage(),
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
