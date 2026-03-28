import { useAction, useMutation, useQuery } from "convex/react";
import { useCallback, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { AddCard } from "./add-card";
import { TAB_CLASS } from "./class-names";
import { ImageCard, TextCard, VoiceCard } from "./mind-card-views";
import { Sidebar } from "./sidebar";
import type { NewCardPayload } from "./types";

const DEFAULT_MIRROR_PROMPT =
	"Given everything in my notes, what should I focus on this week?";

export default function MindApp() {
	const [search, setSearch] = useState("");
	const [mirrorOpen, setMirrorOpen] = useState(false);
	const [mirrorPrompt, setMirrorPrompt] = useState(DEFAULT_MIRROR_PROMPT);
	const [mirrorLoading, setMirrorLoading] = useState(false);
	const [mirrorReport, setMirrorReport] = useState("");
	const [mirrorErr, setMirrorErr] = useState("");
	const listArgs = search.trim() ? { search: search.trim() } : {};
	const cards = useQuery(api.mindCards.listCards, listArgs);
	const createCard = useMutation(api.mindCards.createCard);
	const removeCard = useMutation(api.mindCards.deleteCard);
	const classifyCard = useAction(api.mindCards.classifyCard);
	const runMindMirror = useAction(api.mindMirror.runAnalysis);

	const addCard = useCallback(
		async (partial: NewCardPayload) => {
			const id = await createCard({
				type: partial.type,
				text: partial.text,
				imageData: partial.imageData,
				audioData: partial.audioData,
				audioDurationSeconds: partial.audioDuration,
			});
			void classifyCard({ id }).catch(() => {});
		},
		[createCard, classifyCard],
	);

	const deleteCard = useCallback(
		async (id: Id<"mindCards">) => {
			await removeCard({ id });
		},
		[removeCard],
	);

	async function submitMindMirror() {
		const trimmed = mirrorPrompt.trim();
		if (trimmed.length < 4 || mirrorLoading) return;
		setMirrorLoading(true);
		setMirrorErr("");
		setMirrorReport("");
		try {
			const out = await runMindMirror({ request: trimmed });
			setMirrorReport(out.report);
		} catch (e) {
			setMirrorErr(e instanceof Error ? e.message : "Mind Mirror failed.");
		} finally {
			setMirrorLoading(false);
		}
	}

	if (cards === undefined) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center bg-[#f7f7f5] text-[#999]">
				Loading…
			</div>
		);
	}

	return (
		<div className="font-[var(--font-body)] flex min-h-[calc(100dvh-1px)] bg-[#f7f7f5] text-sm text-[#1a1a1a]">
			<Sidebar />
			<div className="ml-[60px] flex min-h-[calc(100dvh-1px)] flex-1 flex-col">
				<header className="sticky top-0 z-30 flex h-[60px] items-center justify-between border-b border-[#ebebeb] bg-[rgba(247,247,245,0.9)] px-8 backdrop-blur-[10px]">
					<div className="flex max-w-[520px] flex-1 items-center gap-[10px]">
						<svg
							aria-hidden="true"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="1.5"
							width="18"
							height="18"
							className="flex-shrink-0 text-[#ccc]"
						>
							<circle cx="11" cy="11" r="7" />
							<path d="M21 21l-4.35-4.35" strokeLinecap="round" />
						</svg>
						<input
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search your memories..."
							className="flex-1 border-none bg-transparent p-0 font-serif text-[22px] font-light italic tracking-[-0.01em] text-[#aaa] outline-none placeholder:text-[#ccc] focus:text-[#333]"
							aria-label="Search notes"
						/>
					</div>
					<nav className="flex items-center gap-0.5">
						<button
							type="button"
							className={`${TAB_CLASS} bg-[#ebebeb] text-[#1a1a1a]`}
						>
							Everything
						</button>
						<button type="button" className={TAB_CLASS}>
							Spaces
						</button>
						<button type="button" className={TAB_CLASS}>
							Serendipity
						</button>
						<button
							type="button"
							className={`${TAB_CLASS} ${mirrorOpen ? "bg-[#ebebeb] text-[#1a1a1a]" : ""}`}
							onClick={() => setMirrorOpen((o) => !o)}
						>
							Mind Mirror
						</button>
					</nav>
				</header>

				{mirrorOpen ? (
					<div className="border-b border-[#ebebeb] bg-[#fafaf8] px-8 py-5">
						<p className="mb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-[#aaa]">
							Ask over all your cards
						</p>
						<textarea
							value={mirrorPrompt}
							onChange={(e) => setMirrorPrompt(e.target.value)}
							rows={3}
							className="font-[var(--font-body)] mb-2 w-full max-w-2xl resize-y rounded-[12px] border border-[#e8e8e8] bg-white p-3 text-[13px] text-[#333] outline-none focus:border-[#ccc]"
						/>
						<button
							type="button"
							onClick={() => void submitMindMirror()}
							disabled={mirrorPrompt.trim().length < 4 || mirrorLoading}
							className="cursor-pointer rounded-lg border-none bg-[#1a1a1a] px-4 py-2 text-[12px] font-semibold text-white transition-opacity duration-150 hover:enabled:opacity-75 disabled:cursor-default disabled:opacity-40"
						>
							{mirrorLoading ? "Running…" : "Run"}
						</button>
						{mirrorErr ? (
							<p className="mt-2 text-[12px] text-[#c2410c]">{mirrorErr}</p>
						) : null}
						{mirrorReport ? (
							<pre className="font-[var(--font-body)] mt-4 max-h-[min(420px,50vh)] overflow-auto whitespace-pre-wrap break-words rounded-[12px] border border-[#e8e8e8] bg-white p-4 text-[12px] leading-relaxed text-[#333]">
								{mirrorReport}
							</pre>
						) : null}
					</div>
				) : null}

				<main className="flex-1 p-[28px_32px]">
					<div className="columns-[260px] gap-4">
						<AddCard onAdd={addCard} />
						{cards.map((card) => {
							if (card.type === "text")
								return (
									<TextCard
										key={card._id}
										card={card}
										onDelete={() => void deleteCard(card._id)}
									/>
								);
							if (card.type === "image")
								return (
									<ImageCard
										key={card._id}
										card={card}
										onDelete={() => void deleteCard(card._id)}
									/>
								);
							if (card.type === "voice")
								return (
									<VoiceCard
										key={card._id}
										card={card}
										onDelete={() => void deleteCard(card._id)}
									/>
								);
							return null;
						})}
					</div>
					{cards.length === 0 && search.trim() ? (
						<p className="p-[60px_24px] text-center text-[14px] italic text-[#bbb]">
							Nothing matches &quot;{search}&quot;
						</p>
					) : null}
				</main>
			</div>
		</div>
	);
}
