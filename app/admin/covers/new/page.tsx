import { CoverForm } from '@/components/admin/cover-form'

export default function NewCoverPage() {
  return (
    <div>
      <h1 className="text-xl font-bold">新增翻唱</h1>
      <p className="text-muted-foreground mb-4 text-sm">填寫資訊，至少要有一個平台連結。</p>
      <CoverForm />
    </div>
  )
}
