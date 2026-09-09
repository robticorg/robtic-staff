import type { GuildId, UserId } from "../../../shared/types/index.ts";
import type { IncomingAttachment } from "../services/attachment.service.ts";
import type { ModmailCaseType } from "../types/enums.ts";

export type ReportDraftStep = "TARGET" | "DETAILS" | "EVIDENCE";

export interface ReportDraft {
  guildId: GuildId;
  step: ReportDraftStep;
  targetId?: UserId;

  targetTag?: string;
  caseType?: ModmailCaseType;
  reason?: string;
  description?: string;
  evidence: IncomingAttachment[];
  createdAt: number;
}

export interface DmSession {
  userId: UserId;
  draft?: ReportDraft;

  activeCaseId?: string;
  updatedAt: number;
}

const TTL_MS = 30 * 60 * 1000;

export class DmSessionStore {
  private readonly sessions = new Map<UserId, DmSession>();

  constructor() {
    const timer = setInterval(() => this.sweep(), TTL_MS);

    (timer as unknown as { unref?: () => void }).unref?.();
  }

  get(userId: UserId): DmSession | undefined {
    return this.sessions.get(userId);
  }

  private touch(session: DmSession): DmSession {
    session.updatedAt = Date.now();
    this.sessions.set(session.userId, session);
    return session;
  }

  ensure(userId: UserId): DmSession {
    return this.sessions.get(userId) ?? this.touch({ userId, updatedAt: Date.now() });
  }

  startDraft(userId: UserId, guildId: GuildId): ReportDraft {
    const session = this.ensure(userId);
    session.draft = { guildId, step: "TARGET", evidence: [], createdAt: Date.now() };
    this.touch(session);
    return session.draft;
  }

  updateDraft(userId: UserId, patch: Partial<ReportDraft>): ReportDraft | undefined {
    const session = this.sessions.get(userId);
    if (!session?.draft) return undefined;
    Object.assign(session.draft, patch);
    this.touch(session);
    return session.draft;
  }

  addEvidence(userId: UserId, items: IncomingAttachment[]): number {
    const session = this.sessions.get(userId);
    if (!session?.draft) return 0;
    session.draft.evidence.push(...items);
    this.touch(session);
    return session.draft.evidence.length;
  }

  clearDraft(userId: UserId): void {
    const session = this.sessions.get(userId);
    if (session) {
      delete session.draft;
      this.touch(session);
    }
  }

  setActiveCase(userId: UserId, caseId: string | undefined): void {
    const session = this.ensure(userId);
    session.activeCaseId = caseId;
    this.touch(session);
  }

  private sweep(): void {
    const cutoff = Date.now() - TTL_MS;
    for (const [userId, session] of this.sessions) {
      if (session.updatedAt < cutoff) this.sessions.delete(userId);
    }
  }
}

export const dmSessionStore = new DmSessionStore();
