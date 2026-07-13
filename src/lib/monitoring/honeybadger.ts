import Honeybadger from "@honeybadger-io/js";

export type ReportServerErrorOptions = {
  component?: string;
  action?: string;
  context?: Record<string, unknown>;
  tags?: string[];
};

const SENSITIVE_FILTERS = [
  "authorization",
  "cookie",
  "password",
  "token",
  "secret",
  "cron_secret",
  "CRON_SECRET",
  "postgres",
  "POSTGRES_URL",
  "honeybadger",
  "HONEYBADGER_API_KEY",
  "NEXT_PUBLIC_HONEYBADGER_API_KEY",
  "api_key",
  "apiKey",
];

function ensureConfigured(): boolean {
  const apiKey = process.env.HONEYBADGER_API_KEY;
  if (!apiKey) {
    return false;
  }

  if (!Honeybadger.config.apiKey) {
    Honeybadger.configure({
      apiKey,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
      revision: process.env.VERCEL_GIT_COMMIT_SHA,
      filters: SENSITIVE_FILTERS,
    });
  }

  return true;
}

function toError(error: unknown): Error {
  if (error instanceof Error) {
    return error;
  }
  return new Error(typeof error === "string" ? error : String(error));
}

/**
 * Report an error to Honeybadger from server code.
 * Never throws; no-ops when HONEYBADGER_API_KEY is absent.
 */
export async function reportServerError(
  error: unknown,
  options: ReportServerErrorOptions = {}
): Promise<void> {
  try {
    if (!ensureConfigured()) {
      return;
    }

    const noticeError = toError(error);
    const tags = options.tags?.filter(Boolean);

    await Honeybadger.notifyAsync(noticeError, {
      component: options.component,
      action: options.action,
      context: options.context,
      tags: tags?.length ? tags.join(",") : undefined,
    });
  } catch {
    // Monitoring must never break application flow.
  }
}
