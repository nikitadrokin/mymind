/** Formats seconds as `m:ss` for timers and duration labels. */
export function formatTime(s: number) {
	const m = Math.floor(s / 60);
	return `${m}:${Math.floor(s % 60)
		.toString()
		.padStart(2, "0")}`;
}
