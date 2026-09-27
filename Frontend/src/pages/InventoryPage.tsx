import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import { useDeleteProductMutation, useGetGroupedProductsQuery } from "@/api/productApi"
import { useAuth } from "@/hooks/useAuth"
import { errorMessage, useToast } from "@/hooks/useToast"
import { MANAGER_ROLES } from "@/features/auth/authSlice"
import { Button } from "@/components/ui/Button"
import { ConfirmDialog } from "@/components/ui/Dialog"
import { PageHeader } from "@/components/ui/PageHeader"
import { ProductFormDialog } from "@/components/inventory/ProductFormDialog"
import { AddBatchDialog } from "@/components/inventory/AddBatchDialog"
import { ProductGroupListView } from "@/components/inventory/ProductGroupListView"
import { ProductBatchesDialog } from "@/components/inventory/ProductBatchesDialog"
import { TransferDialog } from "@/components/inventory/TransferDialog"
import type { Product, ProductGroup } from "@/types"

export default function InventoryPage() {
  const toast = useToast()
  const { can } = useAuth()
  const isManager = can(...MANAGER_ROLES)

  const [editing, setEditing] = useState<Product | null>(null)
  const [creating, setCreating] = useState(false)
  const [addingBatch, setAddingBatch] = useState<Product | null>(null)
  const [deleting, setDeleting] = useState<Product | null>(null)
  const [openedGroup, setOpenedGroup] = useState<ProductGroup | null>(null)
  const [transferring, setTransferring] = useState<{ product: Product; direction: "issue" | "return" } | null>(null)

  // Refresh the open detail panel from the server after mutations invalidate the list.
  const { data: refreshed } = useGetGroupedProductsQuery(
    {
      page: 1,
      limit: 50,
      search: openedGroup?.name,
    },
    { skip: !openedGroup },
  )

  const selectedGroup = useMemo(() => {
    if (!openedGroup) return null
    if (!refreshed) return openedGroup
    return refreshed.data.find((group) => group.id === openedGroup.id) ?? openedGroup
  }, [openedGroup, refreshed])

  const [deleteProduct, { isLoading: isDeleting }] = useDeleteProductMutation()

  const handleDelete = async () => {
    if (!deleting) return
    try {
      const result = await deleteProduct(deleting._id).unwrap()
      toast(
        "success",
        result.deleteType === "soft" ? "Batch hidden" : "Batch removed",
        result.deleteType === "soft"
          ? `Kept for history: ${result.references.sales} sales, ${result.references.transfers} transfers reference it.`
          : "No sales or transfers referenced this batch.",
      )
      setDeleting(null)
    } catch (error) {
      toast("error", "Could not delete", errorMessage(error))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="All stock"
        description="Same products are grouped together with total quantity. Open a product to see individual batches."
        action={
          isManager && (
            <Button onClick={() => setCreating(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              New product
            </Button>
          )
        }
      />

      <ProductGroupListView
        eyebrow="Catalog"
        title="Products"
        location="both"
        useQuery={useGetGroupedProductsQuery}
        onOpenGroup={setOpenedGroup}
      />

      <ProductBatchesDialog
        open={Boolean(openedGroup)}
        group={selectedGroup}
        canManage={isManager}
        onClose={() => setOpenedGroup(null)}
        onAddBatch={(source) => setAddingBatch(source)}
        onEdit={(batch) => setEditing(batch)}
        onDelete={(batch) => setDeleting(batch)}
        onTransfer={(batch, dir) => setTransferring({ product: batch, direction: dir })}
      />

      <TransferDialog
        direction={transferring?.direction ?? "issue"}
        product={transferring?.product ?? null}
        onClose={() => setTransferring(null)}
      />

      <ProductFormDialog
        open={creating || Boolean(editing)}
        product={editing}
        onClose={() => {
          setCreating(false)
          setEditing(null)
        }}
      />

      <AddBatchDialog
        open={Boolean(addingBatch)}
        source={addingBatch}
        onClose={() => setAddingBatch(null)}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
        loading={isDeleting}
        tone="danger"
        confirmLabel="Delete batch"
        title="Delete this batch?"
        description={
          deleting
            ? `${deleting.name} · ${deleting.batchNo}. If any sale or transfer references it the record is kept and hidden instead of removed.`
            : undefined
        }
      />
    </>
  )
}
