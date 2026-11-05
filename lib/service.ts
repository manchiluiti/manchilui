import "server-only";
import { createClient } from "@supabase/supabase-js";

/** Server-only Supabase client with the service role (bypasses row level security). Never send it to the browser. */
export function serviceClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing in Vercel's environment variables.");
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
