import type { Session, User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export interface AuthState {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  error: string | null;
  clearError: () => void;
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initialise from persisted session
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<void> {
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (authError) setError(authError.message);
  }

  async function signUp(email: string, password: string): Promise<void> {
    setError(null);
    const { error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      setError(authError.message);
    } else {
      setError("Check your email to confirm your account.");
    }
  }

  async function signOut(): Promise<void> {
    setError(null);
    await supabase.auth.signOut();
  }

  function clearError(): void {
    setError(null);
  }

  return { session, user, loading, signIn, signUp, signOut, error, clearError };
}

