import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { EvaluationCase } from '@/services/evaluation.service'

type TestCaseEditorProps = {
  initial?: EvaluationCase | null
  saving: boolean
  onCancel: () => void
  onSave: (input: {
    name: string
    question: string
    expectedAnswer: string
    tags: string[]
  }) => Promise<void>
}

export function TestCaseEditor({
  initial = null,
  saving,
  onCancel,
  onSave,
}: TestCaseEditorProps) {
  const [name, setName] = useState(initial?.name ?? '')
  const [question, setQuestion] = useState(initial?.question ?? '')
  const [expectedAnswer, setExpectedAnswer] = useState(
    initial?.expectedAnswer ?? '',
  )
  const [tags, setTags] = useState((initial?.tags ?? []).join(', '))

  return (
    <form
      className="space-y-3 rounded-md border p-4"
      onSubmit={(event) => {
        event.preventDefault()
        void onSave({
          name: name.trim(),
          question: question.trim(),
          expectedAnswer: expectedAnswer.trim(),
          tags: tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        })
      }}
    >
      <div className="space-y-2">
        <Label htmlFor="case-name">Name</Label>
        <Input
          id="case-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="case-question">Question</Label>
        <Input
          id="case-question"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="case-expected">Expected Answer</Label>
        <Textarea
          id="case-expected"
          value={expectedAnswer}
          onChange={(event) => setExpectedAnswer(event.target.value)}
          rows={3}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="case-tags">Tags (comma-separated)</Label>
        <Input
          id="case-tags"
          value={tags}
          onChange={(event) => setTags(event.target.value)}
        />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? 'Saving…' : initial ? 'Update Case' : 'Create Case'}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={saving}
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </form>
  )
}
