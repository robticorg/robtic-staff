import { describe, expect, it } from "bun:test";
import { modmailMessages } from "../../../data/messages/modmail.ts";
import { ModmailCaseStatus, ModmailCaseType } from "../types/enums.ts";
import { buildReportMessage } from "../render/report-message.ts";
import { buildThreadOpener, renderReporterMessageForThread } from "../render/thread-messages.ts";
import { renderStaffMessageForDm } from "../render/dm-messages.ts";

const REPORTER_ID = "999000111222333444";
const REPORTER_NAME = "victim_user";

const kase = {
  caseId: "RPT-1829",
  type: ModmailCaseType.USER_REPORT,
  reportedUserId: "123456789012345678",
  reason: "Harassment",
  description: "They kept DMing me after I asked them to stop.",
  evidenceCount: 4,
  status: ModmailCaseStatus.PENDING,
};

function textOf(options: { content?: string }): string {
  return options.content ?? "";
}

describe("reporter privacy in staff-facing output", () => {
  it("the #reports message masks the reporter and never receives their identity", () => {
    const msg = textOf(buildReportMessage(kase, { evidenceCount: 4 }));
    expect(msg).toContain(modmailMessages.card.reporterPrivate);
    expect(msg).not.toContain(REPORTER_ID);
    expect(msg).not.toContain(REPORTER_NAME);
  });

  it("the staff report variant also masks the reporter", () => {
    const msg = textOf(
      buildReportMessage(
        { ...kase, type: ModmailCaseType.STAFF_REPORT },
        { evidenceCount: 5 },
      ),
    );
    expect(msg).toContain(modmailMessages.card.headingStaff);
    expect(msg).toContain(modmailMessages.card.reporterPrivate);
    expect(msg).not.toContain(REPORTER_ID);
  });

  it("the thread opener refers to the anonymous reporter, not a name or id", () => {
    const msg = textOf(buildThreadOpener(kase));
    expect(msg).toContain(modmailMessages.thread.reporterLine);
    expect(msg).not.toContain(REPORTER_ID);
    expect(msg).not.toContain(REPORTER_NAME);
  });

  it("a relayed reporter message is prefixed with the anonymous label", () => {
    const rendered = renderReporterMessageForThread("here is another screenshot");
    expect(rendered.startsWith(modmailMessages.thread.reporterLabel)).toBe(true);
    expect(rendered).toContain("here is another screenshot");
    expect(rendered).not.toContain(REPORTER_ID);
  });

  it("a relayed staff message shows the report-manager label only", () => {
    const rendered = renderStaffMessageForDm("RPT-1829", "Can you provide more evidence?");
    expect(rendered).toContain("مسؤول البلاغات");
    expect(rendered).toContain("RPT-1829");
    expect(rendered).toContain("Can you provide more evidence?");
  });
});
