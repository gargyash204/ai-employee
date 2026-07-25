import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

const DOCUMENT_HINTS = ['Resume', 'Invoice', 'Contract', 'Support Ticket'] as const

type DocumentEditorProps = {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

export function DocumentEditor({
  value,
  onChange,
  disabled = false,
}: DocumentEditorProps) {
  return (
    <div className="space-y-3">
      <Label htmlFor="experiment-document">Document</Label>
      <Textarea
        id="experiment-document"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste any text document"
        className="min-h-48"
      />
      <p className="text-xs text-muted-foreground">
        Examples: {DOCUMENT_HINTS.join(' · ')}
      </p>
    </div>
  )
}
