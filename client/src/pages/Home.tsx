import { useRecipes } from "@/hooks/useRecipes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useHashLocation } from "@/hooks/useHashLocation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { RecipeCard } from "@/components/RecipeCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Heart, Sparkles, Search, ChefHat, ShoppingCart, Moon, Sun, X, SlidersHorizontal } from "lucide-react";
import { useRecipeCart } from "@/contexts/RecipeCartContext";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTheme } from "@/contexts/ThemeContext";

// Tag groups shown in the filter panel — ordered by display priority
const TAG_GROUPS: { label: string; tags: string[] }[] = [
  {
    label: "Style & Occasion",
    tags: ["Family Recipe", "Kid Favorite", "Quick", "One Pan", "Make Ahead", "Special Occasion", "Crowd Pleaser"],
  },
  {
    label: "Diet & Type",
    tags: ["Comfort Food", "Healthy", "Vegetarian", "Breakfast", "Dessert"],
  },
  {
    label: "Cuisine",
    tags: ["American", "Italian", "Mexican", "Asian", "Soup", "Pasta"],
  },
  {
    label: "Protein",
    tags: ["Chicken", "Beef", "Pork", "Seafood"],
  },
  {
    label: "Meal Kit Inspired",
    tags: ["HelloFresh", "EveryPlate", "Home Chef", "Blue Apron", "Barefoot Contessa"],
  },
];

const SORT_OPTIONS = [
  { value: "default", label: "Default" },
  { value: "time-asc", label: "Quickest First" },
  { value: "time-desc", label: "Longest First" },
  { value: "rating-desc", label: "Highest Rated" },
  { value: "made-desc", label: "Most Made" },
  { value: "alpha", label: "A–Z" },
];

