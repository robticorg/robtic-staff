import type { EventModule } from "../discord/event.ts";
import interactionCreate from "./interactionCreate.ts";
import componentInteractionCreate from "./componentInteractionCreate.ts";
import messageCreate from "./messageCreate.ts";
import ready from "./ready.ts";
import userUpdate from "./userUpdate.ts";
import guildMemberAdd from "./guildMemberAdd.ts";

export const events: EventModule[] = [
  interactionCreate as EventModule,
  componentInteractionCreate as EventModule,
  messageCreate as EventModule,
  ready as EventModule,
  userUpdate as EventModule,
  guildMemberAdd as EventModule,
];
