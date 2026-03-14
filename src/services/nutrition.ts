import type { UserProfile, NutritionTargets, ActivityLevel, GoalSpeed } from '../types';

const activityMultipliers: Record<ActivityLevel, number> = {
  'SEDENTARY': 1.2,
  'LIGHT': 1.375,
  'MODERATE': 1.55,
  'INTENSE': 1.725
};

const speedCalories: Record<GoalSpeed, number> = {
  'SLOW': 250,
  'STANDARD': 500,
  'FAST': 750
};

export const calculateBMR = (profile: UserProfile): number => {
  const { weight, height, age, gender } = profile;
  // Mifflin-St Jeor Formula
  let bmr = (10 * weight) + (6.25 * height) - (5 * age);
  if (gender === 'MALE') return bmr + 5;
  if (gender === 'FEMALE') return bmr - 161;
  return bmr - 78; // OTHER / neutral
};

export const calculateNutritionTargets = (profile: UserProfile): NutritionTargets => {
  const bmr = calculateBMR(profile);
  const tdee = Math.round(bmr * activityMultipliers[profile.activityLevel]);
  
  let targetCalories = tdee;
  const speedAdj = speedCalories[profile.goalSpeed];

  if (profile.goal === 'WEIGHT_LOSS') targetCalories -= speedAdj;
  if (profile.goal === 'MUSCLE_GAIN') targetCalories += speedAdj;

  // Macros Calculation Elite
  const proteins = Math.round(profile.weight * (profile.goal === 'MUSCLE_GAIN' ? 2.2 : 1.8));
  const fats = Math.round((targetCalories * 0.25) / 9);
  const carbs = Math.round((targetCalories - (proteins * 4) - (fats * 9)) / 4);

  return { calories: targetCalories, proteins, carbs, fats };
};
