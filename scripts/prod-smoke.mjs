const FRONTEND_URL = process.env.WREX_FRONTEND_URL ?? "https://wrex.app";
const API_BASE_URL = process.env.WREX_API_BASE_URL;
const REQUEST_TIMEOUT_MS = 15_000;

function requireApiBaseUrl() {
  if (API_BASE_URL) {
    return API_BASE_URL.replace(/\/+$/, "");
  }

  throw new Error(
    "Set WREX_API_BASE_URL to the current Render backend URL before running production smoke checks.",
  );
}

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
  const resolvedApiBaseUrl = (() => {
    try {
      return requireApiBaseUrl();
    } catch (error) {
      failures.push(formatError(error));
      return null;
    }
  })();

  const frontendHtml = await expectText(FRONTEND_URL, "Frontend").catch(
    (error) => {
      failures.push(error.message);
      return null;
    },
  );

  if (frontendHtml && !frontendHtml.includes('<div id="root"></div>')) {
    failures.push("Frontend HTML is missing the app root container.");
  }

  const health = resolvedApiBaseUrl
    ? await expectJson(
        `${resolvedApiBaseUrl}/health`,
        undefined,
        "Backend health",
      ).catch((error) => {
        failures.push(error.message);
        return null;
      })
    : null;

  if (health && health.status !== "ok") {
    failures.push(
      `Backend health returned unexpected payload: ${JSON.stringify(health)}`,
    );
  }

  if (health && typeof health.app !== "string") {
    failures.push("Backend health response is missing app metadata.");
  }

  if (health && typeof health.version !== "string") {
    failures.push("Backend health response is missing version metadata.");
  }

  if (health && typeof health.timestamp_utc !== "string") {
    failures.push("Backend health response is missing timestamp metadata.");
  }

  const analyzePayload = {
    text: "This quick smoke test checks that Wrex can analyze a short authentic sample without using paid features.",
  };

  const analyze = resolvedApiBaseUrl
    ? await expectJson(
        `${resolvedApiBaseUrl}/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(analyzePayload),
        },
        "Analyze smoke test",
      ).catch((error) => {
        failures.push(error.message);
        return null;
      })
    : null;

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
  console.log(`- Backend: ${resolvedApiBaseUrl}`);
  console.log(`- Analyze score: ${analyze.score}`);
  console.log(`- Analyze words: ${analyze.stats.word_count}`);
}

await main();
