import { Language } from "./types";

export const translations = {
  en: {
    title: "ProEdit AI",
    subtitle: "Powered by Gemini 3 Pro",
    sourceImage: "Source Images (Max 10)",
    changeImage: "Add Images",
    removeImage: "Remove",
    uploadTitle: "Click or Drag & Drop",
    uploadDesc: "JPG, PNG up to 10MB",
    editPrompt: "Prompt",
    promptPlaceholder: "Describe the image you want to generate or how to modify the uploaded image...",
    expandPrompt: "Expand Editor",
    closePrompt: "Close Editor",
    selectProject: "Select Google Cloud Project",

    // Preservation Modes
    preservationNone: "No Preservation (Standard)",
    preservationStrict: "Strict Preservation (Quality Up Only)",
    preservationLine: "Line Art Preservation (Color/Texture Only)",
    preservationCharacter: "Character Preservation (Background Change)",
    preservationSameChar: "Same Character (Pose/Location Change)",
    preservationTip: "Toggle preservation mode",

    selectProjectBtn: "Select Google Cloud Project",
    errorGeneric: "Failed to generate image. Please try again.",

    // Style Section
    styleSectionTitle: "Style & Touch (Hidden Prompts)",
    groupAnime: "Anime Era",
    groupManga: "Manga Type",
    group3dcg: "3DCG",
    groupPixel: "Pixel Art",
    releaseFixedPrompt: "Release Fixed Prompt",
    clear: "Clear",
    
    // Anime Options
    anime80s: "1980s-1990s",
    anime90s: "1990s-2000s",
    anime00s: "2000s-2010s",
    anime10s: "2010s-Present",

    // Manga Options
    mangaBW: "B&W Manga",
    mangaColor: "Color Manga",

    // 3DCG Options
    cgPs: "PS Low Poly",
    cgLow: "Low Poly (PS2)",
    cgModern: "Current 3DCG",

    // Pixel Options
    pixelStandard: "Dot Graphic",

    // Line Styles
    lineStyleTitle: "Line Art / Finish",
    lineStd: "Standard",
    lineHot: "Hot-blooded",
    lineGekiga: "Gekiga (Dramatic)",
    lineReal: "Real/Realistic",
    lineLowgrade: "Lower Grades",
    lineKindergarten: "Kindergarten",

    // Mode Section
    modeSectionTitle: "Mode Setting (Fixed Prompt)",
    mode4komaLayout: "4-Koma Mode",
    modePictureBook: "Picture Book Mode",

    outputSize: "Output Paper",
    fitToPaperMode: "Output Size (Final Adjustment)",
    fitToPaperDesc: "Auto-adjust composition to fit paper",
    orientationTitle: "Orientation",
    orientPortrait: "Portrait",
    orientLandscape: "Landscape",

    qualityLevel: "Quality Level",
    generate: "Generate",
    processing: "Processing...",
    download: "Download",
    previewOriginal: "Preview (Original)",
    previewEmpty: "Enter a prompt or upload an image to start",
    modelInfo: "Model: Gemini 3 Pro (Image Preview)",
    modelSub: "Supports up to 4K • Various Aspect Ratios",
    
    // Resolutions
    res1k: "Fast (1K)",
    res2k: "Standard (2K)",
    res4k: "Ultra (4K)",

    // Paper Labels (New)
    paperA3A4: "A3 / A4",
    paperHagaki: "Postcard",
    paperL: "L-Size",
    paperSquare: "Square",
    paperMobile: "Mobile",
    paperStory: "Story",
    paperWide: "Wide (16:9)",
    paperCinema: "Cinema (4:3)",
  },
  ja: {
    title: "ProEdit AI",
    subtitle: "Gemini 3 Pro 使用",
    sourceImage: "元画像 (最大10枚)",
    changeImage: "画像を追加",
    removeImage: "削除",
    uploadTitle: "クリックまたはドラッグ＆ドロップ",
    uploadDesc: "JPG, PNG (最大10MB)",
    editPrompt: "プロンプト",
    promptPlaceholder: "生成したい画像の説明、または元画像の変更内容を入力してください...",
    expandPrompt: "エディタを拡大",
    closePrompt: "エディタを閉じる",
    selectProject: "Google Cloudプロジェクトを選択",

    // Preservation Modes
    preservationNone: "画像維持：なし (通常編集)",
    preservationStrict: "画像維持：完全維持 (高画質化・ノイズ除去)",
    preservationLine: "画像維持：線画維持 (色塗り・テクスチャ追加)",
    preservationCharacter: "画像維持：人物維持 (背景変更)",
    preservationSameChar: "画像維持：同一人物生成 (ポーズ・場所変更)",
    preservationTip: "画像維持モード切替",

    selectProjectBtn: "Google Cloudプロジェクトを選択",
    errorGeneric: "画像の生成に失敗しました。もう一度お試しください。",

    // Style Section
    styleSectionTitle: "スタイル・タッチ設定 (固定プロンプト)",
    groupAnime: "アニメ年代",
    groupManga: "漫画タイプ",
    group3dcg: "3DCG",
    groupPixel: "ドットグラフィック",
    releaseFixedPrompt: "固定プロンプト解除",
    clear: "解除",

    // Anime Options
    anime80s: "1980～90年代",
    anime90s: "1990～00年代",
    anime00s: "2000～10年代",
    anime10s: "2010～現在",

    // Manga Options
    mangaBW: "白黒漫画",
    mangaColor: "カラー漫画",

    // 3DCG Options
    cgPs: "PSローポリゴン",
    cgLow: "ローポリゴン",
    cgModern: "現在3DCG",

    // Pixel Options
    pixelStandard: "ドットグラフィック",

    // Line Styles
    lineStyleTitle: "線画・絵柄の仕上がり",
    lineStd: "通常",
    lineHot: "熱血",
    lineGekiga: "劇画",
    lineReal: "リアル",
    lineLowgrade: "低学年",
    lineKindergarten: "園児",

    // Mode Section
    modeSectionTitle: "モード設定 (固定プロンプト)",
    mode4komaLayout: "4コマモード",
    modePictureBook: "絵本モード",

    outputSize: "出力サイズ (用紙選択)",
    fitToPaperMode: "出力サイズ (用紙最終調整)",
    fitToPaperDesc: "用紙枠に合わせて画像を違和感なく調整",
    orientationTitle: "用紙の向き",
    orientPortrait: "縦長 (Portrait)",
    orientLandscape: "横長 (Landscape)",

    qualityLevel: "画質設定",
    generate: "生成開始",
    processing: "処理中...",
    download: "ダウンロード",
    previewOriginal: "プレビュー (元画像)",
    previewEmpty: "プロンプトを入力するか、画像をアップロードして開始してください",
    modelInfo: "モデル: Gemini 3 Pro (Image Preview)",
    modelSub: "最大4K対応 • 多様なアスペクト比",

    // Resolutions
    res1k: "軽量 (1K)",
    res2k: "標準 (2K)",
    res4k: "超高画質 (4K)",

    // Paper Labels
    paperA3A4: "A3・A4",
    paperHagaki: "はがき",
    paperL: "L判",
    paperSquare: "スクエア",
    paperMobile: "スマホ",
    paperStory: "ストーリー",
    paperWide: "ワイド",
    paperCinema: "シネマ",
  }
};

export const getTranslation = (lang: Language) => translations[lang];