import ImportantDatesManager from "@/components/ImportantDatesManager";
import { Calendar } from "lucide-react";

export default function ImportantDatesPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="bg-white rounded-lg shadow-sm border-2 border-purple-700 overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 px-6 py-4 text-white">
          <div className="flex items-center">
            <Calendar className="h-6 w-6 mr-2 text-white" />
            <h1 className="text-xl font-medium">Önemli Tarihler</h1>
          </div>
          <p className="text-sm text-blue-100 mt-1">
            Özel günleri ve kutlamaları yönetin
          </p>
        </div>
        <div className="p-6">
          <ImportantDatesManager />
        </div>
      </div>
    </div>
  );
}
