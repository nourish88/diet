"use client";
import { Diet } from "@/types/types";
import FormFieldWrapper from "./CustomUI/FormFieldWrapper";
import DatePicker from "./CustomUI/Datepicker";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { differenceInDays } from "date-fns";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

interface ImportantDate {
  id: number;
  name: string;
  message: string;
  startDate: Date;
  endDate: Date;
}

const isWithinBirthdayRange = (
  birthdate: Date | null,
  dietDate: Date | null
) => {
  if (!birthdate || !dietDate) return false;
  const thisYearBirthday = new Date(
    dietDate.getFullYear(),
    birthdate.getMonth(),
    birthdate.getDate()
  );
  const daysDifference = Math.abs(differenceInDays(dietDate, thisYearBirthday));
  console.log(daysDifference);
  return daysDifference <= 10;
};

const isWithinImportantDateRange = (
  importantDate: ImportantDate,
  dietDate: Date
) => {
  const start = new Date(importantDate.startDate);
  const end = new Date(importantDate.endDate);

  return dietDate >= start && dietDate <= end;
};

interface DietFormFieldsProps {
  form: any;
  diet: Diet;
  setDiet: (diet: Diet) => void;
  selectedClientId?: number | null;
  onSelectClient?: (clientId: number) => void;
  disabled?: boolean;
}

