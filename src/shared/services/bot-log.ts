import { createBotLog } from "@robticorg/bot-log";

/**
 * Joins and leaves go to the Robtic Bot Log service (robticorg/robtic-bot-log), which posts them to the shared log
 * channel. Its address and key come from the Vault (ROBTIC_BOT_LOG_URL, ROBTIC_BOT_LOG_KEY); without them it's off.
 */
export const botLog = createBotLog({ bot: "staff" });
