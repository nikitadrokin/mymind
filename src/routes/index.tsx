import { createFileRoute, redirect } from "@tanstack/react-router";
import MindApp from "#/components/mind-app";

export const Route = createFileRoute("/")({
	beforeLoad: ({ context }) => {
		if (context.isAuthenticated === false) {
			throw redirect({ to: "/login" });
		}
	},
	component: MindApp,
});
