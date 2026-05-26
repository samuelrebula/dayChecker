import { randomUUID } from "crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const anonymousCookieName = "daychecker_anonymous_id";

export function getTodayKey(referenceDate = new Date()) {
  return referenceDate.toISOString().slice(0, 10);
}

export async function getOrCreateAnonymousId() {
  const cookieStore = await cookies();
  const existingId = cookieStore.get(anonymousCookieName)?.value;

  if (existingId) {
    return { anonymousId: existingId, created: false };
  }

  return { anonymousId: randomUUID(), created: true };
}

export function attachAnonymousCookie(
  response: NextResponse,
  anonymousId: string,
) {
  response.cookies.set(anonymousCookieName, anonymousId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return response;
}
