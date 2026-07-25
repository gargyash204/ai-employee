import { useEffect, useState, type ReactNode } from 'react'
import { AppHeader } from '@/components/common/AppHeader'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { RuntimeSidebar } from '@/components/runtime/RuntimeSidebar'
import type { Runtime } from '@/services/runtime.service'

const SIDEBAR_SESSION_KEY = 'zamp_sidebar_open'

type DashboardLayoutProps = {
  runtimes: Runtime[]
  listLoading: boolean
  onLogout: () => void
  onCreateClick: () => void
  children: ReactNode
}

function readSidebarOpen(): boolean {
  const stored = sessionStorage.getItem(SIDEBAR_SESSION_KEY)
  if (stored === null) {
    return true
  }
  return stored === 'true'
}

export function DashboardLayout({
  runtimes,
  listLoading,
  onLogout,
  onCreateClick,
  children,
}: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(readSidebarOpen)

  useEffect(() => {
    sessionStorage.setItem(SIDEBAR_SESSION_KEY, String(sidebarOpen))
  }, [sidebarOpen])

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <AppHeader onLogout={onLogout} />
      <SidebarProvider
        className="min-h-0 flex-1 !min-h-0"
        open={sidebarOpen}
        onOpenChange={setSidebarOpen}
      >
        <RuntimeSidebar
          runtimes={runtimes}
          loading={listLoading}
          onCreateClick={onCreateClick}
        />
        <SidebarInset className="min-h-0 overflow-auto">
          <div className="flex h-10 items-center gap-2 border-b px-3">
            <SidebarTrigger />
            <span className="text-sm text-muted-foreground">Runtimes</span>
          </div>
          {children}
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}
