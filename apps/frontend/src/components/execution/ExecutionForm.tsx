import { useId, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  formatFileSize,
  validatePdfFile,
} from '@/components/execution/pdf-upload'

type ExecutionFormProps = {
  file: File | null
  disabled?: boolean
  submitting?: boolean
  onFileChange: (file: File | null) => void
  onSubmit: () => void
}

export function ExecutionForm({
  file,
  disabled,
  submitting,
  onFileChange,
  onSubmit,
}: ExecutionFormProps) {
  const inputId = useId()
  const [validationError, setValidationError] = useState<string | null>(null)

  const handleFileInput = (fileList: FileList | null) => {
    const result = validatePdfFile(fileList)
    if (!result.ok) {
      setValidationError(result.message)
      onFileChange(null)
      return
    }
    setValidationError(null)
    onFileChange(result.file)
  }

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Execute Document</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a PDF (max 2 MB). Text is extracted first, then the job runs
          against the active Published runtime version.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor={inputId}>PDF document</Label>
        <input
          id={inputId}
          type="file"
          accept="application/pdf,.pdf"
          disabled={disabled || submitting}
          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground hover:file:bg-secondary/80"
          onChange={(event) => {
            handleFileInput(event.target.files)
            event.target.value = ''
          }}
        />
        {file ? (
          <p className="text-sm text-foreground">
            Selected: {file.name} ({formatFileSize(file.size)})
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">No file selected</p>
        )}
        {validationError ? (
          <p className="text-sm text-destructive" role="alert">
            {validationError}
          </p>
        ) : null}
      </div>

      <Button
        type="button"
        disabled={disabled || submitting || !file}
        onClick={onSubmit}
      >
        {submitting ? 'Uploading…' : 'Execute'}
      </Button>
    </div>
  )
}
