# Robtic Staff Management System

Backend for the Robtic staff system: the **data layer**, the **slash-command
config phase** (`/role`, `/channels`, `/ticket-setup`, `/faq`, `/fast-access`),
the **Modmail + Report system**, the **Ticket + FAQ system** (Components V2), a
centralized **static data layer** (`src/data/`), the **prefix-command system**
(`!` ticket / modmail / staff commands) and **Fast Access** (`$macros`).
Punishments, gift claims and appeals execution are **not** built yet.

```
Tech: TypeScript · discord.js v14 · Mongoose 9 · MongoDB · Bun
```

---

## Quick start

```bash
bun install

# .env
MONGODB_URI=mongodb://127.0.0.1:27017
MONGODB_DB=robtic_staff
STAFF_TIMEZONE=Europe/Paris        # any IANA zone; week always starts Monday
DISCORD_TOKEN=...                  # only needed for the bot / command registration
DISCORD_APP_ID=...
LOG_LEVEL=info

bun run typecheck                  # tsc --noEmit
RUN_DEMO=1 bun run example:data    # exercises every service end-to-end
bun run register-commands          # push /role and /channels to Discord
bun run start                      # connect DB + start the gateway client
```

---

## Architecture

```
src/
  config/            typed runtime config, split by concern
    env.ts           raw env read + startup validation (assertRuntimeEnv)
    app.ts           env name, timezone, log level
    database.ts      Mongo URI + db name
    discord.ts       token, app id, guild id, prefixes
    index.ts         composed `config` object (stable shape)
  database/
    connect.ts       single-connection Mongoose bootstrap
    models.ts        model registry + syncAllIndexes()
  libs/              reusable infrastructure — no feature-module imports
    errors/          AppError hierarchy + Mongo error translation
    cache/           TtlCache<V> (get/set/has/delete/deleteByPrefix/clear/getOrSet)
    logger/          structured leveled logger (createLogger / logger)
    discord/         safeReply / safeEditReply / safeSend / safeMessageReply / replyEphemeralError
    validation/      snowflake + mention parsing helpers
    time/            re-export of shared/utils/time
    database/        re-export of BaseRepository + Mongo error helpers
  handlers/          application-level wiring — no business logic
    error/
      global.ts            process + Discord client error handlers
      interaction-error.ts  log + user-safe reply for interaction failures
  shared/
    types/           DiscordId aliases, ListOptions, MongoFilter helpers
    utils/           errors.ts / logger.ts re-export from libs (back-compat shims);
                     timezone helpers, id helpers
    repository/      BaseRepository<T> generic CRUD
  data/              STATIC config: messages, emojis, colors, embed templates,
                     enum re-exports, command constants  (see src/data/README.md)
  modules/
    staff/           Staff, StaffActivity, StaffPointTransaction, StaffHistory
    warnings/        StaffWarning, UserWarning
    reports/         Report (prep) + Ticket interface (prep only)
    appeals/         Appeal (prep)
    configuration/   RoleConfig, ChannelConfig, FastAccess
  discord/           gateway client, command + event loaders, registration,
                     register-runtime.ts (attach/start/stop module clients)
  commands/          slash commands (role/, channels/)
  events/            interactionCreate.ts (slash commands only)
  examples/          data-layer.example.ts
  bootstrap.ts       process error handlers + config + database + index sync
  index.ts           entry point — bootstrap, client, login, graceful shutdown
```

### Infrastructure libraries (`src/libs/`)

`libs/` holds reusable, feature-agnostic infrastructure. Rules: a lib never
imports a feature module; feature modules never import Discord event
implementations.

- **`libs/errors`** — `AppError` base (`code`, `category`, `metadata`, `cause`,
  `userMessage`, `isUserSafe`) with `ValidationError`, `PermissionError`,
  `NotFoundError`, `ConflictError`, `ConfigurationError`, `DatabaseError`,
  `DiscordError`, `InternalError`. `DomainError` remains an alias of `AppError`,
  so every existing importer keeps working. `translateMongoError()` maps
  duplicate-key → `ConflictError`, cast/validation → `ValidationError`,
  not-found → `NotFoundError`, everything else → `DatabaseError` (original
  logged internally, never shown to users). `toUserMessage()` / `toLogContext()`
  produce the user-safe string and the structured log payload.
- **`libs/cache`** — `TtlCache<V>` with per-key TTL, `getOrSet`, and
  `deleteByPrefix` for namespace invalidation. `CACHE_ENABLED` is `false` under
  `NODE_ENV=test`. No ad-hoc `Map` caches.
- **`libs/logger`** — leveled (`debug`/`info`/`warn`/`error`) structured logger;
  `logger.child(scope)` for per-area scoping. No `console.log`.
- **`libs/discord`** — safe response helpers that swallow already-replied /
  expired-token / deleted-message / missing-permission failures and never leak
  an unhandled rejection.

### Error handling layers

```
low level    throw a typed AppError (ValidationError, NotFoundError, …)
service      add context / translate external errors (translateMongoError)
handler      catch → log with context → user-safe reply (handleInteractionError)
global       process + client handlers log and keep the bot alive
```

`handlers/error/global.ts` registers `unhandledRejection`,
`uncaughtExceptionMonitor`, process `warning`, and Discord client
`error`/`warn`/`shardError`. The bot logs with context and does not silently die.

### Config-read caching

`RoleConfigService` and `ChannelConfigService` cache their hot reads
(`getStaffRoleLevels`, `getGeneralStaffRoleId`, `getChannelId`) in a
`TtlCache` (5-minute safety TTL). Any mutation (`setRole`, `unsetRole`,
`unsetType`, `rebuildLadder`, `set`, `unset`) invalidates the affected guild
key immediately, so MongoDB stays the source of truth. Authoritative mutable
state (punishments, appeals, tickets, point transactions) is never cached.

Every module is self-contained:

```
modules/<name>/
  types/      enums + re-exported model types
  models/     Mongoose schemas (one file per collection)
  services/   database operations only — no Discord
  index.ts    barrel
```

### Data-flow contract

```
Discord interaction → Command → Service → Mongoose Model → MongoDB
```

Command files hold Discord-specific logic; services hold database logic. Commands
never touch Mongoose directly.

### Static data vs dynamic config

`src/data/` holds **code-level** configuration only — user-facing copy, emojis,
colours, embed templates, enum definitions, command name/description constants,
feature flags. Feature code imports `messages.*`, `emojis.*`, `colors.*` instead
of inlining strings/glyphs/hex.

Guild-specific Discord IDs (roles, channels) stay **dynamic in MongoDB**
(`RoleConfigService` / `ChannelConfigService`, keyed by `guildId`) and are never
copied into `src/data`. Secrets stay in env vars (`src/config`). Full split in
`src/data/README.md`.

### Language

All user- and staff-facing copy is **Saudi Arabic** (`ar-SA`), written in the
centralised string layer (`src/data/messages/*.ts`, `src/data/<feature>/messages.ts`,
`commandCopy`, and the label maps). There is no locale switch — the bot ships
Arabic-only. Kept in English on purpose: brand name `Robtic`, Discord permission
names (`Administrator`, `Manage Roles`, …), technical tokens (`Fast Access`,
duration codes like `5m`/`3d`/`1M`), all enum / status / DB values, error `code`s,
slash-command **names / subcommands / options** (only their descriptions are
Arabic — see §9), and internal invariant-guard messages that a normal user can
never reach.

**Prefix commands** accept Arabic **and** English names. English canonical names
live on each `definePrefixCommand({ name })`; Arabic aliases are a central map in
`src/data/commands/prefix-aliases.ts` applied once in `commands/prefix/runner.ts`
(no command logic is duplicated). e.g. `!claim` = `!استلام`, `!close` = `!اغلاق`,
`!fire` = `!فصل`, `!warn` = `!تحذير`, `!break` = `!بريك`.

---

## Collections

| Collection                 | Purpose                                             | Mutability |
|----------------------------|-----------------------------------------------------|------------|
| `staff`                    | current state + **cached** counters/points          | mutable    |
| `staff_activities`         | feed of everything a staff member does              | append-only|
| `staff_point_transactions` | immutable point ledger (source of truth for points) | append-only|
| `staff_history`            | lifecycle/audit trail (accept, promote, fire, …)    | append-only|
| `staff_warnings`           | staff-only warnings (levels 1–3)                    | soft-delete|
| `user_warnings`            | community-user warnings (no Discord roles)          | soft-delete|
| `reports`                  | report prep — referenced by activity/points        | mutable    |
| `appeals`                  | appeal prep — references a warning/punishment       | mutable    |
| `role_configs`             | Discord role → staff-system slot mapping            | mutable    |
| `channel_configs`          | staff-system channel slot → Discord channel         | mutable    |
| `staff_configs`            | guild-wide numeric staff settings (promotion points)| mutable    |
| `warning_panel_deployments`| where the warning panel message lives, per guild    | mutable    |
| `fast_access`              | `$command` shortcuts per guild + context            | mutable    |

**The `staff` document never embeds reports, tickets, warnings, activities or
transactions.** Those live in their own collections and reference `staff._id`.
`staff.points` and the `*Claimed` / `*Completed` counters are denormalised caches;
the history collections are authoritative.

---

## Points

`StaffPointService` is the **only** writer of `staff.points`:

1. write an immutable row to `staff_point_transactions`
2. `$inc` the cached `staff.points` to match

```
Report claimed     +1
Ticket claimed     +1
Gift claim handled +1
Valid user warning +1
Valid staff warning+1
Successful appeal   -2   (penalty vs the staff member who issued the warning)
```

### Time-based totals — no duplicated period fields

Daily / weekly / monthly / all-time totals are **computed** by aggregating the
ledger over a `createdAt` window:

```ts
staffPointService.getDailyPoints(staffId)
staffPointService.getWeeklyPoints(staffId)
staffPointService.getMonthlyPoints(staffId)
staffPointService.getAllTimePoints(staffId)
staffPointService.getSummary(staffId)   // { daily, weekly, monthly, allTime }
```

Period boundaries use `STAFF_TIMEZONE` (configurable, default `UTC`) via Luxon.
**Weeks start on Monday** (ISO). `recalculateBalance(staffId)` re-derives the
cached balance from the ledger if it ever drifts.

### Idempotency

A partial unique index on `staff_point_transactions (staffId, type, referenceId)`
prevents the same event (e.g. one report claim) from awarding points twice.
`StaffPointService.add()` catches the duplicate-key error and returns
`{ duplicate: true }` instead of throwing.

---

## Permissions — who can run what

**An Administrator can run everything.** Every authorization gate folds the
Administrator permission in, so an admin is never locked out of their own server
by not holding a Staff role.

| Surface | Who |
|---|---|
| `/role · /channels · /points · /promote-points · /warn-setup · /ticket-setup · /vacation-setup · /faq` | Administrator only |
| Warning panel — تايم اوت · تحذير عضو | staff (`canActAsStaff`) |
| Warning panel — سجن · `!jail` | staff, **non-staff targets only**, and only below the actor's own top role (Administrators unrestricted) |
| Warning panel — تحذير ستاف | `canWarn()`: Staff Manager below Owner · Owner Manager at Owner · Administrator anywhere |
| `!check` (alias `!فحص`) | **Staff Manager / Owner Manager** (admin folded in) |
| `/scan · /fast-access` | Staff Manager (admin folded in) |
| `!come` | **HIGHSTAFF tier and up** (`/role boundary tier:highstaff`) |
| `!transfer` | **Transfer Manager** (`/role set type:TRANSFER_MANAGER`) |
| `!handover` + the ticket `[Transfer]` button | **the claimer of that ticket** |
| `!sleep` / `/sleep` | **anyone holding that panel's support role**, plus the claimer |
| `!close · !delete · !rename · !add · !remove`, ticket Options | the claimer |
| `!claim` | the panel's support role / ticket manager, per `panel.claimer` |
| `!accept` | Apply Manager · `!fire` Owner Manager · `!prompt`/`!demote` Staff Manager |
| Report claim / manage | staff; manage also needs claimer or Staff Manager |
| Gift claim review | Gift Manager or the gift panel's support role |
| Appeal review | Appeal Manager or Staff Manager |
| Punishment approval | KICK: Chat Manager · BAN: Administrator only |

### The one distinction that matters

`staffPermissionService` separates two questions that look alike:

- **`isStaff(member)`** — *identity*: do they actually hold a Staff role? Never
  folded with Administrator, because callers that ask this decide what happens
  **to** the member — the Server Tag restriction stripping their roles, a
  vacation snapshot, a `/scan` import. Treating every admin as staff there would
  restrict admins on tag removal and import them as staff.
- **`canActAsStaff(member)`** — *authorization*: may they run a staff action?
  Administrator always passes. Every "staff only" command gate uses this one.

`isAtLeastTier(member, tier)` answers the HIGHSTAFF/OWNER/SHIP question from the
calculated level and the configured boundary — never a Discord role position —
and an unconfigured boundary grants nothing (except to admins).

**Deliberately left as identity checks:** `!break` / `!unbreak` still require a
real Staff record, because an admin without one has no staff position to pause
and nothing to snapshot.

---

## Role configuration & the numbered hierarchy

`role_configs` maps each Discord role to a slot (`RoleConfigType`):
`START · END · STAFF · IGNORE · BLACKLIST · BREAK · STAFF_MANAGER ·
TRANSFER_MANAGER · WARN_1/2/3`.

