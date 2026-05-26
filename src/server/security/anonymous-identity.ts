import { randomUUID, createHmac, timingSafeEqual } from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const anonymousCookieName = "daychecker_anonymous_id";
const cookieSeparator = ".";

export function getAnonymousIdentitySecret() {
  const secret = process.env.ANONYMOUS_ID_SECRET;

  if (secret) {
    return secret;
  }

  return process.env.NODE_ENV === "production"
    ? null
    : "daychecker-local-secret";
}

export function signAnonymousId(anonymousId: string) {
  const secret = getAnonymousIdentitySecret();

  if (!secret) {
    throw new Error("Missing ANONYMOUS_ID_SECRET.");
  }

  return createHmac("sha256", secret).update(anonymousId).digest("hex");
}

export function buildCookieValue(anonymousId: string) {
  return `${anonymousId}${cookieSeparator}${signAnonymousId(anonymousId)}`;
}

export function verifyCookieValue(cookieValue: string | undefined) {
  if (!cookieValue) {
    return null;
  }

  const separatorIndex = cookieValue.lastIndexOf(cookieSeparator);

  if (separatorIndex <= 0) {
    return null;
  }

  const anonymousId = cookieValue.slice(0, separatorIndex);
  const signature = cookieValue.slice(separatorIndex + 1);
  const expectedSignature = signAnonymousId(anonymousId);

  if (signature.length !== expectedSignature.length) {
    return null;
  }

  try {
    if (
      !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return anonymousId;
}

export async function getOrCreateAnonymousIdentity() {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(anonymousCookieName)?.value;
  const anonymousId = verifyCookieValue(existingCookie);

  if (anonymousId) {
    return {
      anonymousId,
      cookieValue: existingCookie as string,
      created: false,
    };
  }

  const createdAnonymousId = randomUUID();

  return {
    anonymousId: createdAnonymousId,
    cookieValue: buildCookieValue(createdAnonymousId),
    created: true,
  };
}

export function attachAnonymousCookie(
  response: NextResponse,
  cookieValue: string,
) {
  response.cookies.set(anonymousCookieName, cookieValue, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}

export function getClientIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return realIp ?? "unknown";
}
