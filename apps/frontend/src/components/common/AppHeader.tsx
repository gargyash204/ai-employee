import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { logout } from '@/services/auth.service'

type AppHeaderProps = {
  onLogout: () => void
}

export function AppHeader({ onLogout }: AppHeaderProps) {
  const [loggingOut, setLoggingOut] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    try {
      await logout()
    } catch {
      // Clear local auth state even if the request fails.
    } finally {
      onLogout()
      setLoggingOut(false)
    }
  }

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b px-4">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
          Z
        </div>
        <div>
          <p className="text-sm font-semibold tracking-tight">Zamp</p>
          <p className="text-xs text-muted-foreground">AI Runtime</p>
        </div>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => void handleLogout()}
        disabled={loggingOut}
      >
        {loggingOut ? 'Signing out…' : 'Logout'}
      </Button>
    </header>
  )
}
