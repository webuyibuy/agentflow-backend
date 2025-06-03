import type * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#0071e3] focus:ring-offset-2 dark:focus:ring-[#0091ff]",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[#1c1c1e] text-white dark:bg-white dark:text-[#1c1c1e]",
        secondary: "border-transparent bg-[#f2f2f7] text-[#1c1c1e] dark:bg-[#3a3a3c] dark:text-white",
        destructive: "border-transparent bg-[#ff3b30] text-white dark:bg-[#ff453a] dark:text-white",
        outline: "text-[#1c1c1e] dark:text-white",
        success: "border-transparent bg-[#34c759] text-white dark:bg-[#30d158] dark:text-white",
        warning: "border-transparent bg-[#ff9f0a] text-white dark:bg-[#ffa01e] dark:text-white",
        info: "border-transparent bg-[#5ac8fa] text-white dark:bg-[#64d2ff] dark:text-white",
        // Apple-specific variants
        filled: "border-transparent bg-[#0071e3] text-white dark:bg-[#0091ff] dark:text-white",
        tinted: "border-transparent bg-[#e1f0ff] text-[#0071e3] dark:bg-[#0d253a] dark:text-[#5ac8fa]",
        glass: "border-transparent backdrop-blur-xl bg-white/70 text-[#1c1c1e] dark:bg-black/30 dark:text-white",
      },
      size: {
        default: "px-2.5 py-0.5 text-xs",
        sm: "px-2 py-0.5 text-[0.65rem]",
        lg: "px-3 py-1 text-sm",
        // Apple-specific sizes
        pill: "px-3 py-1 text-xs",
        tag: "px-2 py-0.5 text-[0.65rem]",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant, size }), className)} {...props} />
}

export { Badge, badgeVariants }
