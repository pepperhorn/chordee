import { useState } from "react"
import { LogIn, User, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthContext } from "@/lib/auth/AuthContext"
import { AuthModal } from "./AuthModal"

export function AccountButton() {
  const auth = useAuthContext()
  const [authOpen, setAuthOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  if (auth.isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled className="account-button-loading text-white/60">
        <User className="h-4 w-4" />
      </Button>
    )
  }

  if (!auth.isLoggedIn) {
    return (
      <>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setAuthOpen(true)}
          className="account-button-signin gap-1.5 text-white hover:bg-white/10"
        >
          <LogIn className="h-4 w-4" />
          <span className="text-xs">Sign in</span>
        </Button>
        <AuthModal isOpen={authOpen} onClose={() => setAuthOpen(false)} auth={auth} />
      </>
    )
  }

  const initial = (auth.user?.first_name || auth.user?.email || "?").charAt(0).toUpperCase()

  return (
    <div className="account-button relative">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="account-button-trigger flex h-7 w-7 items-center justify-center rounded-full bg-white/15 text-xs font-semibold text-white hover:bg-white/25"
        aria-label={`Signed in as ${auth.user?.email}`}
      >
        {initial}
      </button>
      {menuOpen && (
        <>
          <div className="account-menu-backdrop fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
          <div className="account-menu absolute right-0 top-9 z-50 min-w-48 rounded-md border bg-background p-1 shadow-lg">
            <div className="account-menu-email border-b px-2 py-1.5 text-xs text-muted-foreground">
              {auth.user?.email}
            </div>
            <button
              type="button"
              className="account-menu-logout flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs hover:bg-muted"
              onClick={() => { auth.logout(); setMenuOpen(false) }}
            >
              <LogOut className="h-3 w-3" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}
