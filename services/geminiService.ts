
import { GoogleGenAI } from "@google/genai";

export async function generateWebsiteFromImage(
  base64Image: string,
  prompt: string
): Promise<string> {
  // Always create a fresh instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const systemInstruction = `
    You are a world-class "Vision-to-Code" specialist. 
    Your mission is to transform a visual blueprint (sketch, photo, or wireframe) into a high-fidelity, functional, and responsive website.

    CORE PRINCIPLES:
    1. VISUAL FIDELITY: Analyze placement, relative sizes, and spatial relationships accurately.
    2. TAILWIND CSS: Use Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>.
    3. SINGLE FILE: Return one complete, valid HTML file.
    4. INTELLIGENT INTERPRETATION: Translate hand-drawn scribbles into polished UI components (buttons, navbars, cards).
    5. ASSETS: Use descriptive placeholder images from Unsplash (e.g., https://images.unsplash.com/photo-...).
    6. VANILLA INTERACTIVITY: Use vanilla JS inside <script> tags for basic logic like mobile menus, sliders, or tab switching.

    STRICT OUTPUT RULES:
    - Output ONLY the raw HTML/Tailwind code.
    - DO NOT use markdown code blocks (no \`\`\`html).
    - Start immediately with <!DOCTYPE html>.
  `;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: `Analyze the attached image and generate a website. 
    User's Specific Instructions: ${prompt || 'Follow the sketch layout closely and make it professional.'}`
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
    
    // Check for quota exhaustion and provide specific guidance
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Quota exhausted. Click 'Fix Quota' to use your own API key.");
    }
    
    throw new Error(`Wizard Error: ${error?.message || "Unknown error"}`);
  }
}
