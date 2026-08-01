import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "forest" | "ghost";
  className?: string;
  type?: "button" | "submit";
};

const variants = {
  primary: "bg-cta text-white shadow-sm shadow-cta/20 hover:bg-cta-hover hover:shadow-md hover:shadow-cta/25",
  secondary: "bg-white text-forest ring-1 ring-forest/15 hover:bg-secondary/40 hover:ring-forest/30",
  forest: "bg-forest text-white hover:bg-primary",
  ghost: "text-primary hover:bg-primary/10"
};

export function Button({ href, children, variant = "primary", className, type = "button" }: ButtonProps) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition duration-300 hover:scale-[1.03] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-cta focus:ring-offset-2 focus:ring-offset-background",
    variants[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} className={classes}>
      {children}
    </button>
  );
}