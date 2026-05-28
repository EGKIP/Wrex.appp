import { useCallback, useEffect, useState } from "react";
import { getProStatus } from "../lib/api";
import type { ProStatusResponse } from "../types";

export type ProCreditStatus = Pick<
  ProStatusResponse,
  "ai_credits_remaining" | "ai_credits_monthly" | "ai_credits_period_end"
>;

export interface ProStatus {
  isPro: boolean;
  credits: ProCreditStatus | null;
  loading: boolean;
  refresh: () => void;
}

/**
 * Fetches the Pro status for the current authenticated user.
 * Returns { isPro: false, loading: false } when no access token is available.
 * Call refresh() to re-fetch after a payment completes.
 */
export function useProStatus(accessToken: string | null | undefined): ProStatus {
  const [isPro, setIsPro] = useState(false);
  const [credits, setCredits] = useState<ProCreditStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [tick, setTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (!accessToken) {
      setIsPro(false);
      setCredits(null);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getProStatus(accessToken)
      .then((status) => {
        if (cancelled) return;
        setIsPro(status.is_pro);
        setCredits(
          status.is_pro
            ? {
                ai_credits_remaining: status.ai_credits_remaining,
                ai_credits_monthly: status.ai_credits_monthly,
                ai_credits_period_end: status.ai_credits_period_end,
              }
            : null,
        );
      })
      .catch(() => {
        if (!cancelled) {
          setIsPro(false);
          setCredits(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken, tick]);

  return { isPro, credits, loading, refresh };
}
