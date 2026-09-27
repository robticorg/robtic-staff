import { internalApiConfig } from "../../config/index.ts";
import { internalApiLimits } from "../../data/internal-api/config.ts";
import { logger } from "../../shared/utils/logger.ts";
import { isAuthorized } from "./auth.ts";
import { handlePointsRequest, type ApiResponse } from "./points.handler.ts";

const log = logger.child("internal-api");
const POINTS_PATH = "/internal/staff/points";

function json(response: ApiResponse): Response {
  return Response.json(response.body, { status: response.status });
}

export async function routeInternalRequest(
  request: Request,
  token: string | undefined,
): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname !== POINTS_PATH) return json({ status: 404, body: { success: false, error: "not found" } });
  if (request.method !== "POST") {
    return json({ status: 405, body: { success: false, error: "method not allowed" } });
  }
  if (!isAuthorized(request.headers.get("authorization"), token)) {
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
    return json({ status: 400, body: { success: false, error: "invalid JSON" } });
  }

  return json(await handlePointsRequest(body));
}

class InternalApiServer {
  private server: ReturnType<typeof Bun.serve> | null = null;

  start(): void {
    if (this.server) return;
    const { token, host, port } = internalApiConfig;
    if (!token) {
      log.info("INTERNAL_API_TOKEN is not set — internal points API disabled");
      return;
    }
    this.server = Bun.serve({
      hostname: host,
      port,
      fetch: (request) =>
        routeInternalRequest(request, token).catch((err) => {
          log.error("internal API request crashed", err);
          return json({ status: 500, body: { success: false, error: "internal error" } });
        }),
    });
    log.info(`internal points API listening on ${host}:${port}`);
  }

  stop(): void {
    this.server?.stop();
    this.server = null;
  }
}

export const internalApiServer = new InternalApiServer();
