import { useRef, useState } from 'react'
import { Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toastError } from '@/hooks/use-toast'
import { validatePdfFile } from '@/components/execution/pdf-upload'
import { PdfUploadZone } from './PdfUploadZone'

type ExecutionFormProps = {
  file: File | null
  canUpload: boolean
  submitting?: boolean
  onFileChange: (file: File | null) => void
  onSubmit: () => void
  onGoToVersions?: () => void
}

const PUBLISH_REQUIRED_MESSAGE =
  'Publish a runtime version before uploading documents for production executions.'
const SELECT_FILE_MESSAGE = 'Select a PDF file to execute'

export function ExecutionForm({
  file,
  canUpload,
  submitting,
  onFileChange,
  onSubmit,
  onGoToVersions,
}: ExecutionFormProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [hintPulse, setHintPulse] = useState(false)

  const busy = Boolean(submitting)
  const locked = !canUpload

  const flashHint = (message: string) => {
    setValidationError(message)
    setHintPulse(true)
    window.setTimeout(() => setHintPulse(false), 400)
    toastError(message)
  }

  const applyFileList = (fileList: FileList | null) => {
    if (locked) {
      flashHint(PUBLISH_REQUIRED_MESSAGE)
      return
    }

    const result = validatePdfFile(fileList)
    if (!result.ok) {
      setValidationError(result.message)
      onFileChange(null)
      toastError(result.message)
      return
    }

    setValidationError(null)
    onFileChange(result.file)
  }

  const openPicker = () => {
    if (busy) return
    if (locked) {
      flashHint(PUBLISH_REQUIRED_MESSAGE)
      return
    }
    inputRef.current?.click()
  }

  const handleExecuteClick = () => {
    if (busy) return
    if (locked) {
      flashHint(PUBLISH_REQUIRED_MESSAGE)
      return
    }
    if (!file) {
      flashHint(SELECT_FILE_MESSAGE)
      return
    }
    onSubmit()
  }

  return (
    <div className="space-y-4 rounded-lg border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Execute Document</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload a PDF (max 2 MB). Text is extracted first, then the job runs
            against the active Published runtime version.
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center rounded-md px-2.5 py-1 text-xs font-medium',
            canUpload
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-amber-500/10 text-amber-800 dark:text-amber-400',
          )}
        >
          {canUpload ? 'Published version ready' : 'Publish required'}
        </span>
      </div>

      {locked ? (
        <div
          className="flex flex-col gap-3 rounded-md border border-amber-500/30 bg-amber-500/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
          role="status"
        >
          <div className="flex gap-3">
            <Lock className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-400" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Uploads are locked
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Production executions only run against a Published version. Open
                Versions, publish a draft, then return here to upload.
              </p>
            </div>
          </div>
          {onGoToVersions ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 active:scale-[0.98]"
              onClick={onGoToVersions}
            >
              Go to Versions
            </Button>
          ) : null}
        </div>
      ) : (
        <div
          className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-muted-foreground"
          role="status"
        >
          Choose a PDF below, then click Execute to start the production job.
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          applyFileList(event.target.files)
          event.target.value = ''
        }}
      />

      <PdfUploadZone
        file={file}
        locked={locked}
        busy={busy}
        onOpen={openPicker}
      />

      {file && canUpload && !busy ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="active:scale-[0.98]"
            onClick={() => {
              setValidationError(null)
              onFileChange(null)
            }}
          >
            Clear selection
          </Button>
        </div>
      ) : null}

      {validationError ? (
        <p
          className={cn(
            'text-sm text-destructive transition-opacity',
            hintPulse && 'animate-pulse',
          )}
          role="alert"
        >
          {validationError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          aria-disabled={locked || busy || !file}
          className={cn(
            'active:scale-[0.98]',
            (locked || (!file && !busy)) && 'opacity-60',
          )}
          disabled={busy}
          onClick={handleExecuteClick}
        >
          {busy ? 'Uploading…' : locked ? 'Execute (locked)' : 'Execute'}
        </Button>
        <p className="text-sm text-muted-foreground">
          {locked
            ? 'Blocked until a version is published'
            : !file
              ? 'Choose a PDF to enable execution'
              : busy
                ? 'Uploading and starting the job…'
                : 'Ready to run against the published version'}
        </p>
      </div>
    </div>
  )
}
