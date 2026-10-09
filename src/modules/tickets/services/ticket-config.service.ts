import { ChannelType, type Guild } from "discord.js";
import { limits } from "../../../data/config/limits.ts";
import { ticketMessages } from "../../../data/messages/tickets.ts";
import {
  UNSET_ID,
  getPanel,
  listPanels,
  listPublicPanels,
  panelCreatesChannel,
  panelIsAdminOnly,
  tickets,
  type TicketMainConfig,
  type TicketPanelConfig,
} from "../../../data/tickets/index.ts";
import { NotFoundError } from "../../../shared/utils/errors.ts";
import { channelConfigService } from "../../configuration/services/channel-config.service.ts";
import { intakeService, intakeTarget } from "../../intake/services/intake.service.ts";

export class TicketConfigService {
  getMainConfig(): TicketMainConfig {
    return tickets.main;
  }

  /** `guildId`: the server whose setup to apply; `null` only for names/ids (see `listPanels`). */
  listPanels(guildId: string | null): readonly TicketPanelConfig[] {
    return listPanels(guildId);
  }

  listPublicPanels(guildId: string | null): readonly TicketPanelConfig[] {
    return listPublicPanels(guildId);
  }

  getPanel(panelId: string, guildId: string | null): TicketPanelConfig | undefined {
    return getPanel(panelId, guildId);
  }

  getPanelOrThrow(panelId: string, guildId: string | null): TicketPanelConfig {
    const panel = getPanel(panelId, guildId);
    if (!panel) throw new NotFoundError("ticket panel", { panelId });
    return panel;
  }

  getPanelConfig(panelId: string, guildId: string | null): TicketPanelConfig | undefined {
    return this.getPanel(panelId, guildId);
  }

  hasPanels(): boolean {
    return listPublicPanels(null).length > 0;
  }

  questionPageCount(panel: TicketPanelConfig): number {
    if (!panel.questions.enabled || panel.questions.items.length === 0) return 0;
    return Math.ceil(panel.questions.items.length / limits.ticketQuestionsPerModal);
  }

  questionsForPage(panel: TicketPanelConfig, page: number): TicketPanelConfig["questions"]["items"] {
    const size = limits.ticketQuestionsPerModal;
    return panel.questions.items.slice((page - 1) * size, page * size);
  }

  async validateConfig(
    guild: Guild,
    options: { panels?: readonly TicketPanelConfig[] } = {},
  ): Promise<string[]> {
    const P = ticketMessages.setup.problem;
    const problems: string[] = [];

    const seen = new Set<string>();
    for (const panel of options.panels ?? this.listPanels(guild.id)) {
      if (seen.has(panel.id)) problems.push(P.panelDuplicateId(panel.id));
      seen.add(panel.id);

      problems.push(...(await this.panelProblems(guild, panel)));
    }

    return problems;
  }

  /** What still has to be set up before members can open this panel; empty = ready. */
  async panelProblems(guild: Guild, panel: TicketPanelConfig): Promise<string[]> {
    const P = ticketMessages.setup.problem;
    const problems: string[] = [];

    if (!panelIsAdminOnly(panel) && !(await roleExists(guild, panel.supportRoleId))) {
      problems.push(P.panelSupportRole(panel.name));
    }

    if (panelCreatesChannel(panel)) {
      const slotted = panel.categorySlot
        ? await channelConfigService.getChannelId(guild.id, panel.categorySlot).catch(() => null)
        : null;
      const category = await fetchChannel(guild, slotted ?? panel.categoryId);
      if (!category || category.type !== ChannelType.GuildCategory) {
        problems.push(P.panelCategory(panel.name));
      }
    }

    return problems;
  }

  async isPanelReady(guild: Guild, panel: TicketPanelConfig): Promise<boolean> {
    return (await this.panelProblems(guild, panel)).length === 0;
  }

  /**
   * The public panels members can actually open in this server: set up, and not closed with
   * `/intake close`. A panel that isn't set up counts as closed, and shows up by itself once it is.
   */
  async listOpenPublicPanels(guild: Guild): Promise<TicketPanelConfig[]> {
    const states = await Promise.all(
      listPublicPanels(guild.id).map(async (panel) => {
        const ready = await this.isPanelReady(guild, panel);
        const closed = ready ? await intakeService.closure(guild.id, intakeTarget.panel(panel.id)) : null;
        return ready && !closed ? panel : null;
      }),
    );
    return states.filter((p): p is TicketPanelConfig => p !== null);
  }
}

async function fetchChannel(guild: Guild, id: string | undefined) {
  if (!id || id === UNSET_ID) return null;
  return guild.channels.fetch(id).catch(() => null);
}

async function roleExists(guild: Guild, id: string): Promise<boolean> {
  if (!id || id === UNSET_ID) return false;
  const role = await guild.roles.fetch(id).catch(() => null);
  return role !== null;
}

export const ticketConfigService = new TicketConfigService();
