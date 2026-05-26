import { buildProgressPayload } from "./progress.formatter";

describe("progress payload formatter", () => {
  it("marks the day as checkable when not completed and not checked today", () => {
    const payload = buildProgressPayload(
      {
        anonymousId: "anon-1",
        targetCount: 10,
        currentCount: 4,
        lastCheckedDateKey: "2026-05-25",
        completedAt: null,
      },
      "2026-05-26",
    );

    expect(payload.targetCount).toBe(10);
    expect(payload.currentCount).toBe(4);
    expect(payload.canCheckToday).toBe(true);
    expect(payload.completedAt).toBeNull();
  });

  it("blocks checking when the target is already completed", () => {
    const payload = buildProgressPayload(
      {
        anonymousId: "anon-1",
        targetCount: 10,
        currentCount: 10,
        lastCheckedDateKey: "2026-05-26",
        completedAt: new Date("2026-05-26T10:00:00.000Z"),
      },
      "2026-05-26",
    );

    expect(payload.canCheckToday).toBe(false);
    expect(payload.completedAt).toBe("2026-05-26T10:00:00.000Z");
  });
});
