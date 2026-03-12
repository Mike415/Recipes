import { describe, it, expect, beforeEach, vi } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "test",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };

  return { ctx };
}

describe("recipe router", () => {
  describe("authentication", () => {
    it("should require authentication for protected procedures", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);

      try {
        await caller.recipe.toggleFavorite({
          recipeId: "test-recipe",
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });

    it("should allow public access to list recipes", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      const result = await caller.recipe.list();

      expect(result).toBeDefined();
      expect(Array.isArray(result.recipes) || result.total === 0).toBe(true);
    });
  });

  describe("input validation", () => {
    it("should reject invalid ratings", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.recipe.setRating({
          recipeId: "test-recipe",
          rating: 10,
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should reject negative ratings", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      try {
        await caller.recipe.setRating({
          recipeId: "test-recipe",
          rating: -1,
        });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("BAD_REQUEST");
      }
    });

    it("should accept valid ratings 0-5", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      for (let rating = 0; rating <= 5; rating++) {
        try {
          // This will fail due to DB not being available, but the validation should pass
          await caller.recipe.setRating({
            recipeId: "test-recipe",
            rating,
          });
        } catch (error: any) {
          // Expected to fail on DB access, not validation
          expect(error.code).not.toBe("BAD_REQUEST");
        }
      }
    });
  });

  describe("meal plan operations", () => {
    it("should require authentication for meal plan access", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      const weekStart = new Date();

      try {
        await caller.recipe.getMealPlan({ weekStart });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });
  });

  describe("shopping list operations", () => {
    it("should require authentication for shopping list access", async () => {
      const ctx: TrpcContext = {
        user: null,
        req: {
          protocol: "https",
          headers: {},
        } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      };

      const caller = appRouter.createCaller(ctx);
      const weekStart = new Date();

      try {
        await caller.recipe.getShoppingList({ weekStart });
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe("UNAUTHORIZED");
      }
    });
  });
});
