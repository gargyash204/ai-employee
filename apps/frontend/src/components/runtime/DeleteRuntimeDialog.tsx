import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Runtime } from '@/services/runtime.service'

type DeleteRuntimeDialogProps = {
  open: boolean
  runtime: Runtime | null
  submitting: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<void>
}

export function DeleteRuntimeDialog({
  open,
  runtime,
  submitting,
  error,
  onOpenChange,
  onConfirm,
}: DeleteRuntimeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Delete Runtime</DialogTitle>
          <DialogDescription>
            {runtime
              ? `Delete “${runtime.name}”? This cannot be undone.`
              : 'Delete this runtime? This cannot be undone.'}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={submitting}
            onClick={() => void onConfirm()}
          >
            {submitting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
