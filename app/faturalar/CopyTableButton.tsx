"use client";

import { useState } from "react";

export default function CopyTableButton({ invoices }: { invoices: any[] }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    const header = ["Tarih", "Danışan", "TC No", "İl", "İlçe", "Açık Adres", "Vergi No", "Konu", "Adet", "KDV Oranı", "KDV Dahil Tutar (TL)", "KDV Hariç Tutar (TL)"].join("\t");
    const rows = invoices.map(inv => {
      const date = new Date(inv.date).toLocaleDateString("tr-TR");
      const clientName = `${inv.client.name} ${inv.client.surname}`;
      const tcNo = inv.client.billingInfo?.tcNo || "-";
      const city = inv.client.billingInfo?.city || "-";
      const district = inv.client.billingInfo?.district || "-";
      const address = (inv.client.billingInfo?.address || "-").replace(/\n/g, " ");
      const taxNo = inv.client.billingInfo?.taxNo || "-";
      const subject = inv.subject;
      const quantity = inv.quantity;
      const vatRate = `% ${inv.vatRate}`;
      const withVat = inv.amountWithVat.toFixed(2);
      const withoutVat = inv.amountWithoutVat.toFixed(3);
      return [date, clientName, tcNo, city, district, address, taxNo, subject, quantity, vatRate, withVat, withoutVat].join("\t");
    });
    
    const text = [header, ...rows].join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button 
      onClick={handleCopy} 
      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors flex items-center gap-2"
    >
      {copied ? (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
          Kopyalandı
        </>
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
          Tabloyu Kopyala
        </>
      )}
    </button>
  );
}
