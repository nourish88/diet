"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getClientsForSelect, getClientBillingInfo, createInvoice } from "../actions";
import Link from "next/link";

export default function YeniFaturaPage() {
  const router = useRouter();
  const [clients, setClients] = useState<{id: number, name: string, surname: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form State
  const [clientId, setClientId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [amountWithVat, setAmountWithVat] = useState<string>("");
  
  // Billing Info State
  const [tcNo, setTcNo] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [address, setAddress] = useState("");
  const [taxNo, setTaxNo] = useState("");

  const amountWithoutVat = amountWithVat ? (parseFloat(amountWithVat) / 1.20).toFixed(2) : "0.00";

  useEffect(() => {
    getClientsForSelect().then(setClients);
  }, []);

  const handleClientChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedId = e.target.value;
    setClientId(selectedId);
    
    if (selectedId) {
      const billingInfo = await getClientBillingInfo(Number(selectedId));
      if (billingInfo) {
        setTcNo(billingInfo.tcNo || "");
        setCity(billingInfo.city || "");
        setDistrict(billingInfo.district || "");
        setAddress(billingInfo.address || "");
        setTaxNo(billingInfo.taxNo || "");
      } else {
        setTcNo("");
        setCity("");
        setDistrict("");
        setAddress("");
        setTaxNo("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !amountWithVat) return;
    
    setIsLoading(true);
    try {
      await createInvoice({
        clientId,
        date,
        amountWithVat,
        billingInfo: { tcNo, city, district, address, taxNo }
      });
      router.push("/faturalar");
    } catch (error) {
      console.error("Fatura oluşturulurken hata:", error);
      alert("Bir hata oluştu");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Yeni Fatura Ekle</h1>
        <Link href="/faturalar" className="text-gray-600 hover:underline">Geri Dön</Link>
      </div>

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow space-y-6">
        {/* Danışan Seçimi */}
        <div className="border-b pb-6">
          <h2 className="text-lg font-semibold mb-4">Danışan Bilgileri</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Danışan Seçin *</label>
              <select 
                required
                value={clientId}
                onChange={handleClientChange}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">-- Danışan Seçiniz --</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} {c.surname}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">TC Kimlik No (Opsiyonel)</label>
              <input 
                type="text" 
                value={tcNo}
                onChange={e => setTcNo(e.target.value)}
                className="w-full border rounded px-3 py-2" 
                placeholder="11 Haneli TC Kimlik"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">İl (Opsiyonel)</label>
              <input 
                type="text" 
                value={city}
                onChange={e => setCity(e.target.value)}
                className="w-full border rounded px-3 py-2" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">İlçe (Opsiyonel)</label>
              <input 
                type="text" 
                value={district}
                onChange={e => setDistrict(e.target.value)}
                className="w-full border rounded px-3 py-2" 
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Açık Adres (Opsiyonel)</label>
              <textarea 
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border rounded px-3 py-2 h-20" 
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-1">Vergi No (Opsiyonel Kurumsal İçin)</label>
              <input 
                type="text" 
                value={taxNo}
                onChange={e => setTaxNo(e.target.value)}
                className="w-full border rounded px-3 py-2" 
              />
            </div>
          </div>
        </div>

        {/* Fatura Detayları */}
        <div>
          <h2 className="text-lg font-semibold mb-4">Fatura Detayları</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Fatura Tarihi *</label>
              <input 
                type="date" 
                required
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full border rounded px-3 py-2" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Konu</label>
              <input 
                type="text" 
                readOnly
                value="Diyet"
                className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-500" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Adet</label>
              <input 
                type="number" 
                readOnly
                value="1"
                className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">KDV Oranı</label>
              <input 
                type="text" 
                readOnly
                value="% 20"
                className="w-full border rounded px-3 py-2 bg-gray-50 text-gray-500" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">KDV Dahil Tutar (TL) *</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={amountWithVat}
                onChange={e => setAmountWithVat(e.target.value)}
                className="w-full border rounded px-3 py-2" 
                placeholder="Örn: 1200.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Hesaplanan KDV Hariç Tutar (TL)</label>
              <input 
                type="text" 
                readOnly
                value={amountWithoutVat}
                className="w-full border rounded px-3 py-2 bg-yellow-50 text-yellow-800 font-semibold" 
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4 border-t">
          <button 
            type="submit" 
            disabled={isLoading}
            className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? "Kaydediliyor..." : "Faturayı Kaydet"}
          </button>
        </div>
      </form>
    </div>
  );
}
