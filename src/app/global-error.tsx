"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Honeybadger } from "@honeybadger-io/react";
import "../../honeybadger.browser.config.js";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NEXT_PUBLIC_HONEYBADGER_API_KEY) {
      Honeybadger.notify(error);
    }
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
          background: "#fbf9f8",
          color: "#1b1c1c",
        }}
      >
        <main
          style={{
            maxWidth: "36rem",
            margin: "0 auto",
            padding: "4rem 1.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <h1 style={{ fontSize: "1.5rem", color: "#001d59", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ color: "#444652", margin: 0 }}>
            A critical error occurred. Please try again, or reload the page.
          </p>
          {error.digest ? (
            <p style={{ color: "#444652", fontSize: "0.875rem", margin: 0 }}>
              Error reference: <code>{error.digest}</code>
            </p>
          ) : null}
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                background: "#001d59",
                color: "#ffffff",
                border: "none",
                borderRadius: "0.375rem",
                padding: "0.5rem 1rem",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
            <Link
              href="/"
              style={{
                border: "1px solid #747683",
                borderRadius: "0.375rem",
                padding: "0.5rem 1rem",
                color: "#1b1c1c",
                textDecoration: "none",
              }}
            >
              Go home
            </Link>
          </div>
        </main>
      </body>
    </html>
  );
}
