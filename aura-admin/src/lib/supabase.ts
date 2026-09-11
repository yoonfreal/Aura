import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Cookie-backed client so the session is readable by middleware, not just the browser.
export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);
