// 網站層級的共用常數。接自訂網域時設 NEXT_PUBLIC_SITE_URL 即可，不必改碼。
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? 'https://jun-website-chi.vercel.app'
).replace(/\/$/, '')

export const SITE_NAME = 'Jun Wang'
export const AUTHOR_NAME = '王嘉駿'
export const AUTHOR_ALT_NAME = 'Jun Wang'

// 社群主頁（與首頁 SocialButton 一致），給 JSON-LD 的 sameAs 用
export const SOCIAL_LINKS = [
  'https://instagram.com/juniswang',
  'https://www.threads.net/@juniswang',
  'https://www.youtube.com/@junwang0917',
]
