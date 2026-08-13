import { cn } from "@/utils/cn";

export default function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      {...props}
      className={cn(
        "rounded-md border border-gray-300 bg-white px-3 py-2 text-sm",
        "focus:border-gray-500 focus:outline-none",
        className
      )}
    />
  );
}
