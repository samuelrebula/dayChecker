import { NextResponse } from "next/server";

import {
  attachAnonymousCookie,
  getClientIp,
  getOrCreateAnonymousIdentity,
} from "@/server/security/anonymous-identity";
import {
  buildRateLimitKey,
  consumeRateLimit,
} from "@/server/security/rate-limit";

import { getTodayKey } from "@/lib/progress";

import {
  getOrCreateProgress,
  recordDailyCheck,
  updateTarget,
} from "./progress.repository";
import { buildProgressPayload } from "./progress.formatter";
import { progressActionSchema } from "./progress.validators";
import type { ProgressResponseBody } from "./progress.types";

function jsonResponse(body: ProgressResponseBody, status = 200) {
  return NextResponse.json(body, { status });
}

function attachCookieIfCreated(
  response: NextResponse,
  params: { created: boolean; cookieValue: string },
) {
  if (params.created) {
    attachAnonymousCookie(response, params.cookieValue);
  }

  return response;
}

async function applyRateLimit(
  request: Request,
  anonymousId: string,
  action: string,
) {
  const clientIp = getClientIp(request);
  const key = buildRateLimitKey({ anonymousId, action, clientIp });
  const policy =
    action === "check"
      ? { limit: 10, windowMs: 60_000 }
      : { limit: 20, windowMs: 60_000 };

  return consumeRateLimit(key, policy.limit, policy.windowMs);
}

export async function handleProgressGet(request: Request) {
  const identity = await getOrCreateAnonymousIdentity();

  try {
    const rateLimit = await applyRateLimit(
      request,
      identity.anonymousId,
      "load-progress",
    );

    if (!rateLimit.allowed) {
      const response = jsonResponse(
        {
          error: "Too many requests. Please try again in a moment.",
        },
        429,
      );

      attachAnonymousCookie(response, identity.cookieValue);
      response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
      return response;
    }

    const progress = await getOrCreateProgress(identity.anonymousId);
    const response = jsonResponse({
      progress: buildProgressPayload(progress, getTodayKey()),
      message: "Your progress has been loaded.",
    });

    return attachCookieIfCreated(response, identity);
  } catch {
    const response = jsonResponse(
      {
        error:
          "Server is not ready (database unavailable). Start PostgreSQL and run prisma db push.",
      },
      503,
    );

    return attachCookieIfCreated(response, identity);
  }
}

export async function handleProgressPost(request: Request) {
  const identity = await getOrCreateAnonymousIdentity();

  try {
    const body = await request.json().catch(() => null);
    const parsed = progressActionSchema.safeParse(body);

    if (!parsed.success) {
      const response = jsonResponse({ error: "Invalid request." }, 400);
      return attachCookieIfCreated(response, identity);
    }

    const rateLimit = await applyRateLimit(
      request,
      identity.anonymousId,
      parsed.data.action,
    );

    if (!rateLimit.allowed) {
      const response = jsonResponse(
        {
          error: "Too many requests. Please try again in a moment.",
        },
        429,
      );

      attachAnonymousCookie(response, identity.cookieValue);
      response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
      return response;
    }

    const progress = await getOrCreateProgress(identity.anonymousId);

    if (parsed.data.action === "check") {
      if (progress.completedAt) {
        const response = jsonResponse(
          {
            error: "That target has already been completed.",
            progress: buildProgressPayload(progress, getTodayKey()),
          },
          409,
        );

        return attachCookieIfCreated(response, identity);
      }

      if (progress.lastCheckedDateKey === getTodayKey()) {
        const response = jsonResponse(
          {
            error: "You already checked in today.",
            progress: buildProgressPayload(progress, getTodayKey()),
          },
          409,
        );

        return attachCookieIfCreated(response, identity);
      }

      const updated = await recordDailyCheck(identity.anonymousId, getTodayKey());
      const response = jsonResponse({
        progress: buildProgressPayload(updated, getTodayKey()),
        message: updated.completedAt
          ? "Target completed. Progress saved successfully."
          : "Daily check recorded.",
      });

      return attachCookieIfCreated(response, identity);
    }

    const updated = await updateTarget(identity.anonymousId, parsed.data.targetCount);

    const response = jsonResponse({
      progress: buildProgressPayload(updated, getTodayKey()),
      message: "Target updated successfully.",
    });

    return attachCookieIfCreated(response, identity);
  } catch {
    const response = jsonResponse(
      {
        error:
          "Server is not ready (database unavailable). Start PostgreSQL and run prisma db push.",
      },
      503,
    );

    return attachCookieIfCreated(response, identity);
  }
}
