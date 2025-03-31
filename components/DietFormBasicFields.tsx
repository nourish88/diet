import { Diet } from "@/types/types";
import FormFieldWrapper from "./CustomUI/FormFieldWrapper";
import DatePicker from "./CustomUI/Datepicker";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ReactNode } from "react";

interface DietFormFieldsProps {
  form: any;
  diet: Diet;
  setDiet: (diet: Diet) => void;
  selectedClientId?: number | null;
  onSelectClient?: (clientId: number) => void;
  disabled?: boolean;
}

const DietFormBasicFields = ({ form, diet, setDiet }: DietFormFieldsProps) => {
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
                  onSelect={(newDate) =>
                    setDiet({
                      ...diet,
                      Tarih: newDate ? newDate.toISOString() : null,
                    })
                  }
                  placeholder="Tarih Seçiniz"
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
