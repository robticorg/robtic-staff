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
| Claimer | The staff member who claimed the ticket |
| Administrator | Discord `Administrator` permission — always allowed |
| Bot Owner | The bot owner (`BOT_OWNER_ID`) — full access to everything, like an Administrator, plus the owner-only commands |
| Whitelist | Users added with `/whitelist` by the Bot Owner — can use the restricted commands (`!send`) |
| Hidden Staff | Staff who also hold a hidden-ladder role. Their stats are visible only to themselves, a higher hidden level and Administrators; everyone else sees `هذا المستخدم موظف مخفي.` |

Commands used in the wrong place (for example a ticket command outside a ticket) are ignored silently.

---

## Tickets

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!claim` | استلام · استلم · كليم | Claim the ticket you are in | `!claim` | Panel support role, ticket managers, Administrators (not the ticket owner) |
| `!close` | اغلاق · إغلاق · قفل · سكر | Close the ticket (saves a transcript when the panel has one) | `!close` | Claimer, Administrators |
| `!delete` | حذف · مسح | Delete the ticket channel | `!delete` | Claimer, Administrators (closed tickets: also ticket managers and the panel support role) |
| `!rename` | تغيير-الاسم · تسمية | Rename the ticket channel | `!rename <new-name>` | Claimer, Administrators |
| `!add` | اضافة · إضافة · ضيف | Add members or roles to the ticket | `!add @member @role …` | Claimer, Administrators |
| `!remove` | ازالة · إزالة · شيل | Remove members or roles from the ticket | `!remove @member @role …` | Claimer, Administrators |
| `!transcript` | نسخة · ترانسكربت | Save a transcript of the ticket | `!transcript` | Claimer, Administrators |
| `!handover` | تسليم · سلم · تحويل | Hand the ticket over to another staff member | `!handover @staff <reason>` | Claimer, Administrators |
| `!sleep` | نوم · خمول · تنبيه | Warn the owner the ticket closes automatically if they don't reply | `!sleep [time]` — e.g. `!sleep 6h` (default 6h) | Claimer, panel support role, Administrators |
| `/sleep` | — | Same as `!sleep` | `/sleep time:6h` | Claimer, panel support role, Administrators |
| `!ticket` | تكت · معلومات-التكت | Ticket info card: owner, claimers, history, commands used | Inside a ticket: `!ticket` — anywhere: `!ticket 12`, `!ticket ticket-12`, a ticket channel ID, `#channel` or channel link | Administrators |

---

## Staff management

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!accept` | قبول · قبل | Accept a member into the staff. Inside an application ticket it accepts that applicant | `!accept @user [level \| high \| owner \| ship \| max] [type]` · `!accept @user hidden` (also `starter`, `مخفية`, `ستريتر`) — normal staff + first hidden level | Outside a ticket: Apply Manager, Administrators. Inside an application ticket: its claimer holding the manager role, Administrators |
| `!prompt` | ترقية · رفع | Promote a staff member (never moves them down) | `!prompt @user [levels \| high \| owner \| ship \| max]` · `!prompt @user hidden` (one hidden level up) | Rank Manager, Administrators. Hidden staff targets and hidden mode: Administrators only |
| `!demote` | تنزيل · خفض · تخفيض | Demote a staff member (never moves them up) | `!demote @user [levels \| high \| owner \| ship]` · `!demote @user hidden` (one hidden level down, never below the first) | Rank Manager, Administrators. Hidden staff targets and hidden mode: Administrators only |
| `!fire` | فصل · طرد · اقالة | Fire a staff member — add `=` to also blacklist. Their claimed tickets are reopened for others | `!fire @user` · `!fire @user =` | Staff Manager, Administrators |
| `!back` | ارجاع · إرجاع · رجع | Bring back a fired staff member to their last rank | `!back @user` | Rank Manager, Administrators |
| `!hidden` | مخفية · مخفي | Make a staff member Hidden Staff: a menu lists every hidden level and the chosen one gives that hidden role and every hidden role below it. Removal takes away only the hidden roles — normal staff, owner, manager, responsibility and other roles stay | `!hidden @user` · `!hidden remove @user` · `!مخفية ازالة @user` · `!مخفية @user ازالة` | Administrators |
| `!transfer` | نقل | Move a staff member's rank and roles from one account to another | `!transfer @from @to` | Transfer Manager, Administrators — **only inside staff application / transfer tickets** |
| `!break` | بريك · اجازة · إجازة | Put a staff member on break. Their claimed tickets are reopened for others | `!break @user <duration>` — e.g. `5m` `3d` `1w` `1M` | Staff Manager, Administrators |
| `!unbreak` | انهاء-بريك · فك-بريك · ارجع | End a staff member's break early | `!unbreak @user` | Staff Manager, Administrators |
| `!come` | تعال · حضور · نداء | DM a member asking them to come to this channel | `!come @user <reason>` | High Staff+, Administrators |
| `!responsible` | مسؤولية · مسئولية | Manage a member's responsibilities: shows two buttons — **Give** opens a form listing only the responsibilities they don't have, **Remove** opens a form listing only the ones they hold (several can be picked at once). `حذف` / `ازالة` / `remove` / `delete` jump straight to the remove menu | `!responsible @user` · `!responsible حذف @user` | Owner Manager, Staff Manager, Administrators (each only the responsibilities they may assign) |
| `!staff-check` | فحص-ستاف · معلومات-ستاف · فحص-اداري · معلومات-اداري | Staff profile card (rank, tier, type, accepted by…) | `!staff-check @user` or `!staff-check <id>` | Rank Manager, Administrators |
| `!check` | فحص | Promotion check: who reached the required points in the last 7 days (rolling, not reset on Monday). Lists every staff member from normal staff up to ship in role order; administrators and hidden staff are never shown. Add a tier to list only that tier | `!check` · `!check staff` · `!check high` · `!check owner` · `!check ship` | Rank Manager, Administrators |

---

## Stats & points

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!stats` | احصائياتي · إحصائياتي · احصائيات | Staff stats card with a menu: weekly points, actions, tickets, activity, application, responsibilities and leads | `!stats` · `!stats @user` | Staff (themselves); Staff Manager and Administrators (anyone) |
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

