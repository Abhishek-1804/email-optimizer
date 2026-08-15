import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { exchangeCode, STATE_COOKIE, callbackUrl } from "@/lib/google";
import { connectMailbox } from "@/lib/mailboxes";

/** Sends the user back to the dashboard with a message it can render. */
function back(request: Request, params: Record<string, string>) {
  const url = new URL("/dashboard", request.url);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);

  const response = NextResponse.redirect(url);
  response.cookies.delete(STATE_COOKIE);
  return response;
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const denied = url.searchParams.get("error");

  if (denied) {
    return back(request, { error: "Mailbox access was not granted." });
  }

  // Compare against the cookie set when this flow started. A mismatch means the
  // callback did not come from a request this browser made.
  const expected = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${STATE_COOKIE}=`))
    ?.slice(STATE_COOKIE.length + 1);

  if (!code || !state || !expected || state !== expected) {
    return back(request, { error: "That connection link expired. Please try again." });
  }

  try {
    const mailbox = await exchangeCode(code, callbackUrl(request));
    await connectMailbox(mailbox);
    return back(request, { connected: mailbox.email });
  } catch (err) {
    console.error("Mailbox connection failed:", err);
    return back(request, {
      error: err instanceof Error ? err.message : "Could not connect that mailbox.",
    });
  }
}
