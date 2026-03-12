import { useRecipes } from "@/hooks/useRecipes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { useHashLocation } from "@/hooks/useHashLocation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RecipeCard } from "@/components/RecipeCard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Empty, EmptyHeader, EmptyMedia, EmptyTitle, EmptyDescription } from "@/components/ui/empty";
import { Heart, Sparkles } from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";

const TAGS = [
  "Kid Favorite",
  "Quick",
  "One Pan",
  "Vegetarian",
  "Comfort Food",
  "Healthy",
  "Pasta",
  "Soup",
  "Mexican",
  "Asian",
  "Italian",
  "American",
  "Breakfast",
];

export default function Home() {
  const { recipes, loading } = useRecipes();
  const [, setLocation] = useHashLocation();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState("browse");

  // Use localStorage for favorites and ratings
  const [favorites, setFavorites] = useLocalStorage<string[]>("recipes_favorites", []);
  const [ratings, setRatings] = useLocalStorage<Record<string, number>>("recipes_ratings", {});

  // Filter recipes
  const filteredRecipes = useMemo(() => {
    return recipes.filter((recipe) => {
      const matchesSearch =
        recipe.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        recipe.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesTags =
        selectedTags.length === 0 ||
        selectedTags.some((tag) => recipe.tags.includes(tag));

      return matchesSearch && matchesTags;
    });
  }, [recipes, searchQuery, selectedTags]);

  // Get favorites
  const favoriteRecipes = useMemo(
    () => filteredRecipes.filter((r) => favorites.includes(r.id)),
    [filteredRecipes, favorites]
  );

  // Get discovery (not favorited, not highly rated)
  const discoveryRecipes = useMemo(
    () =>
      filteredRecipes.filter(
        (r) => !favorites.includes(r.id) && (ratings[r.id] || 0) < 4
      ),
    [filteredRecipes, favorites, ratings]
  );

  const handleTagToggle = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleRecipeClick = (recipeId: string) => {
    setLocation(`/#/recipe/${recipeId}`);
  };

  const handleFavoriteToggle = (recipeId: string) => {
    setFavorites((prev) =>
      prev.includes(recipeId)
        ? prev.filter((id) => id !== recipeId)
        : [...prev, recipeId]
    );
    toast.success("Updated!");
  };

  const handleRateClick = (recipeId: string, rating: number) => {
    setRatings((prev) => ({
      ...prev,
      [recipeId]: rating,
    }));
    toast.success("Rating saved!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header with Memphis design */}
      <div className="bg-gradient-to-r from-memphis-peach via-memphis-yellow to-memphis-mint py-8 relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-4 left-8 w-4 h-4 bg-memphis-lilac rounded-full opacity-60" />
        <div className="absolute bottom-4 right-12 w-3 h-3 bg-black rounded-full opacity-40" />
        <div className="absolute top-1/2 left-1/4 w-2 h-12 bg-memphis-coral opacity-20" />

        <div className="container flex items-center justify-between relative z-10">
          <div>
            <h1 className="font-heading text-4xl font-bold text-foreground drop-shadow-md">
              🍽️ Mike's Family Recipes
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Easy meals for busy families
            </p>
          </div>

          {/* Meal Plan button */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setLocation("/#/meal-plan")}
              className="bg-white/80 hover:bg-white"
            >
              📅 Meal Plan
            </Button>
          </div>
        </div>
      </div>

      <div className="container py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="browse" className="flex items-center gap-2">
              🔍 Browse
            </TabsTrigger>
            <TabsTrigger value="favorites" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Favorites
            </TabsTrigger>
            <TabsTrigger value="discover" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Discover
            </TabsTrigger>
          </TabsList>

          {/* Browse tab */}
          <TabsContent value="browse" className="space-y-6">
            {/* Search */}
            <div>
              <Input
                placeholder="Search recipes..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="mb-4 border-memphis-peach focus:border-memphis-coral"
              />
            </div>

            {/* Tag filters */}
            <div>
              <p className="font-semibold mb-3 text-sm">Filter by tags:</p>
              <div className="flex flex-wrap gap-2">
                {TAGS.map((tag) => (
                  <Badge
                    key={tag}
                    variant={selectedTags.includes(tag) ? "default" : "outline"}
                    className={`cursor-pointer transition-all ${
                      selectedTags.includes(tag)
                        ? "bg-memphis-coral text-white"
                        : "bg-memphis-mint/20 text-memphis-mint border-memphis-mint"
                    }`}
                    onClick={() => handleTagToggle(tag)}
                  >
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Recipes grid */}
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-96" />
                ))}
              </div>
            ) : filteredRecipes.length === 0 ? (
              <Empty className="border-dashed border-memphis-peach">
                <EmptyHeader>
                  <EmptyMedia variant="icon">🔍</EmptyMedia>
                  <EmptyTitle>No recipes found</EmptyTitle>
                  <EmptyDescription>
                    Try adjusting your search or filters
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isFavorite={favorites.includes(recipe.id)}
                    rating={ratings[recipe.id] || 0}
                    onFavoriteToggle={handleFavoriteToggle}
                    onRateClick={(rating) => handleRateClick(recipe.id, rating)}
                    onClick={() => handleRecipeClick(recipe.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Favorites tab */}
          <TabsContent value="favorites" className="space-y-6">
            {favoriteRecipes.length === 0 ? (
              <Empty className="border-dashed border-memphis-peach">
                <EmptyHeader>
                  <EmptyMedia variant="icon">💔</EmptyMedia>
                  <EmptyTitle>No favorites yet</EmptyTitle>
                  <EmptyDescription>
                    Click the heart on recipes to add them to your favorites
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favoriteRecipes.map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isFavorite={true}
                    rating={ratings[recipe.id] || 0}
                    onFavoriteToggle={handleFavoriteToggle}
                    onRateClick={(rating) => handleRateClick(recipe.id, rating)}
                    onClick={() => handleRecipeClick(recipe.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          {/* Discover tab */}
          <TabsContent value="discover" className="space-y-6">
            {discoveryRecipes.length === 0 ? (
              <Empty className="border-dashed border-memphis-peach">
                <EmptyHeader>
                  <EmptyMedia variant="icon">🎉</EmptyMedia>
                  <EmptyTitle>You've tried everything!</EmptyTitle>
                  <EmptyDescription>
                    Great job exploring! Rate more recipes to get new suggestions
                  </EmptyDescription>
                </EmptyHeader>
              </Empty>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {discoveryRecipes.slice(0, 6).map((recipe) => (
                  <RecipeCard
                    key={recipe.id}
                    recipe={recipe}
                    isFavorite={favorites.includes(recipe.id)}
                    rating={ratings[recipe.id] || 0}
                    onFavoriteToggle={handleFavoriteToggle}
                    onRateClick={(rating) => handleRateClick(recipe.id, rating)}
                    onClick={() => handleRecipeClick(recipe.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
