import { AlertCircle } from "lucide-react";

interface BannedFood {
  besin: {
    name: string;
  };
  reason?: string;
}

interface ClientWarningsProps {
  illness?: string | null;
  bannedFoods: BannedFood[];
}

const ClientWarnings = ({ illness, bannedFoods }: ClientWarningsProps) => {
  const hasWarnings = illness || (bannedFoods && bannedFoods.length > 0);
  
  if (!hasWarnings) return null;

  return (
    <div className="space-y-4">
      {/* Illness Warning */}
      {illness && (
        <div className="p-4 bg-orange-50 border-l-4 border-orange-400 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-orange-400 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-orange-800">
                Hastalık Bilgisi
              </h4>
              <p className="mt-1 text-sm text-orange-700">{illness}</p>
            </div>
          </div>
        </div>
      )}

      {/* Banned Foods Warning */}
      {bannedFoods?.length > 0 && (
        <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
            <div>
              <h4 className="text-sm font-medium text-yellow-800">
                Yasaklı Besinler
              </h4>
              <ul className="mt-2 text-sm text-yellow-700">
                {bannedFoods.map((food, index) => (
                  <li key={index}>
                    {food.besin.name}
                    {food.reason && (
                      <span className="text-yellow-600"> ({food.reason})</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientWarnings;
