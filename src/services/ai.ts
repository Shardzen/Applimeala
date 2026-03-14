import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = new GoogleGenerativeAI(API_KEY);

export interface AIResult {
  name: string;
  calories: number;
  proteins: number;
  carbs: number;
  fats: number;
}

export const analyzeMealImage = async (imageFile: File): Promise<AIResult> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Convert file to generative part
    const imageData = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
      reader.readAsDataURL(imageFile);
    });

    const prompt = "Analyse cette photo de nourriture. Identifie le plat principal et estime les calories, protéines, glucides et lipides (en grammes). Réponds UNIQUEMENT au format JSON comme ceci: {\"name\": \"nom du plat\", \"calories\": 500, \"proteins\": 30, \"carbs\": 50, \"fats\": 15}";

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: imageData, mimeType: imageFile.type } }
    ]);

    const response = await result.response;
    const text = response.text();
    // Clean potential markdown blocks
    const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(cleanJson);
  } catch (error) {
    console.error("Gemini AI Error:", error);
    throw new Error("L'IA n'a pas pu analyser l'image.");
  }
};
