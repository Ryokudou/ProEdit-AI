export type Language = 'en' | 'ja';

export enum AspectRatio {
  SQUARE = '1:1',
  PORTRAIT_STANDARD = '3:4', // Maps to A3, A4, Hagaki, L-size Portrait
  LANDSCAPE_STANDARD = '4:3', // Maps to A3, A4, Hagaki, L-size Landscape
  PORTRAIT_TALL = '9:16',    // Mobile, Stories
  LANDSCAPE_WIDE = '16:9'    // Youtube, Monitors
}

export enum ImageResolution {
  RES_1K = '1K',
  RES_2K = '2K',
  RES_4K = '4K'
}

export type Orientation = 'portrait' | 'landscape';

export type StyleGroup = 'anime' | 'manga' | '3dcg' | 'pixel' | null;

export type PreservationMode = 'none' | 'strict' | 'line_art' | 'character_background' | 'same_character';

export type GeminiModel = 'gemini-3-pro-image-preview' | 'gemini-3-flash-preview' | 'gemini-2.5-flash-image';

export interface GenerationConfig {
  prompt: string;
  aspectRatio: AspectRatio;
  resolution: ImageResolution;
  originalImage: string | null;
}

export interface GeneratedResult {
  imageUrl: string;
  timestamp: number;
}