import PgBoss, { type JobWithMetadata } from 'pg-boss'

import config from '~/src/server/config.js'
import { QueueService } from '~/src/server/services/QueueService.js'
type QueueResponse = [number | string, string | undefined]

interface QueueReferenceApiResponse {
  reference: string
}

type JobOutput = Record<string, any> & QueueReferenceApiResponse

export class PgBossQueueService extends QueueService {
  queue: PgBoss
  queueName = 'submission'
  queueReferenceApiUrl: string
  constructor(server) {
    super(server)
    this.logger.info('Using PGBossQueueService')
    this.queueReferenceApiUrl = config.queueReferenceApiUrl
    const boss = new PgBoss(config.queueDatabaseUrl)
    this.queue = boss
    boss.on('error', this.logger.error)
    boss.start().catch((e) => {
      this.logger.error(
        `Connecting to ${config.queueDatabaseUrl} failed, exiting`
      )
      throw e
    })
  }

  /**
   * Fetches a reference number from `this.queueReferenceApiUrl/{jobId}`.
   * If a reference number for `jobId` exists, the response body must be {@link QueueReferenceApiResponse}.
   * This request will happen once, and timeout in 2s.
   */
  async getReturnRef(jobId: string): Promise<string> {
    let job: JobWithMetadata | null = null

    try {
      job = await this.queue.getJobById(jobId)
    } catch (e) {
      return 'UNKNOWN'
    }

    this.logger.info(
      ['PgBossQueueService', 'getReturnRef'],
      `found job ${job.id} with state ${job.state}`
    )

    let reference

    if (job.state === 'completed') {
      const jobOutput = job.output as JobOutput
      reference = jobOutput?.reference
    }

    if (!reference) {
      this.logger.info(
        ['PgBossQueueService', 'getReturnRef'],
        `${jobId} was ${job.state} but the job output did not contain reference. Returning UNKNOWN`
      )
    }
    return reference ?? 'UNKNOWN'
  }

  async sendToQueue(
    data: object,
    url: string,
    allowRetry = true
  ): Promise<QueueResponse> {
    const logMetadata = ['QueueService', 'sendToQueue']
    const options: PgBoss.SendOptions = {
      retryBackoff: true
    }
    if (!allowRetry) {
      options.retryLimit = 1
    }

    const referenceNumber = 'UNKNOWN'

    const jobId = await this.queue.send(
      this.queueName,
      {
        data,
        webhook_url: url
      },
      options
    )

    if (!jobId) {
      throw Error('Job could not be created')
    }

    this.logger.info(logMetadata, `success job created with id: ${jobId}`)
    try {
      const newRowRef = await this.pollForRef(jobId)
      this.logger.info(
        logMetadata,
        `jobId: ${jobId} has reference number ${newRowRef}`
      )
      return [jobId, newRowRef ?? referenceNumber]
    } catch (e) {
      this.logger.error(
        ['QueueService', 'sendToQueue', `jobId: ${jobId}`],
        `Polling for return reference failed. ${e}`
      )
      // TODO:- investigate if this should return UNKNOWN?
      return [jobId, undefined]
    }
  }

  async pollForRef(jobId: string): Promise<string | void> {
    let timeElapsed = 0

    const reference = await this.getReturnRef(jobId)
    if (reference && reference !== 'UNKNOWN') {
      return reference
    }

    return new Promise((resolve, reject) => {
      const pollInterval = setInterval(async () => {
        try {
          const reference = await this.getReturnRef(jobId)
          if (reference && reference !== 'UNKNOWN') {
            clearInterval(pollInterval)
            resolve(reference)
          }
          if (timeElapsed >= 2000) {
            clearInterval(pollInterval)
            resolve()
          }
          timeElapsed += parseInt(config.queueServicePollingInterval)
        } catch (err) {
          reject(err)
        }
      }, config.queueServicePollingInterval)
    })
  }
}
