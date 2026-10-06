import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import mongoose, { Types } from "mongoose";
import { config } from "../../../config/index.ts";
import { StaffModel } from "../../staff/models/staff.model.ts";
import { StaffPointTransactionModel } from "../../staff/models/staff-point-transaction.model.ts";
import { StaffPointTransactionType } from "../../staff/types/enums.ts";
import { FailedAuthLimiter, isAuthorized } from "../auth.ts";
import { handlePointsRequest, type PointsDeps } from "../points.handler.ts";
import { parsePointsRequest } from "../points-request.ts";
import { routeInternalRequest } from "../server.ts";

const GUILD = "123456789012345678";
const USER = "223456789012345678";
const TOKEN = "s3cret-token";

describe("points request validation", () => {
  it("fills safe defaults for type and reason", () => {
    expect(parsePointsRequest({ guildId: GUILD, userId: USER, amount: 1 })).toEqual({
      ok: true,
      value: {
        guildId: GUILD,
        userId: USER,
        amount: 1,
        type: StaffPointTransactionType.OTHER,
        reason: "Internal API",
        idempotencyKey: null,
      },
    });
  });

  it("rejects bad ids, amounts, types and keys", () => {
    const base = { guildId: GUILD, userId: USER, amount: 1 };
    expect(parsePointsRequest(null).ok).toBe(false);
    expect(parsePointsRequest({ ...base, guildId: "abc" }).ok).toBe(false);
    expect(parsePointsRequest({ ...base, userId: undefined }).ok).toBe(false);
    for (const amount of [0, 1.5, "1.5", "abc", "0", 5000, "5000"]) {
      expect(parsePointsRequest({ ...base, amount }).ok).toBe(false);
    }
    expect(parsePointsRequest({ ...base, type: "FREE_MONEY" }).ok).toBe(false);
    expect(parsePointsRequest({ ...base, idempotencyKey: "" }).ok).toBe(false);
    expect(parsePointsRequest({ ...base, amount: -3 }).ok).toBe(true);
  });

  it('maps type "ticket" to Ticket Points and "msg" to Message Points, any case', () => {
    const typeOf = (type: unknown) => {
      const parsed = parsePointsRequest({ guildId: GUILD, userId: USER, amount: 1, type });
      return parsed.ok ? parsed.value.type : null;
    };
    expect(typeOf("ticket")).toBe(StaffPointTransactionType.TICKET_CLAIM);
    expect(typeOf("Ticket")).toBe(StaffPointTransactionType.TICKET_CLAIM);
    expect(typeOf("msg")).toBe(StaffPointTransactionType.MESSAGE);
    expect(typeOf(" MSG ")).toBe(StaffPointTransactionType.MESSAGE);
    expect(typeOf("warning")).toBe(StaffPointTransactionType.USER_WARNING);
    expect(typeOf("Warn")).toBe(StaffPointTransactionType.USER_WARNING);
    // Full names still work; no type still means OTHER.
    expect(typeOf("TICKET_CLAIM")).toBe(StaffPointTransactionType.TICKET_CLAIM);
    expect(typeOf(undefined)).toBe(StaffPointTransactionType.OTHER);
    expect(typeOf("message points")).toBeNull();
  });

  it("names the allowed types when the type is wrong", () => {
    const parsed = parsePointsRequest({ guildId: GUILD, userId: USER, amount: 1, type: "bananas" });
    expect(!parsed.ok && parsed.error).toContain("ticket, msg");
  });

  it("accepts the amount as a numeric string", () => {
    const parsed = parsePointsRequest({ guildId: GUILD, userId: USER, amount: "5" });
    expect(parsed.ok && parsed.value.amount).toBe(5);
    const negative = parsePointsRequest({ guildId: GUILD, userId: USER, amount: " -2 " });
    expect(negative.ok && negative.value.amount).toBe(-2);
  });

  it("explains that ids must be strings when they arrive as numbers", () => {
    const parsed = parsePointsRequest({ guildId: 123456789012345678, userId: USER, amount: 1 });
    expect(parsed.ok).toBe(false);
    expect(!parsed.ok && parsed.error).toContain("string");
  });
});

