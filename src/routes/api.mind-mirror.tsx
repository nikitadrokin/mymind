import { createFileRoute } from "@tanstack/react-router";

import path from "node:path";
import { mkdtemp, readFile, writeFile, readdir, rm, stat, unlink } from "node:fs/promises";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { tmpdir } from "node:os";

const execFileAsync = promisify(execFile);

type MindMirrorRequestBody = {
  request?: unknown;
  notes?: unknown;
};

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".turbo",
  ".next",
  "dist",
  "dist-ssr",
  ".tanstack",
  ".vite",
  "coverage",
  "bun.lockb",
  ".venv",
  "__pycache__",
]);

const ALLOWED_EXTENSIONS = new Set([
  ".md",
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".json",
  ".css",
  ".cjs",
  ".mjs",
  ".py",
  ".toml",
  ".sql",
  ".html",
]);

const ROOT_NOTES_FILES = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "package.json",
  "vite.config.ts",
  "tsconfig.json",
];

const INCLUDE_DIRS = ["src", "convex", "python-ai/jakhangirs-core"];
const MAX_FILE_SIZE_BYTES = 20000;
const MAX_NOTES_BYTES = 150000;
const PYTHON_BINARIES = ["python3", "python"];

function stripAnsi(input: string): string {
  return input.replace(/\x1b\[[0-9;]*m/g, "");
}

function projectRootFromRoute(): string {
  const thisFile = fileURLToPath(import.meta.url);
  return path.dirname(path.dirname(path.dirname(thisFile)));
}

function isTextFile(filePath: string): boolean {
  const base = path.basename(filePath);
  if (ROOT_NOTES_FILES.includes(base)) {
    return true;
  }

  const ext = path.extname(filePath).toLowerCase();
  return ALLOWED_EXTENSIONS.has(ext);
}

function shouldSkipDir(name: string): boolean {
  return SKIP_DIRS.has(name) || name.startsWith(".");
}

async function readImplementationNotes(root: string): Promise<string> {
  const chunks: string[] = [
    "# Project notes generated from mymind-new",
    "",
    `Generated on: ${new Date().toISOString()}`,
    "",
  ];
  let byteCount = 0;

  const addChunk = async (fileName: string, absPath: string) => {
    const fileStats = await stat(absPath);
    if (!fileStats.isFile() || fileStats.size > MAX_FILE_SIZE_BYTES) {
      return;
    }
    if (!isTextFile(absPath)) {
      return;
    }

    const content = await readFile(absPath, "utf-8");
    const section = `## ${fileName}\n\n\`\`\`\n${content}\n\`\`\`\n`;
    if (byteCount + Buffer.byteLength(section, "utf-8") > MAX_NOTES_BYTES) {
      const remaining = Math.max(0, MAX_NOTES_BYTES - byteCount);
      if (remaining > 200) {
        const cut = content.slice(0, remaining);
        chunks.push(`## ${fileName}\n\n\`\`\`\n${cut}\n\`\`\`\n`);
        byteCount += remaining;
      }
      return;
    }

    chunks.push(section);
    byteCount += Buffer.byteLength(section, "utf-8");
  };

  const walk = async (dir: string) => {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const current = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (shouldSkipDir(entry.name)) {
          continue;
        }
        await walk(current);
        continue;
      }

      if (entry.isFile()) {
        await addChunk(path.relative(root, current), current);
      }
    }
  };

  for (const rel of ROOT_NOTES_FILES) {
    const filePath = path.join(root, rel);
    try {
      await addChunk(rel, filePath);
    } catch {
      // File missing or not readable: ignore.
    }
  }

  for (const dir of INCLUDE_DIRS) {
    const absDir = path.join(root, dir);
    try {
      await walk(absDir);
    } catch {
      // Optional source paths may not exist in all environments.
    }
  }

  return chunks.join("\n");
}

async function runMindMirror(notesPath: string, request: string): Promise<string> {
  const bridgePath = path.join(
    projectRootFromRoute(),
    "python-ai",
    "jakhangirs-core",
    "bridge.py",
  );

  const execErrors: string[] = [];

  for (const binary of PYTHON_BINARIES) {
    try {
      const { stdout } = await execFileAsync(
        binary,
        [bridgePath, "--notes", notesPath, "--request", request],
        {
          env: process.env,
          maxBuffer: 12_000_000,
          timeout: 120000,
        },
      );
      return stripAnsi(String(stdout ?? ""));
  } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown command execution error.";
      execErrors.push(`${binary}: ${message}`);
    }
  }

  throw new Error(execErrors.join(" | "));
}

async function runHandler({ request }: { request: Request }) {
  const body = (await request.json().catch(() => ({}))) as MindMirrorRequestBody;
  const requestText = typeof body.request === "string" ? body.request.trim() : "";
  const overrideNotes = typeof body.notes === "string" ? body.notes.trim() : "";

  if (!requestText) {
    return new Response(
      JSON.stringify({ success: false, error: "`request` is required." }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      },
    );
  }

  const root = projectRootFromRoute();
  const notes = `${overrideNotes ? `## Additional context\n\n${overrideNotes}\n\n` : ""}${await readImplementationNotes(root)}`;

  const tmpDir = await mkdtemp(path.join(tmpdir(), "mymind-mind-mirror-"));
  const notesPath = path.join(tmpDir, "implementation-notes.md");
  await writeFile(notesPath, notes, "utf-8");

  try {
    const stdout = await runMindMirror(notesPath, requestText);
    const parsed = (() => {
      try {
        const json = JSON.parse(stdout);
        return {
          success: true,
          output: typeof json.report === "string" ? json.report : stdout,
          dna: json.dna,
          knowledgeStats: json.knowledge_stats,
          aggregatorStats: json.aggregator_stats,
        };
      } catch {
        return { success: true, output: stripAnsi(stdout) };
      }
    })();

    return new Response(JSON.stringify(parsed), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to run the Mind Mirror pipeline.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  } finally {
    await unlink(notesPath).catch(() => {});
    await rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  }
}

export const Route = createFileRoute("/api/mind-mirror")({
  server: {
    handlers: { POST: runHandler },
  },
});
