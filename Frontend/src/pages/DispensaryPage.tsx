import { useMemo, useState } from "react"

import {
  useGetDispensaryCountsQuery,
  useGetGroupedDispensaryProductsQuery,
} from "@/api/productApi"
import { useGetDispensarySummaryQuery } from "@/api/inventoryApi"
import { useAuth } from "@/hooks/useAuth"
import { MANAGER_ROLES } from "@/features/auth/authSlice"
import { compactMoney, quantity } from "@/lib/format"
import { PageHeader } from "@/components/ui/PageHeader"
import { StatCard } from "@/components/ui/StatCard"
import { ProductGroupListView } from "@/components/inventory/ProductGroupListView"
import { ProductBatchesDialog } from "@/components/inventory/ProductBatchesDialog"
import { TransferDialog } from "@/components/inventory/TransferDialog"
import type { Product, ProductGroup } from "@/types"

export default function DispensaryPage() {
  const { can } = useAuth()
  const isManager = can(...MANAGER_ROLES)
  const { data: counts, isLoading } = useGetDispensaryCountsQuery()
  const { data: summary } = useGetDispensarySummaryQuery({ limit: 1 })
  const [openedGroup, setOpenedGroup] = useState<ProductGroup | null>(null)
  const [returning, setReturning] = useState<Product | null>(null)

  const { data: refreshed } = useGetGroupedDispensaryProductsQuery(
    { page: 1, limit: 50, search: openedGroup?.name },
    { skip: !openedGroup },
  )

  const selectedGroup = useMemo(() => {
    if (!openedGroup) return null
    if (!refreshed) return openedGroup
    return refreshed.data.find((group) => group.id === openedGroup.id) ?? null
  }, [openedGroup, refreshed])

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="Dispensary shelf"
        description="Same products are grouped with total shelf quantity. Open a product to return a specific batch to the back store."
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
        emptyTitle="Nothing on the shelf matches"
      />

      <ProductBatchesDialog
        open={Boolean(openedGroup)}
        group={selectedGroup}
        location="dispensary"
        canManage={isManager}
        onClose={() => setOpenedGroup(null)}
        onTransfer={(batch) => setReturning(batch)}
      />

      <TransferDialog direction="return" product={returning} onClose={() => setReturning(null)} />
    </>
  )
}
