"use client";

import { useRef, useState, useTransition } from "react";
import { addEmailAccount } from "./actions";

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
      style={{ display: "flex", flexDirection: "column", gap: "0.6rem", maxWidth: 360 }}
    >
      <input name="email" type="email" placeholder="you@gmail.com" required style={inputStyle} />
      <input
        name="appPassword"
        type="password"
        placeholder="Gmail app password"
        required
        style={inputStyle}
      />
      <input name="label" type="text" placeholder="Label (optional)" style={inputStyle} />

      {error && <p style={{ color: "#e5484d", fontSize: "0.85rem" }}>{error}</p>}

      <button
        type="submit"
        disabled={isPending}
        style={{
          padding: "0.5rem 1rem",
          borderRadius: 6,
          border: "1px solid currentColor",
          background: "transparent",
          cursor: isPending ? "default" : "pointer",
          opacity: isPending ? 0.6 : 1,
        }}
      >
        {isPending ? "Adding..." : "Add account"}
      </button>
      <p style={{ fontSize: "0.8rem", opacity: 0.6 }}>
        Use a Gmail{" "}
        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer">
          app password
        </a>
        , not your regular password.
      </p>
    </form>
  );
}

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  borderRadius: 6,
  border: "1px solid #ccc6",
  background: "transparent",
  color: "inherit",
};
