import type { KeyboardEvent } from 'react'
import { FileText, Lock, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatFileSize } from '@/components/execution/pdf-upload'

type PdfUploadZoneProps = {
  file: File | null
  locked: boolean
  busy: boolean
  onOpen: () => void
}

export function PdfUploadZone({
  file,
  locked,
  busy,
  onOpen,
}: PdfUploadZoneProps) {
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onOpen()
    }
  }

  return (
    <div
      role="button"
      tabIndex={busy ? -1 : 0}
      aria-disabled={locked || busy}
      aria-label={
        locked
          ? 'Upload locked — publish a version first'
          : 'Upload PDF document'
      }
      className={cn(
        'relative flex min-h-[120px] cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-4 py-6 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring',
        locked
          ? 'cursor-not-allowed border-muted-foreground/25 bg-muted/40'
          : 'border-muted-foreground/35 bg-background hover:border-primary/50 hover:bg-muted/30',
        busy && 'pointer-events-none opacity-60',
      )}
      onClick={onOpen}
      onKeyDown={handleKeyDown}
    >
      {locked ? (
        <>
          <Lock className="size-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Upload unavailable
          </p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Publish a version to enable PDF upload.
          </p>
        </>
      ) : file ? (
        <>
          <FileText className="size-7 text-foreground" />
          <p className="text-sm font-medium text-foreground">{file.name}</p>
          <p className="text-sm text-muted-foreground">
            {formatFileSize(file.size)} · click to replace
          </p>
        </>
      ) : (
        <>
          <Upload className="size-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">
            Click to upload PDF
          </p>
          <p className="text-sm text-muted-foreground">
            One file · PDF only · max 2 MB
          </p>
        </>
      )}
    </div>
  )
}
