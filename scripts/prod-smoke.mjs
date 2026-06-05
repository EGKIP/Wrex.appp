const FRONTEND_URL = process.env.WREX_FRONTEND_URL ?? "https://wrex.app";
const API_BASE_URL =
  process.env.WREX_API_BASE_URL ?? "https://wrex-appp.onrender.com";
const REQUEST_TIMEOUT_MS = 15_000;

function withTimeout(url, init = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  return fetch(url, { ...init, signal: controller.signal }).finally(() => {
    clearTimeout(timeout);
  });
}

function formatError(error) {
  if (error instanceof Error) {
    const cause =
      error.cause instanceof Error
        ? error.cause.message
        : typeof error.cause === "string"
          ? error.cause
          : null;
    return cause ? `${error.message} (${cause})` : error.message;
  }

  return String(error);
}

async function expectJson(url, init, label) {
  let response;
  try {
    response = await withTimeout(url, init);
  } catch (error) {
    throw new Error(`${label} request failed: ${formatError(error)}`);
  }

  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error(`${label} returned invalid JSON: ${formatError(error)}`);
  }
}

async function expectText(url, label) {
  let response;
  try {
    response = await withTimeout(url);
  } catch (error) {
    throw new Error(`${label} request failed: ${formatError(error)}`);
  }

  if (!response.ok) {
    throw new Error(`${label} returned HTTP ${response.status}`);
  }

  return response.text();
}

async function main() {
  const failures = [];

  const frontendHtml = await expectText(FRONTEND_URL, "Frontend").catch(
    (error) => {
      failures.push(error.message);
      return null;
    },
  );

  if (frontendHtml && !frontendHtml.includes("<div id=\"root\"></div>")) {
    failures.push("Frontend HTML is missing the app root container.");
  }

  const health = await expectJson(
    `${API_BASE_URL}/health`,
    undefined,
    "Backend health",
  ).catch((error) => {
    failures.push(error.message);
    return null;
  });

  if (health && health.status !== "ok") {
    failures.push(`Backend health returned unexpected payload: ${JSON.stringify(health)}`);
  }

  const analyzePayload = {
    text: "This quick smoke test checks that Wrex can analyze a short authentic sample without using paid features.",
  };

  const analyze = await expectJson(
    `${API_BASE_URL}/analyze`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(analyzePayload),
    },
    "Analyze smoke test",
  ).catch((error) => {
    failures.push(error.message);
    return null;
  });

  if (analyze) {
    if (typeof analyze.score !== "number") {
      failures.push("Analyze smoke test response is missing a numeric score.");
    }

    if (!analyze.stats || typeof analyze.stats.word_count !== "number") {
      failures.push("Analyze smoke test response is missing stats.word_count.");
    }
  }

  if (failures.length > 0) {
    console.error("Production smoke failed:");
    for (const failure of failures) {
      console.error(`- ${failure}`);
    }
    process.exit(1);
  }

  console.log("Production smoke passed.");
  console.log(`- Frontend: ${FRONTEND_URL}`);
  console.log(`- Backend: ${API_BASE_URL}`);
  console.log(`- Analyze score: ${analyze.score}`);
  console.log(`- Analyze words: ${analyze.stats.word_count}`);
}

await main();
