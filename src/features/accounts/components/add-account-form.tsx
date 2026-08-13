"use client";

import { useRef, useState, useTransition } from "react";
import Button from "@/components/ui/button";
import Input from "@/components/ui/input";
import { addAccount } from "../actions/add-account";

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
            await addAccount(formData);
            formRef.current?.reset();
          } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong");
          }
        });
      }}
      className="flex max-w-sm flex-col gap-2.5"
    >
      <Input name="email" type="email" placeholder="you@gmail.com" required />
      <Input name="appPassword" type="password" placeholder="Gmail app password" required />
      <Input name="label" type="text" placeholder="Label (optional)" />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" disabled={isPending}>
        {isPending ? "Adding..." : "Add account"}
      </Button>

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
