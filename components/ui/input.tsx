import * as React from "react";
import { cn } from "@/utils/cn";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    ref={ref}
    className={cn(
      "flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none ring-teal-600 placeholder:text-slate-400 focus:ring-2",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";
