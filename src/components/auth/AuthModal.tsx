import { memo, useState, useCallback, useRef, useEffect } from "react"
import type { FormEvent, KeyboardEvent } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { UseAuthReturn } from "@/lib/auth/useAuth"

const STEPS = { EMAIL: "email", OTP: "otp", PROFILE: "profile" } as const
type Step = typeof STEPS[keyof typeof STEPS]

const AUTH_FLOW_KEY = "chordee-auth-flow"

interface PersistedFlow {
  step: Step
  email: string
  codeSentAt: number
}

interface AuthModalProps {
  isOpen: boolean
  onClose: () => void
  auth: UseAuthReturn
}

function getPersistedFlow(): PersistedFlow | null {
  try {
    const raw = localStorage.getItem(AUTH_FLOW_KEY)
    if (!raw) return null
    const flow = JSON.parse(raw) as PersistedFlow
    if (Date.now() - flow.codeSentAt > 10 * 60 * 1000) {
      localStorage.removeItem(AUTH_FLOW_KEY)
      return null
    }
    return flow
  } catch { return null }
}

function persistFlow(step: Step, email: string, codeSentAt: number): void {
  try { localStorage.setItem(AUTH_FLOW_KEY, JSON.stringify({ step, email, codeSentAt })) } catch { /* quota */ }
}

function clearPersistedFlow(): void {
  try { localStorage.removeItem(AUTH_FLOW_KEY) } catch { /* ignore */ }
}

function AuthModalImpl({ isOpen, onClose, auth }: AuthModalProps) {
  const persisted = isOpen ? getPersistedFlow() : null
  const [step, setStep] = useState<Step>(persisted?.step || STEPS.EMAIL)
  const [email, setEmail] = useState<string>(persisted?.email || "")
  const [otp, setOtp] = useState<string[]>(["", "", "", "", "", ""])
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [error, setError] = useState("")
  const [sending, setSending] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const digitRefs = useRef<Array<HTMLInputElement | null>>([])

  useEffect(() => {
    if (!isOpen) return
    const flow = getPersistedFlow()
    if (flow) {
      setStep(flow.step)
      setEmail(flow.email)
    } else {
      setStep(STEPS.EMAIL)
      setEmail("")
    }
    setOtp(["", "", "", "", "", ""])
    setFirstName("")
    setLastName("")
    setError("")
    setSending(false)
    setVerifying(false)
  }, [isOpen])

  const handleSendCode = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    if (!email.trim() || sending) return
    setError("")
    setSending(true)
    try {
      await auth.requestOtp(email.trim())
      const now = Date.now()
      setStep(STEPS.OTP)
      persistFlow(STEPS.OTP, email.trim(), now)
    } catch (err) {
      setError((err as Error).message || "Failed to send code")
    } finally {
      setSending(false)
    }
  }, [email, sending, auth])

  const handleVerify = useCallback(async (code: string) => {
    if (verifying) return
    setError("")
    setVerifying(true)
    try {
      const result = await auth.verifyOtp(email.trim(), code)
      clearPersistedFlow()
      if (result.is_new_user) {
        setStep(STEPS.PROFILE)
      } else {
        onClose()
      }
    } catch (err) {
      setError((err as Error).message || "Invalid code")
      setOtp(["", "", "", "", "", ""])
      digitRefs.current[0]?.focus()
    } finally {
      setVerifying(false)
    }
  }, [auth, email, onClose, verifying])

  const handleDigitChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("")
      const next = [...otp]
      digits.forEach((d, i) => { if (index + i < 6) next[index + i] = d })
      setOtp(next)
      const focusIdx = Math.min(index + digits.length, 5)
      digitRefs.current[focusIdx]?.focus()
      if (next.every((d) => d !== "")) handleVerify(next.join(""))
      return
    }
    if (!/^\d?$/.test(value)) return
    const next = [...otp]
    next[index] = value
    setOtp(next)
    if (value && index < 5) digitRefs.current[index + 1]?.focus()
    if (next.every((d) => d !== "")) handleVerify(next.join(""))
  }, [otp, handleVerify])

  const handleDigitKey = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      digitRefs.current[index - 1]?.focus()
    }
  }, [otp])

  const handleProfileSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault()
    try {
      await auth.updateProfile({ first_name: firstName.trim() || null, last_name: lastName.trim() || null })
      auth.setIsNewUser(false)
      onClose()
    } catch {
      // skip — profile is optional
      onClose()
    }
  }, [auth, firstName, lastName, onClose])

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="auth-modal max-w-md">
        <DialogHeader>
          <DialogTitle className="auth-modal-title">
            {step === STEPS.EMAIL ? "Sign in to chordee"
              : step === STEPS.OTP ? "Check your email"
              : "Welcome — what should we call you?"}
          </DialogTitle>
          <DialogDescription className="auth-modal-description">
            {step === STEPS.EMAIL ? "We'll email you a 6-digit code."
              : step === STEPS.OTP ? `We sent a code to ${email}.`
              : "Optional — you can skip this."}
          </DialogDescription>
        </DialogHeader>

        {step === STEPS.EMAIL && (
          <form onSubmit={handleSendCode} className="auth-form-email flex flex-col gap-3">
            <Label htmlFor="auth-email" className="auth-label">Email</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="auth-input-email"
            />
            {error && <p className="auth-error text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={sending || !email.trim()} className="auth-submit-email">
              {sending ? "Sending…" : "Send code"}
            </Button>
          </form>
        )}

        {step === STEPS.OTP && (
          <div className="auth-form-otp flex flex-col gap-3">
            <div className="auth-otp-digits flex justify-center gap-2">
              {otp.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { digitRefs.current[i] = el }}
                  type="text"
                  inputMode="numeric"
                  maxLength={i === 0 ? 6 : 1}
                  value={d}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKey(i, e)}
                  className="auth-otp-digit h-12 w-10 rounded-md border bg-background text-center text-lg font-semibold focus:border-primary focus:outline-none"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {error && <p className="auth-error text-sm text-red-600 text-center">{error}</p>}
            {verifying && <p className="auth-verifying text-sm text-muted-foreground text-center">Verifying…</p>}
            <button
              type="button"
              className="auth-back-to-email text-xs text-muted-foreground hover:text-foreground"
              onClick={() => { clearPersistedFlow(); setStep(STEPS.EMAIL) }}
            >
              ← Use a different email
            </button>
          </div>
        )}

        {step === STEPS.PROFILE && (
          <form onSubmit={handleProfileSubmit} className="auth-form-profile flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="auth-fn" className="auth-label">First name</Label>
                <Input id="auth-fn" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="auth-input-firstname" />
              </div>
              <div>
                <Label htmlFor="auth-ln" className="auth-label">Last name</Label>
                <Input id="auth-ln" value={lastName} onChange={(e) => setLastName(e.target.value)} className="auth-input-lastname" />
              </div>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="auth-submit-profile flex-1">Save</Button>
              <Button type="button" variant="ghost" onClick={onClose} className="auth-skip-profile">Skip</Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}

export const AuthModal = memo(AuthModalImpl)
