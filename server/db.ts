import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, userRecipeData, mealPlan, shoppingList } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Recipe user data helpers
export async function getUserRecipeData(userId: number, recipeId: string) {
  const db = await getDb();
  if (!db) return null;

  const result = await db
    .select()
    .from(userRecipeData)
    .where(and(eq(userRecipeData.userId, userId), eq(userRecipeData.recipeId, recipeId)))
    .limit(1);

  return result.length > 0 ? result[0] : null;
}

export async function upsertUserRecipeData(
  userId: number,
  recipeId: string,
  data: Partial<typeof userRecipeData.$inferInsert>
) {
  const db = await getDb();
  if (!db) return null;

  const existing = await getUserRecipeData(userId, recipeId);

  if (existing) {
    await db
      .update(userRecipeData)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(userRecipeData.userId, userId), eq(userRecipeData.recipeId, recipeId)));
  } else {
    await db.insert(userRecipeData).values({
      userId,
      recipeId,
      ...data,
    });
  }

  return getUserRecipeData(userId, recipeId);
}

export async function getUserFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];

  const results = await db
    .select()
    .from(userRecipeData)
    .where(and(eq(userRecipeData.userId, userId), eq(userRecipeData.isFavorite, true)));

  return results.map(r => r.recipeId);
}

export async function getUserRecipeRatings(userId: number) {
  const db = await getDb();
  if (!db) return {};

  const results = await db
    .select()
    .from(userRecipeData)
    .where(and(eq(userRecipeData.userId, userId), eq(userRecipeData.rating, 0)));

  const ratings: Record<string, number> = {};
  results.forEach(r => {
    if (r.rating > 0) {
      ratings[r.recipeId] = r.rating;
    }
  });
  return ratings;
}

// Meal plan helpers
export async function getMealPlan(userId: number, weekStart: Date) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(mealPlan)
    .where(and(eq(mealPlan.userId, userId), eq(mealPlan.weekStart, weekStart)));
}

export async function saveMealPlanEntry(
  userId: number,
  weekStart: Date,
  day: string,
  slot: "lunch" | "dinner",
  recipeId: string | null
) {
  const db = await getDb();
  if (!db) return null;

  const existing = await db
    .select()
    .from(mealPlan)
    .where(
      and(
        eq(mealPlan.userId, userId),
        eq(mealPlan.weekStart, weekStart),
        eq(mealPlan.day, day),
        eq(mealPlan.slot, slot)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    if (recipeId) {
      await db
        .update(mealPlan)
        .set({ recipeId, updatedAt: new Date() })
        .where(eq(mealPlan.id, existing[0].id));
    } else {
      // Delete if no recipe
      await db.delete(mealPlan).where(eq(mealPlan.id, existing[0].id));
    }
  } else if (recipeId) {
    await db.insert(mealPlan).values({
      userId,
      weekStart,
      day,
      slot,
      recipeId,
    });
  }
}

// Shopping list helpers
export async function getShoppingList(userId: number, weekStart: Date) {
  const db = await getDb();
  if (!db) return [];

  return db
    .select()
    .from(shoppingList)
    .where(and(eq(shoppingList.userId, userId), eq(shoppingList.weekStart, weekStart)));
}

export async function addShoppingListItem(
  userId: number,
  weekStart: Date,
  item: string,
  amount: string,
  unit: string,
  category: string,
  recipeIds: string[]
) {
  const db = await getDb();
  if (!db) return null;

  const result = await db.insert(shoppingList).values({
    userId,
    weekStart,
    item,
    amount,
    unit,
    category,
    recipeIds,
    checked: false,
  });

  return result;
}

export async function updateShoppingListItem(
  id: number,
  checked: boolean
) {
  const db = await getDb();
  if (!db) return null;

  await db.update(shoppingList).set({ checked, updatedAt: new Date() }).where(eq(shoppingList.id, id));
}

export async function deleteShoppingListItem(id: number) {
  const db = await getDb();
  if (!db) return null;

  await db.delete(shoppingList).where(eq(shoppingList.id, id));
}

export async function clearShoppingList(userId: number, weekStart: Date) {
  const db = await getDb();
  if (!db) return null;

  await db
    .delete(shoppingList)
    .where(and(eq(shoppingList.userId, userId), eq(shoppingList.weekStart, weekStart)));
}
