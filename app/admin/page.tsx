import { PortalCard } from '@/components/portal-card'

export default function AdminHome() {
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">後台首頁</h1>
      <p className="text-sm text-muted-foreground">管理你的內容</p>
      <div className="mt-3 flex flex-col gap-3">
        <PortalCard
          href="/admin/covers"
          label="COVERS"
          title="翻唱管理"
          description="新增 ／ 編輯 ／ 刪除"
          featured
        />
      </div>
    </div>
  )
}
