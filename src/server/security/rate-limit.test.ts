import { buildRateLimitKey } from "./rate-limit";

describe("rate limit key builder", () => {
  it("creates a stable compound key", () => {
    const key = buildRateLimitKey({
      action: "check",
      anonymousId: "anon-1",
      clientIp: "127.0.0.1",
    });

    expect(key).toBe("check:anon-1:127.0.0.1");
  });
});
