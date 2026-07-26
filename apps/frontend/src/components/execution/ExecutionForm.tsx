import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

type ExecutionFormProps = {
  document: string
  disabled?: boolean
  submitting?: boolean
  onDocumentChange: (value: string) => void
  onSubmit: () => void
}

export function ExecutionForm({
  document,
  disabled,
  submitting,
  onDocumentChange,
  onSubmit,
}: ExecutionFormProps) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Execute Document</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Queues a job against the active Published runtime version. Execution
          runs in the background and can take a few minutes.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="execution-document">Document</Label>
        <Textarea
          id="execution-document"
          value={document}
          disabled={disabled || submitting}
          placeholder="Paste document"
          className="min-h-36"
          onChange={(event) => onDocumentChange(event.target.value)}
        />
      </div>

      <Button
        type="button"
        disabled={disabled || submitting || !document.trim()}
        onClick={onSubmit}
      >
        {submitting ? 'Queuing…' : 'Execute'}
      </Button>
    </div>
  )
}
