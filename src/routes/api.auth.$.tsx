import { createFileRoute } from '@tanstack/react-router';
import { handler } from '@/lib/auth-server';

function authHandler({ request }: { request: Request }) {
	return handler(request);
}

export const Route = createFileRoute('/api/auth/$')({
	server: {
		handlers: {
			GET: authHandler,
			POST: authHandler,
		},
	},
});
