import { type Request, type ResponseToolkit } from '@hapi/hapi'

import { RelativeUrl } from '~/src/server/plugins/engine/feedback/index.js'

export const feedbackReturnInfoKey = 'f_t'

const paramsToCopy = [feedbackReturnInfoKey]

export function proceed(request: Request, h: ResponseToolkit, nextUrl: string) {
  const returnUrl = request.query.returnUrl

  if (typeof returnUrl === 'string' && returnUrl.startsWith('/')) {
    return h.redirect(returnUrl)
  } else {
    return redirectTo(request, h, nextUrl)
  }
}

interface Params {
  returnUrl: string
}

export function nonRelativeRedirectUrl(
  request: Request,
  targetUrl: string,
  params?: Params
) {
  const url = new URL(targetUrl)

  Object.entries(params ?? {}).forEach(([name, value]) => {
    url.searchParams.append(name, `${value}`)
  })

  paramsToCopy.forEach((key) => {
    const value = request.query[key]
    if (typeof value === 'string') {
      url.searchParams.append(key, value)
    }
  })

  return url.toString()
}

export function redirectUrl(
  request: Request,
  targetUrl: string,
  params?: Params
) {
  const relativeUrl = new RelativeUrl(targetUrl)
  Object.entries(params ?? {}).forEach(([name, value]) => {
    relativeUrl.setParam(name, `${value}`)
  })

  paramsToCopy.forEach((key) => {
    const value = request.query[key]
    if (typeof value === 'string' && !relativeUrl.getParam(key)) {
      relativeUrl.setParam(key, value)
    }
  })

  return relativeUrl.toString()
}

export function redirectTo(
  request: Request,
  h: ResponseToolkit,
  targetUrl: string,
  params?: Params
) {
  if (targetUrl.startsWith('http')) {
    return h.redirect(targetUrl)
  }

  const url = redirectUrl(request, targetUrl, params)
  return h.redirect(url)
}

export const idFromFilename = (filename: string) => {
  return filename.replace(/govsite\.|\.json|/gi, '')
}
