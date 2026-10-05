import type { ChannelId, GuildId, RoleId, UserId } from "../../../shared/types/index.ts";
import { getPanel, setPanelOverride } from "../../../data/tickets/index.ts";
import {
  TicketPanelSettingsModel,
  type TicketPanelContent,
  type TicketPanelSettings,
} from "../models/ticket-panel-settings.model.ts";

export interface PanelSetupInput {
  guildId: GuildId;
  panelId: string;
  supportRoleId: RoleId;
  managerRoleId: RoleId | null;
  categoryId: ChannelId | null;
  logChannelId: ChannelId | null;
  actorId: UserId;
}

function pushOverride(
  row: Pick<TicketPanelSettings, "panelId" | "supportRoleId" | "managerRoleId" | "categoryId" | "logChannelId">,
): void {
  setPanelOverride(row.panelId, {
    supportRoleId: row.supportRoleId,
    managerRoleId: row.managerRoleId,
    categoryId: row.categoryId,
    logChannelId: row.logChannelId ?? null,
  });
}

export class TicketPanelSettingsService {
  async save(input: PanelSetupInput): Promise<void> {
    if (!getPanel(input.panelId)) throw new Error(`Unknown ticket panel ${input.panelId}`);
    const row = {
      panelId: input.panelId,
      supportRoleId: input.supportRoleId,
      managerRoleId: input.managerRoleId,
      categoryId: input.categoryId,
      logChannelId: input.logChannelId,
    };
    await TicketPanelSettingsModel.updateOne(
      { guildId: input.guildId, panelId: input.panelId },
      { $set: { ...row, updatedBy: input.actorId } },
      { upsert: true },
    ).exec();
    pushOverride(row);
  }

  async loadGuild(guildId: GuildId): Promise<number> {
    const rows = await TicketPanelSettingsModel.find({ guildId }).lean().exec();
    for (const row of rows) pushOverride(row);
    return rows.length;
  }

  async getContent(guildId: GuildId, panelId: string): Promise<TicketPanelContent> {
    const row = await TicketPanelSettingsModel.findOne({ guildId, panelId }, { content: 1 }).lean().exec();
    return row?.content ?? {};
  }

  async saveContent(guildId: GuildId, panelId: string, content: TicketPanelContent): Promise<TicketPanelContent> {
    const current = await this.getContent(guildId, panelId);
    const next: TicketPanelContent = {
      title: content.title?.trim() || current.title || null,
      description: content.description?.trim() || current.description || null,
      image: content.image?.trim() || current.image || null,
    };
    await TicketPanelSettingsModel.updateOne(
      { guildId, panelId },
      { $set: { content: next }, $setOnInsert: { supportRoleId: null, managerRoleId: null, categoryId: null } },
      { upsert: true },
    ).exec();
    return next;
  }
}

export const ticketPanelSettingsService = new TicketPanelSettingsService();
