# Pending member claim codes

Date: 2026-08-19

Gym staff can create a member before that person has an account, attach a name, membership, and training plan, and give them a personal code. The person types that code in the existing gym-code field when they create a profile. Walk-in with the gym join code alone still creates a blank member.

Ashim is the motivating gym: codes look like `ASHIM-K7MQ` or `ASHIM-LUCA`.

## Problem

Today a gym has one shared join code. Anyone with it can register a blank profile. Staff can set membership and a plan only after the account exists. There is no way to prepare Luca’s plan and membership, then hand him a slip that claims that prepared row.

Instance-level admin invites (`db.invites`) do not carry a gym, name, plan, or membership and are not this feature.

## Key decisions

- **Pending members are real `db.users` rows** without email or password. They show in the gym list. Membership and trainer plan APIs already key off user id and already write `state-<id>.json` for someone who has never logged in.
- **The lookup key is the full stored `claimCode`** (`ASHIM-K7MQ`), not a suffix derived from the current gym join code. Changing the gym join code does not rewrite printed slips. New pending members get the current join code as prefix.
- **One signup field.** `ASHIM` is walk-in. `ASHIM-K7MQ` claims a pending row. Exact match after normalize.
- **Owners and trainers can add pending members.** Only owners set membership (unchanged).
- **At register, name is pre-filled from the pending row and editable.** Email and password are always entered by the member.
- **Claimed codes are not reused as live lookup keys.** After claim, `claimCode` is cleared. `invitedBy` keeps the string for the gym list. A later pending member may receive the same code.

## Data model

Pending user fields (on `db.users`):

| Field | Pending | After claim |
| --- | --- | --- |
| `id` | set | unchanged |
| `name` | staff-set | client-supplied (pre-filled, editable) |
| `gymId` | caller’s gym | unchanged |
| `role` | `member` | unchanged at claim (still `member`) |
| `email` | absent | set |
| `password` | absent | hashed |
| `claimCode` | full uppercase code | cleared |
| `claimedAt` | absent | ISO timestamp |
| `invitedBy` | absent | the code they typed |
| `membership` | optional, owner-set | unchanged |
| `created` | when staff added the row | unchanged |

Login already fails when `user.password` is missing, so pending rows cannot sign in.

`claimCode` uniqueness (unclaimed only): must not equal any other unclaimed `claimCode` or any gym `joinCode`. That keeps register matching unambiguous.

### Code shape

Normalize: trim, strip internal spaces, uppercase. Same alphabet as gym join codes: `A-Z`, `0-9`, hyphen.

- **Prefix** is the gym’s current `joinCode` at issue time.
- **Default suffix** is 4 characters from `A-Z` and `2-9` (no `0`, `O`, `1`, `I`).
- **Custom slug** is 2–12 characters of that same suffix alphabet.
- **Stored value** is `{joinCode}-{suffix}`, e.g. `ASHIM-K7MQ`.
- Signup input must accept a longer string than today’s 24-character gym-code cap (gym join code is up to 24, plus `-`, plus up to 12). Cap the combined field at 40.

Gym join codes may still contain `0/O/1/I`. Only the generated/custom **suffix** excludes those characters.

Regenerate: new random suffix (or a new custom slug), new full `claimCode` stored, old slip stops working. Name, plan, and membership stay.

## Matching at register and lookup

Input is normalized as above. Order:

1. Unclaimed user whose `claimCode` equals the input → **claim**.
2. Else gym whose `joinCode` equals the input → **walk-in**.
3. Else fail with the same error as a bad gym code.

Do not report whether the suffix was wrong vs the gym was unknown.

Because the full code is stored, `ASHIM-K7MQ` keeps working after the gym join code changes to `BOX`. New pending members issued after that change get `BOX-…`.

`INVITE_ONLY`: a valid gym join code or a valid unclaimed `claimCode` is sufficient. Do not require a second instance-level admin invite. (Today `INVITE_ONLY` consumes `db.invites` when the typed code happens to match; do not make claim/walk-in fail when it does not.)

## Staff UI

Visible to `owner` and `trainer`.

- **Add member** on the gym screen. Sheet: name (required), optional custom slug. On save, show the full `claimCode` and a copy action. Row appears in the existing users list with a **not signed up** badge.
- Opening the person uses the existing detail sheet: trainers set plan / copy their plan; owners also set membership.
- On that sheet, while unclaimed: show `claimCode`, copy, regenerate random, set custom slug.
- Pending members stay `role: member`. Do not promote someone who has not claimed.
- Disable/delete of pending rows is out of scope.

