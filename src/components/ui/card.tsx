import { cn } from "@/utils/cn";

export default function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div {...props} className={cn("rounded-lg border border-gray-200 bg-white p-4", className)} />
  );
}
