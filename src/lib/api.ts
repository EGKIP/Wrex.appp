import type { AnalyzeResponse, SubmissionList, WaitlistResponse } from "../types";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { detail?: string }
      | null;
    throw new Error(payload?.detail ?? "Something went wrong.");
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
