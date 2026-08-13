import Link from "next/link";
import Button, { buttonClasses } from "@/components/ui/button";
import Card from "@/components/ui/card";
import { removeAccount } from "../actions/remove-account";
import type { EmailAccount } from "../types";

export default function AccountList({ accounts }: { accounts: EmailAccount[] }) {
  if (accounts.length === 0) {
    return <p className="text-gray-500">No email accounts connected yet.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {accounts.map((account) => (
        <li key={account.id}>
          <Card className="flex items-center justify-between">
            <div>
              <div className="font-medium">{account.email}</div>
              <div className="text-sm text-gray-500">
                {account.label ? `${account.label} · ` : ""}
                {account.imap_host}:{account.imap_port}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* A Link, not a Button — this navigates. Composition with the
                  messages feature happens at the route, not by importing it. */}
              <Link
                href={`/dashboard/${account.id}`}
                className={buttonClasses("secondary", "sm")}
              >
                View inbox
              </Link>

              <form action={removeAccount}>
                <input type="hidden" name="id" value={account.id} />
                <Button type="submit" variant="danger" size="sm">
                  Remove
                </Button>
              </form>
            </div>
          </Card>
        </li>
      ))}
    </ul>
  );
}
