import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { EvaluationResult } from '@/services/evaluation.service'

type EvaluationResultDrawerProps = {
  result: EvaluationResult | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EvaluationResultDrawer({
  result,
  open,
  onOpenChange,
}: EvaluationResultDrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{result?.caseName ?? 'Result'}</SheetTitle>
          <SheetDescription>
            {result?.passed ? 'PASS' : 'FAIL'}
            {result ? ` · ${result.latency} ms` : null}
          </SheetDescription>
        </SheetHeader>

        {result ? (
          <div className="mt-6 space-y-4 text-sm">
            <section className="space-y-1">
              <h4 className="font-medium">Document</h4>
              <pre className="whitespace-pre-wrap rounded-md border bg-muted/40 p-3 font-sans text-sm">
                {result.document || '—'}
              </pre>
            </section>
            <section className="space-y-1">
              <h4 className="font-medium">Question</h4>
              <p className="rounded-md border p-3">{result.question || '—'}</p>
            </section>
            <section className="space-y-1">
              <h4 className="font-medium">Expected Answer</h4>
              <p className="rounded-md border p-3">{result.expectedAnswer}</p>
            </section>
            <section className="space-y-1">
              <h4 className="font-medium">Actual Answer</h4>
              <p className="rounded-md border p-3">
                {result.actualAnswer ?? '—'}
              </p>
            </section>
            <section className="space-y-1">
              <h4 className="font-medium">Status</h4>
              <p
                className={
                  result.passed ? 'text-emerald-700' : 'text-destructive'
                }
              >
                {result.passed ? 'PASS' : 'FAIL'}
              </p>
            </section>
            {result.error ? (
              <section className="space-y-1">
                <h4 className="font-medium">Error</h4>
                <p className="rounded-md border border-destructive/40 p-3 text-destructive">
                  {result.error}
                </p>
              </section>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
