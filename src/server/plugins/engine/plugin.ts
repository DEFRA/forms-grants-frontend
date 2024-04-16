import path from 'path'
import { configure } from 'nunjucks'
import { getValidStateFromQueryParameters, redirectTo } from './helpers'
import { FormConfiguration } from '@defra/forms-model'

import { FormModel } from './models'
import Boom from '@hapi/boom'
import type {
  PluginSpecificConfiguration,
  Request,
  ResponseToolkit,
  Server
} from '@hapi/hapi'
import { shouldLogin } from '../../plugins/auth'
import config from '../../config'
import type { FormPayload } from './types'

configure([
  // Configure Nunjucks to allow rendering of content that is revealed conditionally.
  path.resolve(__dirname, '/views'),
  path.resolve(__dirname, '/views/partials'),
  'node_modules/govuk-frontend/govuk/',
  'node_modules/govuk-frontend/govuk/components/',
  'node_modules/hmpo-components/components'
])

function normalisePath(path: string) {
  return path.replace(/^\//, '').replace(/\/$/, '')
}

function getStartPageRedirect(
  request: Request,
  h: ResponseToolkit,
  id: string,
  model: FormModel
) {
  const startPage = normalisePath(model.def.startPage ?? '')
  let startPageRedirect: any

  if (startPage.startsWith('http')) {
    startPageRedirect = redirectTo(request, h, startPage)
  } else {
    startPageRedirect = redirectTo(
      request,
      h,
      `/${model.basePath}/${startPage}`
    )
  }

  return startPageRedirect
}

type PluginOptions = {
  relativeTo?: string
  modelOptions: any
  configs: any[]
  previewMode: boolean
}

const formBasePath = config.appPathPrefix.replace(/^\//, '') // replace first / so it doesn't turn into //forms-runner and get interpreted as a hostname

export const plugin = {
  name: '@defra/forms-runner/engine',
  dependencies: '@hapi/vision',
  multiple: true,
  register: (server: Server, options: PluginOptions) => {
    const { modelOptions, configs, previewMode } = options
    server.app.forms = {}
    const forms = server.app.forms

    configs.forEach((config) => {
      forms[config.id] = new FormModel(config.configuration, {
        ...modelOptions,
        basePath: `${formBasePath}/${config.id}`
      })
    })

    const enabledString = config.previewMode ? `[ENABLED]` : `[DISABLED]`
    const disabledRouteDetailString =
      'A request was made however previewing is disabled. See environment variable details in runner/README.md if this error is not expected.'

    /**
     * The following publish endpoints (/publish, /published/{id}, /published)
     * are used from the designer for operating in 'preview' mode.
     * I.E. Designs saved in the designer can be accessed in the runner for viewing.
     * The designer also uses these endpoints as a persistence mechanism for storing and retrieving data
     * for its own purposes so if you're changing these endpoints you likely need to go and amend
     * the designer too!
     */
    server.route({
      method: 'post',
      path: '/publish',
      handler: (request: Request, h: ResponseToolkit) => {
        if (!previewMode) {
          request.logger.error(
            [`POST /publish`, 'previewModeError'],
            disabledRouteDetailString
          )
          throw Boom.forbidden('Publishing is disabled')
        }
        const payload = request.payload as FormPayload
        const { id, configuration } = payload

        const parsedConfiguration =
          typeof configuration === 'string'
            ? JSON.parse(configuration)
            : configuration
        forms[id] = new FormModel(parsedConfiguration, {
          ...modelOptions,
          basePath: `${formBasePath}/${id}`
        })
        return h.response({}).code(204)
      },
      options: {
        description: `${enabledString} Allows a form to be persisted (published) on the runner server. Requires previewMode to be set to true. See runner/README.md for details on environment variables`
      }
    })

    server.route({
      method: 'get',
      path: '/published/{id}',
      handler: (request: Request, h: ResponseToolkit) => {
        const { id } = request.params
        if (!previewMode) {
          request.logger.error(
            [`GET /published/${id}`, 'previewModeError'],
            disabledRouteDetailString
          )
          throw Boom.unauthorized('publishing is disabled')
        }

        const form = forms[id]
        if (!form) {
          return h.response({}).code(204)
        }

        const { values } = forms[id]
        return h.response(JSON.stringify({ id, values })).code(200)
      },
      options: {
        description: `${enabledString} Gets a published form, by form id. Requires previewMode to be set to true. See runner/README.md for details on environment variables`
      }
    })

    server.route({
      method: 'get',
      path: '/published',
      handler: (request: Request, h: ResponseToolkit) => {
        if (!previewMode) {
          request.logger.error(
            [`GET /published`, 'previewModeError'],
            disabledRouteDetailString
          )
          throw Boom.unauthorized('publishing is disabled.')
        }
        return h
          .response(
            JSON.stringify(
              Object.keys(forms).map(
                (key) =>
                  new FormConfiguration(
                    key,
                    forms[key].name,
                    undefined,
                    forms[key].def.feedback?.feedbackForm
                  )
              )
            )
          )
          .code(200)
      },
      options: {
        description: `${enabledString} Gets all published forms. Requires previewMode to be set to true. See runner/README.md for details on environment variables`
      }
    })

    const queryParamPreHandler = async (
      request: Request,
      h: ResponseToolkit
    ) => {
      const { query } = request
      const { id } = request.params
      const model = forms[id]
      if (!model) {
        throw Boom.notFound('No form found for id')
      }

      const prePopFields = model.fieldsForPrePopulation
      if (
        Object.keys(query).length === 0 ||
        Object.keys(prePopFields).length === 0
      ) {
        return h.continue
      }
      const { cacheService } = request.services([])
      const state = await cacheService.getState(request)
      const newValues = getValidStateFromQueryParameters(
        prePopFields,
        query,
        state
      )
      await cacheService.mergeState(request, newValues)
      return h.continue
    }

    server.route({
      method: 'get',
      path: '/{id}',
      options: {
        pre: [
          {
            method: queryParamPreHandler
          }
        ]
      },
      handler: (request: Request, h: ResponseToolkit) => {
        const { id } = request.params
        const model = forms[id]
        if (model) {
          return getStartPageRedirect(request, h, id, model)
        }
        throw Boom.notFound('No form found for id')
      }
    })

    server.route({
      method: 'get',
      path: '/{id}/{path*}',
      options: {
        pre: [
          {
            method: queryParamPreHandler
          }
        ]
      },
      handler: (request: Request, h: ResponseToolkit) => {
        const { path, id } = request.params
        const model = forms[id]
        const page = model?.pages.find(
          (page) => normalisePath(page.path) === normalisePath(path)
        )
        if (page) {
          // NOTE: Start pages should live on gov.uk, but this allows prototypes to include signposting about having to log in.
          if (
            page.pageDef.controller !== './pages/start.js' &&
            shouldLogin(request)
          ) {
            return h.redirect(`/login?returnUrl=${request.path}`)
          }

          return page.makeGetRouteHandler()(request, h)
        }
        if (normalisePath(path) === '') {
          return getStartPageRedirect(request, h, id, model)
        }
        throw Boom.notFound('No form or page found')
      }
    })

    const { uploadService } = server.services([])

    const handleFiles = (request: Request, h: ResponseToolkit) => {
      const { path, id } = request.params
      const model = forms[id]
      const page = model?.pages.find(
        (page) => normalisePath(page.path) === normalisePath(path)
      )
      return uploadService.handleUploadRequest(request, h, page.pageDef)
    }

    const postHandler = async (request: Request, h: ResponseToolkit) => {
      const { path, id } = request.params
      const model = forms[id]

      if (model) {
        const page = model.pages.find(
          (page) => page.path.replace(/^\//, '') === path
        )

        if (page) {
          return page.makePostRouteHandler()(request, h)
        }
      }

      throw Boom.notFound('No form of path found')
    }

    server.route({
      method: 'post',
      path: '/{id}/{path*}',
      options: {
        plugins: <PluginSpecificConfiguration>{
          'hapi-rate-limit': {
            userPathLimit: 10
          }
        },
        payload: {
          output: 'stream',
          parse: true,
          multipart: { output: 'stream' },
          maxBytes: uploadService.fileSizeLimit,
          failAction: async (request: Request, h: ResponseToolkit) => {
            request.server.plugins.crumb.generate?.(request, h)
            return h.continue
          }
        },
        pre: [{ method: handleFiles }],
        handler: postHandler
      }
    })
  }
}
