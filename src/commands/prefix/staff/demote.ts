import { definePrefixCommand } from "../../../discord/prefix-command.ts";
import { runLevelMove } from "../_shared/level-move.ts";

export default definePrefixCommand({
  name: "demote",
  category: "staff",
  execute: (ctx) => runLevelMove(ctx, "demote"),
});
