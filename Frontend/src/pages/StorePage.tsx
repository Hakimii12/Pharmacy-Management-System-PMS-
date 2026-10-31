import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import {
  useGetGroupedStoreProductsQuery,
  useGetStoreCountsQuery,
} from "@/api/productApi"
import { useAuth } from "@/hooks/useAuth"
import { MANAGER_ROLES } from "@/features/auth/authSlice"
import { compactMoney, quantity } from "@/lib/format"
import { Button } from "@/components/ui/Button"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatCard } from "@/components/ui/StatCard"
import { AddBatchDialog } from "@/components/inventory/AddBatchDialog"
import { EditQuantityDialog } from "@/components/inventory/EditQuantityDialog"
import { ProductBatchesDialog } from "@/components/inventory/ProductBatchesDialog"
import { ProductFormDialog } from "@/components/inventory/ProductFormDialog"
import { ProductGroupListView } from "@/components/inventory/ProductGroupListView"
import { TransferDialog } from "@/components/inventory/TransferDialog"
import type { Product, ProductGroup } from "@/types"

export default function StorePage() {
  const { can } = useAuth()
  const isManager = can(...MANAGER_ROLES)
  const { data: counts, isLoading } = useGetStoreCountsQuery()
  const [openedGroup, setOpenedGroup] = useState<ProductGroup | null>(null)
  const [transferring, setTransferring] = useState<{ product: Product; direction: "issue" | "return" } | null>(null)

  // Quantity editing & batch addition state
  const [editingQuantity, setEditingQuantity] = useState<Product | null>(null)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [creatingProduct, setCreatingProduct] = useState(false)
  const [addingBatch, setAddingBatch] = useState<{
    source: Product
    initialValues?: {
      batchNo?: string
      expiryDate?: string
      quantity?: string
      distributorName?: string
      distributorContact?: string
      destination?: "store" | "dispensary"
    }
  } | null>(null)

  const { data: refreshed } = useGetGroupedStoreProductsQuery(
    { page: 1, limit: 50, search: openedGroup?.name },
    { skip: !openedGroup },
  )

  const selectedGroup = useMemo(() => {
    if (!openedGroup) return null
    if (!refreshed) return openedGroup
    return refreshed.data.find((group) => group.id === openedGroup.id) ?? openedGroup
  }, [openedGroup, refreshed])

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Back store"
        description="Same products are grouped with total store quantity. Open a product to adjust stock or issue batches to the dispensary."
        action={
          isManager && (
            <Button onClick={() => setCreatingProduct(true)}>
              <Plus className="h-4 w-4" aria-hidden />
              New batch
            </Button>
          )
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Batches in store" value={quantity(counts?.totalInStore)} loading={isLoading} />
        <StatCard
          label="Below threshold"
          value={quantity(counts?.lowInStore)}
          tone={counts?.lowInStore ? "warn" : "good"}
          loading={isLoading}
        />
        <StatCard
          label="Expired"
          value={quantity(counts?.expiredInStore)}
          tone={counts?.expiredInStore ? "bad" : "good"}
          loading={isLoading}
        />
        <StatCard
          label="Value at cost"
          value={compactMoney(counts?.totalInventoryValue)}
          hint={`Profit if sold ${compactMoney(counts?.potentialProfit)}`}
          loading={isLoading}
        />
      </div>

      <ProductGroupListView
        eyebrow="Back store"
        title="Held stock"
        location="store"
        useQuery={useGetGroupedStoreProductsQuery}
        onOpenGroup={setOpenedGroup}
        onEditQuantity={
          isManager
            ? (group) => {
                if (group.batches.length === 1) {
                  setEditingQuantity(group.batches[0])
                } else {
                  setOpenedGroup(group)
                }
              }
            : undefined
        }
        emptyTitle="Nothing in the back store matches"
      />

      <ProductBatchesDialog
        open={Boolean(openedGroup)}
        group={selectedGroup}
        location="store"
        canManage={isManager}
        onClose={() => setOpenedGroup(null)}
        onEditQuantity={(batch) => setEditingQuantity(batch)}
        onEdit={(batch) => setEditingProduct(batch)}
        onAddBatch={(source) =>
          setAddingBatch({ source, initialValues: { destination: "store" } })
        }
        onTransfer={(batch, dir) => setTransferring({ product: batch, direction: dir })}
      />

      <EditQuantityDialog
        open={Boolean(editingQuantity)}
        product={editingQuantity}
        location="store"
        onClose={() => setEditingQuantity(null)}
      />

      <ProductFormDialog
        open={creatingProduct || Boolean(editingProduct)}
        product={editingProduct}
        defaultDestination="store"
        onClose={() => {
          setCreatingProduct(false)
          setEditingProduct(null)
        }}
        onSwitchToAddBatch={(source, initialValues) => {
          setCreatingProduct(false)
          setEditingProduct(null)
          setAddingBatch({
            source,
            initialValues: { ...initialValues, destination: "store" },
          })
        }}
      />

      <AddBatchDialog
        open={Boolean(addingBatch)}
        source={addingBatch?.source ?? null}
        initialValues={addingBatch?.initialValues}
        onClose={() => setAddingBatch(null)}
      />

      <TransferDialog
        direction={transferring?.direction ?? "issue"}
        product={transferring?.product ?? null}
        onClose={() => setTransferring(null)}
      />
    </>
  )
}
