import { GoogleGenAI } from "@google/genai";

export async function generateWebsiteFromImage(
  base64Image: string,
  prompt: string
): Promise<string> {
  // Always create a fresh instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // Using gemini-3-pro-preview as vision-to-code is a complex reasoning and coding task.
  const model = 'gemini-3-pro-preview';
  
  const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const systemInstruction = `
    You are a world-class "Vision-to-Code" specialist. 
    Your mission is to transform a visual blueprint (sketch, photo, or wireframe) into a high-fidelity, functional, and responsive website.

    STRICT ADHERENCE TO INPUT:
    1. LAYOUT FIDELITY: You must mirror the exact layout, structure, and spatial relationships shown in the uploaded image. If elements are side-by-side in the sketch, they must be side-by-side in the code.
    2. CONTENT EXTRACTION: Extract any text written in the sketch and use it as the actual content. Do not use generic filler text if there is legible text in the image.
    3. ELEMENT RECOGNITION: Correcty identify buttons, input fields, images, and nav items from their hand-drawn shapes.
    4. TAILWIND CSS: Use Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>.
    5. SINGLE FILE: Return one complete, valid HTML file.
    6. POLISHED UI: While following the sketch's layout strictly, make the final visual style professional and high-end. Use modern spacing, typography, and colors.
    7. IMAGES: Use high-quality Unsplash placeholder images (e.g., https://images.unsplash.com/photo-...) that match the context of the user's drawing.
    8. VANILLA INTERACTIVITY: Use vanilla JS inside <script> tags for basic logic like mobile menus or button clicks.

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
    text: `REPLICATE THIS DESIGN EXACTLY. Look at the positions, labels, and structure.
    User's Specific Instructions: ${prompt || 'Follow the sketch layout perfectly and make it professional.'}`
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
      throw new Error("Quota exhausted. Click 'Connect API Key' to use your own API key.");
    }
    
    throw new Error(`Wizard Error: ${error?.message || "Unknown error"}`);
  }
}