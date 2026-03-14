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
      budget: profile.budget,
      updated_at: new Date().toISOString(),
    });

  if (error) throw error;
  return data;
};

export const getProfile = async (userId: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "no rows found"
  return data;
};