export default function Home() {
  const { recipes, loading } = useRecipes();
  const [, setLocation] = useHashLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("browse");
  const [sortBy, setSortBy] = useState("default");
  const [showFilters, setShowFilters] = useState(false);

  const [favorites, setFavorites] = useLocalStorage<string[]>("recipes_favorites", []);
  const [ratings, setRatings] = useLocalStorage<Record<string, number>>("recipes_ratings", {});
  const [madeCount] = useLocalStorage<Record<string, number>>("recipes_made_counts", {});
  const { cartIds, addToCart, removeFromCart, isInCart } = useRecipeCart();

  const { theme, toggleTheme, switchable } = useTheme();

  // Recipe of the day (deterministic by date)
  const recipeOfTheDay = useMemo(() => {
    if (recipes.length === 0) return null;
    const today = new Date();
    const dayIndex = (today.getFullYear() * 365 + today.getMonth() * 31 + today.getDate()) % recipes.length;
    return recipes[dayIndex];
  }, [recipes]);

  // Sort function
  const sortRecipes = (list: typeof recipes) => {
    switch (sortBy) {
      case "time-asc": return [...list].sort((a, b) => a.totalTime - b.totalTime);
      case "time-desc": return [...list].sort((a, b) => b.totalTime - a.totalTime);
      case "rating-desc": return [...list].sort((a, b) => (ratings[b.id] || 0) - (ratings[a.id] || 0));
      case "made-desc": return [...list].sort((a, b) => (madeCount[b.id] || 0) - (madeCount[a.id] || 0));
      case "alpha": return [...list].sort((a, b) => a.title.localeCompare(b.title));
      default: return list;
    }
  };

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    const filtered = recipes.filter((recipe) => {
      const matchesSearch =
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
      // AND logic: recipe must match ALL selected tags
      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.every((tag) => {
          if (tag === "Family Recipe") return recipe.isFamily;
          return recipe.tags.includes(tag);
        });
      return matchesSearch && matchesTags;
    });
    return sortRecipes(filtered);
  }, [recipes, searchQuery, selectedTags, sortBy, ratings, madeCount]);

  const favoriteRecipes = useMemo(
    () => sortRecipes(filteredRecipes.filter((r) => favorites.includes(r.id))),
    [filteredRecipes, favorites, sortBy]
  );

  const discoveryRecipes = useMemo(
    () => sortRecipes(filteredRecipes.filter((r) => !favorites.includes(r.id) && (ratings[r.id] || 0) < 4)),
    [filteredRecipes, favorites, ratings, sortBy]
  );

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleRecipeClick = (recipeId: string) => {
    setLocation(`/recipe/${recipeId}`);
  };

  const handleFavoriteToggle = (recipeId: string) => {
    const isNowFav = !favorites.includes(recipeId);
    setFavorites((prev) =>
      prev.includes(recipeId) ? prev.filter((id) => id !== recipeId) : [...prev, recipeId]
    );
    toast.success(isNowFav ? "Added to favorites!" : "Removed from favorites");
  };

  const handleRateClick = (recipeId: string, rating: number) => {
    setRatings((prev) => ({ ...prev, [recipeId]: rating }));
    toast.success(`Rated ${rating} star${rating !== 1 ? "s" : ""}!`);
  };

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTags([]);
    setSortBy("default");
  };

  const hasActiveFilters = searchQuery !== "" || selectedTags.length > 0 || sortBy !== "default";

  const RecipeGrid = ({ items }: { items: typeof recipes }) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
      {items.map((recipe) => (
        <RecipeCard
          key={recipe.id}
          recipe={recipe}
          isFavorite={favorites.includes(recipe.id)}
          isInCart={isInCart(recipe.id)}
          rating={ratings[recipe.id] || 0}
          madeCount={madeCount[recipe.id] || 0}
          onFavoriteToggle={handleFavoriteToggle}
          onCartToggle={(id) => {
            if (isInCart(id)) {
              removeFromCart(id);
              toast.success("Removed from cart");
            } else {
              addToCart(id);
              toast.success("Added to cart! 🛒");
            }
          }}
          onRateClick={handleRateClick}
          onClick={() => handleRecipeClick(recipe.id)}
        />
      ))}
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="container flex items-center justify-between h-14">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍳</span>
            <div>
              <h1 className="font-heading text-lg font-semibold text-foreground leading-none">
                Mike's Family Recipes
              </h1>
              <p className="text-xs text-muted-foreground">Easy meals for busy families</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLocation("/cart")}
              className="hidden sm:flex items-center gap-1.5 relative"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              Cart
              {cartIds.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">
                  {cartIds.length}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation("/cart")}
              className="sm:hidden relative"
            >
              <ShoppingCart className="w-4 h-4" />
              {cartIds.length > 0 && (
                <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-primary text-primary-foreground text-[9px] font-bold">
                  {cartIds.length}
                </span>
              )}
            </Button>
            {switchable && toggleTheme && (
              <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Hero / Recipe of the Day */}
      {!loading && recipeOfTheDay && (
        <div
          className="bg-gradient-to-r from-primary/10 via-accent/20 to-secondary/30 border-b border-border cursor-pointer group"
          onClick={() => handleRecipeClick(recipeOfTheDay.id)}
        >
          <div className="container py-5 flex items-center gap-4">
            <div className="text-5xl select-none group-hover:scale-110 transition-transform duration-300 shrink-0">
              {recipeOfTheDay.imageEmoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Recipe of the Day
                </span>
                {recipeOfTheDay.isFamily && (
                  <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded-full font-medium">
                    Family Recipe
                  </span>
                )}
              </div>
              <h2 className="font-heading text-xl font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                {recipeOfTheDay.title}
              </h2>
              <p className="text-sm text-muted-foreground line-clamp-1 mt-0.5">
                {recipeOfTheDay.description}
              </p>
            </div>
            <div className="shrink-0 hidden sm:flex flex-col items-end gap-1 text-xs text-muted-foreground">
              <span>{recipeOfTheDay.totalTime}m total</span>
              <span>Serves {recipeOfTheDay.servings}</span>
              <span className="text-primary font-medium">{recipeOfTheDay.difficulty}</span>
            </div>
          </div>
        </div>
      )}

      <div className="container py-6">
        {/* Search + Filter bar */}
        <div className="flex gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search recipes, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-card"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            size="icon"
            onClick={() => setShowFilters(!showFilters)}
            className="shrink-0"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </Button>
        </div>

        {/* Expandable filters panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-lg p-4 mb-4 space-y-4">
            {/* Sort */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Sort by</p>
              <div className="flex flex-wrap gap-2">
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSortBy(opt.value)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      sortBy === opt.value
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            {/* Tags grouped by category */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Filter by tag</p>
                {selectedTags.length > 1 && (
                  <span className="text-xs text-muted-foreground italic">All selected tags must match</span>
                )}
              </div>
              {TAG_GROUPS.map((group) => (
                <div key={group.label}>
                  <p className="text-xs text-muted-foreground/60 mb-1.5">{group.label}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {group.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagToggle(tag)}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedTags.includes(tag)
                            ? "bg-primary text-primary-foreground ring-2 ring-primary/30"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/70"
                        }`}
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground">
                <X className="w-3.5 h-3.5 mr-1" />
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {/* Active filter chips */}
        {selectedTags.length > 0 && !showFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedTags.map((tag) => (
              <button
                key={tag}
                onClick={() => handleTagToggle(tag)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-primary text-primary-foreground"
              >
                {tag}
                <X className="w-3 h-3" />
              </button>
            ))}
            <button
              onClick={() => setSelectedTags([])}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Clear
            </button>
          </div>
        )}

        {/* Stats bar */}
        {!loading && (
          <div className="flex items-center gap-4 mb-5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <ChefHat className="w-4 h-4" />
              <strong className="text-foreground">{recipes.length}</strong> recipes
            </span>
            <span className="flex items-center gap-1.5">
              <Heart className="w-4 h-4 fill-rose-400 text-rose-400" />
              <strong className="text-foreground">{favorites.length}</strong> favorites
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-base">👨‍👩‍👧‍👦</span>
              <strong className="text-foreground">{recipes.filter(r => r.isFamily).length}</strong> family recipes
            </span>
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 bg-card border border-border h-10">
            <TabsTrigger value="browse" className="flex items-center gap-1.5 text-sm">
              <Search className="w-3.5 h-3.5" />
              Browse
              {!loading && (
                <span className="ml-1 text-xs bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                  {filteredRecipes.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-1.5 text-sm">
              <Heart className="w-3.5 h-3.5" />
              Favorites
              {favorites.length > 0 && (
                <span className="ml-1 text-xs bg-rose-100 text-rose-600 px-1.5 py-0.5 rounded-full">
                  {favorites.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="discover" className="flex items-center gap-1.5 text-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Discover
            </TabsTrigger>
          </TabsList>

          {/* Browse tab */}
          <TabsContent value="browse" className="space-y-6 page-enter">
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-72 rounded-lg" />
                ))}
              </div>
            ) : filteredRecipes.length === 0 ? (
              <Empty className="border-dashed border-border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">🔍</EmptyMedia>
                  <EmptyTitle>No recipes found</EmptyTitle>
                  <EmptyDescription>
                    Try adjusting your search or filters
                  </EmptyDescription>
                </EmptyHeader>
                {hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={clearFilters} className="mt-3">
                    Clear filters
                  </Button>
                )}
              </Empty>
            ) : (
              <RecipeGrid items={filteredRecipes} />
            )}
          </TabsContent>

          {/* Favorites tab */}
          <TabsContent value="favorites" className="space-y-6 page-enter">
            {favoriteRecipes.length === 0 ? (
              <Empty className="border-dashed border-border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">💝</EmptyMedia>
                  <EmptyTitle>No favorites yet</EmptyTitle>
                  <EmptyDescription>
                    Tap the heart on any recipe to save it here
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <RecipeGrid items={favoriteRecipes} />
            )}
          </TabsContent>

          {/* Discover tab */}
          <TabsContent value="discover" className="space-y-6 page-enter">
            <div className="bg-secondary/50 border border-border rounded-lg p-4 mb-4">
              <h3 className="font-heading text-base font-semibold mb-1">Try Something New</h3>
              <p className="text-sm text-muted-foreground">
                Recipes you haven't favorited or highly rated yet — perfect for your next family dinner adventure.
              </p>
            </div>
            {discoveryRecipes.length === 0 ? (
              <Empty className="border-dashed border-border">
                <EmptyHeader>
                  <EmptyMedia variant="icon">🎉</EmptyMedia>
                  <EmptyTitle>You've explored everything!</EmptyTitle>
                  <EmptyDescription>
                    Rate more recipes to get new suggestions
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <RecipeGrid items={discoveryRecipes.slice(0, 12)} />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border mt-12 py-6 text-center text-xs text-muted-foreground">
        <p className="font-handwriting text-base text-foreground/60 mb-1">Made with love for the family</p>
        <p>{recipes.length} recipes · {favorites.length} favorites</p>
      </footer>
    </div>
  );
}
