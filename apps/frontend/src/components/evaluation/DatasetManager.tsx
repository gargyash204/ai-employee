import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type {
  EvaluationCase,
  EvaluationDataset,
} from '@/services/evaluation.service'
import { TestCaseEditor } from './TestCaseEditor'

type DatasetManagerProps = {
  datasets: EvaluationDataset[]
  selectedDatasetId: string
  cases: EvaluationCase[]
  creatingDataset: boolean
  savingCase: boolean
  onCreateDataset: (input: {
    name: string
    description?: string
  }) => Promise<void>
  onCreateCase: (input: {
    name: string
    question: string
    expectedAnswer: string
    tags: string[]
  }) => Promise<void>
  onUpdateCase: (
    id: string,
    input: {
      name: string
      question: string
      expectedAnswer: string
      tags: string[]
    },
  ) => Promise<void>
  onDeleteCase: (id: string) => Promise<void>
}

export function DatasetManager({
  datasets,
  selectedDatasetId,
  cases,
  creatingDataset,
  savingCase,
  onCreateDataset,
  onCreateCase,
  onUpdateCase,
  onDeleteCase,
}: DatasetManagerProps) {
  const [showDatasetForm, setShowDatasetForm] = useState(false)
  const [datasetName, setDatasetName] = useState('')
  const [datasetDescription, setDatasetDescription] = useState('')
  const [editingCase, setEditingCase] = useState<EvaluationCase | null>(null)
  const [creatingCase, setCreatingCase] = useState(false)

  const selectedDataset = datasets.find(
    (dataset) => dataset.id === selectedDatasetId,
  )

  return (
    <div className="space-y-4 rounded-md border p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Dataset Manager</h3>
          <p className="text-sm text-muted-foreground">
            {selectedDataset
              ? `${selectedDataset.name} · ${cases.length} case${cases.length === 1 ? '' : 's'}`
              : 'Create a dataset to store evaluation test cases.'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowDatasetForm((value) => !value)}
          >
            New Dataset
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!selectedDatasetId}
            onClick={() => {
              setCreatingCase(true)
              setEditingCase(null)
            }}
          >
            New Case
          </Button>
        </div>
      </div>

      {showDatasetForm ? (
        <form
          className="space-y-3 rounded-md border p-3"
          onSubmit={(event) => {
            event.preventDefault()
            void onCreateDataset({
              name: datasetName.trim(),
              description: datasetDescription.trim() || undefined,
            }).then(() => {
              setDatasetName('')
              setDatasetDescription('')
              setShowDatasetForm(false)
            })
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="dataset-name">Dataset name</Label>
            <Input
              id="dataset-name"
              value={datasetName}
              onChange={(event) => setDatasetName(event.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dataset-description">Description</Label>
            <Textarea
              id="dataset-description"
              value={datasetDescription}
              onChange={(event) => setDatasetDescription(event.target.value)}
              rows={2}
            />
          </div>
          <Button type="submit" disabled={creatingDataset}>
            {creatingDataset ? 'Creating…' : 'Create Dataset'}
          </Button>
        </form>
      ) : null}

      {creatingCase || editingCase ? (
        <TestCaseEditor
          key={editingCase?.id ?? 'new-case'}
          initial={editingCase}
          saving={savingCase}
          onCancel={() => {
            setCreatingCase(false)
            setEditingCase(null)
          }}
          onSave={async (input) => {
            if (editingCase) {
              await onUpdateCase(editingCase.id, input)
            } else {
              await onCreateCase(input)
            }
            setCreatingCase(false)
            setEditingCase(null)
          }}
        />
      ) : null}

      {cases.length > 0 ? (
        <ul className="divide-y rounded-md border">
          {cases.map((item) => (
            <li
              key={item.id}
              className="flex items-start justify-between gap-3 px-3 py-3 text-sm"
            >
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-muted-foreground">{item.question}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingCase(item)
                    setCreatingCase(false)
                  }}
                >
                  Edit
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    void onDeleteCase(item.id)
                  }}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">
          No test cases in this dataset yet.
        </p>
      )}
    </div>
  )
}