describe("points API authentication", () => {
  it("accepts only the exact bearer token", () => {
    expect(isAuthorized(`Bearer ${TOKEN}`, TOKEN)).toBe(true);
    expect(isAuthorized("Bearer nope", TOKEN)).toBe(false);
    expect(isAuthorized(TOKEN, TOKEN)).toBe(false);
    expect(isAuthorized(null, TOKEN)).toBe(false);
    expect(isAuthorized(`Bearer ${TOKEN}`, undefined)).toBe(false);
  });

  it("answers 401 / 404 / 405 / 400 before touching any points", async () => {
    const url = "http://127.0.0.1/internal/staff/points";
    const post = (headers: Record<string, string>, body: string) =>
      routeInternalRequest(new Request(url, { method: "POST", headers, body }), TOKEN);

    expect((await post({}, "{}")).status).toBe(401);
    expect((await post({ authorization: "Bearer wrong" }, "{}")).status).toBe(401);
    expect((await routeInternalRequest(new Request(url), TOKEN)).status).toBe(405);
    expect((await routeInternalRequest(new Request("http://127.0.0.1/other"), TOKEN)).status).toBe(404);
    expect((await post({ authorization: `Bearer ${TOKEN}` }, "not json")).status).toBe(400);

    const bad = await post({ authorization: `Bearer ${TOKEN}` }, JSON.stringify({ userId: USER }));
    expect(bad.status).toBe(400);
    expect(JSON.stringify(await bad.json())).not.toContain(TOKEN);
  });

  it("blocks an IP after too many wrong tokens, even with the right one", async () => {
    const limiter = new FailedAuthLimiter(3, 60_000);
    const url = "http://127.0.0.1/internal/staff/points";
    const send = (token: string, ip: string) =>
      routeInternalRequest(
        new Request(url, { method: "POST", headers: { authorization: `Bearer ${token}` }, body: "x" }),
        TOKEN,
        ip,
        limiter,
      );

    for (let i = 0; i < 3; i += 1) expect((await send("wrong", "1.2.3.4")).status).toBe(401);
    expect((await send(TOKEN, "1.2.3.4")).status).toBe(429);
    // Another IP is unaffected (400 = got past auth to body parsing).
    expect((await send(TOKEN, "5.6.7.8")).status).toBe(400);
  });

  it("needs no auth header when no token is configured", async () => {
    const url = "http://127.0.0.1/internal/staff/points";
    const res = await routeInternalRequest(
      new Request(url, { method: "POST", body: JSON.stringify({ userId: USER }) }),
      undefined,
      "1.2.3.4",
    );
    // 400 = got past auth to validation (guildId missing), not 401.
    expect(res.status).toBe(400);
  });

  it("answers the health check and tolerates a trailing slash", async () => {
    const health = await routeInternalRequest(new Request("http://127.0.0.1/internal/health"), undefined);
    expect(health.status).toBe(200);
    expect(await health.json()).toMatchObject({ success: true, auth: "open" });

    const slash = await routeInternalRequest(
      new Request("http://127.0.0.1/internal/staff/points/", { method: "POST", body: "{}" }),
      undefined,
    );
    expect(slash.status).toBe(400); // reached validation, not 404
  });

  it("lets a blocked IP back in once the window passes", () => {
    const limiter = new FailedAuthLimiter(1, 1_000);
    limiter.recordFailure("9.9.9.9", 0);
    expect(limiter.isBlocked("9.9.9.9", 500)).toBe(true);
    expect(limiter.isBlocked("9.9.9.9", 1_000)).toBe(false);
  });
});

