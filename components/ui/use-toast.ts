// Adapted from shadcn/ui toast component
import { useState, useEffect } from "react";

type ToastVariant = "default" | "destructive";

interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
}

interface Toast extends ToastOptions {
  id: string;
  visible: boolean;
}

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = (options: ToastOptions) => {
    const id = Math.random().toString(36).substring(2, 9);
    const newToast: Toast = {
      id,
      title: options.title,
      description: options.description,
      variant: options.variant || "default",
      duration: options.duration || 3000,
      visible: true,
    };

    setToasts((prev) => [...prev, newToast]);

    // Automatically dismiss the toast after duration
    setTimeout(() => {
      dismiss(id);
    }, newToast.duration);

    return id;
  };

  const dismiss = (id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, visible: false } : t))
    );

    // Remove from state after animation completes
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 300);
  };

  useEffect(() => {
    // Add dismissal listeners - this would be more complex in a real implementation
    return () => {
      // Cleanup
    };
  }, []);

  return { toast, dismiss, toasts };
}

export { type ToastVariant };
export type { ToastOptions };
