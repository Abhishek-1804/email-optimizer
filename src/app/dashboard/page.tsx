import { UserButton } from "@clerk/nextjs";
import { listAccounts } from "@/features/accounts/actions/list-accounts";
import AccountList from "@/features/accounts/components/account-list";
import AddAccountForm from "@/features/accounts/components/add-account-form";

export default async function DashboardPage() {
  const accounts = await listAccounts();

  return (
    <div className="mx-auto max-w-5xl p-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Your accounts</h1>
        <UserButton />
      </header>

      <section className="mb-8">
        <AccountList accounts={accounts} />
      </section>

      <section>
        <h2 className="mb-3 text-lg font-semibold">Add an account</h2>
        <AddAccountForm />
      </section>
    </div>
  );
}
