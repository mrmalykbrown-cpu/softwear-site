"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Crosshair } from "@/components/brand/crosshair";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[oddscope]", error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-col items-center px-5 py-24 text-center">
      <Crosshair className="size-12 text-navy-800" />
      <h1 className="mt-6 text-lg font-semibold text-slate-100">That broke on our side</h1>
      <p className="prose-measure mt-2 text-sm leading-relaxed text-slate-400">
        Nothing you did caused this and nothing was charged against your limits. Try again,
        and if it keeps happening tell us what you were doing.
      </p>
      {error.digest ? (
        <p className="tabular mt-3 text-xs text-slate-400">Reference: {error.digest}</p>
      ) : null}
      <Button onClick={reset} size="lg" className="mt-6">
        Try again
      </Button>
    </main>
  );
}
