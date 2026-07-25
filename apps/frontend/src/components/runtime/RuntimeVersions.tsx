import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  listRuntimeVersions,
  updateRuntimeDraft,
  type RuntimeVersion,
} from '@/services/runtime-version.service'
import { VersionCard } from './VersionCard'
import { VersionDetail } from './VersionDetail'

type RuntimeVersionsProps = {
  runtimeId: string
}

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.length > 0) {
      return message
    }
    if (Array.isArray(message) && message.length > 0) {
      return String(message[0])
    }
  }
  return fallback
}

export function RuntimeVersions({ runtimeId }: RuntimeVersionsProps) {
  const [versions, setVersions] = useState<RuntimeVersion[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [creatingDraft, setCreatingDraft] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadVersions = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const data = await listRuntimeVersions(runtimeId)
      setVersions(data)

      setSelectedId((current) => {
        if (current && data.some((version) => version.id === current)) {
          return current
        }

        const draft = data.find((version) => version.status === 'Draft')
        if (draft) {
          return draft.id
        }

        const published = data.find((version) => version.status === 'Published')
        return published?.id ?? data[0]?.id ?? null
      })
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load versions'))
      setVersions([])
      setSelectedId(null)
    } finally {
      setLoading(false)
    }
  }, [runtimeId])

  useEffect(() => {
    void loadVersions()
  }, [loadVersions])

  const draft = versions.find((version) => version.status === 'Draft') ?? null
  const published =
    versions.find((version) => version.status === 'Published') ?? null
  const selected =
    versions.find((version) => version.id === selectedId) ?? null

  async function handleCreateDraft() {
    setCreatingDraft(true)
    setError(null)

    try {
      const created = await updateRuntimeDraft(
        runtimeId,
        published?.instructions ?? '',
      )
      await loadVersions()
      setSelectedId(created.id)
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to create draft'))
    } finally {
      setCreatingDraft(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Current Published Version</h3>
        {published ? (
          <VersionCard
            version={published}
            selected={selectedId === published.id}
            onSelect={() => setSelectedId(published.id)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">No published version yet.</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-medium">Current Draft</h3>
          {!draft ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={creatingDraft}
              onClick={() => void handleCreateDraft()}
            >
              {creatingDraft ? 'Creating…' : 'Create Draft'}
            </Button>
          ) : null}
        </div>
        {draft ? (
          <VersionCard
            version={draft}
            selected={selectedId === draft.id}
            onSelect={() => setSelectedId(draft.id)}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No draft. Create one to edit instructions.
          </p>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-medium">Version History</h3>
        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions yet.</p>
        ) : (
          <div className="space-y-2">
            {versions.map((version) => (
              <VersionCard
                key={version.id}
                version={version}
                selected={selectedId === version.id}
                onSelect={() => setSelectedId(version.id)}
              />
            ))}
          </div>
        )}
      </section>

      {selected ? (
        <VersionDetail
          runtimeId={runtimeId}
          version={selected}
          onChanged={loadVersions}
        />
      ) : null}
    </div>
  )
}
