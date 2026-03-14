import { supabase } from '../lib/supabaseClient';
import type { UserProfile } from '../types';

export const saveProfile = async (userId: string, profile: UserProfile) => {
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: userId,
      age: profile.age,
      weight: profile.weight,
      height: profile.height,
      gender: profile.gender,
      activity_level: profile.activityLevel,
      goal: profile.goal,
      goal_speed: profile.goalSpeed,
      target_weight: profile.targetWeight,
      budget: profile.budget,
      prep_time: profile.prepTime,
      diet: profile.diet,
      xp: profile.xp,
      level: profile.level,
      streak: profile.streak,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  return data;
};

export const getProfile = async (userId: string): Promise<UserProfile | null> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }

  return {
    age: data.age,
    weight: data.weight,
    height: data.height,
    gender: data.gender,
    activityLevel: data.activity_level,
    goal: data.goal,
    goalSpeed: data.goal_speed || 'STANDARD',
    targetWeight: data.target_weight || data.weight,
    budget: data.budget,
    prepTime: data.prep_time || 'MEDIUM',
    diet: data.diet || 'NONE',
    exclusions: [],
    xp: data.xp || 0,
    level: data.level || 1,
    streak: data.streak || 0
  };
};
