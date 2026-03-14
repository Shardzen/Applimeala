import { GoogleGenerativeAI } from "@google/generative-ai";
import type { UserProfile } from "../types";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY || '');

export interface AIResult {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

export const analyzeMealImage = async (imageFile: File): Promise<AIResult> => {
  if (!API_KEY) throw new Error("Clé API Gemini manquante.");
  
  // Ordre de test pour les images (Flash est requis pour la vision)
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-latest"];
  
  const imageData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(imageFile);
  });

  const prompt = "Analyse cette photo de nourriture. Identifie le plat et estime les calories, protéines, glucides et lipides. Réponds UNIQUEMENT en JSON.";

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: imageData, mimeType: imageFile.type } }
      ]);
      const text = result.response.text();
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (e) {
      console.warn(`Vision fail with ${modelName}, trying next...`);
    }
  }
  throw new Error("Erreur Vision IA. Vérifiez vos accès Gemini 1.5.");
};

export const askConcierge = async (question: string, profile: UserProfile, remainingCals: number): Promise<string> => {
  if (!API_KEY) return "Veuillez configurer votre clé API.";
  
  // Modèles du plus récent au plus compatible (1.0-pro est le plus stable)
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-1.0-pro", "gemini-pro"];
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const context = `Tu es le Concierge AppliMeal, un coach de luxe. 
      Objectif: ${profile.goal}. Reste: ${remainingCals} Kcal. 
      Réponds en 2 phrases max à: ${question}`;
      
      const result = await model.generateContent(context);
      return result.response.text();
    } catch (e) {
      console.warn(`Chat fail with ${modelName}, trying next...`);
    }
  }

  return "Je rencontre des difficultés de connexion avec Google AI (Erreur 404). Assurez-vous que votre clé API est active dans Google AI Studio.";
};
