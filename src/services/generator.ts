import type { Recipe } from '../types';

interface ShoppingListItem {
  name: string;
  quantity: number;
  unit: string;
  totalCost: number;
  category: string;
}

export const aggregateShoppingList = (recipes: Recipe[]) => {
  const shoppingList: { [name: string]: { quantity: number; unit: string; totalCost: number; category: string } } = {};

  recipes.forEach(recipe => {
    recipe.ingredients.forEach(ing => {
      if (shoppingList[ing.name]) {
        shoppingList[ing.name].quantity += ing.quantity;
        shoppingList[ing.name].totalCost += ing.pricePerUnit * ing.quantity;
      } else {
        shoppingList[ing.name] = {
          quantity: ing.quantity,
          unit: ing.unit,
          totalCost: ing.pricePerUnit * ing.quantity,
          category: ing.category
        };
      }
    });
  });

  // Group by category
  const groupedList: { [category: string]: ShoppingListItem[] } = {};
  Object.entries(shoppingList).forEach(([name, data]) => {
    const cat = data.category || 'OTHERS';
    if (!groupedList[cat]) groupedList[cat] = [];
    groupedList[cat].push({ name, ...data });
  });

  return groupedList;
};

export const generateDailyPlan = (recipes: Recipe[], targetCalories: number, maxBudget?: number): Recipe[] => {
  let currentCalories = 0;
  let currentCost = 0;
  const selectedRecipes: Recipe[] = [];

  const sortedRecipes = [...recipes].sort((a, b) => (b.calories / b.costPerPortion) - (a.calories / a.costPerPortion));

  for (const recipe of sortedRecipes) {
    if (currentCalories + recipe.calories <= targetCalories + 200) {
      if (!maxBudget || (currentCost + recipe.costPerPortion <= maxBudget)) {
        selectedRecipes.push(recipe);
        currentCalories += recipe.calories;
        currentCost += recipe.costPerPortion;
      }
    }
    if (selectedRecipes.length >= 3) break;
  }

  return selectedRecipes;
};
