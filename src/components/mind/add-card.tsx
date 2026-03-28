import {
	type KeyboardEvent,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { ADD_CARD_CLASS, CARD_CLASS, TYPE_BUTTON_CLASS } from "./class-names";
import { formatTime } from "./format-time";
import type { AddMode, NewCardPayload } from "./types";

export function AddCard({
	onAdd,
}: {
	onAdd: (card: NewCardPayload) => void | Promise<void>;
}) {
	const [mode, setMode] = useState<AddMode>(null);
	const [text, setText] = useState("");
	const [dragging, setDragging] = useState(false);
	const [recState, setRecState] = useState<
		"idle" | "recording" | "transcribing" | "done"
	>("idle");
	const [recSeconds, setRecSeconds] = useState(0);
	const [audioUrl, setAudioUrl] = useState<string | null>(null);
	const [audioData, setAudioData] = useState<string | null>(null);
	const [audioDuration, setAudioDuration] = useState(0);
	const [voiceTranscript, setVoiceTranscript] = useState("");
	const [transcribeError, setTranscribeError] = useState<string | null>(null);

	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const mediaRecorder = useRef<MediaRecorder | null>(null);
	const chunks = useRef<Blob[]>([]);
	const timer = useRef<ReturnType<typeof setInterval> | null>(null);
	const transcribeGenRef = useRef(0);
	const voiceBlobRef = useRef<Blob | null>(null);

	const runTranscription = useCallback(async (blob: Blob) => {
		transcribeGenRef.current += 1;
		const gen = transcribeGenRef.current;
		setRecState("transcribing");
		setTranscribeError(null);
		try {
			const { transcribeVoiceBlob } = await import("#/lib/transcribeVoiceBlob");
			const text = await transcribeVoiceBlob(blob);
			if (transcribeGenRef.current !== gen) return;
			setVoiceTranscript(text);
		} catch {
			if (transcribeGenRef.current !== gen) return;
			setTranscribeError(
				"Could not transcribe in the browser. Edit the text below or save audio only.",
			);
			setVoiceTranscript("");
		}
		if (transcribeGenRef.current === gen) {
			setRecState("done");
		}
	}, []);

	const startRecording = useCallback(async () => {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
			const mr = new MediaRecorder(stream);
			mediaRecorder.current = mr;
			chunks.current = [];

			mr.ondataavailable = (e) => chunks.current.push(e.data);
			mr.onstop = () => {
				for (const t of stream.getTracks()) t.stop();
				const blob = new Blob(chunks.current, { type: "audio/webm" });
				voiceBlobRef.current = blob;
				setAudioUrl((prev) => {
					if (prev) URL.revokeObjectURL(prev);
					return URL.createObjectURL(blob);
				});
				const reader = new FileReader();
				reader.onload = (ev) => {
					if (ev.target?.result) setAudioData(ev.target.result as string);
				};
				reader.readAsDataURL(blob);
				void runTranscription(blob);
			};

			mr.start();
			setRecState("recording");
			setRecSeconds(0);
			timer.current = setInterval(() => setRecSeconds((s) => s + 1), 1000);
		} catch {
			alert("Microphone access denied.");
			setMode(null);
		}
	}, [runTranscription]);

	useEffect(() => {
		if (mode === "text") {
			setTimeout(() => textareaRef.current?.focus(), 50);
		}
	}, [mode]);

	useEffect(() => {
		if (mode === "voice" && recState === "idle") {
			startRecording();
		}
	}, [mode, recState, startRecording]);

	function switchMode(m: AddMode) {
		transcribeGenRef.current += 1;
		if (mode === "voice" && recState === "recording") {
			if (timer.current) clearInterval(timer.current);
			mediaRecorder.current?.stop();
		}
		setMode((prev) => (prev === m ? null : m));
		setText("");
		setRecState("idle");
		setAudioUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return null;
		});
		setAudioData(null);
		setVoiceTranscript("");
		setTranscribeError(null);
		voiceBlobRef.current = null;
	}

	async function submitText() {
		const trimmed = text.trim();
		if (!trimmed) return;
		await onAdd({ type: "text", text: trimmed });
		setText("");
		setMode(null);
	}

	function handleTextKey(e: KeyboardEvent) {
		if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void submitText();
		if (e.key === "Escape") setMode(null);
	}

	async function handleFile(file: File) {
		if (!file.type.startsWith("image/")) return;
		const reader = new FileReader();
		reader.onload = async (ev) => {
			if (ev.target?.result) {
				await onAdd({ type: "image", imageData: ev.target.result as string });
				setMode(null);
			}
		};
		reader.readAsDataURL(file);
	}

	function stopRecording() {
		if (timer.current) clearInterval(timer.current);
		setAudioDuration(recSeconds);
		mediaRecorder.current?.stop();
	}

	async function saveVoice() {
		if (!audioData) return;
		const trimmed = voiceTranscript.trim();
		await onAdd({
			type: "voice",
			audioData,
			audioDuration,
			...(trimmed ? { text: trimmed } : {}),
		});
		transcribeGenRef.current += 1;
		setAudioUrl((prev) => {
			if (prev) URL.revokeObjectURL(prev);
			return null;
		});
		setAudioData(null);
		setVoiceTranscript("");
		setTranscribeError(null);
		voiceBlobRef.current = null;
		setMode(null);
		setRecState("idle");
	}

	function retryTranscription() {
		const blob = voiceBlobRef.current;
		if (!blob) return;
		void runTranscription(blob);
	}

	return (
		<div
			className={`${CARD_CLASS} ${ADD_CARD_CLASS} ${
				mode ? "border-[#d0d0d0] bg-white" : ""
			}`}
		>
			{!mode && (
				<>
					<p className="mb-2.5 text-[10px] font-black uppercase tracking-[0.1em] text-[#bbb]">
						ADD A NEW NOTE
					</p>
					<button
						type="button"
						className="mb-2.5 block w-full cursor-text border-none bg-transparent p-0 text-[14px] leading-[1.6] text-[#ccc] hover:text-[#aaa]"
						onClick={() => switchMode("text")}
					>
						Start typing here...
					</button>
				</>
			)}

			{mode === "text" && (
				<div className="flex flex-col">
					<textarea
						ref={textareaRef}
						value={text}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={handleTextKey}
						placeholder="What's on your mind..."
						className="font-[var(--font-body)] mb-2.5 w-full resize-none border-none bg-transparent p-0 text-[14px] leading-[1.7] text-[#1a1a1a] outline-none"
						rows={5}
					/>
					<div className="flex items-center justify-between">
						<span className="text-[11px] text-[#bbb]">
							⌘↵ save · esc cancel
						</span>
						<button
							type="button"
							onClick={() => void submitText()}
							disabled={!text.trim()}
							className="cursor-pointer rounded-lg border-none bg-[#1a1a1a] px-4 py-1.5 text-[12px] font-semibold text-[#fff] transition-opacity duration-150 hover:enabled:opacity-75 disabled:cursor-default disabled:opacity-25"
						>
							Save
						</button>
					</div>
				</div>
			)}

			{mode === "image" && (
				<label
					className={`mb-2.5 flex cursor-pointer flex-col items-center justify-center gap-[10px] rounded-[10px] border-[1.5px] border-dashed border-[#ddd] p-[32px_20px] text-[13px] text-[#bbb] transition-all duration-150 hover:border-[#aaa] hover:bg-[#f5f5f5] hover:text-[#888] ${
						dragging ? "border-[#aaa] bg-[#f5f5f5] text-[#888]" : ""
					}`}
					onDragOver={(e) => {
						e.preventDefault();
						setDragging(true);
					}}
					onDragLeave={() => setDragging(false)}
					onDrop={(e) => {
						e.preventDefault();
						setDragging(false);
						const f = e.dataTransfer.files[0];
						if (f) void handleFile(f);
					}}
				>
					<input
						ref={fileInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={(e) => {
							const f = e.target.files?.[0];
							if (f) void handleFile(f);
						}}
					/>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.4"
						width="28"
						height="28"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" />
						<circle cx="8.5" cy="8.5" r="1.5" />
						<path
							d="M21 15l-5-5L5 21"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
					<span>{dragging ? "Drop it" : "Click or drop image"}</span>
				</label>
			)}

			{mode === "voice" && (
				<div className="mb-[10px] flex flex-col gap-[10px]">
					{recState === "recording" && (
						<>
							<div className="flex items-center gap-2 text-[13px] text-[#555]">
								<span className="h-[7px] w-[7px] animate-pulse rounded-full bg-[#ef4444]" />
								<span className="text-[13px] text-[#888] [font-variant-numeric:tabular-nums]">
									{formatTime(recSeconds)}
								</span>
							</div>
							<button
								type="button"
								onClick={stopRecording}
								className="mt-3 self-start cursor-pointer rounded-lg border-none bg-[#1a1a1a] px-4 py-1.5 text-[12px] font-semibold text-[#fff] transition-opacity duration-150"
							>
								Stop
							</button>
						</>
					)}
					{recState === "transcribing" && (
						<p className="m-0 text-[13px] leading-[1.5] text-[#888]">
							Transcribing locally… First run downloads a small speech model to
							your browser.
						</p>
					)}
					{recState === "done" && audioUrl && (
						<>
							<audio src={audioUrl} controls className="w-full">
								<track kind="captions" />
							</audio>
							<label
								htmlFor="voice-transcript-draft"
								className="text-[10px] font-black uppercase tracking-[0.08em] text-[#bbb]"
							>
								Transcript
							</label>
							<textarea
								id="voice-transcript-draft"
								value={voiceTranscript}
								onChange={(e) => setVoiceTranscript(e.target.value)}
								placeholder="Transcript appears here; you can edit or paste from another tool."
								rows={4}
								className="font-[var(--font-body)] w-full resize-y rounded-[10px] border border-[#ebebeb] bg-[#fafafa] p-2.5 text-[13px] leading-[1.6] text-[#1a1a1a] outline-none focus:border-[#ccc]"
							/>
							{transcribeError ? (
								<p className="m-0 text-[12px] leading-[1.4] text-[#b45309]">
									{transcribeError}
								</p>
							) : null}
							<div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
								<div className="flex flex-wrap gap-2">
									<button
										type="button"
										onClick={() => {
											transcribeGenRef.current += 1;
											setAudioUrl((prev) => {
												if (prev) URL.revokeObjectURL(prev);
												return null;
											});
											setAudioData(null);
											setVoiceTranscript("");
											setTranscribeError(null);
											voiceBlobRef.current = null;
											setRecState("idle");
										}}
										className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-[#aaa] hover:text-[#555]"
									>
										Re-record
									</button>
									<button
										type="button"
										onClick={retryTranscription}
										className="cursor-pointer border-none bg-transparent p-0 text-[12px] text-[#888] hover:text-[#333]"
									>
										Transcribe again
									</button>
								</div>
								<button
									type="button"
									onClick={() => void saveVoice()}
									className="cursor-pointer rounded-lg border-none bg-[#1a1a1a] px-4 py-1.5 text-[12px] font-semibold text-[#fff] transition-opacity duration-150 hover:enabled:opacity-75"
								>
									Save
								</button>
							</div>
						</>
					)}
				</div>
			)}

			<div className="mt-1 flex items-center gap-1 border-t border-[#f0f0f0] pt-[10px]">
				<button
					type="button"
					className={`${TYPE_BUTTON_CLASS} ${mode === "text" ? "bg-[#f0f0f0] text-[#1a1a1a]" : ""}`}
					onClick={() => switchMode("text")}
					aria-label="Write note"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						width="15"
						height="15"
					>
						<path d="M4 6h16M4 12h16M4 18h8" strokeLinecap="round" />
					</svg>
				</button>
				<button
					type="button"
					className={`${TYPE_BUTTON_CLASS} ${mode === "image" ? "bg-[#f0f0f0] text-[#1a1a1a]" : ""}`}
					onClick={() => switchMode("image")}
					aria-label="Add image"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						width="15"
						height="15"
					>
						<rect x="3" y="3" width="18" height="18" rx="2" />
						<circle cx="8.5" cy="8.5" r="1.5" />
						<path
							d="M21 15l-5-5L5 21"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
				<button
					type="button"
					className={`${TYPE_BUTTON_CLASS} ${mode === "voice" ? "bg-[#f0f0f0] text-[#1a1a1a]" : ""}`}
					onClick={() => switchMode("voice")}
					aria-label="Record voice"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.8"
						width="15"
						height="15"
					>
						<rect x="9" y="2" width="6" height="12" rx="3" />
						<path
							d="M5 10a7 7 0 0 0 14 0M12 19v3M8 22h8"
							strokeLinecap="round"
						/>
					</svg>
				</button>
			</div>
		</div>
	);
}
