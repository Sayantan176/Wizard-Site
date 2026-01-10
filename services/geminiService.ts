
import { GoogleGenAI } from "@google/genai";

export interface ColorPalette {
  name: string;
  colors: string[];
  description: string;
}

export async function generateWebsiteFromImage(
  base64Image: string,
  prompt: string,
  palette: ColorPalette
): Promise<string> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-flash-preview';
  
  const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const systemInstruction = `
    You are a world-class "Vision-to-Code" specialist. 
    Your mission is to transform a visual blueprint (sketch, photo, or wireframe) into a high-fidelity, functional, and responsive website.

    STRICT FIDELITY & AESTHETIC REQUIREMENTS:
    1. VISUAL LAYOUT: Mirror the exact spatial relationships shown in the uploaded image. Positions matter.
    2. COLOR PALETTE: You MUST use the following color theme: "${palette.name}". 
       Colors to incorporate: ${palette.colors.join(', ')}. 
       Description: ${palette.description}.
       Apply these colors to buttons, backgrounds, accents, and borders.
    3. ANIMATIONS: The user wants a dynamic site. Include CSS and Tailwind animations:
       - Fade-in or slide-in effects for sections as they appear.
       - Smooth hover transitions for buttons and cards.
       - Use 'animate-pulse', 'animate-bounce', or custom @keyframes for key elements.
    4. CONTENT EXTRACTION: Extract any legible text from the image and use it.
    5. TAILWIND CSS: Use Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>.
    6. SINGLE FILE: Return one complete, valid HTML file with all CSS and JS embedded.
    7. IMAGES: Use high-quality Unsplash URLs (https://images.unsplash.com/photo-...) matching the context.
  `;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: `Replicate this sketch perfectly. Use the "${palette.name}" palette and make the site feel alive with animations.
    User's Instructions: ${prompt || 'Make it a professional, animated website following the sketch layout.'}`
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

    return response.text.trim().replace(/^```html/, '').replace(/```$/, '');
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Quota exhausted. Click the key icon to connect your own API key.");
    }
    throw new Error(`Wizard Error: ${error?.message || "Unknown error"}`);
  }
}