const DietFormBasicFields = ({
  form,
  diet,
  setDiet,
  selectedClientId,
  onSelectClient,
  disabled,
}: DietFormFieldsProps) => {
  const [showBirthdayCelebration, setShowBirthdayCelebration] = useState(false);
  const [importantDate, setImportantDate] = useState<ImportantDate | null>(
    null
  );

  useEffect(() => {
    const checkImportantDates = async () => {
      if (!diet.Tarih) return;

      const dietDate = new Date(diet.Tarih);

      try {
        const response = await fetch("/api/important-dates");
        if (!response.ok) throw new Error("Failed to fetch important dates");

        const importantDates: ImportantDate[] = await response.json();

        const matchingDate = importantDates.find((date) =>
          isWithinImportantDateRange(date, dietDate)
        );

        setImportantDate(matchingDate || null);
      } catch (error) {
        console.error("Error checking important dates:", error);
      }
    };

    // Check for birthday
    if (selectedClientId) {
      fetch(`/api/clients/${selectedClientId}`)
        .then((res) => res.json())
        .then((data) => {
          // Here, data is the entire response object with the client property
          console.log(data, "data");

          // Access the client object inside the response
          const client = data.client;
          console.log(client, "client");

          // Now you can correctly access the birthdate
          console.log(client.birthdate, "client.birthdate");
          console.log(diet.Tarih, "diet.Tarih");

          const birthdate = new Date(client.birthdate);
          console.log(birthdate, "birthdate");
          const dietDate = diet.Tarih ? new Date(diet.Tarih) : null;

          setShowBirthdayCelebration(
            isWithinBirthdayRange(birthdate, dietDate)
          );
        });
    }

    // Check for important dates
    checkImportantDates();
  }, [selectedClientId, diet.Tarih]);

  // Helper function to convert boolean to radio value
  const boolToRadioValue = (value: boolean | undefined): "yes" | "no" => {
    return value === true ? "yes" : "no";
  };

  // Helper function to convert radio value to boolean
  const radioValueToBool = (value: string): boolean => {
    return value === "yes";
  };

  const inputBaseClass =
    "w-full h-10 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500";

  return (
    <div
      className="rounded-lg border-2 border-purple-700 bg-white shadow-sm overflow-hidden"
      style={{
        boxShadow:
          "0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.08)",
      }}
    >
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 border-b border-indigo-800 text-white">
        <h3 className="text-lg font-medium">Diyet Bilgileri</h3>
        <p className="text-sm text-blue-100 mt-1">
          Lütfen beslenme programı için gereken bilgileri doldurunuz
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-4">
            <FormFieldWrapper form={form} name="dietDate" label="Diyet Tarihi">
              <div className="w-full">
                <DatePicker
                  selected={diet.Tarih ? new Date(diet.Tarih) : null}
                  onChange={(date: Date | null) =>
                    setDiet({
                      ...diet,
                      Tarih: date ? date.toISOString() : null,
                    })
                  }
                  placeholder="Tarih Seçiniz"
                  dateFormat="dd.MM.yyyy"
                  className="w-full"
                />
              </div>
            </FormFieldWrapper>

            <FormFieldWrapper
              form={form}
              name="suTuketimi"
              label="Su Tüketimi"
              renderField={(field) => (
                <Input
                  value={diet.Su}
                  className={inputBaseClass}
                  placeholder="Örn: 2-3 litre"
                  onChange={(e) => setDiet({ ...diet, Su: e.target.value })}
                />
              )}
            />

            {/* Moved Fiziksel Aktivite here with full width */}
            <div className="md:col-span-2">
              <FormFieldWrapper
                form={form}
                name="fizikselAktivite"
                label="Fiziki Aktivite   "
                renderField={(field) => (
                  <Input
                    value={diet.Fizik}
                    className={inputBaseClass}
                    placeholder="Örn: Günde 30dk yürüyüş, haftada 3 gün pilates..."
                    onChange={(e) =>
                      setDiet({ ...diet, Fizik: e.target.value })
                    }
                  />
                )}
              />
            </div>

            {/* Birthday celebration option */}
            {showBirthdayCelebration && (
              <div className="mt-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
                <p className="text-sm text-purple-700 mb-2">
                  Danışanın doğum günü yaklaşıyor! Kutlama eklemek ister
                  misiniz?
                </p>
                <RadioGroup
                  value={boolToRadioValue(diet.isBirthdayCelebration)}
                  onValueChange={(value) =>
                    setDiet({
                      ...diet,
                      isBirthdayCelebration: radioValueToBool(value),
                    })
                  }
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="yes" id="celebration-yes" />
                    <Label htmlFor="celebration-yes">Evet</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="no" id="celebration-no" />
                    <Label htmlFor="celebration-no">Hayır</Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Important date celebration option */}
            {importantDate && (
              <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                <p className="text-sm text-amber-700 mb-2">
                  {importantDate.name} zamanı! Kutlama eklemek ister misiniz?
                </p>
                <p className="text-xs text-amber-600 mb-3 italic">
                  {importantDate.message}
                </p>
                <RadioGroup
                  value={boolToRadioValue(diet.isImportantDateCelebrated)}
                  onValueChange={(value) =>
                    setDiet({
                      ...diet,
                      isImportantDateCelebrated: radioValueToBool(value),
                      importantDateId: radioValueToBool(value)
                        ? importantDate.id
                        : null,
                      importantDateName: radioValueToBool(value)
                        ? importantDate.name
                        : null,
                    })
                  }
                  disabled={disabled}
                >
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="yes" id="important-date-yes" />
                    <Label
                      htmlFor="important-date-yes"
                      className="cursor-pointer"
                    >
                      Evet
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 cursor-pointer">
                    <RadioGroupItem value="no" id="important-date-no" />
                    <Label
                      htmlFor="important-date-no"
                      className="cursor-pointer"
                    >
                      Hayır
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4">
            <FormFieldWrapper
              form={form}
              name="haftalikSonuc"
              label="Haftalık Sonuç"
              renderField={(field) => (
                <Input
                  value={diet.Sonuc}
                  className={inputBaseClass}
                  placeholder="Haftalık sonuç notları"
                  onChange={(e) => setDiet({ ...diet, Sonuc: e.target.value })}
                />
              )}
            />

            <FormFieldWrapper
              form={form}
              name="haftalikHedef"
              label="Haftalık Hedef"
              renderField={(field) => (
                <Input
                  value={diet.Hedef}
                  className={inputBaseClass}
                  placeholder="Haftalık hedef notları"
                  onChange={(e) => setDiet({ ...diet, Hedef: e.target.value })}
                />
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default DietFormBasicFields;
