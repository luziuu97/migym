import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  slugify, makeGym, findGymByJoinCode, publicGym, usersInGym,
  sameGym, migrateOrphans, staffOfGym, publicUser, setGymOwner, gymsWithOwners,
  gymHasOwner,
} from './gyms.js'

describe('slugify', () => {
  it('turns a gym name into a URL slug', () => {
    assert.equal(slugify('Box Palermo'), 'box-palermo')
    assert.equal(slugify('  Mi GYM 2  '), 'mi-gym-2')
  })
})

describe('findGymByJoinCode', () => {
  const gyms = [
    { id: 'g1', name: 'Alpha', joinCode: 'AAAA1111' },
    { id: 'g2', name: 'Beta', joinCode: 'BBBB2222' },
  ]
  it('matches a code case-insensitively and ignores junk', () => {
    assert.equal(findGymByJoinCode(gyms, 'aaaa1111').id, 'g1')
    assert.equal(findGymByJoinCode(gyms, '  BBBB2222  ').id, 'g2')
    assert.equal(findGymByJoinCode(gyms, 'nope'), null)
    assert.equal(findGymByJoinCode(gyms, ''), null)
    assert.equal(findGymByJoinCode(gyms, null), null)
  })
})

describe('sameGym', () => {
  it('is true only when both users share a gymId', () => {
    assert.equal(sameGym({ gymId: 'g1' }, { gymId: 'g1' }), true)
    assert.equal(sameGym({ gymId: 'g1' }, { gymId: 'g2' }), false)
    assert.equal(sameGym({ gymId: 'g1' }, {}), false)
    assert.equal(sameGym(null, { gymId: 'g1' }), false)
  })
})

describe('usersInGym', () => {
  it('does not leak members of another gym', () => {
    const users = [
      { id: 'a', gymId: 'g1' },
      { id: 'b', gymId: 'g2' },
      { id: 'c', gymId: 'g1' },
    ]
    assert.deepEqual(usersInGym(users, 'g1').map(u => u.id), ['a', 'c'])
  })
})

describe('staffOfGym', () => {
  it('treats owner and trainer as staff, not members', () => {
    assert.equal(staffOfGym({ role: 'owner' }), true)
    assert.equal(staffOfGym({ role: 'trainer' }), true)
    assert.equal(staffOfGym({ role: 'member' }), false)
    assert.equal(staffOfGym(null), false)
  })
})

describe('migrateOrphans', () => {
  it('creates a default gym and makes the first user owner', () => {
    const db = { users: [{ id: 'u1', name: 'Luciano' }], gyms: [] }
    const { gym, created } = migrateOrphans(db, {
      defaultName: 'MiGYM',
      id: 'gym1',
      joinCode: 'JOINME01',
      isOwner: u => u.id === 'u1',
    })
    assert.equal(created, true)
    assert.equal(gym.name, 'MiGYM')
    assert.equal(gym.joinCode, 'JOINME01')
    assert.equal(db.users[0].gymId, 'gym1')
    assert.equal(db.users[0].role, 'owner')
  })

  it('attaches later orphans to the existing gym as members', () => {
    const db = {
      gyms: [{ id: 'g1', name: 'Box', joinCode: 'X' }],
      users: [
        { id: 'u1', gymId: 'g1', role: 'owner' },
        { id: 'u2', name: 'New' },
      ],
    }
    migrateOrphans(db, { isOwner: () => false })
    assert.equal(db.users[1].gymId, 'g1')
    assert.equal(db.users[1].role, 'member')
    assert.equal(db.gyms.length, 1)
  })
})

describe('publicUser', () => {
  it('includes gym + role for the session payload', () => {
    const gyms = [{ id: 'g1', name: 'Box Palermo', slug: 'box-palermo', joinCode: 'SECRET' }]
    const u = publicUser({ id: 'u1', name: 'Ana', gymId: 'g1', role: 'member' }, gyms, () => false)
    assert.deepEqual(u, {
      id: 'u1', name: 'Ana', admin: false, role: 'member',
      gym: { id: 'g1', name: 'Box Palermo', slug: 'box-palermo' },
    })
    assert.equal('joinCode' in u.gym, false)
  })
})

describe('setGymOwner', () => {
  it('moves the user into that gym as owner', () => {
    const db = {
      gyms: [{ id: 'g2', name: 'Box' }],
      users: [
        { id: 'u1', gymId: 'g1', role: 'member', name: 'Ana' },
        { id: 'u2', gymId: 'g2', role: 'member', name: 'Luis' },
      ],
    }
    const u = setGymOwner(db, 'g2', 'u1')
    assert.equal(u.gymId, 'g2')
    assert.equal(u.role, 'owner')
    assert.equal(db.users[1].role, 'member')
  })
})

describe('gymHasOwner', () => {
  it('is false until someone in that gym is owner', () => {
    const users = [
      { id: 'u1', gymId: 'g1', role: 'member' },
      { id: 'u2', gymId: 'g2', role: 'owner' },
    ]
    assert.equal(gymHasOwner(users, 'g1'), false)
    assert.equal(gymHasOwner(users, 'g2'), true)
    assert.equal(gymHasOwner(users, 'g3'), false)
    assert.equal(gymHasOwner([], 'g1'), false)
  })
})

describe('gymsWithOwners', () => {
  it('lists owner names per gym without leaking other gyms', () => {
    const gyms = [{ id: 'g1', name: 'A', joinCode: 'X' }, { id: 'g2', name: 'B', joinCode: 'Y' }]
    const users = [
      { id: 'u1', name: 'Ana', gymId: 'g1', role: 'owner' },
      { id: 'u2', name: 'Bob', gymId: 'g2', role: 'member' },
    ]
    const out = gymsWithOwners(gyms, users)
    assert.deepEqual(out[0].owners, [{ id: 'u1', name: 'Ana' }])
    assert.deepEqual(out[1].owners, [])
  })
})

describe('makeGym', () => {
  it('stores a join code and a slug', () => {
    const g = makeGym('Box Palermo', { id: 'g1', joinCode: 'ABCD1234' })
    assert.equal(g.slug, 'box-palermo')
    assert.equal(g.joinCode, 'ABCD1234')
    assert.deepEqual(publicGym(g), { id: 'g1', name: 'Box Palermo', slug: 'box-palermo' })
  })
})
