"use client";
import { useEffect } from "react";
import { X } from "lucide-react";

interface ImageModalProps {
  isOpen: boolean;
  imageUrl: string;
  onClose: () => void;
}

export default function ImageModal({
  isOpen,
  imageUrl,
  onClose,
}: ImageModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      // Prevent body scroll when modal is open
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "unset";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 bg-white rounded-full hover:bg-gray-100 transition-colors z-10"
        aria-label="Kapat"
      >
        <X className="w-6 h-6 text-gray-800" />
      </button>

      <div
        className="relative max-w-7xl max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={imageUrl}
          alt="Zoomed photo"
          className="w-full h-auto rounded-lg shadow-2xl"
        />
      </div>
    </div>
  );
}

