import * as path from 'path'
import { expect } from '@hapi/code'
import * as Lab from '@hapi/lab'
import cheerio from 'cheerio'

import { StatusService } from '../../../../src/server/services/index.js'
import { FormModel } from '../../../../src/server/plugins/engine/models/index.js'
import createServer from '../../../../src/server/index.js'
import form from '../status.test.json' with { type: 'json' }

export const lab = Lab.script()
const { suite, describe, test, before, after } = lab

const cacheService = { getState: () => ({}), mergeState: () => {} }
const webhookService = { postRequest: () => ({}) }
const notifyService = { sendNotification: () => ({}) }
const payService = {
  payStatus: () => {}
}

const server = {
  services: () => ({
    cacheService,
    webhookService,
    payService,
    notifyService
  }),
  logger: {
    info: () => {},
    trace: () => {}
  }
}

describe('returns the correct components based on a condition', () => {
  const stateForLisbon = {
    whichConsulate: 'lisbon'
  }

  const formModel = new FormModel(form, {})
  const statusService = new StatusService(server)

  const lisbonViewModel = statusService.getViewModel(stateForLisbon, formModel)

  expect(lisbonViewModel.components.length).to.equal(1)
  expect(lisbonViewModel.components[0].model).to.equal({
    attributes: {},
    content: 'lisbon',
    condition: 'isLisbon'
  })
  const stateForPortimao = {
    whichConsulate: 'portimao'
  }

  const portimaoViewModel = statusService.getViewModel(
    stateForPortimao,
    formModel
  )
  expect(portimaoViewModel.components[0].model).to.equal({
    attributes: {},
    content: 'portimao',
    condition: 'isPortimao'
  })
})

describe('StatusService getViewModel returns the correct components based on a condition', () => {
  const stateForLisbon = {
    whichConsulate: 'lisbon'
  }

  const formModel = new FormModel(form, {})
  const statusService = new StatusService(server)

  const lisbonViewModel = statusService.getViewModel(stateForLisbon, formModel)

  expect(lisbonViewModel.components.length).to.equal(1)
  expect(lisbonViewModel.components[0].model).to.equal({
    attributes: {},
    content: 'lisbon',
    condition: 'isLisbon'
  })
  const stateForPortimao = {
    whichConsulate: 'portimao'
  }

  const portimaoViewModel = statusService.getViewModel(
    stateForPortimao,
    formModel
  )
  expect(portimaoViewModel.components[0].model).to.equal({
    attributes: {},
    content: 'portimao',
    condition: 'isPortimao'
  })
})

suite('StatusService getViewModel renders custom text correctly', () => {
  let server
  let statusService
  let response
  let $

  before(async () => {
    server = await createServer({
      formFileName: 'status.test.json',
      formFilePath: path.join(__dirname, '..'),
      enforceCsrf: false
    })
    statusService = server.services().statusService
  })

  after(async () => {
    await server.stop()
  })

  test('with confirmationPage undefined', async () => {
    const formDef = { ...form, specialPages: {} }
    const formModel = new FormModel(formDef, {})
    const vmWithoutConfirmationPage = statusService.getViewModel({}, formModel)
    response = await server.render('confirmation', vmWithoutConfirmationPage)

    $ = cheerio.load(response)
    expect($('body').text()).to.contain('Application complete')
    expect($('body').text()).to.contain(
      'You will receive an email with details with the next steps'
    )
  })
  test('with confirmationPage as empty object', async () => {
    const formDef = { ...form, specialPages: { confirmationPage: {} } }
    const formModel = new FormModel(formDef, {})

    const vmWithoutCustomText = statusService.getViewModel({}, formModel)
    response = await server.render('confirmation', vmWithoutCustomText)

    $ = cheerio.load(response)
    expect($('body').text()).to.contain('Application complete')
    expect($('body').text()).to.contain(
      'You will receive an email with details with the next steps'
    )
  })

  test('with customText toggled', async () => {
    const formModel = new FormModel(form, {})

    formModel.def.specialPages.confirmationPage.customText = {
      nextSteps: false,
      paymentSkipped: false
    }

    const vmWithToggledText = statusService.getViewModel({}, formModel)
    response = await server.render('confirmation', {
      ...vmWithToggledText,
      paymentSkipped: true
    })

    $ = cheerio.load(response)
    expect($('body').text()).to.not.contain(
      'Someone will be in touch to make a payment.'
    )
    expect($('body').text()).to.not.contain(
      'You will receive an email with details with the next steps'
    )

    test('with callback override', async () => {})
  })
  test('with customText defined', async () => {
    const formModel = new FormModel(form, {})

    formModel.def.specialPages.confirmationPage.customText = {
      title: 'Soup',
      nextSteps: 'Tragedy',
      paymentSkipped: 'No eggs for you'
    }

    const vmWithCustomisations = statusService.getViewModel({}, formModel)
    response = await server.render('confirmation', {
      ...vmWithCustomisations,
      paymentSkipped: true
    })

    $ = cheerio.load(response)
    expect($('h1').text()).to.contain('Soup')
    expect($('body').text()).to.contain('No eggs for you')
    expect($('body').text()).to.not.contain(
      'You will receive an email with details with the next steps'
    )

    response = await server.render('confirmation', {
      ...vmWithCustomisations,
      paymentSkipped: false
    })

    $ = cheerio.load(response)
    expect($('h1').text()).to.contain('Soup')
    expect($('body').text()).to.not.contain('No eggs for you')
    expect($('body').text()).to.contain('Tragedy')
  })
  test('with callback defined', async () => {
    const formModel = new FormModel(form, {})

    formModel.def.specialPages.confirmationPage.customText = {
      title: 'Soup',
      nextSteps: 'Tragedy',
      paymentSkipped: 'No eggs for you'
    }

    const userState = {
      callback: {
        customText: {
          title: 'Application resubmitted',
          paymentSkipped: false,
          nextSteps: false
        },
        components: [
          {
            options: {},
            type: 'Html',
            content: 'Thanks!',
            schema: {}
          }
        ]
      }
    }

    const vmWithCallback = statusService.getViewModel(userState, formModel)
    response = await server.render('confirmation', {
      ...vmWithCallback,
      paymentSkipped: true
    })

    $ = cheerio.load(response)
    expect($('h1').text()).to.contain('Application resubmitted')
    expect($('body').text()).to.contain('Thanks!')
    expect($('body').text()).to.not.contain('No eggs for you')
    expect($('body').text()).to.not.contain(
      'You will receive an email with details with the next steps'
    )
  })
})
