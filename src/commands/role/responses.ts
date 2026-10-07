import type { ChatInputCommandInteraction } from "discord.js";
import type { StaffRoleLevel } from "../../modules/configuration/index.ts";
import { configMessages } from "../../data/messages/config.ts";
import { replySuccess } from "../_shared/responses.ts";
import { getLevelStart, shownLevel } from "../../modules/configuration/utils/level-start.ts";

export { replySuccess };

export async function replayLadder(
  interaction: ChatInputCommandInteraction,
  ladder: StaffRoleLevel[],
): Promise<void> {
  const start = await getLevelStart(interaction.guildId ?? "");
  const lines = ladder.map((rung) => configMessages.role.ladderRung(shownLevel(rung.level, start), rung.roleId));
  const end = ladder.at(-1);
  await replySuccess(
    interaction,
    configMessages.role.hierarchyUpdated,
    configMessages.role.levelsHeader,
    ...lines,
    end ? configMessages.role.endLevelLine(shownLevel(end.level, start)) : undefined,
  );
}
