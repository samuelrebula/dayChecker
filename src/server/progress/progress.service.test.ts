import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrCreateAnonymousIdentity: vi.fn(),
  consumeRateLimit: vi.fn(),
  getClientIp: vi.fn(),
  buildRateLimitKey: vi.fn(
    ({
      action,
      anonymousId,
      clientIp,
    }: {
      action: string;
      anonymousId: string;
      clientIp: string;
    }) => `${action}:${anonymousId}:${clientIp}`,
  ),
  getOrCreateProgress: vi.fn(),
  recordDailyCheck: vi.fn(),
  updateTarget: vi.fn(),
  attachAnonymousCookie: vi.fn((response: Response) => response),
}));

vi.mock("@/server/security/anonymous-identity", () => ({
  attachAnonymousCookie: mocks.attachAnonymousCookie,
  getClientIp: mocks.getClientIp,
  getOrCreateAnonymousIdentity: mocks.getOrCreateAnonymousIdentity,
}));

vi.mock("@/server/security/rate-limit", () => ({
  buildRateLimitKey: mocks.buildRateLimitKey,
  consumeRateLimit: mocks.consumeRateLimit,
}));

vi.mock("./progress.repository", () => ({
  getOrCreateProgress: mocks.getOrCreateProgress,
  recordDailyCheck: mocks.recordDailyCheck,
  updateTarget: mocks.updateTarget,
}));

import { handleProgressGet, handleProgressPost } from "./progress.service";

describe("progress service", () => {
  const todayKey = new Date().toISOString().slice(0, 10);

  beforeEach(() => {
    vi.clearAllMocks();

    mocks.getOrCreateAnonymousIdentity.mockResolvedValue({
      anonymousId: "anon-1",
      cookieValue: "signed-cookie",
      created: false,
    });
    mocks.getClientIp.mockReturnValue("127.0.0.1");
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: true,
      retryAfterSeconds: 60,
      remaining: 9,
    });
  });

  it("returns the current progress on GET", async () => {
    mocks.getOrCreateProgress.mockResolvedValue({
      anonymousId: "anon-1",
      targetCount: 30,
      currentCount: 12,
      lastCheckedDateKey: "2026-05-25",
      completedAt: null,
    });

    const response = await handleProgressGet(
      new Request("http://localhost/api/progress"),
    );
    const body = (await response.json()) as {
      progress: {
        targetCount: number;
        currentCount: number;
        canCheckToday: boolean;
        todayKey: string;
      };
      message: string;
    };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Your progress has been loaded.");
    expect(body.progress.targetCount).toBe(30);
    expect(body.progress.currentCount).toBe(12);
    expect(body.progress.canCheckToday).toBe(true);
    expect(body.progress.todayKey).toBe(todayKey);
  });

  it("records a daily check when the target is still open", async () => {
    mocks.getOrCreateProgress.mockResolvedValue({
      anonymousId: "anon-1",
      targetCount: 5,
      currentCount: 4,
      lastCheckedDateKey: "2026-05-25",
      completedAt: null,
    });
    mocks.recordDailyCheck.mockResolvedValue({
      anonymousId: "anon-1",
      targetCount: 5,
      currentCount: 5,
      lastCheckedDateKey: todayKey,
      completedAt: new Date(`${todayKey}T10:00:00.000Z`),
    });

    const response = await handleProgressPost(
      new Request("http://localhost/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      }),
    );
    const body = (await response.json()) as {
      progress: {
        currentCount: number;
        canCheckToday: boolean;
        completedAt: string | null;
      };
      message: string;
    };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Target completed. Progress saved successfully.");
    expect(body.progress.currentCount).toBe(5);
    expect(body.progress.canCheckToday).toBe(false);
    expect(body.progress.completedAt).toBe(`${todayKey}T10:00:00.000Z`);
    expect(mocks.recordDailyCheck).toHaveBeenCalledWith("anon-1", todayKey);
  });

  it("rejects a second check on the same day", async () => {
    mocks.getOrCreateProgress.mockResolvedValue({
      anonymousId: "anon-1",
      targetCount: 5,
      currentCount: 4,
      lastCheckedDateKey: todayKey,
      completedAt: null,
    });

    const response = await handleProgressPost(
      new Request("http://localhost/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(409);
    expect(body.error).toBe("You already checked in today.");
    expect(mocks.recordDailyCheck).not.toHaveBeenCalled();
  });

  it("updates the target count", async () => {
    mocks.getOrCreateProgress.mockResolvedValue({
      anonymousId: "anon-1",
      targetCount: 5,
      currentCount: 4,
      lastCheckedDateKey: "2026-05-25",
      completedAt: null,
    });
    mocks.updateTarget.mockResolvedValue({
      anonymousId: "anon-1",
      targetCount: 10,
      currentCount: 4,
      lastCheckedDateKey: "2026-05-25",
      completedAt: null,
    });

    const response = await handleProgressPost(
      new Request("http://localhost/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-target", targetCount: 10 }),
      }),
    );
    const body = (await response.json()) as {
      progress: { targetCount: number; currentCount: number };
      message: string;
    };

    expect(response.status).toBe(200);
    expect(body.message).toBe("Target updated successfully.");
    expect(body.progress.targetCount).toBe(10);
    expect(body.progress.currentCount).toBe(4);
    expect(mocks.updateTarget).toHaveBeenCalledWith("anon-1", 10);
  });

  it("returns 429 when the rate limit is hit", async () => {
    mocks.getOrCreateProgress.mockResolvedValue({
      anonymousId: "anon-1",
      targetCount: 5,
      currentCount: 4,
      lastCheckedDateKey: "2026-05-25",
      completedAt: null,
    });
    mocks.consumeRateLimit.mockResolvedValue({
      allowed: false,
      retryAfterSeconds: 12,
      remaining: 0,
    });

    const response = await handleProgressPost(
      new Request("http://localhost/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("12");
    expect(body.error).toBe("Too many requests. Please try again in a moment.");
  });

  it("returns 503 on GET when persistence is unavailable", async () => {
    mocks.getOrCreateProgress.mockRejectedValue(new Error("db offline"));

    const response = await handleProgressGet(
      new Request("http://localhost/api/progress"),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe(
      "Server is not ready (database unavailable). Start PostgreSQL and run prisma db push.",
    );
  });

  it("returns 503 on POST when persistence is unavailable", async () => {
    mocks.getOrCreateProgress.mockRejectedValue(new Error("db offline"));

    const response = await handleProgressPost(
      new Request("http://localhost/api/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check" }),
      }),
    );
    const body = (await response.json()) as { error: string };

    expect(response.status).toBe(503);
    expect(body.error).toBe(
      "Server is not ready (database unavailable). Start PostgreSQL and run prisma db push.",
    );
  });
});
