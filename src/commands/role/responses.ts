import type { ChatInputCommandInteraction } from "discord.js";
import type { StaffRoleLevel } from "../../modules/configuration/index.ts";
import { configMessages } from "../../data/messages/config.ts";
import { replySuccess } from "../_shared/responses.ts";

export { replySuccess };

export async function replayLadder(
  interaction: ChatInputCommandInteraction,
  ladder: StaffRoleLevel[],
): Promise<void> {
  const lines = ladder.map((rung) => configMessages.role.ladderRung(rung.level, rung.roleId));
  const end = ladder.at(-1);
  await replySuccess(
    interaction,
    configMessages.role.hierarchyUpdated,
    configMessages.role.levelsHeader,
    ...lines,
    end ? configMessages.role.endLevelLine(end.level) : undefined,
  );
}
