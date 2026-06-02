import { Diet } from "@/types/types";

interface DietProgressIndicatorProps {
  diet: Diet;
}

const getFoodName = (besin: Diet["Oguns"][number]["items"][number]["besin"]) =>
  typeof besin === "string" ? besin : besin?.name;

export function DietProgressIndicator({ diet }: DietProgressIndicatorProps) {
  const totalMeals = diet.Oguns.length;
  const filledMeals = diet.Oguns.filter((meal) =>
    meal.items.some((item) => {
      const besin = getFoodName(item.besin);
      return besin && besin.trim();
    })
  ).length;
  const progressPercent =
    totalMeals > 0 ? Math.round((filledMeals / totalMeals) * 100) : 0;

  if (totalMeals === 0) {
    return null;
  }

  return (
    <div className="no-print space-y-1">
      <div className="flex justify-between items-center text-xs text-muted-foreground">
        <span>
          Dolu öğün:{" "}
          <span className="font-semibold text-foreground">
            {filledMeals}/{totalMeals}
          </span>
        </span>
        <span
          className={progressPercent === 100 ? "text-success font-semibold" : ""}
        >
          {progressPercent}%
          {progressPercent === 100 && " ✓ Tüm öğünler dolu"}
        </span>
      </div>
      <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
        <div
          className="h-1.5 rounded-full transition-all duration-300"
          style={{
            width: `${progressPercent}%`,
            backgroundColor:
              progressPercent === 100
                ? "#16a34a"
                : progressPercent > 50
                ? "#3b82f6"
                : "#f59e0b",
          }}
        />
      </div>
    </div>
  );
}
