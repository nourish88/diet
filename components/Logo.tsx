import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoSize = "sm" | "md" | "lg";

interface LogoProps {
  size?: LogoSize;
  href?: string | null;
  showText?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<LogoSize, string> = {
  sm: "h-9",
  md: "h-11",
  lg: "h-16",
};

const TEXT_SIZE: Record<LogoSize, { title: string; subtitle: string }> = {
  sm: { title: "text-sm", subtitle: "text-xs" },
  md: { title: "text-base lg:text-lg", subtitle: "text-xs" },
  lg: { title: "text-xl", subtitle: "text-sm" },
};

export default function Logo({
  size = "md",
  href = "/",
  showText = false,
  className,
}: LogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="inline-flex items-center justify-center rounded-md p-1 dark:bg-card dark:shadow-sm transition-colors">
        <img
          src="/ezgi_evgin.png"
          alt="Ezgi Evgin Diyet Danışmanlık"
          className={cn(SIZE_CLASSES[size], "w-auto object-contain")}
        />
      </div>
      {showText && (
        <div className="hidden md:block leading-tight">
          <p
            className={cn(
              "font-semibold whitespace-nowrap bg-brand-gradient bg-clip-text text-transparent",
              TEXT_SIZE[size].title
            )}
          >
            Ezgi Evgin Beslenme
          </p>
          <p
            className={cn(
              "text-muted-foreground",
              TEXT_SIZE[size].subtitle
            )}
          >
            Diyet Danışmanlık
          </p>
        </div>
      )}
    </div>
  );

  if (href === null) return content;
  return (
    <Link href={href} className="inline-flex items-center">
      {content}
    </Link>
  );
}
