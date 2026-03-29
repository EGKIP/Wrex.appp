import { useEffect, useState } from "react";
import { getProStatus } from "../lib/api";

export interface ProStatus {
  isPro: boolean;
  loading: boolean;
}

/**
 * Fetches the Pro status for the current authenticated user.
 * Returns { isPro: false, loading: false } when no access token is available.
 */
export function useProStatus(accessToken: string | null | undefined): ProStatus {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!accessToken) {
      setIsPro(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    getProStatus(accessToken)
      .then(({ is_pro }) => {
        if (!cancelled) setIsPro(is_pro);
      })
      .catch(() => {
        if (!cancelled) setIsPro(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [accessToken]);

  return { isPro, loading };
}

