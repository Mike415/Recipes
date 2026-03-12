import { useEffect, useState } from "react";
import type { Recipe } from "@shared/recipe-types";

// Use Vite's BASE_URL so paths work both locally (/) and on GitHub Pages (/Recipes/)
export const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

/** Resolve a recipe's imageUrl to an absolute path that works with the current base URL */
export function resolveImageUrl(imageUrl?: string): string | undefined {
  if (!imageUrl) return undefined;
  // If already absolute or data URL, return as-is
  if (imageUrl.startsWith('http') || imageUrl.startsWith('data:')) return imageUrl;
  // Prepend the Vite BASE so it works on GitHub Pages (/Recipes/) and locally (/)
  return `${BASE}${imageUrl}`;
}

export function useRecipes() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecipes() {
      try {
        // Load recipe index
        const indexResponse = await fetch(`${BASE}/recipes/index.json`);
        if (!indexResponse.ok) throw new Error("Failed to load recipe index");

        const index = await indexResponse.json();
        const recipeIds: string[] = index.recipes;

        // Load all recipes in parallel
        const recipePromises = recipeIds.map((id) =>
          fetch(`${BASE}/recipes/${id}.json`)
            .then((res) => res.json())
            .catch(() => null)
        );

        const loadedRecipes = await Promise.all(recipePromises);
        // Resolve imageUrl paths to work with the current base URL
        const resolvedRecipes = loadedRecipes
          .filter((r): r is Recipe => r !== null)
          .map((r) => ({
            ...r,
            imageUrl: resolveImageUrl(r.imageUrl),
          }));
        setRecipes(resolvedRecipes);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recipes");
        setRecipes([]);
      } finally {
        setLoading(false);
      }
    }

    loadRecipes();
  }, []);

  return { recipes, loading, error };
}

export function useRecipe(id: string) {
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadRecipe() {
      try {
        const response = await fetch(`${BASE}/recipes/${id}.json`);
        if (!response.ok) throw new Error("Recipe not found");

        const data = await response.json();
        // Resolve imageUrl path to work with the current base URL
        setRecipe({ ...data, imageUrl: resolveImageUrl(data.imageUrl) });
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load recipe");
        setRecipe(null);
      } finally {
        setLoading(false);
      }
    }

    loadRecipe();
  }, [id]);

  return { recipe, loading, error };
}
