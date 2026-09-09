import type { UserId } from "../../../shared/types/index.ts";

export interface TicketDraft {
  panelId: string;

  answers: Record<string, string>;
  updatedAt: number;
}

const TTL_MS = 15 * 60 * 1000;

class TicketDraftStore {
  private readonly drafts = new Map<UserId, TicketDraft>();

  constructor() {
    const timer = setInterval(() => this.sweep(), TTL_MS);
    (timer as unknown as { unref?: () => void }).unref?.();
  }

  start(userId: UserId, panelId: string): TicketDraft {
    const draft: TicketDraft = { panelId, answers: {}, updatedAt: Date.now() };
    this.drafts.set(userId, draft);
    return draft;
  }

  get(userId: UserId, panelId: string): TicketDraft | undefined {
    const draft = this.drafts.get(userId);
    if (!draft || draft.panelId !== panelId) return undefined;
    return draft;
  }

  merge(userId: UserId, panelId: string, answers: Record<string, string>): TicketDraft {
    const draft = this.get(userId, panelId) ?? this.start(userId, panelId);
    Object.assign(draft.answers, answers);
    draft.updatedAt = Date.now();
    this.drafts.set(userId, draft);
    return draft;
  }

  clear(userId: UserId): void {
    this.drafts.delete(userId);
  }

  private sweep(): void {
    const cutoff = Date.now() - TTL_MS;
    for (const [userId, draft] of this.drafts) {
      if (draft.updatedAt < cutoff) this.drafts.delete(userId);
    }
  }
}

export const ticketDraftStore = new TicketDraftStore();
