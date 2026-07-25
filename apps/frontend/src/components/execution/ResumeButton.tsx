import { Button } from '@/components/ui/button'

type ResumeButtonProps = {
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}

export function ResumeButton({
  disabled,
  loading,
  onClick,
}: ResumeButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? 'Resuming…' : 'Resume'}
    </Button>
  )
}
