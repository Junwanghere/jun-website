// 是否偏好減少動態。純函式（非 hook），在 effect / 事件處理內同步呼叫，
// 避免與 useLayoutEffect 的執行順序問題。SSR 安全（無 window 時回傳 false）。
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
