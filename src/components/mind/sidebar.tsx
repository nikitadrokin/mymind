import ThemeToggle from "../ThemeToggle";
import { SIDEBAR_ICON_CLASS } from "./class-names";

export function Sidebar() {
	return (
		<aside className="fixed top-0 left-0 z-40 flex h-screen w-[60px] flex-col items-center border-r border-[#ebebeb] bg-[#f7f7f5] py-5">
			<div className="mb-7 select-none text-[11px] font-semibold uppercase tracking-[0.12em] text-[#999] [writing-mode:vertical-rl] rotate-180">
				<span>second brain</span>
			</div>
			<div className="flex flex-1 flex-col items-center gap-1">
				<button
					type="button"
					className={SIDEBAR_ICON_CLASS}
					aria-label="Recent"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						width="20"
						height="20"
					>
						<circle cx="12" cy="12" r="9" />
						<path
							d="M12 7v5l3 3"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
				<button
					type="button"
					className={SIDEBAR_ICON_CLASS}
					aria-label="Appearance"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						width="20"
						height="20"
					>
						<path
							d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
				<button
					type="button"
					className={SIDEBAR_ICON_CLASS}
					aria-label="Discover"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						width="20"
						height="20"
					>
						<polygon
							points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
				<button
					type="button"
					className={SIDEBAR_ICON_CLASS}
					aria-label="Grid view"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						width="20"
						height="20"
					>
						<rect x="3" y="3" width="7" height="7" rx="1" />
						<rect x="14" y="3" width="7" height="7" rx="1" />
						<rect x="3" y="14" width="7" height="7" rx="1" />
						<rect x="14" y="14" width="7" height="7" rx="1" />
					</svg>
				</button>
			</div>
			<div className="flex flex-col items-center gap-1">
				<div className="origin-center scale-[0.72]">
					<ThemeToggle />
				</div>
				<button
					type="button"
					className={SIDEBAR_ICON_CLASS}
					aria-label="Settings"
				>
					<svg
						aria-hidden="true"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="1.6"
						width="20"
						height="20"
					>
						<circle cx="12" cy="12" r="3" />
						<path
							d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</button>
			</div>
		</aside>
	);
}