- The **numbered ladder** = every `RoleConfig` with a numeric `level`
  (`START` = 0, intermediate rungs = `STAFF` + level, `END` = highest).
- The general **`@Staff`** role is `type STAFF` with **no** level — not on the ladder.
- **`IGNORE`** roles never carry a level and never consume one.

**`/role list`** prints everything currently configured, read straight from
`role_configs` (no cache): the numbered ladder with its levels, the tier
boundaries, every single-role slot (`*غير مضبوط*` when empty), the access /
ignored / level-ranged / staff-type roles. A configured role that no longer
exists in the guild is flagged rather than silently dropped, which makes it the
fastest way to spot a slot pointing at a deleted role.

```ts
roleConfigService.getStaffRoleLevels(guildId)          // [{ roleId, level, type }] ascending
roleConfigService.getStaffLevel(guildId, roleId)       // number | null
roleConfigService.getHighestStaffLevel(guildId, ids)   // number | null
roleConfigService.rebuildLadder(guildId, orderedIds)   // persist the full ladder
```

The command layer resolves/orders Discord roles (by position, minus IGNORE / the
general STAFF role) and passes plain ids to the service — services stay
Discord-free.

### `/role` is six subcommands, not twenty-five

Discord allows a command **25 subcommands, hard**, and `/role` had grown into all
25 — one per slot. It is now **six**, because a slot is data, not a command name:

| Before | Now |
|---|---|
| `/role start · end · staff · ignore · blacklist · staffmanager · ownermanager · transfermanager · applymanager · appealmanager · giftmanager · chatmanager · mute · jail · vacation · tag` | `/role set type:<slot> role:@role` |
| `/role warn warn1: warn2: warn3:` · `/role ownerwarns warn1: warn2: warn3:` | `/role set type:<warn slot> role:@role` (one slot per call) |
| `/role accepted · assign · access` | `/role range type:<slot> role: from: to:` |
| `/role highstaff · owner · ship` | `/role boundary tier:<…> role:@role` |
| `/role max · dev` (generated per Staff Type) | `/role stafftype type:<…> role:@role` |

The slot lists live in `src/data/roles/index.ts` (`ROLE_SET_SLOTS`,
`ROLE_RANGE_SLOTS`) and the choices are derived from `ROLE_SLOT_LABELS`, so
adding a `RoleConfigType` is a one-line data change — no builder edit, no
subcommand budget.

**Why tiers and staff types keep their own subcommand.** Choice lists cap at 25
too, so folding all of them into `set` would just move the ceiling. Staff types
are **generated** from `STAFF_TYPE_DEFINITIONS` and tiers from
`STAFF_TIER_KEYWORD_DEFINITIONS` — both grow on their own, and sharing one choice
list would let either silently consume the other's headroom. Separate lists mean
`set` stays at 22/25 no matter how many staff types get defined.

`command-limits.test.ts` asserts the Discord caps for every registered command;
`role-slots.test.ts` additionally asserts that every `RoleConfigType` is
reachable through exactly one subcommand, so a new slot can't be added to the
enum and silently left unconfigurable.

### The ladder follows Discord's role order automatically

The ladder **is** the role order between START and END — it is derived, never
typed in. `orderLadderRoles` (`configuration/utils/ladder-order.ts`) is the one
pure function behind both `/role set type:START|END` and the live sync, so they can never
disagree. `LadderSyncService` re-derives the band on `roleCreate` / `roleUpdate`
(position only) / `roleDelete`, and on every boot:

- a role **created** inside the band becomes a rung;
- a role **dragged into** the band joins, one dragged out leaves;
- a **deleted** rung disappears and everything above it renumbers;
- excluded slots (IGNORE, ACCESS, `@Staff`, TAG, WARN_*, STAFF_TYPE, …) and
  integration-managed roles stay off the ladder even inside the band;
- START/END are always rungs, even if also configured as something else.

A drag in the Discord UI emits one `roleUpdate` per shifted role, so writes are
debounced (`configurationConfig.ladderSyncDebounceMs`, 3s) into a single rebuild,
and the rebuild only runs when the computed order actually differs — a rename or
colour change ends in `UNCHANGED` without touching MongoDB. A half-configured
hierarchy (no START or no END) is skipped rather than guessed at.

---

## `!come @user <reason>`

Summons a member to where the command was typed. Staff only (`requireStaff`),
reason **required**, self/bot targets refused. Sends a plain DM (no embed) with a
link button jumping to the exact `!come` message:

```
لقد تم ندائك بواسطة @caller للحضور بسبب : <السبب>
```

A closed DM is reported back to the caller as a failure rather than a silent
success.

---

## Staff transfer (`!transfer @from @to`)

Hands **one member's Staff position** to another. Deliberately not a role
copier: only the five Staff-managed categories move, and the level they derive
from comes from `StaffHierarchyService`, never from whatever roles look
staff-ish.

**Authorization** — `staffManagementAuthorizationService.canTransfer(actor, source, target)`:
Administrator or the configured **Transfer Manager** role (`/role set type:TRANSFER_MANAGER`,
Administrators only). No level maths and no position maths — a Transfer Manager
gains nothing by sitting higher in the Discord role list.

**Moves:** Staff marker · numbered ladder up to the level · the Access Roles the
source *actually holds* · level-driven assignments · Accepted Role · Staff Type
(via `StaffTypeService`).
**Never touched:** Administrator, Transfer/Staff/Owner Manager, warning roles,
Vacation, Blacklist, or any unrelated Discord role — on either member.

**Refuses before touching anything** (all of it, in order): same member · bot
target · source not Staff / fired / already transferred · source or target
blacklisted (status *or* role) · source on break (status *or* an open vacation
row — a snapshot must never point at the wrong user) · source still owns active
cases (tickets, reports, appeals, gift claims awaiting fulfilment) · target
already Staff (`ACTIVE`/`BREAK` → rejected, never merged; a `FIRED`/`TRANSFERRED`
record is reused) · ladder unconfigured or hierarchy invalid. A case count that
*fails* is treated as blocking, not as zero.

**Atomicity** — validation completes before the first write. Then: grant to
target → strip source → Staff Type → DB. Any failure in that block rolls both
members' roles back and leaves MongoDB untouched. History is written last, so a
successful-transfer record can only exist for a transfer that finished.

**Data** — the two Staff records stay separate, linked by `transferredFrom` /
`transferredTo` / `transferredAt` / `transferredBy`. The source becomes
`StaffStatus.TRANSFERRED` (its own status, not a fake fire) and **keeps its
points, counters, `StaffPointTransaction` and `StaffActivity` rows**; the target
starts as a new Staff identity at the transferred level. Both records get a
`StaffHistoryAction.TRANSFER` entry (its own lifecycle event — never a fake
ACCEPT/PROMOTE/DEMOTE) carrying `sourceStaffId · targetStaffId · sourceUserId ·
targetUserId · sourceLevel · transferredRoleIds · performedBy · side`.

**Role safety** — every role passes `filterAssignableRoles` first: exists in the
guild, not `@everyone`, not integration-managed, below the bot. Anything else is
skipped and reported, never attempted.

Layering: command (`prefix/staff/transfer.ts`, pure I/O) → authorization →
`StaffTransferService` → hierarchy / type / assignment / accepted-role services →
Discord → MongoDB → history. Pure decision logic lives in
`staff-transfer-rules.ts` and is unit-tested without Discord or Mongo.

---

## Server Tag — role reconciliation

Live `userUpdate` / `guildMemberAdd` events remain the fast path. `ServerTagAuditService`
is the catch-up for everything the gateway could not report — a tag role handed
out by hand, a tag toggled while the process was down, a member who joined before
the role was configured. It runs **once on every boot** (`serverTagConfig
.auditIntervalMs` > 0 also schedules it periodically) and decides from state
alone via the pure `decideAuditAction`:

| tag | tag role | staff | → |
|---|---|---|---|
| on | missing | — | grant the role (and lift an active restriction) |
| on | held | — | nothing, unless a restriction is still running → lift it |
| off | held | — | remove the role (+ the restriction path, for staff) |
| off | missing | yes | the restriction path — 3-day deadline, snapshot + DM |
| off | missing | no | nothing |

Consistent members are never written to and never logged, so a sweep over a full
guild is silent. Real writes are spaced by `auditActionDelayMs` (250ms) so a
first run cannot burst into the rate limiter.

**The destructive half requires proof.** discord.js reports both "no tag" and
"the payload never carried `primary_guild`" as `primaryGuild: null`, so a member
chunk missing that field would otherwise read as "tag off" and strip a staff
member's roles. Before any revoke the audit re-asks the API
(`users.fetch(id, { force: true })`); if the fetch fails or disagrees, the member
is counted `unverified` and left alone — the same rule `detectTagState` already
applies to unverified DISABLED edges.

### The 3-day window is a deadline, not a pause

A staff member who removes the server tag has their Staff roles snapshotted and
stripped for 3 days, and is DMed the deadline.

- **Tag comes back inside the window** → `restoreRestriction(TAG_REAPPLIED)`
  hands every saved role back, exactly as before.
- **Window runs out** → `removeStaffPermanently`: the snapshot is **never
  restored**, the Staff record is **fired** and the **points balance is zeroed**.
  Getting back in means applying again.

The removal is deliberately terminal and deliberately *not* a blacklist —
dropping the tag is not a punishable offence, so `fire(..., blacklist: false)`
is used and the Blacklist role is never added. The restriction row is claimed
atomically (`ACTIVE → EXPIRED`) before anything is written, so two concurrent
sweeps can never fire or wipe twice. `rolesRestored` is recorded as `false`, and
because the closed row is no longer `isActive`, re-adding the tag later only
grants the tag role — it cannot resurrect the staff position.

Points are zeroed through the same `staffPointService.resetToZero` that
`/points reset` uses: it posts a compensating transaction, so the balance lands
at 0 while the historical transaction rows survive for audit. The wiped amount
is reported in the log embed.

**The tag log never lists roles.** Restriction / restore / removal cards report
the member, the reason, the duration and the outcome — not the saved, stripped,
restored, missing or blocked role mentions, which turned every card into a wall
of pings. `restoreStaffRoles` still returns `missing` / `blocked`, but they are
only used to pick between "تمت بنجاح", "تمت الإعادة مع تجاوز بعض الرتب" and
"ديسكورد رفض إرجاع الرتب"; `arabic-copy.test.ts` asserts no `<@&…>` ever reaches
a card.

The same rule applies on rejoin: `reconcileMember` finds a restriction that is
already past due and removes the member rather than restoring them, so being
offline past the deadline is not an escape.

---

## Warnings — two separate systems

| | `staff_warnings` | `user_warnings` |
|---|---|---|
| Subject | staff members | community users |
| Discord roles | `WARN_1/2/3` roles (set via `/role set type:WARN_1|2|3`) | **none** |
| Levels | 1, 2, 3 (3 → auto-demote, see below) | n/a |
| Origin | staff manager action | `source: DIRECT` or `source: REPORT` (+ `reportId`) |
| Removal | `status: REMOVED` + `removedBy/removedAt/removalReason` | `status: REVOKED` + `revokedBy/revokedAt/revokeReason` |

Both keep evidence as `string[]` (multiple attachments) and are **soft-deleted** —
historical rows are never destroyed.

### What 3 warns costs: a demotion, never a blacklist

Three verbal warnings convert into one real warning (`claimVerbalTriplet`, atomic
and per-category). Real warnings then run 1 → 2 → 3, and **warn 3 is paid for
with a demotion**:

| Real level | Consequence |
|---|---|
| 1, 2 | the warn role moves; nothing else |
| 3 | **demote one rung**, real warnings cleared, warn role comes off |
| 3 at level 0 | nothing left to demote to → **removed from staff**, `status: FIRED` |

**Warnings never blacklist anyone.** The only removal is the level-0 case, and it
passes `blacklist: false`, so no blacklist role is ever handed out by the warning
system. `!fire @user =` is still how you blacklist someone deliberately.

After a warn-3 demotion the ladder **restarts at zero** — the three real warnings
are marked `EXPIRED` (spent, not revoked, so history and `!warns` still show
them) and the next offence starts again at warn 1:

```
warn 1 → WARN_1 role
warn 2 → WARN_2 role
warn 3 → demote 4 → 3, warnings cleared, role removed
warn 4 → WARN_1 role   (cycle restarts)
```

Order matters in `applyWarningConsequence`: the warnings are expired **before**
`demote` runs, because `demote` re-syncs the warn roles from the active warning
level — with the warnings already spent, that same sync is what takes the warn-3
role back off. A test asserts that ordering, and that `fire` is never called with
the blacklist flag.

The rule itself is a pure function, `decideWarningOutcome(level, staffRoleLevel)`
→ `NONE | DEMOTE | FIRE`, so it can be read and tested without a database.

### Two staff warning ladders: `STAFF` and `OWNER`

Staff warnings carry a **`category`** (`WarningCategory`): `STAFF` or `OWNER`.
The two are tracked completely separately — a `STAFF` Warn 1 can never become an
`OWNER` Warn 2 — and each has its own three Discord roles, its own verbal→real
progression and its own active level.

