import type { Doc } from "../../../convex/_generated/dataModel";

/** Convex document shape for a mind card in the UI. */
export type MindCardDoc = Doc<"mindCards">;

/** Active composer mode in the add-card widget; `null` is collapsed. */
export type AddMode = "text" | "image" | "voice" | null;

/** Payload passed from the composer before persisting to Convex. */
export type NewCardPayload = {
	type: "text" | "image" | "voice";
	text?: string;
	imageData?: string;
	audioData?: string;
	audioDuration?: number;
};
