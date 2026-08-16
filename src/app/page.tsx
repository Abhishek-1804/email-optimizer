import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import Button, { buttonClasses } from "@/components/ui/button";

const STEPS = [
  ["Connect", "Sign in with Google. No app passwords, nothing to paste."],
  ["Group", "Senders are grouped by domain, then by address — newsletters and promos declare themselves with a List-Unsubscribe header."],
  ["Review", "Open any group, read the messages, block the ones you're done with."],
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col justify-center gap-10 p-8">
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-semibold tracking-tight">Email Optimizer</h1>
        <p className="text-lg text-gray-600">
          Your inbox has a few hundred senders and most of them are machines.
          Connect your Gmail accounts, see who&apos;s actually filling it up, and
          clear them out in one go.
        </p>
      </div>

      <ol className="flex flex-col gap-4">
        {STEPS.map(([title, body], i) => (
          <li key={title} className="flex gap-3">
            <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-900 text-xs font-medium text-white">
              {i + 1}
            </span>
            <p className="text-sm text-gray-600">
              <span className="font-medium text-gray-900">{title}.</span> {body}
            </p>
          </li>
        ))}
      </ol>

      <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
        <span className="font-medium text-gray-900">Nothing is deleted.</span>{" "}
        Blocked mail moves to a folder in your own mailbox, so you can always drag
        it back from Gmail.
      </p>

      <div>
        <Show when="signed-out">
          <div className="flex gap-3">
            <SignInButton>
              <Button size="lg">Sign in</Button>
            </SignInButton>
            <SignUpButton>
              <Button variant="secondary" size="lg">
                Sign up
              </Button>
            </SignUpButton>
          </div>
        </Show>

        <Show when="signed-in">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className={buttonClasses("primary", "lg")}>
              Go to dashboard
            </Link>
            <UserButton />
          </div>
        </Show>
      </div>
    </main>
  );
}
