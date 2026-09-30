import { internalApiConfig } from "../../config/index.ts";
import { internalApiLimits } from "../../data/internal-api/config.ts";
import { logger } from "../../shared/utils/logger.ts";
import { FailedAuthLimiter, isAuthorized } from "./auth.ts";
import { handlePointsRequest, type ApiResponse } from "./points.handler.ts";

const log = logger.child("internal-api");
const POINTS_PATH = "/internal/staff/points";
const HEALTH_PATH = "/internal/health";
const failedAuth = new FailedAuthLimiter(
  internalApiLimits.maxFailedAuth,
  internalApiLimits.failedAuthWindowMs,
);

function json(response: ApiResponse): Response {
  return Response.json(response.body, { status: response.status });
}

export async function routeInternalRequest(
  request: Request,
  token: string | undefined,
  clientIp: string | null = null,
  limiter: FailedAuthLimiter = failedAuth,
): Promise<Response> {
  // "/internal/staff/points/" is the same endpoint — callers often add the slash.
  const pathname = new URL(request.url).pathname.replace(/\/+$/, "") || "/";

  // Reachability check: open it in a browser or `curl http://host:8788/internal/health`.
  if (pathname === HEALTH_PATH) {
    return json({ status: 200, body: { success: true, service: "staff-points", auth: token ? "token" : "open" } });
  }

  if (pathname !== POINTS_PATH) return json({ status: 404, body: { success: false, error: "not found" } });
  if (request.method !== "POST") {
    return json({ status: 405, body: { success: false, error: "method not allowed" } });
  }
  // No token configured → open API. With a token, it's required and brute-force limited.
  if (token && clientIp && limiter.isBlocked(clientIp)) {
    return json({ status: 429, body: { success: false, error: "too many failed attempts" } });
  }
  if (token && !isAuthorized(request.headers.get("authorization"), token)) {
    if (clientIp) {
      limiter.recordFailure(clientIp);
      log.warn(`internal API: rejected token from ${clientIp}`);
    }
    return json({ status: 401, body: { success: false, error: "unauthorized" } });
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > internalApiLimits.maxBodyBytes) {
    return json({ status: 400, body: { success: false, error: "body too large" } });
  }

  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > internalApiLimits.maxBodyBytes) {
      return json({ status: 400, body: { success: false, error: "body too large" } });
    }
    body = JSON.parse(text);
  } catch {
    log.info(`points request from ${clientIp ?? "?"} → 400 invalid JSON`);
    return json({ status: 400, body: { success: false, error: "invalid JSON" } });
  }

  const result = await handlePointsRequest(body);
  // One line per request so `docker logs` shows exactly what callers are getting.
  const b = result.body as Record<string, unknown> & { userId?: string };
  const who = (body as { userId?: unknown })?.userId;
  log.info(
    `points request from ${clientIp ?? "?"} user=${String(who)} → ${result.status} ` +
      (b.error ? `error="${String(b.error)}"` : b.ignored ? "ignored (not staff)" : b.onBreak ? "break points" : "added"),
  );
  return json(result);
}

class InternalApiServer {
  private server: ReturnType<typeof Bun.serve> | null = null;

  start(): void {
    if (this.server) return;
    const { token, host, port } = internalApiConfig;
    if (!token) {
      log.warn(
        "INTERNAL_API_TOKEN is not set — the points API accepts requests from anyone who can reach the port",
      );
    }
    try {
      this.server = Bun.serve({
        hostname: host,
        port,
        fetch: (request, server) =>
          routeInternalRequest(request, token, server.requestIP(request)?.address ?? null).catch((err) => {
            log.error("internal API request crashed", err);
            return json({ status: 500, body: { success: false, error: "internal error" } });
          }),
      });
    } catch (err) {
      // Most often the port is taken. The bot keeps running; only the API is off.
      log.error(
        `internal points API could NOT start on ${host}:${port} — is the port already in use? ` +
          `Set INTERNAL_API_PORT to a free port.`,
        err,
      );
      return;
    }
    log.info(`internal points API listening on ${host}:${port}`);
  }

  stop(): void {
    this.server?.stop();
    this.server = null;
  }
}

export const internalApiServer = new InternalApiServer();
