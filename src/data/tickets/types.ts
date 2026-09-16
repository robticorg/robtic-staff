import type { ChannelId, RoleId } from "../../shared/types/index.ts";

/** Placeholder for an id that has not been filled in yet. */
export const UNSET_ID = "000000000000000000";

export type QuestionStyle = "SHORT" | "PARAGRAPH";

export interface TicketQuestion {
  id: string;
  label: string;
  placeholder?: string;
  style: QuestionStyle;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
}

export interface TicketQuestionsConfig {
  enabled: boolean;
  items: TicketQuestion[];
}

export interface TicketClaimerConfig {
  supportRoleCanClaim: boolean;

  managersCanClaim: boolean;

  onlyOnce: boolean;

  transferable: boolean;
}

export interface TicketCloseConfig {
  transcript: boolean;

  delete: boolean;
}

export interface TicketFaqConfig {
  enabled: boolean;
}

export interface TicketV2Content {
  accentColor?: number;

  text: string[];

  image?: string;

  thumbnail?: string;

  footer?: string;
}

export interface TicketPanelConfig {
  id: string;

  name: string;

  description: string;

  emoji?: string;

  /**
   * Kept out of the public ticket panel's select menu. Used by workflows that
   * own their own entry point — the Staff Support panel opens its tickets from
   * its own buttons, and must never be openable by a normal member.
   */
  hidden?: boolean;

  supportRoleId: RoleId;

  createsChannel?: boolean;

  categoryId?: ChannelId;

  logChannelId?: ChannelId;

  questions: TicketQuestionsConfig;
  claimer: TicketClaimerConfig;
  close: TicketCloseConfig;
  faq: TicketFaqConfig;

  ticketMessage: TicketV2Content;
}

export interface TicketMainConfig {
  panelChannelId: ChannelId;

  managerRoleId: RoleId;

  transcriptChannelId: ChannelId;

  content: TicketV2Content;

  selectPlaceholder: string;
}

export interface TicketConfig {
  main: TicketMainConfig;
  panels: TicketPanelConfig[];
}
