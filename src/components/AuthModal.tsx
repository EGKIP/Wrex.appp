import { useEffect, useRef, useState } from "react";
import type { AuthState } from "../hooks/useAuth";
import { useToast } from "../context/toast";

interface Props {
  open: boolean;
  onClose: () => void;
  auth: AuthState;
  /** If true the modal opens on the Sign Up tab */
  defaultTab?: "signin" | "signup";
}

export function AuthModal({ open, onClose, auth, defaultTab = "signin" }: Props) {
  const { toast } = useToast();
  const [tab, setTab] = useState<"signin" | "signup">(defaultTab);
  const [showForgot, setShowForgot] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const emailRef = useRef<HTMLInputElement>(null);

  // Reset form when opened/tab changed
  useEffect(() => {
    if (open) {
      setTab(defaultTab);
      setEmail("");
      setPassword("");
      setShowForgot(false);
      auth.clearError();
      setTimeout(() => emailRef.current?.focus(), 50);
    }
  }, [open, defaultTab]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    if (showForgot) {
      await auth.resetPassword(email);
      if (!auth.error) toast("Reset link sent — check your inbox 📬", "info");
    } else if (tab === "signin") {
      await auth.signIn(email, password);
      // sign-in success toast fires from App.tsx via auth.user change
      if (!auth.error) onClose();
    } else {
      await auth.signUp(email, password);
      // auth.error holds the "check your email" confirmation message for sign-up
      if (auth.error?.toLowerCase().includes("check your email")) {
        toast("Account created! Check your email to confirm 📧", "success");
      }
    }
    setSubmitting(false);
  }

  const isInfo = auth.error?.toLowerCase().includes("check your email")
    || auth.error?.toLowerCase().includes("password reset");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/40 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex rounded-lg overflow-hidden border border-gray-200 mb-6">
          {(["signin", "signup"] as const).map((t) => (
            <button
              key={t}
              onClick={() => { setTab(t); auth.clearError(); }}
              className={`flex-1 py-2 text-sm font-medium transition-colors ${
                tab === t
                  ? "bg-navy text-white"
                  : "bg-white text-charcoal/60 hover:text-charcoal"
              }`}
            >
              {t === "signin" ? "Sign in" : "Create account"}
            </button>
          ))}
        </div>

        {/* Google OAuth — shown on both tabs, hidden in forgot-password view */}
        {!showForgot && (
          <>
            <button
              type="button"
              onClick={() => auth.signInWithGoogle()}
              className="flex w-full items-center justify-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-charcoal transition hover:bg-mist hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {/* Google "G" logo SVG */}
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-gray-200" />
              <span className="text-xs text-charcoal/40">or continue with email</span>
              <div className="h-px flex-1 bg-gray-200" />
            </div>
          </>
        )}

        {/* Forgot-password sub-view */}
        {showForgot ? (
          <>
            <p className="mb-4 text-sm text-charcoal/70">
              Enter your email and we'll send a reset link.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <input
                ref={emailRef}
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
              {auth.error && (
                <p className={`text-sm rounded-lg px-3 py-2 ${isInfo ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600"}`}>
                  {auth.error}
                </p>
              )}
              <button type="submit" disabled={submitting}
                className="w-full bg-navy text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-navy/90 transition-colors disabled:opacity-50">
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="mt-4 text-xs text-center text-charcoal/40">
              <button onClick={() => { setShowForgot(false); auth.clearError(); }} className="underline">
                Back to sign in
              </button>
            </p>
          </>
        ) : (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal mb-1">Email</label>
                <input
                  ref={emailRef}
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@university.edu"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-charcoal">Password</label>
                  {tab === "signin" && (
                    <button type="button" onClick={() => { setShowForgot(true); auth.clearError(); }}
                      className="text-xs text-charcoal/45 hover:text-charcoal underline">
                      Forgot password?
                    </button>
                  )}
                </div>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
              {auth.error && (
                <p className={`text-sm rounded-lg px-3 py-2 ${isInfo ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-600"}`}>
                  {auth.error}
                </p>
              )}
              <button type="submit" disabled={submitting}
                className="w-full bg-navy text-white font-semibold rounded-lg py-2.5 text-sm hover:bg-navy/90 transition-colors disabled:opacity-50">
                {submitting ? "Please wait…" : tab === "signin" ? "Sign in" : "Create free account"}
              </button>
            </form>
            <p className="mt-4 text-xs text-center text-charcoal/40">
              {tab === "signin" ? (
                <>No account? <button onClick={() => setTab("signup")} className="underline">Sign up free</button></>
              ) : (
                <>Already have an account? <button onClick={() => setTab("signin")} className="underline">Sign in</button></>
              )}
            </p>
          </>
        )}
      </div>
    </div>
  );
}

