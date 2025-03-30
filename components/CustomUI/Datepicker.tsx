import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, parse } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { Input } from "@/components/ui/input";
import { useState } from "react";

interface DatePickerProps {
  selected: Date | null | undefined;
  onSelect: (date: Date | undefined) => void;
  placeholder?: string;
}

const DatePicker = ({
  selected,
  onSelect,
  placeholder = "Tarih",
}: DatePickerProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // Try to parse common date formats (DD.MM.YYYY or DD/MM/YYYY)
    if (value.length >= 8) {
      try {
        // Remove any non-numeric characters and try to parse
        const cleanValue = value.replace(/[^\d]/g, '');
        if (cleanValue.length === 8) {
          const day = cleanValue.substring(0, 2);
          const month = cleanValue.substring(2, 4);
          const year = cleanValue.substring(4, 8);
          const dateStr = `${day}.${month}.${year}`;
          
          const parsedDate = parse(dateStr, 'dd.MM.yyyy', new Date());
          
          if (!isNaN(parsedDate.getTime())) {
            onSelect(parsedDate);
          }
        }
      } catch (error) {
        // Invalid date format, just continue
      }
    }
  };

  return (
    <Popover>
      <PopoverTrigger className="w-full" asChild>
        <div className="flex w-full">
          <Input
            value={selected ? format(selected, "dd.MM.yyyy") : inputValue}
            onChange={handleInputChange}
            placeholder="GG.AA.YYYY"
            className="w-full"
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          initialFocus
          locale={tr}
          fromYear={1900}
          toYear={new Date().getFullYear()}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
