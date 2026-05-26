import {
  buildCookieValue,
  signAnonymousId,
  verifyCookieValue,
} from "./anonymous-identity";

describe("anonymous identity cookie helpers", () => {
  const originalSecret = process.env.ANONYMOUS_ID_SECRET;

  beforeEach(() => {
    process.env.ANONYMOUS_ID_SECRET = "unit-test-secret";
  });

  afterEach(() => {
    process.env.ANONYMOUS_ID_SECRET = originalSecret;
  });

  it("signs and verifies a cookie value", () => {
    const anonymousId = "abc-123";
    const cookieValue = buildCookieValue(anonymousId);

    expect(cookieValue).toContain(anonymousId);
    expect(verifyCookieValue(cookieValue)).toBe(anonymousId);
  });

  it("rejects a tampered cookie value", () => {
    const validCookie = buildCookieValue("abc-123");
    const tamperedCookie = validCookie.replace("abc-123", "xyz-999");

    expect(verifyCookieValue(tamperedCookie)).toBeNull();
  });

  it("generates a stable signature for the same id and secret", () => {
    const signature = signAnonymousId("abc-123");

    expect(signature).toHaveLength(64);
    expect(signature).toBe(signAnonymousId("abc-123"));
  });
});
