import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-8 text-center">
      <h1 className="text-3xl font-semibold">Email Optimizer</h1>
      <p className="max-w-md text-gray-600">
        Connect your inboxes over IMAP and bulk-filter spam across all of them
        from one dashboard.
      </p>

      <Show when="signed-out">
        <div className="flex gap-3">
          <SignInButton>
            <button className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700">
              Sign in
            </button>
          </SignInButton>
          <SignUpButton>
            <button className="rounded-md border border-gray-300 bg-white px-5 py-2 text-sm font-medium hover:bg-gray-100">
              Sign up
            </button>
          </SignUpButton>
        </div>
      </Show>

      <Show when="signed-in">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="rounded-md bg-gray-900 px-5 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Go to dashboard
          </Link>
          <UserButton />
        </div>
      </Show>
    </div>
  );
}
