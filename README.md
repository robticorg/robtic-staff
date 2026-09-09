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

## Role configuration & the numbered hierarchy

`role_configs` maps each Discord role to a slot (`RoleConfigType`):
`START · END · STAFF · IGNORE · BLACKLIST · BREAK · STAFF_MANAGER · WARN_1/2/3`.

- The **numbered ladder** = every `RoleConfig` with a numeric `level`
  (`START` = 0, intermediate rungs = `STAFF` + level, `END` = highest).
- The general **`@Staff`** role is `type STAFF` with **no** level — not on the ladder.
- **`IGNORE`** roles never carry a level and never consume one.

```ts
roleConfigService.getStaffRoleLevels(guildId)          // [{ roleId, level, type }] ascending
roleConfigService.getStaffLevel(guildId, roleId)       // number | null
roleConfigService.getHighestStaffLevel(guildId, ids)   // number | null
roleConfigService.rebuildLadder(guildId, orderedIds)   // persist the full ladder
```

The command layer resolves/orders Discord roles (by position, minus IGNORE / the
general STAFF role) and passes plain ids to the service — services stay
Discord-free.

---

## Warnings — two separate systems

| | `staff_warnings` | `user_warnings` |
|---|---|---|
| Subject | staff members | community users |
| Discord roles | `WARN_1/2/3` roles (set via `/role warn`) | **none** |
| Levels | 1, 2, 3 (3 → future auto-fire) | n/a |
| Origin | staff manager action | `source: DIRECT` or `source: REPORT` (+ `reportId`) |
| Removal | `status: REMOVED` + `removedBy/removedAt/removalReason` | `status: REVOKED` + `revokedBy/revokedAt/revokeReason` |

Both keep evidence as `string[]` (multiple attachments) and are **soft-deleted** —
historical rows are never destroyed.

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
/role start        role:@Role         → START slot, level 0
/role end          role:@Role         → derives the whole numbered ladder from
                                         Discord role positions between START and
                                         END, skipping IGNORE / @Staff / managed
                                         roles, then persists it (rebuildLadder)
/role staff        role:@Role         → general @Staff role (no level)
/role ignore       role:@Role         → IGNORE slot (never consumes a level)
/role blacklist    role:@Role         → BLACKLIST slot (singleton)
/role break        role:@Role         → BREAK slot (singleton)
/role staffmanager role:@Role         → STAFF_MANAGER slot (future !commands)
/role warn         warn1: warn2: warn3:→ WARN_1/2/3 staff-warning roles
/role mute | jail | chatmanager       → MUTE / JAIL / CHAT_MANAGER slots (punishments)
/role vacation     role:@Role         → VACATION slot (singleton, never a level)
/role appealmanager role:@Role        → APPEAL_MANAGER slot (extra appeal reviewers)
/role giftmanager  role:@Role         → GIFT_MANAGER slot (gift-claim reviewers)

/channels set  type:<choice> channel:#chan   → ChannelConfig upsert (per guild+type)
/channels list                                → grouped ephemeral overview

/vacation-setup                               → post / refresh the vacation panel here
```

Gift Claim has **no command** — it is a `gift-claim` ticket panel, edited in
`src/data/tickets/panels/gift-claim.ts` and deployed by `/ticket-setup`.
`/role giftmanager` is an optional extra grant for the case-card buttons.

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
render/      report-message · thread-messages · dm-messages  (privacy-safe strings)
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
   persisted, a masked message posted to `REPORTS` with a `[Claim]` button, a
   thread started from it, `threadId` stored, `CASE_CREATED` audited, reporter DMed.

### Claim — atomic & idempotent

`claimAtomic` is a single `findOneAndUpdate({ status: PENDING, claimedBy: {$exists:false} })`
— only the first concurrent click wins; everyone else gets *“already claimed.”*
The winner gets **exactly +1** via `StaffPointService.add` (unique
`staffId+type+referenceId` → a repeat claim of the same case awards nothing),
plus one `REPORT_CLAIM` `StaffActivity` and a `reportsClaimed` bump. On `RESOLVED`
the handler gets a `REPORT_COMPLETE` activity + `reportsCompleted` bump.

### Privacy

- The `REPORTS` message and thread show `🔒 Private` / `👤 Reporter` — the render
  functions are not even given the reporter's id.
- `[Reporter Info (Admin)]` in the thread is **Administrator-only** (enforced in
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

### Claim (atomic, +1 once)

`findOneAndUpdate({ status: OPEN, claimedBy: {$exists:false} })` → first click
wins. Winner gets exactly **+1** via `StaffPointService.add` (unique
`staffId+TICKET_CLAIM+ticketId` ⇒ duplicate clicks award nothing), a
`TICKET_CLAIM` `StaffActivity`, a `ticketsClaimed` bump. Then overwrites flip:
**support role → no-view**, claimer keeps view, creator keeps view.

### Options (ephemeral, staff only)

`[Close] [Add User] [Remove User]`. **Add User** = a modal with a multi-value
**User select** + **Role select** (both optional; ≥1 required) → grants access,
saves `addedUsers` / `addedRoles`. **Remove User** = a String select limited to
currently-added principals; owner / claimer / support role are **never**
removable. **Close** obeys the panel's `close` config (transcript? delete? both?
neither?) — `DELETED` keeps the DB record, only the channel goes.

### Services (`TicketService`, spec §32)

`createTicket · getTicket · getTicketByChannel · getTicketById · claimTicket ·
closeTicket · deleteTicket · renameTicket · addUser · removeUser · addRole ·
removeRole` + `ticketConfigService.getPanel/getPanelConfig`. `renameTicket`,
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
| `tickets` | ticket state + history (`OPEN/CLAIMED/CLOSING/CLOSED/DELETED`, answers, addedUsers/Roles, claim/close/delete stamps, transcriptId) — never deleted with the channel |
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
staff/   accept fire prompt demote warn unwarn warnings warns break unbreak
         stats leaderboard                                → StaffStatisticsService (read-only)
```

