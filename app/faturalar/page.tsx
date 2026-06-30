import { getInvoices } from "./actions";
import Link from "next/link";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import CopyTableButton from "./CopyTableButton";

export default async function FaturalarPage({ searchParams }: { searchParams: Promise<{ clientName?: string; startDate?: string; endDate?: string }> }) {
  const resolvedSearchParams = await searchParams;
  const invoices = await getInvoices({ 
    clientName: resolvedSearchParams?.clientName,
    startDate: resolvedSearchParams?.startDate,
    endDate: resolvedSearchParams?.endDate
  });

  return (
    <div className="p-6 md:px-12 md:py-10 w-full xl:max-w-[98%] mx-auto min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Faturalar</h1>
          <p className="text-sm text-gray-500 mt-1">Tüm fatura kayıtlarınızı buradan görüntüleyebilir ve yönetebilirsiniz.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CopyTableButton invoices={invoices} />
          <Link href="/faturalar/yeni" className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-5 py-2.5 rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-md font-medium transition-all flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
            Yeni Fatura Ekle
          </Link>
        </div>
      </div>

      <form className="mb-6 flex flex-wrap gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 items-center">
        <div className="relative flex-1 min-w-[250px]">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          </div>
          <input 
            type="text" 
            name="clientName" 
            placeholder="Danışan Adı veya Soyadı ile arayın..." 
            defaultValue={resolvedSearchParams?.clientName || ""}
            className="w-full border-0 bg-gray-50 rounded-xl pl-10 pr-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-shadow"
          />
        </div>
        <div className="flex items-center gap-2">
          <input 
            type="date" 
            name="startDate" 
            defaultValue={resolvedSearchParams?.startDate || ""} 
            className="border-0 bg-gray-50 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-shadow text-sm text-gray-700" 
          />
          <span className="text-gray-400 font-medium">-</span>
          <input 
            type="date" 
            name="endDate" 
            defaultValue={resolvedSearchParams?.endDate || ""} 
            className="border-0 bg-gray-50 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-blue-500 transition-shadow text-sm text-gray-700" 
          />
        </div>
        <button type="submit" className="bg-gray-900 text-white px-6 py-2.5 rounded-xl hover:bg-gray-800 font-medium transition-colors">Filtrele</button>
        {(resolvedSearchParams?.clientName || resolvedSearchParams?.startDate || resolvedSearchParams?.endDate) && (
          <Link href="/faturalar" className="bg-red-50 text-red-600 px-6 py-2.5 rounded-xl hover:bg-red-100 font-medium transition-colors">
            Temizle
          </Link>
        )}
      </form>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto w-full">
        <table className="w-full text-left border-collapse whitespace-nowrap text-sm">
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
                  <td className="p-4 font-medium text-gray-900">{inv.client.name} {inv.client.surname}</td>
                  <td className="p-4 text-gray-500">{inv.client.billingInfo?.tcNo || "-"}</td>
                  <td className="p-4 text-gray-500">{inv.client.billingInfo?.city || "-"}</td>
                  <td className="p-4 text-gray-500">{inv.client.billingInfo?.district || "-"}</td>
                  <td className="p-4 max-w-[200px] truncate text-gray-500" title={inv.client.billingInfo?.address || "-"}>{inv.client.billingInfo?.address || "-"}</td>
                  <td className="p-4 text-gray-500">{inv.client.billingInfo?.taxNo || "-"}</td>
                  <td className="p-4"><span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md text-xs font-semibold">{inv.subject}</span></td>
                  <td className="p-4 text-center">{inv.quantity}</td>
                  <td className="p-4 text-gray-500">% {inv.vatRate}</td>
                  <td className="p-4 font-bold text-gray-900">{inv.amountWithVat.toFixed(2)} ₺</td>
                  <td className="p-4 font-semibold text-emerald-600 bg-emerald-50/50 rounded-lg">{inv.amountWithoutVat.toFixed(3)} ₺</td>
                  <td className="p-4">
                    <Link href={`/faturalar/${inv.id}/edit`} className="text-blue-600 hover:text-blue-800 font-medium bg-blue-50 px-3 py-1.5 rounded-lg transition-colors inline-block">Düzenle</Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Özet Alanı (Totals) */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-start border-l-4 border-l-blue-500">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Toplam Fatura Adedi</span>
          <span className="text-4xl font-black text-gray-900">{invoices.length}</span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-start border-l-4 border-l-indigo-500">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Toplam KDV Dahil Tutar</span>
          <span className="text-4xl font-black text-indigo-600">
            {invoices.reduce((sum, inv) => sum + inv.amountWithVat, 0).toFixed(2)} ₺
          </span>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-center items-start border-l-4 border-l-emerald-500">
          <span className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">Toplam KDV Hariç Tutar</span>
          <span className="text-4xl font-black text-emerald-600">
            {invoices.reduce((sum, inv) => sum + inv.amountWithoutVat, 0).toFixed(3)} ₺
          </span>
        </div>
      </div>
    </div>
  );
}
