import { v } from "convex/values";
import { action, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { authComponent } from "./betterAuth/auth";

const MAX_CARDS = 150;
const MAX_MARKDOWN_CHARS = 120_000;
const MIN_REQUEST_LEN = 3;
const MAX_REQUEST_LEN = 8000;

/** Text-only card row for Mind Mirror markdown export (no image/audio payloads). */
type MindMirrorCardRow = {
  _id: string;
  type: "text" | "image" | "voice";
  title?: string;
  sourceText?: string;
  text?: string;
  autoSummary?: string;
  autoTags: string[];
  autoThemes: string[];
  createdAt: number;
  updatedAt: number;
};

export const listCardsForMindMirror = internalQuery({
  args: { userId: v.string() },
  handler: async (ctx, args): Promise<MindMirrorCardRow[]> => {
    const cards = await ctx.db
      .query("mindCards")
      .withIndex("by_user_created_at", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(MAX_CARDS);

    return cards.map((card) => ({
      _id: card._id,
      type: card.type,
      title: card.title,
      sourceText: card.sourceText,
      text: card.text,
      autoSummary: card.autoSummary,
      autoTags: card.autoTags,
      autoThemes: card.autoThemes,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
    }));
  },
});

function escapeMdLine(value: string): string {
  return value.replace(/\r\n/g, "\n").trim();
}

function buildMindMirrorMarkdown(cards: MindMirrorCardRow[]): string {
  const lines: string[] = ["# Your mind cards", ""];
  for (const card of cards) {
    const title = card.title?.trim() || "Untitled";
    const safeTitle = title.replace(/\n/g, " ").slice(0, 200);
    lines.push(`## Card: ${safeTitle} (${card.type})`);
    lines.push("");
    lines.push(`- **Id:** ${card._id}`);
    lines.push(
      `- **Created:** ${new Date(card.createdAt).toISOString()} · **Updated:** ${new Date(card.updatedAt).toISOString()}`,
    );
    if (card.autoTags.length) {
      lines.push(`- **Tags:** ${card.autoTags.join(", ")}`);
    }
    if (card.autoThemes.length) {
      lines.push(`- **Themes:** ${card.autoThemes.join(", ")}`);
    }
    if (card.autoSummary?.trim()) {
      lines.push(`- **Summary:** ${escapeMdLine(card.autoSummary)}`);
    }
    lines.push("");
    const bodyParts = [card.sourceText, card.text].filter(
      (s): s is string => typeof s === "string" && s.trim().length > 0,
    );
    if (bodyParts.length > 0) {
      lines.push(escapeMdLine(bodyParts.join("\n\n")));
    } else if (card.type === "image") {
      lines.push("*(Image note — no text stored on this card.)*");
    } else if (card.type === "voice") {
      lines.push("*(Voice note — no transcript stored on this card.)*");
    } else {
      lines.push("*(Empty text card.)*");
    }
    lines.push("");
  }
  return lines.join("\n");
}

function analyzeUrl(base: string): string {
  const trimmed = base.trim().replace(/\/$/, "");
  if (trimmed.endsWith("/analyze")) {
    return trimmed;
  }
  return `${trimmed}/analyze`;
}

export const runAnalysis = action({
  args: {
    request: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) {
      throw new Error("Unauthenticated");
    }

    const request = args.request.trim();
    if (request.length < MIN_REQUEST_LEN) {
      throw new Error("Request is too short.");
    }
    if (request.length > MAX_REQUEST_LEN) {
      throw new Error("Request is too long.");
    }

    const baseUrl = process.env.MIND_MIRROR_URL?.trim();
    const secret = process.env.MIND_MIRROR_SECRET?.trim();
    if (!baseUrl || !secret) {
      throw new Error(
        "Mind Mirror is not configured. Set MIND_MIRROR_URL and MIND_MIRROR_SECRET on your Convex deployment.",
      );
    }

    const cards: MindMirrorCardRow[] = await ctx.runQuery(
      internal.mindMirror.listCardsForMindMirror,
      { userId: user._id },
    );

    let markdown = buildMindMirrorMarkdown(cards);
    if (markdown.length > MAX_MARKDOWN_CHARS) {
      markdown = `${markdown.slice(0, MAX_MARKDOWN_CHARS)}\n\n…(truncated)`;
    }
    if (markdown.trim().length === 0) {
      markdown = "# Your mind cards\n\n*(No cards yet — add a note first.)*\n";
    }

    const url = analyzeUrl(baseUrl);
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify({ notes: markdown, request }),
    });

    const rawText = await response.text();
    if (!response.ok) {
      throw new Error(
        `Mind Mirror service error (${response.status}): ${rawText.slice(0, 600)}`,
      );
    }

    let data: Record<string, unknown>;
    try {
      data = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      throw new Error("Mind Mirror returned invalid JSON.");
    }

    return {
      success: true as const,
      report: typeof data.report === "string" ? data.report : "",
      dna: data.dna ?? null,
      knowledgeStats: data.knowledge_stats ?? null,
      aggregatorStats: data.aggregator_stats ?? null,
    };
  },
});