| command | delegates to | notes |
|---|---|---|
| `!claim` | `ticketService.claimTicket` | atomic; **+1 `TICKET_CLAIM`** once (unique `staffId+type+ticketId`); hides ticket from support role, keeps creator+claimer |
| `!close` | `ticketService.closeTicket` + `recordCompletionCredit` | obeys panel `close.{transcript,delete}`; panel log channel |
| `!delete` | `ticketService.deleteTicket` | channel deleted, **DB record kept** (`DELETED`, `deletedBy/At`) |
| `!rename <name>` | `ticketService.renameTicket` | sanitised channel name; no direct DB writes from the command |
| `!transcript` | `transcriptService.generate` | JSON transcript (messages, attachments, participants, Q/A, claim, timestamps) |
| `!add` / `!remove` | `ticketService.addUser/removeUser` | mentions or raw ids; `!remove` only touches `addedUsers/addedRoles`; owner/claimer/support role never removed |
| `!end` | `resolutionService.openResolution` | validates thread + `canManageReport`; opens the punishment/resolution select in the thread (see **Punishment & Resolution system**). Closing the case + `REPORT_COMPLETE` credit happen when a resolution is chosen. |
| `!accept @user [level]` | `staffManagementService.accept` | numbered roles `0..level` + general Staff; level clamped to configured END; `StaffHistory.ACCEPT` + `StaffActivity.ACCEPT` |
| `!fire @user [blacklist]` | `.fire` | strips numbered + Staff roles, adds **Break** (or **Blacklist**); status `FIRED`/`BLACKLISTED` |
| `!prompt @user [n]` | `.promote` | `+1` (or `+n`), never past END |
| `!demote @user [n]` | `.demote` | `-1` (or `-n`), floored at 0, keeps Staff role + `ACTIVE` at level 0 |
| `!warn @user <reason>` | `warningActionService` | **channel-routed**: in `USER_WARNS` → `UserWarning` (+1 `USER_WARNING`, no staff roles); in `STAFF_WARNS` → managers only, `StaffWarning` at `activeCount+1` (cap 3) + warn role + issuer **+1 `STAFF_WARNING`**; anywhere else → **silent** |
| `!unwarn @user <id>` | `.revokeWarning` | never deletes — marks `REVOKED`/`REMOVED` with `revokedBy/removedBy` + reason; staff warn role re-pointed at the highest still-active level |
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
     Mute/Jail apply the **configured** `MUTE` / `JAIL` role (`/role mute|jail`,
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

`/role mute|jail|chatmanager` (`RoleConfigType.MUTE` / `JAIL` / `CHAT_MANAGER`,
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

- **`/role vacation @role`** — `RoleConfigType.VACATION` (singleton, **never** a
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
- **`/role appealmanager @role`** — extra reviewer role. Staff Managers can
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
`/role giftmanager` `RoleConfig` role. Ticket claim/close use the standard
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

## Discord ID handling

Discord IDs (guild / user / channel / role) are stored as **strings**. No
`GuildMember` / `User` / `Role` objects are ever persisted. discord.js is used
only for its types and, from the command phase on, the gateway client.
# robtic-staff-2

