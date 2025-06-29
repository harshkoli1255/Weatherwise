
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
            <div className="flex items-start gap-4 flex-grow">
              <div className={cn("p-1.5 rounded-full flex-shrink-0", {
                'bg-success/20': variant === 'success',
                'bg-destructive/20': variant === 'destructive',
                'bg-primary/20': variant === 'default'
              })}>
                <Icon className={cn("h-5 w-5", {
                  'text-success': variant === 'success',
                  'text-destructive': variant === 'destructive',
                  'text-primary': variant === 'default'
                })} />
              </div>
              <div className="grid gap-1">
                {title && <ToastTitle>{title}</ToastTitle>}
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
