import type { EventModule } from "../discord/event.ts";
import interactionCreate from "./interactionCreate.ts";
import componentInteractionCreate from "./componentInteractionCreate.ts";
import messageCreate from "./messageCreate.ts";
import ready from "./ready.ts";
import userUpdate from "./userUpdate.ts";
import guildMemberAdd from "./guildMemberAdd.ts";
import roleCreate from "./roleCreate.ts";
import roleUpdate from "./roleUpdate.ts";
import roleDelete from "./roleDelete.ts";

export const events: EventModule[] = [
  interactionCreate as EventModule,
  componentInteractionCreate as EventModule,
  messageCreate as EventModule,
  ready as EventModule,
  userUpdate as EventModule,
  guildMemberAdd as EventModule,
  roleCreate as EventModule,
  roleUpdate as EventModule,
  roleDelete as EventModule,
];
