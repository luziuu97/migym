import { describe, expect, it } from 'vitest'
import { weekDates, memberAdherence } from './adherence.js'

describe('weekDates', () => {
  it('returns Mon–Sun for a Wednesday', () => {
    const days = weekDates('2026-08-19') // Wednesday
    expect(days[0]).toBe('2026-08-17')
    expect(days[6]).toBe('2026-08-23')
    expect(days).toHaveLength(7)
  })
})

describe('memberAdherence', () => {
  it('counts planned weekdays vs logged workouts this week', () => {
    const S = {
      routines: [{ id: 'push', name: 'Push' }],
      week: { 1: 'push', 3: 'push', 5: 'push' }, // Mon Wed Fri
      dayPlan: {},
      workouts: [
        { id: '1', d: '2026-08-17', name: 'Push' }, // Mon
        { id: '2', d: '2026-08-10', name: 'Old' },
      ],
    }
    const a = memberAdherence(S, '2026-08-19')
    expect(a.planned).toBe(3)
    expect(a.trained).toBe(1)
    expect(a.trainedToday).toBe(false)
    expect(a.lastWorkout).toBe('2026-08-17')
  })
})