**The manager never chooses.** `decideWarningCategory(targetLevel, ownerStartLevel)`
reads it from the target's calculated level against the configured Owner
boundary, so `!warn @user` alone decides. Ship tier also resolves to `OWNER`
(there is no third role set, and only an Administrator can warn Ship anyway).

`/role set type:<رتبة تحذير الأونر 1|2|3> role:@role` configures
`OWNER_WARN_1/2/3`, one slot per call (Administrators only). The normal
`WARN_1/2/3` slots go through the same `set` and stay unvalidated, as before.

Owner-warn validation still rejects `@everyone`, managed roles, roles above the
bot, ladder rungs, and any role already filling another Staff slot — the normal
warn roles included. The "all three must differ" rule survived the split: it used
to compare the three arguments of one call, and now compares the incoming role
against whatever the **other two slots already hold**, which is the same
guarantee — two owner-warn slots can never point at one role. The reply prints
the full trio after every write, so a half-configured set is visible.

**Who can warn whom** — `staffManagementAuthorizationService.canWarn(actor, target)`,
one decision point, levels from the hierarchy and never from role position:

| Actor | May warn |
|---|---|
| Administrator | every tier, Ship included |
| Staff Manager | `targetLevel < ownerStartLevel` |
| Owner Manager | `ownerStartLevel <= targetLevel < shipStartLevel` |
| anyone else | nobody |

Nobody warns themselves, Administrator included. Holding *both* manager roles
grants the union of both authorities — the "Owner Manager cannot warn normal
Staff" rule describes someone who is only an Owner Manager.

**Same channel, same shape.** `STAFF_WARN_ANNOUNCE` carries both; only the word
changes (`**Staff Warn 1 …**` vs `**Owner Warn 1 …**`), same four bold lines, no
embeds, message id still stored.

**Tier changes** (`syncWarningCategoryRoles`): crossing the Owner boundary
re-derives the active level *inside the new category* and clears the other
ladder's roles — the crossing is the one case where touching the other category
is intended. No warning record is created, moved or deleted, so crossing back
restores the other ladder's role.

### `!unwarn` — argument first, channel second

```
!unwarn @user staff          → the member's current staff warning
!unwarn @user <24-hex id>    → exactly that warning, staff or user
!unwarn @user                → falls back to the channel (staff room → staff warn)
```

**Administrators may run it anywhere.** Non-admins are still restricted to the
configured warn rooms and stay silent outside them, so the command never leaks
into normal chat.

The id check is a strict `/^[0-9a-fA-F]{24}$/`, deliberately narrower than
`Types.ObjectId.isValid` — that helper also accepts any 12-character string,
which would silently swallow the first word of a reason as if it were an id.
`resolveUnwarnMode` is exported and unit-tested on its own for exactly this.

**`!unwarn`** reads the category off the stored row and recalculates only that
ladder. Rows written before this feature have no `category`; `warningCategoryOf`
and `categoryFilter` treat them as `STAFF` (a Mongo `$in: [..., null]` also
matches a missing field), so no historical warning is reinterpreted or lost.

---

## Warning Management Panel (`/warn-setup`)

`src/modules/warning-panel/` is an **interaction layer, not a second warning
system.** Every rule — authorization, warning progression, category selection,
points, appeals, role reconciliation — stays in the services it already lived in.
The panel resolves inputs, calls those services, and reports what they returned.

```
/warn-setup                     → Administrator only; posts/updates the panel in
                                  the configured WARN_PANEL channel
إدارة العقوبات والتحذيرات        → one select menu, four actions:
   تايم اوت عضو · سجن عضو · تحذير عضو · تحذير ستاف
```

The channel comes from the existing channel-config system
(`/channels set type:لوحة إدارة العقوبات`) — no id is hardcoded, and `createPanel`
refuses to deploy until it is configured.

### The stored message id, and clearing the select

`/warn-setup` upserts `{guildId, key:"main", channelId, messageId}` into
`warning_panel_deployments`, so the bot can find and re-edit its own panel after a
restart instead of spamming a new one. Re-running the command edits that message;
moving the panel to a different channel deletes the old one.

That stored id exists because **a select menu keeps showing the option the manager
picked.** `showModal` *is* the interaction response, so the same interaction can't
also update the message — the fix is a separate edit, and the id is what makes
that possible. `WarningPanelRefreshService` does it from two triggers:

| Trigger | What it covers |
|---|---|
| after every use (`force: true`) | clears the menu for the manager who just used it — this is the one that matters |
| periodic sweep, `refreshIntervalMs` | every stored panel, for a client still holding a stale selection |

A `lastRefreshedAt` map suppresses an edit the service already made inside the
interval, so the after-use refresh and the sweep don't double-edit the same
message. A deleted message or channel returns `message-gone` / `channel-gone`
rather than throwing, so one broken deployment can't kill the sweep.

> **`refreshIntervalMs` is 5000 and that is aggressive.** The panel's content never
> changes, so the sweep re-sends an identical payload — at 5s that is ~17,000 edits
> per day per guild against Discord's per-channel edit limit, and it scales with
> guild count. The after-use refresh already clears the menu at the only moment it
> is actually stale. **Set `refreshIntervalMs: 0` in `src/data/warn-panel/config.ts`
> to disable the sweep** and keep the after-use refresh, or raise it to something
> like `300_000` if you want a slow safety net.

### The modals use native components, not typed ids

discord.js 14.27 supports select menus and file uploads **inside modals**, so:

| Field | Component | Why |
|---|---|---|
| المستخدم | `UserSelectMenuBuilder` in a `LabelBuilder` | no id to mistype or spoof |
| السبب | `TextInputBuilder` (paragraph) | capped at `limits.reasonMaxLength` |
| الدليل | `FileUploadBuilder` | managers attach proof; no pasted CDN links |
| المدة | `TextInputBuilder` (short) | **timeout only** |
| تحذير شفوي | `CheckboxBuilder` | **staff warn only** — see below |

Evidence is required for all four actions (`minValues: 1`) and capped at
`punishmentConfig.maxEvidenceShown`, reusing the punishment module's existing
limit rather than defining a second one. All uploaded URLs are persisted on the
punishment / warning record.

### Verbal vs real staff warnings

`!warn` issues a **real** staff warning unless the reason ends with a `=` marker,
which makes it verbal. The panel exposes that same choice as a checkbox, default
**unchecked = real**, so the panel and the prefix command have identical defaults
and both reach `issueVerbalStaffWarning` / `issueDirectRealStaffWarning`. The
verbal → 3 → real escalation, the fire-at-level-3 rule and the point award all
run inside those services exactly as before.

### Authorization is delegated, never reimplemented

Staff warnings call `staffManagementAuthorizationService.canWarn(actor, target)`,
which already encodes the required policy and recomputes the target's level from
`getHierarchy` at decision time:

| Actor | May warn |
|---|---|
| Staff Manager | `targetLevel < ownerStartLevel` |
| Owner Manager | `ownerStartLevel <= targetLevel < shipStartLevel` |
| Administrator | anything, including Ship |

The manager **never picks** `STAFF` vs `OWNER`. `resolveWarningCategory` derives
it from the target's live level against the Owner boundary, so the role set
(`/role set type:رتبة تحذير الستاف 1|2|3` vs `…الأونر…`) follows automatically and
cannot be steered from the client.

Timeout, jail and user warnings require `canActAsStaff` — the same bar `!warn`
uses for user warnings and the report flow uses for punishments.

### Nothing is trusted from the client

The select menu only decides **which modal opens**. On submit the service
re-reads every value, re-fetches the target as a live `GuildMember`, and runs
authorization again. Component visibility, cached levels and cached permissions
are never treated as proof.

### Execution order — success is never claimed early

Timeout and jail go through `punishmentService.executeAction`, which already
guarantees the required ordering: the record is created `PENDING`, the Discord
call runs, and only a **confirmed** call transitions it to `EXECUTED`. A Discord
failure lands on `FAILED` with `failureReason`, is audited, and the caller reports
the failure — no success message, no successful punishment record.

### `ModerationActionService` — one implementation, two entry points

`!jail @user <reason>` (alias **`!سجن`**, attach the proof to the message) does
exactly what the panel's سجن عضو does, because both call
`moderationActionService.jail(...)`. That service owns the whole flow —
create → execute → punishment log → warning-channel entry — so the panel and the
command cannot drift apart. `timeout()` sits beside it for the same reason.

`!jail` requires staff (`canActAsStaff`), a reason, and **at least one
attachment**; it refuses self and bots, and reports a Discord failure rather than
claiming success.

### Who may jail whom

`decideJailAuthorization` is a pure rule both the panel and `!jail` run **before
any record is written**, so a refusal leaves no `FAILED` punishment behind:

| Actor | May jail |
|---|---|
| Administrator | anyone |
| anyone else | **non-staff only**, and only someone whose top Discord role sits **strictly below** their own |

Two rules, in order. **Staff are never jailed by other staff** — jail is a member
punishment, and staff discipline runs through warnings instead. Then the ordinary
moderation hierarchy: you cannot jail someone at or above your own rank.

The yardstick is Discord **role position**, not the staff ladder, because the
second rule has to cover high-ranking members who are not staff at all and
therefore have no ladder level. Both inputs are resolved live at submit time —
no cached level, no cached permission.

> This guard is on **jail only**, which is what was asked for. `timeout` and
> `unjail` still run on `canActAsStaff` alone, so any staffer can time out or
> release anyone the bot outranks. Extending `canJail` to them is one call each
> in `moderationActionService`.

**`!unjail @user [reason]`** (alias **`!فك`**) lifts it through
`moderationActionService.unjail`, which reverses the punishment record — removing
the configured role and marking it `REVOKED` with an audit entry. Two details
worth knowing:

- it resolves the target **by id, not as a member**, so a jail on someone who has
  since left the guild can still be lifted instead of staying active forever;
- if there is no punishment record but the member holds the jail role — jailed by
  hand, or before the bot managed it — the role is removed anyway and the reply
  says so, rather than reporting a reversal that did not happen.

A test asserts that neither the panel nor either command calls
`createPunishment` / `executeAction` / `reversePunishment` directly, so a future
change can't quietly reintroduce a second copy of the flow. Two more assert the
punishment and user-warning paths never touch `staffWarningLogService`, which is
what would turn a log back into an announcement.

### Logged vs announced

**Only a staff warning is announced.** `STAFF_WARN_ANNOUNCE` is where the warned
member sees their warning and gets pinged, so nothing else goes there:

| Action | Goes to | Announced? |
|---|---|---|
| تايم اوت عضو | `PUNISHMENT_LOG` | no |
| سجن عضو / `!jail` | `PUNISHMENT_LOG` | no |
| تحذير عضو / `!warn` (user) | `WARNING_LOG` (embed) | no |
| تحذير ستاف / `!warn` (staff) | `WARNING_LOG` **+** `STAFF_WARN_ANNOUNCE` | **yes**, pings the member |

Staff and Owner warnings keep their **exact** existing format in the announce
channel — that part is untouched and pinned by line-by-line tests.

Because a timeout or jail now appears in `PUNISHMENT_LOG` and nowhere else,
`buildPunishmentLog` carries the two things that would otherwise be lost: the
**duration** (timeout) and the **evidence** the moderator uploaded. Both lines are
omitted when empty, so an approval-flow punishment logs exactly as it did before.

### Concurrency

`punishmentService` is already atomic per record — `assertPunishmentTransition`
plus a status-guarded `findOneAndUpdate` mean one punishment can never execute
twice — and `staffPointService.add` dedupes by `referenceId`, so a warning can
never award its point twice. On top of that the panel holds a short in-process
lock keyed by `guild:actor:target:action`, which stops a double-click from
creating two *different* records.

### Tests

Pure: the panel offers exactly the four actions and says **تايم اوت** (not
توقيت); every modal uses `UserSelect` for the target and `FileUpload` for
evidence; duration appears on timeout only and the verbal checkbox on staff warn
only, defaulting to false; evidence min/max track the shared punishment limit;
the four modal custom ids are distinct; duration parsing accepts the documented
formats and **rejects** rather than clamps past Discord's 28-day cap and under
its 1-minute floor; the moderation entries render target/reason/duration/evidence/
moderator and leak no id; and the Staff / Owner / verbal warning layouts are
asserted line-by-line so the shared composer cannot silently reshape them.

Refresh: an edit is issued for the stored message, a repeat inside the interval is
skipped, `force` overrides that skip (so a use always clears the menu), a deleted
message/channel is reported rather than thrown, and `refreshIntervalMs: 0` starts
no timer.

---

## Reports — handler-owned, transferable, closed on decision

The `#reports` card is a **Components V2 container** (accent follows state:
amber pending → green claimed → neutral closed) and is the **only** place the
report body is rendered: case id, reported user, masked reporter, reason,
description, evidence count, status, handler. Its action row carries **استلام**
and, once claimed, **تحويل**, plus **معلومات المُبلِّغ** and **إغلاق**. A closed
report keeps its card as a record with the close button disabled. The reporter is
still never named on it — `privacy.test.ts` walks the nested TextDisplay
components to prove that.

**The investigation thread has no opener message.** It used to be posted a
plain-text copy of everything already on the card, so the same report was written
twice, once as a component and once as loose text. That message is gone; the
thread now holds only the relay (reporter ↔ handler) and the system notes.

**Only the handler may reply.** A message in the thread from anyone who is not
the claimer (or an administrator) is **deleted** and answered with a system note
naming who owns the report. Previously the relay simply returned, so the message
stayed visible in the thread and looked delivered when it was not.

