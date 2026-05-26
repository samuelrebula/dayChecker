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
  const { anonymousId, cookieValue, created } =
    await getOrCreateAnonymousIdentity();
  const rateLimit = await applyRateLimit(request, anonymousId, "load-progress");

  if (!rateLimit.allowed) {
    const response = jsonResponse(
      {
        error: "Too many requests. Please try again in a moment.",
      },
      429,
    );

    attachAnonymousCookie(response, cookieValue);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const progress = await getOrCreateProgress(anonymousId);
  const response = jsonResponse({
    progress: buildProgressPayload(progress, getTodayKey()),
    message: "Your progress has been loaded.",
  });

  if (created) {
    attachAnonymousCookie(response, cookieValue);
  }

  return response;
}

export async function handleProgressPost(request: Request) {
  const { anonymousId, cookieValue, created } =
    await getOrCreateAnonymousIdentity();
  const body = await request.json().catch(() => null);
  const parsed = progressActionSchema.safeParse(body);

  if (!parsed.success) {
    const response = jsonResponse({ error: "Invalid request." }, 400);

    if (created) {
      attachAnonymousCookie(response, cookieValue);
    }

    return response;
  }

  const rateLimit = await applyRateLimit(
    request,
    anonymousId,
    parsed.data.action,
  );

  if (!rateLimit.allowed) {
    const response = jsonResponse(
      {
        error: "Too many requests. Please try again in a moment.",
      },
      429,
    );

    attachAnonymousCookie(response, cookieValue);
    response.headers.set("Retry-After", String(rateLimit.retryAfterSeconds));
    return response;
  }

  const progress = await getOrCreateProgress(anonymousId);

  if (parsed.data.action === "check") {
    if (progress.completedAt) {
      const response = jsonResponse(
        {
          error: "That target has already been completed.",
          progress: buildProgressPayload(progress, getTodayKey()),
        },
        409,
      );

      if (created) {
        attachAnonymousCookie(response, cookieValue);
      }

      return response;
    }

    if (progress.lastCheckedDateKey === getTodayKey()) {
      const response = jsonResponse(
        {
          error: "You already checked in today.",
          progress: buildProgressPayload(progress, getTodayKey()),
        },
        409,
      );

      if (created) {
        attachAnonymousCookie(response, cookieValue);
      }

      return response;
    }

    const updated = await recordDailyCheck(anonymousId, getTodayKey());
    const response = jsonResponse({
      progress: buildProgressPayload(updated, getTodayKey()),
      message: updated.completedAt
        ? "Target completed. Progress saved successfully."
        : "Daily check recorded.",
    });

    if (created) {
      attachAnonymousCookie(response, cookieValue);
    }

    return response;
  }

  const updated = await updateTarget(anonymousId, parsed.data.targetCount);

  const response = jsonResponse({
    progress: buildProgressPayload(updated, getTodayKey()),
    message: "Target updated successfully.",
  });

  if (created) {
    attachAnonymousCookie(response, cookieValue);
  }

  return response;
}
