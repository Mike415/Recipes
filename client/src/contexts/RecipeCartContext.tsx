import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

const CART_KEY = "recipes_cart";
const CHECKED_KEY = "recipes_cart_checked";

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function saveToStorage<T>(key: string, value: T) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
}

interface RecipeCartContextValue {
  /** IDs of recipes currently in the cart */
  cartIds: string[];
  /** Shopping item checked state: key = "recipeId:item" */
  checkedItems: Record<string, boolean>;
  addToCart: (recipeId: string) => void;
  removeFromCart: (recipeId: string) => void;
  isInCart: (recipeId: string) => boolean;
  clearCart: () => void;
  toggleChecked: (key: string) => void;
  clearChecked: () => void;
}

const RecipeCartContext = createContext<RecipeCartContextValue | null>(null);

export function RecipeCartProvider({ children }: { children: ReactNode }) {
  const [cartIds, setCartIds] = useState<string[]>(() =>
    loadFromStorage<string[]>(CART_KEY, [])
  );
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() =>
    loadFromStorage<Record<string, boolean>>(CHECKED_KEY, {})
  );

  const addToCart = useCallback((recipeId: string) => {
    setCartIds((prev) => {
      if (prev.includes(recipeId)) return prev;
      const next = [...prev, recipeId];
      saveToStorage(CART_KEY, next);
      return next;
    });
  }, []);

  const removeFromCart = useCallback((recipeId: string) => {
    setCartIds((prev) => {
      const next = prev.filter((id) => id !== recipeId);
      saveToStorage(CART_KEY, next);
      return next;
    });
  }, []);

  const isInCart = useCallback(
    (recipeId: string) => cartIds.includes(recipeId),
    [cartIds]
  );

  const clearCart = useCallback(() => {
    setCartIds([]);
    setCheckedItems({});
    saveToStorage(CART_KEY, []);
    saveToStorage(CHECKED_KEY, {});
  }, []);

  const toggleChecked = useCallback((key: string) => {
    setCheckedItems((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveToStorage(CHECKED_KEY, next);
      return next;
    });
  }, []);

  const clearChecked = useCallback(() => {
    setCheckedItems({});
    saveToStorage(CHECKED_KEY, {});
  }, []);

  return (
    <RecipeCartContext.Provider
      value={{
        cartIds,
        checkedItems,
        addToCart,
        removeFromCart,
        isInCart,
        clearCart,
        toggleChecked,
        clearChecked,
      }}
    >
      {children}
    </RecipeCartContext.Provider>
  );
}

export function useRecipeCart() {
  const ctx = useContext(RecipeCartContext);
  if (!ctx) throw new Error("useRecipeCart must be used inside RecipeCartProvider");
  return ctx;
}
