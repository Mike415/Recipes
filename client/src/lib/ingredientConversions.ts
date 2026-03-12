/**
 * Ingredient Shopping Conversion Library
 *
 * Converts recipe measurements (e.g. "1 cup minced onion") into practical
 * store quantities (e.g. "1 large onion") that make sense when shopping.
 *
 * Strategy:
 * 1. Normalize the ingredient name (strip prep words like "minced", "chopped")
 * 2. Look up a conversion rule for that ingredient
 * 3. Apply the rule to produce a store-friendly quantity + unit
 * 4. Return both the converted display AND the original as a note
 */

export interface ConversionResult {
  /** The store-friendly display string, e.g. "2 medium onions" */
  storeQty: string;
  /** The original recipe amount for reference, e.g. "2 cups" */
  recipeQty: string;
  /** Whether a conversion was applied */
  converted: boolean;
}

// ---------------------------------------------------------------------------
// Unit normalization — convert everything to cups (volume) or oz (weight)
// ---------------------------------------------------------------------------

/** Normalize a unit string to a canonical form */
function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().trim();
  const map: Record<string, string> = {
    cup: "cup", cups: "cup",
    tbsp: "tbsp", tablespoon: "tbsp", tablespoons: "tbsp",
    tsp: "tsp", teaspoon: "tsp", teaspoons: "tsp",
    oz: "oz", ounce: "oz", ounces: "oz",
    lb: "lb", lbs: "lb", pound: "lb", pounds: "lb",
    g: "g", gram: "g", grams: "g",
    clove: "clove", cloves: "clove",
    bunch: "bunch", bunches: "bunch",
    sprig: "sprig", sprigs: "sprig",
    stalk: "stalk", stalks: "stalk",
    slice: "slice", slices: "slice",
    piece: "piece", pieces: "piece",
    can: "can", cans: "can",
    pint: "pint", pints: "pint",
    quart: "quart", quarts: "quart",
    medium: "medium", large: "large", small: "small",
    whole: "whole", count: "count",
  };
  return map[u] ?? u;
}

/** Convert any volume/weight unit to cups for comparison */
function toCups(amount: number, unit: string): number | null {
  const u = normalizeUnit(unit);
  switch (u) {
    case "cup":   return amount;
    case "tbsp":  return amount / 16;
    case "tsp":   return amount / 48;
    case "pint":  return amount * 2;
    case "quart": return amount * 4;
    default: return null;
  }
}

/** Convert oz to cups for liquids (approximate) */
function ozToCups(oz: number): number {
  return oz / 8;
}

// ---------------------------------------------------------------------------
// Ingredient name normalization — strip prep descriptors
// ---------------------------------------------------------------------------

const PREP_WORDS = [
  "minced", "chopped", "diced", "sliced", "grated", "shredded", "julienned",
  "peeled", "seeded", "crushed", "pressed", "torn", "packed", "loosely packed",
  "thinly sliced", "roughly chopped", "finely chopped", "coarsely chopped",
  "freshly squeezed", "freshly grated", "freshly ground",
  "frozen", "fresh", "dried", "canned", "cooked", "roasted", "toasted",
  "halved", "quartered", "trimmed", "stemmed", "deveined",
  "optional", "for serving", "for garnish", "to taste",
];

/** Strip prep words and parenthetical notes from an ingredient name */
export function normalizeIngredientName(name: string): string {
  let n = name.toLowerCase();
  // Remove parenthetical notes like "(2 cloves)" or "(about 1 lb)"
  n = n.replace(/\([^)]*\)/g, "");
  // Remove prep words
  for (const word of PREP_WORDS) {
    n = n.replace(new RegExp(`\\b${word}\\b`, "gi"), "");
  }
  // Collapse whitespace
  n = n.replace(/\s+/g, " ").trim();
  // Remove trailing commas/dashes
  n = n.replace(/[,\-]+$/, "").trim();
  return n;
}

// ---------------------------------------------------------------------------
// Conversion rules
// Each rule: given amount in cups (or oz/lb for weight items), return store qty
// ---------------------------------------------------------------------------

interface ConversionRule {
  /** Keywords that identify this ingredient (checked against normalized name) */
  keywords: string[];
  /** Convert recipe amount to store quantity */
  convert: (amount: number, unit: string, originalAmount: number) => string | null;
}

/** Round up to a sensible whole/half number */
function roundUpToHalf(n: number): number {
  return Math.ceil(n * 2) / 2;
}

