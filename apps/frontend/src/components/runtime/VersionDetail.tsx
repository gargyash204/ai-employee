import { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  publishRuntimeDraft,
  updateRuntimeDraft,
  type RuntimeVersion,
} from '@/services/runtime-version.service'
import { VersionStatusBadge } from './VersionStatusBadge'

type VersionDetailProps = {
  runtimeId: string
  version: RuntimeVersion
  onChanged: () => Promise<void>
}

const INSTRUCTIONS_MAX = 5000

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
    if (Array.isArray(message) && message.length > 0) {
      return String(message[0])
    }
  }
  return fallback
}

export function VersionDetail({
  runtimeId,
  version,
  onChanged,
}: VersionDetailProps) {
  const isDraft = version.status === 'Draft'
  const [instructions, setInstructions] = useState(version.instructions)
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  useEffect(() => {
    setInstructions(version.instructions)
    setError(null)
    setSuccessMessage(null)
  }, [version.id, version.instructions])

  useEffect(() => {
    if (!successMessage) {
      return
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage(null)
    }, 3000)

    return () => {
      window.clearTimeout(timer)
    }
  }, [successMessage])

  async function handleSave() {
    if (instructions.length > INSTRUCTIONS_MAX) {
      setError(`Instructions must be at most ${INSTRUCTIONS_MAX} characters`)
      return
    }

    setSaving(true)
    setError(null)

    try {
      await updateRuntimeDraft(runtimeId, instructions)
      setSuccessMessage('Draft saved')
      await onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to save draft'))
    } finally {
      setSaving(false)
    }
  }

  async function handlePublish() {
    if (instructions.length > INSTRUCTIONS_MAX) {
      setError(`Instructions must be at most ${INSTRUCTIONS_MAX} characters`)
      return
    }

    setPublishing(true)
    setError(null)

    try {
      await updateRuntimeDraft(runtimeId, instructions)
      await publishRuntimeDraft(runtimeId)
      setSuccessMessage('Draft published')
      await onChanged()
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to publish draft'))
    } finally {
      setPublishing(false)
    }
  }

  const busy = saving || publishing

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Version {version.version}</h3>
        <VersionStatusBadge status={version.status} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="version-instructions">Instructions</Label>
        <Textarea
          id="version-instructions"
          value={instructions}
          disabled={!isDraft || busy}
          maxLength={INSTRUCTIONS_MAX}
          rows={10}
          placeholder="Describe what this Runtime should do…"
          onChange={(event) => setInstructions(event.target.value)}
        />
        {!isDraft ? (
          <p className="text-xs text-muted-foreground">
            {version.status} versions are read-only.
          </p>
        ) : null}
      </div>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {isDraft ? (
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => void handleSave()}
          >
            {saving ? 'Saving…' : 'Save Draft'}
          </Button>
          <Button
            type="button"
            disabled={busy}
            onClick={() => void handlePublish()}
          >
            {publishing ? 'Publishing…' : 'Publish'}
          </Button>
        </div>
      ) : null}

      {successMessage ? (
        <div
          className="fixed bottom-4 right-4 z-50 rounded-md border bg-background px-4 py-3 text-sm shadow-md"
          role="status"
        >
          {successMessage}
        </div>
      ) : null}
    </div>
  )
}
