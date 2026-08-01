import { createClient } from "@supabase/supabase-js";

const DEFAULT_URL = "https://llswaoszvxxypmbcflbp.supabase.co";
const DEFAULT_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxsc3dhb3N6dnh4eXBtYmNmbGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0MjYzNDEsImV4cCI6MjEwMTAwMjM0MX0.P1yDbdLJW1m8r0BjH9B1BMtS9AIEmSvch1Eb0hMh25c";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_URL !== "https://your-project.supabase.co"
  ? import.meta.env.VITE_SUPABASE_URL
  : DEFAULT_URL;

const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY && import.meta.env.VITE_SUPABASE_ANON_KEY !== "your_supabase_anon_key_here"
  ? import.meta.env.VITE_SUPABASE_ANON_KEY
  : DEFAULT_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


