import { Heart, Clock, Users, ChefHat, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Recipe } from "@shared/recipe-types";

interface RecipeCardProps {
  recipe: Recipe;
  isFavorite?: boolean;
  isInCart?: boolean;
  rating?: number;
  madeCount?: number;
  onFavoriteToggle?: (recipeId: string) => void;
  onCartToggle?: (recipeId: string) => void;
  onRateClick?: (recipeId: string, rating: number) => void;
  onClick?: () => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  Easy: "bg-green-100 text-green-700 border-green-200",
  Medium: "bg-amber-100 text-amber-700 border-amber-200",
  Hard: "bg-red-100 text-red-700 border-red-200",
};

const CARD_GRADIENTS = [
  "from-amber-50 via-orange-50 to-yellow-50",
  "from-green-50 via-emerald-50 to-teal-50",
  "from-rose-50 via-pink-50 to-red-50",
  "from-sky-50 via-blue-50 to-indigo-50",
  "from-violet-50 via-purple-50 to-fuchsia-50",
  "from-amber-50 via-yellow-50 to-lime-50",
];

function getGradient(id: string) {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return CARD_GRADIENTS[hash % CARD_GRADIENTS.length];
}

export function RecipeCard({
  recipe,
  isFavorite = false,
  isInCart = false,
  rating = 0,
  madeCount = 0,
  onFavoriteToggle,
  onCartToggle,
  onRateClick,
  onClick,
}: RecipeCardProps) {
  const gradient = getGradient(recipe.id);

  return (
    <Card
      className="overflow-hidden cursor-pointer group border border-border bg-card recipe-card-hover shadow-sm"
      onClick={onClick}
    >
      {/* Recipe image area */}
      <div className={`relative h-44 overflow-hidden ${!recipe.imageUrl ? `bg-gradient-to-br ${gradient}` : 'bg-muted'}`}>
        {recipe.imageUrl ? (
          <img
            src={recipe.imageUrl}
            alt={recipe.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => {
              // Fallback to emoji gradient on image load error
              const target = e.currentTarget;
              const parent = target.parentElement;
              if (parent) {
                parent.classList.add(`bg-gradient-to-br`, ...gradient.split(' '));
                target.style.display = 'none';
                const emoji = document.createElement('div');
                emoji.className = 'absolute inset-0 flex items-center justify-center text-6xl';
                emoji.textContent = recipe.imageEmoji || '🍽️';
                parent.appendChild(emoji);
              }
            }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-6xl select-none group-hover:scale-110 transition-transform duration-300">
              {recipe.imageEmoji}
            </div>
          </div>
        )}

        {/* Family Recipe badge */}
        {recipe.isFamily && (
          <div className="absolute top-2 left-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-primary text-primary-foreground shadow-sm">
              👨‍👩‍👧‍👦 Family Recipe
            </span>
          </div>
        )}

        {/* Action buttons: favorite + cart */}
        <div className="absolute top-2 right-2 flex flex-col gap-1">
          {onFavoriteToggle && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 bg-white/80 hover:bg-white rounded-full shadow-sm"
              onClick={(e) => {
                e.stopPropagation();
                onFavoriteToggle(recipe.id);
              }}
            >
              <Heart
                className={`w-4 h-4 transition-colors ${
                  isFavorite
                    ? "fill-rose-500 text-rose-500"
                    : "text-gray-400 group-hover:text-rose-400"
                }`}
              />
            </Button>
          )}
          {onCartToggle && (
            <Button
              size="icon"
              variant="ghost"
              className={`h-8 w-8 rounded-full shadow-sm transition-colors ${
                isInCart
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "bg-white/80 hover:bg-white text-gray-400 hover:text-primary"
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onCartToggle(recipe.id);
              }}
              title={isInCart ? "Remove from cart" : "Add to cart"}
            >
              <ShoppingCart className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Made count badge */}
        {madeCount > 0 && (
          <div className="absolute bottom-2 left-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-white/80 text-amber-700 font-medium">
              <ChefHat className="w-3 h-3" />
              Made {madeCount}×
            </span>
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Title */}
        <h3 className="font-heading text-base font-semibold text-foreground mb-1 line-clamp-2 leading-snug">
          {recipe.title}
        </h3>

        {/* Description */}
        <p className="text-xs text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
          {recipe.description}
        </p>

        {/* Quick stats row */}
        <div className="flex items-center gap-3 mb-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-primary/70" />
            <span>{recipe.totalTime}m</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="w-3.5 h-3.5 text-primary/70" />
            <span>Serves {recipe.servings}</span>
          </div>
          <Badge
            variant="outline"
            className={`text-xs px-1.5 py-0 h-4 ${DIFFICULTY_COLORS[recipe.difficulty] || ""}`}
          >
            {recipe.difficulty}
          </Badge>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {recipe.tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-secondary text-secondary-foreground"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Star rating */}
        {onRateClick && (
          <div className="flex items-center gap-1 star-rating">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={(e) => {
                  e.stopPropagation();
                  onRateClick(recipe.id, star);
                }}
                className="star text-base leading-none"
                aria-label={`Rate ${star} stars`}
              >
                <span className={star <= rating ? "text-amber-400" : "text-gray-300"}>
                  ★
                </span>
              </button>
            ))}
            {rating > 0 && (
              <span className="text-xs text-muted-foreground ml-1">{rating}/5</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
