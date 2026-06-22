import { cn } from "@/lib/utils";

export function Badge({ children, className }: Readonly<{ children: React.ReactNode; className?: string }>) {
  return (
    <span className={cn("inline-flex rounded-full bg-secondary/70 px-4 py-1.5 text-xs font-bold uppercase text-primary", className)}>
      {children}
    </span>
  );
}