import { useRecipes } from "@/hooks/useRecipes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useHashLocation } from "@/hooks/useHashLocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { ArrowLeft, Download, Trash2, ChevronLeft, ChevronRight, ShoppingCart, Calendar, X } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const SLOTS = ["lunch", "dinner"] as const;

const CATEGORY_ORDER = ["produce", "protein", "dairy", "pantry", "bakery", "frozen", "other"];
const CATEGORY_ICONS: Record<string, string> = {
  produce: "🥦",
  protein: "🥩",
  dairy: "🧀",
  pantry: "🫙",
  frozen: "❄️",
  bakery: "🍞",
  other: "🛒",
};
const CATEGORY_LABELS: Record<string, string> = {
  produce: "Produce",
  protein: "Meat & Protein",
  dairy: "Dairy & Eggs",
  pantry: "Pantry & Dry Goods",
  frozen: "Frozen",
  bakery: "Bakery & Bread",
  other: "Other",
};

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function MealPlan() {
  const { recipes, loading } = useRecipes();
  const [, setLocation] = useHashLocation();

  const [mealPlan, setMealPlan] = useLocalStorage<Record<string, Record<string, string | null>>>(
    "recipes_meal_plan",
    {}
  );
  const [checkedItems, setCheckedItems] = useLocalStorage<Record<string, boolean>>(
    "recipes_shopping_checked",
    {}
  );

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    return monday;
  });

  const [activeDay, setActiveDay] = useState(() => {
    const today = new Date();
    const dayOfWeek = (today.getDay() + 6) % 7; // 0=Mon, 6=Sun
    return Math.min(dayOfWeek, 6);
  });

  const [activeSection, setActiveSection] = useState<"plan" | "shopping">("plan");

  const weekKey = weekStart.toISOString().split("T")[0];
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);

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
    const recipe = recipes.find(r => r.id === recipeId);
    toast.success(`${recipe?.title || "Recipe"} added to ${day} ${slot}!`);
  };

  const handleRemoveRecipe = (day: string, slot: typeof SLOTS[number]) => {
    setMealPlan((prev) => ({
      ...prev,
      [weekKey]: {
        ...weekPlan,
        [`${day}-${slot}`]: null,
      },
    }));
  };

  const clearWeek = () => {
    setMealPlan((prev) => ({
      ...prev,
      [weekKey]: {},
    }));
    toast.success("Week cleared!");
  };

  // Generate shopping list grouped by category
  const shoppingListByCategory = useMemo(() => {
    const ingredients: Record<string, { amount: number; unit: string; category: string; recipes: string[] }> = {};

    DAYS.forEach((day) => {
      SLOTS.forEach((slot) => {
        const recipeId = weekPlan[`${day}-${slot}`];
        if (recipeId) {
          const recipe = recipes.find((r) => r.id === recipeId);
          if (recipe) {
            recipe.ingredients.forEach((ing) => {
              const key = `${ing.item.toLowerCase()}__${ing.unit}`;
              if (ingredients[key]) {
                ingredients[key].amount += parseFloat(String(ing.amount)) || 1;
                if (!ingredients[key].recipes.includes(recipe.title)) {
                  ingredients[key].recipes.push(recipe.title);
                }
              } else {
                ingredients[key] = {
                  amount: parseFloat(String(ing.amount)) || 1,
                  unit: ing.unit,
                  category: ing.category || "other",
                  recipes: [recipe.title],
                };
              }
            });
          }
        }
      });
    });

    // Group by category
    const grouped: Record<string, Array<{ key: string; item: string; amount: number; unit: string; recipes: string[] }>> = {};
    Object.entries(ingredients).forEach(([key, val]) => {
      const itemName = key.split("__")[0];
      const cat = val.category;
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push({ key, item: itemName, amount: val.amount, unit: val.unit, recipes: val.recipes });
    });

    // Sort items within each category
    Object.keys(grouped).forEach(cat => {
      grouped[cat].sort((a, b) => a.item.localeCompare(b.item));
    });

    return grouped;
  }, [weekPlan, recipes]);

  const totalItems = Object.values(shoppingListByCategory).reduce((sum, items) => sum + items.length, 0);
  const checkedCount = Object.values(checkedItems).filter(Boolean).length;

  const plannedMealsCount = DAYS.reduce((count, day) => {
    return count + SLOTS.filter(slot => weekPlan[`${day}-${slot}`]).length;
  }, 0);

  const toggleCheck = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const clearChecked = () => {
    setCheckedItems({});
  };

  const downloadShoppingList = () => {
    const lines: string[] = ["SHOPPING LIST", `Week of ${formatDate(weekStart)} – ${formatDate(weekEnd)}`, ""];

    CATEGORY_ORDER.forEach(cat => {
      const items = shoppingListByCategory[cat];
      if (!items || items.length === 0) return;
      lines.push(`\n${CATEGORY_LABELS[cat].toUpperCase()}`);
      lines.push("─".repeat(30));
      items.forEach(({ item, amount, unit }) => {
        const amtStr = amount === Math.floor(amount) ? String(amount) : amount.toFixed(1);
        lines.push(`[ ] ${amtStr} ${unit} ${item}`);
      });
    });

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `shopping-list-${weekKey}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Shopping list downloaded!");
  };

  if (loading) {
    return (
      <div className="container py-8 max-w-4xl">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-7 gap-2">
          {[...Array(7)].map((_, i) => <Skeleton key={i} className="h-48" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <Button onClick={() => setLocation("/")} variant="ghost" size="sm" className="gap-1.5">
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Recipes</span>
          </Button>
          <h1 className="font-heading text-base font-semibold">Weekly Meal Plan</h1>
          <div className="flex items-center gap-1">
            <Button
              variant={activeSection === "plan" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("plan")}
              className="gap-1.5 text-xs"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Plan</span>
            </Button>
            <Button
              variant={activeSection === "shopping" ? "default" : "ghost"}
              size="sm"
              onClick={() => setActiveSection("shopping")}
              className="gap-1.5 text-xs"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Shopping</span>
              {totalItems > 0 && (
                <span className="ml-0.5 bg-primary/20 text-primary text-xs px-1.5 py-0.5 rounded-full">
                  {totalItems}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-6 max-w-4xl page-enter">
        {/* Week navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const prev = new Date(weekStart);
              prev.setDate(prev.getDate() - 7);
              setWeekStart(prev);
            }}
            className="gap-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <div className="text-center">
            <p className="font-heading font-semibold text-foreground">
              {formatDate(weekStart)} – {formatDate(weekEnd)}
            </p>
            <p className="text-xs text-muted-foreground">
              {plannedMealsCount} meal{plannedMealsCount !== 1 ? "s" : ""} planned
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const next = new Date(weekStart);
              next.setDate(next.getDate() + 7);
              setWeekStart(next);
            }}
            className="gap-1"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {activeSection === "plan" && (
          <>
            {/* Day tabs (mobile) */}
            <div className="flex gap-1 mb-4 overflow-x-auto pb-1 sm:hidden">
              {DAYS.map((day, idx) => {
                const hasMeals = SLOTS.some(slot => weekPlan[`${day}-${slot}`]);
                return (
                  <button
                    key={day}
                    onClick={() => setActiveDay(idx)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeDay === idx
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {DAY_SHORT[idx]}
                    {hasMeals && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-current inline-block" />}
                  </button>
                );
              })}
            </div>

            {/* Desktop: all days grid */}
            <div className="hidden sm:grid sm:grid-cols-7 gap-3 mb-6">
              {DAYS.map((day) => (
                <DayCard
                  key={day}
                  day={day}
                  dayShort={DAY_SHORT[DAYS.indexOf(day)]}
                  weekPlan={weekPlan}
                  recipes={recipes}
                  onAssign={handleAssignRecipe}
                  onRemove={handleRemoveRecipe}
                />
              ))}
            </div>

            {/* Mobile: single day view */}
            <div className="sm:hidden mb-6">
              <DayCard
                day={DAYS[activeDay]}
                dayShort={DAY_SHORT[activeDay]}
                weekPlan={weekPlan}
                recipes={recipes}
                onAssign={handleAssignRecipe}
                onRemove={handleRemoveRecipe}
                expanded
              />
            </div>

            {plannedMealsCount > 0 && (
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection("shopping")}
                  className="gap-1.5"
                >
                  <ShoppingCart className="w-4 h-4" />
                  View Shopping List ({totalItems} items)
                </Button>
                <Button variant="ghost" size="sm" onClick={clearWeek} className="text-muted-foreground text-xs">
                  Clear week
                </Button>
              </div>
            )}
          </>
        )}

        {activeSection === "shopping" && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-heading text-lg font-semibold">Shopping List</h2>
                <p className="text-sm text-muted-foreground">
                  {totalItems} items · {checkedCount} checked
                </p>
              </div>
              <div className="flex gap-2">
                {checkedCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearChecked} className="text-xs">
                    <X className="w-3.5 h-3.5 mr-1" />
                    Uncheck all
                  </Button>
                )}
                {totalItems > 0 && (
                  <Button size="sm" onClick={downloadShoppingList} className="gap-1.5">
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                )}
              </div>
            </div>

            {totalItems === 0 ? (
              <Empty className="border-dashed border-border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">🛒</EmptyMedia>
                  <EmptyTitle>No items yet</EmptyTitle>
                  <EmptyDescription>
                    Add recipes to your meal plan to generate a shopping list
                  </EmptyDescription>
                </EmptyHeader>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setActiveSection("plan")}
                  className="mt-3"
                >
                  <Calendar className="w-4 h-4 mr-1.5" />
                  Go to Meal Plan
                </Button>
              </Empty>
            ) : (
              <div className="space-y-6">
                {CATEGORY_ORDER.filter(cat => shoppingListByCategory[cat]?.length > 0).map(cat => (
                  <div key={cat}>
                    <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 pb-2 border-b border-border">
                      <span className="text-base">{CATEGORY_ICONS[cat]}</span>
                      <span>{CATEGORY_LABELS[cat]}</span>
                      <span className="ml-auto text-xs font-normal normal-case tracking-normal">
                        {shoppingListByCategory[cat].length} items
                      </span>
                    </div>
                    <div className="space-y-2">
                      {shoppingListByCategory[cat].map(({ key, item, amount, unit, recipes }) => {
                        const amtStr = amount === Math.floor(amount) ? String(amount) : amount.toFixed(1);
                        return (
                          <div
                            key={key}
                            className={`flex items-start gap-3 py-2 px-3 rounded-lg cursor-pointer transition-colors hover:bg-muted/40 ${
                              checkedItems[key] ? "opacity-50" : ""
                            }`}
                            onClick={() => toggleCheck(key)}
                          >
                            <Checkbox
                              checked={!!checkedItems[key]}
                              onCheckedChange={() => toggleCheck(key)}
                              className="mt-0.5 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm capitalize ${checkedItems[key] ? "line-through text-muted-foreground" : ""}`}>
                                {item}
                              </span>
                              {recipes.length > 1 && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {recipes.join(", ")}
                                </p>
                              )}
                            </div>
                            <span className="text-sm font-medium text-muted-foreground shrink-0">
                              {amtStr} {unit}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Day card sub-component
