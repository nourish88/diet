import React from "react";
import { Button } from "./ui/button";
import { FileDown } from "lucide-react";

interface SimplePdfButtonProps {
  onClick?: () => void;
  loading?: boolean;
  disabled?: boolean;
  className?: string;
}

function SimplePdfButton({
  onClick,
  loading = false,
  disabled = false,
  className = "",
}: SimplePdfButtonProps) {
  return (
    <Button
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      variant="outline"
      size="sm"
    >
      <FileDown className="mr-2 h-4 w-4" />
      {loading ? "Generating PDF..." : "Download PDF"}
    </Button>
  );
}

export default SimplePdfButton;
