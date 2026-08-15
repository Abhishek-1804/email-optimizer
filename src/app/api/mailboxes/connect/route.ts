import crypto from "crypto";
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { authorizeUrl, STATE_COOKIE, callbackUrl } from "@/lib/google";

/**
 * Starts a mailbox connection. Nothing is stored until Google redirects back.
 *
 * `state` goes into an httpOnly cookie so the callback can prove the response
 * belongs to a request this browser made — otherwise a crafted callback URL
 * attaches an attacker's mailbox to the victim's account.
 */
export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  const state = crypto.randomBytes(32).toString("base64url");
  const response = NextResponse.redirect(authorizeUrl(callbackUrl(request), state));

  response.cookies.set(STATE_COOKIE, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: new URL(request.url).protocol === "https:",
    path: "/api/mailboxes",
    maxAge: 600,
  });

  return response;
}
