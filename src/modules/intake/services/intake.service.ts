import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { DomainError, isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { CACHE_ENABLED, CONFIG_CACHE_TTL_MS, TtlCache } from "../../../libs/cache/index.ts";
import { intakeMessages as M } from "../../../data/intake/messages.ts";
import { listPanels, getPanel } from "../../../data/tickets/index.ts";
import { IntakeClosureModel, type IntakeClosure } from "../models/intake-closure.model.ts";

const PANEL_PREFIX = "panel:";

export const intakeTarget = {
  panel: (panelId: string) => `${PANEL_PREFIX}${panelId}`,
};

export interface IntakeTargetInfo {
  target: string;
  label: string;
  group: "TICKET";
}

export class IntakeClosedError extends DomainError {
  constructor(message: string) {
    super("INTAKE_CLOSED", message);
  }
}

type Closure = Pick<IntakeClosure, "closedBy" | "closedAt" | "reason">;
const cache = new TtlCache<Closure | false>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });

export class IntakeService {
  /** Everything that can be closed: every ticket panel (hidden ones too). */
  targets(): IntakeTargetInfo[] {
    return listPanels(null).map((panel) => ({
      target: intakeTarget.panel(panel.id),
      label: panel.name,
      group: "TICKET" as const,
    }));
  }

  describe(target: string): IntakeTargetInfo | null {
    return this.targets().find((t) => t.target === target) ?? null;
  }

  async closure(guildId: GuildId, target: string): Promise<Closure | null> {
    const load = async (): Promise<Closure | false> => {
      const row = await IntakeClosureModel.findOne({ guildId, target }).lean().exec();
      return row ? { closedBy: row.closedBy, closedAt: row.closedAt, reason: row.reason ?? null } : false;
    };
    const value = CACHE_ENABLED ? await cache.getOrSet(`${guildId}:${target}`, load) : await load();
    return value || null;
  }

  /** Throws IntakeClosedError (with the reason) when the target is closed. */
  async assertOpen(guildId: GuildId, target: string): Promise<void> {
    const closure = await this.closure(guildId, target);
    if (!closure) return;
    const label = this.describe(target)?.label ?? target;
    throw new IntakeClosedError(M.closed(label, closure.reason ?? null));
  }

  assertPanelOpen(guildId: GuildId, panelId: string): Promise<void> {
    return this.assertOpen(guildId, intakeTarget.panel(panelId));
  }

  /** @returns false when it was already closed. */
  async close(guildId: GuildId, target: string, closedBy: UserId, reason: string | null): Promise<boolean> {
    try {
      await IntakeClosureModel.create({ guildId, target, closedBy, closedAt: new Date(), reason });
      return true;
    } catch (err) {
      if (isDuplicateKeyError(err)) return false;
      throw err;
    } finally {
      cache.delete(`${guildId}:${target}`);
    }
  }

  /** @returns false when it was already open. */
  async open(guildId: GuildId, target: string): Promise<boolean> {
    const result = await IntakeClosureModel.deleteOne({ guildId, target }).exec();
    cache.delete(`${guildId}:${target}`);
    return result.deletedCount > 0;
  }

  async list(guildId: GuildId): Promise<(IntakeTargetInfo & { closure: Closure | null })[]> {
    const rows = await IntakeClosureModel.find({ guildId }).lean().exec();
    const byTarget = new Map(rows.map((r) => [r.target, r]));
    return this.targets().map((t) => {
      const row = byTarget.get(t.target);
      return {
        ...t,
        closure: row ? { closedBy: row.closedBy, closedAt: row.closedAt, reason: row.reason ?? null } : null,
      };
    });
  }

  isKnownPanel(panelId: string): boolean {
    return !!getPanel(panelId, null);
  }
}

export const intakeService = new IntakeService();
