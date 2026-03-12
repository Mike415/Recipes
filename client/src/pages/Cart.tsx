import { useMemo, useState } from "react";
import { useRecipes } from "@/hooks/useRecipes";
import { useRecipeCart } from "@/contexts/RecipeCartContext";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useHashLocation } from "@/hooks/useHashLocation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, ShoppingCart, Trash2, ChefHat, Download, X, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import type { Recipe } from "@shared/recipe-types";

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

/** Combine ingredients from multiple recipes into a deduplicated shopping list */
function buildShoppingList(cartRecipes: Recipe[]) {
  // key = "item|unit|category" (normalised lowercase)
  const map = new Map<
    string,
    { item: string; unit: string; category: string; amounts: string[]; recipeIds: string[] }
  >();

  for (const recipe of cartRecipes) {
    for (const ing of recipe.ingredients) {
      const key = `${ing.item.toLowerCase().trim()}|${ing.unit.toLowerCase().trim()}|${ing.category}`;
      if (map.has(key)) {
        const entry = map.get(key)!;
        entry.amounts.push(ing.amount);
        if (!entry.recipeIds.includes(recipe.id)) entry.recipeIds.push(recipe.id);
      } else {
        map.set(key, {
          item: ing.item,
          unit: ing.unit,
          category: ing.category,
          amounts: [ing.amount],
          recipeIds: [recipe.id],
        });
      }
    }
  }

  return Array.from(map.values()).map((entry) => ({
    ...entry,
    // Combine amounts: try to sum numbers, otherwise join with "+"
    amount: combineAmounts(entry.amounts),
  }));
}

function combineAmounts(amounts: string[]): string {
  if (amounts.length === 1) return amounts[0];
  const nums = amounts.map((a) => parseFloat(a));
  if (nums.every((n) => !isNaN(n))) {
    const sum = nums.reduce((a, b) => a + b, 0);
    // Format nicely: remove trailing zeros
    return String(parseFloat(sum.toFixed(2)));
  }
  return amounts.join(" + ");
}

