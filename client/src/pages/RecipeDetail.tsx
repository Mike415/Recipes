import { useParams, useLocation } from "wouter";
import { useRecipe } from "@/hooks/useRecipes";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Heart, Clock, Users, Flame, ChefHat, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function RecipeDetail() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { recipe, loading, error } = useRecipe(id || "");

  // Use localStorage for user data
  const [favorites, setFavorites] = useLocalStorage<string[]>("recipes_favorites", []);
  const [ratings, setRatings] = useLocalStorage<Record<string, number>>("recipes_ratings", {});
  const [notes, setNotes] = useLocalStorage<Record<string, string>>("recipes_notes", {});
  const [madeCount, setMadeCount] = useLocalStorage<Record<string, number>>("recipes_made_count", {});

  const [isFavorite, setIsFavorite] = useState(false);
  const [currentRating, setCurrentRating] = useState(0);
  const [currentNotes, setCurrentNotes] = useState("");
  const [currentMadeCount, setCurrentMadeCount] = useState(0);

  useEffect(() => {
    if (recipe && id) {
      setIsFavorite(favorites.includes(id));
      setCurrentRating(ratings[id] || 0);
      setCurrentNotes(notes[id] || "");
      setCurrentMadeCount(madeCount[id] || 0);
    }
  }, [recipe, id, favorites, ratings, notes, madeCount]);

  const handleToggleFavorite = () => {
    if (!id) return;
    if (isFavorite) {
      setFavorites((prev) => prev.filter((fav) => fav !== id));
    } else {
      setFavorites((prev) => [...prev, id]);
    }
    toast.success(isFavorite ? "Removed from favorites" : "Added to favorites");
  };

  const handleSetRating = (rating: number) => {
    if (!id) return;
    setRatings((prev) => ({
      ...prev,
      [id]: rating,
    }));
    setCurrentRating(rating);
    toast.success("Rating saved!");
  };

  const handleSaveNotes = () => {
    if (!id) return;
    setNotes((prev) => ({
      ...prev,
      [id]: currentNotes,
    }));
    toast.success("Notes saved!");
  };

  const handleTrackMade = () => {
    if (!id) return;
    const newCount = (currentMadeCount || 0) + 1;
    setMadeCount((prev) => ({
      ...prev,
      [id]: newCount,
    }));
    setCurrentMadeCount(newCount);
    toast.success("Great! Added to this week's meals");
  };

  if (loading) {
    return (
      <div className="container py-8">
        <Skeleton className="h-96 mb-8" />
        <Skeleton className="h-32 mb-4" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (error || !recipe) {
    return (
      <div className="container py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Recipe not found</h1>
        <Button onClick={() => setLocation("/")} variant="outline">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to recipes
        </Button>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-4xl">
      {/* Back button */}
      <Button
        onClick={() => setLocation("/")}
        variant="ghost"
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to recipes
      </Button>

      {/* Hero section */}
      <div className="bg-gradient-to-br from-memphis-peach via-memphis-yellow to-memphis-mint rounded-2xl p-12 mb-8 flex items-center justify-center min-h-64 relative overflow-hidden">
        <div className="text-9xl">{recipe.imageEmoji}</div>

        {/* Decorative elements */}
        <div className="absolute top-4 left-4 w-4 h-4 bg-memphis-lilac rounded-full opacity-60" />
        <div className="absolute bottom-8 right-8 w-3 h-3 bg-black rounded-full opacity-40" />
        <div className="absolute top-1/3 right-1/4 w-2 h-8 bg-memphis-coral opacity-30" />

        {/* Favorite button */}
        <Button
          size="icon"
          className="absolute top-4 right-4 rounded-full bg-white/90 hover:bg-white"
          onClick={handleToggleFavorite}
        >
          <Heart
            className={`w-6 h-6 ${
              isFavorite
                ? "fill-memphis-coral text-memphis-coral"
                : "text-gray-400"
            }`}
          />
        </Button>
      </div>

      {/* Title and meta */}
      <div className="mb-8">
        <h1 className="font-heading text-4xl font-bold mb-4 text-foreground">
          {recipe.title}
        </h1>
        <p className="text-lg text-muted-foreground mb-4">{recipe.description}</p>

        {/* Quick stats */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-memphis-coral" />
            <span className="font-semibold">{recipe.totalTime} min</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-memphis-mint" />
            <span className="font-semibold">Serves {recipe.servings}</span>
          </div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-memphis-yellow" />
            <span className="font-semibold">{recipe.difficulty}</span>
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2">
          {recipe.isFamily && (
            <Badge className="bg-memphis-coral text-white border-memphis-coral font-bold">
              ⭐ Family Recipe
            </Badge>
          )}
          {recipe.tags.map((tag) => (
            <Badge key={tag} className={`${
              tag === "Family Recipe"
                ? "bg-memphis-coral text-white border-memphis-coral"
                : "bg-memphis-mint/30 text-memphis-mint border-memphis-mint"
            }`}>
              {tag}
            </Badge>
          ))}
        </div>
      </div>

      {/* Rating and tracking */}
      <Card className="mb-8 border-memphis-lilac/30">
        <CardHeader>
          <CardTitle>Your Experience</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Rating */}
          <div>
            <label className="font-semibold mb-2 block">Rate this recipe</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleSetRating(star)}
                  className="text-3xl transition-transform hover:scale-125"
                >
                  {star <= currentRating ? "⭐" : "☆"}
                </button>
              ))}
            </div>
          </div>

          {/* Made this week */}
          <div>
            <label className="font-semibold mb-2 block">
              Made this week: <span className="text-memphis-coral">{currentMadeCount}</span>
            </label>
            <Button
              onClick={handleTrackMade}
              className="bg-memphis-mint hover:bg-memphis-mint/80"
            >
              <ChefHat className="w-4 h-4 mr-2" />
              I made this!
            </Button>
          </div>

          {/* Notes */}
          <div>
            <label className="font-semibold mb-2 block">Personal notes</label>
            <Textarea
              value={currentNotes}
              onChange={(e) => setCurrentNotes(e.target.value)}
              onBlur={handleSaveNotes}
              placeholder="Add your cooking tips, modifications, or memories..."
              className="min-h-24"
            />
          </div>
        </CardContent>
      </Card>

      {/* Ingredients */}
      <Card className="mb-8 border-memphis-peach/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">🛒</span>
            Ingredients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recipe.ingredients.map((ingredient, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 pb-3 border-b border-border last:border-0"
              >
                <div className="w-6 h-6 rounded-full bg-memphis-yellow/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold">✓</span>
                </div>
                <div className="flex-1">
                  <div className="font-semibold">{ingredient.item}</div>
                  <div className="text-sm text-muted-foreground">
                    {ingredient.amount} {ingredient.unit}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="mb-8 border-memphis-lilac/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="text-2xl">👨‍🍳</span>
            Instructions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="space-y-4">
            {recipe.instructions.map((instruction, idx) => (
              <li key={idx} className="flex gap-4">
                <div className="flex-shrink-0">
                  <div className="flex items-center justify-center h-8 w-8 rounded-full bg-memphis-coral text-white font-bold">
                    {idx + 1}
                  </div>
                </div>
                <div className="flex-1 pt-1">
                  <p className="text-foreground">{instruction}</p>
                </div>
              </li>
            ))}
          </ol>
        </CardContent>
      </Card>

      {/* YouTube Video */}
      {recipe.videoUrl && (
        <Card className="mb-8 border-memphis-coral/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">🎥</span>
              Watch on YouTube
            </CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={recipe.videoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 bg-memphis-coral text-white rounded-lg hover:bg-memphis-coral/80 transition-colors"
            >
              <span>▶</span>
              Watch Recipe Video
            </a>
            <p className="text-sm text-muted-foreground mt-3">
              Click to watch the video tutorial for this recipe on YouTube
            </p>
          </CardContent>
        </Card>
      )}

      {/* Tips */}
      {recipe.tips.length > 0 && (
        <Card className="border-memphis-mint/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <span className="text-2xl">💡</span>
              Chef's Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {recipe.tips.map((tip, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="text-memphis-mint font-bold">•</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
