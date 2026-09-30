import { useState, type FormEvent } from "react"
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom"
import { z } from "zod"

import { useLoginMutation } from "@/api/authApi"
import { useAppDispatch } from "@/app/hooks"
import { setUser } from "@/features/auth/authSlice"
import { useAuth } from "@/hooks/useAuth"
import { errorMessage } from "@/hooks/useToast"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { AuthShell } from "./AuthShell"

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
})

export default function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const { isAuthenticated } = useAuth()
  const [login, { isLoading }] = useLoginMutation()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)

  if (isAuthenticated) {
    const from = (location.state as { from?: Location } | null)?.from?.pathname || "/"
    return <Navigate to={from} replace />
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setFormError(null)

    const parsed = schema.safeParse({ email, password })
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
      const user = await login(parsed.data).unwrap()
      dispatch(setUser(user))
      navigate("/", { replace: true })
    } catch (error) {
      setFormError(errorMessage(error, "Could not sign in. Please check your credentials."))
    }
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Dispensary access"
      subtitle="Enter the credentials issued to you by a pharmacy administrator."
    >
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <Input
          label="Email"
          type="email"
          autoComplete="username"
          autoFocus
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          error={errors.email}
          placeholder="you@pharmacy.et"
          required
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors.password}
          required
        />

        {formError && (
          <p className="rounded-label border border-alert/30 bg-alert-soft px-3 py-2 text-sm text-alert" role="alert">
            {formError}
          </p>
        )}

        <Button type="submit" size="lg" fullWidth loading={isLoading}>
          Sign in
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-ink-muted">
        Need an account?{" "}
        <Link to="/register" className="font-medium text-rx-amber-deep underline-offset-2 hover:underline">
          Request access
        </Link>
      </p>
    </AuthShell>
  )
}