function pluralize(count: number, singular: string, plural?: string): string {
  const p = plural ?? singular + "s";
  return count === 1 ? `1 ${singular}` : `${count} ${p}`;
}

function formatCount(n: number): string {
  if (n === 0.5) return "½";
  if (n === 1.5) return "1½";
  if (n === 2.5) return "2½";
  if (n % 1 === 0) return String(n);
  return String(n);
}

const CONVERSION_RULES: ConversionRule[] = [
  // ── ALLIUMS ──────────────────────────────────────────────────────────────
  {
    keywords: ["yellow onion", "white onion", "sweet onion", "spanish onion", "onion"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups === null) return null;
      // 1 medium onion ≈ 1 cup chopped; 1 large ≈ 1.5 cups
      const count = Math.ceil(cups / 1);
      if (count <= 0) return null;
      return pluralize(count, "medium onion");
    },
  },
  {
    keywords: ["red onion"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups === null) return null;
      const count = Math.ceil(cups / 1);
      if (count <= 0) return null;
      return pluralize(count, "red onion");
    },
  },
  {
    keywords: ["shallot"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups === null) return null;
      // 1 shallot ≈ ¼ cup minced
      const count = Math.ceil(cups / 0.25);
      if (count <= 0) return null;
      return pluralize(count, "shallot");
    },
  },
  {
    keywords: ["scallion", "green onion"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups === null) return null;
      // 1 scallion ≈ 2 tbsp (⅛ cup) sliced
      const count = Math.ceil(cups / 0.125);
      if (count <= 0) return null;
      return pluralize(count, "scallion");
    },
  },
  {
    keywords: ["garlic clove", "garlic"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      // Already in cloves
      if (u === "clove" || u === "whole" || u === "count" || u === "") {
        if (amount <= 0) return null;
        const count = Math.ceil(amount);
        return `${count} garlic clove${count !== 1 ? "s" : ""}`;
      }
      // tsp: 1 tsp minced ≈ 1 clove
      if (u === "tsp") {
        const count = Math.ceil(amount);
        return `${count} garlic clove${count !== 1 ? "s" : ""}`;
      }
      // tbsp: 1 tbsp ≈ 3 cloves
      if (u === "tbsp") {
        const count = Math.ceil(amount * 3);
        return `${count} garlic clove${count !== 1 ? "s" : ""}`;
      }
      // cup: 1 cup ≈ 1 head (about 10-12 cloves)
      if (u === "cup") {
        const heads = Math.ceil(amount);
        return `${heads} head${heads !== 1 ? "s" : ""} of garlic`;
      }
      return null;
    },
  },
  {
    keywords: ["leek"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups === null) return null;
      // 1 leek ≈ 1 cup sliced
      const count = Math.ceil(cups);
      return pluralize(count, "leek");
    },
  },

  // ── FRESH GINGER ─────────────────────────────────────────────────────────
  {
    keywords: ["fresh ginger", "ginger root", "ginger"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      // 1 tbsp grated ≈ 1 inch piece
      if (u === "tbsp") {
        const inches = Math.ceil(amount);
        return `${inches}-inch piece fresh ginger`;
      }
      if (u === "tsp") {
        const inches = Math.ceil(amount / 3);
        return `${inches}-inch piece fresh ginger`;
      }
      return null;
    },
  },

  // ── CITRUS ───────────────────────────────────────────────────────────────
  {
    keywords: ["lemon juice", "fresh lemon juice", "freshly squeezed lemon"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups !== null) {
        // 1 lemon ≈ 3 tbsp (3/16 cup) juice
        const count = Math.ceil(cups / (3 / 16));
        return pluralize(count, "lemon");
      }
      const u = normalizeUnit(unit);
      if (u === "oz") {
        const count = Math.ceil(amount / 1.5);
        return pluralize(count, "lemon");
      }
      return null;
    },
  },
  {
    keywords: ["lime juice", "fresh lime juice"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups !== null) {
        // 1 lime ≈ 2 tbsp juice
        const count = Math.ceil(cups / (2 / 16));
        return pluralize(count, "lime");
      }
      return null;
    },
  },
  {
    keywords: ["lemon zest", "lemon"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "tsp" || u === "tbsp") {
        // 1 lemon yields about 1 tbsp zest
        const count = u === "tsp" ? Math.ceil(amount / 3) : Math.ceil(amount);
        return pluralize(count, "lemon");
      }
      return null;
    },
  },
  {
    keywords: ["orange juice"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups !== null) {
        // 1 orange ≈ ⅓ cup juice
        const count = Math.ceil(cups / (1 / 3));
        return pluralize(count, "orange");
      }
      return null;
    },
  },

  // ── LEAFY GREENS ─────────────────────────────────────────────────────────
  {
    keywords: ["baby spinach", "fresh spinach", "spinach"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      // Sold in 5oz or 10oz bags
      if (u === "oz" || u === "ounce") {
        const bags = Math.ceil(amount / 5);
        return `${bags} (5 oz) bag${bags !== 1 ? "s" : ""} spinach`;
      }
      if (u === "cup") {
        // 1 cup packed ≈ 1 oz
        const oz = amount;
        const bags = Math.ceil(oz / 5);
        return `${bags} (5 oz) bag${bags !== 1 ? "s" : ""} spinach`;
      }
      return null;
    },
  },
  {
    keywords: ["arugula"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "oz") {
        const bags = Math.ceil(amount / 5);
        return `${bags} (5 oz) bag${bags !== 1 ? "s" : ""} arugula`;
      }
      if (u === "cup") {
        const bags = Math.ceil(amount / 5);
        return `${bags} (5 oz) bag${bags !== 1 ? "s" : ""} arugula`;
      }
      return null;
    },
  },
  {
    keywords: ["kale"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup" || u === "oz") {
        return "1 bunch kale";
      }
      return null;
    },
  },

  // ── CRUCIFEROUS ──────────────────────────────────────────────────────────
  {
    keywords: ["broccoli floret", "broccoli"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        // 1 cup florets ≈ ¼ head; 4 cups ≈ 1 head
        const heads = roundUpToHalf(amount / 4);
        if (heads <= 0.5) return "½ head broccoli";
        if (heads === 1) return "1 head broccoli";
        return `${formatCount(heads)} heads broccoli`;
      }
      if (u === "oz") {
        // Sold in 12oz bags or as whole heads (~1 lb)
        if (amount <= 12) return "1 (12 oz) bag broccoli florets";
        return `${Math.ceil(amount / 12)} (12 oz) bags broccoli florets`;
      }
      if (u === "lb") {
        const count = Math.ceil(amount);
        return `${count} lb broccoli`;
      }
      return null;
    },
  },
  {
    keywords: ["cauliflower"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        const heads = Math.ceil(amount / 4);
        return pluralize(heads, "head of cauliflower", "heads of cauliflower");
      }
      return null;
    },
  },
  {
    keywords: ["brussels sprout"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "oz" || u === "lb") {
        const lbs = u === "lb" ? amount : amount / 16;
        return `${Math.ceil(lbs)} lb Brussels sprouts`;
      }
      return null;
    },
  },

  // ── MUSHROOMS ────────────────────────────────────────────────────────────
  {
    keywords: ["cremini mushroom", "baby bella mushroom", "button mushroom", "mushroom"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "oz") {
        // Sold in 8oz or 16oz packages
        const pkgs = Math.ceil(amount / 8);
        return `${pkgs} (8 oz) package${pkgs !== 1 ? "s" : ""} mushrooms`;
      }
      if (u === "lb") {
        return `${Math.ceil(amount)} lb mushrooms`;
      }
      if (u === "cup") {
        // 1 cup sliced ≈ 3 oz
        const oz = amount * 3;
        const pkgs = Math.ceil(oz / 8);
        return `${pkgs} (8 oz) package${pkgs !== 1 ? "s" : ""} mushrooms`;
      }
      return null;
    },
  },

  // ── ROOT VEGETABLES ───────────────────────────────────────────────────────
  {
    keywords: ["carrot"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        // 1 medium carrot ≈ ½ cup sliced/shredded
        const count = Math.ceil(amount / 0.5);
        return pluralize(count, "medium carrot");
      }
      if (u === "oz") {
        // Sold in 1 lb bags
        const bags = Math.ceil(amount / 16);
        return `${bags} lb bag carrots`;
      }
      if (u === "lb") {
        return `${Math.ceil(amount)} lb carrots`;
      }
      return null;
    },
  },
  {
    keywords: ["celery stalk", "celery"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        // 1 stalk ≈ ½ cup sliced
        const stalks = Math.ceil(amount / 0.5);
        return pluralize(stalks, "celery stalk");
      }
      if (u === "stalk") {
        return pluralize(Math.ceil(amount), "celery stalk");
      }
      return null;
    },
  },
  {
    keywords: ["potato"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "lb" || u === "lbs") {
        return `${amount} lb potatoes`;
      }
      if (u === "cup") {
        // 1 medium potato ≈ 1 cup cubed
        const count = Math.ceil(amount);
        return pluralize(count, "medium potato");
      }
      return null;
    },
  },
  {
    keywords: ["sweet potato"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "lb") return `${amount} lb sweet potatoes`;
      if (u === "cup") {
        const count = Math.ceil(amount);
        return pluralize(count, "medium sweet potato");
      }
      return null;
    },
  },

  // ── PEPPERS ───────────────────────────────────────────────────────────────
  {
    keywords: ["bell pepper", "red pepper", "green pepper", "yellow pepper", "orange pepper"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        // 1 bell pepper ≈ 1 cup diced
        const count = Math.ceil(amount);
        return pluralize(count, "bell pepper");
      }
      if (u === "oz") {
        const count = Math.ceil(amount / 6);
        return pluralize(count, "bell pepper");
      }
      return null;
    },
  },
  {
    keywords: ["jalapeño", "jalapeno"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        const count = Math.ceil(amount * 4);
        return pluralize(count, "jalapeño");
      }
      return null;
    },
  },

  // ── TOMATOES ─────────────────────────────────────────────────────────────
  {
    keywords: ["cherry tomato", "grape tomato"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        const pints = Math.ceil(amount / 2);
        return `${pints} pint${pints !== 1 ? "s" : ""} cherry tomatoes`;
      }
      if (u === "oz") {
        return "1 pint cherry tomatoes";
      }
      return null;
    },
  },
  {
    keywords: ["roma tomato", "plum tomato", "tomato"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        // 1 medium tomato ≈ ¾ cup diced
        const count = Math.ceil(amount / 0.75);
        return pluralize(count, "medium tomato");
      }
      if (u === "lb") {
        return `${amount} lb tomatoes`;
      }
      return null;
    },
  },

  // ── CUCUMBERS / ZUCCHINI ─────────────────────────────────────────────────
  {
    keywords: ["cucumber"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        const count = Math.ceil(amount / 1.5);
        return pluralize(count, "cucumber");
      }
      return null;
    },
  },
  {
    keywords: ["zucchini", "courgette"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        const count = Math.ceil(amount / 1.5);
        return pluralize(count, "zucchini");
      }
      if (u === "oz" || u === "lb") {
        const lbs = u === "lb" ? amount : amount / 16;
        return `${Math.ceil(lbs)} lb zucchini`;
      }
      return null;
    },
  },

  // ── CORN ─────────────────────────────────────────────────────────────────
  {
    keywords: ["corn kernel", "corn"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        // 1 ear ≈ ¾ cup kernels
        const ears = Math.ceil(amount / 0.75);
        return pluralize(ears, "ear of corn", "ears of corn");
      }
      return null;
    },
  },

  // ── AVOCADO ───────────────────────────────────────────────────────────────
  {
    keywords: ["avocado"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        // 1 avocado ≈ ¾ cup mashed/diced
        const count = Math.ceil(amount / 0.75);
        return pluralize(count, "avocado");
      }
      return null;
    },
  },

  // ── FRESH HERBS ───────────────────────────────────────────────────────────
  {
    keywords: ["fresh parsley", "flat-leaf parsley", "italian parsley", "parsley"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup" || u === "tbsp") {
        return "1 bunch fresh parsley";
      }
      return null;
    },
  },
  {
    keywords: ["fresh cilantro", "cilantro"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup" || u === "tbsp") {
        return "1 bunch fresh cilantro";
      }
      return null;
    },
  },
  {
    keywords: ["fresh basil", "basil leaves", "basil"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup" || u === "tbsp") {
        return "1 bunch fresh basil";
      }
      return null;
    },
  },
  {
    keywords: ["fresh mint", "mint leaves", "mint"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup" || u === "tbsp") {
        return "1 bunch fresh mint";
      }
      return null;
    },
  },
  {
    keywords: ["fresh dill", "dill"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup" || u === "tbsp") {
        return "1 bunch fresh dill";
      }
      return null;
    },
  },
  {
    keywords: ["fresh thyme", "thyme sprig", "thyme"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "sprig" || u === "cup" || u === "tbsp") {
        return "1 bunch fresh thyme";
      }
      return null;
    },
  },
  {
    keywords: ["fresh rosemary", "rosemary sprig", "rosemary"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "sprig" || u === "cup" || u === "tbsp") {
        return "1 bunch fresh rosemary";
      }
      return null;
    },
  },
  {
    keywords: ["fresh sage", "sage"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "sprig" || u === "cup" || u === "tbsp") {
        return "1 bunch fresh sage";
      }
      return null;
    },
  },
  {
    keywords: ["chive"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup" || u === "tbsp") {
        return "1 bunch chives";
      }
      return null;
    },
  },

  // ── DAIRY ─────────────────────────────────────────────────────────────────
  {
    keywords: ["heavy cream", "heavy whipping cream", "whipping cream"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups === null) return null;
      if (cups <= 0.5) return "1 small (½ pint) heavy cream";
      if (cups <= 1) return "1 (½ pint) heavy cream";
      if (cups <= 2) return "1 pint heavy cream";
      return `${Math.ceil(cups / 2)} pints heavy cream`;
    },
  },
  {
    keywords: ["sour cream"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups === null) return null;
      if (cups <= 1) return "1 (8 oz) container sour cream";
      return `1 (16 oz) container sour cream`;
    },
  },
  {
    keywords: ["cream cheese"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "oz") {
        const pkgs = Math.ceil(amount / 8);
        return `${pkgs} (8 oz) block${pkgs !== 1 ? "s" : ""} cream cheese`;
      }
      if (u === "cup") {
        // 8 oz ≈ 1 cup
        const pkgs = Math.ceil(amount);
        return `${pkgs} (8 oz) block${pkgs !== 1 ? "s" : ""} cream cheese`;
      }
      return null;
    },
  },
  {
    keywords: ["shredded mozzarella", "mozzarella"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        // 1 cup shredded ≈ 4 oz; sold in 8oz bags
        const oz = amount * 4;
        const bags = Math.ceil(oz / 8);
        return `${bags} (8 oz) bag${bags !== 1 ? "s" : ""} shredded mozzarella`;
      }
      if (u === "oz") {
        const bags = Math.ceil(amount / 8);
        return `${bags} (8 oz) bag${bags !== 1 ? "s" : ""} shredded mozzarella`;
      }
      return null;
    },
  },
  {
    keywords: ["shredded cheddar", "cheddar cheese", "cheddar"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        const oz = amount * 4;
        const bags = Math.ceil(oz / 8);
        return `${bags} (8 oz) bag${bags !== 1 ? "s" : ""} shredded cheddar`;
      }
      if (u === "oz") {
        const bags = Math.ceil(amount / 8);
        return `${bags} (8 oz) bag${bags !== 1 ? "s" : ""} shredded cheddar`;
      }
      return null;
    },
  },
  {
    keywords: ["parmesan", "parmigiano"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        // 1 cup grated ≈ 3 oz; sold in 5oz wedges
        const oz = amount * 3;
        if (oz <= 5) return "1 (5 oz) wedge Parmesan";
        return `${Math.ceil(oz / 5)} (5 oz) wedges Parmesan`;
      }
      if (u === "oz") {
        if (amount <= 5) return "1 (5 oz) wedge Parmesan";
        return `${Math.ceil(amount / 5)} (5 oz) wedges Parmesan`;
      }
      return null;
    },
  },
  {
    keywords: ["ricotta"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "cup") {
        if (amount <= 1) return "1 (15 oz) container ricotta";
        return `${Math.ceil(amount / 2)} (15 oz) containers ricotta`;
      }
      if (u === "oz") {
        if (amount <= 15) return "1 (15 oz) container ricotta";
        return `${Math.ceil(amount / 15)} (15 oz) containers ricotta`;
      }
      return null;
    },
  },
  {
    keywords: ["butter"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      // Butter is sold in sticks (½ cup / 4 oz / 8 tbsp each)
      if (u === "tbsp") {
        const sticks = Math.ceil(amount / 8);
        return `${sticks} stick${sticks !== 1 ? "s" : ""} butter (${amount} tbsp)`;
      }
      if (u === "cup") {
        const sticks = Math.ceil(amount * 2);
        return `${sticks} stick${sticks !== 1 ? "s" : ""} butter`;
      }
      if (u === "oz") {
        const sticks = Math.ceil(amount / 4);
        return `${sticks} stick${sticks !== 1 ? "s" : ""} butter`;
      }
      return null;
    },
  },

  // ── EGGS ──────────────────────────────────────────────────────────────────
  {
    keywords: ["egg"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "" || u === "large" || u === "medium" || u === "whole" || u === "count") {
        const count = Math.ceil(amount);
        return `${count} egg${count !== 1 ? "s" : ""}`;
      }
      return null;
    },
  },

  // ── PROTEINS ─────────────────────────────────────────────────────────────
  {
    keywords: ["chicken breast", "boneless skinless chicken breast"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "" || u === "count" || u === "piece" || u === "whole") {
        const count = Math.ceil(amount);
        return `${count} boneless chicken breast${count !== 1 ? "s" : ""}`;
      }
      if (u === "lb") {
        return `${amount} lb chicken breasts`;
      }
      if (u === "cup") {
        // Cooked/shredded: 1 cup ≈ 5 oz cooked ≈ 6 oz raw
        const lbs = Math.ceil((amount * 6) / 16 * 10) / 10;
        return `~${lbs} lb chicken breasts`;
      }
      return null;
    },
  },
  {
    keywords: ["chicken thigh"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "" || u === "count" || u === "piece") {
        const count = Math.ceil(amount);
        return `${count} chicken thigh${count !== 1 ? "s" : ""}`;
      }
      if (u === "lb") return `${amount} lb chicken thighs`;
      return null;
    },
  },
  {
    keywords: ["ground beef", "ground turkey", "ground pork", "ground chicken"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "lb") return `${amount} lb ${amount === 1 ? "ground" : "ground"} meat`;
      return null;
    },
  },
  {
    keywords: ["shrimp"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "lb") return `${amount} lb shrimp`;
      if (u === "oz") return `${Math.ceil(amount / 16)} lb shrimp`;
      return null;
    },
  },
  {
    keywords: ["salmon fillet", "salmon"],
    convert: (amount, unit) => {
      const u = normalizeUnit(unit);
      if (u === "oz") {
        const lbs = (amount / 16).toFixed(1);
        return `${lbs} lb salmon`;
      }
      if (u === "lb") return `${amount} lb salmon`;
      return null;
    },
  },

  // ── PANTRY (cans/packages) ────────────────────────────────────────────────
  {
    keywords: ["chicken broth", "chicken stock", "vegetable broth", "vegetable stock", "beef broth", "beef stock"],
    convert: (amount, unit) => {
      const cups = toCups(amount, unit);
      if (cups === null) return null;
      // Sold in 14.5oz (≈1.8 cups) or 32oz (4 cups) cartons
      if (cups <= 2) return "1 (14.5 oz) can broth";
      if (cups <= 4) return "1 (32 oz) carton broth";
      return `${Math.ceil(cups / 4)} (32 oz) cartons broth`;
    },
  },
];

