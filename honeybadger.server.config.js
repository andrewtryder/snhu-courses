import Honeybadger from "@honeybadger-io/js";

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

const apiKey = process.env.HONEYBADGER_API_KEY;

if (apiKey) {
  Honeybadger.configure({
    apiKey,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV,
    revision: process.env.VERCEL_GIT_COMMIT_SHA,
    filters: SENSITIVE_FILTERS,
  });
}
