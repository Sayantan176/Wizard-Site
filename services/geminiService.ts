
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

/**
 * Robustly extracts HTML from a model response that might contain markdown or conversational text.
 */
function extractHTML(text: string): string {
  // 1. Try to find content within ```html ... ``` code blocks
  const htmlBlockMatch = text.match(/```html\s*([\s\S]*?)\s*```/i);
  if (htmlBlockMatch && htmlBlockMatch[1]) {
    return htmlBlockMatch[1].trim();
  }

  // 2. Try to find content within generic ``` ... ``` code blocks if they look like HTML
  const genericBlockMatch = text.match(/```\s*([\s\S]*?)\s*```/i);
  if (genericBlockMatch && genericBlockMatch[1]) {
    const content = genericBlockMatch[1].trim();
    if (content.toLowerCase().includes('<html') || content.toLowerCase().includes('<!doctype')) {
      return content;
    }
  }

  // 3. Last resort: Extract from the first occurrence of <!DOCTYPE or <html to the last </html>
  const docTypeIndex = text.search(/<!DOCTYPE/i);
  const htmlStartIndex = text.search(/<html/i);
  const startIndex = docTypeIndex !== -1 ? docTypeIndex : htmlStartIndex;
  const endIndex = text.toLowerCase().lastIndexOf('</html>');

  if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
    return text.substring(startIndex, endIndex + 7).trim();
  }

  // 4. Return as-is if no clear markers are found
  return text.trim();
}

export async function generateWebsiteFromImage(options: GenerationOptions): Promise<string> {
  const { image, prompt, palette, fontFamily, customColors } = options;
  
  // Use a fresh instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  // Using gemini-3-flash-preview for a balance of speed, cost, and high-quality coding capabilities
  const modelName = 'gemini-3-flash-preview';
  
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
    text: `Task: Replicate this sketch perfectly. 
    Font Family: ${fontFamily}. 
    Primary Brand Color: ${primaryColor}. 
    Accent/CTA Color: ${accentColor}.
    Additional Refinements: ${prompt || 'Make it a professional, modern, and fully animated website.'}
    
    Output requirement: Provide ONLY the complete HTML5 source code.`
  };

  try {
    const response = await ai.models.generateContent({
      model: modelName,
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2, // Slightly higher for creativity in content filling
      },
    });

    const rawText = response.text;
    if (!rawText) {
      throw new Error("The Wizard returned an empty response. This might be due to safety filters or an invalid image.");
    }

    const cleanedCode = extractHTML(rawText);
    
    if (!cleanedCode.toLowerCase().includes('<html')) {
      throw new Error("The Wizard failed to generate valid HTML. Please try refining your sketch or prompt.");
    }

    return cleanedCode;
  } catch (error: any) {
    console.error("Gemini API Error Detail:", error);
    
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("The Wizard's energy (quota) is exhausted. Please wait a few moments before trying again.");
    }
    
    if (error?.message?.includes('safety') || error?.message?.includes('blocked')) {
      throw new Error("The generation was blocked for safety reasons. Please ensure your sketch doesn't contain sensitive content.");
    }

    throw new Error(`Wizard Error: ${error?.message || "An unexpected error occurred during transmutation."}`);
  }
}
