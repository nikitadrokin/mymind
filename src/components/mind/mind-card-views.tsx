import { useRef, useState } from "react";
import {
	CARD_CLASS,
	DELETE_BUTTON_CLASS,
	VOICE_BAR_CLASS,
} from "./class-names";
import { formatTime } from "./format-time";
import type { MindCardDoc } from "./types";

function AiMeta({ card }: { card: MindCardDoc }) {
	if (card.autoCategoryState === "pending") {
		return <p className="mt-2 text-[11px] text-[#aaa] italic">Structuring…</p>;
	}
	if (card.autoCategoryState === "failed") {
		return (
			<p className="mt-2 text-[11px] text-[#c2410c]">
				{card.autoCategoryReason ?? "Could not auto-structure."}
			</p>
		);
	}
	if (card.autoCategoryState !== "ready") return null;
	return (
		<div className="mt-3 space-y-1.5 border-t border-[#f0f0f0] pt-3">
			{card.title ? (
				<p className="m-0 text-[12px] font-semibold text-[#444]">
					{card.title}
				</p>
			) : null}
			{card.autoSummary ? (
				<p className="m-0 text-[12px] leading-relaxed text-[#777]">
					{card.autoSummary}
				</p>
			) : null}
			<div className="flex flex-wrap gap-1">
				{card.autoCategory ? (
					<span className="rounded-full bg-[#f0f0f0] px-2 py-0.5 text-[10px] font-medium text-[#555]">
						{card.autoCategory}
					</span>
				) : null}
				{card.autoTags.slice(0, 6).map((tag) => (
					<span
						key={tag}
						className="rounded-full bg-[#eef6f5] px-2 py-0.5 text-[10px] text-[#2d6a5d]"
					>
						{tag}
					</span>
				))}
			</div>
		</div>
	);
}

export function TextCard({
	card,
	onDelete,
}: {
	card: MindCardDoc;
	onDelete: () => void;
}) {
	return (
		<div className={`${CARD_CLASS} group p-5`}>
			<button
				type="button"
				onClick={onDelete}
				className={DELETE_BUTTON_CLASS}
				aria-label="Delete note"
			>
				×
			</button>
			<p className="m-0 whitespace-pre-wrap break-words text-[14px] leading-[1.7] text-[#333]">
				{card.text}
			</p>
			<AiMeta card={card} />
		</div>
	);
}

export function ImageCard({
	card,
	onDelete,
}: {
	card: MindCardDoc;
	onDelete: () => void;
}) {
	const date = new Date(card.createdAt);
	const label = date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: "numeric",
	});
	const src = card.imageData ?? "";
	return (
		<div className={`${CARD_CLASS} group p-0`}>
			<button
				type="button"
				onClick={onDelete}
				className={DELETE_BUTTON_CLASS}
				aria-label="Delete image"
			>
				×
			</button>
			{src ? <img src={src} alt="" className="block h-auto w-full" /> : null}
			<div className="border-t border-[#f5f5f5] px-[14px] py-[10px]">
				<p className="m-0 text-[12px] text-[#999]">{label}</p>
				<AiMeta card={card} />
			</div>
		</div>
	);
}

export function VoiceCard({
	card,
	onDelete,
}: {
	card: MindCardDoc;
	onDelete: () => void;
}) {
	const [playing, setPlaying] = useState(false);
	const [currentTime, setCurrentTime] = useState(0);
	const audioRef = useRef<HTMLAudioElement>(null);
	const idStr = card._id;

	const bars = useRef(
		Array.from({ length: 24 }, (_, i) => {
			const seed = idStr.charCodeAt(i % idStr.length) || 0;
			return {
				id: `${idStr}-b${i}`,
				h: 6 + Math.abs(Math.sin(i * 1.1 + seed * 0.01)) * 18,
			};
		}),
	);

	function toggle() {
		const a = audioRef.current;
		if (!a) return;
		if (playing) a.pause();
		else void a.play();
	}

	const duration = card.audioDurationSeconds ?? 0;
	const progress = duration > 0 ? currentTime / duration : 0;
	const src = card.audioData ?? "";

	return (
		<div className={`${CARD_CLASS} group p-[18px]`}>
			<button
				type="button"
				onClick={onDelete}
				className={DELETE_BUTTON_CLASS}
				aria-label="Delete recording"
			>
				×
			</button>
			<audio
				ref={audioRef}
				src={src}
				onPlay={() => setPlaying(true)}
				onPause={() => setPlaying(false)}
				onEnded={() => {
					setPlaying(false);
					setCurrentTime(0);
				}}
				onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
			>
				<track kind="captions" />
			</audio>
			<div className="flex items-center gap-3">
				<button
					type="button"
					onClick={toggle}
					className="flex h-[34px] w-[34px] flex-shrink-0 cursor-pointer items-center justify-center rounded-full border-[1.5px] border-[#e0e0e0] bg-white text-[#333] transition-all duration-150 hover:border-[#aaa] hover:bg-[#fafafa]"
					aria-label={playing ? "Pause" : "Play"}
				>
					{playing ? (
						<svg
							aria-hidden="true"
							viewBox="0 0 24 24"
							fill="currentColor"
							width="14"
							height="14"
						>
							<rect x="5" y="3" width="5" height="18" rx="1" />
							<rect x="14" y="3" width="5" height="18" rx="1" />
						</svg>
					) : (
						<svg
							aria-hidden="true"
							viewBox="0 0 24 24"
							fill="currentColor"
							width="14"
							height="14"
						>
							<polygon points="5,3 20,12 5,21" />
						</svg>
					)}
				</button>
				<div className="flex h-8 flex-1 items-center gap-[2px]">
					{bars.current.map(({ id, h }, i) => {
						const active = i / bars.current.length <= progress;
						return (
							<div
								key={id}
								className={VOICE_BAR_CLASS}
								style={{
									height: `${h}px`,
									background: active ? "#111" : "#ddd",
								}}
							/>
						);
					})}
				</div>
				<span className="flex-shrink-0 text-[11px] text-[#bbb] [font-variant-numeric:tabular-nums]">
					{duration > 0 ? formatTime(duration) : formatTime(currentTime)}
				</span>
			</div>
			{card.text?.trim() ? (
				<p className="mt-3 mb-0 whitespace-pre-wrap break-words text-[13px] leading-[1.65] text-[#444]">
					{card.text}
				</p>
			) : null}
			<AiMeta card={card} />
		</div>
	);
}
