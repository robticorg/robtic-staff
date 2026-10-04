import { TtlCache } from "../../../libs/cache/index.ts";
import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { staffApplicationConfig } from "../../../data/staff-application/config.ts";
import type { ApplicantGender, ApplicationType } from "./enums.ts";

export interface TransferDraftInput {
  invite: string;
  serverId: string;
  serverName: string;
  memberCount: number;
  onlineCount: number;
}

export interface ApplicationDraft {
  guildId: GuildId;
  userId: UserId;
  type: ApplicationType;
  name: string;
  age: number;
  city: string;
  termsAccepted: boolean;
  recruiterStaffId: UserId | null;
  recruiterAssignedAt: Date | null;
  gender?: ApplicantGender;
  transfer?: TransferDraftInput;
}

class ApplicationDraftStore {
  private readonly drafts = new TtlCache<ApplicationDraft>({
    defaultTtlMs: staffApplicationConfig.draftTtlMs,
  });

  private key(guildId: GuildId, userId: UserId): string {
    return `${guildId}:${userId}`;
  }

  start(draft: ApplicationDraft): ApplicationDraft {
    this.drafts.set(this.key(draft.guildId, draft.userId), draft);
    return draft;
  }

  get(guildId: GuildId, userId: UserId): ApplicationDraft | undefined {
    return this.drafts.get(this.key(guildId, userId));
  }

  update(guildId: GuildId, userId: UserId, patch: Partial<ApplicationDraft>): ApplicationDraft | undefined {
    const current = this.get(guildId, userId);
    if (!current) return undefined;
    return this.start({ ...current, ...patch });
  }

  clear(guildId: GuildId, userId: UserId): void {
    this.drafts.delete(this.key(guildId, userId));
  }
}

export const applicationDraftStore = new ApplicationDraftStore();
