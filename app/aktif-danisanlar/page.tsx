import { getActiveClients } from "./actions";
import ActiveClientsTable from "./ActiveClientsTable";

export default async function AktifDanisanlarPage() {
  const clients = await getActiveClients();

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto min-h-screen">
      <div className="mb-8 bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Aktif Danışanlar</h1>
          <p className="mt-2 text-sm text-gray-500 max-w-2xl">
            Son 21 gün içerisinde beslenme programı yazılan danışanlarınız otomatik olarak bu listede görünür.
            Danışanlarınızın seans türünü (Yüzyüze veya Online) bu ekran üzerinden hızlıca belirleyebilirsiniz.
          </p>
        </div>
        <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-xl border border-blue-100 text-sm font-medium flex items-center gap-2 whitespace-nowrap">
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-blue-500"></span>
          </span>
          Toplam {clients.length} Aktif Danışan
        </div>
      </div>

      <ActiveClientsTable initialClients={clients} />
    </div>
  );
}
