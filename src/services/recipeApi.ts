import { supabase } from '../lib/supabaseClient';
import type { Recipe, UserProfile } from '../types';

/**
 * Fetches real recipes from Supabase with smart filtering
 */
export const fetchRecipesFromDB = async (profile: UserProfile, targetCalories: number): Promise<Recipe[]> => {
  // 1. Structure the query
  let query = supabase
    .from('recipes')
    .select('*, ingredients(*)');

  // 2. Apply dietary filters
  if (profile.diet !== 'NONE') {
    query = query.contains('tags', [profile.diet]);
  }

  // 3. Caloric range filtering (+/- 15% of target per meal)
  const mealTarget = Math.round(targetCalories / 3);
  const min = Math.round(mealTarget * 0.7);
  const max = Math.round(mealTarget * 1.3);
  
  query = query.gte('calories', min).lte('calories', max);

  const { data, error } = await query;
  if (error) throw error;
  
  // Transform DB format to App format if necessary
  return (data as any[]).map(r => ({
    ...r,
    ingredients: r.ingredients.map((i: any) => ({
      ...i,
      pricePerUnit: i.price_per_unit // Mapping DB underscore to camelCase
    }))
  }));
};

export const getDriveLink = (ingredients: { name: string; quantity: number }[]) => {
  const query = ingredients.map(i => i.name).join(',');
  return `https://www.leclercdrive.fr/recherche.aspx?SearchTerm=${encodeURIComponent(query)}`;
};
