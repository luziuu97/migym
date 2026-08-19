import { isoOf } from './format.js'
import { effectiveRoutineId } from './history.js'

/** Monday–Sunday ISO dates of the week that contains `todayIso`. */
export function weekDates(todayIso) {
  const d = new Date(todayIso + 'T12:00:00')
  const mondayOffset = (d.getDay() + 6) % 7
  const monday = new Date(d)
  monday.setDate(d.getDate() - mondayOffset)
  const days = []
  for (let i = 0; i < 7; i++) {
    const x = new Date(monday)
    x.setDate(monday.getDate() + i)
    days.push(isoOf(x))
  }
  return days
}

export function memberAdherence(S, todayIso) {
  const dates = weekDates(todayIso)
  const planned = dates.filter(iso => !!effectiveRoutineId(S || {}, iso))
  const done = new Set((S && S.workouts || []).map(w => w.d))
  const trained = dates.filter(iso => done.has(iso))
  const last = (S && S.workouts || []).reduce((acc, w) => (!acc || (w.d || '') > acc ? w.d : acc), null)
  return {
    planned: planned.length,
    trained: trained.length,
    trainedToday: done.has(todayIso),
    lastWorkout: last || null,
    quietDays: last ? Math.max(0, Math.round((new Date(todayIso + 'T12:00:00') - new Date(last + 'T12:00:00')) / 86400000)) : null,
  }
}
