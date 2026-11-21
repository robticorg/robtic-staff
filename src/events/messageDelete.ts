import { Events, type Message, type PartialMessage } from "discord.js";
import { defineEvent } from "../discord/event.ts";

export default defineEvent({
  name: Events.MessageDelete,
  async execute(message: Message | PartialMessage) {
  },
});
