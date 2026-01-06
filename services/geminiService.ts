
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export async function generateWebsiteFromImage(
  base64Image: string,
  prompt: string
): Promise<string> {
  // Upgrading to gemini-3-pro-preview for superior visual reasoning and code generation
  const model = 'gemini-3-pro-preview';
  
  // Robust extraction of MIME type and base64 payload
  const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const systemInstruction = `
    You are a world-class "Vision-to-Code" specialist. 
    Your sole mission is to transform a visual blueprint (sketch, wireframe, or screenshot) into a high-fidelity, functional, and responsive website.

    CORE PRINCIPLES:
    1. VISUAL FIDELITY IS PARAMOUNT: You must carefully analyze the spatial relationships, relative sizes, and placement of elements in the provided image. If a component is on the left in the sketch, it MUST be on the left in the code.
    2. TAILWIND CSS: Build the entire UI using Tailwind CSS. Include the CDN: <script src="https://cdn.tailwindcss.com"></script>.
    3. SINGLE FILE: Return exactly one HTML file. No external CSS/JS files.
    4. INTELLIGENT INTERPRETATION: Translate scribbles into professional UI components (e.g., a wavy line might be a separator, a box with an 'X' is an image placeholder).
    5. PLACEHOLDER ASSETS: Use professional, context-aware images from Unsplash (e.g., https://images.unsplash.com/photo-...). Use 'Inter' or appropriate Google Fonts.
    6. MODERN & CLEAN: Even if the sketch is rough, the resulting code should look polished, modern, and follow best design practices (spacing, typography, color harmony).
    7. VANILLA INTERACTIVITY: Include mobile-responsive menus, form handling, or tab logic using clean vanilla JavaScript within <script> tags.

    STRICT OUTPUT RULES:
    - Output ONLY the raw HTML/Tailwind code.
    - DO NOT use markdown code blocks (e.g., no \`\`\`html).
    - Start immediately with <!DOCTYPE html>.
  `;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: `URGENT: Analyze the attached image with extreme care. This is the structural requirement for the website.
    
    User Instructions/Refinements: ${prompt || 'No specific modifications requested. Follow the visual layout of the sketch exactly.'}
    
    Ensure the resulting code is a pixel-perfect conceptual match for the layout shown.`
  };

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: { parts: [imagePart, textPart] },
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.1, // Minimal temperature for high precision and faithfulness to the input
      },
    });

    if (!response.text) {
      throw new Error("The Wizard returned an empty response.");
    }

    return response.text.trim();
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    const msg = error?.message || "Unknown magical interference.";
    throw new Error(`Wizard Error: ${msg}`);
  }
}
