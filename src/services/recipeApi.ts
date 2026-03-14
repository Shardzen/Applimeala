import type { Recipe, UserProfile } from '../types';

const SPOONACULAR_KEY = import.meta.env.VITE_SPOONACULAR_API_KEY;
const BASE_URL = 'https://api.spoonacular.com/recipes';

/**
 * Filtre les recettes selon le budget et l'objectif de l'utilisateur
 */
export const fetchRecipesFromDB = async (profile: UserProfile, targetCalories: number): Promise<Recipe[]> => {
  try {
    const mealTarget = Math.round(targetCalories / 3);
    
    // Détermination du prix max par portion en centimes (Spoonacular)
    let maxPriceCents = 1000; // Gourmet par défaut
    if (profile.budget === 'LOW') maxPriceCents = 200; // < 2€ (Étudiant)
    if (profile.budget === 'MEDIUM') maxPriceCents = 500; // < 5€ (Standard)

    const diet = profile.diet !== 'NONE' ? `&diet=${profile.diet.toLowerCase()}` : '';
    
    const response = await fetch(
      `${BASE_URL}/complexSearch?apiKey=${SPOONACULAR_KEY}&maxCalories=${mealTarget + 200}&minCalories=${mealTarget - 150}${diet}&maxPriceServings=${maxPriceCents}&addRecipeInformation=true&fillIngredients=true&number=15`
    );
    
    if (!response.ok) return [];
    const data = await response.json();
    if (!data.results) return [];

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
      costPerPortion: (r.pricePerServing / 100),
      image: r.image,
      tags: r.diets || [],
      ingredients: (r.extendedIngredients || []).map((i: any) => ({
        id: i.id?.toString() || Math.random().toString(),
        name: i.name,
        quantity: i.amount,
        unit: i.unit,
        pricePerUnit: 0.1,
        category: 'GROCERY'
      }))
    }));
  } catch (error) {
    console.error("Recipe API Error:", error);
    return [];
  }
};

export const getDriveLink = (ingredients: { name: string; quantity: number }[]) => {
  if (!ingredients.length) return 'https://www.leclercdrive.fr/';
  const query = ingredients.map(i => i.name).join(',');
  return `https://www.leclercdrive.fr/recherche.aspx?SearchTerm=${encodeURIComponent(query)}`;
};
