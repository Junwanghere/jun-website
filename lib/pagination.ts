// 算出數字分頁要顯示哪些頁碼，缺口以 '…' 表示。
// 規則：永遠顯示第 1 頁與最後一頁、目前頁 ±1；頁數 ≤7 時全部列出。
export function paginationRange(current: number, totalPages: number): (number | '…')[] {
  const SIBLINGS = 1
  // 第 1、最後、current、current±1、兩個省略號 → 最多 7 個位置；≤7 直接全列
  const total = SIBLINGS * 2 + 5
  if (totalPages <= total) {
    return range(1, totalPages)
  }

  const left = Math.max(current - SIBLINGS, 1)
  const right = Math.min(current + SIBLINGS, totalPages)
  const showLeftDots = left > 2
  const showRightDots = right < totalPages - 1

  if (!showLeftDots && showRightDots) {
    return [...range(1, 3 + 2 * SIBLINGS), '…', totalPages]
  }
  if (showLeftDots && !showRightDots) {
    return [1, '…', ...range(totalPages - (2 + 2 * SIBLINGS), totalPages)]
  }
  return [1, '…', ...range(left, right), '…', totalPages]
}

function range(start: number, end: number): number[] {
  const out: number[] = []
  for (let i = start; i <= end; i++) out.push(i)
  return out
}
