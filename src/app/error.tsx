"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Honeybadger } from "@honeybadger-io/react";
import "../../honeybadger.browser.config.js";

export default function Error({
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
    <main
      id="main-content"
      className="mx-auto flex min-h-[50vh] max-w-xl flex-col justify-center gap-4 px-6 py-16 text-on-background"
    >
      <h1 className="font-headline text-2xl font-semibold text-primary">
        Something went wrong
      </h1>
      <p className="text-on-surface-variant">
        An unexpected error occurred while loading this page. You can try again,
        or return to the home page.
      </p>
      {error.digest ? (
        <p className="text-sm text-on-surface-variant">
          Error reference: <code>{error.digest}</code>
        </p>
      ) : null}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reset()}
          className="rounded-md bg-primary px-4 py-2 text-on-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md border border-outline px-4 py-2 text-on-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
        >
          Go home
        </Link>
      </div>
    </main>
  );
}
