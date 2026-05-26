import { LoginForm } from './login-form'

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-bold">登入後台</h1>
          <p className="text-muted-foreground text-sm">只有作者本人能進入</p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
