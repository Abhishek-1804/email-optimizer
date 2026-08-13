"use client";

import Link from "next/link";
import Button from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-red-600">{error.message}</p>

      <div className="mt-4 flex gap-3">
        <Button onClick={reset}>Try again</Button>
        <Link href="/dashboard" className="self-center text-sm text-gray-500 hover:text-gray-900">
          Back to accounts
        </Link>
      </div>
    </div>
  );
}
