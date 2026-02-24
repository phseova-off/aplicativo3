// Alias for src/server/db/client.ts — the canonical Supabase client factory.
// Import from here or from '@/server/db/client'; both are equivalent.
export {
  createSupabaseBrowserClient,
  createSupabaseServerClient,
  createSupabaseServiceClient,
} from './client'
