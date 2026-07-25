import { Plus } from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import type { Runtime } from '@/services/runtime.service'
import { RuntimeList } from './RuntimeList'

type RuntimeSidebarProps = {
  runtimes: Runtime[]
  loading: boolean
  onCreateClick: () => void
}

export function RuntimeSidebar({
  runtimes,
  loading,
  onCreateClick,
}: RuntimeSidebarProps) {
  return (
    <Sidebar
      collapsible="icon"
      className="top-14 h-[calc(100svh-3.5rem)]"
    >
      <SidebarHeader className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              tooltip="New Runtime"
              variant="outline"
              onClick={onCreateClick}
            >
              <Plus />
              <span>New Runtime</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarSeparator className="mx-0" />
      <SidebarContent>
        <RuntimeList runtimes={runtimes} loading={loading} />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  )
}
