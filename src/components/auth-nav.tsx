import { Link } from '@tanstack/react-router';
import { LogOut, User } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { Button } from '#/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from '#/components/ui/dropdown-menu';

export function AuthNav() {
	const { data: session, isPending } = authClient.useSession();

	if (isPending) {
		return (
			<span className="text-xs text-[var(--sea-ink-soft)]">…</span>
		);
	}

	if (session?.user) {
		const label =
			session.user.name?.trim() ||
			session.user.email ||
			'Account';

		return (
			<DropdownMenu>
				<DropdownMenuTrigger asChild>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)]"
					>
						<User className="size-4" aria-hidden />
						<span className="max-w-[10rem] truncate">{label}</span>
					</Button>
				</DropdownMenuTrigger>
				<DropdownMenuContent align="end" className="min-w-[12rem]">
					<div className="px-2 py-1.5 text-xs text-muted-foreground">
						{session.user.email ? (
							<span className="block truncate">{session.user.email}</span>
						) : null}
					</div>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onSelect={() => {
							void authClient.signOut();
						}}
					>
						<LogOut className="size-4" aria-hidden />
						Sign out
					</DropdownMenuItem>
				</DropdownMenuContent>
			</DropdownMenu>
		);
	}

	return (
		<Button variant="outline" size="sm" asChild>
			<Link
				to="/login"
				className="border-[var(--chip-line)] bg-[var(--chip-bg)] text-[var(--sea-ink)] no-underline"
			>
				Sign in
			</Link>
		</Button>
	);
}
