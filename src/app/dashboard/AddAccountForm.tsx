"use client";

import { useRef, useState, useTransition } from "react";
import { addEmailAccount } from "./actions";

const inputClass =
  "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-gray-500 focus:outline-none";

export default function AddAccountForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      ref={formRef}
      action={(formData: FormData) => {
        setError(null);
        startTransition(async () => {
          try {
            await addEmailAccount(formData);
            formRef.current?.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
          }
        });
      }}
      className="flex max-w-sm flex-col gap-2.5"
    >
      <input name="email" type="email" placeholder="you@gmail.com" required className={inputClass} />
      <input
        name="appPassword"
        type="password"
        placeholder="Gmail app password"
        required
        className={inputClass}
      />
      <input name="label" type="text" placeholder="Label (optional)" className={inputClass} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-60"
      >
        {isPending ? "Adding..." : "Add account"}
      </button>
      <p className="text-xs text-gray-500">
        Use a Gmail{" "}
        <a
          href="https://myaccount.google.com/apppasswords"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          app password
        </a>
        , not your regular password.
      </p>
    </form>
  );
}
