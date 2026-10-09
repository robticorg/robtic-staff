import type { GuildId, UserId } from "../../../shared/types/index.ts";
import { DomainError, isDuplicateKeyError } from "../../../shared/utils/errors.ts";
import { CACHE_ENABLED, CONFIG_CACHE_TTL_MS, TtlCache } from "../../../libs/cache/index.ts";
import { intakeMessages as M } from "../../../data/intake/messages.ts";
import { DEPARTMENT_LABELS } from "../../../data/staff-application/messages.ts";
import { StaffApplicationWorkflow } from "../../../data/staff-application/panels.ts";
import { listPanels, getPanel } from "../../../data/tickets/index.ts";
import {
  APPLICATION_DEPARTMENT_VALUES,
  ApplicationType,
  type ApplicationDepartment,
} from "../../applications/shared/enums.ts";
import { IntakeClosureModel, type IntakeClosure } from "../models/intake-closure.model.ts";

const PANEL_PREFIX = "panel:";
const DEPT_PREFIX = "dept:";

export const intakeTarget = {
  panel: (panelId: string) => `${PANEL_PREFIX}${panelId}`,
  department: (department: ApplicationDepartment) => `${DEPT_PREFIX}${department}`,
};

export interface IntakeTargetInfo {
  target: string;
  label: string;
  group: "APPLICATION" | "TICKET";
}

export class IntakeClosedError extends DomainError {
  constructor(message: string) {
    super("INTAKE_CLOSED", message);
  }
}

const APPLICATION_PANEL_IDS = new Set<string>([
  StaffApplicationWorkflow.STAFF_APPLICATION,
  StaffApplicationWorkflow.STAFF_TRANSFER_APPLICATION,
]);

type Closure = Pick<IntakeClosure, "closedBy" | "closedAt" | "reason">;
const cache = new TtlCache<Closure | false>({ defaultTtlMs: CONFIG_CACHE_TTL_MS });

export class IntakeService {
  /** Everything that can be closed: every ticket panel (hidden ones too) + each department. */
  targets(): IntakeTargetInfo[] {
    const panels = listPanels(null).map((panel) => ({
      target: intakeTarget.panel(panel.id),
      label:
        panel.id === StaffApplicationWorkflow.STAFF_APPLICATION ? M.allApplicationsLabel : panel.name,
      group: APPLICATION_PANEL_IDS.has(panel.id) ? ("APPLICATION" as const) : ("TICKET" as const),
    }));
    const departments = APPLICATION_DEPARTMENT_VALUES.map((dept) => ({
      target: intakeTarget.department(dept),
      label: M.departmentLabel(DEPARTMENT_LABELS[dept] ?? dept),
      group: "APPLICATION" as const,
    }));
    return [...panels, ...departments];
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

  assertDepartmentOpen(guildId: GuildId, department: ApplicationDepartment): Promise<void> {
    return this.assertOpen(guildId, intakeTarget.department(department));
  }

  /**
   * Closing the application panel closes both kinds; transfer has its own switch;
   * a normal application needs at least one department still open.
   */
  async assertApplicationOpen(guildId: GuildId, type: ApplicationType): Promise<void> {
    await this.assertPanelOpen(guildId, StaffApplicationWorkflow.STAFF_APPLICATION);
    if (type === ApplicationType.TRANSFER_APPLICATION) {
      await this.assertPanelOpen(guildId, StaffApplicationWorkflow.STAFF_TRANSFER_APPLICATION);
      return;
    }
    if ((await this.openDepartments(guildId)).length === 0) {
      throw new IntakeClosedError(M.allDepartmentsClosed);
    }
  }

  async openDepartments(guildId: GuildId): Promise<ApplicationDepartment[]> {
    const states = await Promise.all(
      APPLICATION_DEPARTMENT_VALUES.map(async (d) => [d, await this.closure(guildId, intakeTarget.department(d))] as const),
    );
    return states.filter(([, closed]) => !closed).map(([d]) => d);
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
