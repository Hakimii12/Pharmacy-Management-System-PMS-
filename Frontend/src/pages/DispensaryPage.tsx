import { useMemo, useState } from "react"
import { Plus } from "lucide-react"

import {
  useGetDispensaryCountsQuery,
  useGetGroupedDispensaryProductsQuery,
} from "@/api/productApi"
import { useGetDispensarySummaryQuery } from "@/api/inventoryApi"
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

export default function DispensaryPage() {
  const { can } = useAuth()
  const isManager = can(...MANAGER_ROLES)
  const { data: counts, isLoading } = useGetDispensaryCountsQuery()
  const { data: summary } = useGetDispensarySummaryQuery({ limit: 1 })
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

  const { data: refreshed } = useGetGroupedDispensaryProductsQuery(
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
        title="Dispensary shelf"
        description="Same products are grouped with total shelf quantity. Open a product to adjust stock or return batches to the back store."
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
        <StatCard
          label="Batches on the shelf"
          value={quantity(counts?.totalInDispensary)}
          loading={isLoading}
        />
        <StatCard
          label="Below threshold"
          value={quantity(counts?.lowInDispensary)}
          tone={counts?.lowInDispensary ? "warn" : "good"}
          loading={isLoading}
        />
        <StatCard
          label="Expired"
          value={quantity(counts?.expiredInDispensary)}
          tone={counts?.expiredInDispensary ? "bad" : "good"}
          loading={isLoading}
        />
        <StatCard
          label="Retail value"
          value={compactMoney(summary?.totals.totalSellingPrice ?? counts?.totalSellingValue)}
          hint={`Margin ${compactMoney(summary?.totals.potentialProfit ?? counts?.potentialProfit)}`}
          loading={isLoading}
        />
      </div>

      <ProductGroupListView
        eyebrow="Dispensary"
        title="Sellable stock"
        location="dispensary"
        useQuery={useGetGroupedDispensaryProductsQuery}
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
        emptyTitle="Nothing on the shelf matches"
      />

      <ProductBatchesDialog
        open={Boolean(openedGroup)}
        group={selectedGroup}
        location="dispensary"
        canManage={isManager}
        onClose={() => setOpenedGroup(null)}
        onEditQuantity={(batch) => setEditingQuantity(batch)}
        onEdit={(batch) => setEditingProduct(batch)}
        onAddBatch={(source) =>
          setAddingBatch({ source, initialValues: { destination: "dispensary" } })
        }
        onTransfer={(batch, dir) => setTransferring({ product: batch, direction: dir })}
      />

      <EditQuantityDialog
        open={Boolean(editingQuantity)}
        product={editingQuantity}
        location="dispensary"
        onClose={() => setEditingQuantity(null)}
      />

      <ProductFormDialog
        open={creatingProduct || Boolean(editingProduct)}
        product={editingProduct}
        defaultDestination="dispensary"
        onClose={() => {
          setCreatingProduct(false)
          setEditingProduct(null)
        }}
        onSwitchToAddBatch={(source, initialValues) => {
          setCreatingProduct(false)
          setEditingProduct(null)
          setAddingBatch({
            source,
            initialValues: { ...initialValues, destination: "dispensary" },
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
        direction={transferring?.direction ?? "return"}
        product={transferring?.product ?? null}
        onClose={() => setTransferring(null)}
      />
    </>
  )
}
