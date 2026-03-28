import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as
  | string
  | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "[Wrex] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. " +
      "Auth features will be disabled.",
  );
}

// Export a client even if vars are missing so imports don't crash.
// Auth calls will fail gracefully through the hook layer.
export const supabase = createClient(
  supabaseUrl ?? "https://placeholder.supabase.co",
  supabaseAnonKey ?? "placeholder",
);

