import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { tr } from "date-fns/locale/tr";

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
  return (
    <Popover>
      <PopoverTrigger className="w-full text-left" asChild>
        <span>
          {selected ? (
            format(selected, "PPP", { locale: tr })
          ) : (
            <span className="text-gray-500">{placeholder}</span>
          )}
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={onSelect}
          initialFocus
          locale={tr}
        />
      </PopoverContent>
    </Popover>
  );
};

export default DatePicker;
