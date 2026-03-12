import { useRecipes } from "@/hooks/useRecipes";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
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
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const utils = trpc.useUtils();

  const [weekStart, setWeekStart] = useState(() => {
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    return monday;
  });

  // Fetch meal plan
  const { data: mealPlanEntries = [], isLoading: mealPlanLoading } =
    trpc.recipe.getMealPlan.useQuery({ weekStart }, { enabled: !!user });

  // Fetch shopping list
  const { data: shoppingListItems = [], isLoading: shoppingListLoading } =
    trpc.recipe.getShoppingList.useQuery({ weekStart }, { enabled: !!user });

  // Mutations
  const saveMealPlanMutation = trpc.recipe.saveMealPlanEntry.useMutation({
    onSuccess: () => {
      utils.recipe.getMealPlan.invalidate();
      toast.success("Meal plan updated!");
    },
  });

  const updateShoppingItemMutation = trpc.recipe.updateShoppingListItem.useMutation({
    onSuccess: () => {
      utils.recipe.getShoppingList.invalidate();
    },
  });

  const deleteShoppingItemMutation = trpc.recipe.deleteShoppingListItem.useMutation({
    onSuccess: () => {
      utils.recipe.getShoppingList.invalidate();
      toast.success("Item removed");
    },
  });

  const clearShoppingListMutation = trpc.recipe.clearShoppingList.useMutation({
    onSuccess: () => {
      utils.recipe.getShoppingList.invalidate();
      toast.success("Shopping list cleared");
    },
  });

  // Get recipe for a meal plan entry
  const getRecipeForEntry = (day: string, slot: string) => {
    const entry = mealPlanEntries.find(
      (e) => e.day === day && e.slot === slot
    );
    return entry ? recipes.find((r) => r.id === entry.recipeId) : null;
  };

  // Group shopping list by category
  type ShoppingItem = typeof shoppingListItems[0];
  const shoppingByCategory = useMemo(() => {
    const grouped: Record<string, ShoppingItem[]> = {};
    shoppingListItems.forEach((item) => {
      const cat = item.category || "Other";
      if (!grouped[cat]) {
        grouped[cat] = [];
      }
      grouped[cat].push(item);
    });
    return grouped;
  }, [shoppingListItems]);

  if (!user) {
    return (
      <div className="container py-8">
        <Empty className="border-dashed border-memphis-peach">
          <EmptyHeader>
            <EmptyMedia variant="icon">📅</EmptyMedia>
            <EmptyTitle>Sign in to plan meals</EmptyTitle>
            <EmptyDescription>
              <Button onClick={() => setLocation("/")} className="mt-4">
                Back to recipes
              </Button>
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <h1 className="font-heading text-3xl font-bold">📅 Weekly Meal Plan</h1>
          <p className="text-muted-foreground mt-1">
            Plan your week and generate a shopping list
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Meal Plan */}
        <div className="lg:col-span-2">
          <Card className="border-memphis-peach/30">
            <CardHeader>
              <CardTitle>This Week's Meals</CardTitle>
            </CardHeader>
            <CardContent>
              {mealPlanLoading ? (
                <div className="space-y-4">
                  {[...Array(7)].map((_, i) => (
                    <Skeleton key={i} className="h-24" />
                  ))}
                </div>
              ) : (
                <div className="space-y-6">
                  {DAYS.map((day) => (
                    <div
                      key={day}
                      className="pb-6 border-b border-border last:border-0"
                    >
                      <h3 className="font-semibold text-lg mb-3 text-memphis-coral">
                        {day}
                      </h3>
                      <div className="space-y-2">
                        {SLOTS.map((slot) => {
                          const recipe = getRecipeForEntry(day, slot);
                          return (
                            <div
                              key={`${day}-${slot}`}
                              className="flex items-center gap-3 p-3 rounded-lg bg-memphis-peach/20 border border-memphis-peach/30"
                            >
                              <span className="capitalize font-semibold w-16 text-sm">
                                {slot}
                              </span>
                              {recipe ? (
                                <div className="flex-1 flex items-center gap-2">
                                  <span className="text-2xl">{recipe.imageEmoji}</span>
                                  <span className="font-medium">{recipe.title}</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      saveMealPlanMutation.mutate({
                                        weekStart,
                                        day,
                                        slot,
                                        recipeId: null,
                                      })
                                    }
                                  >
                                    ✕
                                  </Button>
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">
                                  Not planned yet
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Shopping List */}
        <div>
          <Card className="border-memphis-mint/30 sticky top-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>🛒 Shopping List</CardTitle>
                {shoppingListItems.length > 0 && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      clearShoppingListMutation.mutate({ weekStart })
                    }
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {shoppingListLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-6" />
                  ))}
                </div>
              ) : shoppingListItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Plan meals to generate a shopping list
                </p>
              ) : (
                <div className="space-y-4">
                  {Object.entries(shoppingByCategory).map(
                    ([category, items]: [string, ShoppingItem[]]) => (
                      <div key={category}>
                        <h4 className="font-semibold text-sm text-memphis-mint mb-2 capitalize">
                          {category}
                        </h4>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center gap-2 p-2 rounded hover:bg-memphis-mint/10"
                            >
                              <Checkbox
                                checked={item.checked}
                                onCheckedChange={(checked) =>
                                  updateShoppingItemMutation.mutate({
                                    id: item.id,
                                    checked: !!checked,
                                  })
                                }
                              />
                              <div className="flex-1 min-w-0">
                                <div
                                  className={`text-sm ${
                                    item.checked
                                      ? "line-through text-muted-foreground"
                                      : ""
                                  }`}
                                >
                                  {item.item}
                                </div>
                                {item.amount && (
                                  <div className="text-xs text-muted-foreground">
                                    {item.amount} {item.unit}
                                  </div>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  deleteShoppingItemMutation.mutate({
                                    id: item.id,
                                  })
                                }
                              >
                                ✕
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
