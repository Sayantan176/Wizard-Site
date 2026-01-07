import { GoogleGenAI } from "@google/genai";

export async function generateWebsiteFromImage(
  base64Image: string,
  prompt: string
): Promise<string> {
  // Always create a fresh instance to ensure the latest API key is used
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  // gemini-3-flash-preview has much better quota availability for shared environments.
  const model = 'gemini-3-flash-preview';
  
  const mimeMatch = base64Image.match(/^data:(image\/\w+);base64,/);
  const mimeType = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');

  const systemInstruction = `
    You are a world-class "Vision-to-Code" specialist. 
    Your mission is to transform a visual blueprint (sketch, photo, or wireframe) into a high-fidelity, functional, and responsive website.

    STRICT FIDELITY REQUIREMENTS:
    1. VISUAL LAYOUT: You MUST mirror the exact layout, structure, and spatial relationships shown in the uploaded image. If a logo is on the left and a menu on the right, keep them there.
    2. CONTENT EXTRACTION: Actively look for text, labels, and headings written in the image. Use them as the actual text content of the site.
    3. ELEMENT RECOGNITION: Identify hand-drawn boxes as cards, circles as avatars/icons, and lines as dividers or text blocks.
    4. TAILWIND CSS: Use Tailwind via CDN: <script src="https://cdn.tailwindcss.com"></script>.
    5. SINGLE FILE: Return one complete, valid HTML file with all CSS and JS embedded.
    6. POLISHED UI: While following the layout strictly, use modern Tailwind design patterns (nice padding, subtle shadows, clean typography) to make it look professional.
    7. ASSETS: Use descriptive Unsplash URLs for images that match the context of the user's sketch.
  `;

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: base64Data,
    },
  };

  const textPart = {
    text: `CRITICAL: Replicate the layout of the attached image as closely as possible. 
    User's Instructions: ${prompt || 'Make it a professional website that follows this sketch perfectly.'}`
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
    
    // Specifically handle quota errors
    if (error?.message?.includes('429') || error?.message?.includes('RESOURCE_EXHAUSTED')) {
      throw new Error("Shared quota exhausted. Click 'Connect API Key' to use your own personal key for unlimited access.");
    }
    
    throw new Error(`Wizard Error: ${error?.message || "Unknown error"}`);
  }
}