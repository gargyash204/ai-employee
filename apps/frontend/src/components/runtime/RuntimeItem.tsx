import { NavLink, useParams } from 'react-router-dom'
import { SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar'
import type { Runtime } from '@/services/runtime.service'

type RuntimeItemProps = {
  runtime: Runtime
}

export function RuntimeItem({ runtime }: RuntimeItemProps) {
  const { runtimeId } = useParams<{ runtimeId?: string }>()
  const isActive = runtimeId === runtime.id

  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild isActive={isActive} tooltip={runtime.name}>
        <NavLink to={`/dashboard/runtime/${runtime.id}`}>
          <span className="truncate">{runtime.name}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}
