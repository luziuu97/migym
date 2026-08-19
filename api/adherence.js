function isoOf(d) {
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

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

function effectiveRoutineId(S, iso) {
  const routines = S.routines || []
  const ov = S.dayPlan && S.dayPlan[iso]
  if (ov === 'rest') return null
  if (ov && routines.some(r => r.id === ov)) return ov
  const wd = new Date(iso + 'T12:00:00').getDay()
  const id = S.week && S.week[wd]
  return id && routines.some(r => r.id === id) ? id : null
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
  }
}

export function todayISO(d = new Date()) {
  return isoOf(d)
}
