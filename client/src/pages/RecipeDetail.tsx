import { useHashLocation } from "@/hooks/useHashLocation";
import { useRecipe } from "@/hooks/useRecipes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Heart, Clock, Users, ChefHat, ArrowLeft, Minus, Plus, Youtube, Lightbulb, ShoppingCart, BookOpen } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useRecipeCart } from "@/contexts/RecipeCartContext";

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-100 text-green-700 border-green-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Hard: "bg-red-100 text-red-700 border-red-200",
};

const CATEGORY_ICONS: Record<string, string> = {
  produce: "🥦",
  protein: "🥩",
  dairy: "🧀",
  pantry: "🫙",
  frozen: "❄️",
  bakery: "🍞",
  other: "🛒",
};

export default function RecipeDetail() {
  const [location, setLocation] = useHashLocation();
  const { addToCart, removeFromCart, isInCart } = useRecipeCart();
  const recipeIdMatch = location.match(/^\/recipe\/(.+)$/);
  const id = recipeIdMatch ? recipeIdMatch[1] : null;
  const { recipe, loading, error } = useRecipe(id || "");

  const [favorites, setFavorites] = useLocalStorage<string[]>("recipes_favorites", []);
  const [ratings, setRatings] = useLocalStorage<Record<string, number>>("recipes_ratings", {});
  const [notes, setNotes] = useLocalStorage<Record<string, string>>("recipes_notes", {});
  const [madeCount, setMadeCount] = useLocalStorage<Record<string, number>>("recipes_made_count", {});

  const [isFavorite, setIsFavorite] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);
  const [currentNotes, setCurrentNotes] = useState("");
  const [currentMadeCount, setCurrentMadeCount] = useState(0);
  const [servingMultiplier, setServingMultiplier] = useState(1);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (recipe && id) {
      setIsFavorite(favorites.includes(id));
      setCurrentRating(ratings[id] || 0);
      setCurrentNotes(notes[id] || "");
      setCurrentMadeCount(madeCount[id] || 0);
      setServingMultiplier(1);
      setCheckedIngredients(new Set());
      setCheckedSteps(new Set());
    }
  }, [recipe, id]);

  const handleToggleFavorite = () => {
    if (!id) return;
    const nowFav = !isFavorite;
    setIsFavorite(nowFav);
    if (nowFav) {
      setFavorites((prev) => [...prev, id]);
    } else {
      setFavorites((prev) => prev.filter((fav) => fav !== id));
    }
    toast.success(nowFav ? "Added to favorites!" : "Removed from favorites");
  };

  const handleSetRating = (rating: number) => {
    if (!id) return;
    setRatings((prev) => ({ ...prev, [id]: rating }));
    setCurrentRating(rating);
    toast.success(`Rated ${rating} star${rating !== 1 ? "s" : ""}!`);
  };

  const handleSaveNotes = () => {
    if (!id) return;
    setNotes((prev) => ({ ...prev, [id]: currentNotes }));
    toast.success("Notes saved!");
  };

  const handleTrackMade = () => {
    if (!id) return;
    const newCount = (currentMadeCount || 0) + 1;
    setMadeCount((prev) => ({ ...prev, [id]: newCount }));
    setCurrentMadeCount(newCount);
    toast.success(`Awesome! Made ${newCount} time${newCount !== 1 ? "s" : ""} total.`);
  };

  const toggleIngredient = (idx: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const scaleAmount = (amount: string | number) => {
    const num = parseFloat(String(amount));
    if (isNaN(num)) return String(amount);
    const scaled = num * servingMultiplier;
    // Format nicely
    if (scaled === Math.floor(scaled)) return String(scaled);
    return scaled.toFixed(1).replace(/\.0$/, "");
  };

  const scaledServings = recipe ? recipe.servings * servingMultiplier : 0;

  if (loading) {
    return (
      <div className="container py-8 max-w-3xl">
        <Skeleton className="h-8 w-32 mb-6" />
        <Skeleton className="h-64 w-full mb-6 rounded-xl" />
        <Skeleton className="h-48 w-full mb-4" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container py-8 max-w-3xl text-center">
        <div className="text-5xl mb-4">😕</div>
        <h2 className="font-heading text-2xl font-semibold mb-2">Recipe not found</h2>
        <p className="text-muted-foreground mb-6">{error || "This recipe doesn't exist."}</p>
        <Button onClick={() => setLocation("/")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to recipes
        </Button>
      </div>
    );
  }

  // Group ingredients by category
  const ingredientsByCategory = recipe.ingredients.reduce((acc, ing, idx) => {
    const cat = ing.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ ...ing, originalIdx: idx });
    return acc;
  }, {} as Record<string, Array<typeof recipe.ingredients[0] & { originalIdx: number }>>);

  const categoryOrder = ["produce", "protein", "dairy", "pantry", "bakery", "frozen", "other"];
  const sortedCategories = categoryOrder.filter(c => ingredientsByCategory[c]);

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border">
        <div className="container flex items-center justify-between h-14">
          <Button
            onClick={() => setLocation("/")}
            variant="ghost"
            size="sm"
            className="gap-1.5"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">All Recipes</span>
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant={isFavorite ? "default" : "outline"}
              size="sm"
              onClick={handleToggleFavorite}
              className="gap-1.5"
            >
              <Heart className={`w-4 h-4 ${isFavorite ? "fill-white" : ""}`} />
              <span className="hidden sm:inline">{isFavorite ? "Saved" : "Save"}</span>
            </Button>
            {recipe && (
              <Button
                variant={isInCart(recipe.id) ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  if (isInCart(recipe.id)) {
                    removeFromCart(recipe.id);
                    toast.success("Removed from cart");
                  } else {
                    addToCart(recipe.id);
                    toast.success("Added to cart! 🛒");
                  }
                }}
                className="gap-1.5"
              >
                <ShoppingCart className="w-4 h-4" />
                <span className="hidden sm:inline">
                  {isInCart(recipe.id) ? "In Cart" : "Add to Cart"}
                </span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={handleTrackMade}
              className="gap-1.5"
            >
              <ChefHat className="w-4 h-4" />
              <span className="hidden sm:inline">Made it!</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8 max-w-3xl page-enter">
        {/* Hero section */}
        <div className="rounded-2xl mb-8 overflow-hidden relative">
          {recipe.imageUrl ? (
            <div className="relative h-72 md:h-96">
              <img
                src={recipe.imageUrl}
                alt={recipe.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
            </div>
          ) : (
            <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8 text-center">
              <div className="text-8xl mb-4 select-none">{recipe.imageEmoji}</div>
            </div>
          )}
            <div className={`${recipe.imageUrl ? 'absolute bottom-0 left-0 right-0 p-6' : 'bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 p-8 text-center'}`}>
          {/* Badges */}
          <div className="flex flex-wrap justify-center gap-2 mb-3">
            {recipe.isFamily && (
              <Badge className={recipe.imageUrl ? 'bg-white/20 text-white border-white/30 backdrop-blur-sm' : 'bg-primary text-primary-foreground'}>
                👨‍👩‍👧‍👦 Family Recipe
              </Badge>
            )}
            <Badge variant="outline" className={recipe.imageUrl ? 'border-white/40 text-white bg-white/10 backdrop-blur-sm' : (DIFFICULTY_COLORS[recipe.difficulty] || "")}>
              {recipe.difficulty}
            </Badge>
          </div>
          <h1 className={`font-heading text-3xl font-bold mb-2 ${recipe.imageUrl ? 'text-white drop-shadow-md' : 'text-foreground'}`}>
            {recipe.title}
          </h1>
          <p className={`max-w-lg mx-auto leading-relaxed text-sm ${recipe.imageUrl ? 'text-white/80' : 'text-muted-foreground'}`}>
            {recipe.description}
          </p>

          {/* Quick stats */}
          <div className={`flex justify-center gap-6 mt-4 text-sm ${recipe.imageUrl ? 'text-white' : ''}`}>
            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${recipe.imageUrl ? 'text-white/70' : 'text-muted-foreground'}`}>
                <Clock className="w-4 h-4" />
              </div>
              <div className="font-semibold">{recipe.prepTime}m</div>
              <div className={`text-xs ${recipe.imageUrl ? 'text-white/70' : 'text-muted-foreground'}`}>Prep</div>
            </div>
            <div className={`w-px ${recipe.imageUrl ? 'bg-white/30' : 'bg-border'}`} />
            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${recipe.imageUrl ? 'text-white/70' : 'text-muted-foreground'}`}>
                <Clock className="w-4 h-4" />
              </div>
              <div className="font-semibold">{recipe.cookTime}m</div>
              <div className={`text-xs ${recipe.imageUrl ? 'text-white/70' : 'text-muted-foreground'}`}>Cook</div>
            </div>
            <div className={`w-px ${recipe.imageUrl ? 'bg-white/30' : 'bg-border'}`} />
            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${recipe.imageUrl ? 'text-white/70' : 'text-muted-foreground'}`}>
                <Clock className="w-4 h-4" />
              </div>
              <div className="font-semibold">{recipe.totalTime}m</div>
              <div className={`text-xs ${recipe.imageUrl ? 'text-white/70' : 'text-muted-foreground'}`}>Total</div>
            </div>
            <div className={`w-px ${recipe.imageUrl ? 'bg-white/30' : 'bg-border'}`} />
            <div className="text-center">
              <div className={`flex items-center justify-center gap-1 mb-1 ${recipe.imageUrl ? 'text-white/70' : 'text-muted-foreground'}`}>
                <Users className="w-4 h-4" />
              </div>
              <div className="font-semibold">{scaledServings}</div>
              <div className={`text-xs ${recipe.imageUrl ? 'text-white/70' : 'text-muted-foreground'}`}>Servings</div>
            </div>
          </div>
          </div>
        </div>

        {/* Personal tracking card */}
        <Card className="mb-6 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ChefHat className="w-5 h-5 text-primary" />
              Your Kitchen Notes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Rating */}
            <div>
              <label className="text-sm font-medium mb-2 block">Your rating</label>
              <div className="flex items-center gap-1 star-rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleSetRating(star)}
                    className="star text-2xl leading-none transition-transform hover:scale-125"
                    aria-label={`Rate ${star} stars`}
                  >
                    <span className={star <= currentRating ? "text-amber-400" : "text-gray-200"}>★</span>
                  </button>
                ))}
                {currentRating > 0 && (
                  <span className="text-sm text-muted-foreground ml-2">{currentRating}/5</span>
                )}
              </div>
            </div>

            {/* Made count */}
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-medium">Times made</label>
                <p className="text-2xl font-heading font-bold text-primary">{currentMadeCount}</p>
              </div>
              <Button onClick={handleTrackMade} size="sm" className="gap-1.5">
                <ChefHat className="w-4 h-4" />
                Made it!
              </Button>
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm font-medium mb-2 block">Personal notes & tips</label>
              <Textarea
                value={currentNotes}
                onChange={(e) => setCurrentNotes(e.target.value)}
                onBlur={handleSaveNotes}
                placeholder="Add your cooking tips, modifications, or family memories..."
                className="min-h-20 text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">Auto-saves when you click away</p>
            </div>
          </CardContent>
        </Card>

        {/* Serving size scaler */}
        <Card className="mb-6 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="w-5 h-5 text-primary" />
              Ingredients
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {recipe.ingredients.length} items
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Serving scaler */}
            <div className="flex items-center gap-3 mb-5 p-3 bg-secondary/30 rounded-lg">
              <Users className="w-4 h-4 text-muted-foreground shrink-0" />
              <span className="text-sm text-muted-foreground">Servings:</span>
              <div className="flex items-center gap-2 ml-auto">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setServingMultiplier(m => Math.max(0.5, m - 0.5))}
                  disabled={servingMultiplier <= 0.5}
                >
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="font-semibold text-sm w-12 text-center">
                  {scaledServings} {scaledServings === 1 ? "serving" : "servings"}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setServingMultiplier(m => m + 0.5)}
                >
                  <Plus className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {/* Ingredients by category */}
            <div className="space-y-4">
              {sortedCategories.map((category) => (
                <div key={category}>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 pb-1 border-b border-border">
                    <span>{CATEGORY_ICONS[category] || "🛒"}</span>
                    <span>{category}</span>
                  </div>
                  <div className="space-y-2">
                    {ingredientsByCategory[category].map((ingredient) => (
                      <div
                        key={ingredient.originalIdx}
                        className={`flex items-start gap-3 py-1.5 rounded-md px-2 transition-colors cursor-pointer hover:bg-muted/50 ${
                          checkedIngredients.has(ingredient.originalIdx) ? "opacity-50" : ""
                        }`}
                        onClick={() => toggleIngredient(ingredient.originalIdx)}
                      >
                        <Checkbox
                          checked={checkedIngredients.has(ingredient.originalIdx)}
                          onCheckedChange={() => toggleIngredient(ingredient.originalIdx)}
                          className="mt-0.5 shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`text-sm ${checkedIngredients.has(ingredient.originalIdx) ? "line-through text-muted-foreground" : ""}`}>
                            {ingredient.item}
                          </span>
                        </div>
                        <div className="text-sm font-medium text-muted-foreground shrink-0">
                          {scaleAmount(ingredient.amount)} {ingredient.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {checkedIngredients.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCheckedIngredients(new Set())}
                className="mt-3 text-muted-foreground"
              >
                Clear all checks
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card className="mb-6 border-border">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="w-5 h-5 text-primary" />
              Instructions
              <span className="ml-auto text-sm font-normal text-muted-foreground">
                {checkedSteps.size}/{recipe.instructions.length} done
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-4">
              {recipe.instructions.map((instruction, idx) => (
                <li
                  key={idx}
                  className={`flex gap-4 cursor-pointer group rounded-lg p-3 transition-colors hover:bg-muted/30 ${
                    checkedSteps.has(idx) ? "opacity-60" : ""
                  }`}
                  onClick={() => toggleStep(idx)}
                >
                  <div className="shrink-0 mt-0.5">
                    <div className={`flex items-center justify-center h-7 w-7 rounded-full text-sm font-bold transition-colors ${
                      checkedSteps.has(idx)
                        ? "bg-green-500 text-white"
                        : "bg-primary text-primary-foreground"
                    }`}>
                      {checkedSteps.has(idx) ? "✓" : idx + 1}
                    </div>
                  </div>
                  <p className={`flex-1 text-sm leading-relaxed pt-0.5 ${
                    checkedSteps.has(idx) ? "line-through text-muted-foreground" : "text-foreground"
                  }`}>
                    {instruction}
                  </p>
                </li>
              ))}
            </ol>
            {checkedSteps.size > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCheckedSteps(new Set())}
                className="mt-3 text-muted-foreground"
              >
                Reset progress
              </Button>
            )}
          </CardContent>
        </Card>

        {/* YouTube Video */}
        {recipe.videoUrl && (
          <Card className="mb-6 border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Youtube className="w-5 h-5 text-red-500" />
                Watch on YouTube
              </CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={recipe.videoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium text-sm"
              >
                <Youtube className="w-4 h-4" />
                Watch Recipe Video
              </a>
              <p className="text-xs text-muted-foreground mt-2">
                Opens YouTube in a new tab
              </p>
            </CardContent>
          </Card>
        )}

        {/* Tips */}
        {recipe.tips && recipe.tips.length > 0 && (
          <Card className="border-border">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lightbulb className="w-5 h-5 text-amber-500" />
                Chef's Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {recipe.tips.map((tip, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <span className="text-amber-500 font-bold shrink-0 mt-0.5">•</span>
                    <span className="text-foreground leading-relaxed">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
