import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import axios from 'axios'
import { DashboardLayout } from '@/layouts/DashboardLayout'
import { DeleteRuntimeDialog } from '@/components/runtime/DeleteRuntimeDialog'
import { RuntimeDetails } from '@/components/runtime/RuntimeDetails'
import { RuntimeFormDialog } from '@/components/runtime/RuntimeFormDialog'
import {
  createRuntime,
  deleteRuntime,
  getRuntime,
  listRuntimes,
  updateRuntime,
  type Runtime,
} from '@/services/runtime.service'

type DashboardPageProps = {
  onLogout: () => void
}

type FormMode = 'create' | 'edit'

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

export function DashboardPage({ onLogout }: DashboardPageProps) {
  const navigate = useNavigate()
  const { runtimeId } = useParams<{ runtimeId?: string }>()

  const [runtimes, setRuntimes] = useState<Runtime[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Runtime | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState<FormMode>('create')
  const [formSubmitting, setFormSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const refreshList = useCallback(async () => {
    setListLoading(true)
    setListError(null)
    try {
      const data = await listRuntimes()
      setRuntimes(data)
      return data
    } catch (error) {
      setListError(getErrorMessage(error, 'Failed to load runtimes'))
      return null
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    void refreshList()
  }, [refreshList])

  useEffect(() => {
    let cancelled = false

    async function loadDetails() {
      if (!runtimeId) {
        setSelected(null)
        setDetailsError(null)
        setDetailsLoading(false)
        return
      }

      setDetailsLoading(true)
      setDetailsError(null)

      try {
        const data = await getRuntime(runtimeId)
        if (!cancelled) {
          setSelected(data)
        }
      } catch (error) {
        if (!cancelled) {
          setSelected(null)
          setDetailsError(getErrorMessage(error, 'Failed to load runtime'))
        }
      } finally {
        if (!cancelled) {
          setDetailsLoading(false)
        }
      }
    }

    void loadDetails()

    return () => {
      cancelled = true
    }
  }, [runtimeId])

  function openCreateDialog() {
    setFormMode('create')
    setFormError(null)
    setFormOpen(true)
  }

  function openEditDialog() {
    setFormMode('edit')
    setFormError(null)
    setFormOpen(true)
  }

  async function handleFormSubmit(values: {
    name: string
    description: string
  }) {
    setFormSubmitting(true)
    setFormError(null)

    try {
      if (formMode === 'create') {
        const created = await createRuntime({
          name: values.name,
          description: values.description || undefined,
        })
        await refreshList()
        setFormOpen(false)
        navigate(`/dashboard/runtime/${created.id}`)
        return
      }

      if (!runtimeId) {
        return
      }

      const updated = await updateRuntime(runtimeId, {
        name: values.name,
        description: values.description,
      })
      setSelected(updated)
      await refreshList()
      setFormOpen(false)
    } catch (error) {
      setFormError(
        getErrorMessage(
          error,
          formMode === 'create'
            ? 'Failed to create runtime'
            : 'Failed to update runtime',
        ),
      )
    } finally {
      setFormSubmitting(false)
    }
  }

  async function handleDeleteConfirm() {
    if (!runtimeId) {
      return
    }

    setDeleteSubmitting(true)
    setDeleteError(null)

    try {
      await deleteRuntime(runtimeId)
      const nextList = await refreshList()
      setDeleteOpen(false)
      setSelected(null)

      if (nextList && nextList.length > 0) {
        navigate(`/dashboard/runtime/${nextList[0].id}`)
      } else {
        navigate('/dashboard')
      }
    } catch (error) {
      setDeleteError(getErrorMessage(error, 'Failed to delete runtime'))
    } finally {
      setDeleteSubmitting(false)
    }
  }

  return (
    <>
      <DashboardLayout
        runtimes={runtimes}
        listLoading={listLoading}
        onLogout={onLogout}
        onCreateClick={openCreateDialog}
      >
        <RuntimeDetails
          runtime={selected}
          loading={detailsLoading}
          error={detailsError ?? listError}
          hasRuntimes={runtimes.length > 0}
          onCreateClick={openCreateDialog}
          onEditClick={openEditDialog}
          onDeleteClick={() => {
            setDeleteError(null)
            setDeleteOpen(true)
          }}
        />
      </DashboardLayout>

      <RuntimeFormDialog
        open={formOpen}
        mode={formMode}
        initialValues={
          formMode === 'edit' && selected
            ? { name: selected.name, description: selected.description }
            : null
        }
        submitting={formSubmitting}
        error={formError}
        onOpenChange={setFormOpen}
        onSubmit={handleFormSubmit}
      />

      <DeleteRuntimeDialog
        open={deleteOpen}
        runtime={selected}
        submitting={deleteSubmitting}
        error={deleteError}
        onOpenChange={setDeleteOpen}
        onConfirm={handleDeleteConfirm}
      />
    </>
  )
}
