// Use static property access for NEXT_PUBLIC_* vars so Turbopack/webpack
// can inline them in the browser bundle (dynamic process.env[key] is not replaced).
function required(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Missing env: ${name}`)
  return value
}

export const env = {
  SUPABASE_URL: required(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: required(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ),
}

export const ADMIN_EMAILS = (process.env.ADMIN_EMAIL_ALLOWLIST ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
