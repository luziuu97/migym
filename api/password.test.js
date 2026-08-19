import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  normalizeEmail, isValidEmail, passwordError, hashPassword, verifyPassword,
} from './password.js'

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    assert.equal(normalizeEmail('  Ana@Gym.COM '), 'ana@gym.com')
  })
  it('returns empty for missing', () => {
    assert.equal(normalizeEmail(''), '')
    assert.equal(normalizeEmail(null), '')
  })
})

describe('isValidEmail', () => {
  it('accepts a normal address', () => {
    assert.equal(isValidEmail('ana@gym.com'), true)
  })
  it('rejects empty, spaces, and missing @', () => {
    assert.equal(isValidEmail(''), false)
    assert.equal(isValidEmail('not-an-email'), false)
    assert.equal(isValidEmail('ana@'), false)
    assert.equal(isValidEmail('@gym.com'), false)
    assert.equal(isValidEmail('ana gym@gym.com'), false)
  })
})

describe('passwordError', () => {
  it('rejects too short and too long', () => {
    assert.equal(passwordError('short'), 'password must be at least 8 characters')
    assert.equal(passwordError('x'.repeat(201)), 'password is too long')
  })
  it('accepts 8+ characters', () => {
    assert.equal(passwordError('longenough'), null)
  })
})

describe('hashPassword / verifyPassword', () => {
  it('round-trips a correct password and rejects a wrong one', async () => {
    const stored = await hashPassword('longenough')
    assert.match(stored, /^scrypt\$/)
    assert.equal(await verifyPassword('longenough', stored), true)
    assert.equal(await verifyPassword('wrong-password', stored), false)
    assert.equal(await verifyPassword('longenough', 'not-a-hash'), false)
  })
})
