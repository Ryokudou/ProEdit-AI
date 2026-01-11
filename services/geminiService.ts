import { GoogleGenAI } from "@google/genai";
import { AspectRatio, ImageResolution } from "../types";

// Define a local interface for the aistudio object structure we need.
interface AIStudioHelpers {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

const cleanBase64 = (dataUrl: string): string => {
  return dataUrl.split(',')[1] || dataUrl;
};

const getMimeType = (dataUrl: string): string => {
  const match = dataUrl.match(/^data:(.*);base64,/);
  return match ? match[1] : 'image/jpeg';
};

/**
 * Forces the user to select an API Key/Project via the AI Studio interface.
 */
export const selectApiKey = async (): Promise<boolean> => {
  const win = window as unknown as { aistudio?: AIStudioHelpers };
  if (win.aistudio) {
    await win.aistudio.openSelectKey();
    // Re-check status after the dialog closes
    return await win.aistudio.hasSelectedApiKey();
  } else {
    alert("Google AI Studio環境（idx.google.com または aistudio.google.com）でのみ利用可能です。");
    return false;
  }
};

export const editImageWithGemini = async (
  images: string[],
  prompt: string,
  aspectRatio: AspectRatio,
  resolution: ImageResolution,
  model: string
): Promise<string> => {
  
  // 1. Check AI Studio Environment
  const win = window as unknown as { aistudio?: AIStudioHelpers };
  if (!win.aistudio) {
    throw new Error(
      "このアプリはGoogle AI Studio環境でのみ動作します。" +
      "https://aistudio.google.com/ からご利用ください。"
    );
  }

  // 2. Force Project Selection
  const hasProject = await win.aistudio.hasSelectedApiKey();
  if (!hasProject) {
    // Open selection dialog
    await win.aistudio.openSelectKey();
    
    // Check again
    const hasProjectAfter = await win.aistudio.hasSelectedApiKey();
    if (!hasProjectAfter) {
      throw new Error("Google Cloudプロジェクトの選択が必要です。");
    }
  }

  // 3. Get API Key from Environment
  // The key is injected into process.env.API_KEY by the AI Studio environment
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
     throw new Error("プロジェクトからAPIキーを取得できませんでした。画面右上の設定を確認してください。");
  }

  // 4. Initialize Client
  const ai = new GoogleGenAI({ apiKey: apiKey });

  // 5. Prepare Config
  // Gemini 3 Pro supports explicit resolution (imageSize) and various aspect ratios.
  // Flash models generally do not support imageSize and may have limited aspect ratio support.
  // We strictly follow the rule: DO NOT set imageSize for nano banana (2.5 flash).
  
  const isProModel = model === 'gemini-3-pro-image-preview';
  
  const config: any = {
     // Relax safety settings to prevent over-blocking on legitimate image edits
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_CIVIC_INTEGRITY', threshold: 'BLOCK_ONLY_HIGH' }
    ]
  };

  if (isProModel) {
    config.imageConfig = {
      aspectRatio: aspectRatio,
      imageSize: resolution
    };
  } else if (model === 'gemini-2.5-flash-image') {
    // 2.5 Flash Image supports aspectRatio, but NOT imageSize.
    config.imageConfig = {
      aspectRatio: aspectRatio 
    };
  }
  // For 'gemini-3-flash-preview', it is primarily a text model. 
  // We can try sending imageConfig (like 2.5), but if it fails, the model might just be returning text descriptions.
  else {
      config.imageConfig = {
      aspectRatio: aspectRatio 
    };
  }

  // Construct parts: Images MUST come before Text for editing context
  const parts: any[] = [];

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

  // Append text prompt after images
  // Default to a descriptive instruction if prompt is empty to help the model context
  parts.push({ text: prompt || "Enhance the image quality and details while maintaining the original composition." });

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: parts
      },
      config: config
    });

    // 6. Extract Image
    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0];
      
      // First, look for the image part
      if (candidate.content && candidate.content.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:image/png;base64,${part.inlineData.data}`;
          }
        }

        // If no image found, check for text response (error message from model)
        const textParts = candidate.content.parts
          .filter(p => p.text)
          .map(p => p.text)
          .join('\n');
          
        if (textParts) {
           throw new Error(`Model returned text instead of image: ${textParts}`);
        }
      }
    }

    throw new Error("No image data found in response. The model may have filtered the response due to safety settings.");

  } catch (error) {
    console.error("Gemini Image Edit Error:", error);
    throw error;
  }
};