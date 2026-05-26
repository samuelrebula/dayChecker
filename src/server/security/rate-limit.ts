import { prisma } from "@/lib/prisma";

type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
};

function getWindowEnd(windowMs: number) {
  return new Date(Date.now() + windowMs);
}

export async function consumeRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = new Date();
  const existing = await prisma.requestThrottle.findUnique({
    where: { key },
  });

  if (!existing || existing.windowEndsAt <= now) {
    const createdOrReset = await prisma.requestThrottle.upsert({
      where: { key },
      create: {
        key,
        hitCount: 1,
        windowEndsAt: getWindowEnd(windowMs),
      },
      update: {
        hitCount: 1,
        windowEndsAt: getWindowEnd(windowMs),
      },
    });

    return {
      allowed: true,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil(
          (createdOrReset.windowEndsAt.getTime() - now.getTime()) / 1000,
        ),
      ),
      remaining: Math.max(limit - 1, 0),
    };
  }

  if (existing.hitCount >= limit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.windowEndsAt.getTime() - now.getTime()) / 1000),
      ),
      remaining: 0,
    };
  }

  const updated = await prisma.requestThrottle.update({
    where: { key },
    data: {
      hitCount: { increment: 1 },
    },
  });

  return {
    allowed: true,
    retryAfterSeconds: Math.max(
      1,
      Math.ceil((existing.windowEndsAt.getTime() - now.getTime()) / 1000),
    ),
    remaining: Math.max(limit - updated.hitCount, 0),
  };
}

export function buildRateLimitKey(params: {
  anonymousId: string;
  action: string;
  clientIp: string;
}) {
  return `${params.action}:${params.anonymousId}:${params.clientIp}`;
}
