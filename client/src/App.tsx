import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import RecipeDetail from "@/pages/RecipeDetail";
import Cart from "@/pages/Cart";
import { useHashLocation } from "@/hooks/useHashLocation";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { RecipeCartProvider } from "./contexts/RecipeCartContext";
import { GistSyncProvider } from "./contexts/GistSyncContext";

function App() {
  const [location] = useHashLocation();

  // Parse the current location
  const path = location.split("?")[0]; // Remove query string if present
  const recipeIdMatch = path.match(/^\/recipe\/(.+)$/);
  const recipeId = recipeIdMatch ? recipeIdMatch[1] : null;

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <RecipeCartProvider>
          <GistSyncProvider>
          <TooltipProvider>
            <Toaster />
            {path === "/" && <Home />}
            {path === "/cart" && <Cart />}
            {recipeId && <RecipeDetail />}
            {path !== "/" && path !== "/cart" && !recipeId && <NotFound />}
          </TooltipProvider>
          </GistSyncProvider>
        </RecipeCartProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