**Transfer** (`canTransferReport` → `decideTransferEligibility`): handler or
administrator, report open and claimed, target must be staff/admin and not a
bot, the current handler, or the reported user. The write is atomic on
`{ claimedByDiscordId: <current>, status: { $ne: CLOSED } }`, so two simultaneous
transfers cannot both land. The new handler gets a DM with a link button to the
thread, the thread gets a note, and the card refreshes.

**Closing.** `!end` (the decision prompt) and the thread's **إغلاق** button both
end at `CLOSED` now: once the final decision is recorded, `finaliseReport` calls
`closeAfterDecision`, which transitions to CLOSED, refreshes the card, posts a
closing note and archives the thread. `!close` also works inside a report thread
— it closes the report and leaves ticket behaviour untouched everywhere else.

**معلومات المُبلِّغ** and **إغلاق** now live on the `#reports` card itself (they
used to sit on the thread opener that no longer exists); the intermediate status
buttons (قيد التحقيق / بانتظار العضو / إنهاء) are gone, since the lifecycle is
now claim → work → decide → closed.

---

## Staff Support (`/staff-setup`)

One panel, three workflows, **built on the existing ticket system** — there is no
second ticket implementation. `TicketService` still owns creation, channels,
permissions, claiming, closing, transcripts and lifecycle; `StaffSupportService`
only decides *who* and *what*.

`/staff-setup` (Administrators) deploys the panel that **replaced the Break-only
panel** — it reuses the same deployment record, so an existing Break panel is
edited in place and no orphan is left behind. Buttons: **دعم الستاف** ·
**طلب إجازة** · **طلب استقالة**.

| Workflow | Opens a ticket? | Goes to |
|---|---|---|
| دعم الستاف | **yes** — `staff-support` panel | a ticket channel under the Staff Support category |
| طلب إجازة | no | the **existing** `VacationService` modal + approval flow, untouched |
| طلب استقالة | no | a manager card in the existing Break requests channel |

**Only Staff Support opens a channel.** Break and Demission are requests, not
conversations: they post a card to the Break requests channel and are actioned
from there, so no channel is created and nothing needs closing.

The `staff-support` panel is **`hidden: true`**: registered in `tickets.panels`
so `TicketService` resolves it normally, but excluded from `listPublicPanels()`,
so it never appears in the public ticket select — and a forged select value
naming it is rejected. The category id lives in
`src/data/staff-support/config.ts` (`staffSupportCategoryId`), never inside a
service, handler or command.

### Gift claims are unlimited

`giftClaimService.canCreate` no longer refuses a member who already has an open
claim — a member may file as many gift claims as they like, and each one is an
independent case. The gift-claim panel never opens a channel either
(`createsChannel: false`), so there is no per-member ticket to collide with.

### Visibility — derived from the applicant's tier

`decideSupportVisibility` reads the applicant's calculated level against the
configured `OWNER` / `SHIP` boundaries — never a Discord role position:

| Applicant | Who can see the ticket |
|---|---|
| below Owner | Staff Manager + Owner Manager + creator |
| Owner tier | Owner Manager + creator (**Staff Manager excluded**) |
| Ship and above | Administrators + creator only |

The panels' `supportRoleId` is deliberately unset — administrator-only is the
safe base — and the computed manager roles are added as per-channel overwrites
via the new `additionalRoleIds` option on `createTicket`.

### Demission — no accept/reject, one fire button

The card carries a single **فصل الموظف** button. `canHandleDemission` on
`StaffManagementAuthorizationService` decides: below Owner → either manager;
Owner tier → Owner Manager only; Ship+ → Administrator only.

Clicking it **re-fetches the applicant's live Staff state and re-authorizes** —
a tier change while the request sat open is picked up, and button visibility is
never treated as authorization. The request is then **claimed atomically**
(`OPEN → COMPLETED`), so two managers clicking at once fire exactly once; the
loser gets *"تم التعامل مع طلب الاستقالة مسبقًا."* and no duplicate FIRE history
or activity row is written. If the fire throws, the claim is released so it can
be retried. On success the card re-renders without the button.

The fire itself is the **existing** `staffManagementService.fire(...)` with
`blacklist: false` — resigning is not a punishment, and blacklist behavior is
unchanged. `preauthorizedActor(manager.id)` keeps the manager's id on the
history/activity records while skipping the service's own `!fire` gate, which
the demission decision has already replaced.

> **`!fire` is deliberately not the same matrix.** `canFire` stays restricted to
> Administrators and Owner Managers because it is an *unsolicited* dismissal;
> a resignation the member asked for is actioned by whoever manages that
> member's tier. That is why demission has its own decision rather than reusing
> `canFire`.

---

## Appeals

