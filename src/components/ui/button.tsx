import { cn } from "@/utils/cn";

type Variant = "primary" | "secondary" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-gray-900 text-white hover:bg-gray-700",
  secondary: "border border-gray-300 bg-white hover:bg-gray-100",
  danger: "border border-red-300 text-red-600 hover:bg-red-50",
};

const SIZES: Record<Size, string> = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2",
  lg: "px-5 py-2",
};

/**
 * The class string on its own, for elements that can't be a <Button> — most
 * often a next/link <Link> that should look like one.
 */
export function buttonClasses(variant: Variant = "primary", size: Size = "md"): string {
  return cn(
    "rounded-md text-sm font-medium transition-colors disabled:opacity-60",
    VARIANTS[variant],
    SIZES[size]
  );
}

type ButtonProps = React.ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
};

export default function Button({
  variant = "primary",
  size = "md",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button {...props} type={type} className={cn(buttonClasses(variant, size), className)} />
  );
}
