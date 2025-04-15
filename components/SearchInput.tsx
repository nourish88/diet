import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void; // Takes a string directly, not an event
  placeholder?: string;
  className?: string;
}

export const SearchInput = ({
  value,
  onChange,
  placeholder = "Arama yapın...",
  className = "",
}: SearchInputProps) => {
  return (
    <div className="relative group">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 transition-colors group-hover:text-purple-500" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`pl-10 h-11 bg-white border-2 border-gray-200 rounded-lg 
          focus:ring-2 focus:ring-purple-500 focus:border-transparent
          hover:border-purple-300 transition-all duration-200
          placeholder:text-gray-400 text-gray-700 ${className}`}
      />
    </div>
  );
};
