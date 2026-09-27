import { ContainerBuilder, MessageFlags, type BaseMessageOptions } from "discord.js";
import { colors } from "../../../data/config/colors.ts";
import { formatElapsedDays } from "../../../data/messages/duration.ts";
import { STAFF_TIER_LABELS } from "../../../data/messages/hierarchy.ts";
import { staffMessages } from "../../../data/messages/staff.ts";
import type { StaffProfile } from "../services/staff-profile.service.ts";

const P = staffMessages.profile;
const DAY_MS = 86_400_000;

export function staffProfileLines(profile: StaffProfile, now: Date = new Date()): string[] {
  const lines = [
    P.status(P.statuses[profile.status] ?? profile.status),
    P.level(profile.level, profile.ladderTop),
  ];
  if (profile.roleId) lines.push(P.role(profile.roleId));
  lines.push(P.tier(STAFF_TIER_LABELS[profile.tier]));

  lines.push(profile.acceptedBy ? P.acceptedBy(profile.acceptedBy) : P.acceptedBySystem);
  if (profile.acceptedAt) {
    lines.push(P.acceptedAt(profile.acceptedAt));
    lines.push(
      P.staffFor(formatElapsedDays((now.getTime() - profile.acceptedAt.getTime()) / DAY_MS)),
    );
  } else {
    lines.push(P.staffFor(P.unknown));
  }

  lines.push(
    profile.lastPromotion
      ? P.lastPromotion(profile.lastPromotion.at, profile.lastPromotion.by)
      : P.noPromotion,
  );
  return lines;
}

export function buildStaffProfileCard(profile: StaffProfile): BaseMessageOptions {
  const container = new ContainerBuilder().setAccentColor(colors.primary);
  container.addTextDisplayComponents((t) => t.setContent(P.title(profile.userId)));
  container.addSeparatorComponents((s) => s.setDivider(true));
  for (const line of staffProfileLines(profile)) {
    container.addTextDisplayComponents((t) => t.setContent(line));
  }
  return {
    components: [container],
    flags: MessageFlags.IsComponentsV2,
    allowedMentions: { parse: [] },
  } as BaseMessageOptions;
}
