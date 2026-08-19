function cleanEx(e) {
  if (!e || typeof e !== 'object' || !e.id) return null
  const o = { id: String(e.id).slice(0, 80), sets: Math.max(1, Math.min(20, +e.sets || 1)) }
  if (e.mode === 'time' || e.mode === 'cardio' || e.mode === 'reps') o.mode = e.mode
  if (e.reps != null) o.reps = +e.reps
  if (e.weight != null) o.weight = +e.weight
  if (e.min != null) o.min = +e.min
  if (e.speed != null) o.speed = +e.speed
  if (e.sec != null) o.sec = +e.sec
  if (e.bodyweight != null) o.bodyweight = !!e.bodyweight
  if (e.side) o.side = true
  if (e.prog) o.prog = String(e.prog).slice(0, 40)
  if (e.inc > 0) o.inc = +e.inc
  if (e.repsMin != null) o.repsMin = +e.repsMin
  if (e.repsMax != null) o.repsMax = +e.repsMax
  return o
}

export function sanitizePlan(body) {
  if (!body || typeof body !== 'object') return { routines: [], week: {}, customEx: [] }
  const routines = (Array.isArray(body.routines) ? body.routines : [])
    .slice(0, 40)
    .map(r => {
      if (!r || !r.id) return null
      return {
        id: String(r.id).slice(0, 40),
        name: String(r.name || 'Routine').slice(0, 60),
        emoji: String(r.emoji || 'dumbbell').slice(0, 40),
        ...(r.prog ? { prog: String(r.prog).slice(0, 40) } : {}),
        ex: (Array.isArray(r.ex) ? r.ex : []).slice(0, 40).map(cleanEx).filter(Boolean),
      }
    })
    .filter(Boolean)
  const ids = new Set(routines.map(r => r.id))
  const week = {}
  const src = body.week && typeof body.week === 'object' ? body.week : {}
  for (const d of [0, 1, 2, 3, 4, 5, 6]) {
    const id = src[d] || src[String(d)]
    if (id && ids.has(id)) week[d] = id
  }
  const customEx = (Array.isArray(body.customEx) ? body.customEx : [])
    .slice(0, 80)
    .map(c => (c && c.id && c.n) ? { id: String(c.id).slice(0, 80), n: String(c.n).slice(0, 80), bp: String(c.bp || '').slice(0, 40) } : null)
    .filter(Boolean)
  return { routines, week, customEx }
}
