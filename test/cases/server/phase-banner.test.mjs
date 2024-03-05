import path from 'path'
import { expect } from '@hapi/code'
import * as Lab from '@hapi/lab'
import cheerio from 'cheerio'
import createServer from '../../../src/server/index.js'

export const lab = Lab.script()
const { suite, test, afterEach } = lab

suite(`Phase banner`, () => {
  let server

  afterEach(async () => {
    await server.stop()
  })

  test('shows the beta tag by default', async () => {
    // For backwards-compatibility, as the main layout template currently always shows 'beta'.
    // TODO: default to no phase banner? TBD
    server = await createServer({
      formFileName: `phase-default.json`,
      formFilePath: path.join(__dirname, '/forms')
    })
    await server.start()

    const options = {
      method: 'GET',
      url: `/forms-runner/phase-default/first-page`
    }

    const response = await server.inject(options)
    expect(response.statusCode).to.equal(200)

    const $ = cheerio.load(response.payload)

    expect($('.govuk-phase-banner__content__tag').text().trim()).to.equal(
      'beta'
    )
  })

  test('shows the alpha tag if selected', async () => {
    server = await createServer({
      formFileName: `phase-alpha.json`,
      formFilePath: path.join(__dirname, '/forms')
    })
    await server.start()

    const options = {
      method: 'GET',
      url: `/forms-runner/phase-alpha/first-page`
    }

    const response = await server.inject(options)
    expect(response.statusCode).to.equal(200)

    const $ = cheerio.load(response.payload)

    expect($('.govuk-phase-banner__content__tag').text().trim()).to.equal(
      'alpha'
    )
  })

  test('does not show the phase banner if None', async () => {
    server = await createServer({
      formFileName: `phase-none.json`,
      formFilePath: path.join(__dirname, '/forms')
    })
    await server.start()

    const options = {
      method: 'GET',
      url: `/forms-runner/phase-none/first-page`
    }

    const response = await server.inject(options)
    expect(response.statusCode).to.equal(200)

    const $ = cheerio.load(response.payload)

    expect($('.govuk-phase-banner').html()).to.equal(null)
  })
})
