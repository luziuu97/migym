import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { sanitizePlan } from './plan.js'

describe('sanitizePlan', () => {
  it('keeps routines and week ids that exist, drops the rest', () => {
    const out = sanitizePlan({
      routines: [
        { id: 'r1', name: 'Push', emoji: 'dumbbell', ex: [{ id: 'bench', sets: 3, reps: 8 }] },
        { id: '', name: 'bad' },
      ],
      week: { 1: 'r1', 2: 'nope', 3: 'r1' },
      customEx: [{ id: 'c1', n: 'My raise', bp: 'shoulders' }],
    })
    assert.equal(out.routines.length, 1)
    assert.equal(out.routines[0].name, 'Push')
    assert.deepEqual(out.week, { 1: 'r1', 3: 'r1' })
    assert.equal(out.customEx.length, 1)
  })

  it('returns empty plan for junk', () => {
    assert.deepEqual(sanitizePlan(null), { routines: [], week: {}, customEx: [] })
  })
})
