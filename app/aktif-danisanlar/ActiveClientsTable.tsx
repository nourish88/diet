"use client";

import { useState } from "react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { toggleClientOnlineStatus } from "./actions";

type ActiveClient = {
  id: number;
  name: string;
  surname: string;
  isOnline: boolean;
  diets: { createdAt: Date }[];
};

export default function ActiveClientsTable({ initialClients }: { initialClients: ActiveClient[] }) {
  const [clients, setClients] = useState(initialClients);
  const [searchTerm, setSearchTerm] = useState("");

  // Gelişmiş Türkçe karakter duyarlı arama fonksiyonu
  const normalizeForSearch = (text: string) => {
    if (!text) return "";
    return text
      .toLocaleLowerCase('tr-TR')
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") 
      .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, ''); 
  };

  const handleToggle = async (id: number, currentStatus: boolean) => {
    // Optimistic update
    const newStatus = !currentStatus;
    setClients(prev => prev.map(c => c.id === id ? { ...c, isOnline: newStatus } : c));
    
    try {
      await toggleClientOnlineStatus(id, newStatus);
    } catch (error) {
      // Revert on error
      console.error("Durum güncellenirken hata oluştu:", error);
      setClients(prev => prev.map(c => c.id === id ? { ...c, isOnline: currentStatus } : c));
    }
  };

  if (clients.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-800 mb-2">Aktif Danışan Bulunamadı</h3>
        <p className="text-gray-500">Son 21 gün içerisinde diyet yazılan herhangi bir danışan bulunmuyor.</p>
      </div>
    );
  }

  const filteredClients = clients.filter(client => {
    if (!searchTerm) return true;
    const fullName = `${client.name} ${client.surname}`;
    return fullName.toLocaleLowerCase('tr-TR').includes(searchTerm.toLocaleLowerCase('tr-TR')) || 
           normalizeForSearch(fullName).includes(normalizeForSearch(searchTerm));
  });

  return (
    <div className="space-y-4">
      {/* Arama Kutusu */}
      <div className="relative max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <input 
          type="text" 
          placeholder="İsim veya soyisim ile arayın..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 transition-shadow outline-none"
        />
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50/50 border-b border-gray-100">
              <th className="p-5 font-semibold text-sm text-gray-500 tracking-wide uppercase">Danışan Adı Soyadı</th>
              <th className="p-5 font-semibold text-sm text-gray-500 tracking-wide uppercase">Son Diyet Tarihi</th>
              <th className="p-5 font-semibold text-sm text-gray-500 tracking-wide uppercase">Durum (Yüzyüze / Online)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredClients.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">
                  "{searchTerm}" ile eşleşen danışan bulunamadı.
                </td>
              </tr>
            ) : (
              filteredClients.map(client => {
            const lastDietDate = client.diets[0]?.createdAt;
            return (
              <tr key={client.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-100 to-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      {client.name.charAt(0)}{client.surname.charAt(0)}
                    </div>
                    <span className="font-medium text-gray-900 group-hover:text-blue-700 transition-colors">
                      {client.name} {client.surname}
                    </span>
                  </div>
                </td>
                <td className="p-5">
                  {lastDietDate ? (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-100">
                      {format(new Date(lastDietDate), "dd MMMM yyyy", { locale: tr })}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-sm">Bilinmiyor</span>
                  )}
                </td>
                <td className="p-5">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium transition-colors ${!client.isOnline ? 'text-gray-900' : 'text-gray-400'}`}>
                      Yüzyüze
                    </span>
                    
                    {/* Premium Toggle Switch */}
                    <button 
                      onClick={() => handleToggle(client.id, client.isOnline)}
                      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${client.isOnline ? 'bg-blue-600' : 'bg-gray-200'}`}
                      role="switch"
                      aria-checked={client.isOnline}
                    >
                      <span className="sr-only">Toggle Online Status</span>
                      <span 
                        aria-hidden="true" 
                        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${client.isOnline ? 'translate-x-5' : 'translate-x-0'}`} 
                      />
                    </button>

                    <span className={`text-sm font-medium transition-colors ${client.isOnline ? 'text-blue-600' : 'text-gray-400'}`}>
                      Online
                    </span>
                  </div>
                </td>
              </tr>
            );
          })
          )}
        </tbody>
      </table>
    </div>
    </div>
  );
}
