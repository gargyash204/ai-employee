import { Button } from '@/components/ui/button'

type RunEvaluationButtonProps = {
  loading: boolean
  disabled?: boolean
  onClick: () => void
}

export function RunEvaluationButton({
  loading,
  disabled = false,
  onClick,
}: RunEvaluationButtonProps) {
  return (
    <Button
      type="button"
      disabled={disabled || loading}
      onClick={onClick}
    >
      {loading ? 'Running evaluation…' : 'Run Evaluation'}
    </Button>
  )
}
