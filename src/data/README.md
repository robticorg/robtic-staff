# `src/data` — static data / configuration layer

Everything that is **code-level configuration**: user-facing copy, emojis,
colours, embed templates, enum definitions, command constants, feature flags.
Change a message or a colour here — not by grepping feature code.

```
src/data/
├── index.ts            barrel — `import { messages, emojis, colors, … } from "src/data"`
├── README.md
│
├── config/
│   ├── index.ts        `appData` (branding, colors, limits, caseIdPrefix, feature flags)
│   ├── branding.ts     bot name, community name, footers
│   ├── colors.ts       embed colour palette (ints)
│   └── limits.ts       numeric constants (modal maxlengths, thread archive, …)
│
├── messages/
│   ├── index.ts        `messages` aggregate
│   ├── common.ts       generic errors / permissions / reply prefixes
│   ├── config.ts       `/role` + `/channels` reply copy
│   ├── modmail.ts      every string in the Modmail / Report flow
│   ├── staff.ts        staff-point reason strings
│   └── warnings.ts     forward-looking (no warning UI yet)
│
├── embeds/index.ts     reusable embed factory (colours + footer + branding)
├── emojis/index.ts     every emoji glyph the bot renders
├── roles/index.ts      `RoleConfigType` re-export + `ROLE_SLOT_LABELS`
├── channels/index.ts   `ChannelConfigType` re-export + slot labels/groups/choices
├── commands/index.ts   command / subcommand / option names + descriptions
├── enums/index.ts      domain-enum re-exports + `PunishmentAction` (prep)
└── tickets/            STATIC ticket-panel config (see below)
    ├── types.ts        TicketPanelConfig / TicketMainConfig / TicketQuestion
    ├── main.ts         the main panel (channel, manager role, V2 content)
    ├── index.ts        tickets = { main, panels } + getPanel / listPanels
    └── panels/*.ts     one file per ticket category
```

### `src/data/tickets` — the exception that proves the rule

Ticket-panel configuration is **deliberately static code** (unlike staff
roles/channels, which are per-guild dynamic). The Discord role/channel/category
IDs in `panels/*.ts` are literal strings you edit by hand; `/ticket-setup`
validates them against the guild. Ticket **state** (open/claimed/closed, answers,
added users) is dynamic → MongoDB (`tickets` collection). FAQ entries are dynamic
too → MongoDB (`faqs`).

## Static vs dynamic — the hard rule

| STATIC → `src/data` (this folder)        | DYNAMIC → MongoDB (services)              |
|------------------------------------------|------------------------------------------|
| Messages, emojis, colours                | Guild **role IDs** (`RoleConfigService`)  |
| Embed templates                          | Guild **channel IDs** (`ChannelConfigService`) |
| Enum definitions                         | Staff records, reports, modmail cases     |
| Command name/description constants       | Warning records, appeals                  |
| Default colours, limits, feature flags   | Fast Access commands, per-guild config    |

Guild role/channel IDs are **never** written here. `Robtic` runs in multiple
guilds; the same static code serves all of them and resolves IDs per `guildId`
through the config services.

## Secrets

**Never** in `src/data`: bot token, Mongo URI/password, API keys, client
secrets. Those stay in environment variables and are read by
`src/config/index.ts`.

## Dynamic content in messages

Anything with a runtime value is a **function**, not a concatenation at the call
site:

```ts
messages.modmail.claim.awarded("RPT-1829")   // ✅
`✅ You claimed \`${caseId}\`...`              // ❌ (was inline before the refactor)
```

## Embeds

The existing flows are plain-text and stay that way (the refactor must not
change behaviour). `data/embeds` provides `createSuccessEmbed` / `createErrorEmbed`
/ `createEmbed` for the Ticket System and future logging to build on — so no one
hardcodes `#ff0000` or a footer again.
