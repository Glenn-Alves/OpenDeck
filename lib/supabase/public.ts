import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// A plain, cookie-free client for public reads only (no user session).
// Using this instead of the cookie-based server client lets Next.js
// cache the data it returns, since it doesn't depend on per-visitor state.
export function createPublicClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}