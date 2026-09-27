import { useMemo, useState } from "react"

import {
  useGetGroupedStoreProductsQuery,
  useGetStoreCountsQuery,
} from "@/api/productApi"
import { useAuth } from "@/hooks/useAuth"
import { MANAGER_ROLES } from "@/features/auth/authSlice"
import { compactMoney, quantity } from "@/lib/format"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatCard } from "@/components/ui/StatCard"
import { ProductGroupListView } from "@/components/inventory/ProductGroupListView"
import { ProductBatchesDialog } from "@/components/inventory/ProductBatchesDialog"
import { TransferDialog } from "@/components/inventory/TransferDialog"
import type { Product, ProductGroup } from "@/types"

export default function StorePage() {
  const { can } = useAuth()
  const isManager = can(...MANAGER_ROLES)
  const { data: counts, isLoading } = useGetStoreCountsQuery()
  const [openedGroup, setOpenedGroup] = useState<ProductGroup | null>(null)
  const [transferring, setTransferring] = useState<{ product: Product; direction: "issue" | "return" } | null>(null)

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
        description="Same products are grouped with total store quantity. Open a product to issue a specific batch to the dispensary."
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
        emptyTitle="Nothing in the back store matches"
      />

      <ProductBatchesDialog
        open={Boolean(openedGroup)}
        group={selectedGroup}
        location="store"
        canManage={isManager}
        onClose={() => setOpenedGroup(null)}
        onTransfer={(batch, dir) => setTransferring({ product: batch, direction: dir })}
      />

      <TransferDialog
        direction={transferring?.direction ?? "issue"}
        product={transferring?.product ?? null}
        onClose={() => setTransferring(null)}
      />
    </>
  )
}
