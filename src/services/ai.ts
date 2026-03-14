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
  
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro"];
  let lastError = null;

  const imageData = await new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(imageFile);
  });

  const prompt = "Analyse cette photo de nourriture. Identifie le plat principal et estime les calories, protéines, glucides et lipides (en grammes). Réponds UNIQUEMENT au format JSON comme ceci: {\"name\": \"nom du plat\", \"calories\": 500, \"proteins\": 30, \"carbs\": 50, \"fats\": 15}";

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        prompt,
        { inlineData: { data: imageData, mimeType: imageFile.type } }
      ]);
      const response = await result.response;
      const text = response.text();
      const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
      return JSON.parse(cleanJson);
    } catch (error) {
      console.warn(`Modèle ${modelName} indisponible pour l'image, essai du suivant...`);
      lastError = error;
    }
  }
  
  console.error("Tous les modèles Vision ont échoué:", lastError);
  throw new Error("L'IA n'a pas pu analyser l'image. Vérifiez votre clé API ou les restrictions de modèle.");
};

export const askConcierge = async (question: string, profile: UserProfile, remainingCals: number): Promise<string> => {
  if (!API_KEY) return "Veuillez configurer votre clé API Gemini pour me parler.";
  
  const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-pro"];
  
  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const context = `Tu es le "Concierge Elite", un coach en nutrition de luxe, très poli, concis et motivant. 
      L'utilisateur a pour objectif: ${profile.goal}. 
      Il lui reste exactement ${remainingCals} Kcal à manger aujourd'hui.
      Réponds de manière experte et courte (max 3 phrases) à sa question : "${question}"`;
      
      const result = await model.generateContent(context);
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.warn(`Modèle ${modelName} indisponible pour le chat, essai du suivant...`);
    }
  }

  return "Je suis désolé, le service de conciergerie est momentanément indisponible. Tous les modèles Gemini (Flash, Pro) ont renvoyé une erreur.";
};
