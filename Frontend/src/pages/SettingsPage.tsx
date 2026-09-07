import { useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import {
  useCreateCategoryMutation,
  useCreateDosageFormMutation,
  useDeleteCategoryMutation,
  useDeleteDosageFormMutation,
  useGetCategoriesQuery,
  useGetDosageFormsQuery,
} from "@/api/catalogApi"
import { errorMessage, useToast } from "@/hooks/useToast"
import { Badge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import type { Paginated, ReferenceEntry } from "@/types"

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Catalog"
        description="Categories and dosage forms used across product records. Entries still attached to stock cannot be removed."
      />

      <div className="grid gap-5 lg:grid-cols-2">
        <ReferenceList
          eyebrow="Classification"
          title="Categories"
          placeholder="e.g. Antibiotics"
          useList={useGetCategoriesQuery}
          useCreate={useCreateCategoryMutation}
          useRemove={useDeleteCategoryMutation}
          noun="category"
        />

        <ReferenceList
          eyebrow="Presentation"
          title="Dosage forms"
          placeholder="e.g. Tablet"
          useList={useGetDosageFormsQuery}
          useCreate={useCreateDosageFormMutation}
          useRemove={useDeleteDosageFormMutation}
          noun="dosage form"
        />
      </div>
    </>
  )
}

// RTK Query's generated hooks return a readonly tuple, so these structural
// signatures have to be readonly too.
type ListHook = (args: { limit: number }) => { data?: Paginated<ReferenceEntry>; isFetching: boolean }
type CreateHook = () => readonly [
  (args: { name: string }) => { unwrap: () => Promise<unknown> },
  { isLoading: boolean },
]
type RemoveHook = () => readonly [
  (id: string) => { unwrap: () => Promise<unknown> },
  { isLoading: boolean },
]

/**
 * Both reference lists behave identically, including the "still in use" rejection
 * the backend returns with a `productCount`.
 */
function ReferenceList({
  eyebrow,
  title,
  placeholder,
  noun,
  useList,
  useCreate,
  useRemove,
}: {
  eyebrow: string
  title: string
  placeholder: string
  noun: string
  useList: ListHook
  useCreate: CreateHook
  useRemove: RemoveHook
}) {
  const toast = useToast()
  const [name, setName] = useState("")

  const { data, isFetching } = useList({ limit: 200 })
  const [create, { isLoading: creating }] = useCreate()
  const [remove] = useRemove()

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    try {
      await create({ name: trimmed }).unwrap()
      setName("")
      toast("success", `Added ${trimmed}`)
    } catch (error) {
      toast("error", `Could not add the ${noun}`, errorMessage(error))
    }
  }

  const handleRemove = async (entry: ReferenceEntry) => {
    try {
      await remove(entry._id).unwrap()
      toast("success", `Removed ${entry.name}`)
    } catch (error) {
      const count = (error as { data?: { productCount?: number } }).data?.productCount
      toast(
        "error",
        `Could not remove ${entry.name}`,
        count
          ? `${count} product${count === 1 ? "" : "s"} still use this ${noun}.`
          : errorMessage(error),
      )
    }
  }

  return (
    <LabelCard perforated eyebrow={eyebrow} title={title}>
      <form
        className="mb-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          void handleCreate()
        }}
      >
        <Input
          wrapperClassName="flex-1"
          placeholder={placeholder}
          value={name}
          onChange={(event) => setName(event.target.value)}
          aria-label={`New ${noun}`}
        />
        <Button type="submit" loading={creating} disabled={!name.trim()}>
          <Plus className="h-4 w-4" aria-hidden />
          Add
        </Button>
      </form>

      {isFetching && !data ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 animate-pulse-soft rounded-label bg-paper-sunken" />
          ))}
        </div>
      ) : data?.data.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">Nothing defined yet.</p>
      ) : (
        <ul className="divide-y divide-mist">
          {data?.data.map((entry) => (
            <li key={entry._id} className="flex items-center justify-between gap-3 py-2">
              <span className="min-w-0 truncate text-sm text-ink">{entry.name}</span>

              <div className="flex shrink-0 items-center gap-2">
                <Badge tone={entry.productCount > 0 ? "info" : "neutral"}>
                  {entry.productCount} in use
                </Badge>
                <button
                  type="button"
                  onClick={() => void handleRemove(entry)}
                  disabled={entry.productCount > 0}
                  className="rounded-label p-1.5 text-ink-muted transition-colors hover:bg-alert-soft hover:text-alert disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-ink-muted"
                  aria-label={`Remove ${entry.name}`}
                  title={entry.productCount > 0 ? "Still attached to products" : undefined}
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </LabelCard>
  )
}
