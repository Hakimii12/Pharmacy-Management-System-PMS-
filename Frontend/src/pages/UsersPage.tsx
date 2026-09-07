import { useState } from "react"
import { Ban, Check, Search, ShieldPlus, X } from "lucide-react"
import { z } from "zod"

import {
  useCreateAdminMutation,
  useGetUsersQuery,
  useModerateUserMutation,
  type ApprovalAction,
} from "@/api/authApi"
import { useAuth } from "@/hooks/useAuth"
import { useDebounced } from "@/hooks/useDebounced"
import { errorMessage, useToast } from "@/hooks/useToast"
import { formatDate, initials } from "@/lib/format"
import { Badge, UserStatusBadge } from "@/components/ui/Badge"
import { Button } from "@/components/ui/Button"
import { Dialog } from "@/components/ui/Dialog"
import { Input, Select } from "@/components/ui/Input"
import { LabelCard } from "@/components/ui/LabelCard"
import { PageHeader } from "@/components/ui/PageHeader"
import { Pagination, Table } from "@/components/ui/Table"
import type { Role, User, UserStatus } from "@/types"

export default function UsersPage() {
  const toast = useToast()
  const { can, user: currentUser } = useAuth()
  const isSuperAdmin = can("superAdmin")

  const [search, setSearch] = useState("")
  const [role, setRole] = useState<Role | "">("")
  const [status, setStatus] = useState<UserStatus | "">("")
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(25)
  const [addingAdmin, setAddingAdmin] = useState(false)

  const debouncedSearch = useDebounced(search)

  const { data, isFetching } = useGetUsersQuery({
    page,
    limit,
    search: debouncedSearch || undefined,
    role: role || undefined,
    status: status || undefined,
  })

  const [moderate, { isLoading: moderating }] = useModerateUserMutation()

  const act = async (target: User, action: ApprovalAction) => {
    try {
      const result = await moderate({ id: target._id, action }).unwrap()
      toast("success", result.message)
    } catch (error) {
      toast("error", "Could not update the account", errorMessage(error))
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Staff accounts"
        description="Approve new sign-ups, suspend access and see who is working the counter."
        action={
          isSuperAdmin && (
            <Button onClick={() => setAddingAdmin(true)}>
              <ShieldPlus className="h-4 w-4" aria-hidden />
              Add admin
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Input
          wrapperClassName="min-w-[200px] flex-1"
          placeholder="Search name or email…"
          prefix={<Search className="h-4 w-4" aria-hidden />}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          aria-label="Search staff"
        />

        <Select
          wrapperClassName="w-full sm:w-44"
          value={role}
          onChange={(event) => {
            setRole(event.target.value as Role | "")
            setPage(1)
          }}
          aria-label="Filter by role"
        >
          <option value="">Any role</option>
          <option value="superAdmin">Super admin</option>
          <option value="admin">Admin</option>
          <option value="pharmacist">Pharmacist</option>
          <option value="cashier">Cashier</option>
        </Select>

        <Select
          wrapperClassName="w-full sm:w-40"
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as UserStatus | "")
            setPage(1)
          }}
          aria-label="Filter by status"
        >
          <option value="">Any status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="suspended">Suspended</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      <LabelCard perforated eyebrow="Directory" title="Staff" bodyClassName="px-0 py-0">
        <Table
          rows={data?.data ?? []}
          rowKey={(row) => row._id}
          loading={isFetching}
          empty={{ title: "No accounts match these filters" }}
          columns={[
            {
              key: "person",
              header: "Person",
              render: (row) => (
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-paper-sunken font-mono text-xs font-semibold text-ink-muted"
                    aria-hidden
                  >
                    {initials(row.name)}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink">
                      {row.name}
                      {row._id === currentUser?.id && (
                        <span className="ml-2 font-mono text-micro uppercase tracking-wider text-ink-muted">
                          you
                        </span>
                      )}
                    </p>
                    <p className="truncate text-xs text-ink-muted">{row.email}</p>
                  </div>
                </div>
              ),
            },
            {
              key: "role",
              header: "Role",
              render: (row) => <Badge tone="info">{row.role}</Badge>,
            },
            {
              key: "status",
              header: "Status",
              render: (row) => <UserStatusBadge status={row.status} />,
            },
            {
              key: "joined",
              header: "Joined",
              secondary: true,
              render: (row) => <span className="text-ink-muted">{formatDate(row.createdAt)}</span>,
            },
            {
              key: "actions",
              header: "",
              width: "200px",
              render: (row) => {
                // The backend refuses to moderate admins, so don't offer it.
                const moderatable = row.role !== "admin" && row.role !== "superAdmin"
                if (!moderatable) {
                  return <span className="block text-right text-xs text-ink-muted">Protected</span>
                }

                return (
                  <div className="flex justify-end gap-1.5">
                    {row.status !== "approved" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={moderating}
                        onClick={() => act(row, "approve")}
                      >
                        <Check className="h-3.5 w-3.5" aria-hidden />
                        Approve
                      </Button>
                    )}
                    {row.status === "approved" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={moderating}
                        onClick={() => act(row, "suspend")}
                      >
                        <Ban className="h-3.5 w-3.5" aria-hidden />
                        Suspend
                      </Button>
                    )}
                    {row.status === "pending" && (
                      <Button
                        size="sm"
                        variant="quiet"
                        disabled={moderating}
                        onClick={() => act(row, "reject")}
                        aria-label={`Reject ${row.name}`}
                      >
                        <X className="h-3.5 w-3.5" aria-hidden />
                      </Button>
                    )}
                  </div>
                )
              },
            },
          ]}
        />

        {data && (
          <div className="px-4 pb-4">
            <Pagination
              page={data.page}
              totalPages={data.totalPages}
              total={data.total}
              limit={data.limit}
              onPageChange={setPage}
              onLimitChange={(next) => {
                setLimit(next)
                setPage(1)
              }}
            />
          </div>
        )}
      </LabelCard>

      <AddAdminDialog open={addingAdmin} onClose={() => setAddingAdmin(false)} />
    </>
  )
}

const adminSchema = z.object({
  name: z.string().min(2, "Enter a full name"),
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(8, "Use at least 8 characters"),
})

function AddAdminDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast()
  const [form, setForm] = useState({ name: "", email: "", password: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [createAdmin, { isLoading }] = useCreateAdminMutation()

  const update = (field: string) => (event: { target: { value: string } }) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }))

  const handleSubmit = async () => {
    const parsed = adminSchema.safeParse(form)
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {}
      for (const issue of parsed.error.issues) {
        fieldErrors[issue.path[0] as string] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setErrors({})

    try {
      await createAdmin(parsed.data).unwrap()
      toast("success", "Admin created", "The account is approved and can sign in immediately.")
      setForm({ name: "", email: "", password: "" })
      onClose()
    } catch (error) {
      toast("error", "Could not create the admin", errorMessage(error))
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      eyebrow="Super admin"
      title="Add an administrator"
      description="Admins are approved on creation and can manage stock, staff and the credit ledger."
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} loading={isLoading}>
            Create admin
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input label="Full name" value={form.name} onChange={update("name")} error={errors.name} required />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={update("email")}
          error={errors.email}
          required
        />
        <Input
          label="Temporary password"
          type="password"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
          hint="At least 8 characters. Share it privately."
          required
        />
      </div>
    </Dialog>
  )
}
