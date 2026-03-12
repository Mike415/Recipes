import { useRecipes } from "@/hooks/useRecipes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useHashLocation } from "@/hooks/useHashLocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ArrowLeft, Download, Trash2 } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const SLOTS = ["lunch", "dinner"] as const;

export default function MealPlan() {
  const { recipes, loading } = useRecipes();
  const [, setLocation] = useHashLocation();

  // Use localStorage for meal plan
  const [mealPlan, setMealPlan] = useLocalStorage<Record<string, Record<string, string | null>>>(
    "recipes_meal_plan",
    {}
  );

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday;
  });

  const weekKey = weekStart.toISOString().split("T")[0];

  // Initialize week if not exists
  const weekPlan = useMemo(() => {
    if (!mealPlan[weekKey]) {
      const newWeek: Record<string, string | null> = {};
      DAYS.forEach((day) => {
        SLOTS.forEach((slot) => {
          newWeek[`${day}-${slot}`] = null;
        });
      });
      return newWeek;
    }
    return mealPlan[weekKey];
  }, [mealPlan, weekKey]);

  const handleAssignRecipe = (day: string, slot: typeof SLOTS[number], recipeId: string) => {
    setMealPlan((prev) => ({
      ...prev,
      [weekKey]: {
        ...weekPlan,
        [`${day}-${slot}`]: recipeId,
      },
    }));
    toast.success("Recipe added to meal plan!");
  };

  const handleRemoveRecipe = (day: string, slot: typeof SLOTS[number]) => {
    setMealPlan((prev) => ({
      ...prev,
      [weekKey]: {
        ...weekPlan,
        [`${day}-${slot}`]: null,
      },
    }));
    toast.success("Recipe removed from meal plan");
  };

  // Generate shopping list
  const shoppingList = useMemo(() => {
    const ingredients: Record<string, { amount: number; unit: string }> = {};

    DAYS.forEach((day) => {
      SLOTS.forEach((slot) => {
        const recipeId = weekPlan[`${day}-${slot}`];
        if (recipeId) {
          const recipe = recipes.find((r) => r.id === recipeId);
          if (recipe) {
            recipe.ingredients.forEach((ing) => {
              const key = ing.item.toLowerCase();
              if (ingredients[key]) {
                if (ingredients[key].unit === ing.unit) {
                  ingredients[key].amount += parseFloat(ing.amount) || 1;
                } else {
                  ingredients[key].amount += parseFloat(ing.amount) || 1;
                }
              } else {
                ingredients[key] = {
                  amount: parseFloat(ing.amount) || 1,
                  unit: ing.unit,
                };
              }
            });
          }
        }
      });
    });

    return ingredients;
  }, [weekPlan, recipes]);

  const downloadShoppingList = () => {
    const list = Object.entries(shoppingList)
      .map(([item, { amount, unit }]) => `${amount} ${unit} ${item}`)
      .join("\n");

    const element = document.createElement("a");
    element.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(list));
    element.setAttribute("download", "shopping-list.txt");
    element.style.display = "none";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success("Shopping list downloaded!");
  };

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96 mb-8" />
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl">
      <Button
        onClick={() => setLocation("/")}
        variant="ghost"
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to recipes
      </Button>

      <h1 className="font-heading text-4xl font-bold mb-8 text-foreground">
        📅 Weekly Meal Plan
      </h1>

      <div className="flex items-center justify-between mb-8">
        <Button
          onClick={() => {
            const prev = new Date(weekStart);
            prev.setDate(prev.getDate() - 7);
            setWeekStart(prev);
          }}
          variant="outline"
        >
          ← Previous Week
        </Button>
        <span className="font-semibold">
          {weekStart.toLocaleDateString()} - {new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString()}
        </span>
        <Button
          onClick={() => {
            const next = new Date(weekStart);
            next.setDate(next.getDate() + 7);
            setWeekStart(next);
          }}
          variant="outline"
        >
          Next Week →
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {DAYS.map((day) => (
          <Card key={day} className="border-memphis-peach/30">
            <CardHeader>
              <CardTitle className="text-lg">{day}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {SLOTS.map((slot) => {
                const recipeId = weekPlan[`${day}-${slot}`];
                const recipe = recipes.find((r) => r.id === recipeId);

                return (
                  <div key={slot} className="space-y-2">
                    <label className="font-semibold text-sm capitalize">
                      {slot}
                    </label>
                    {recipe ? (
                      <div className="bg-memphis-mint/10 p-3 rounded-lg">
                        <p className="font-semibold text-sm">{recipe.title}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleRemoveRecipe(day, slot)}
                          className="mt-2 w-full text-xs"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Remove
                        </Button>
                      </div>
                    ) : (
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            handleAssignRecipe(day, slot, e.target.value);
                            e.target.value = "";
                          }
                        }}
                        className="w-full px-2 py-1 border border-border rounded text-sm"
                      >
                        <option value="">Select recipe...</option>
                        {recipes.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-memphis-coral/30">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🛒</span>
              Shopping List
            </CardTitle>
            <Button
              onClick={downloadShoppingList}
              className="bg-memphis-coral hover:bg-memphis-coral/80"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {Object.keys(shoppingList).length === 0 ? (
            <Empty className="border-dashed border-memphis-peach">
              <EmptyHeader>
                <EmptyMedia variant="icon">📋</EmptyMedia>
                <EmptyTitle>No recipes planned</EmptyTitle>
                <EmptyDescription>
                  Add recipes to your meal plan to generate a shopping list
                </EmptyDescription>
              </EmptyHeader>
            </Empty>
          ) : (
            <div className="space-y-2">
              {Object.entries(shoppingList).map(([item, { amount, unit }]) => (
                <div key={item} className="flex items-center gap-3 pb-2 border-b border-border last:border-0">
                  <Checkbox />
                  <span className="capitalize">
                    {amount} {unit} {item}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
