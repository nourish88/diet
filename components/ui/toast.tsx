import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ToastVariant } from "./use-toast";
import { AlertCircle, CheckCircle, X } from "lucide-react";

interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
  visible?: boolean;
  onClose: (id: string) => void;
}

export const Toast = ({
  id,
  title,
  description,
  variant = "default",
  visible = true,
  onClose,
}: ToastProps) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  const baseClasses = `
    fixed bottom-4 right-4 w-80 p-4 rounded-lg shadow-lg 
    transition-all duration-300 transform 
    flex items-start gap-3
  `;

  const variantClasses = {
    default: "bg-white border-l-4 border-green-500 text-gray-800",
    destructive: "bg-white border-l-4 border-red-500 text-gray-800",
  };

  const visibilityClasses = visible
    ? "translate-x-0 opacity-100"
    : "translate-x-full opacity-0";

  if (!isMounted) return null;

  return createPortal(
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${visibilityClasses}`}
    >
      <div className="shrink-0 pt-0.5">
        {variant === "destructive" ? (
          <AlertCircle className="h-5 w-5 text-red-500" />
        ) : (
          <CheckCircle className="h-5 w-5 text-green-500" />
        )}
      </div>
      <div className="flex-1">
        <h3 className="font-medium text-sm mb-1">{title}</h3>
        {description && <p className="text-xs text-gray-500">{description}</p>}
      </div>
      <button
        onClick={() => onClose(id)}
        className="shrink-0 rounded-full p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
      >
        <X className="h-4 w-4" />
      </button>
    </div>,
    document.body
  );
};

export const ToastContainer = ({
  toasts,
  dismiss,
}: {
  toasts: Array<{
    id: string;
    title: string;
    description?: string;
    variant?: ToastVariant;
    visible: boolean;
  }>;
  dismiss: (id: string) => void;
}) => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  if (!isMounted) return null;

  return createPortal(
    <div className="fixed bottom-0 right-0 z-50 p-4 w-full max-w-sm flex flex-col items-end gap-2">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          visible={toast.visible}
          onClose={dismiss}
        />
      ))}
    </div>,
    document.body
  );
};
