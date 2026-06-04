import { Check, CheckCheck } from "lucide-react";

type Props = {
  isDelivered: boolean;
  isRead: boolean;
  className?: string;
};

export function MessageStatusTicks({ isDelivered, isRead, className = "" }: Props) {
  if (isRead) {
    return (
      <CheckCheck
        className={`h-3.5 w-3.5 text-sky-400 dark:text-sky-300 ${className}`}
        aria-label="Okundu"
      />
    );
  }

  if (isDelivered) {
    return (
      <CheckCheck
        className={`h-3.5 w-3.5 text-white/70 dark:text-white/60 ${className}`}
        aria-label="İletildi"
      />
    );
  }

  return (
    <Check
      className={`h-3.5 w-3.5 text-white/70 dark:text-white/60 ${className}`}
      aria-label="Gönderildi"
    />
  );
}
