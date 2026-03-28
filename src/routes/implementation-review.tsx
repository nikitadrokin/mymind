import { createFileRoute, redirect } from "@tanstack/react-router";
import { useAction } from "convex/react";
import { useMemo, useState } from "react";
import type { FormEvent } from "react";
import { api } from "../../convex/_generated/api";

interface MindMirrorActionResult {
  success: true;
  report: string;
  dna: unknown;
  knowledgeStats: unknown;
  aggregatorStats: unknown;
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
  "Given my mind cards, what patterns do you see and what should I prioritize this week?";

function ImplementationReviewPage() {
  const runMirror = useAction(api.mindMirror.runAnalysis);
  const [request, setRequest] = useState(DEFAULT_REQUEST);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [meta, setMeta] = useState<Pick<
    MindMirrorActionResult,
    "dna" | "knowledgeStats" | "aggregatorStats"
  > | null>(null);

  const canRun = request.trim().length > 10 && !isLoading;
  const payloadRequest = useMemo(() => request.trim(), [request]);

  const runReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canRun) return;

    setIsLoading(true);
    setError("");
    setMessage("Running Mind Mirror over your cards…");
    setResult("");
    setMeta(null);

    try {
      const body = (await runMirror({
        request: payloadRequest,
      })) as MindMirrorActionResult;
      setResult(body.report);
      setMeta({
        dna: body.dna,
        knowledgeStats: body.knowledgeStats,
        aggregatorStats: body.aggregatorStats,
      });
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
        <p className="island-kicker mb-2">Mind Mirror</p>
        <h1 className="mb-4 text-3xl font-semibold text-[var(--sea-ink)]">
          Swarm analysis over your cards
        </h1>
        <p className="mb-6 max-w-3xl text-sm leading-7 text-[var(--sea-ink-soft)]">
          Runs the profiler → JIT swarm → aggregator pipeline on your Convex mind cards via a hosted
          Python service (configure <code className="text-[12px]">MIND_MIRROR_URL</code> and{" "}
          <code className="text-[12px]">MIND_MIRROR_SECRET</code> on Convex).
        </p>

        <form onSubmit={runReview} className="mb-6 grid gap-4">
          <label className="grid gap-1">
            <span className="text-sm font-medium text-[var(--sea-ink)]">Request</span>
            <textarea
              rows={4}
              value={request}
              onChange={(event) => setRequest(event.target.value)}
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--sea-ink-soft)] focus:border-[rgba(79,184,178,0.8)]"
              placeholder="What should the AI focus on?"
            />
          </label>

          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-xl bg-[var(--sea)] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={!canRun}
            >
              {isLoading ? "Running…" : "Run Mind Mirror"}
            </button>
          </div>
        </form>

        {message && <p className="mb-3 text-sm text-[var(--sea-ink-soft)]">{message}</p>}
        {error && <p className="mb-3 text-sm text-[crimson]">{error}</p>}

        {meta ? (
          <details className="mb-4 rounded-xl border border-[var(--line)] bg-[var(--chip-bg)] p-3 text-[12px] text-[var(--sea-ink-soft)]">
            <summary className="cursor-pointer font-medium text-[var(--sea-ink)]">
              Diagnostics
            </summary>
            <pre className="mt-2 max-h-[240px] overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">
              {JSON.stringify(meta, null, 2)}
            </pre>
          </details>
        ) : null}

        {result && (
          <pre className="overflow-x-auto rounded-xl border border-[var(--line)] bg-[#f6f6f4] p-4 text-xs leading-relaxed text-[var(--sea-ink)]">
            {result}
          </pre>
        )}
      </section>
    </main>
  );
}
