export const STATS_NS = "sst";

export const StatsView = {
  HOME: "home",
  WEEKS: "weeks",
  ACTIONS: "acts",
  TICKETS: "tix",
  RECENT: "recent",
} as const;
export type StatsView = (typeof StatsView)[keyof typeof StatsView];
const VIEWS = new Set<string>(Object.values(StatsView));

export interface StatsCustomId {
  view: StatsView;
  /** Only the member who ran !stats may press the buttons. */
  viewerId: string;
  targetId: string;
  page: number;
}

export function statsCustomId(id: StatsCustomId): string {
  return `${STATS_NS}:${id.view}:${id.viewerId}:${id.targetId}:${id.page}`;
}

export function parseStatsCustomId(raw: string): StatsCustomId | null {
  const [ns, view, viewerId, targetId, page] = raw.split(":");
  if (ns !== STATS_NS || !view || !VIEWS.has(view) || !viewerId || !targetId) return null;
  return { view: view as StatsView, viewerId, targetId, page: Number(page) || 1 };
}
