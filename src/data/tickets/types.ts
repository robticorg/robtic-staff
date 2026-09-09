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

  supportRoleId: RoleId;

  categoryId: ChannelId;

  logChannelId: ChannelId;

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
