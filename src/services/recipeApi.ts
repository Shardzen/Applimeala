import type { Recipe, UserProfile } from '../types';

const SPOONACULAR_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com/recipes';

export const fetchRecipesFromDB = async (profile: UserProfile, targetCalories: number): Promise<Recipe[]> => {
  try {
    if (!SPOONACULAR_KEY || SPOONACULAR_KEY === 'undefined') {
      console.warn("Spoonacular API Key is missing. Check your environment variables.");
      return [];
    }

    const mealTarget = Math.round(targetCalories / 3);
    const diet = profile.diet !== 'NONE' ? `&diet=${profile.diet.toLowerCase().replace('_', ' ')}` : '';
    
    const response = await fetch(
      `${BASE_URL}/complexSearch?apiKey=${SPOONACULAR_KEY}&maxCalories=${mealTarget + 100}&minCalories=${mealTarget - 100}${diet}&addRecipeInformation=true&fillIngredients=true&number=6`
    );
    
    if (!response.ok) {
      console.error(`Spoonacular API Error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.results || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.map((r: any) => ({
      id: r.id.toString(),
      name: r.title,
      description: r.summary?.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
      calories: Math.round(r.nutrition?.nutrients?.find((n: any) => n.name === 'Calories')?.amount || mealTarget),
      proteins: Math.round(r.nutrition?.nutrients?.find((n: any) => n.name === 'Protein')?.amount || 30),
      carbs: Math.round(r.nutrition?.nutrients?.find((n: any) => n.name === 'Carbohydrates')?.amount || 50),
      fats: Math.round(r.nutrition?.nutrients?.find((n: any) => n.name === 'Fat')?.amount || 15),
      prepTime: r.readyInMinutes || 30,
      difficulty: r.readyInMinutes < 20 ? 'EASY' : r.readyInMinutes < 45 ? 'MEDIUM' : 'HARD',
      costPerPortion: (r.pricePerServing / 100) || 2.5,
      tags: r.diets || [],
      ingredients: (r.extendedIngredients || []).map((i: any) => ({
        id: i.id ? i.id.toString() : Math.random().toString(),
        name: i.name || 'Ingrédient inconnu',
        quantity: i.amount || 0,
        unit: i.unit || '',
        pricePerUnit: 0.1,
        category: 'GROCERY'
      }))
    }));
  } catch (error) {
    console.error("Spoonacular API Error:", error);
    return [];
  }
};

export const getDriveLink = (ingredients: { name: string; quantity: number }[]) => {
  if (!ingredients.length) return 'https://www.leclercdrive.fr/';
  const query = ingredients.map(i => i.name).join(',');
  return `https://www.leclercdrive.fr/recherche.aspx?SearchTerm=${encodeURIComponent(query)}`;
};
