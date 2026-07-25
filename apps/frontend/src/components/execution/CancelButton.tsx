import { Button } from '@/components/ui/button'

type CancelButtonProps = {
  disabled?: boolean
  loading?: boolean
  onClick: () => void
}

export function CancelButton({
  disabled,
  loading,
  onClick,
}: CancelButtonProps) {
  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? 'Cancelling…' : 'Cancel'}
    </Button>
  )
}
