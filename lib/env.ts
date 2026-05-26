const required = (name: string): string => {
  const v = process.env[name]
  if (!v) throw new Error(`Missing env: ${name}`)
  return v
}

export const env = {
  SUPABASE_URL: required('NEXT_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
}

export const ADMIN_EMAILS = (process.env.ADMIN_EMAIL_ALLOWLIST ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean)
