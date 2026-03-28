import { createFileRoute } from '@tanstack/react-router'

async function handler({ request }: { request: Request }) {
  const { fetchRequestHandler } = await import(
    '@trpc/server/adapters/fetch',
  )
  const { trpcRouter } = await import('#/integrations/trpc/router')
  return fetchRequestHandler({
    req: request,
    router: trpcRouter,
    endpoint: '/api/trpc',
  })
}

export const Route = createFileRoute('/api/trpc/$')({
  server: {
    handlers: {
      GET: handler,
      POST: handler,
    },
  },
})
