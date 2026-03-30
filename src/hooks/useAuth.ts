import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  /** Returns the error message string on failure, or null on success. */
  signIn: (email: string, password: string) => Promise<string | null>;
  /** Returns the error message string on failure, or null on success (email confirmation sent). */
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  /** Returns the error message string on failure, or null on success (reset link sent). */
  resetPassword: (email: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately — use it as the
    // canonical source of truth so we never race with getSession().
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      // Clear loading on the very first event (INITIAL_SESSION or SIGNED_IN)
      if (event === "INITIAL_SESSION") setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<string | null> {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) { setError(authError.message); return authError.message; }
    return null;
  }

  async function signUp(email: string, password: string): Promise<string | null> {
    setError(null);
    const { error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) { setError(authError.message); return authError.message; }
    // No real error — set info message for display, return null (success)
    setError("Check your email to confirm your account.");
    return null;
  }

  async function signOut(): Promise<void> {
    setError(null);
    await supabase.auth.signOut();
  }

  async function signInWithGoogle(): Promise<void> {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (authError) setError(authError.message);
  }

  async function resetPassword(email: string): Promise<string | null> {
    setError(null);
    const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (authError) { setError(authError.message); return authError.message; }
    setError("Check your email for a password reset link.");
    return null;
  }

  function clearError(): void {
    setError(null);
  }

  return { session, user, loading, signIn, signUp, signOut, resetPassword, signInWithGoogle, error, clearError };
}

