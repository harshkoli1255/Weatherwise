"use client"

import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertTriangle, CheckCircle, Info } from "lucide-react"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon =
          variant === "success"
            ? CheckCircle
            : variant === "destructive"
            ? AlertTriangle
            : Info

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex items-start gap-3 flex-grow">
              <Icon className={cn("h-6 w-6 mt-0.5 flex-shrink-0", {
                'text-success': variant === 'success',
                'text-destructive': variant === 'destructive',
                'text-primary': variant === 'default'
              })} />
              <div className="grid gap-1">
                {title && <ToastTitle className={cn({
                    'text-success': variant === 'success',
                    'text-destructive': variant === 'destructive',
                  })}>{title}</ToastTitle>}
                {description && (
                  <ToastDescription>{description}</ToastDescription>
                )}
              </div>
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
