import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { Runtime } from '@/services/runtime.service'

type RuntimeFormDialogProps = {
  open: boolean
  mode: 'create' | 'edit'
  initialValues?: Pick<Runtime, 'name' | 'description'> | null
  submitting: boolean
  error: string | null
  onOpenChange: (open: boolean) => void
  onSubmit: (values: { name: string; description: string }) => Promise<void>
}

export function RuntimeFormDialog({
  open,
  mode,
  initialValues,
  submitting,
  error,
  onOpenChange,
  onSubmit,
}: RuntimeFormDialogProps) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!open) {
      return
    }

    setName(initialValues?.name ?? '')
    setDescription(initialValues?.description ?? '')
  }, [open, initialValues])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create Runtime' : 'Edit Runtime'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Add a new runtime to your workspace.'
              : 'Update the selected runtime.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="runtime-name">Name</Label>
            <Input
              id="runtime-name"
              value={name}
              maxLength={100}
              required
              disabled={submitting}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="runtime-description">Description</Label>
            <Textarea
              id="runtime-description"
              value={description}
              maxLength={500}
              disabled={submitting}
              onChange={(event) => setDescription(event.target.value)}
            />
          </div>

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
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting
                ? mode === 'create'
                  ? 'Creating…'
                  : 'Saving…'
                : mode === 'create'
                  ? 'Create'
                  : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
