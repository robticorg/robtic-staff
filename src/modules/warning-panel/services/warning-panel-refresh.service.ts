import type { Client } from "discord.js";
import { logger } from "../../../shared/utils/logger.ts";
import { warnPanelConfig } from "../../../data/warn-panel/config.ts";
import { WarningPanelDeploymentModel } from "../models/warning-panel-deployment.model.ts";
import { buildWarningPanel } from "../render/panel.ts";
import { getWarningPanelClient } from "../runtime.ts";

const log = logger.child("warn-panel:refresh");

export type RefreshOutcome = "refreshed" | "skipped" | "message-gone" | "channel-gone" | "failed";

/**
 * Re-edits the stored panel message so the select menu stops showing the option
 * the last manager picked.
 *
 * Two triggers, one implementation:
 *  - right after someone uses the panel (`refreshDeployment`), which is what
 *    actually clears the menu for that manager;
 *  - a periodic sweep over every stored `messageId`, for clients still holding a
 *    stale selection.
 *
 * The panel's content never changes, so an edit that was already done moments ago
 * is wasted API traffic — `lastRefreshedAt` suppresses those.
 */
export class WarningPanelRefreshService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private running = false;

  /** messageId → when we last edited it. */
  private readonly lastRefreshedAt = new Map<string, number>();

  async refreshDeployment(
    deployment: { guildId: string; channelId: string; messageId: string },
    options: { force?: boolean; client?: Client | null } = {},
  ): Promise<RefreshOutcome> {
    const interval = warnPanelConfig.refreshIntervalMs;
    const last = this.lastRefreshedAt.get(deployment.messageId);
    if (!options.force && last !== undefined && interval > 0 && Date.now() - last < interval) {
      return "skipped";
    }

    const client = options.client ?? getWarningPanelClient();
    if (!client) return "failed";

    try {
      const channel = await client.channels.fetch(deployment.channelId).catch(() => null);
      if (!channel || !channel.isTextBased() || !("messages" in channel)) {
        return "channel-gone";
      }

      const message = await channel.messages.fetch(deployment.messageId).catch(() => null);
      if (!message) return "message-gone";

      await message.edit(buildWarningPanel());
      this.lastRefreshedAt.set(deployment.messageId, Date.now());
      return "refreshed";
    } catch (err) {
      log.warn(`panel refresh failed for ${deployment.guildId}`, err);
      return "failed";
    }
  }

  /** Refreshes the panel a guild currently has deployed, if any. */
  async refreshGuild(guildId: string, options: { force?: boolean } = {}): Promise<RefreshOutcome> {
    const deployment = await WarningPanelDeploymentModel.findOne({ guildId, key: "main" })
      .lean<{ guildId: string; channelId: string; messageId: string }>()
      .exec();
    if (!deployment) return "message-gone";
    return this.refreshDeployment(deployment, options);
  }

  async sweep(): Promise<Record<RefreshOutcome, number>> {
    const tally: Record<RefreshOutcome, number> = {
      refreshed: 0,
      skipped: 0,
      "message-gone": 0,
      "channel-gone": 0,
      failed: 0,
    };

    const client = getWarningPanelClient();
    if (!client) return tally;

    const deployments = await WarningPanelDeploymentModel.find({})
      .lean<{ guildId: string; channelId: string; messageId: string }[]>()
      .exec();

    for (const deployment of deployments) {
      tally[await this.refreshDeployment(deployment, { client })] += 1;
    }
    return tally;
  }

  start(): void {
    if (this.timer) return;

    const interval = warnPanelConfig.refreshIntervalMs;
    if (interval <= 0) {
      log.info("warning panel refresh sweeper disabled (refreshIntervalMs = 0)");
      return;
    }

    this.timer = setInterval(() => void this.tick(), interval);
    if (typeof this.timer === "object" && "unref" in this.timer) this.timer.unref();
    log.info(`warning panel refresh sweeper started (every ${interval}ms)`);
  }

  stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;
    try {
      await this.sweep();
    } catch (err) {
      log.error("warning panel refresh tick failed", err);
    } finally {
      this.running = false;
    }
  }
}

export const warningPanelRefreshService = new WarningPanelRefreshService();
