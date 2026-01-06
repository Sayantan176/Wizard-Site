
import { GoogleGenAI } from "@google/genai";

export async function generateWebsiteFromImage(
  base64Image: string,
  prompt: string
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  
  const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const systemInstruction = `
    You are a world-class "Vision-to-Code" specialist. 
    Your mission is to transform a visual blueprint into a high-fidelity, functional, and responsive website.

    CORE PRINCIPLES:
    1. VISUAL FIDELITY: Analyze placement and relative sizes accurately.
    2. TAILWIND CSS: Use Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>.
    3. SINGLE FILE: Return one HTML file.
    4. INTELLIGENT INTERPRETATION: Translate sketches into polished UI components.
    5. ASSETS: Use Unsplash for images.
    6. VANILLA INTERACTIVITY: Use vanilla JS inside <script> tags for menus/logic.

    STRICT OUTPUT RULES:
    - Output ONLY the raw HTML/Tailwind code.
    - DO NOT use markdown code blocks.
    - Start immediately with <!DOCTYPE html>.
  `;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: `Analyze the attached image. Structural requirement for the website.
    User Instructions: ${prompt || 'No specific modifications. Follow sketch layout.'}`
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
      },
    });

    if (!response.text) {
      throw new Error("The Wizard returned an empty response.");
    }

    return response.text.trim();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(`Wizard Error: ${error?.message || "Unknown error"}`);
  }
}
