import { UserButton } from "@clerk/nextjs";
import { listEmailAccounts, removeEmailAccount } from "./actions";
import AddAccountForm from "./AddAccountForm";
import PreviewInbox from "./PreviewInbox";

export default async function DashboardPage() {
  const accounts = await listEmailAccounts();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your accounts</h1>
        <UserButton />
      </header>

      <section className="mb-8">
        {accounts.length === 0 ? (
          <p className="text-gray-500">No email accounts connected yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {accounts.map((account) => (
              <li
                key={account.id}
                className="rounded-lg border border-gray-200 bg-white p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{account.email}</div>
                    <div className="text-sm text-gray-500">
                      {account.label ? `${account.label} · ` : ""}
                      {account.imap_host}:{account.imap_port}
                    </div>
                  </div>
                  <form action={removeEmailAccount}>
                    <input type="hidden" name="id" value={account.id} />
                    <button
                      type="submit"
                      className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                    >
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
        <h2 className="mb-3 text-lg font-semibold">Add an account</h2>
        <AddAccountForm />
      </section>
    </div>
  );
}