## Applications

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!refuse` | رفض | Refuse the application in this ticket | `!refuse <reason>` | Claimer of the application holding its manager role, Administrators (never the applicant) — inside an application ticket |
| `!from` | من · من-طرف · جابه | Set who recruited the applicant (add `replace` to change it) | `!from @owner` · `!from @owner replace` | Same as `!refuse` — inside an application ticket. Replacing: Administrators |
| `!verify` | توثيق | Give the verified role to a girl member | `!verify @user` | Girls Manager, Administrators |
| `!server` | سيرفر · رابط-السيرفر | Resolve an invite into `https://discord.gg/<code>` with the server name, member count and online count. Accepts `ExRgT`, `.gg/ExRgT`, `discord.gg/ExRgT` or a full link. Ignored silently outside application tickets | `!server ExRgT` | Anyone inside a staff application / transfer ticket |
| `!bots` | بوتات · البوتات | List every bot in the server: mention, tag, ID, whether it has Administrator, and when it joined. Bots with Administrator are listed first; long lists are split over several messages | `!bots` | Administrators |

---

## Gifts

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!gift` | جائزة · هدية | Opens a menu: **Credits**, **Nitro / Effect** or **Other**. **Staff:** fill a form (credits: amount · nitro: the exact gift · other: the exact gift + the member account, e.g. Roblox username) with **proof required**, then the order goes to the Order channel with approve / refuse, the ticket number and a button to the ticket. **Administrators:** credits are sent right away, nitro/effects ask for the link (required), other gifts are delivered with proof. Inside a ticket only the ticket owner can be gifted (no mention needed). Staff can use it once every 30 minutes per ticket. Amounts accept `50k`, `50m`, `1.5m`, `مليون`, `50 مليون`, `٥٠ ألف`… | In a ticket: `!gift [note]` — Outside: `!gift @user [note]` | Staff, Administrators |
| `!send` | ارسال · إرسال · حول | Send credits right away through the transfer API. Without `gift` the transfer happens in the channel you wrote it in; with `gift` it happens in the gift delivery channel. Amounts accept `5m`, `500k`, `5 مليون`… | `!send @user 5m` · `!send @user 5m gift` | Bot Owner, Whitelist only (Administrators cannot) |
| `/autoclaim` | — | Turn automatic credit transfers on or off, or show the status | `/autoclaim state:on \| off \| status` | Administrators |

Gift orders (from the gift ticket or from `!gift` by staff) are approved or rejected from the card in the Order channel by a Gift Manager or Administrator. Transfer messages are posted where the gift was asked for; logs go to the gift delivery log channel.

---

## Giveaways

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!giveaway` | قيف-اواي · قيفاواي · سحب | Register a giveaway message from a giveaway bot (embed or new component layout; end time from `Ends:` or the embed time). When that bot announces the winners in the same channel, the bot replies with a plain text message listing who proved the condition and who did not | `!giveaway <message link>` · `!giveaway <message-id>` | Administrators |
| `!done` | نفذ · نفّذ · تم-الشرط | Record that a member did the giveaway condition. Inside a ticket, plain `!done` records the ticket owner. With several active giveaways a menu asks which one (only for whoever ran the command). Ignored silently when no giveaway is active | `!done` (in a ticket) · `!done @user` · `!done @user <message-id>` | Staff, Administrators |

