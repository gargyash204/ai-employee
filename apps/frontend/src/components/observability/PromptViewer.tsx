type PromptViewerProps = {
  prompt: string | null | undefined
}

export function PromptViewer({ prompt }: PromptViewerProps) {
  if (!prompt) {
    return <p className="text-sm text-muted-foreground">Prompt unavailable</p>
  }

  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
      {prompt}
    </pre>
  )
}
