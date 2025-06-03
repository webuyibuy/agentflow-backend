"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const alertVariants = cva(
  "relative w-full rounded-2xl border px-6 py-5 shadow-sm [&>svg~*]:pl-8 [&>svg]:absolute [&>svg]:left-6 [&>svg]:top-5 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground border-border",
        destructive:
          "border-red-500/30 bg-red-50/80 text-red-700 dark:border-red-500/30 dark:bg-red-900/20 dark:text-red-300 backdrop-blur-sm",
        success:
          "border-green-500/30 bg-green-50/80 text-green-700 dark:border-green-500/30 dark:bg-green-900/20 dark:text-green-300 backdrop-blur-sm",
        warning:
          "border-yellow-500/30 bg-yellow-50/80 text-yellow-700 dark:border-yellow-500/30 dark:bg-yellow-900/20 dark:text-yellow-300 backdrop-blur-sm",
        info: "border-blue-500/30 bg-blue-50/80 text-blue-700 dark:border-blue-500/30 dark:bg-blue-900/20 dark:text-blue-300 backdrop-blur-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

interface AlertProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof alertVariants> {
  dismissible?: boolean
  onClose?: () => void
  duration?: number
  show?: boolean
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  ({ className, variant, dismissible = false, onClose, children, duration = 0, show = false, ...props }, ref) => {
    const [isVisible, setIsVisible] = useState(show)
    const [isAnimating, setIsAnimating] = useState(false)

    const handleClose = useCallback(() => {
      setIsAnimating(true)
      setTimeout(() => {
        setIsVisible(false)
        onClose?.()
      }, 150) // Animation duration
    }, [onClose])

    useEffect(() => {
      setIsVisible(show)
    }, [show])

    useEffect(() => {
      if (duration > 0 && isVisible && !isAnimating) {
        const timer = setTimeout(() => {
          handleClose()
        }, duration)

        return () => clearTimeout(timer)
      }
    }, [duration, isVisible, isAnimating, handleClose])

    if (!isVisible) return null

    return (
      <div
        ref={ref}
        role="alert"
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          alertVariants({ variant }),
          "relative",
          dismissible && "pr-12",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">{children}</div>
          {dismissible && (
            <div className="flex-shrink-0">
              <button
                onClick={handleClose}
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-md",
                  "text-current opacity-70 hover:opacity-100",
                  "hover:bg-black/10 dark:hover:bg-white/10",
                  "transition-all duration-200 ease-in-out",
                  "focus:outline-none focus:ring-2 focus:ring-current focus:ring-offset-2",
                  "focus:ring-offset-background",
                  "disabled:pointer-events-none disabled:opacity-50",
                )}
                aria-label="Dismiss alert"
                type="button"
                tabIndex={0}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close alert</span>
              </button>
            </div>
          )}
        </div>
      </div>
    )
  },
)
Alert.displayName = "Alert"

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
)
AlertTitle.displayName = "AlertTitle"

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
)
AlertDescription.displayName = "AlertDescription"

export { Alert, AlertTitle, AlertDescription }
