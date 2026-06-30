import { getInvoices } from "./actions";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import CopyTableButton from "./CopyTableButton";

export default async function FaturalarPage({ searchParams }: { searchParams: Promise<{ clientName?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const invoices = await getInvoices({ clientName: resolvedSearchParams?.clientName });

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Faturalar</h1>
        <div className="flex gap-3">
          <CopyTableButton invoices={invoices} />
          <Link href="/faturalar/yeni" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 flex items-center">
            Yeni Fatura Ekle
          </Link>
        </div>
      </div>

      <form className="mb-6 flex gap-4">
        <input 
          type="text" 
          name="clientName" 
          placeholder="Danışan Adı Soyadı Ara..." 
          defaultValue={resolvedSearchParams?.clientName || ""}
          className="border rounded px-3 py-2 w-full max-w-sm"
        />
        <button type="submit" className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300">Ara</button>
        {resolvedSearchParams?.clientName && (
          <Link href="/faturalar" className="bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200">
            Temizle
          </Link>
        )}
      </form>

      <div className="bg-white rounded shadow overflow-x-auto">
        <table className="w-full text-left border-collapse whitespace-nowrap">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-semibold text-sm text-gray-600">Tarih</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Danışan</th>
              <th className="p-4 font-semibold text-sm text-gray-600">TC No</th>
              <th className="p-4 font-semibold text-sm text-gray-600">İl</th>
              <th className="p-4 font-semibold text-sm text-gray-600">İlçe</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Açık Adres</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Vergi No</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Konu</th>
              <th className="p-4 font-semibold text-sm text-gray-600">Adet</th>
              <th className="p-4 font-semibold text-sm text-gray-600">KDV Oranı</th>
              <th className="p-4 font-semibold text-sm text-gray-600">KDV Dahil Tutar</th>
              <th className="p-4 font-semibold text-sm text-gray-600">KDV Hariç Tutar</th>
              <th className="p-4 font-semibold text-sm text-gray-600">İşlemler</th>
            </tr>
          </thead>
          <tbody>
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={13} className="p-4 text-center text-gray-500">Fatura bulunamadı.</td>
              </tr>
            ) : (
              invoices.map(inv => (
                <tr key={inv.id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{format(inv.date, "dd MMM yyyy", { locale: tr })}</td>
                  <td className="p-4">{inv.client.name} {inv.client.surname}</td>
                  <td className="p-4">{inv.client.billingInfo?.tcNo || "-"}</td>
                  <td className="p-4">{inv.client.billingInfo?.city || "-"}</td>
                  <td className="p-4">{inv.client.billingInfo?.district || "-"}</td>
                  <td className="p-4 max-w-xs truncate" title={inv.client.billingInfo?.address || "-"}>{inv.client.billingInfo?.address || "-"}</td>
                  <td className="p-4">{inv.client.billingInfo?.taxNo || "-"}</td>
                  <td className="p-4">{inv.subject}</td>
                  <td className="p-4">{inv.quantity}</td>
                  <td className="p-4">% {inv.vatRate}</td>
                  <td className="p-4">{inv.amountWithVat.toFixed(2)} TL</td>
                  <td className="p-4">{inv.amountWithoutVat.toFixed(2)} TL</td>
                  <td className="p-4">
                    <Link href={`/faturalar/${inv.id}/edit`} className="text-blue-600 hover:underline">Düzenle</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
