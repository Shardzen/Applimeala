export type UserGoal = 'WEIGHT_LOSS' | 'MUSCLE_GAIN' | 'MAINTENANCE';
export type ActivityLevel = 'SEDENTARY' | 'LIGHT' | 'MODERATE' | 'INTENSE';
export type GoalSpeed = 'SLOW' | 'STANDARD' | 'FAST';
export type BudgetLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type PrepTime = 'EXPRESS' | 'MEDIUM' | 'CHEF';
export type DietType = 'NONE' | 'VEGAN' | 'GLUTEN_FREE' | 'LACTOSE_FREE' | 'HALAL' | 'VEGETARIAN';

export interface UserProfile {
  id?: string;
  gender: 'MALE' | 'FEMALE' | 'OTHER';
  age: number;
  height: number;
  weight: number;
  targetWeight: number;
  activityLevel: ActivityLevel;
  goal: UserGoal;
  goalSpeed: GoalSpeed;
  budget: BudgetLevel;
  prepTime: PrepTime;
  diet: DietType;
  exclusions: string[];
  xp: number;
  level: number;
  streak: number;
}

export interface WeightEntry {
  date: string;
  weight: number;
}

export interface UserStats {
  streak: number;
  badges: string[];
  weightHistory: WeightEntry[];
}

export interface Exercise {
  id: string;
  name: string;
  gifUrl: string;
  reps?: number;
  duration?: number; // in seconds
  rest: number;
}

export interface Workout {
  id: string;
  title: string;
  focus: 'CARDIO' | 'STRENGTH' | 'MOBILITY';
  location: 'HOME' | 'GYM';
  duration: number; // minutes
  caloriesBurned: number;
  exercises: Exercise[];
}

export interface NutritionTargets {
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
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

export interface DailyProgress {
  consumedCalories: number;
  consumedProteins: number;
  consumedCarbs: number;
  consumedFats: number;
  waterGlassCount: number;
  exerciseCalories: number;
}
