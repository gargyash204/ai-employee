import { Label } from '@/components/ui/label'

type ComparisonToggleProps = {
  enabled: boolean
  onChange: (enabled: boolean) => void
  disabled?: boolean
}

export function ComparisonToggle({
  enabled,
  onChange,
  disabled = false,
}: ComparisonToggleProps) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        className="size-4 rounded border border-input"
        checked={enabled}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className="text-muted-foreground">
        Compare with Version B (optional)
      </span>
      <Label className="sr-only">Enable version comparison</Label>
    </label>
  )
}
