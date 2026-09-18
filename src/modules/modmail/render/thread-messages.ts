import { modmailMessages } from "../../../data/messages/modmail.ts";

const T = modmailMessages.thread;

export const REPORTER_LABEL = T.reporterLabel;

export function renderReporterMessageForThread(content: string): string {
  return T.reporterRelay(content);
}

export function renderSystemNote(text: string): string {
  return T.systemNote(text);
}
