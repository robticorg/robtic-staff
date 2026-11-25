# Robtic Staff — Commands

Prefix commands start with `!` (set by `PREFIX`). Every prefix command also works with its Arabic aliases. `warn` and `unwarn` also work **without** the prefix inside the warn channels.

Slash commands (`/…`) are registered with `bun run register-commands`.

**Who can use it — terms used below**

| Term | Meaning |
|---|---|
| Everyone | Any member |
| Staff | Active staff member (has a staff role) |
| High Staff+ | Staff at the High Staff tier or above (`/role boundary`) |
| Staff Manager | Holds the Staff Manager role, or a responsibility with that permission |
| Owner Manager | Holds the Owner Manager role, or a responsibility with that permission |
| Rank Manager | Staff Manager **or** Owner Manager (each limited to the ranks they may touch) |
| Apply Manager | Holds the Apply Manager role, or a responsibility with that permission |
| Transfer Manager | Holds the Transfer Manager role, or a responsibility with that permission |
| Gift Manager | Holds the Gift Manager role, or a responsibility with that permission |
| Girls Manager | Holds the Girls Manager role, or a responsibility with that permission |
| Administrator | Discord `Administrator` permission — always allowed |
| Bot Owner | The bot owner (`BOT_OWNER_ID`) — full access to everything, like an Administrator, plus the owner-only commands |
| Whitelist | Users added with `/whitelist` by the Bot Owner — can use the restricted commands (`!send`) |
| Hidden Staff | Staff who also hold a hidden-ladder role. Their stats are visible only to themselves, a higher hidden level and Administrators; everyone else sees `هذا المستخدم موظف مخفي.` |

Commands used in the wrong place (for example `!warn` outside the warn channels) are ignored silently.

Tickets are handled by **Robtic Tickets**. Roles, channels, points rules, Fast Access and the bot profile are set on the dashboard (robtic.org/discord), so they have no slash commands here.

---

## Staff management

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!accept` | قبول · قبل | Accept a member into the staff | `!accept @user [level \| high \| owner \| ship \| max] [type]` · `!accept @user hidden` (also `starter`, `مخفية`, `ستريتر`) — normal staff + first hidden level | Apply Manager, Transfer Manager, Administrators |
| `!prompt` | ترقية · رفع | Promote a staff member (never moves them down) | `!prompt @user [levels \| high \| owner \| ship \| max]` · `!prompt @user hidden` (one hidden level up) | Rank Manager, Administrators. Hidden staff targets and hidden mode: Administrators only |
| `!demote` | تنزيل · خفض · تخفيض | Demote a staff member (never moves them up) | `!demote @user [levels \| high \| owner \| ship]` · `!demote @user hidden` (one hidden level down, never below the first) | Rank Manager, Administrators. Hidden staff targets and hidden mode: Administrators only |
| `!fire` | فصل · طرد · اقالة | Fire a staff member — add `=` to also blacklist. | `!fire @user` · `!fire @user =` | Staff Manager, Administrators |
| `!back` | ارجاع · إرجاع · رجع | Bring back a fired staff member to their last rank | `!back @user` | Rank Manager, Administrators |
| `!hidden` | مخفية · مخفي | Make a staff member Hidden Staff: a menu lists every hidden level and the chosen one gives that hidden role and every hidden role below it. Removal takes away only the hidden roles — normal staff, owner, manager, responsibility and other roles stay | `!hidden @user` · `!hidden remove @user` · `!مخفية ازالة @user` · `!مخفية @user ازالة` | Administrators |
| `!transfer` | نقل | Move a staff member's rank and roles from one account to another | `!transfer @from @to` | Transfer Manager, Administrators |
| `!break` | بريك · اجازة · إجازة | Put a staff member on break. | `!break @user <duration>` — e.g. `5m` `3d` `1w` `1M` | Staff Manager, Administrators |
| `!unbreak` | انهاء-بريك · فك-بريك · ارجع | End a staff member's break early | `!unbreak @user` | Staff Manager, Administrators |
| `!come` | تعال · حضور · نداء | DM a member asking them to come to this channel | `!come @user <reason>` | High Staff+, Administrators |
| `!staff-check` | فحص-ستاف · معلومات-ستاف · فحص-اداري · معلومات-اداري | Staff profile card (rank, tier, type, accepted by…) | `!staff-check @user` or `!staff-check <id>` | Rank Manager, Administrators |
| `!check` | فحص | Promotion check: who reached the required points in the last 7 days (rolling, not reset on Monday). Lists every staff member from normal staff up to ship in role order; administrators and hidden staff are never shown. Add a tier to list only that tier | `!check` · `!check staff` · `!check high` · `!check owner` · `!check ship` | Rank Manager, Administrators |
| `!bots` | بوتات · البوتات | List every bot in the server: mention, tag, ID, whether it has Administrator, and when it joined. Bots with Administrator are listed first; long lists are split over several messages | `!bots` | Administrators |

---

## Stats & points

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!stats` | احصائياتي · إحصائياتي · احصائيات | Staff stats card with a menu: profile, weekly points, actions and recent activity. Only what the member actually has is shown | `!stats` · `!stats @user` | Staff (themselves); Staff Manager and Administrators (anyone) |
| `!points` | نقاطي · نقاط · بوينتس | Points card with the breakdown per type | `!points` · `!points @user` | Staff (themselves); Staff Manager and Administrators (anyone) |
| `!leaderboard` | المتصدرين · الترتيب · توب | Top 10 staff by points | `!leaderboard [daily \| weekly \| monthly \| all]` | Staff, Administrators |

