import { describe, expect, it } from 'vitest'
import { membershipActive, publicMembership, applyPaid, consumePackSession } from './membership.js'

describe('membershipActive', () => {
  it('never locks owners or trainers', () => {
    expect(membershipActive({ role: 'owner' }, '2026-08-19')).toBe(true)
    expect(membershipActive({ role: 'trainer', membership: { status: 'past_due' } }, '2026-08-19')).toBe(true)
  })

  it('locks members with no membership yet', () => {
    expect(membershipActive({ role: 'member' }, '2026-08-19')).toBe(false)
  })

  it('locks when monthly is expired or marked past_due', () => {
    const u = { role: 'member', membership: { plan: 'monthly', status: 'active', expiresOn: '2026-08-01' } }
    expect(membershipActive(u, '2026-08-19')).toBe(false)
    expect(membershipActive({ role: 'member', membership: { plan: 'monthly', status: 'past_due', expiresOn: '2026-09-01' } }, '2026-08-19')).toBe(false)
  })

  it('is active for a monthly plan still in date', () => {
    expect(membershipActive({
      role: 'member',
      membership: { plan: 'monthly', status: 'active', expiresOn: '2026-09-01' },
    }, '2026-08-19')).toBe(true)
  })

  it('locks a pack with no sessions left', () => {
    expect(membershipActive({
      role: 'member',
      membership: { plan: 'pack', status: 'active', sessionsLeft: 0 },
    }, '2026-08-19')).toBe(false)
  })
})

describe('publicMembership', () => {
  it('reports past_due when the member is locked', () => {
    const m = publicMembership({ role: 'member' }, '2026-08-19')
    expect(m.status).toBe('past_due')
    expect(m.plan).toBe(null)
  })
})

describe('applyPaid', () => {
  it('extends a monthly plan 30 days from today', () => {
    const m = applyPaid(null, { plan: 'monthly' }, '2026-08-19')
    expect(m.plan).toBe('monthly')
    expect(m.status).toBe('active')
    expect(m.expiresOn).toBe('2026-09-18')
  })

  it('adds pack sessions', () => {
    const m = applyPaid({ plan: 'pack', sessionsLeft: 2 }, { plan: 'pack', sessionsAdd: 10 }, '2026-08-19')
    expect(m.sessionsLeft).toBe(12)
    expect(m.status).toBe('active')
  })
})

describe('consumePackSession', () => {
  it('decrements pack sessions and lapses at zero', () => {
    const u = { role: 'member', membership: { plan: 'pack', status: 'active', sessionsLeft: 1 } }
    const next = consumePackSession(u)
    expect(next.membership.sessionsLeft).toBe(0)
    expect(membershipActive(next, '2026-08-19')).toBe(false)
  })
})
