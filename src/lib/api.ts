import type {
  AnalyzeResponse,
  GrammarCheckResponse,
  HumanizeResponse,
  ImproveResponse,
  ProStatusResponse,
  RubricRewriteResponse,
  SubmissionList,
  WaitlistResponse,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

/** Typed error that carries the HTTP status code for UI branching. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildNetworkErrorMessage(): string {
  if (!import.meta.env.PROD) {
    return "Wrex can't reach the local API right now. Start the backend server and try again.";
  }

  if (/^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?$/i.test(API_BASE_URL)) {
    return "This build points to a local API URL. Confirm VITE_API_BASE_URL in Vercel, then redeploy the frontend.";
  }

  return "Wrex can't reach the server right now. Check your connection and try again in a moment.";
}

async function fetchWithApiErrors(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    const message =
      error instanceof DOMException && error.name === "AbortError"
        ? "The request took too long. Try again."
        : buildNetworkErrorMessage();
    throw new ApiError(503, message);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new ApiError(
      response.status,
      payload?.detail ?? "Something went wrong.",
    );
  }

  return (await response.json()) as T;
}

export async function analyzeText(
  text: string,
  rubric?: string,
  accessToken?: string | null,
): Promise<AnalyzeResponse> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (accessToken) {
    headers["Authorization"] = `Bearer ${accessToken}`;
  }

  const response = await fetchWithApiErrors(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, rubric: rubric ?? null }),
  });

  return handleResponse<AnalyzeResponse>(response);
}

export async function joinWaitlist(email: string): Promise<WaitlistResponse> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/waitlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return handleResponse<WaitlistResponse>(response);
}

export async function getHistory(accessToken: string): Promise<SubmissionList> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/history`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  return handleResponse<SubmissionList>(response);
}

export async function deleteHistoryItem(
  id: string,
  accessToken: string,
): Promise<void> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/history/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await handleResponse<{ message: string }>(response);
}

export async function getProStatus(accessToken: string): Promise<ProStatusResponse> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/pro/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return handleResponse<ProStatusResponse>(response);
}

/** Call after checkout completes — syncs is_pro directly from Stripe in case webhook was delayed. */
export async function syncSubscription(accessToken: string): Promise<ProStatusResponse> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/pro/sync-subscription`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return handleResponse<ProStatusResponse>(response);
}

export async function createCheckoutSession(accessToken: string): Promise<{ client_secret: string }> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/pro/checkout`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return handleResponse<{ client_secret: string }>(response);
}

export async function createBillingPortalSession(accessToken: string): Promise<{ url: string }> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/pro/billing-portal`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  return handleResponse<{ url: string }>(response);
}

export async function checkGrammar(
  text: string,
  language = "en-US",
): Promise<GrammarCheckResponse> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/grammar-check`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text, language }),
  });
  return handleResponse<GrammarCheckResponse>(response);
}

export async function proImprove(
  text: string,
  rubric: string | undefined,
  accessToken: string,
): Promise<ImproveResponse> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/pro/improve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text, rubric: rubric ?? null }),
  });
  return handleResponse<ImproveResponse>(response);
}

export async function proHumanize(
  text: string,
  accessToken: string,
  tone: string = "natural",
): Promise<HumanizeResponse> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/pro/humanize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text, tone }),
  });
  return handleResponse<HumanizeResponse>(response);
}

export async function proRubricRewrite(
  text: string,
  rubric: string,
  accessToken: string,
): Promise<RubricRewriteResponse> {
  const response = await fetchWithApiErrors(`${API_BASE_URL}/pro/rubric-rewrite`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text, rubric }),
  });
  return handleResponse<RubricRewriteResponse>(response);
}
