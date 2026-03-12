import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/Home";
import RecipeDetail from "@/pages/RecipeDetail";
import MealPlan from "@/pages/MealPlan";
import { useHashLocation } from "@/hooks/useHashLocation";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  const [location] = useHashLocation();

  // Parse the current location
  const path = location.split("?")[0]; // Remove query string if present
  const recipeIdMatch = path.match(/^\/recipe\/(.+)$/);
  const recipeId = recipeIdMatch ? recipeIdMatch[1] : null;

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light" switchable={true}>
        <TooltipProvider>
          <Toaster />
          {path === "/" && <Home />}
          {path === "/meal-plan" && <MealPlan />}
          {recipeId && <RecipeDetail />}
          {path !== "/" && path !== "/meal-plan" && !recipeId && <NotFound />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
