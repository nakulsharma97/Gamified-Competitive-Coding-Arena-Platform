"use client";

import { Toast as ToastView } from "@/components/ui/toast";
import { useToast } from "@/hooks/use-toast";

export function Toaster() {
  const { toasts, dismiss } = useToast();

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-100 flex w-full max-w-sm flex-col gap-2">
      {toasts.map(toast => (
        <ToastView
          key={toast.id}
          {...toast}
          onClose={() => dismiss(toast.id)}
        />
      ))}
    </div>
  );
}