export default function Cart() {
  const { recipes, loading } = useRecipes();
  const { cartIds, checkedItems, removeFromCart, clearCart, toggleChecked, clearChecked } =
    useRecipeCart();
  const [, setLocation] = useHashLocation();
  const [madeCounts, setMadeCounts] = useLocalStorage<Record<string, number>>(
    "recipes_made_counts",
    {}
  );
  const [activeTab, setActiveTab] = useState<"recipes" | "shopping">("recipes");

  const cartRecipes = useMemo(
    () => recipes.filter((r) => cartIds.includes(r.id)),
    [recipes, cartIds]
  );

  const shoppingList = useMemo(() => buildShoppingList(cartRecipes), [cartRecipes]);

  const grouped = useMemo(() => {
    const groups: Record<string, typeof shoppingList> = {};
    for (const item of shoppingList) {
      const cat = item.category || "other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }
    return groups;
  }, [shoppingList]);

  const totalItems = shoppingList.length;
  const checkedCount = shoppingList.filter(
    (item) => checkedItems[`${item.item}|${item.unit}`]
  ).length;

  function handleMarkAllMade() {
    // Increment made count for each recipe in cart
    const updated = { ...madeCounts };
    for (const id of cartIds) {
      updated[id] = (updated[id] || 0) + 1;
    }
    setMadeCounts(updated);
    clearCart();
    toast.success(`Marked ${cartIds.length} recipe${cartIds.length !== 1 ? "s" : ""} as made! 🎉`);
    setLocation("/");
  }

  function handleClearCart() {
    clearCart();
    toast.success("Cart cleared");
    setLocation("/");
  }

  function handleDownload() {
    const lines: string[] = ["SHOPPING LIST", "=".repeat(40), ""];
    for (const cat of CATEGORY_ORDER) {
      const items = grouped[cat];
      if (!items?.length) continue;
      lines.push(`${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat].toUpperCase()}`);
      for (const item of items) {
        const checked = checkedItems[`${item.item}|${item.unit}`] ? "✓" : "○";
        const qty = [item.amount, item.unit].filter(Boolean).join(" ");
        lines.push(`  ${checked} ${item.item}${qty ? ` — ${qty}` : ""}`);
      }
      lines.push("");
    }
    lines.push("=".repeat(40));
    lines.push(`Recipes: ${cartRecipes.map((r) => r.title).join(", ")}`);

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "shopping-list.txt";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Shopping list downloaded");
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="gap-1.5">
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">All Recipes</span>
            </Button>
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <h1 className="font-heading text-base font-semibold text-foreground">
                Recipe Cart
              </h1>
              {cartIds.length > 0 && (
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-bold">
                  {cartIds.length}
                </span>
              )}
            </div>
          </div>
          {cartIds.length > 0 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="hidden sm:flex gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                Download List
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={handleMarkAllMade}
                className="gap-1.5 bg-primary hover:bg-primary/90"
              >
                <ChefHat className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Mark All Made</span>
                <span className="sm:hidden">Made!</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearCart}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          )}
        </div>
      </header>

      <div className="container py-6 max-w-2xl">
        {cartIds.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="font-heading text-xl font-semibold text-foreground mb-2">
              Your cart is empty
            </h2>
            <p className="text-muted-foreground mb-6 max-w-xs">
              Browse recipes and tap the cart icon to add them here. Your shopping list will be
              built automatically.
            </p>
            <Button onClick={() => setLocation("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Browse Recipes
            </Button>
          </div>
        ) : (
          <>
            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-muted rounded-lg mb-6">
              <button
                onClick={() => setActiveTab("recipes")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "recipes"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Recipes ({cartRecipes.length})
              </button>
              <button
                onClick={() => setActiveTab("shopping")}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  activeTab === "shopping"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Shopping List ({totalItems})
              </button>
            </div>

            {activeTab === "recipes" && (
              <div className="space-y-3">
                {cartRecipes.map((recipe) => (
                  <Card key={recipe.id} className="overflow-hidden border-border">
                    <div className="flex items-center gap-3 p-3">
                      {/* Thumbnail */}
                      <div
                        className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-muted cursor-pointer"
                        onClick={() => setLocation(`/recipe/${recipe.id}`)}
                      >
                        {recipe.imageUrl ? (
                          <img
                            src={recipe.imageUrl}
                            alt={recipe.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-2xl">
                            {recipe.imageEmoji}
                          </div>
                        )}
                      </div>
                      {/* Info */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setLocation(`/recipe/${recipe.id}`)}
                      >
                        <h3 className="font-heading font-semibold text-sm text-foreground line-clamp-1">
                          {recipe.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {recipe.totalTime}m · Serves {recipe.servings} ·{" "}
                          {recipe.ingredients.length} ingredients
                        </p>
                        {recipe.isFamily && (
                          <span className="inline-flex items-center gap-1 text-xs text-primary font-medium mt-0.5">
                            👨‍👩‍👧‍👦 Family Recipe
                          </span>
                        )}
                      </div>
                      {/* Remove */}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="flex-shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeFromCart(recipe.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Card>
                ))}

                {/* Action buttons at bottom */}
                <div className="flex gap-3 pt-4">
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleMarkAllMade}
                  >
                    <ChefHat className="w-4 h-4" />
                    Mark All Made & Clear
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 gap-2"
                    onClick={handleClearCart}
                  >
                    <Trash2 className="w-4 h-4" />
                    Clear Cart
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "shopping" && (
              <div className="space-y-4">
                {/* Progress bar */}
                {totalItems > 0 && (
                  <div className="flex items-center gap-3 mb-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full transition-all duration-300"
                        style={{ width: `${(checkedCount / totalItems) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {checkedCount}/{totalItems} items
                    </span>
                    {checkedCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs text-muted-foreground"
                        onClick={clearChecked}
                      >
                        <CheckCheck className="w-3 h-3 mr-1" />
                        Uncheck all
                      </Button>
                    )}
                  </div>
                )}

                {CATEGORY_ORDER.map((cat) => {
                  const items = grouped[cat];
                  if (!items?.length) return null;
                  return (
                    <Card key={cat} className="border-border overflow-hidden">
                      <CardHeader className="py-3 px-4 bg-muted/40">
                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                          <span>{CATEGORY_ICONS[cat]}</span>
                          <span>{CATEGORY_LABELS[cat]}</span>
                          <span className="ml-auto text-xs font-normal text-muted-foreground">
                            {items.length} item{items.length !== 1 ? "s" : ""}
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-0">
                        {items.map((item, i) => {
                          const checkKey = `${item.item}|${item.unit}`;
                          const isChecked = !!checkedItems[checkKey];
                          return (
                            <div
                              key={checkKey}
                              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors hover:bg-muted/30 ${
                                i > 0 ? "border-t border-border/50" : ""
                              } ${isChecked ? "opacity-50" : ""}`}
                              onClick={() => toggleChecked(checkKey)}
                            >
                              <Checkbox
                                checked={isChecked}
                                onCheckedChange={() => toggleChecked(checkKey)}
                                className="flex-shrink-0"
                              />
                              <span
                                className={`flex-1 text-sm ${
                                  isChecked ? "line-through text-muted-foreground" : "text-foreground"
                                }`}
                              >
                                {item.item}
                              </span>
                              <span className="text-sm text-muted-foreground text-right whitespace-nowrap">
                                {[item.amount, item.unit].filter(Boolean).join(" ")}
                              </span>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Download button */}
                <Button
                  variant="outline"
                  className="w-full gap-2 mt-2"
                  onClick={handleDownload}
                >
                  <Download className="w-4 h-4" />
                  Download Shopping List
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
