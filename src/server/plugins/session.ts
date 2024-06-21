import yar from '@hapi/yar'

import config from '~/src/server/config.js'

/**
 * Yar is used for temporary session data but not form submissions, e.g. UI helpers, session flags.
 */
export default {
  plugin: yar,
  options: {
    maxCookieSize: 0, // Always use server-side storage
    cache: {
      cache: 'session',
      segment: 'session',
      expiresIn: config.sessionTimeout
    },
    /**
     * @todo storeBlank is current commented out as it's a minor efficiency gain but breaks the auth tests if enabled.
     * this only seems to affect the auth code, which we might remove anyway so it's temporarily disabled.
     */
    // storeBlank: false,
    cookieOptions: {
      password: config.sessionCookiePassword,
      isSecure: config.isProd
    }
  }
}
