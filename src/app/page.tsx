import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 600 }}>Email Optimizer</h1>
      <p style={{ maxWidth: 480, opacity: 0.8 }}>
        Connect your inboxes over IMAP and bulk-filter spam across all of them
        from one dashboard.
      </p>

      <Show when="signed-out">
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <SignInButton>
            <button style={buttonStyle}>Sign in</button>
          </SignInButton>
          <SignUpButton>
            <button style={buttonStyle}>Sign up</button>
          </SignUpButton>
        </div>
      </Show>

      <Show when="signed-in">
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <Link href="/dashboard" style={buttonStyle}>
            Go to dashboard
          </Link>
          <UserButton />
        </div>
      </Show>
    </div>
  );
}

const buttonStyle: React.CSSProperties = {
  padding: "0.5rem 1.25rem",
  borderRadius: 6,
  border: "1px solid currentColor",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  textDecoration: "none",
  fontSize: "0.95rem",
};
