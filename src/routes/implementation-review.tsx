import { createFileRoute, redirect } from "@tanstack/react-router";
import { FormEvent, useMemo, useState } from "react";

interface MindMirrorResponse {
  success: boolean;
  output?: string;
  error?: string;
  dna?: unknown;
  knowledgeStats?: unknown;
  aggregatorStats?: unknown;
}

export const Route = createFileRoute("/implementation-review")({
  beforeLoad: ({ context }) => {
    if (context.isAuthenticated === false) {
      throw redirect({ to: "/login" });
    }
  },
  component: ImplementationReviewPage,
});

const DEFAULT_REQUEST =
  "Review the current app implementation and suggest the top 10 most important improvements.";

function isSuccessResponse(value: Record<string, unknown>): value is MindMirrorResponse {
  return value.success === true || value.success === false;
}

function ImplementationReviewPage() {
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [extraNotes, setExtraNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const canRun = request.trim().length > 10 && !isLoading;
  const payloadLines = useMemo(
    () => ({
      request,
      notes: extraNotes.trim(),
    }),
    [request, extraNotes],
  );

  const runReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canRun) return;

    setIsLoading(true);
    setError("");
    setMessage("Running AI review…");
    setResult("");

    try {
      const response = await fetch("/api/mind-mirror", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          request: payloadLines.request.trim(),
          ...(payloadLines.notes ? { notes: payloadLines.notes } : {}),
        }),
      });

      const body = (await response.json().catch(() => null)) as Record<string, unknown>;
      if (!response.ok) {
        const fallback = response.statusText;
        const responseError = isSuccessResponse(body) && body.error ? body.error : fallback;
        throw new Error(String(responseError ?? "Failed to run AI review."));
      }

      if (!isSuccessResponse(body) || body.success !== true) {
        throw new Error(
          String(isSuccessResponse(body) && body.error ? body.error : "Invalid response."),
        );
      }

      setResult(String(body.output ?? ""));
      setMessage("Review complete.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
      setMessage("");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="page-wrap px-4 py-10">
      <section className="island-shell rounded-2xl p-6 sm:p-8">
        <p className="island-kicker mb-2">AI implementation review</p>
        <h1 className="mb-4 text-3xl font-semibold text-[var(--sea-ink)]">
          Review this implementation with JIT AI
        </h1>
        <p className="mb-6 max-w-3xl text-sm leading-7 text-[var(--sea-ink-soft)]">
          This routes your app source snapshot through the merged Mind Mirror pipeline to
          produce a role-based implementation review and recommendations.
        </p>

        <form onSubmit={runReview} className="mb-6 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[var(--sea-ink)]">Review request</span>
            <textarea
              rows={4}
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--sea-ink-soft)] focus:border-[rgba(79,184,178,0.8)]"
              placeholder="What should the AI focus on?"
            />
          </label>

          <label className="grid gap-1">
            <span className="text-sm font-medium text-[var(--sea-ink)]">
              Optional extra context
            </span>
            <textarea
              rows={3}
              value={extraNotes}
              onChange={(event) => setExtraNotes(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--sea-ink-soft)] focus:border-[rgba(79,184,178,0.8)]"
              placeholder="Add any file/path/feature-specific context."
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[var(--sea)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canRun}
            >
              {isLoading ? "Running review..." : "Run AI review"}
            </button>
          </div>
        </form>

        {message && <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">{message}</p>}
        {error && <p className="mb-3 text-sm text-[crimson]">{error}</p>}

        {result && (
          <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[#f6f6f4] p-4 text-xs leading-relaxed text-[var(--sea-ink)]">
            {result}
          </pre>
        )}
      </section>
    </main>
  );
}
