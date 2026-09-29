import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { runLevelMove } from "../_shared/level-move.ts";

export default definePrefixCommand({
  name: "prompt",
  aliases: ["promote"],
  category: "staff",
  execute: (ctx) => runLevelMove(ctx, "promote"),
});
