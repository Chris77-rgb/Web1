import { forwardRef } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-700 shadow-sm shadow-brand-600/20",
  secondary: "bg-card-2 text-fg hover:bg-line",
  outline: "border border-line bg-card text-fg hover:bg-card-2",
  ghost: "text-muted hover:text-fg hover:bg-card-2",
  danger: "bg-red-600 text-white hover:bg-red-700",
};
const sizes: Record<Size, string> = { sm: "h-8 px-3 text-sm gap-1.5", md: "h-10 px-4 text-sm gap-2", lg: "h-12 px-6 text-base gap-2" };

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ variant = "primary", size = "md", loading, className, children, disabled, ...rest }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn("inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-[.98] disabled:pointer-events-none disabled:opacity-50", variants[variant], sizes[size], className)}
      {...rest}
    >
      {loading && <Loader2 className="size-4 animate-spin" />}
      {children}
    </button>
  );
});

export function buttonClass(variant: Variant = "primary", size: Size = "md", extra?: string) {
  return cn("inline-flex items-center justify-center rounded-xl font-medium transition-all active:scale-[.98]", variants[variant], sizes[size], extra);
}
