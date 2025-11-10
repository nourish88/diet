"use client";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { format, subDays, subMonths, startOfDay, endOfDay } from "date-fns";
import { tr } from "date-fns/locale/tr";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

interface DateRangePickerProps {
  dateFrom: Date | null;
  dateTo: Date | null;
  onDateChange: (dateFrom: Date | null, dateTo: Date | null) => void;
}

export default function DateRangePicker({
  dateFrom,
  dateTo,
  onDateChange,
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleQuickSelect = (days: number) => {
    const to = endOfDay(new Date());
    const from = startOfDay(subDays(new Date(), days));
    onDateChange(from, to);
    setIsOpen(false);
  };

  const handleLastMonth = () => {
    const to = endOfDay(new Date());
    const from = startOfDay(subMonths(new Date(), 1));
    onDateChange(from, to);
    setIsOpen(false);
  };

  const handleAllTime = () => {
    onDateChange(null, null);
    setIsOpen(false);
  };

  return (
    <div className="flex items-center space-x-2">
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="w-full md:w-auto justify-start text-left font-normal"
          >
            <CalendarDays className="mr-2 h-4 w-4" />
            {dateFrom && dateTo ? (
              <>
                {format(dateFrom, "d MMM yyyy", { locale: tr })} -{" "}
                {format(dateTo, "d MMM yyyy", { locale: tr })}
              </>
            ) : (
              <span>Tarih Aralığı Seç</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <div className="p-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm font-medium">Hızlı Seçim</p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(7)}
                >
                  Son 7 Gün
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(30)}
                >
                  Son 30 Gün
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickSelect(90)}
                >
                  Son 90 Gün
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLastMonth}
                >
                  Son Ay
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAllTime}
                  className="col-span-2"
                >
                  Tüm Zamanlar
                </Button>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm font-medium mb-2">Özel Tarih Aralığı</p>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">
                    Başlangıç
                  </label>
                  <Calendar
                    mode="single"
                    selected={dateFrom || undefined}
                    onSelect={(date) => {
                      if (date) {
                        onDateChange(startOfDay(date), dateTo);
                      }
                    }}
                    locale={tr}
                    className="rounded-md border"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-2 block">Bitiş</label>
                  <Calendar
                    mode="single"
                    selected={dateTo || undefined}
                    onSelect={(date) => {
                      if (date) {
                        onDateChange(dateFrom, endOfDay(date));
                      }
                    }}
                    locale={tr}
                    className="rounded-md border"
                  />
                </div>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

