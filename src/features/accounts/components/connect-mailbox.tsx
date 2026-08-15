"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser, useReverification } from "@clerk/nextjs";
import { isReverificationCancelledError } from "@clerk/nextjs/errors";
import Button from "@/components/ui/button";

/**
 * Attaching or removing a mailbox is a sensitive operation, so Clerk requires
 * a recently verified session. `useReverification` catches that, shows the
 * verification modal, and retries the original call — without it the request
 * just fails with "additional verification required".
 */

/**
 * Starts Google's OAuth flow to attach another mailbox to the current user.
 *
 * Deliberately not a sign-in: signing in with a second Google account would
 * create a second Clerk user. Connecting attaches it to this one, which is what
 * makes the combined inbox possible.
 */
export default function ConnectMailbox({ label = "Connect a mailbox" }: { label?: string }) {
  const { user } = useUser();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAccount = useReverification(() =>
    user!.createExternalAccount({
      strategy: "oauth_google",
      redirectUrl: `${window.location.origin}/sso-callback`,
    })
  );

  async function connect() {
    if (!user) return;
    setError(null);
    setPending(true);

    try {
      const account = await createAccount();
      const next = account.verification?.externalVerificationRedirectURL;
      if (!next) throw new Error("Google did not return a consent URL.");
      window.location.href = next.toString();
    } catch (err) {
      setPending(false);
      if (isReverificationCancelledError(err)) return;
      setError(err instanceof Error ? err.message : "Could not start the connection.");
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Button onClick={connect} disabled={pending || !user}>
        {pending ? "Opening Google…" : label}
      </Button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}

/** Revokes one mailbox. Clerk drops the refresh token with it. */
export function DisconnectMailbox({ externalAccountId }: { externalAccountId: string }) {
  const { user } = useUser();
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const destroyAccount = useReverification((id: string) => {
    // The browser SDK and the backend SDK disagree about which id lives on
    // `id` — one uses eac_, the other idn_ — so match either rather than
    // silently doing nothing.
    const account = user?.externalAccounts.find(
      (a) => a.id === id || a.identificationId === id
    );
    if (!account) throw new Error("That mailbox is no longer connected.");
    return account.destroy();
  });

  async function disconnect() {
    setError(null);
    setPending(true);

    try {
      await destroyAccount(externalAccountId);
      router.refresh();
    } catch (err) {
      if (!isReverificationCancelledError(err)) {
        setError(err instanceof Error ? err.message : "Could not disconnect.");
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={disconnect} disabled={pending || !user} variant="danger" size="sm">
        {pending ? "Removing…" : "Disconnect"}
      </Button>
      {error && <p className="max-w-48 text-right text-xs text-red-600">{error}</p>}
    </div>
  );
}
