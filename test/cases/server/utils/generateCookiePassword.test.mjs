import { expect } from '@hapi/code'
import * as Lab from '@hapi/lab'
import generateCookiePassword from '../../../../src/server/utils/generateCookiePassword.js'

export const lab = Lab.script()
const { suite, test } = lab

suite('Cookie password generator', () => {
  test('Generates a random password 32 characters long', () => {
    const password1 = generateCookiePassword()
    const password2 = generateCookiePassword()

    expect(password1.length).to.equal(32)
    expect(password2.length).to.equal(32)
    expect(password1).to.not.equal(password2)
  })
})
