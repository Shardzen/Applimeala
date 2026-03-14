export type UserGoal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE';
export type ActivityLevel = 'SEDENTARY' | 'ACTIVE' | 'VERY_ACTIVE';
export type BudgetLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type DietType = 'NONE' | 'VEGAN' | 'GLUTEN_FREE' | 'KETO' | 'PALEO';

export interface UserProfile {
  age: number;
  weight: number;
  height: number;
  gender: 'MALE' | 'FEMALE';
  activityLevel: ActivityLevel;
  goal: UserGoal;
  budget: BudgetLevel;
  diet: DietType;
  exclusions: string[];
}

export interface DailyProgress {
  consumedCalories: number;
  consumedProteins: number;
  consumedCarbs: number;
  consumedFats: number;
  waterGlassCount: number;
}

export interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  pricePerUnit: number;
  category: 'FRUITS_VEGGIES' | 'MEAT' | 'DAIRY' | 'GROCERY' | 'OTHERS';
}

export interface Recipe {
  id: string;
  name: string;
  description: string;
  ingredients: Ingredient[];
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
  prepTime: number;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  costPerPortion: number;
  tags: string[];
}

export interface UserStats {
  streak: number;
  badges: string[];
  weightHistory: { date: string; weight: number }[];
}
