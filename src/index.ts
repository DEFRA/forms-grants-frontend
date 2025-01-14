import path from 'node:path'

import { config } from '~/src/config/index.js'
import { createLogger } from '~/src/server/common/helpers/logging/logger.js'
import { createServer } from '~/src/server/index.js'

const logger = createLogger()

process.on('unhandledRejection', (error) => {
  logger.info('Unhandled rejection')
  logger.error(error)
  throw error
})

/**
 * Main entrypoint to the application.
 */
async function startServer() {
  const exampleFormFile = new URL('./forms/grants.json', import.meta.url)
    .pathname

  const server = await createServer({
    formFileName: path.basename(exampleFormFile),
    formFilePath: path.dirname(exampleFormFile)
  })
  await server.start()

  process.send?.('online')

  server.logger.info('Server started successfully')
  server.logger.info(
    `Access your frontend on http://localhost:${config.get('port')}`
  )
}

startServer().catch((error: unknown) => {
  logger.info('Server failed to start :(')
  logger.error(error)
})
