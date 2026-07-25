import { Button } from '@/components/ui/button'

type RunButtonProps = {
  loading: boolean
  disabled?: boolean
  onClick: () => void
}

export function RunButton({ loading, disabled = false, onClick }: RunButtonProps) {
  return (
    <Button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? 'Running…' : 'Run Experiment'}
    </Button>
  )
}
