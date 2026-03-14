export interface AIResult {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

/**
 * AI Service for Image Recognition (using Gemini structure)
 */
export const analyzeMealImage = async (imageFile: File): Promise<AIResult> => {
  // 1. In a real world, we'd upload this image to Supabase Storage first.
  // 2. Then, call a Supabase Edge Function to protect the Gemini API Key.
  // 3. For this mock, we simulate a delay and an IA result.

  console.log("Analyse de l'image par l'IA...", imageFile.name);
  
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        name: "Assiette de riz, poulet grillé et brocolis",
        calories: 550,
        proteins: 35,
        carbs: 45,
        fats: 12
      });
    }, 2500);
  });
};
