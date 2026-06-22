import { describe, it, expect } from 'vitest'
import { paginationRange } from '@/lib/pagination'

describe('paginationRange', () => {
  it('頁數少（≤7）時全部列出，不出現省略號', () => {
    expect(paginationRange(1, 1)).toEqual([1])
    expect(paginationRange(3, 5)).toEqual([1, 2, 3, 4, 5])
    expect(paginationRange(4, 7)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('目前在最前面：右側收成省略號', () => {
    expect(paginationRange(1, 12)).toEqual([1, 2, 3, 4, 5, '…', 12])
    expect(paginationRange(2, 12)).toEqual([1, 2, 3, 4, 5, '…', 12])
  })

  it('目前在中間：兩側都收省略號', () => {
    expect(paginationRange(6, 12)).toEqual([1, '…', 5, 6, 7, '…', 12])
  })

  it('目前在最後面：左側收成省略號', () => {
    expect(paginationRange(12, 12)).toEqual([1, '…', 8, 9, 10, 11, 12])
    expect(paginationRange(11, 12)).toEqual([1, '…', 8, 9, 10, 11, 12])
  })
})
