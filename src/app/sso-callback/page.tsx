import { AuthenticateWithRedirectCallback } from "@clerk/nextjs";

/**
 * Where Google sends the browser after a mailbox connection is approved.
 * Clerk finishes the handshake client-side, then forwards to the dashboard.
 */
export default function SSOCallback() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <p className="text-sm text-gray-500">Finishing the connection…</p>
      <AuthenticateWithRedirectCallback
        signInFallbackRedirectUrl="/dashboard"
        signUpFallbackRedirectUrl="/dashboard"
      />
    </div>
  );
}