Fully implemented — see **[Appeal System](#appeal-system)**. A user appeals a
punishment through the bot's DM; authorised staff accept/reject in the `APPEALS`
channel; accepting reverses the punishment and, for warning appeals, applies the
`-2` `APPEAL_SUCCESS_PENALTY` to the issuer (idempotently).

---

## Enums / types

All fixed value sets are `as const` objects + matching union types (usable as
both value and type), never bare `string`:

```
StaffStatus · StaffActivityType · StaffPointTransactionType · StaffHistoryAction
WarningStatus · WarningSource · StaffWarningLevel
ReportType · ReportStatus
RoleConfigType · ChannelConfigType · FastAccessContext
PunishmentType · PunishmentStatus · PunishmentApprovalStatus · PunishmentAuditAction
VacationType · VacationStatus · VacationSource · VacationDurationUnit
AppealStatus (PENDING·CLAIMED·UNDER_REVIEW·ACCEPTED·REJECTED·CANCELLED)
GiftClaimStatus (PENDING·RE_REQUESTED·APPROVED·REJECTED·FULFILLED) · GiftClaimAuditAction
```

---

## Indexes

Built with `syncAllIndexes()` (also drops removed indexes).

| Collection | Indexes |
|---|---|
| `staff` | `{guildId, userId}` unique · `{guildId, points desc}` |
| `staff_activities` | `{staffId, createdAt}` · `{staffId, type, createdAt}` · `type` · `referenceId` |
| `staff_point_transactions` | `{staffId, createdAt}` · `referenceId` · `{staffId, type, referenceId}` **partial-unique** |
| `staff_history` | `{staffId, createdAt}` · `action` |
| `staff_warnings` | `{staffId, status, createdAt}` · `staffId` · `status` |
| `user_warnings` | `{guildId, userId, createdAt}` · `{guildId, userId, status}` · `source` |
| `reports` | `{guildId, status, createdAt}` · `{guildId, reportedUserId, createdAt}` · `reportId` unique · `claimedBy` · `type` |
| `appeals` | `{warningId, warningType, appellantId}` partial-unique (pending) · `appellantId` · `status` |
| `role_configs` | `{guildId, roleId}` unique · `{guildId, type}` · `{guildId, level}` |
| `channel_configs` | `{guildId, type}` unique |
| `fast_access` | `{guildId, contextType, command}` unique |

---

## Slash commands (phase 1)

Both commands are **Administrator-only** (`setDefaultMemberPermissions` +
runtime check) and guild-only. All replies are ephemeral.

```
/role set    type:<slot> role:@Role    → every single-role slot, one dropdown
/role range  type:<slot> role: from: to:
                                       → the slots bound to a span of the ladder
/role boundary tier:<…>  role:@Role    → first role of a tier (highstaff/owner/ship)
/role stafftype type:<…> role:@Role    → the role for a Staff Type (max / dev / …)
/role check  role:@Role                → what level & tier is this role?
/role list                             → everything currently configured

/channels set  type:<choice> channel:#chan   → ChannelConfig upsert (per guild+type)
/channels list                                → grouped ephemeral overview

/vacation-setup                               → post / refresh the vacation panel here
/warn-setup                                   → post / refresh the warning panel in
                                                the configured WARN_PANEL channel
```

`/role set` covers **22 slots** behind one `type:` dropdown — `START`, `END`,
`STAFF`, `IGNORE`, `BLACKLIST`, the six manager slots, `MUTE`, `JAIL`,
`VACATION`, `TAG`, `WARN_1/2/3` and `OWNER_WARN_1/2/3`. Most are a plain upsert;
four branch inside `set.ts` because they always did:

| Slot | What `set` still does |
|---|---|
| `START` | writes level 0, then re-derives the ladder if `END` already exists |
| `END` | rebuilds the whole numbered ladder from Discord role positions |
| `IGNORE` | stored without a level, so it never consumes a rung |
| `OWNER_WARN_1/2/3` | the full validation trio (see the owner-warns section) |

`/role range type:<ACCEPTED \| ASSIGN \| ACCESS>` takes an optional `from:` / `to:`
pair. `role:` is optional on the builder because `ACCESS` accepts a from/to span
of roles on its own; `ACCEPTED` and `ASSIGN` require it and say so.

Gift Claim has **no command** — it is a `gift-claim` ticket panel, edited in
`src/data/tickets/panels/gift-claim.ts` and deployed by `/ticket-setup`.
`/role set type:GIFT_MANAGER` is an optional extra grant for the case-card buttons.

Newer phases also register `/ticket-setup`, `/faq …`, `/fast-access …` and
`/vacation-setup`. Any new slash command needs `bun run register-commands` to
appear in Discord.

### Interaction handling

`src/events/interactionCreate.ts` handles **slash commands only** — it returns
immediately for anything else. Buttons + modal submits are handled by
`src/events/componentInteractionCreate.ts` (which fans out to per-module routers
such as `routeModmailComponent`); select menus and autocomplete are still
unhandled. The command lookup, the loader and `register-commands` all read one
static list (`src/commands/index.ts`).

---

## Modmail + Report system

The reporter's UI is a **DM with the bot**; the staff UI is a **thread off the
configured `REPORTS` channel**. The reporter is never in the thread.

```
reporter DM ─▶ bot ─▶ MongoDB ─▶ #reports message ─▶ investigation thread ─▶ staff
      ▲                                                                        │
      └──────────────── bot relays staff replies back to the DM ◀─────────────┘
```

### Module layout (`src/modules/modmail/`)

```
types/       enums + the case state machine (transitions.ts)
models/      ModmailCase · ModmailMessage · ModmailAttachment · ModmailAudit · Counter
services/
  modmail-case.service      id minting, CRUD, atomic claim, guarded transitions (DB only)
  modmail-message.service   append-only message log (idempotent on source message id)
  attachment.service        AttachmentStore abstraction — evidence bytes are pluggable
  modmail-audit.service     per-case audit timeline
  report-permissions.service canClaim / canManage / canViewReporterInfo (+ pure cores)
  target-classifier         USER vs STAFF vs NOT_IN_GUILD (+ pure core)
  claim-credit              "+1 point + REPORT_CLAIM activity", idempotent
  modmail.service           THE routing service — the only Discord+DB seam
render/      report-message (the whole card) · thread-messages (relay + system
             notes only) · dm-messages        (privacy-safe strings)
session/     dm-session-store  (in-memory wizard draft + activeCaseId, per user)
flow/        dm-routing  (pure: where does a DM go?)
handlers/    component-ids · modals · button/modal/dm-message/thread-message handlers
runtime.ts   holds the gateway client + resolvePrimaryGuild()
```

### Events

`interactionCreate.ts` stays **slash-only**. Two new sibling event modules:

| file | handles |
|---|---|
| `events/componentInteractionCreate.ts` | buttons + modal submits → `routeModmailComponent` |
| `events/messageCreate.ts` | DM → `handleDirectMessage`, guild thread → `handleThreadMessage` |

Relay logic lives in `ModmailService`, never in the event files.

### Report flow

1. User DMs the bot → **menu** with `[Report Someone]`.
2. Button → modal asks for the **target user id** (bot decides USER vs STAFF report;
   the user never picks). Not-in-guild → refused.
3. `[Add reason & description]` → modal (reason + description).
4. Bot asks for **evidence**: the user sends any number of attachments as DMs;
   they're held in the wizard draft. `[Submit report]` finalises.
5. On submit: `ModmailCase` created (`RPT-N` via an atomic counter), evidence
   persisted, a masked card posted to `REPORTS`, an (empty) thread started from
   it, `threadId` stored, `CASE_CREATED` audited, reporter DMed. Evidence files
   are the only thing posted into the thread up front.

### Claim — atomic & idempotent

`claimAtomic` is a single `findOneAndUpdate({ status: PENDING, claimedBy: {$exists:false} })`
— only the first concurrent click wins; everyone else gets *“already claimed.”*
The winner gets **exactly +1** via `StaffPointService.add` (unique
`staffId+type+referenceId` → a repeat claim of the same case awards nothing),
plus one `REPORT_CLAIM` `StaffActivity` and a `reportsClaimed` bump. On `RESOLVED`
the handler gets a `REPORT_COMPLETE` activity + `reportsCompleted` bump.

### Privacy

- The `REPORTS` card shows `🔒 Private` and relayed thread messages are labelled
  `👤 Reporter` — the render functions are not even given the reporter's id.
- `[Reporter Info (Admin)]` on the card is **Administrator-only** (enforced in
  `ModmailService.reporterInfo`, not just by hiding the button) and replies
  ephemerally; each use is audited `REPORTER_INFO_VIEWED`.
- **STAFF_REPORT**: `decideManageAccess` hard-blocks `member.id === reportedUserId`
  from claiming, relaying, viewing or transitioning — checked in the service, not
  only the UI.
- Logs never include the reporter id, DM content or evidence.

### State machine (`types/transitions.ts`)

```
PENDING → CLAIMED → INVESTIGATING ⇄ WAITING_USER
                         │  └────────────┐
                         ▼               ▼
                     RESOLVED ───────▶ CLOSED   (CLOSED is terminal)
```

Invalid transitions (e.g. `CLOSED → CLAIMED`) throw. A `CLOSED` case rejects new
DM/thread messages and its thread is locked + archived.

### Evidence storage abstraction

`AttachmentStore.persist(incoming) → StoredAttachmentRef`. The default
`DiscordCdnAttachmentStore` keeps the CDN URL. To move evidence to object
storage later, add an implementation returning an `EXTERNAL` ref and call
`attachmentService.useStore(new S3AttachmentStore())` at boot — no report code
changes. Every `ModmailAttachment` row references its `caseId` (and `messageId`).

### Session state

The DM wizard draft + `activeCaseId` live in an in-memory `DmSessionStore`
(per-process, 30-min TTL). Losing it only restarts a wizard or re-prompts case
selection — submitted cases, messages and evidence are all in MongoDB. Swap for
Redis/Mongo when running multi-process.

### Tests (`bun test`)

Pure logic is covered without Discord/Mongo: state machine, DM routing (incl.
closed-case), claim eligibility / manage access / reporter-info access, target
classification, reporter-privacy rendering, and `applyClaimCredit` (+1 once,
duplicate → nothing). `claim-atomic.integration.test.ts` covers the real
atomic-claim race and point idempotency against MongoDB and **auto-skips** when
none is reachable.

### New collections

| Collection | Purpose |
|---|---|
| `modmail_cases` | one report/case; `caseId` unique; `{guildId,userId,status}` + `{guildId,status,createdAt}` |
| `modmail_messages` | every relayed / internal message; unique partial index on `sourceMessageId` (relay idempotency) |
| `modmail_attachments` | evidence references; `{caseId,createdAt}` |
| `modmail_audit` | per-case timeline (`CASE_CREATED`, `CASE_CLAIMED`, `MESSAGE_FROM_*`, `EVIDENCE_ADDED`, `CASE_RESOLVED/CLOSED`, `REPORTER_INFO_VIEWED`) |
| `counters` | atomic `RPT-N` sequences |

> The earlier `reports` module (`Report` model) was scaffolding; the live report
> workflow is `modmail`. `Report` is left untouched for now.

---

## Ticket system

**Panel configuration is static code** (`src/data/tickets/`); **ticket state is
MongoDB**. Adding a category = add a file to `panels/`, import it in
`data/tickets/index.ts`, restart, run `/ticket-setup`. No ticket logic changes —
the select menu, routing, creation, questions, permissions and logging all
iterate the config array (there is zero `if (panelId === …)`).

### Config (`src/data/tickets/`)

```
types.ts            TicketPanelConfig / TicketMainConfig / TicketQuestion … (typed)
main.ts             the main panel: panelChannelId, managerRoleId, V2 content, select placeholder
index.ts            tickets = { main, panels: [...] }  + getPanel / listPanels / panelIds
panels/
  support.ts  technical.ts  account.ts  billing.ts
```

Each panel: `id · name · description · supportRoleId · categoryId · logChannelId ·
questions{enabled,items} · claimer{supportRoleCanClaim,managersCanClaim,onlyOnce,
transferable} · close{transcript,delete} · faq{enabled} · ticketMessage` (V2
content). The shipped ids are `000000000000000000` placeholders — `/ticket-setup`
validates every one against the guild and lists what's missing.

### Components V2

discord.js **14.27** (`@discordjs/builders` 1.14.1) — verified against the current
docs. Panel + opened-ticket messages are sent with `flags:
MessageFlags.IsComponentsV2` (so **no `content`/`embeds`**), built from
`ContainerBuilder` → `TextDisplayBuilder` / `SeparatorBuilder` /
`MediaGalleryBuilder` / `SectionBuilder(+thumbnail)` / `ActionRowBuilder`
(StringSelect + Buttons). Modal selects use the current `ModalBuilder
.addLabelComponents(new LabelBuilder().setUserSelectMenuComponent(…))` API, not
the deprecated action-row form.

### Flow

`/ticket-setup` → deploys/edits one V2 panel message (tracked in
`ticket_panel_deployments` so re-runs edit, not duplicate). The panel's
**String Select** has one option per panel (`label=name`, `desc=description`,
`value=id`). Selecting →

- `questions.enabled` → modal(s). >5 questions ⇒ multi-page (in-memory draft +
  a `Continue` button between pages); a modal is never over-filled.
- else → ticket created immediately.

Ticket channel is created under `categoryId` with overwrites: `@everyone` no-view,
support role + creator + bot → view/send. The V2 ticket message carries the
submitted answers, **Claim** + **Options** buttons, and a **FAQ select** only
when `faq.enabled` **and** ≥1 FAQ entry exists.

**Every in-channel notice is a V2 card too.** "استلام من @x", "بيتم إغلاق … خلال
5 ثواني", "تم إغلاق", the transfer note, the sleep warning / wake-up /
auto-close — all of them go through `render/notice.ts` (`buildTicketNotice`),
which wraps the lines in a `ContainerBuilder` with a tone-based accent colour and
silences mentions unless a user id is passed explicitly. Prefix commands reach it
through `ctx.replyWith(...)`, the component-capable sibling of `ctx.reply`. A
ticket channel therefore reads as a stack of cards rather than a card followed by
loose bot text. Ephemeral feedback to the acting staff member stays plain text.

### Claim (atomic, +1 once)

`findOneAndUpdate({ status: OPEN, claimedBy: {$exists:false} })` → first click
wins. Winner gets exactly **+1** via `StaffPointService.add` (unique
`staffId+TICKET_CLAIM+ticketId` ⇒ duplicate clicks award nothing), a
`TICKET_CLAIM` `StaffActivity`, a `ticketsClaimed` bump. Then overwrites flip:
**support role → no-view**, claimer keeps view, creator keeps view.

### Transfer (claimer → another staff member)

Two surfaces, one flow: the `[Transfer]` button in Options (a modal with a single
**User select** + a **required reason**), or **`!handover @user <reason>`**
(`!تسليم`, `!سلم`, `!تحويل-التكت`) inside the ticket channel. Both call
`performTicketTransfer`, so the DM, the channel note and the confirmation can
never drift apart between them.

> Not to be confused with `!transfer`, which moves a **staff member's position**
> between accounts. Ticket handover is `!handover`; staff transfer is `!transfer`.

**The new claimer earns the claim point.** A handover runs the same
`applyTicketClaimCredit` a direct `!claim` runs, so whoever ends up owning the
ticket is credited for it — `+1 TICKET_CLAIM`, one `StaffActivity`, one
`ticketsClaimed` bump. The `staffId + type + referenceId` unique index keeps this
honest in both directions: the **previous claimer keeps** the point they already
earned (it is never clawed back), and handing a ticket **back** to someone who
already held it awards nothing the second time. `transferTicket` returns
`pointAwarded` so the confirmation says which of the two happened rather than
always promising a point.

Available only on panels with `claimer.transferable: true` and only once the
ticket is **CLAIMED**. The receiver must be guild staff (`staffPermissionService
.isStaff`) or an Administrator; bots, the current claimer and the ticket's own
opener are refused. The write is atomic on
`{ status: CLAIMED, claimedByDiscordId: <current> }`, so two simultaneous
transfers can't both land. Then overwrites flip: **previous claimer keeps
view/history but loses `SendMessages`**, new claimer gets full access (the opener
is never demoted, even if they were somehow the claimer). The receiver gets a
**plain DM (no embed) with a link button** to the channel, the ticket channel gets
a transfer note, and `TICKET_TRANSFERRED` is logged with from / to / reason. **No
claim point is awarded** — the +1 stays with whoever claimed first — but
completion credit at close follows the new claimer (`claimedBy` moved).

### Manual channel deletion is caught, not lost

If someone deletes a ticket channel **outside the bot** (right-click → delete),
the `channelDelete` event still salvages it: the transcript is generated from the
in-memory buffer (`transcriptService.generate` takes a `null` channel and flushes
`transcriptCache`, so the conversation survives even though the channel is gone),
posted to the transcript channel, and the ticket is marked `DELETED`.

**Who did it** comes from the guild audit log — `AuditLogEvent.ChannelDelete`
matched on the channel id within a 60s window. It needs *View Audit Log*; if the
lookup fails or finds nothing the actor is recorded as `UNKNOWN` rather than
guessed. A `TICKET_DELETED_MANUALLY` entry is logged with the deleter, the panel
and a note that the channel went outside the bot.

The DB write is filtered on `status != DELETED`, so the bot's own delete path and
this safety net can never double-process the same ticket.

### Per-panel ticket stats

`!stats` breaks a staffer's tickets down **per panel**, each with claimed /
completed / currently-open, ordered by volume and labelled with the panel's
Arabic name (falling back to the raw id if the panel was removed from config):

```
__التكتات حسب القسم__
• الـدعـم الـفـنـي — استلم 12 · أكمل 10 · مفتوح 2
• دعـم مـايـنكـرافـت — استلم 5 · أكمل 5 · مفتوح 0
```

Computed in one `$group` over the ticket collection, so it is always consistent
with the tickets themselves rather than with a counter that can drift.

`/ticket-stats reset [member]` (Administrators) zeroes the stored
`ticketsClaimed`/`ticketsCompleted` counters — for one member or the whole guild.
**The ticket rows themselves are never touched**, which is also why `!stats`
numbers are unaffected by the reset: they are derived from the ticket collection,
not from those counters. Use the period selector (`TODAY` / `THIS_WEEK` /
`THIS_MONTH`) to scope what `!stats` reports.

### Sleep — idle ticket auto-close (`!sleep` / `/sleep time:`)

For when the opener has gone quiet. The ticket's handler (claimer or admin —
same `canManageTicket` gate as Options) marks it asleep; the opener gets a
**plain DM with a link button** into the channel:

```
سيتم اقفال التكت الخاص بك خلال 6 ساعات اذا لم ترد
الرجاء الذهاب الى التكت و الرد حالا
```

Duration defaults to **6h**; `!sleep 30m`, `!sleep 1h30m`, `!sleep 90` (bare =
minutes) or `/sleep time:6h` override it, clamped to `ticketSleepMinMs` (1m) …
`ticketSleepMaxMs` (7d) — anything unparseable is refused rather than silently
defaulted. A note is also posted in the channel, so a closed DM is not a silent
failure.

**Waking** — *any* message from the ticket's own opener clears the deadline
(staff messages do not; the deadline is about them answering). The hook runs on
`messageCreate` behind an O(1) `transcriptCache.isTracked()` check, so non-ticket
channels never touch MongoDB.

**Closing** — a 60s sweeper picks up due tickets (`{sleepDueAt, status}` index)
and closes them through the normal `ticketService.closeTicket`, so the
**transcript, the log entry and the completion credit behave exactly like a
manual close**. The deadline is cleared *before* the close runs, so two sweeps
can never double-close. Tickets whose window elapsed while the bot was down are
settled on the first sweep after boot. `TICKET_SLEEP` / `TICKET_SLEEP_CANCELLED`
are logged with the member, duration and deadline.

### Options (ephemeral, staff only)

`[Close] [Add User] [Remove User] [Rename] [Transfer]`. **Add User** = a modal with a multi-value
**User select** + **Role select** (both optional; ≥1 required) → grants access,
saves `addedUsers` / `addedRoles`. **Remove User** = a String select limited to
currently-added principals; owner / claimer / support role are **never**
removable. **Close** obeys the panel's `close` config (transcript? delete? both?
neither?) — `DELETED` keeps the DB record, only the channel goes.

### The closed-ticket panel (`close.delete: false`)

When a panel closes tickets **without** deleting the channel, the channel would
otherwise just sit there with no way to act on it. `closeTicket` now leaves a
Components V2 card in it — owner, handler, who closed it and when, the transcript
id — carrying three buttons:

| button | does |
|---|---|
| **النسخة** | replies **ephemerally** with the transcript `.txt`. If the panel never cut one (`close.transcript: false`) it generates one from the surviving channel and stores the id, so a second click reuses it. |
| **إعادة فتح** | `reopenTicket` — `CLOSED → OPEN`, clears `claimedBy/claimedAt/closedAt/closedBy/transcriptId`, re-arms `transcriptCache`, logs `TICKET_REOPENED`, posts a notice and deletes the panel message. |
| **حذف الروم** | `deleteTicket` — the normal path: transcript ensured, channel gone, DB row kept as `DELETED`. |

Gated by `decideClosedTicketAccess` — **administrator, ticket manager, the former
claimer, or the panel's support role**. Deliberately wider than
`decideManageAccess`: a closed ticket has no active handler, so the panel's own
staff have to be able to clean up.

Reopening drops the claim rather than restoring it, which keeps the invariant the
state machine already encodes (`CLOSED → CLAIMED` stays illegal, and `OPEN` means
unclaimed). Any eligible staff member — including the original handler — can
claim it again; the unique `staffId+TICKET_CLAIM+ticketId` point key means a
re-claim by the same person awards nothing.

