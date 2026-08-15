import Link from "next/link";
import { SignInButton, SignUpButton, Show, UserButton } from "@clerk/nextjs";
import Button, { buttonClasses } from "@/components/ui/button";

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
  );
}
