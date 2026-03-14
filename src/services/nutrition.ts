import type { UserProfile, NutritionTargets, ActivityLevel } from '../types';

const activityMultipliers: Record<ActivityLevel, number> = {
  'SEDENTARY': 1.2,
  'ACTIVE': 1.55,
  'VERY_ACTIVE': 1.9
};

export const calculateBMR = (profile: UserProfile): number => {
  const { weight, height, age, gender } = profile;
  const bmr = 10 * weight + 6.25 * height - 5 * age;
  return gender === 'MALE' ? bmr + 5 : bmr - 161;
};

export const calculateTDEE = (profile: UserProfile): number => {
  const bmr = calculateBMR(profile);
  const multiplier = activityMultipliers[profile.activityLevel];
  return Math.round(bmr * multiplier);
};

export const calculateNutritionTargets = (profile: UserProfile): NutritionTargets => {
  const tdee = calculateTDEE(profile);
  let targetCalories = tdee;

  switch (profile.goal) {
    case 'WEIGHT_LOSS':
      targetCalories -= 500;
      break;
    case 'MUSCLE_GAIN':
      targetCalories += 300;
      break;
    case 'MAINTENANCE':
    default:
      break;
  }

  // Protein targets: 
  // - Gain: 2g/kg bodyweight
  // - Loss: 2.2g/kg (to preserve lean mass)
  // - Maint: 1.6g/kg
  let proteinTarget = 1.8 * profile.weight;
  if (profile.goal === 'MUSCLE_GAIN') proteinTarget = 2.0 * profile.weight;
  if (profile.goal === 'WEIGHT_LOSS') proteinTarget = 2.2 * profile.weight;

  const proteins = Math.round(proteinTarget);
  const fats = Math.round((targetCalories * 0.25) / 9); // ~25% from fats
  const carbs = Math.round((targetCalories - (proteins * 4) - (fats * 9)) / 4);

  return {
    calories: targetCalories,
    proteins,
    carbs,
    fats,
  };
};
