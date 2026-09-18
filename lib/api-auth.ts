import { timingSafeEqual } from "crypto";
import { getCurrentUser, getUserPermissions } from "@/lib/auth";
import { AppModuleId, SessionUser, UserPermissions, resolveCampusScope } from "@/lib/permissions";

export interface ApiPrincipal {
  kind: "SESSION" | "SERVICE";
  label: string;
  user: SessionUser | null;
  permissions: UserPermissions | null;
  /** Campus the caller is restricted to, or null for unrestricted. */
  campusId: string | null;
}

export interface ApiAuthFailure {
  ok: false;
  status: number;
  error: string;
}

export type ApiAuthResult = ({ ok: true } & ApiPrincipal) | ApiAuthFailure;

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function readBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) return null;
  const token = header.slice(7).trim();
  return token.length > 0 ? token : null;
}

/**
 * Authorizes a machine-or-human caller on the /api/v1 surface.
 *
 * Two accepted identities:
 *   1. A service token in `Authorization: Bearer <ECHO_API_KEY>` — used by
 *      MCP agents and server-to-server integrations.
 *   2. A signed-in staff session with the required module permission.
 *
 * Anonymous callers are always rejected. When no ECHO_API_KEY is configured,
 * token auth is disabled outright rather than falling open.
 */
export async function authorizeApiRequest(
  request: Request,
  module: AppModuleId,
  level: "view" | "update" | "delete" = "view"
): Promise<ApiAuthResult> {
  const token = readBearerToken(request);
  const configuredKey = process.env.ECHO_API_KEY;

  if (token) {
    if (!configuredKey) {
      return { ok: false, status: 503, error: "Service token authentication is not configured on this server." };
    }
    if (!safeEqual(token, configuredKey)) {
      return { ok: false, status: 401, error: "Invalid service token." };
    }

    // A service token may optionally be pinned to a single campus.
    const pinnedCampus = process.env.ECHO_API_CAMPUS_ID || null;
    return {
      ok: true,
      kind: "SERVICE",
      label: "MCP / API service token",
      user: null,
      permissions: null,
      campusId: pinnedCampus,
    };
  }

  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, status: 401, error: "Authentication required." };
  }

  const permissions = await getUserPermissions(user);
  const mod = permissions.modules[module];
  const allowed = level === "view" ? mod.canView : level === "update" ? mod.canUpdate : mod.canDelete;

  if (!allowed) {
    return { ok: false, status: 403, error: `Access denied on the ${module} module.` };
  }

  return {
    ok: true,
    kind: "SESSION",
    label: user.email,
    user,
    permissions,
    campusId: resolveCampusScope(user).campusId,
  };
}

/** Campus `where` fragment for an authorized principal, honouring any request filter. */
export function apiCampusWhere(
  principal: ApiPrincipal,
  requestedCampusId?: string | null
): { campusId?: string } {
  if (principal.campusId) return { campusId: principal.campusId };
  if (requestedCampusId) return { campusId: requestedCampusId };
  return {};
}
