
import { GoogleGenAI } from "@google/genai";

export interface ColorPalette {
  name: string;
  colors: string[];
  description: string;
}

export interface GenerationOptions {
  image: string;
  prompt: string;
  palette: ColorPalette;
  fontFamily: string;
  customColors?: {
    primary: string;
    accent: string;
  };
}

export async function generateWebsiteFromImage(options: GenerationOptions): Promise<string> {
  const { image, prompt, palette, fontFamily, customColors } = options;
  // Initialize Gemini AI with the API key from environment variables
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Use gemini-3-pro-preview for complex coding and design generation tasks
  const model = 'gemini-3-pro-preview';
  
  const mimeMatch = image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = image.replace(/^data:image\/\w+;base64,/, '');

  const primaryColor = customColors?.primary || palette.colors[0];
  const accentColor = customColors?.accent || palette.colors[palette.colors.length - 1];

  const systemInstruction = `
    You are a world-class "Vision-to-Code" specialist. 
    Your mission is to transform a visual blueprint (sketch, photo, or wireframe) into a high-fidelity, functional, and responsive website.

    STRICT FIDELITY & AESTHETIC REQUIREMENTS:
    1. VISUAL LAYOUT: Mirror the exact spatial relationships shown in the uploaded image. Positions matter.
    2. BRANDING & COLORS: 
       - Theme Name: "${palette.name}". 
       - Primary Brand Color: ${primaryColor}.
       - Accent/CTA Color: ${accentColor}.
       - Palette Context: ${palette.description}.
       Use these specific hex codes for backgrounds, buttons, and decorative elements.
    3. TYPOGRAPHY: 
       - Use the font family: "${fontFamily}".
       - You MUST include the appropriate Google Fonts <link> tag in the <head>.
       - Apply this font globally using Tailwind or CSS.
    4. ANIMATIONS: Include CSS and Tailwind animations:
       - Fade-in or slide-in effects for sections.
       - Smooth hover transitions.
       - Use 'animate-pulse' or 'animate-bounce' for high-impact CTAs.
    5. CONTENT: Extract any legible text from the image and use it.
    6. TAILWIND CSS: Use <script src="https://cdn.tailwindcss.com"></script>.
    7. SINGLE FILE: Return one complete, valid HTML file.
    8. IMAGES: Use high-quality Unsplash URLs matching the site context.
  `;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: `Replicate this sketch perfectly. 
    Font: ${fontFamily}. 
    Primary Color: ${primaryColor}. 
    Accent Color: ${accentColor}.
    Additional User Instructions: ${prompt || 'Make it a professional, animated website.'}`
  };

  try {
    // Generate content using the new SDK pattern
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1,
      },
    });

    // Access the .text property directly as per the latest API
    const text = response.text;
    if (!text) {
      throw new Error("The Wizard returned an empty response.");
    }

    return text.trim().replace(/^```html/, '').replace(/```$/, '');
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Quota exhausted. Try again later or use a custom API key.");
    }
    throw new Error(`Wizard Error: ${error?.message || "Unknown error"}`);
  }
}
