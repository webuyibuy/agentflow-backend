"use client"

import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap rounded-[12px] text-sm font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:ring-offset-slate-950 dark:focus-visible:ring-slate-300",
  {
    variants: {
      variant: {
        default: "bg-[#0071e3] text-white hover:bg-[#0077ED] active:bg-[#005CC8] shadow-md border-0 font-medium",
        destructive: "bg-[#ff3b30] text-white hover:bg-[#ff4d40] active:bg-[#e62920] shadow-sm",
        outline:
          "border border-[#d1d1d6] bg-white text-[#1c1c1e] hover:bg-[#f2f2f7] active:bg-[#e5e5ea] dark:border-[#3a3a3c] dark:bg-[#2c2c2e] dark:text-white dark:hover:bg-[#3a3a3c] dark:active:bg-[#48484a] font-medium",
        secondary:
          "bg-[#f2f2f7] text-[#1c1c1e] hover:bg-[#e5e5ea] active:bg-[#d1d1d6] dark:bg-[#2c2c2e] dark:text-white dark:hover:bg-[#3a3a3c] dark:active:bg-[#48484a]",
        ghost:
          "text-[#1c1c1e] hover:bg-[#f2f2f7] active:bg-[#e5e5ea] dark:text-white dark:hover:bg-[#2c2c2e] dark:active:bg-[#3a3a3c]",
        link: "text-[#0071e3] underline-offset-4 hover:underline dark:text-[#0091ff]",
        // Apple-specific variants
        filled: "bg-[#0071e3] text-white hover:bg-[#0077ED] active:bg-[#005CC8] shadow-sm",
        tinted:
          "bg-[#e1f0ff] text-[#0071e3] hover:bg-[#d1e8ff] active:bg-[#c1e0ff] dark:bg-[#0d253a] dark:text-[#5ac8fa] dark:hover:bg-[#0f2d45] dark:active:bg-[#113550]",
        pill: "rounded-full bg-[#0071e3] text-white hover:bg-[#0077ED] active:bg-[#005CC8] shadow-sm",
        glass:
          "backdrop-blur-xl bg-white/70 text-[#1c1c1e] hover:bg-white/80 active:bg-white/90 dark:bg-black/30 dark:text-white dark:hover:bg-black/40 dark:active:bg-black/50 shadow-sm",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-[10px] px-3",
        lg: "h-11 rounded-[14px] px-8",
        xl: "h-12 rounded-[16px] px-10 text-base",
        icon: "h-10 w-10",
        // Apple-specific sizes
        compact: "h-8 rounded-[8px] px-3 text-xs",
        touch: "h-14 rounded-[16px] px-6 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    if (asChild) {
      return <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    }

    return <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} type="submit" {...props} />
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
