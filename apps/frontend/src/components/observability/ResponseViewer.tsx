type ResponseViewerProps = {
  response: string | null | undefined
}

export function ResponseViewer({ response }: ResponseViewerProps) {
  if (!response) {
    return (
      <p className="text-sm text-muted-foreground">Response unavailable</p>
    )
  }

  return (
    <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-md bg-muted p-3 text-xs">
      {response}
    </pre>
  )
}
