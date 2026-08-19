export const PLANS = ['monthly', 'pack', 'drop_in']

function todayISO(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

function addDays(iso, n) {
  const d = new Date(iso + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return todayISO(d)
}

export function isStaff(user) {
  return !!user && (user.role === 'owner' || user.role === 'trainer' || user.admin)
}

export function membershipActive(user, today = todayISO()) {
  if (isStaff(user)) return true
  if (!user || user.role !== 'member') return !user ? false : true
  const m = user.membership
  if (!m) return false
  if (m.status && m.status !== 'active') return false
  if (m.plan === 'pack' && !(m.sessionsLeft > 0)) return false
  if (m.plan === 'drop_in') {
    if (m.expiresOn && m.expiresOn !== today) return false
    if (m.sessionsLeft != null && !(m.sessionsLeft > 0)) return false
  }
  if (m.expiresOn && m.expiresOn < today) return false
  return true
}

export function publicMembership(user, today = todayISO()) {
  const m = user && user.membership
  const active = membershipActive(user, today)
  return {
    plan: m && m.plan ? m.plan : null,
    status: active ? 'active' : (m && m.status === 'cancelled' ? 'cancelled' : 'past_due'),
    expiresOn: m && m.expiresOn ? m.expiresOn : null,
    sessionsLeft: m && m.sessionsLeft != null ? m.sessionsLeft : null,
  }
}

export function applyPaid(current, patch = {}, today = todayISO()) {
  const plan = PLANS.includes(patch.plan) ? patch.plan : (current && PLANS.includes(current.plan) ? current.plan : 'monthly')
  let expiresOn = patch.expiresOn || (current && current.expiresOn) || null
  let sessionsLeft = patch.sessionsLeft != null ? Number(patch.sessionsLeft) : (current && current.sessionsLeft)
  const add = patch.sessionsAdd != null ? Number(patch.sessionsAdd) : (plan === 'pack' ? 10 : 0)
  if (plan === 'monthly') {
    const base = expiresOn && expiresOn > today ? expiresOn : today
    expiresOn = addDays(base, 30)
    sessionsLeft = null
  } else if (plan === 'pack') {
    sessionsLeft = (Number(sessionsLeft) || 0) + (add || 10)
    expiresOn = null
  } else if (plan === 'drop_in') {
    expiresOn = today
    sessionsLeft = 1
  }
  return { plan, status: 'active', expiresOn, sessionsLeft }
}

export function consumePackSession(user) {
  if (!user || user.role !== 'member' || !user.membership || user.membership.plan !== 'pack') return user
  const left = Math.max(0, (user.membership.sessionsLeft || 0) - 1)
  return {
    ...user,
    membership: { ...user.membership, sessionsLeft: left, status: left < 1 ? 'past_due' : 'active' },
  }
}