## Register UI

One gym-code field, same screen as today.

After blur (or a short pause), `POST /api/register/lookup`:

- `kind: 'claim'` → show gym name, pre-fill **Your name**, leave it editable. Email and password still required.
- `kind: 'join'` → show gym name, name stays empty.
- miss → toast the generic gym-code error.

Submit remains `POST /api/register` with `{ name, email, password, code }`. The server repeats lookup and does not trust the client’s `kind` or pre-filled name beyond the fields the client sends.

## APIs

### Public

`POST /api/register/lookup` `{ code }`

- `{ kind: 'claim', name, gymName }`
- `{ kind: 'join', gymName }`
- `403 { error: 'a valid gym code is required' }`

Lookup returns no ids, membership, or plan.

`POST /api/register` — existing body. Server:

- **claim:** write `name`, `email`, hashed `password` onto that user; clear `claimCode`; set `claimedAt` and `invitedBy`; issue session cookie. Keep `id`, `gymId`, membership, and `state-<id>.json`.
- **join:** existing `registerPassword` (new member, first user in an ownerless gym still becomes owner).
- Claim vs join race (code claimed between lookup and register): generic 403.

### Staff (`requireStaff`)

`POST /api/admin/users/pending` `{ name, suffix?, gymId? }`

- Creates a pending member in the caller’s gym (`staff.gymId`).
- Platform admins with no `gymId` must pass `gymId`; otherwise `400`.
- Missing/empty suffix → 4-character random.
- Returns public user plus `claimCode`.

`POST /api/admin/user/claim-code` `{ id, suffix? }`

- Regenerates or sets a custom slug for an unclaimed member in this gym.
- `404` if missing, other gym, or already claimed.

`GET /api/admin/users` and `GET /api/admin/user` include `claimCode` while unclaimed and `claimedAt` after claim, so trainers can copy the slip.

Collision on create/regenerate: `409 { error: 'code already in use' }`. Invalid suffix: `400 { error: 'invalid join code' }`.

### Unchanged

- `POST /api/admin/user/membership` remains owner-only (`requireAdmin`) and already applies to pending rows.
- `GET`/`PUT /api/trainer/plan` remain staff and already work by user id.

## Errors

| Case | Status | Error |
| --- | --- | --- |
| Bad, used, or raced code | 403 | `a valid gym code is required` |
| Missing name | 400 | `name required` |
| Email taken | 409 | `email in use` |
| Weak password | 400 | existing `passwordError` string |
| Invalid suffix | 400 | `invalid join code` |
| `claimCode` collision | 409 | `code already in use` |

## Tests

Extend `api/auth.test.js` and `api/gyms.test.js` (or a focused `api/claim.test.js` if the helper is easier to test in isolation).

- Resolve: claim hit, gym walk-in, miss, claimed code no longer hits.
- Cannot mint a `claimCode` equal to a gym `joinCode`.
- Cannot mint a duplicate unclaimed `claimCode`.
- Register claim keeps `id`, membership, and trainer-written plan; client name overwrites pending name.
- Walk-in still creates a new user.
- Trainer can create pending; trainer cannot set membership.
- Lookup returns `name` only for claim, not for join.
- Login against a pending row fails.
- Regenerating a code makes the old string miss and the new string claim.

Frontend: gym list badge and add-member sheet are covered if there is an existing Gym/Login test harness; otherwise keep UI changes thin and rely on API tests plus a register-sheet lookup test if `Login.jsx` already has one.

## Out of scope

- Deleting pending members
- Expiring unclaimed codes
- Rewriting stored `claimCode`s when the gym join code changes
- Changes to instance-level `db.invites`
- Promoting pending members to trainer/owner before claim
- In-app rate limiting (unchanged: none)

## Implementation sketch

1. Claim-code helpers next to `api/gyms.js` (normalize, random suffix, compose `{joinCode}-{suffix}`, uniqueness, resolve).
2. Teach `registerPassword` (or a sibling) to claim vs create.
3. Lookup + pending + claim-code routes in `api/server.js`; expose `claimCode` / `claimedAt` on admin user payloads.
4. Gym UI: add member, badge, copy/regenerate on the person sheet.
5. Register UI: longer code field, lookup prefill.
6. Tests as above.
