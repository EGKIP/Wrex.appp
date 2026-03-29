import type {
  AnalyzeResponse,
  GrammarCheckResponse,
  HumanizeResponse,
  ImproveResponse,
  SubmissionList,
  WaitlistResponse,
} from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

/** Typed error that carries the HTTP status code for UI branching (e.g. 429 quota wall). */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
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

  const response = await fetch(`${API_BASE_URL}/analyze`, {
    method: "POST",
    headers,
    body: JSON.stringify({ text, rubric: rubric ?? null }),
  });

  return handleResponse<AnalyzeResponse>(response);
}

export async function joinWaitlist(email: string): Promise<WaitlistResponse> {
  const response = await fetch(`${API_BASE_URL}/waitlist`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email }),
  });

  return handleResponse<WaitlistResponse>(response);
}

export async function getHistory(accessToken: string): Promise<SubmissionList> {
  const response = await fetch(`${API_BASE_URL}/history`, {
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
  const response = await fetch(`${API_BASE_URL}/history/${id}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });
  await handleResponse<{ message: string }>(response);
}

export async function getProStatus(accessToken: string): Promise<{ is_pro: boolean }> {
  const response = await fetch(`${API_BASE_URL}/pro/status`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  return handleResponse<{ is_pro: boolean }>(response);
}

export async function createCheckoutSession(accessToken: string): Promise<{ url: string }> {
  const response = await fetch(`${API_BASE_URL}/pro/checkout`, {
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
  const response = await fetch(`${API_BASE_URL}/grammar-check`, {
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
  const response = await fetch(`${API_BASE_URL}/pro/improve`, {
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
): Promise<HumanizeResponse> {
  const response = await fetch(`${API_BASE_URL}/pro/humanize`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ text }),
  });
  return handleResponse<HumanizeResponse>(response);
}
