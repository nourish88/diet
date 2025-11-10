"use client";
import { Diet } from "@/types/types";
import FormFieldWrapper from "./FormFieldWrapper";
import DatePicker from "./CustomUI/Datepicker";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { differenceInDays } from "date-fns";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import DefinitionService, { Definition } from "@/services/DefinitionService";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createClient } from "@/lib/supabase-browser";
import { EmojiPickerButton } from "@/components/ui/EmojiPickerButton";

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
  setDiet: (diet: Diet | ((prevDiet: Diet) => Diet)) => void;
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
  // Add console.log to debug incoming props
  console.log("DietFormBasicFields received diet:", diet);

  const supabase = createClient();
  const [showBirthdayCelebration, setShowBirthdayCelebration] = useState(false);
  const [importantDate, setImportantDate] = useState<ImportantDate | null>(
    null
  );
  const [suDefinitions, setSuDefinitions] = useState<Definition[]>([]);
  const [fizikDefinitions, setFizikDefinitions] = useState<Definition[]>([]);
  const [showCustomSu, setShowCustomSu] = useState(false);
  const [showCustomFizik, setShowCustomFizik] = useState(false);

  // Function to save custom input as a definition
  const saveCustomDefinition = async (
    type: "su_tuketimi" | "fiziksel_aktivite",
    name: string
  ) => {
    if (!name.trim()) return;

    try {
      const newDef = await DefinitionService.createDefinition(
        type,
        name.trim()
      );

      // Update local state
      if (type === "su_tuketimi") {
        setSuDefinitions((prev) => [newDef, ...prev]);
      } else {
        setFizikDefinitions((prev) => [newDef, ...prev]);
      }

      console.log(`✅ Tanımlama eklendi: ${name}`);
    } catch (error) {
      console.error("Error saving custom definition:", error);
      // Don't show error to user, fail silently
    }
  };

  // Load definitions on mount
  useEffect(() => {
    const loadDefinitions = async () => {
      try {
        const [suDefs, fizikDefs] = await Promise.all([
          DefinitionService.getDefinitions("su_tuketimi"),
          DefinitionService.getDefinitions("fiziksel_aktivite"),
        ]);
        // Ensure we always have arrays
        setSuDefinitions(Array.isArray(suDefs) ? suDefs : []);
        setFizikDefinitions(Array.isArray(fizikDefs) ? fizikDefs : []);
      } catch (error) {
        console.error("Error loading definitions:", error);
        // Set empty arrays on error
        setSuDefinitions([]);
        setFizikDefinitions([]);
      }
    };
    loadDefinitions();
  }, []);

  useEffect(() => {
    const checkImportantDates = async () => {
      if (!diet.Tarih) return;

      const dietDate = new Date(diet.Tarih);

      try {
        // Get authentication token
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) return;
        
        const response = await fetch("/api/important-dates", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
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
    const checkBirthday = async () => {
      if (!selectedClientId) return;
      
      try {
        // Get authentication token
        const {
          data: { session },
        } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        if (!token) return;
        
        const response = await fetch(`/api/clients/${selectedClientId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const data = await response.json();
        
        // Here, data is the unwrapped client object
        console.log(data, "data");

        // Access the client object directly
        const client = data;
        console.log(client, "client");

        // Now you can correctly access the birthdate
        console.log(client.birthdate, "client.birthdate");
        console.log(diet.Tarih, "diet.Tarih");

        const birthdate = new Date(client.birthdate);
        console.log(birthdate, "birthdate");
        const dietDate = diet.Tarih ? new Date(diet.Tarih) : null;

        setShowBirthdayCelebration(isWithinBirthdayRange(birthdate, dietDate));
      } catch (error) {
        console.error("Error checking birthday:", error);
      }
    };

    checkBirthday();
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
    "w-full h-10 border border-gray-300 rounded-md shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3";

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

      <div className="p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-5">
            <FormFieldWrapper form={form} name="dietDate" label="Diyet Tarihi">
              <div className="w-full">
                <DatePicker
                  selected={diet.Tarih ? new Date(diet.Tarih) : null}
                  onChange={(date: Date | null) => {
                    const newTarih = date ? date.toISOString() : null;
                    setDiet((prevDiet) => ({
                      ...prevDiet,
                      Tarih: newTarih,
                    }));
                  }}
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
                <div className="space-y-2">
                  {!showCustomSu ? (
                    <Select
                      value={diet.Su || ""}
                      onValueChange={(value) => {
                        if (value === "__custom__") {
                          setShowCustomSu(true);
                          setDiet((prevDiet) => ({ ...prevDiet, Su: "" }));
                        } else {
                          setDiet((prevDiet) => ({ ...prevDiet, Su: value }));
                        }
                      }}
                    >
                      <SelectTrigger className={inputBaseClass}>
                        <SelectValue placeholder="Seçiniz..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suDefinitions.map((def) => (
                          <SelectItem key={def.id} value={def.name}>
                            {def.name}
                          </SelectItem>
                        ))}
                        <SelectItem value="__custom__">
                          ✏️ Özel giriş yap
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex gap-2">
                      <Input
                        value={diet.Su || ""}
                        className={inputBaseClass}
                        placeholder="Özel su tüketimi girin..."
                        onChange={(e) => {
                          setDiet((prevDiet) => ({
                            ...prevDiet,
                            Su: e.target.value,
                          }));
                        }}
                        onBlur={async () => {
                          // Save as definition when user leaves input
                          if (diet.Su && diet.Su.trim()) {
                            await saveCustomDefinition("su_tuketimi", diet.Su);
                            setShowCustomSu(false);
                          }
                        }}
                        onKeyDown={async (e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            // Save as definition when Enter is pressed
                            if (diet.Su && diet.Su.trim()) {
                              await saveCustomDefinition(
                                "su_tuketimi",
                                diet.Su
                              );
                              setShowCustomSu(false);
                            }
                          } else if (e.key === "Escape") {
                            setShowCustomSu(false);
                          }
                        }}
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowCustomSu(false);
                        }}
                        className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                        title="İptal (Esc)"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}
            />

          </div>

          {/* Right Column */}
          <div className="space-y-5">
            <FormFieldWrapper
              form={form}
              name="haftalikSonuc"
              label="Haftalık Sonuç"
              renderField={(field) => (
                <div className="flex items-center gap-2">
                  <Input
                    value={diet.Sonuc || ""}
                    className={inputBaseClass + " flex-1"}
                    placeholder="Haftalık sonuç notları"
                    onChange={(e) => {
                      setDiet((prevDiet) => ({
                        ...prevDiet,
                        Sonuc: e.target.value,
                      }));
                    }}
                  />
                  <div className="flex-shrink-0 self-center">
                    <EmojiPickerButton
                      onEmojiSelect={(emoji) => {
                        const newValue = (diet.Sonuc || "") + emoji;
                        setDiet((prevDiet) => ({
                          ...prevDiet,
                          Sonuc: newValue,
                        }));
                      }}
                    />
                  </div>
                </div>
              )}
            />

            <FormFieldWrapper
              form={form}
              name="haftalikHedef"
              label="Haftalık Hedef"
              renderField={(field) => (
                <Input
                  value={diet.Hedef || ""}
                  className={inputBaseClass}
                  placeholder="Haftalık hedef notları"
                  onChange={(e) => {
                    setDiet((prevDiet) => ({
                      ...prevDiet,
                      Hedef: e.target.value,
                    }));
                  }}
                />
              )}
            />

            <FormFieldWrapper
              form={form}
              name="diyetisyenNotu"
              label="Diyetisyen Notu"
              renderField={(field) => (
                <div className="flex items-center gap-2">
                  <Input
                    value={diet.dietitianNote || ""}
                    className={inputBaseClass + " flex-1"}
                    placeholder="Diyetisyen notu..."
                    onChange={(e) => {
                      setDiet((prevDiet) => ({
                        ...prevDiet,
                        dietitianNote: e.target.value,
                      }));
                    }}
                  />
                  <div className="flex-shrink-0 self-center">
                    <EmojiPickerButton
                      onEmojiSelect={(emoji) => {
                        const newValue = (diet.dietitianNote || "") + emoji;
                        setDiet((prevDiet) => ({
                          ...prevDiet,
                          dietitianNote: newValue,
                        }));
                      }}
                    />
                  </div>
                </div>
              )}
            />
          </div>
        </div>

        {/* Fiziksel Aktivite - Full Width Below */}
        <div className="mt-5">
          <FormFieldWrapper
            form={form}
            name="fizikselAktivite"
            label="Fiziki Aktivite"
            renderField={(field) => (
              <div className="space-y-2">
                {!showCustomFizik ? (
                  <Select
                    value={diet.Fizik || ""}
                    onValueChange={(value) => {
                      if (value === "__custom__") {
                        setShowCustomFizik(true);
                        setDiet((prevDiet) => ({ ...prevDiet, Fizik: "" }));
                      } else {
                        setDiet((prevDiet) => ({
                          ...prevDiet,
                          Fizik: value,
                        }));
                      }
                    }}
                  >
                    <SelectTrigger className={inputBaseClass}>
                      <SelectValue placeholder="Seçiniz..." />
                    </SelectTrigger>
                    <SelectContent>
                      {fizikDefinitions.map((def) => (
                        <SelectItem key={def.id} value={def.name}>
                          {def.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="__custom__">
                        ✏️ Özel giriş yap
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex gap-2">
                    <Input
                      value={diet.Fizik || ""}
                      className={inputBaseClass}
                      placeholder="Özel fiziksel aktivite girin..."
                      onChange={(e) => {
                        setDiet((prevDiet) => ({
                          ...prevDiet,
                          Fizik: e.target.value,
                        }));
                      }}
                      onBlur={async () => {
                        // Save as definition when user leaves input
                        if (diet.Fizik && diet.Fizik.trim()) {
                          await saveCustomDefinition(
                            "fiziksel_aktivite",
                            diet.Fizik
                          );
                          setShowCustomFizik(false);
                        }
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          // Save as definition when Enter is pressed
                          if (diet.Fizik && diet.Fizik.trim()) {
                            await saveCustomDefinition(
                              "fiziksel_aktivite",
                              diet.Fizik
                            );
                            setShowCustomFizik(false);
                          }
                        } else if (e.key === "Escape") {
                          setShowCustomFizik(false);
                        }
                      }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomFizik(false);
                      }}
                      className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
                      title="İptal (Esc)"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          />
        </div>

        {/* Birthday and Important Date Celebrations - Full Width Below */}
        {showBirthdayCelebration && (
          <div className="mt-5 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-700 mb-2">
              Danışanın doğum günü yaklaşıyor! Kutlama eklemek ister
              misiniz?
            </p>
            <RadioGroup
              value={boolToRadioValue(diet.isBirthdayCelebration)}
              onValueChange={(value) =>
                setDiet((prevDiet) => ({
                  ...prevDiet,
                  isBirthdayCelebration: radioValueToBool(value),
                }))
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

        {importantDate && (
          <div className="mt-5 p-4 bg-amber-50 rounded-lg border border-amber-200">
            <p className="text-sm text-amber-700 mb-2">
              {importantDate.name} zamanı! Kutlama eklemek ister misiniz?
            </p>
            <p className="text-xs text-amber-600 mb-3 italic">
              {importantDate.message}
            </p>
            <RadioGroup
              value={boolToRadioValue(diet.isImportantDateCelebrated)}
              onValueChange={(value) =>
                setDiet((prevDiet) => ({
                  ...prevDiet,
                  isImportantDateCelebrated: radioValueToBool(value),
                  importantDateId: radioValueToBool(value)
                    ? importantDate.id
                    : null,
                  importantDateName: radioValueToBool(value)
                    ? importantDate.name
                    : null,
                }))
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
    </div>
  );
};

export default DietFormBasicFields;