interface DayCardProps {
  day: string;
  dayShort: string;
  weekPlan: Record<string, string | null>;
  recipes: Array<{ id: string; title: string; imageEmoji: string; totalTime: number }>;
  onAssign: (day: string, slot: "lunch" | "dinner", recipeId: string) => void;
  onRemove: (day: string, slot: "lunch" | "dinner") => void;
  expanded?: boolean;
}

function DayCard({ day, dayShort, weekPlan, recipes, onAssign, onRemove, expanded }: DayCardProps) {
  return (
    <Card className="border-border">
      <CardHeader className="pb-2 pt-3 px-3">
        <CardTitle className="text-sm font-semibold text-foreground">
          <span className="hidden sm:inline">{expanded ? day : dayShort}</span>
          <span className="sm:hidden">{day}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-2">
        {SLOTS.map((slot) => {
          const recipeId = weekPlan[`${day}-${slot}`];
          const recipe = recipeId ? recipes.find((r) => r.id === recipeId) : null;
          return (
            <div key={slot}>
              <p className="text-xs text-muted-foreground capitalize font-medium mb-1">{slot}</p>
              {recipe ? (
                <div className="bg-secondary/40 rounded-md p-2 relative group">
                  <div className="flex items-start gap-1.5">
                    <span className="text-lg shrink-0">{recipe.imageEmoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium leading-tight line-clamp-2">{recipe.title}</p>
                      <p className="text-xs text-muted-foreground">{recipe.totalTime}m</p>
                    </div>
                  </div>
                  <button
                    onClick={() => onRemove(day, slot)}
                    className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-destructive/10"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              ) : (
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      onAssign(day, slot, e.target.value);
                      e.target.value = "";
                    }
                  }}
                  className="w-full px-2 py-1.5 border border-border rounded-md text-xs bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  <option value="">+ Add recipe</option>
                  {recipes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.imageEmoji} {r.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
