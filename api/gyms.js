import crypto from 'node:crypto'

export function slugify(name) {
  return String(name || '')
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'gym'
}

export function newJoinCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

export function makeGym(name, opts = {}) {
  const n = String(name || '').trim().slice(0, 60) || 'MiGYM'
  return {
    id: opts.id || crypto.randomBytes(8).toString('hex'),
    name: n,
    slug: opts.slug || slugify(n),
    joinCode: String(opts.joinCode || newJoinCode()).toUpperCase(),
    created: opts.created || new Date().toISOString(),
  }
}

export function findGymByJoinCode(gyms, code) {
  const c = String(code || '').trim().toUpperCase()
  if (!c) return null
  return (gyms || []).find(g => g.joinCode === c) || null
}

export function publicGym(g) {
  if (!g) return null
  return { id: g.id, name: g.name, slug: g.slug }
}

export function usersInGym(users, gymId) {
  if (!gymId) return []
  return (users || []).filter(u => u.gymId === gymId)
}

export function sameGym(a, b) {
  return !!(a && b && a.gymId && a.gymId === b.gymId)
}

export function staffOfGym(user) {
  return !!user && (user.role === 'owner' || user.role === 'trainer')
}

export function publicUser(user, gyms, isAdmin) {
  if (!user) return null
  const gym = (gyms || []).find(g => g.id === user.gymId)
  return {
    id: user.id,
    name: user.name,
    admin: !!isAdmin(user),
    role: user.role || 'member',
    gym: publicGym(gym),
  }
}

export function setGymOwner(db, gymId, userId) {
  const gym = (db.gyms || []).find(g => g.id === gymId)
  const user = (db.users || []).find(u => u.id === userId)
  if (!gym || !user) return null
  user.gymId = gymId
  user.role = 'owner'
  return user
}

export function gymHasOwner(users, gymId) {
  if (!gymId) return false
  return (users || []).some(u => u.gymId === gymId && u.role === 'owner')
}

export function gymsWithOwners(gyms, users) {
  return (gyms || []).map(g => ({
    ...g,
    owners: (users || []).filter(u => u.gymId === g.id && u.role === 'owner').map(u => ({ id: u.id, name: u.name })),
  }))
}

/** Attach users who have no gymId to the first gym (creating one if needed). */
export function migrateOrphans(db, opts = {}) {
  db.gyms = db.gyms || []
  db.users = db.users || []
  const orphans = db.users.filter(u => !u.gymId)
  if (!orphans.length) return { db, gym: db.gyms[0] || null, created: false }
  let gym = db.gyms[0]
  let created = false
  if (!gym) {
    gym = makeGym(opts.defaultName || 'MiGYM', opts)
    db.gyms.push(gym)
    created = true
  }
  const isOwner = opts.isOwner || (() => false)
  for (const u of orphans) {
    u.gymId = gym.id
    if (!u.role) u.role = isOwner(u) ? 'owner' : 'member'
  }
  if (!db.users.some(u => u.gymId === gym.id && u.role === 'owner') && orphans[0]) {
    orphans[0].role = 'owner'
  }
  return { db, gym, created }
}