// ---------------------------------------------------------------------------
// Main conversion function
// ---------------------------------------------------------------------------

/** Parse a fraction string like "1/2", "3/4", "1 1/2" or decimal "1.5" to a number */
export function parseAmount(amount: string | number): number {
  if (typeof amount === "number") return amount;
  const s = String(amount).trim();
  // Mixed number: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3]);
  // Fraction: "1/2"
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) return parseInt(frac[1]) / parseInt(frac[2]);
  // Decimal or integer
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

/**
 * Convert a recipe ingredient to a store-friendly shopping quantity.
 * Returns the original if no conversion rule matches.
 */
export function convertToShoppingQty(
  item: string,
  amount: string | number,
  unit: string
): ConversionResult {
  const normalizedItem = normalizeIngredientName(item);
  const parsedAmount = parseAmount(amount);
  const recipeQty = [String(amount), unit].filter(Boolean).join(" ");

  // Try each rule in order — first match wins
  for (const rule of CONVERSION_RULES) {
    const matches = rule.keywords.some((kw) => normalizedItem.includes(kw));
    if (matches) {
      try {
        const result = rule.convert(parsedAmount, unit, parsedAmount);
        if (result) {
          return {
            storeQty: result,
            recipeQty,
            converted: true,
          };
        }
      } catch {
        // Rule failed, try next
      }
    }
  }

  // No conversion — return original
  return {
    storeQty: [String(amount), unit].filter(Boolean).join(" "),
    recipeQty,
    converted: false,
  };
}

/**
 * Format an ingredient for display in the shopping list.
 * Returns { display, hint } where hint is the original recipe amount (if converted).
 */
export function formatShoppingItem(
  item: string,
  amount: string | number,
  unit: string
): { display: string; hint: string | null } {
  const result = convertToShoppingQty(item, amount, unit);
  if (result.converted) {
    return {
      display: result.storeQty,
      hint: `recipe calls for ${result.recipeQty}`,
    };
  }
  return {
    display: result.storeQty,
    hint: null,
  };
}
