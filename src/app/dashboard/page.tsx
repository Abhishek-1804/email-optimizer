import { UserButton } from "@clerk/nextjs";
import { listEmailAccounts, removeEmailAccount } from "./actions";
import AddAccountForm from "./AddAccountForm";
import PreviewInbox from "./PreviewInbox";

export default async function DashboardPage() {
  const accounts = await listEmailAccounts();

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "2rem" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Your accounts</h1>
        <UserButton />
      </header>

      <section style={{ marginBottom: "2rem" }}>
        {accounts.length === 0 ? (
          <p style={{ opacity: 0.7 }}>No email accounts connected yet.</p>
        ) : (
          <ul style={{ listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {accounts.map((account) => (
              <li
                key={account.id}
                style={{
                  border: "1px solid #ccc3",
                  borderRadius: 8,
                  padding: "0.75rem 1rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 500 }}>{account.email}</div>
                    <div style={{ fontSize: "0.85rem", opacity: 0.7 }}>
                      {account.label ? `${account.label} · ` : ""}
                      {account.imap_host}:{account.imap_port}
                    </div>
                  </div>
                  <form action={removeEmailAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <button type="submit" style={{ border: "none", background: "none", cursor: "pointer", opacity: 0.6 }}>
                      Remove
                    </button>
                  </form>
                </div>
                <PreviewInbox accountId={account.id} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Add an account
        </h2>
        <AddAccountForm />
      </section>
    </div>
  );
}
