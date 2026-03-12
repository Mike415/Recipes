export interface Recipe {
  id: string;
  title: string;
  description: string;
  imageEmoji: string;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  servings: number;
  difficulty: "Easy" | "Medium" | "Hard";
  tags: string[];
  ingredients: Ingredient[];
  instructions: string[];
  tips: string[];
  videoUrl?: string;
  isFamily?: boolean;
}

export interface Ingredient {
  item: string;
  amount: string;
  unit: string;
  category: "produce" | "protein" | "dairy" | "pantry" | "frozen" | "bakery" | "other";
}

export type TagType = "Kid Favorite" | "Quick" | "One Pan" | "Vegetarian" | "Comfort Food" | "Healthy" | "Pasta" | "Soup" | "Mexican" | "Asian" | "Italian" | "American" | "Breakfast" | "Family Recipe";

export interface MealPlanEntry {
  day: string;
  slot: "lunch" | "dinner";
  recipeId: string;
}

export interface ShoppingListItem {
  item: string;
  amount: string;
  unit: string;
  category: string;
  checked: boolean;
  recipeIds: string[];
}
