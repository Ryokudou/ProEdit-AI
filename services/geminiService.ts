import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageResolution } from "../types";

// Define a local interface for the aistudio object structure we need.
interface AIStudioHelpers {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

const API_KEY_STORAGE_KEY = 'gemini_api_key_local';

export const getStoredApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE_KEY);
};

export const saveApiKey = (key: string): void => {
  if (!key) return;
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
};

export const removeApiKey = (): void => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
};

const cleanBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1] || dataUrl;
};

const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(.*);base64,/);
  return match ? match[1] : 'image/jpeg';
};

/**
 * Forces the user to select an API Key/Project via the AI Studio interface.
 * Returns true if a key is confirmed selected, false otherwise.
 */
export const selectApiKey = async (): Promise<boolean> => {
  const win = window as unknown as { aistudio?: AIStudioHelpers };
  if (win.aistudio) {
    await win.aistudio.openSelectKey();
    // Re-check status after the dialog closes
    return await win.aistudio.hasSelectedApiKey();
  }
  return false;
};

export const editImageWithGemini = async (
  images: string[],
  prompt: string,
  aspectRatio: AspectRatio,
  resolution: ImageResolution
): Promise<string> => {
  
  // 1. Check Local Storage first for a manually entered key
  const storedKey = getStoredApiKey();
  let apiKey = storedKey;

  // 2. If no local key, check AI Studio environment (Platform Injection)
  if (!apiKey) {
    const win = window as unknown as { aistudio?: AIStudioHelpers };
    if (win.aistudio) {
      let hasKey = await win.aistudio.hasSelectedApiKey();
      
      // If no key is selected, force the selection dialog
      if (!hasKey) {
        await win.aistudio.openSelectKey();
        hasKey = await win.aistudio.hasSelectedApiKey();
        
        if (!hasKey) {
          throw new Error("Project selection is required if no API Key is provided in settings.");
        }
      }
      // In the AI Studio environment, the key is injected into process.env.API_KEY
      apiKey = process.env.API_KEY;
    }
  }

  if (!apiKey) {
     throw new Error("Please provide a Gemini API Key in settings or select a Google Cloud Project.");
  }

  // 3. Initialize Client
  const ai = new GoogleGenAI({ apiKey: apiKey });

  // 4. Prepare Config
  const targetResolution = resolution;

  // Construct parts
  const parts: any[] = [
    { text: prompt || "Generate a high quality image." }
  ];

  // Append all provided images to the parts
  if (images && images.length > 0) {
    images.forEach(imgBase64 => {
      const mimeType = getMimeType(imgBase64);
      const rawBase64 = cleanBase64(imgBase64);
      parts.push({
        inlineData: {
          mimeType: mimeType,
          data: rawBase64
        }
      });
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-image-preview',
      contents: {
        parts: parts
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio,
          imageSize: targetResolution
        }
      }
    });

    // 5. Extract Image
    if (response.candidates && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData && part.inlineData.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }

    throw new Error("No image data found in response");

  } catch (error) {
    console.error("Gemini Image Edit Error:", error);
    throw error;
  }
};