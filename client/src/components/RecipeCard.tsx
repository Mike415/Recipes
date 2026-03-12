import { Heart, Clock, Users, Flame } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Recipe } from "@shared/recipe-types";
import { useState } from "react";

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite?: boolean;
  rating?: number;
  onFavoriteToggle?: (recipeId: string) => void;
  onRateClick?: (recipeId: string) => void;
  onClick?: () => void;
}

export function RecipeCard({
  recipe,
  isFavorite = false,
  rating = 0,
  onFavoriteToggle,
  onRateClick,
  onClick,
}: RecipeCardProps) {
  const [hovered, setHovered] = useState(false);

  return (
    <Card
      className="overflow-hidden cursor-pointer transition-all hover:shadow-lg hover:scale-105 bg-white border-2 border-memphis-peach"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      {/* Recipe image area with emoji */}
      <div className="relative h-48 bg-gradient-to-br from-memphis-peach via-memphis-yellow to-memphis-mint flex items-center justify-center overflow-hidden">
        <div className="text-7xl">{recipe.imageEmoji}</div>

        {/* Favorite button */}
        {onFavoriteToggle && (
          <Button
            size="icon"
            variant="ghost"
            className="absolute top-2 right-2 bg-white/80 hover:bg-white rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onFavoriteToggle(recipe.id);
            }}
          >
            <Heart
              className={`w-5 h-5 ${
                isFavorite
                  ? "fill-memphis-coral text-memphis-coral"
                  : "text-gray-400"
              }`}
            />
          </Button>
        )}

        {/* Memphis decorative elements */}
        <div className="absolute top-4 left-4 w-3 h-3 bg-memphis-lilac rounded-full opacity-60" />
        <div className="absolute bottom-6 right-6 w-2 h-2 bg-black rounded-full opacity-40" />
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-heading text-lg font-bold text-foreground mb-2 line-clamp-2">
          {recipe.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
          {recipe.description}
        </p>

        {/* Quick stats */}
        <div className="flex gap-3 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {recipe.totalTime}m
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {recipe.servings}
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-4 h-4" />
            {recipe.difficulty}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {recipe.tags.slice(0, 3).map((tag) => (
            <Badge
              key={tag}
              variant="outline"
              className="text-xs bg-memphis-mint/30 text-memphis-mint border-memphis-mint"
            >
              {tag}
            </Badge>
          ))}
        </div>

        {/* Rating stars */}
        {onRateClick && (
          <div className="flex gap-1 items-center">
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRateClick(recipe.id);
                  }}
                  className="text-xl transition-transform hover:scale-125"
                >
                  {star <= rating ? "⭐" : "☆"}
                </button>
              ))}
            </div>
            {rating > 0 && (
              <span className="text-xs text-muted-foreground ml-1">
                {rating}/5
              </span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
