import { serve } from '@hono/node-server'
import { app } from './server'

const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000

async function main() {
  // Start HTTP server
  console.log(`Starting HTTP server on port ${PORT}...`)
  serve({
    fetch: app.fetch,
    port: PORT
  }, (info) => {
    console.log(`Server running at http://localhost:${info.port}`)
  })
}

main().catch(console.error)