**Completion credit is once per ticket.** `recordCompletionCredit` now stamps
`completionCreditedAt` with a conditional `findOneAndUpdate` and returns early if
it was already set, so a close → reopen → close loop cannot farm
`TICKET_COMPLETE` activities or `ticketsCompleted` bumps.

Closing does **not** change the channel's permission overwrites — the ticket
opener can still see (and post in) the channel until it is deleted. Say so if you
want the close to lock it down to staff.

### Services (`TicketService`, spec §32)

`createTicket · getTicket · getTicketByChannel · getTicketById · claimTicket ·
transferTicket · closeTicket · reopenTicket · deleteTicket · renameTicket ·
addUser · removeUser · addRole · removeRole` +
`ticketConfigService.getPanel/getPanelConfig`. `renameTicket`,
`closeTicket`, `deleteTicket` and `TranscriptService.generate` are ready for the
later `!rename / !close / !delete / !transcript` prefix phase (not built now).
`TranscriptService.generate()` already exports messages + attachments +
participants + Q/A + claim info + timestamps as a stored JSON `TicketTranscript`.

### FAQ (dynamic, MongoDB)

`/faq add` (modal: question + answer) · `/faq list` (numbered, plain) ·
`/faq remove` (**autocomplete** from the guild's FAQs — no id typing). Selecting a
FAQ in a ticket sends the answer as a **normal message** (never an embed, the
ticket message is not edited).

### Interaction routing (spec §33)

| surface | where |
|---|---|
| slash commands | `interactionCreate.ts` → command `execute` |
| **autocomplete** | `interactionCreate.ts` → command `autocomplete` |
| buttons / string selects / modal submits | `componentInteractionCreate.ts` → `[routeModmailComponent, routeTicketComponent, routeFaqComponent]` |

Ticket handlers are one-file-per-concern under `modules/tickets/handlers/`; the
`tk:` custom-id router only dispatches, never contains business logic.

### New collections

| Collection | Purpose |
|---|---|
| `tickets` | ticket state + history (`OPEN/CLAIMED/CLOSING/CLOSED/DELETED`, answers, addedUsers/Roles, claim/close/reopen/delete stamps, `completionCreditedAt`, transcriptId) — never deleted with the channel |
| `faqs` | `/faq` entries (`{guildId,faqId}` unique) |
| `ticket_transcripts` | stored JSON transcripts |
| `ticket_panel_deployments` | pointer to the deployed panel message so `/ticket-setup` edits it |

### Tests

`bun test` — ticket state machine (incl. `DELETED` terminal), claim eligibility /
manage access / protected principals (pure), `applyTicketClaimCredit` (+1 once /
duplicate → nothing, fakes), config-driven checks (select options == panel count,
`getPanel` generic, question paging never exceeds 5, `shouldShowFaqMenu` truth
table).

---

## Prefix commands

A `messageCreate`-driven prefix system, fully separate from slash / component /
modal / autocomplete handling. `interactionCreate.ts` is untouched.

```
messageCreate
  ├─ DM                     → modmail DM handler        (unchanged)
  └─ guild message
       ├─ starts with `$`   → runFastAccess()           → consumed (silent on fail)
       ├─ starts with `!`   → runPrefixCommand()        → consumed (silent on unknown)
       └─ otherwise         → modmail thread relay      (unchanged)
```

Prefix (`PREFIX`, default `!`) and Fast Access sigil (`FAST_ACCESS_PREFIX`,
default `$`) are env-configurable. `src/commands/prefix/`:

```
runner.ts            parse → resolve → execute; DomainError → reply, else silent
_shared/             parse (mentions/ids/counts), guards, target resolution
ticket/  claim close delete rename transcript add remove   → TicketService
modmail/ end                                               → resolutionService.openResolution
staff/   accept fire prompt demote warn unwarn warnings warns break unbreak jail unjail
         stats leaderboard check                          → StaffStatisticsService (read-only)
```

| command | delegates to | notes |
|---|---|---|
| `!claim` | `ticketService.claimTicket` | atomic; **+1 `TICKET_CLAIM`** once (unique `staffId+type+ticketId`); hides ticket from support role, keeps creator+claimer |
| `!close` | `ticketService.closeTicket` + `recordCompletionCredit` | obeys panel `close.{transcript,delete}`; panel log channel; a surviving channel gets the closed-ticket panel instead of a "closed" notice |
| `!delete` | `ticketService.deleteTicket` | channel deleted, **DB record kept** (`DELETED`, `deletedBy/At`). Works on a **closed** ticket too (`resolveTicketContext(ctx, { allowClosed: true })`), gated by `decideClosedTicketAccess` — that is how a `close.delete: false` channel gets cleaned up from the keyboard |
| `!rename <name>` | `ticketService.renameTicket` | sanitised channel name; no direct DB writes from the command |
| `!transcript` | `transcriptService.generate` | JSON transcript (messages, attachments, participants, Q/A, claim, timestamps) |
| `!add` / `!remove` | `ticketService.addUser/removeUser` | mentions or raw ids; `!remove` only touches `addedUsers/addedRoles`; owner/claimer/support role never removed |
| `!end` | `resolutionService.openResolution` | validates thread + `canManageReport`; opens the punishment/resolution select in the thread (see **Punishment & Resolution system**). Closing the case + `REPORT_COMPLETE` credit happen when a resolution is chosen. |
| `!accept @user [level]` | `staffManagementService.accept` | numbered roles `0..level` + general Staff; level clamped to configured END; `StaffHistory.ACCEPT` + `StaffActivity.ACCEPT` |
| `!fire @user [blacklist]` | `.fire` | strips numbered + Staff roles, adds **Break** (or **Blacklist**); status `FIRED`/`BLACKLISTED` |
| `!prompt @user [n]` | `.promote` | `+1` (or `+n`), never past END |
| `!demote @user [n]` | `.demote` | `-1` (or `-n`), floored at 0, keeps Staff role + `ACTIVE` at level 0 |
| `!warn @user <reason>` | `warningActionService` | **channel-routed**: in `USER_WARNS` → `UserWarning` (+1 `USER_WARNING`, no staff roles); in `STAFF_WARNS` → managers only, `StaffWarning` at `activeCount+1` (cap 3) + warn role + issuer **+1 `STAFF_WARNING`**; anywhere else → **silent** |
| `!jail @user <reason>` (`!سجن`) | `moderationActionService.jail` | staff-gated, **non-staff targets only**, and only below the actor's own top role (Administrators unrestricted); **requires an attachment** as proof; refuses self and bots. Same call the panel's سجن عضو makes, so the `JAIL` role and punishment record are identical. Logged to `PUNISHMENT_LOG`, never announced. A Discord failure is reported, never reported as success |
| `!unjail @user [reason]` (`!فك`) | `moderationActionService.unjail` | staff-gated; reverses the record (role removed, `REVOKED`, audited). Resolves by **id** so a departed member's jail can still be lifted; falls back to removing a hand-assigned jail role when no record exists, and says which happened |
| `!unwarn @user staff` / `!unwarn @user <id>` | `.revokeWarning` | the **argument** picks the target, not the channel: `staff` lifts the member's current staff warning, a 24-hex id lifts exactly that warning whether it is a staff or a user one. **Administrators can run it in any channel**; everyone else is still confined to the warn rooms and stays silent outside them. A bare call still falls back to the channel. Never deletes — marks `REVOKED`/`REMOVED` with `revokedBy/removedBy` + reason; staff warn role re-pointed at the highest still-active level |
| `!warnings [@user]` | read | own by default; others = staff only; staff warnings shown to managers / the warned staff |
| `!warns <id>` | read | full detail incl. evidence; user warning = staff or the warned user; staff warning = managers or the warned staff |
| `!break @user <5m\|3d\|1w\|1M>` | `vacationService.createManualBreak` | managers only; snapshots + removes staff roles, adds the configured **vacation** role, `Staff.status=BREAK` (level kept), `BREAK` history/activity; rolls back on any Discord failure |
| `!unbreak @user` | `vacationService.unbreak` | managers only; atomic `ACTIVE→CANCELLED`, restores `savedRoleIds`, `Staff.status=ACTIVE`, `RETURN_FROM_BREAK` |

**Permissions** are centralised: `staffPermissionService` (`isStaff` /
`isStaffManager` / `canManageStaff`, from `RoleConfig` — no hardcoded ids),
reusing `ticket-permissions` (`canClaimTicket` / `canManageTicket`) and
`reportPermissionService` (`canManageReport`).

## Fast Access (`$macros`)

- **`/fast-access add|remove|list`** — Staff-Manager gated. `add`: `cmd` +
  `message` + `context` (`MODMAIL` | `SUPPORT`). Command names are normalised
  (`RULES`, `$rules`, ` Rules ` → `rules`); **`{guildId, command}` is unique**
  (index changed from `+contextType`).
- **`$rules`** — `runFastAccess` (messageCreate): unknown / disabled / non-staff
  / wrong-context / no-permission all **silently no-op**. Context is detected
  live via the Ticket / Modmail services (multi-panel safe, no hardcoded
  channels): a `SUPPORT` macro only fires in an active ticket, a `MODMAIL` macro
  only in an open report thread and only for someone who `canManageReport`.
  - `SUPPORT` → plain message in the ticket channel.
  - `MODMAIL` → relayed staff→reporter through `modmailService.relayStaffToUser`
    (stored as a `ModmailMessage`, DMed to the reporter) — the existing relay
    architecture, not a copy.

### Tests

Pure: prefix parsing / mention-id extraction / count parsing, warn-channel
routing + `nextStaffWarningLevel` cap, staff level math (`resolveAccept/Promote/
DemoteLevel`, `rolesUpTo/Above`), Fast Access command normalisation.
DB-gated integration (auto-skips without Mongo): `!accept/!prompt/!demote/!fire`
role + status changes, `!warn` user/staff (persistence + issuer +1 once),
`!unwarn` (never deletes, role re-point), Fast Access `{guildId,command}`
uniqueness + duplicate rejection.

---

## Punishment & Resolution system

`src/modules/punishment/` — resolves a report into a concrete moderation
action. The **`Punishment` document is the source of truth**; Discord messages
are never consulted for history.

### Flow

1. **`!end`** in a report investigation thread → `resolutionService.openResolution`
   posts a 7-option select (`No Action`, `Warn`, `Timeout`, `Mute`, `Jail`,
   `Kick`, `Ban`). It no longer closes the case directly.
2. Picking an option shows a **reason modal** (`Timeout` also carries a duration
   select built from `TIMEOUT_PRESETS`). Reason is required for every type
   except `No Action`, is stored on the punishment, and is **separate from the
   report reason**.
3. `resolutionService.resolve` creates the `Punishment` and routes it:
   - **Warn** → `warningActionService.issueUserWarning` (points + `StaffActivity`
     stay inside the warning system — **no duplicate points**), plus a linked
     `Punishment(WARN, EXECUTED)` record via `metadata.warningId`.
   - **Timeout / Mute / Jail / No Action** → executed immediately by the bot.
     Mute/Jail apply the **configured** `MUTE` / `JAIL` role (`/role set type:MUTE|JAIL`,
     no hardcoded IDs).
   - **Kick / Ban** → an approval request card is posted to the configured
     `KICK_APPROVAL` / `BAN_APPROVAL` channel; nothing executes yet.
4. On finalisation the report is closed through the existing
   `modmailService.endInvestigation` and linked with
   `modmailCaseService.attachResolution({ resolutionType, punishmentId,
   resolvedBy })`.

### Approvals (`PunishmentApproval`)

- Card has **Approve / Reject / Info** buttons; every click is
  **authorized server-side** (`canDecideApproval`): `Ban` → Administrator only,
  `Kick` → Administrator **or** the configured `CHAT_MANAGER` role.
- **Self-approval blocked** — `requestedBy !== decidedBy`
  ("You cannot approve your own punishment request.").
- **Atomic decision** — `findOneAndUpdate({ approvalId, status: PENDING })`;
  the loser gets "This punishment has already been decided." A partial-unique
  index on `{ punishmentId }` where `status: PENDING` forbids two live
  approvals for one punishment.
- Approve → `resolutionService.executeApproved` → `PunishmentService` →
  Discord API → `status: EXECUTED` (the bot is the executor,
  `executedBy = bot`). If Discord throws → `status: FAILED` with the error
  saved to `PunishmentAudit`. **`EXECUTED` is never set before Discord
  succeeds.**

### State machine (`types/enums.ts`)

`PENDING → APPROVAL | EXECUTED | FAILED | REJECTED` ·
`APPROVAL → APPROVED | REJECTED | EXPIRED` · `APPROVED → EXECUTED | FAILED` ·
`FAILED → APPROVAL | EXECUTED` · `EXECUTED → REVOKED | EXPIRED` ·
`REJECTED` / `REVOKED` terminal. `assertPunishmentTransition` throws on an
illegal hop; all flips go through `PunishmentService.setStatus` (atomic,
concurrency-safe).

### After execution

- **Punishment log** → the `PUNISHMENT_LOG` channel after every final decision
  (approved, rejected, executed, failed). All copy from `src/data/messages/
  punishment.ts`.
- **DM to the punished user** — punishment type + reason + appeal hint; the
  **reporter is never named**. A "Why was I punished?" button
  (`resolutionService.getWhyInfo`) works for **3 days**
  (`evidenceAvailableUntil = executedAt + EVIDENCE_WINDOW_MS`); after that it
  returns the "evidence window has expired" message. The record is **never
  deleted**.
- **Staff activity** — `PUNISHMENT_REQUEST` / `PUNISHMENT_APPROVED` /
  `PUNISHMENT_REJECTED` recorded; **no points** unless a rule is defined.

### Duration parsing

One parser only — `src/modules/punishment/services/duration.service.ts`:
`parseDuration` (`"5m"`, `"1h30m"`, `"90"` = minutes), `clampTimeout`
(1 min – Discord's 28-day cap), `formatDuration`, `TIMEOUT_PRESETS`.

### Appeals prep

`punishmentId` is a stable `shortId(10)` so `Appeal.punishmentId` can reference
it. The appeal workflow itself is **not** implemented; `revokePunishment` is the
hook for a future accepted appeal.

### New collections

`punishments` · `punishment_approvals` · `punishment_audits`.

### Config

`/role set type:MUTE|JAIL|CHAT_MANAGER` (`RoleConfigType.MUTE` / `JAIL` / `CHAT_MANAGER`,
singleton) and `/channels set` slots `PUNISHMENT_LOG`, `BAN_APPROVAL`,
`KICK_APPROVAL`. A missing approval channel → the punishment is marked `FAILED`,
logged, and staff are told; **nothing is executed**.

### Tests

Pure: `parseDuration` / `clampTimeout` / `formatDuration` / presets, punishment
state-machine transitions (never execute a rejected/executed punishment),
`decideApprovalAuthorization` / `isSelfApproval` / `requiredBotPermission`.
DB-gated integration (auto-skips without Mongo): `createPunishment` persistence
+ audit, self-target rejection, losing the status-flip race, atomic approval
decision, partial-unique live-approval index, `attachResolution` report link,
`getUserRecentPunishment`.

---

## Staff Vacation / Break system

`src/modules/vacation/` — puts a staff member on break, holding their staff roles
safely and restoring them automatically. The **`Vacation` document is the source
of truth**; Discord state is never consulted for history or expiry.

### Config

- **`/role set type:VACATION role:@role`** — `RoleConfigType.VACATION` (singleton, **never** a
  numbered level, excluded from the ladder rebuild).
- **`/channels set type:VACATION_REQUESTS #chan`** — where application requests
  are posted.
- **`/vacation-setup`** — posts / refreshes the Components-V2 application panel in
  the invoking channel (tracked by `vacation_panel_deployments`).

### `Vacation` model (`vacations`)

`vacationId` (`shortId(10)`) · `guildId` · `staffId` (Discord user id) ·
`type` MANUAL|APPLICATION · `status` PENDING→APPROVED→ACTIVE→COMPLETED |
REJECTED | CANCELLED · `source` · `reason` · `duration` + `durationUnit`
(MINUTES|DAYS|WEEKS|MONTHS) · `startsAt`/`endsAt`/`requestedAt` ·
`approvedBy`/`rejectedBy`/`endedBy` (+ timestamps, `rejectionReason`) ·
**`savedRoleIds`** (authoritative restore data) · `rolesRestored` ·
`channelId`/`messageId` · `isOpen`.
Indexes on `{guildId,staffId}`, `{guildId,status}`, `{status,endsAt}`, and a
**partial unique** `{guildId,staffId}` where `isOpen:true` — at most one
PENDING/APPROVED/ACTIVE vacation per member.

### Role snapshot (§5)

On activation `VacationRoleService.snapshot` records the staff role ids the
member actually holds (`staffRoleIds` = ladder + general @Staff). Restoration
re-adds exactly `savedRoleIds` — **never** derived from `Staff.currentRoleLevel`,
which is left untouched (`Staff.status` flips to `BREAK`, the level stays).
Roles that no longer exist are skipped and logged; the operation never crashes.

### `!break @user <5m|3d|1w|1M>` (Staff Managers only)

Validate → parse (one parser) → confirm vacation role → claim the "one open
vacation" slot (`create` PENDING, partial-unique index is the concurrency guard)
→ `removeStaffRoles` → `applyVacationRole` (both **throw** on Discord failure —
the record is rolled back to `CANCELLED` and roles re-added, never left
half-applied) → flip `ACTIVE` → `Staff.status = BREAK` → StaffHistory `BREAK` +
StaffActivity `BREAK` → DM. Hierarchy + `Manage Roles` are checked up front (§26).

### `!unbreak @user` (Staff Managers only)

Atomic `ACTIVE → CANCELLED` claim → remove vacation role → `restoreSavedRoles`
→ `Staff.status = ACTIVE` → `RETURN_FROM_BREAK` history/activity → DM. If the
member left the guild the vacation is still cancelled (roles can't be restored).

### Application flow

Panel button → modal (**Reason** paragraph + **Duration** short: bare number =
days, `Nm` = months) → `createApplication` validates (staff, reason, duration,
vacation role, `VACATION_REQUESTS` channel) — an invalid application writes **no**
record — → `PENDING` `Vacation` + a Components-V2 request card (Accept / Refuse /
Info) in the requests channel + `VACATION_REQUEST` activity + DM.

- **Accept** — Staff-Manager only (server-side check on every click). Re-validates
  the applicant is still in the guild and still staff (§25), then **atomic
  `PENDING → APPROVED`** claim (a second click gets *"already been decided"*),
  applies the roles, flips `ACTIVE`, recomputes `startsAt`/`endsAt` from the
  approval instant, `Staff.status = BREAK`, `VACATION_APPROVED` + `BREAK`
  logs, edits the card, DMs. A post-claim Discord failure reverts to `PENDING`.
- **Refuse** — opens a reason modal, **atomic `PENDING → REJECTED`**, roles
  untouched (§20), `VACATION_REJECTED` activity, card edited, DM. `APPROVED ⇄
  REJECTED` is impossible (state machine).
- **Info** — ephemeral detail, Staff-Manager gated.

### Automatic expiry (`VacationExpirationService`, restart-safe + idempotent)

A `setInterval` sweep (60 s, plus one pass on boot) queries
`{status: ACTIVE, endsAt ≤ now}` — **no `setTimeout`, so restarts don't lose
anything**. Per vacation: fetch the member, then **atomic `ACTIVE → COMPLETED`**
(`endedBy: "BOT"`) — a second/parallel run gets `null` and returns `"already"`,
so roles are restored and `RETURN_FROM_BREAK` is logged **exactly once**. If the
member is gone it's *deferred* (left ACTIVE, retried) until a 14-day grace passes,
then force-completed without restoration. Roles restored → `Staff.status =
ACTIVE` → DM.

### Logging (§23-§24)

`StaffActivity` gains `VACATION_REQUEST` / `VACATION_APPROVED` /
`VACATION_REJECTED` / `BREAK` / `RETURN_FROM_BREAK`; `StaffHistory` reuses its
existing `BREAK` / `RETURN_FROM_BREAK`. No new log channel — the project has no
generic staff-log channel and none was added. **No points** are awarded for
vacation actions.

### Tests

Pure: `parseBreakDuration` (`5m`/`3d`/`1w`/`1M`, case-sensitive `m`≠`M`, rejects
bare numbers & junk), `parseApplicationDuration` (`7`→days, `1m`→months),
`resolveWindow` (calendar months), state-machine transitions (no
`APPROVED⇄REJECTED`, terminals terminal).
DB-gated integration (auto-skips without Mongo, uses minimal Discord fakes):
`!break` role swap + `Staff.status=BREAK` + level preserved, duplicate break,
missing vacation role writes nothing, application PENDING + request message +
activity, duplicate application, concurrent approve (one wins), refuse leaves
roles + blocks later approve, unauthorized decision rejected, `!unbreak` restore,
expiry completes once + restores once (idempotent) + member-absent defer + sweep.

---

## Appeal System

`src/modules/appeals/` — a punished user appeals **through the bot's DM** (no
server channel access needed, §29); authorised staff decide in the `APPEALS`
channel; accepting reverses the punishment.

```
Punishment executed → DM (Why was I punished? · Appeal)
  → Appeal form (reason + evidence links)   → Appeal PENDING
  → review card in APPEALS channel          (Claim · Accept · Reject · Info)
  → authorised staff decide                 → ACCEPTED reverses · REJECTED upholds
  → user DM'd the decision
```

### `Appeal` model (`appeals`, never deleted §28)

`appealId` (`shortId(10)`) · `guildId` · `userId` (appellant) · `punishmentId`
(→ `Punishment.punishmentId`) · `reason` · `evidence[]` · `status`
PENDING→CLAIMED→(UNDER_REVIEW)→ACCEPTED|REJECTED (CANCELLED reserved) ·
`submittedAt` · `claimedBy/At` · `reviewedBy/At` · `decisionReason` ·
`channelId/messageId` · `penaltyAppliedAt`/`penaltyTransactionId` (−2 idempotency)
· `reversalError`. **`unique` index on `punishmentId`** ⇒ one appeal per
punishment (§3) — a decided or pending appeal blocks a new one.

### Config

- **`/channels set type:APPEALS #chan`** — review channel. Unset ⇒ appeal
  creation is refused and the user is told the system is unavailable (§5).
- **`/role set type:APPEAL_MANAGER role:@role`** — extra reviewer role. Staff Managers can
  always review (`AppealPermissionService.canReview`, extensible §16).

### Eligibility (`AppealService.canAppeal`, §6/§7/§33)

Punishment must exist, be `EXECUTED`, not `NO_ACTION`, `userId` must match, and
`guildId` must match when supplied — a client-supplied punishment id is never
trusted. The **3-day evidence window gates "Why was I punished?" only** — it does
**not** block appealing (the project defines no appeal deadline).

### Reversal — `PunishmentService.reversePunishment()` (§18/§19)

All undo logic is centralised in `PunishmentService`; `AppealService` only calls
it. Idempotent (early-returns if already `REVOKED`), atomic `EXECUTED → REVOKED`:

| Type | Action |
|---|---|
| WARN | `userWarningService.revoke` — marked `REVOKED`, never deleted |
| TIMEOUT | `member.timeout(null)` |
| MUTE / JAIL | remove the configured role |
| KICK | nothing to undo — just `REVOKED` |
| BAN | `guild.bans.remove` if the bot has Ban Members |
| NO_ACTION | nothing |

Stores `revokedBy` / `revokedAt` / `revocationReason` / `appealId`; a Discord
failure is saved to `metadata.reversalError` + audited, the decision still
stands.

### Concurrency & idempotency (§21/§32)

- **Claim** — atomic `PENDING → CLAIMED`; the loser gets *"already claimed"*.
- **Decide** — atomic `findOneAndUpdate({status: {$in: [PENDING,CLAIMED,UNDER_REVIEW]}}, …)`;
  accept-vs-reject and double-accept resolve to exactly one winner, the rest get
  *"already been decided"*. `ACCEPTED ⇄ REJECTED` is impossible.
- **Warning −2** — `staffPointService.add({ type: APPEAL_SUCCESS_PENALTY,
  amount: -2, referenceId: appealId })` + the `{staffId,type,referenceId}` unique
  index ⇒ reprocessing never stacks to −4. `Appeal.penaltyAppliedAt` guards too.

### Reviewer restrictions (§15/§33, server-side)

`isReviewerConflicted` blocks the punishment's **issuer**, **approver** and — when
`punishment.reportId` resolves — the **original investigator** (`ModmailCase.claimedByDiscordId`)
from claiming or deciding. Reporter identity is **never** surfaced (§27); the Info
button shows Punishment ID / type / date / issuer / Report ID / investigator only.

### Logging (§34)

`StaffActivity`: `APPEAL_CLAIM`, `APPEAL_ACCEPTED`, `APPEAL_REJECTED`,
`PUNISHMENT_REVOKED`. `StaffHistory`: `APPEAL_PENALTY` (against the issuer).
`PunishmentAudit`: `APPEAL_SUBMITTED`, `APPEAL_CLAIMED`, `APPEAL_ACCEPTED`,
`APPEAL_REJECTED`, `REVOKED`, `REVERSAL_FAILED` — every entry carries
`appealId` + `punishmentId`. No points for claiming (no rule defined).

### DM notifications (§24)

Accepted / rejected DMs include the punishment label + decision reason, never
staff-only data. A DM failure is logged and **does not roll back** the decision.

### Tests

Pure: `isReviewerConflicted`, appeal state machine (terminals terminal, no
`APPROVED⇄REJECTED`). DB-gated integration (auto-skips without Mongo, minimal
Discord fakes): eligibility (own / other / wrong-guild / missing / expired
evidence still allowed), creation (new / duplicate / empty reason / no channel),
claim race, self-review block, unauthorised reviewer, reject leaves punishment
`EXECUTED`, reversal per type (timeout / mute / jail / kick / ban), warning
accept → warning `REVOKED` + issuer `-2` once, accept-vs-reject race, double
accept → one `REVOKED` audit, DM-failure doesn't roll back.

---

## Gift Claim System

`src/modules/gift-claims/` — Gift Claim **is a ticket panel**. It shows up as a
"Gift Claim" option in the main ticket select menu and runs the exact same
`runCreateTicket` pipeline as every other panel; only the in-ticket business
logic (proof, approve/reject/re-request/fulfil) is gift-claim specific. It never
touches Modmail and there is **no gift-claim command / button / separate panel**.

```
main ticket panel → select "Gift Claim"
  → canCreate() reward + duplicate check   (no reward → refused, no ticket opened)
  → runCreateTicket()  → normal Ticket (panelId "gift-claim", GIFT category, GM support role)
  → attachToTicket()   → GiftClaim (PENDING) + case card + "upload your proof" prompt
  → claimant drops an image in the channel → proof[]      (messageCreate hook, §4)
  → Gift Manager: Claim (standard ticket claim) → Approve / Reject / Re-request / Done
```

### `src/data/tickets/panels/gift-claim.ts`

A regular `TicketPanelConfig` (`id: "gift-claim"`, `questions: false`,
`faq: false`, `close: {transcript:true, delete:false}`). Set `supportRoleId` to
your **Gift Manager role**, plus `categoryId` / `logChannelId`, then
`/ticket-setup` — its `validateConfig` covers this panel like any other. Add /
remove / reconfigure Gift Claim purely through this file (§13/§14).

### Models

- **`rewards`** — winner registry (`Reward { rewardId, guildId, userId,
  rewardName, prize? }`). No command creates rows (`rewardService.grant` is the
  integration point for a future giveaway system). Rewards never expire (§4).
- **`gift_claims`** — `GiftClaim { claimId, guildId, userId, rewardId,
  rewardName, prize?, status (PENDING→RE_REQUESTED→APPROVED→FULFILLED | REJECTED),
  proof[{url,uploadedAt}], reRequests[{message,requestedBy,requestedAt,
  responseAttachments[],respondedAt}], ticketId, channelId, messageId,
  reviewedBy/At, fulfilledBy/At, rejectionReason }`. **`unique` index on
  `rewardId`** = one claim per reward — the duplicate + concurrency guard
  (§12/§17). Never deleted; full proof + re-request history preserved.
- **`gift_claim_audits`** — `GIFT_CLAIM_CREATED / PROOF_RECEIVED / RE_REQUESTED /
  APPROVED / REJECTED / FULFILLED`, each carrying `claimId` + `userId` +
  `rewardId` (§18). `StaffActivity` records the manager's action
  (`GIFT_CLAIM_APPROVE / REJECT / RE_REQUEST / FULFILL`); `staff.giftClaimsHandled`
  is bumped on fulfil. No Staff Points beyond the standard `TICKET_CLAIM` a
  gift-claim ticket earns when claimed (§7).

### Permissions (`isGiftManager`, server-side on every button — §6/§17)

`Administrator` **or** the `gift-claim` panel's `supportRoleId` **or** the
`/role set type:GIFT_MANAGER` `RoleConfig` role. Ticket claim/close use the standard
`canClaimTicket` / `canManageTicket` against `panel.supportRoleId`.

### Proof (§4)

The claimant drops an image into their Gift Claim ticket channel → a
`messageCreate` hook (`handleGiftClaimTicketProof`, after prefix, before the
modmail relay) saves it to `proof[]` while PENDING, or to
`reRequests[last].responseAttachments` while RE_REQUESTED. Re-request responses
sent by **DM** are handled by `handleGiftClaimDmProof` (before modmail) — both
paths are scoped to the claimant's own claim so proof can never attach to
someone else's (§17), and both forward the image into the ticket channel.

### Manager buttons (atomic — §17)

| Button | Transition | Notes |
|---|---|---|
| Approve | `{PENDING,RE_REQUESTED} → APPROVED` | not fulfilled yet; records `reviewedBy/At` |
| Reject | `{PENDING,RE_REQUESTED} → REJECTED` | reason modal; proof untouched (§10) |
| Re-request | `{PENDING,RE_REQUESTED} → RE_REQUESTED` | modal → DM; a new `reRequests[]` entry each time (§8) |
| Done | `APPROVED → FULFILLED` | only enabled once APPROVED (§11); records `fulfilledBy/At` |

Each is a single status-guarded `findOneAndUpdate` — Approve-vs-Reject,
double-Approve and double-Done resolve to one winner; the rest get *"already
been decided."*

### Tests

Pure: `decideGiftManager` (admin / panel role / config role), claim state
machine. DB-gated integration (auto-skips without Mongo, Discord fakes):
`canCreate` valid/invalid winner + duplicate + cross-user, `attachToTicket`
creates PENDING linked to the ticket, second attach creates nothing,
`addTicketProof` while PENDING / ignored after decision, approve + activity +
unauthorised + double-approve, reject keeps proof + double-reject, re-request
cycle (DM `receiveProof` + in-ticket proof both land, multiple cycles preserved),
DM-proof isolation, done-before-approve rejected + double-done + `giftClaimsHandled`
bumped, restart-safe persistence.

---

## Staff Statistics & Leaderboards

`src/modules/staff-stats/` — a **read-only aggregation layer** over the existing
collections. It creates **no new persistent data** (§2): `StaffPointTransaction`
is the only source of truth for points, `StaffActivity` for activity counts.

```
!stats [@user] [period]   → own stats (self) · any member's (Staff Manager)
!leaderboard [period]     → alias !lb / !top ; period = daily|weekly|monthly|all
```

### Periods & date ranges (§3)

`StatsPeriod` = `TODAY · THIS_WEEK · THIS_MONTH · ALL_TIME`.
`resolveStatsRange(period)` is the **single** place period → `{start, end}` is
computed — it delegates to the existing `shared/utils/time.periodStart`, uses the
configured `STAFF_TIMEZONE`, weeks start **Monday**. `TODAY` = 00:00 today → now,
`THIS_WEEK` = Monday 00:00 → now, `ALL_TIME` = no lower bound.

### Aggregation strategy (§18/§20)

Every call is guild-scoped. `StaffPointTransaction` / `StaffActivity` carry no
`guildId`, so a query first resolves the guild's `Staff._id` set
(`StatsRepository.guildStaff`) and aggregates by `staffId ∈ guild` — never across
guilds. All aggregation is MongoDB `$group` (`$sum: "$amount"` for points,
`$sum: 1` per type for activity), never in Node.

| Section | Source |
|---|---|
| Points today / week / month / all | `StaffPointTransaction` `$sum` per range (negatives reduce; the warning-appeal `-2` is already a txn — never re-subtracted, §11) |
| Activity counters (per period) | `StaffActivity` `$group` by `type` — extensible, no hardcoded type list (§7) |
| Reports claimed / completed / assigned-now | `StaffActivity` `REPORT_CLAIM`/`REPORT_COMPLETE` + `ModmailCase` open+`claimedBy` (§8, the live report flow is Modmail) |
| Tickets claimed / completed / assigned / by-panel | `Ticket` by `claimedBy` + `claimedAt`/`closedAt`/`status`/`panelId` — gift-claim tickets stay identifiable by `panelId: "gift-claim"`, counted once as a ticket (§9) |
| Gift Claims approved / rejected / fulfilled / re-req / handled | `GiftClaimAudit` by `guildId` + `actorId` + `action` (its own data, not inferred from tickets — §10). `guildId` added to the audit for this. |
| Warnings issued / revoked, appeals handled / successful | `UserWarning` / `StaffWarning` / `Appeal` by issuer / reviewer (§11) |

### Leaderboard ranking (§5)

Non-fired / non-blacklisted staff (break & vacation stay eligible). Sort:
**points DESC → activityCount DESC → `staffId` (userId) ASC** as the deterministic
final tie-break. Entries `{ rank, staffId, points, activityCount }`; the command
shows the top 10 with a `+N more` footer.

### Permissions (§16/§17)

`canViewStats` — Staff Manager → any member, **detailed** (point-transaction
history); normal staff → **own only**, summary; non-staff → nothing.
`canViewLeaderboard` — any staff member.

### Files / commands / indexes

- **New module** `src/modules/staff-stats/` (`types`, `utils/date-range.ts`,
  `services/{stats-repository, staff-statistics.service, stats-permissions}`,
  `render/`). **No models.** `src/data/messages/stats.ts` for all text.
- **Commands**: `!stats` (alias `!statistics`), `!leaderboard` (aliases `!lb`,
  `!top`) — prefix, category `staff`. No slash commands.
- **Indexes added** (additive, picked up by `syncAllIndexes`):
  `StaffPointTransaction {staffId, type, createdAt:-1}`;
  `Report {guildId, claimedBy, claimedAt:-1}` + `{guildId, claimedBy, status}`;
  `Ticket {guildId, claimedBy, claimedAt:-1}` + `{guildId, claimedBy, status}`;
  `GiftClaimAudit {guildId, actorId, action, createdAt}`.
- **No cache** — aggregations are indexed and bounded by guild staff count;
  always recomputed from the DB (§19 leaves this optional).

### Tests

Pure `date-range`: TODAY/WEEK/MONTH/ALL boundaries, Monday week start, month
boundary, non-UTC timezone, synonym parsing. DB-gated integration: per-period
point sums + negatives + per-type breakdown, leaderboard ranking + `staffId`
tie-break + fired/blacklisted excluded + break kept + guild isolation + limit /
`totalRanked`, gift-claim counted once as ticket + separately in gift stats,
zero-activity & unknown staff, detailed-vs-summary gating.

---

## Weekly Staff Promotion Points

An **eligibility report, not a leaderboard, and not a promotion.** It answers one
question per staff member: *did they earn enough points this week?* It never
promotes anyone, never touches levels, roles, points or history — the existing
promotion system (`!prompt`) still does all of that.

```
/promote-points points:<number>   → Administrator only; the weekly threshold
!check  (alias !فحص)              → Staff Manager / Owner Manager (admin folded in)
```

### Configuration

`promotionPointsRequired` lives on the guild-wide `staff_configs` document
(`StaffConfigModel`, one per `guildId`), next to the role and channel configs.
Validated as a **positive integer** — `0`, negatives, decimals and non-finite
values are all rejected (`assertPositiveInteger`, and the slash option is an
integer with `minValue: 1`). Saving invalidates only the cached requirement
(`CONFIG_CACHE_TTL_MS`); no staff document, role or history is written.

### The week (§3)

`getCurrentWeekRange(now)` = **Monday 00:00:00 → now** in the configured
`STAFF_TIMEZONE`. It delegates to `shared/utils/time.periodStart("week", …)` —
the same centralized helper `staff-stats` uses, so the week boundary is defined
in exactly one place.

### Weekly points

`StaffPointTransaction` is the source of truth — **never** the cached
`Staff.points`. `getAllStaffWeeklyPoints` resolves the guild's ACTIVE staff
`_id` set, then runs a single `$match` + `$group` (`$sum: "$amount"`) inside
MongoDB; no transaction document is ever loaded into Node. Positive and negative
transactions both count (`TICKET_CLAIM`, `REPORT_CLAIM`, `USER_WARNING`,
`APPEAL_SUCCESS_PENALTY`, …) — weekly points are the **net** sum. Served by the
existing `StaffPointTransaction {staffId, createdAt:-1}` index.

### Who appears in the report

Only staff **below the OWNER boundary** — Owner and Ship tiers are never listed,
since a weekly point threshold isn't what their promotion turns on. The ceiling
comes from `hierarchy.boundaryLevels[StaffTier.OWNER]` and is applied as
`currentRoleLevel: { $lt: ownerStartLevel }` on the staff query, so excluded
members are trimmed **before** the aggregation and cost nothing. With no OWNER
boundary configured there is no tier to exclude and everyone is listed. The card
states the scope in its header so a missing owner never reads as a bug.

### The decision

Strictly `weeklyPoints >= promotionPointsRequired` → *مؤهل للترقية*, otherwise
*غير مؤهل للترقية*. Nothing subjective, no level suggestion, no auto-promotion.

### Output

Components V2, one block per staff member — display name, **mention**, weekly
points, decision. The staff `_id` is never rendered (there is a test asserting
that); the Discord id appears only inside the mention. The card sets no
`allowedMentions`, so the prefix runner's `{ parse: [] }` default applies and the
mentions are clickable pills that **ping nobody** — a 15-name report should not
fire 15 notifications. Ordering is `currentRoleLevel` DESC → display name ASC,
never by points. A V2 message caps at 40 components, so the roster is split at 15
members per message.

### Files / tests

- `modules/configuration/{models/staff-config.model.ts, services/staff-config.service.ts}`
- `modules/staff/services/staff-promotion-points.service.ts` — `configureRequiredPoints`,
  `getRequiredPoints`, `getCurrentWeekRange`, `getWeeklyPoints`,
  `getAllStaffWeeklyPoints`, `evaluateEligibility`, `generateCheckResult`. The
  `!check` command holds no business logic.
- `modules/staff/render/check-card.ts`, copy in `data/messages/staff.ts`.
- Pure tests: Monday/00:00/timezone week boundary, `>=` boundary incl. a negative
  weekly net, validation rejects `0 / -1 / 1.5 / NaN / Infinity`, the owner-tier
  ceiling (`belowLevelFilter` excludes the owner rung itself, lists everyone when
  unconfigured), card renders name+points+decision, mentions every member, leaves
  `allowedMentions` unset, leaks no database id, splits a 31-member roster into 3
  messages under the component cap.

---

## Discord ID handling

Discord IDs (guild / user / channel / role) are stored as **strings**. No
`GuildMember` / `User` / `Role` objects are ever persisted. discord.js is used
only for its types and, from the command phase on, the gateway client.
# robtic-staff-2
