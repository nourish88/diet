import { AlertCircle } from "lucide-react";

interface BannedFood {
  besin: {
    name: string;
  };
  reason?: string;
}

interface BannedFoodsWarningProps {
  bannedFoods: BannedFood[];
}

const BannedFoodsWarning = ({ bannedFoods }: BannedFoodsWarningProps) => {
  if (!bannedFoods?.length) return null;

  return (
    <div className="mb-4 p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-md">
      <div className="flex">
        <AlertCircle className="h-5 w-5 text-yellow-400 mr-2" />
        <div>
          <h4 className="text-sm font-medium text-yellow-800">
            Danışan için Yasaklı Besinler
          </h4>
          <ul className="mt-2 text-sm text-yellow-700">
            {bannedFoods.map((food, index) => (
              <li key={index}>
                {food.besin.name}
                {food.reason && <span className="text-yellow-600"> ({food.reason})</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BannedFoodsWarning;