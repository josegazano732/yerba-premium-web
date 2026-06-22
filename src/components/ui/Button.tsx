import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  type?: "button" | "submit";
};

const variants = {
  primary: "bg-primary text-white hover:bg-[#314a34]",
  secondary: "bg-white text-primary ring-1 ring-primary/15 hover:bg-secondary/35",
  ghost: "text-primary hover:bg-primary/10"
};

export function Button({ href, children, variant = "primary", className, type = "button" }: ButtonProps) {
  const classes = cn(
    "inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition duration-300 hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2",
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