import { z } from 'zod'
import { PLATFORMS } from './types'

export const coverLinkSchema = z
  .object({
    platform: z.enum(PLATFORMS),
    platform_label: z.string().nullable(),
    url: z.string().url('請輸入合法網址'),
  })
  .superRefine((val, ctx) => {
    if (val.platform === 'other' && !val.platform_label?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['platform_label'],
        message: '選「其他」時請填平台名稱',
      })
    }
  })

export const coverFormSchema = z.object({
  title: z.string().min(1, '請填歌名').max(200),
  original_artist: z.string().min(1, '請填原唱').max(200),
  cover_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式須為 YYYY-MM-DD'),
  description: z.string().max(2000).nullable(),
  tags: z.array(z.string().min(1).max(50)).max(20),
  thumbnail_url: z.string().url().nullable(),
  links: z.array(coverLinkSchema).min(1, '至少要有一個平台連結'),
})

export type CoverFormValues = z.infer<typeof coverFormSchema>
