import type { NextConfig } from 'next'

// 全站安全標頭。這些都是「不會改變頁面渲染」的 hardening 標頭，可安全套用。
// 註：這裡刻意不設 Content-Security-Policy——本站嵌入 YouTube / Spotify iframe、
// 載入 Vercel Analytics、GSAP、Supabase，CSP 設錯會讓這些外部資源被擋而破圖。
// 要加 CSP 時請參考 node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md，
// 並在部署後逐一實測每個嵌入與動畫仍正常。
const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
]

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
}

export default nextConfig
