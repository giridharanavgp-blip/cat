import { createClient } from "@supabase/supabase-js";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isConfigured = rawUrl && rawUrl !== "https://your-project.supabase.co" && rawKey && rawKey !== "your_supabase_anon_key_here";

if (!isConfigured) {
  console.warn(
    "Supabase env vars are missing or placeholder. Update VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in frontend/.env with your Supabase credentials."
  );
}

const supabaseUrl = isConfigured ? rawUrl : "https://placeholder.supabase.co";
const supabaseAnonKey = isConfigured ? rawKey : "placeholder-key";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