---

## Reports

| Command | Aliases | Description | Usage | Who can use it |
|---|---|---|---|---|
| `!end` | انهاء · إنهاء · انهاء-التحقيق | Open the resolution menu to close a report | `!end` — inside a report thread | Staff who can manage the report (after it is claimed), Administrators |

---

## Responsibilities & leads

| Command | Description | Usage | Who can use it |
|---|---|---|---|
| `/add-res` | Create a responsibility linked to a role and a permission (opens a form, then pick a category) | `/add-res` | Administrators |
| `/lead create` | Create a lead for a member, a role or a responsibility, with an optional holder | `/lead create name: description: target_user\|target_role\|target_responsibility: [lead_user\|lead_role:]` | Administrators |
| `/lead assign` | Set who holds a lead (`replace: True` to replace the current holder) | `/lead assign lead: user\|role: [replace:]` | Administrators |
| `/lead remove` | Remove the current holder of a lead | `/lead remove lead:` | Administrators |
| `/lead list` | List all leads with their target and holder | `/lead list` | Administrators |
| `/lead info` | Lead details and holder history | `/lead info lead:` | Administrators |

---

## Setup & administration (slash)

| Command | Description | Usage | Who can use it |
|---|---|---|---|
| `/role set` | Set the role for one staff-system slot | `/role set type: role:` | Administrators |
| `/role set` (hidden slots) | Hidden staff ladder: start, end, ignore a role, un-ignore a role. Independent from the normal ladder and its ignores | `/role set type:بداية الستاف المخفي role:` · `type:نهاية الستاف المخفي` · `type:رتبة مستثناة من الستاف المخفي` · `type:إلغاء استثناء رتبة من الستاف المخفي` | Administrators |
| `/role range` | Give a role automatically to a range of staff levels | `/role range type: [role:] [from:] [to:]` | Administrators |
| `/role boundary` | Set the first role of a tier (High Staff / Owner / Ship) | `/role boundary tier: role:` | Administrators |
| `/role stafftype` | Set the role of a staff type | `/role stafftype type: role:` | Administrators |
| `/role check` | Show a role's level and tier | `/role check role:` | Administrators |
| `/role list` | Show all configured roles | `/role list` | Administrators |
| `/channels set` | Set the channel for a slot (logs, order channel, gift delivery, gift delivery log…) | `/channels set type: channel:` | Administrators |
| `/channels list` | Show the configured channels | `/channels list` | Administrators |
| `/ticket setup` | Set a ticket type's support role, optional manager role (can see and manage, but cannot claim) and category — all from menus in a form | `/ticket setup` | Administrators |
| `/ticket send` | Post a panel in a chosen channel: main ticket panel, staff support panel, or the responsibility application panel (custom title / description / image) | `/ticket send` | Administrators |
| `/warn-setup` | Post or update the warnings panel | `/warn-setup` | Administrators |
| `/faq add` · `remove` · `list` · `assign` | Manage ticket FAQ entries | `/faq add [panel:]` · `/faq remove faq:` · `/faq list` · `/faq assign faq: [panel:]` | Administrators |
| `/fast-access add` · `remove` · `list` | Manage `$` quick-message macros for staff | `/fast-access add cmd: message: context:` · `/fast-access remove cmd:` | Staff Manager, Administrators |
| `/scan` | Import existing staff from the server and sync their levels | `/scan` | Staff Manager, Administrators |
| `/points add` · `remove` · `reset` | Add, remove or reset staff points | `/points add member: amount: [reason:]` · `/points reset [member:]` | Administrators |
| `/promote-points` | Minimum weekly points needed for promotion | `/promote-points points:` | Administrators |
| `/ticket-stats reset` | Reset staff ticket counters | `/ticket-stats reset [member:]` | Administrators |
| `/whitelist add` · `remove` · `list` | Manage who may use the restricted commands | `/whitelist add user:` · `/whitelist remove user:` · `/whitelist list` | Bot Owner only (not even whitelisted users) |
| `/intake close` · `open` · `list` | Close or open applications and ticket types | `/intake close target: [reason:]` · `/intake open target:` · `/intake list` | Administrators |
| `/info setup` · `add` · `remove` · `see` · `access` | Staff information panel | `/info setup` · `/info add` · `/info remove info:` · `/info see [info:]` · `/info access info: [role:]` | Administrators |
| `/info page add` · `edit` · `delete` | Pages of an info entry | `/info page add info:` · `/info page edit info: page:` · `/info page delete info: page:` | Administrators |

---

## Fast Access macros

Staff type `$<cmd>` (prefix set by `FAST_ACCESS_PREFIX`) to send a saved message in the matching context. Macros are managed with `/fast-access`.
