import { Label } from '@/components/ui/label'
import type { EvaluationDataset } from '@/services/evaluation.service'

type DatasetSelectorProps = {
  id?: string
  label?: string
  datasets: EvaluationDataset[]
  value: string
  onChange: (datasetId: string) => void
  disabled?: boolean
}

export function DatasetSelector({
  id = 'evaluation-dataset',
  label = 'Dataset',
  datasets,
  value,
  onChange,
  disabled = false,
}: DatasetSelectorProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        value={value}
        disabled={disabled || datasets.length === 0}
        onChange={(event) => onChange(event.target.value)}
      >
        {datasets.length === 0 ? (
          <option value="">No datasets yet</option>
        ) : (
          datasets.map((dataset) => (
            <option key={dataset.id} value={dataset.id}>
              {dataset.name}
            </option>
          ))
        )}
      </select>
    </div>
  )
}
