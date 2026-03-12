/**
 * GitHub Gist integration for cross-device persistence
 * Stores user preferences (favorites, ratings, notes, meal plans) in a private Gist
 */

const GITHUB_TOKEN = process.env.GITHUB_GIST_TOKEN || "";
const GIST_FILENAME = "recipes-user-data.json";

interface GistData {
  favorites: string[];
  ratings: Record<string, number>;
  notes: Record<string, string>;
  madeThisWeek: Record<string, number>;
  lastUpdated: number;
}

export async function getGistData(userId: string): Promise<GistData | null> {
  if (!GITHUB_TOKEN) {
    console.warn("[Gist] No GitHub token configured");
    return null;
  }

  try {
    // Get user's gists
    const response = await fetch("https://api.github.com/gists", {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!response.ok) {
      console.error("[Gist] Failed to fetch gists:", response.statusText);
      return null;
    }

    const gists = await response.json();
    const recipeGist = gists.find(
      (g: any) => g.files[GIST_FILENAME]
    );

    if (!recipeGist) {
      return null;
    }

    // Fetch gist content
    const contentResponse = await fetch(recipeGist.url, {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!contentResponse.ok) {
      return null;
    }

    const gistContent = await contentResponse.json();
    const rawContent = gistContent.files[GIST_FILENAME].content;
    return JSON.parse(rawContent);
  } catch (error) {
    console.error("[Gist] Error fetching data:", error);
    return null;
  }
}

export async function saveGistData(
  userId: string,
  data: GistData
): Promise<boolean> {
  if (!GITHUB_TOKEN) {
    console.warn("[Gist] No GitHub token configured");
    return false;
  }

  try {
    // Get existing gist or create new one
    const gistResponse = await fetch("https://api.github.com/gists", {
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
      },
    });

    if (!gistResponse.ok) {
      throw new Error("Failed to fetch gists");
    }

    const gists = await gistResponse.json();
    const recipeGist = gists.find(
      (g: any) => g.files[GIST_FILENAME]
    );

    const gistId = recipeGist?.id;
    const url = gistId
      ? `https://api.github.com/gists/${gistId}`
      : "https://api.github.com/gists";

    const method = gistId ? "PATCH" : "POST";
    const payload = gistId
      ? {
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(data, null, 2),
            },
          },
        }
      : {
          description: "Mike's Family Recipes - User Data",
          public: false,
          files: {
            [GIST_FILENAME]: {
              content: JSON.stringify(data, null, 2),
            },
          },
        };

    const updateResponse = await fetch(url, {
      method,
      headers: {
        Authorization: `token ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!updateResponse.ok) {
      console.error(
        "[Gist] Failed to save gist:",
        updateResponse.statusText
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("[Gist] Error saving data:", error);
    return false;
  }
}

export function initializeGistData(): GistData {
  return {
    favorites: [],
    ratings: {},
    notes: {},
    madeThisWeek: {},
    lastUpdated: Date.now(),
  };
}
