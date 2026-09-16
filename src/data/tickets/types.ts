import type { ChannelId, RoleId } from "../../shared/types/index.ts";

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
   * Role that staffs this panel. Leave unset (UNSET_ID) to make the panel
   * **administrator-only**: nobody but an Administrator can claim, manage or
   * see its tickets, and no support-role overwrite is written.
   */
  supportRoleId: RoleId;

  /**
   * False for panels that do not open a ticket channel — the gift-claim panel
   * answers with a modal and files a case in the GIFT_CLAIMS channel instead.
   * Such panels never read `categoryId` or `logChannelId`. Defaults to true.
   */
  createsChannel?: boolean;

  /** Required only when `createsChannel` is not false. */
  categoryId?: ChannelId;

  /** Required only when `createsChannel` is not false. */
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

  content: TicketV2Content;

  selectPlaceholder: string;
}

export interface TicketConfig {
  main: TicketMainConfig;
  panels: TicketPanelConfig[];
}
