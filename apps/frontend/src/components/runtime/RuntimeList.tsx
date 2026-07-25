import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuSkeleton,
} from '@/components/ui/sidebar'
import type { Runtime } from '@/services/runtime.service'
import { RuntimeItem } from './RuntimeItem'

type RuntimeListProps = {
  runtimes: Runtime[]
  loading: boolean
}

export function RuntimeList({ runtimes, loading }: RuntimeListProps) {
  if (loading) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
            <SidebarMenuSkeleton />
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  if (runtimes.length === 0) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            No runtimes yet
          </p>
        </SidebarGroupContent>
      </SidebarGroup>
    )
  }

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu>
          {runtimes.map((runtime) => (
            <RuntimeItem key={runtime.id} runtime={runtime} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}