---

## Moderation

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!warn` | تحذير · وارن · انذار | **Member warn room:** warn a member. **Staff warn room:** official staff warning (end the reason with `=` for a verbal warning). Attach the proof to the message | `!warn @user <reason>` · `!warn @staff <reason> =` | Staff (member warns); Staff Manager / Owner Manager within their ranks (staff warns); Administrators. Ship+ and Administrators need no reason or proof |
| `!unwarn` | الغاء-تحذير · إلغاء-تحذير · حذف-تحذير · شيل-تحذير | Remove a warning | `!unwarn @user staff` (current staff warning) · `!unwarn @user <warning-id>` | Staff (by id, in warn rooms); Staff Manager / Owner Manager (staff warnings); Administrators anywhere |
| `!warnings` | التحذيرات · تحذيرات-العضو · تحذيرات | List a member's warnings | `!warnings` · `!warnings @user` | Everyone (themselves); Staff (anyone); staff-warning details: Staff Manager or the staff member themselves |
| `!warns` | تحذيراتي · فحص-تحذير | Details of one warning by id | `!warns <warning-id>` | Member warnings: staff or the warned member. Staff warnings: Staff Manager or that staff member |
| `!jail` | سجن · سجين | Jail a member, with an optional time (default 28 days). Attach the proof | `!jail @user <reason> [2h \| 3d …]` | Staff, Administrators. Ship+ and Administrators need no reason or proof |
| `!unjail` | فك · فك-سجن · اطلاق | Release a jailed member | `!unjail @user [reason]` | Staff, Administrators |

---

## Giveaways

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!giveaway` | قيف-اواي · قيفاواي · سحب | Register a giveaway message from a giveaway bot (embed or new component layout; end time from `Ends:` or the embed time). When that bot announces the winners in the same channel, the bot replies with a plain text message listing who proved the condition and who did not | `!giveaway <message link>` · `!giveaway <message-id>` | Administrators |
| `!done` | نفذ · نفّذ · تم-الشرط | Record that a member did the giveaway condition. With several active giveaways a menu asks which one (only for whoever ran the command). Ignored silently when no giveaway is active | `!done @user` · `!done @user <message-id>` | Staff, Administrators |

---

## Leads

| Command | Description | Usage | Who can use it |
|---|---|---|---|
| `/lead create` | Create a lead for a member or a role, with an optional holder | `/lead create name: description: target_user\|target_role: [lead_user\|lead_role:]` | Administrators |
| `/lead assign` | Set who holds a lead (`replace: True` to replace the current holder) | `/lead assign lead: user\|role: [replace:]` | Administrators |
| `/lead remove` | Remove the current holder of a lead | `/lead remove lead:` | Administrators |
| `/lead list` | List all leads with their target and holder | `/lead list` | Administrators |
| `/lead info` | Lead details and holder history | `/lead info lead:` | Administrators |

---

## Setup & administration (slash)

| Command | Description | Usage | Who can use it |
|---|---|---|---|
| `/warn-setup` | Post or update the warnings panel | `/warn-setup` | Administrators |
| `/scan` | Import existing staff from the server and sync their levels | `/scan` | Staff Manager, Administrators |
| `/points add` · `remove` · `reset` | Add, remove or reset staff points | `/points add member: amount: [reason:]` · `/points reset [member:]` | Administrators |
| `/whitelist add` · `remove` · `list` | Manage who may use the restricted commands | `/whitelist add user:` · `/whitelist remove user:` · `/whitelist list` | Bot Owner only (not even whitelisted users) |

---

## Fast Access macros

Staff type `$<cmd>` (prefix set by `FAST_ACCESS_PREFIX`) to send a saved message in the matching context. A macro is posted in the channel it is used in.

Put `[args]` in a macro message to insert what is typed after the command: with `message: Welcome [args]!`, typing `$hi Ahmed` sends `Welcome Ahmed!`. When `$cmd` is sent as a reply with nothing after it, `[args]` becomes the content of the replied message, and the bot answers as a reply to that same message. With no text and no reply, `[args]` is left empty. Macros are managed with `/fast-access`.