describe("points handler", () => {
  const staffId = new Types.ObjectId();
  const calls: unknown[] = [];
  const breakCalls: unknown[] = [];
  const deps: PointsDeps = {
    findStaff: async (_guildId, userId) => (userId === USER ? { _id: staffId } : null),
    addPoints: async (input) => {
      calls.push(input);
      return { balance: 5, duplicate: false };
    },
    addBreakPoints: async (input) => {
      breakCalls.push(input);
      return { breakPoints: 3, duplicate: false };
    },
  };

  it("adds through the point transaction service with an idempotency reference", async () => {
    const response = await handlePointsRequest(
      { guildId: GUILD, userId: USER, amount: 2, idempotencyKey: "bot-a:42" },
      deps,
    );
    expect(response).toEqual({
      status: 200,
      body: { success: true, ignored: false, onBreak: false, duplicate: false, balance: 5 },
    });
    expect(calls.at(-1)).toMatchObject({
      staffId,
      amount: 2,
      type: StaffPointTransactionType.OTHER,
      referenceId: "api:bot-a:42",
    });
  });

  it("ignores users who aren't staff (or no longer are) without adding points", async () => {
    const ignored = { status: 200, body: { success: true, ignored: true, reason: "not staff" } };
    const before = calls.length;

    const notStaff = await handlePointsRequest({ guildId: GUILD, userId: "323456789012345678", amount: 1 }, deps);
    expect(notStaff).toEqual(ignored);

    for (const status of ["FIRED", "BLACKLISTED", "TRANSFERRED"]) {
      const res = await handlePointsRequest(
        { guildId: GUILD, userId: USER, amount: 1 },
        { ...deps, findStaff: async () => ({ _id: staffId, status }) },
      );
      expect(res).toEqual(ignored);
    }
    expect(calls.length).toBe(before);
  });

  it("records staff on break as break points, never as real points", async () => {
    const before = calls.length;
    const onBreak = await handlePointsRequest(
      { guildId: GUILD, userId: USER, amount: 1, idempotencyKey: "k1" },
      { ...deps, findStaff: async () => ({ _id: staffId, status: "BREAK" }) },
    );
    expect(onBreak).toEqual({
      status: 200,
      body: { success: true, ignored: false, onBreak: true, duplicate: false, breakPoints: 3 },
    });
    expect(calls.length).toBe(before);
    expect(breakCalls.at(-1)).toMatchObject({
      staffId,
      guildId: GUILD,
      amount: 1,
      referenceId: "api:k1",
    });
  });

  it("answers 500 without details on failure", async () => {
    const failing = await handlePointsRequest(
      { guildId: GUILD, userId: USER, amount: 1 },
      { ...deps, addPoints: async () => { throw new Error("db exploded at host x"); } },
    );
    expect(failing).toEqual({ status: 500, body: { success: false, error: "internal error" } });
  });
});

let hasDb = false;
try {
  await mongoose.connect(config.mongoUri, {
    dbName: `${config.mongoDbName}_test`,
    serverSelectionTimeoutMS: 1500,
  });
  hasDb = true;
} catch {
  hasDb = false;
}

describe.skipIf(!hasDb)("points API with the real transaction store (MongoDB)", () => {
  const API_GUILD = "423456789012345678";
  const API_USER = "523456789012345678";

  beforeAll(async () => {
    await StaffPointTransactionModel.syncIndexes();
    await StaffModel.deleteMany({ guildId: API_GUILD });
    await StaffModel.create({ guildId: API_GUILD, userId: API_USER });
  });

  afterAll(async () => {
    const staff = await StaffModel.findOne({ guildId: API_GUILD, userId: API_USER }).exec();
    if (staff) await StaffPointTransactionModel.deleteMany({ staffId: staff._id });
    await StaffModel.deleteMany({ guildId: API_GUILD });
  });

  it("writes one transaction per idempotency key and keeps the total in step", async () => {
    const body = { guildId: API_GUILD, userId: API_USER, amount: 3, reason: "itest", idempotencyKey: "retry-1" };
    const first = await handlePointsRequest(body);
    const retry = await handlePointsRequest(body);

    expect(first.status).toBe(200);
    expect(first.body.duplicate).toBe(false);
    expect(retry.status).toBe(200);
    expect(retry.body.duplicate).toBe(true);

    const staff = await StaffModel.findOne({ guildId: API_GUILD, userId: API_USER }).exec();
    expect(staff!.points).toBe(3);
    expect(await StaffPointTransactionModel.countDocuments({ staffId: staff!._id })).toBe(1);
  });
});
