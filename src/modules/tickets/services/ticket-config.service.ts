import { ChannelType, type Guild } from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import {
  UNSET_ID,
  getPanel,
  listPanels,
  tickets,
  type TicketMainConfig,
  type TicketPanelConfig,
} from "../../../data/tickets/index.ts";
import { NotFoundError } from "../../../shared/utils/errors.ts";

export class TicketConfigService {
  getMainConfig(): TicketMainConfig {
    return tickets.main;
  }

  listPanels(): readonly TicketPanelConfig[] {
    return listPanels();
  }

  getPanel(panelId: string): TicketPanelConfig | undefined {
    return getPanel(panelId);
  }

  getPanelOrThrow(panelId: string): TicketPanelConfig {
    const panel = getPanel(panelId);
    if (!panel) throw new NotFoundError("ticket panel", { panelId });
    return panel;
  }

  getPanelConfig(panelId: string): TicketPanelConfig | undefined {
    return this.getPanel(panelId);
  }

  hasPanels(): boolean {
    return listPanels().length > 0;
  }

  questionPageCount(panel: TicketPanelConfig): number {
    if (!panel.questions.enabled || panel.questions.items.length === 0) return 0;
    return Math.ceil(panel.questions.items.length / limits.ticketQuestionsPerModal);
  }

  questionsForPage(panel: TicketPanelConfig, page: number): TicketPanelConfig["questions"]["items"] {
    const size = limits.ticketQuestionsPerModal;
    return panel.questions.items.slice((page - 1) * size, page * size);
  }

  async validateConfig(guild: Guild): Promise<string[]> {
    const P = ticketMessages.setup.problem;
    const problems: string[] = [];
    const main = this.getMainConfig();

    const panelChannel = await fetchChannel(guild, main.panelChannelId);
    if (!panelChannel) problems.push(P.mainChannelMissing);
    else if (
      panelChannel.type !== ChannelType.GuildText &&
      panelChannel.type !== ChannelType.GuildAnnouncement
    ) {
      problems.push(P.mainChannelNotText);
    }

    if (!(await roleExists(guild, main.managerRoleId))) problems.push(P.managerRoleMissing);

    const seen = new Set<string>();
    for (const panel of this.listPanels()) {
      if (seen.has(panel.id)) problems.push(P.panelDuplicateId(panel.id));
      seen.add(panel.id);

      if (!(await roleExists(guild, panel.supportRoleId))) {
        problems.push(P.panelSupportRole(panel.id));
      }
      const category = await fetchChannel(guild, panel.categoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        problems.push(P.panelCategory(panel.id));
      }
      const logChannel = await fetchChannel(guild, panel.logChannelId);
      if (!logChannel || !logChannel.isTextBased()) {
        problems.push(P.panelLogChannel(panel.id));
      }
    }

    return problems;
  }
}

async function fetchChannel(guild: Guild, id: string) {
  if (!id || id === UNSET_ID) return null;
  return guild.channels.fetch(id).catch(() => null);
}

async function roleExists(guild: Guild, id: string): Promise<boolean> {
  if (!id || id === UNSET_ID) return false;
  const role = await guild.roles.fetch(id).catch(() => null);
  return role !== null;
}

export const ticketConfigService = new TicketConfigService();
