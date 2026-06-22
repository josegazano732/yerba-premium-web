"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "min-h-12 w-full rounded-full border border-primary/15 bg-white px-5 text-sm text-text outline-none transition placeholder:text-muted focus:border-primary focus:ring-4 focus:ring-primary/10",
        className
      )}
      {...props}
    />
  );
});