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
  trainingFrequency: number; // New: times per week
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

export interface Exercise {
  id: string;
  name: string;
  reps?: string;
  sets?: number;
  weightUsed?: string; // For tracking
}

export interface Workout {
  id: string;
  title: string;
  focus: string;
  location: 'HOME' | 'GYM';
  duration: number;
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
  image?: string;
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

export interface UserStats {
  streak: number;
  badges: string[];
  weightHistory: { date: string; weight: number }[];
}
