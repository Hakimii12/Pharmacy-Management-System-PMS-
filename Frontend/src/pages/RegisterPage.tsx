import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router-dom"
import { CheckCircle2 } from "lucide-react"
import { z } from "zod"

import { useRegisterMutation } from "@/api/authApi"
import { errorMessage } from "@/hooks/useToast"
import { Button } from "@/components/ui/Button"
import { Input, Select } from "@/components/ui/Input"
import { AuthShell } from "./AuthShell"
import type { Role } from "@/types"

// `admin` is deliberately absent: the backend rejects it here, and only a
// superAdmin can mint one.
const SELF_SERVICE_ROLES: { value: Role; label: string }[] = [
  { value: "pharmacist", label: "Pharmacist — prepares sales, manages stock" },
  { value: "cashier", label: "Cashier — confirms payment, closes the till" },
]

const schema = z
  .object({
    name: z.string().min(2, "Enter your full name"),
    email: z.string().email("Enter a valid email address"),
    role: z.enum(["pharmacist", "cashier"], { message: "Choose a role" }),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "Passwords do not match",
    path: ["confirm"],
  })

export default function RegisterPage() {
  const navigate = useNavigate()
  const [register, { isLoading }] = useRegisterMutation()

  const [form, setForm] = useState({ name: "", email: "", role: "", password: "", confirm: "" })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const update = (field: string) => (event: { target: { value: string } }) =>
    setForm((previous) => ({ ...previous, [field]: event.target.value }))

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const parsed = schema.safeParse(form)
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
      await register({
        name: parsed.data.name,
        email: parsed.data.email,
        password: parsed.data.password,
        role: parsed.data.role,
      }).unwrap()
      setSubmitted(true)
    } catch (error) {
      setFormError(errorMessage(error, "Could not create the account"))
    }
  }

  if (submitted) {
    return (
      <AuthShell
        eyebrow="Request received"
        title="Waiting for approval"
        subtitle="An administrator has to approve the account before you can sign in."
      >
        <div className="rounded-label border border-mint/30 bg-mint-soft px-4 py-5 text-sm">
          <CheckCircle2 className="mb-2 h-5 w-5 text-mint" aria-hidden />
          <p className="text-ink">
            Your request for <strong>{form.email}</strong> has been submitted. You will be able to
            sign in as soon as it is approved.
          </p>
        </div>

        <Button className="mt-6" fullWidth variant="ghost" onClick={() => navigate("/login")}>
          Back to sign in
        </Button>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Request access"
      title="Create your account"
      subtitle="New accounts are held for administrator approval before they can sign in."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Full name"
          autoComplete="name"
          value={form.name}
          onChange={update("name")}
          error={errors.name}
          required
        />

        <Input
          label="Email"
          type="email"
          autoComplete="username"
          value={form.email}
          onChange={update("email")}
          error={errors.email}
          required
        />

        <Select label="Role" value={form.role} onChange={update("role")} error={errors.role} required>
          <option value="">Select a role…</option>
          {SELF_SERVICE_ROLES.map((role) => (
            <option key={role.value} value={role.value}>
              {role.label}
            </option>
          ))}
        </Select>

        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={update("password")}
          error={errors.password}
          hint="At least 8 characters."
          required
        />

        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          value={form.confirm}
          onChange={update("confirm")}
          error={errors.confirm}
          required
        />

        {formError && (
          <p className="rounded-label border border-alert/30 bg-alert-soft px-3 py-2 text-sm text-alert" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={isLoading}>
          Request access
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Already approved?{" "}
        <Link to="/login" className="font-medium text-rx-amber-deep underline-offset-2 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
