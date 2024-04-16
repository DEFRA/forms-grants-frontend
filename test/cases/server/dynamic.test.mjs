import cheerio from 'cheerio'
import FormData from 'form-data'

import createServer from '../../../src/server/index.js'
import { CacheService } from '../../../src/server/services/cacheService.js'

const state = {
  progress: [
    '/test/start',
    '/dynamic/uk-passport',
    '/dynamic/how-many-people',
    '/dynamic/applicant-repeatable?num=1',
    '/dynamic/contact-details?num=1',
    '/dynamic/applicant-repeatable?num=2',
    '/dynamic/contact-details?num=2'
  ],
  checkBeforeYouStart: {
    ukPassport: true
  },
  applicantDetails: {
    numberOfApplicants: 2
  },
  applicant: [
    {
      '/applicant-repeatable': {
        firstName: 'a',
        middleName: 'b',
        lastName: 'c'
      },
      '/contact-details': {
        phoneNumber: '123',
        emailAddress: 'test@one'
      }
    },
    {
      '/applicant-repeatable': {
        firstName: 'c',
        middleName: 'd',
        lastName: 'e'
      },
      '/contact-details': {
        phoneNumber: '456',
        emailAddress: 'test@two'
      }
    }
  ]
}

const postOptions = (path, form) => {
  const formData = new FormData()

  Object.entries(form).forEach(([key, value]) => {
    formData.append(key, value)
  })

  return {
    method: 'POST',
    url: path,
    headers: formData.getHeaders(),
    payload: formData.getBuffer()
  }
}

const FORMS = {
  passport: { ukPassport: 'true' },
  howManyPeople: { numberOfApplicants: 2 },
  name: {
    firstName: 'a',
    middleName: 'b',
    lastName: 'c'
  },
  contact: {
    phoneNumber: '123',
    emailAddress: 'test@test'
  }
}

const SESSION_ID = 'TEST_ID'
const VISIT_ID = 'AvsfDdnkdns'

describe.skip('Dynamic pages', () => {
  let server

  // Create server before each test
  beforeAll(async () => {
    server = await createServer({
      formFileName: 'dynamic.json',
      formFilePath: __dirname
    })
    await server.initialize()
  })

  afterAll(async () => {
    server.stop()
  })

  afterEach(async () => {
    const { cacheService } = server.services()
    await cacheService.clearState({
      yar: { id: SESSION_ID },
      query: { visit: VISIT_ID }
    })
    jest.spyOn(CacheService.prototype, 'Key').mockReturnValue({
      segment: 'segment',
      id: `${SESSION_ID}:${VISIT_ID}`
    })
  })

  test('Start of repeatable section appends num parameter', async () => {
    const response = await server.inject(
      postOptions(`/dynamic/how-many-people?visit=${VISIT_ID}`, {
        numberOfApplicants: 2
      })
    )
    expect(response.headers.location).toBe(
      `/dynamic/applicant-repeatable?num=1&visit=${VISIT_ID}`
    )
  })

  test('Asks questions in section correct number of times', async () => {
    let nextPath = `/dynamic/uk-passport?visit=${VISIT_ID}`
    let response

    const reassignNextPath = () => {
      nextPath = response.headers.location
    }

    response = await server.inject(postOptions(nextPath, FORMS.passport))
    reassignNextPath()
    response = await server.inject(postOptions(nextPath, FORMS.howManyPeople))
    reassignNextPath()
    response = await server.inject(postOptions(nextPath, FORMS.name))
    reassignNextPath()

    response = await server.inject(postOptions(nextPath, FORMS.contact))
    expect(response.headers.location).toBe(
      `/dynamic/applicant-repeatable?num=2&visit=${VISIT_ID}`
    )
    reassignNextPath()

    response = await server.inject(postOptions(nextPath, FORMS.name))
    reassignNextPath()

    response = await server.inject(postOptions(nextPath, FORMS.contact))
    expect(response.headers.location).toBe(`/dynamic/summary?visit=${VISIT_ID}`)

    reassignNextPath()
  })

  test('Change url redirects to question page with correct answers', async () => {
    jest.spyOn(CacheService.prototype, 'getState').mockReturnValue(state)

    const response = await server.inject({
      method: 'GET',
      url: `/dynamic/summary?visit=${VISIT_ID}`
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')

    let $ = cheerio.load(response.payload)

    const changeEmailLink = $('span:contains("Your email address")')[0].parent
      .attribs.href
    const changeEmailPage = await server.inject({
      method: 'GET',
      url: changeEmailLink
    })
    $ = cheerio.load(changeEmailPage.payload)
    expect($('#emailAddress')[0].attribs.value).toEqual(
      state.applicant[0]['/contact-details'].emailAddress
    )
  })

  test('Summary page displays correct number of repeatable sections', async () => {
    const { cacheService } = server.services()
    await cacheService.mergeState(
      { yar: { id: SESSION_ID }, query: { visit: VISIT_ID } },
      state
    )
    const response = await server.inject({
      method: 'GET',
      url: `/dynamic/summary?visit=${VISIT_ID}`
    })
    expect(response.statusCode).toBe(200)
    expect(response.headers['content-type']).toContain('text/html')

    let $ = cheerio.load(response.payload)
    const applicantHeadings = $('h2:contains("Applicant")')
    expect(applicantHeadings).toHaveLength(2)

    await server.inject(
      postOptions('/dynamic/how-many-people', { numberOfApplicants: 1 })
    )

    const responseAfterNumberChange = await server.inject({
      method: 'GET',
      url: `/dynamic/summary?visit=${VISIT_ID}`
    })

    $ = cheerio.load(responseAfterNumberChange.payload)

    expect($('h2:contains("Applicant")')).toHaveLength(1)
  })
})
