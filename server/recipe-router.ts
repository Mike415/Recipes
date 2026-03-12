import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import {
  getUserRecipeData,
  upsertUserRecipeData,
  getUserFavorites,
  getUserRecipeRatings,
  getMealPlan,
  saveMealPlanEntry,
  getShoppingList,
  addShoppingListItem,
  updateShoppingListItem,
  deleteShoppingListItem,
  clearShoppingList,
} from "./db";

export const recipeRouter = router({
  // Get all recipes (public)
  list: publicProcedure.query(async () => {
    // In production, this would fetch from a database or file system
    // For now, return empty - recipes are loaded from public/recipes/*.json on the client
    return { total: 0, recipes: [] };
  }),

  // Get single recipe by ID (public)
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      // Recipe data is loaded from public/recipes/{id}.json on the client
      return null;
    }),

  // User recipe data (favorites, ratings, notes)
  getUserData: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) return null;
      return getUserRecipeData(ctx.user.id, input.recipeId);
    }),

  // Toggle favorite
  toggleFavorite: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      const current = await getUserRecipeData(ctx.user.id, input.recipeId);
      const newFavorite = !current?.isFavorite;

      return upsertUserRecipeData(ctx.user.id, input.recipeId, {
        isFavorite: newFavorite,
      });
    }),

  // Set rating
  setRating: protectedProcedure
    .input(z.object({ recipeId: z.string(), rating: z.number().min(0).max(5) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      return upsertUserRecipeData(ctx.user.id, input.recipeId, {
        rating: input.rating,
      });
    }),

  // Set notes
  setNotes: protectedProcedure
    .input(z.object({ recipeId: z.string(), notes: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      return upsertUserRecipeData(ctx.user.id, input.recipeId, {
        notes: input.notes,
      });
    }),

  // Track made this week
  trackMade: protectedProcedure
    .input(z.object({ recipeId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      const current = await getUserRecipeData(ctx.user.id, input.recipeId);
      const newCount = (current?.madeCount || 0) + 1;

      return upsertUserRecipeData(ctx.user.id, input.recipeId, {
        madeCount: newCount,
        lastMade: new Date(),
      });
    }),

  // Get all favorites
  getFavorites: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return [];
    return getUserFavorites(ctx.user.id);
  }),

  // Get all ratings
  getRatings: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) return {};
    return getUserRecipeRatings(ctx.user.id);
  }),

  // Meal planning
  getMealPlan: protectedProcedure
    .input(z.object({ weekStart: z.date() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) return [];
      return getMealPlan(ctx.user.id, input.weekStart);
    }),

  saveMealPlanEntry: protectedProcedure
    .input(
      z.object({
        weekStart: z.date(),
        day: z.string(),
        slot: z.enum(["lunch", "dinner"]),
        recipeId: z.string().nullable(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      await saveMealPlanEntry(
        ctx.user.id,
        input.weekStart,
        input.day,
        input.slot,
        input.recipeId
      );

      return getMealPlan(ctx.user.id, input.weekStart);
    }),

  // Shopping list
  getShoppingList: protectedProcedure
    .input(z.object({ weekStart: z.date() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.user) return [];
      return getShoppingList(ctx.user.id, input.weekStart);
    }),

  addShoppingListItem: protectedProcedure
    .input(
      z.object({
        weekStart: z.date(),
        item: z.string(),
        amount: z.string(),
        unit: z.string(),
        category: z.string(),
        recipeIds: z.array(z.string()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      await addShoppingListItem(
        ctx.user.id,
        input.weekStart,
        input.item,
        input.amount,
        input.unit,
        input.category,
        input.recipeIds
      );

      return getShoppingList(ctx.user.id, input.weekStart);
    }),

  updateShoppingListItem: protectedProcedure
    .input(z.object({ id: z.number(), checked: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      await updateShoppingListItem(input.id, input.checked);
      return { success: true };
    }),

  deleteShoppingListItem: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      await deleteShoppingListItem(input.id);
      return { success: true };
    }),

  clearShoppingList: protectedProcedure
    .input(z.object({ weekStart: z.date() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new Error("Not authenticated");

      await clearShoppingList(ctx.user.id, input.weekStart);
      return { success: true };
    }),
});
