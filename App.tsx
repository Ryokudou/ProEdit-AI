import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AspectRatio, ImageResolution, Language, Orientation, StyleGroup, PreservationMode, GeminiModel } from './types';
import { editImageWithGemini, selectApiKey } from './services/geminiService';
import { getTranslation } from './translations';
import { Loader } from './components/Loader';
import { 
  Upload, 
  ImageIcon, 
  Wand2, 
  Download, 
  Layout, 
  Smartphone, 
  Monitor, 
  Crop, 
  Layers, 
  Zap, 
  Globe, 
  Printer, 
  Instagram, 
  Clapperboard, 
  BookOpen, 
  XCircle, 
  MoveVertical, 
  MoveHorizontal, 
  PenTool, 
  Trash2, 
  Grid2X2, 
  Box, 
  Gamepad2, 
  Book, 
  CheckCircle2, 
  Maximize2, 
  Minimize2, 
  Shield, 
  Lock, 
  Move, 
  X,
  User,
  Copy,
  Cpu
} from './components/Icons';

// --- Data Structures ---

interface SizeDefinition {
  id: string;
  labelKey: string;
  sub: string;
  icon: React.ReactNode;
  isRectangular: boolean; // Supports orientation toggle
}

const paperSizes: SizeDefinition[] = [
  { id: 'a3a4', labelKey: 'paperA3A4', sub: 'ISO', icon: <Printer className="w-5 h-5" />, isRectangular: true },
  { id: 'hagaki', labelKey: 'paperHagaki', sub: '100x148', icon: <Layout className="w-4 h-4" />, isRectangular: true },
  { id: 'l', labelKey: 'paperL', sub: 'Photo', icon: <ImageIcon className="w-4 h-4" />, isRectangular: true },
  { id: 'mobile', labelKey: 'paperMobile', sub: '9:16', icon: <Smartphone className="w-4 h-4" />, isRectangular: true },
  { id: 'story', labelKey: 'paperStory', sub: 'IG', icon: <Instagram className="w-4 h-4" />, isRectangular: true },
  { id: 'wide', labelKey: 'paperWide', sub: '16:9', icon: <Monitor className="w-4 h-4" />, isRectangular: true },
  { id: 'square', labelKey: 'paperSquare', sub: '1:1', icon: <Crop className="w-4 h-4" />, isRectangular: false },
];

const stylePrompts = {
  anime: {
    '80s': '1980〜1990年代までのアニメ風のタッチとカラー使い',
    '90s': '1990〜2000年代までのアニメ風のタッチとカラー使い',
    '00s': '2000〜2010年代までのアニメ風のタッチとカラー使い',
    '10s': '2010〜今現在のアニメまでのタッチとカラー使い',
  },
  manga: {
    'bw': '白黒漫画に使う背景用の漫画タッチ',
    'color': 'カラー漫画に使う背景用の漫画タッチ',
  },
  '3dcg': {
    'ps': '3DCGかポリゴングラフィックをつかう画像(プレイステーション1時代のポリゴン)。3DCGかポリゴングラフィック以外は描写しないこと。PS1時代を超える高画質、高精細なテクスチャ、滑らかなモデルは禁止。',
    'low': '3DCGかポリゴングラフィックをつかう画像(プレイステーション2時代のポリゴン)。3DCGかポリゴングラフィック以外は描写しないこと。PS2時代を超える高画質、リアルなライティング、高精細なモデルは禁止。',
    'modern': '3DCGかポリゴングラフィックをつかう画像(現代の３DCG)。3DCGかポリゴングラフィック以外は描写しないこと。',
  },
  'pixel': {
    'standard': 'ドットグラフィック（ドット絵）を使用し画像を作る。ドット絵以外の描写は禁止。高解像度、滑らかな線、ベクター表現は行わないこと。アンチエイリアスのかからない、エッジの効いたブロック状の描写にすること。',
  }
};

const lineStylePrompts = {
  'std': '通常のアニメ・漫画の線画タッチ',
  'hot': '熱血アニメ風の力強い線画とコントラスト',
  'gekiga': '劇画調の太く荒々しい線画と陰影',
  'real': '写実的でリアルな描画スタイル',
  'lowgrade': '小学生向けの絵柄のタッチ',
  'kindergarten': '幼稚園児くらいの子供が好む絵のタッチ',
};

const modePrompts = {
  '4koma_layout': 'Create a 4-panel comic strip (4-koma manga) layout. Arrange the panels in a 2x2 grid (two panels on the top row, two panels on the bottom row). Ensure the panels are clearly divided.',
  'picture_book': 'Create an illustration in the style of a children\'s picture book. Use warm, soft colors and a whimsical, narrative-driven artistic style suitable for a storybook.',
};

// Image Item Type
interface SourceImage {
  id: string;
  data: string;
  enabled: boolean;
}

const App: React.FC = () => {
  // State
  const [lang, setLang] = useState<Language>('ja');
  
  // Model State
  const [selectedModel, setSelectedModel] = useState<GeminiModel>('gemini-3-pro-image-preview');

  // Replaced single originalImage with array of SourceImage
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  
  // Style State
  const [styleGroup, setStyleGroup] = useState<StyleGroup>(null);
  const [styleId, setStyleId] = useState<string | null>(null);
  const [lineStyleId, setLineStyleId] = useState<string | null>(null); // Default null
  const [modeId, setModeId] = useState<string | null>(null);
  const [preservationMode, setPreservationMode] = useState<PreservationMode>('none');
  
  // Preservation Popup State
  const [showPreservationPopup, setShowPreservationPopup] = useState(false);
  const [preservationPopupPos, setPreservationPopupPos] = useState({ x: 0, y: 0 });
  const preservationBtnRef = useRef<HTMLButtonElement>(null);
  const isDraggingPreservationRef = useRef(false);
  const dragOffsetPreservationRef = useRef({ x: 0, y: 0 });

  // Paper/Size State
  const [selectedPaperId, setSelectedPaperId] = useState<string>('a3a4'); // Default to merged A3/A4
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.RES_2K);
  const [fitToPaperMode, setFitToPaperMode] = useState<boolean>(false); // New State
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isAIStudioAvailable, setIsAIStudioAvailable] = useState(false);

  // Prompt Popup State
  const [showPromptPopup, setShowPromptPopup] = useState(false);
  const [popupPos, setPopupPos] = useState({ x: 100, y: 100 });
  const isDraggingPopupRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = getTranslation(lang);

  // --- Logic Helpers ---

  useEffect(() => {
    // Check if AI Studio platform integration is available
    if ((window as any).aistudio) {
      setIsAIStudioAvailable(true);
    }
  }, []);

  // Popup Drag Logic (Handles both Prompt and Preservation popups)
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      // Prompt Popup Drag
      if (isDraggingPopupRef.current) {
        setPopupPos({
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y
        });
      }
      // Preservation Popup Drag
      if (isDraggingPreservationRef.current) {
        setPreservationPopupPos({
          x: e.clientX - dragOffsetPreservationRef.current.x,
          y: e.clientY - dragOffsetPreservationRef.current.y
        });
      }
    };

    const handleMouseUp = () => {
      isDraggingPopupRef.current = false;
      isDraggingPreservationRef.current = false;
    };

    if (showPromptPopup || showPreservationPopup) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [showPromptPopup, showPreservationPopup]);

  // Determine Aspect Ratio based on Paper Size + Orientation
  const getCurrentAspectRatio = (): AspectRatio => {
    if (selectedPaperId === 'square') return AspectRatio.SQUARE;

    // Mobile/Story/Wide/Cinema groups (16:9 family)
    if (['mobile', 'story', 'wide'].includes(selectedPaperId)) {
      return orientation === 'portrait' ? AspectRatio.PORTRAIT_TALL : AspectRatio.LANDSCAPE_WIDE;
    }

    // Standard Papers (A3A4, Hagaki, Photo - 4:3 family)
    return orientation === 'portrait' ? AspectRatio.PORTRAIT_STANDARD : AspectRatio.LANDSCAPE_STANDARD;
  };

  // Construct Final Prompt
  const buildFinalPrompt = () => {
    let final = prompt;
    
    // Append Fixed Style Prompt
    if (styleGroup && styleId) {
      let fixedPrompt = "";
      
      if (styleGroup === 'anime') {
        fixedPrompt = stylePrompts.anime[styleId as keyof typeof stylePrompts.anime];
      } else if (styleGroup === 'manga') {
        fixedPrompt = stylePrompts.manga[styleId as keyof typeof stylePrompts.manga];
      } else if (styleGroup === '3dcg') {
        fixedPrompt = stylePrompts['3dcg'][styleId as keyof typeof stylePrompts['3dcg']];
      } else if (styleGroup === 'pixel') {
        fixedPrompt = stylePrompts['pixel'][styleId as keyof typeof stylePrompts['pixel']];
      }

      if (fixedPrompt) final += `\n(${fixedPrompt})`;
    }

    // Append Line Style Prompt
    if (lineStyleId && lineStylePrompts[lineStyleId as keyof typeof lineStylePrompts]) {
      final += `\n(${lineStylePrompts[lineStyleId as keyof typeof lineStylePrompts]})`;
    }

    // Append Mode Prompt
    if (modeId && modePrompts[modeId as keyof typeof modePrompts]) {
      final += `\n(${modePrompts[modeId as keyof typeof modePrompts]})`;
    }

    // Append Preservation Mode Instructions
    if (preservationMode === 'strict') {
      final += `\n(IMPORTANT: Strictly preserve the original image composition, structure, and details exactly. Do NOT change the content or lines. Only improve image quality or resolution.)`;
    } else if (preservationMode === 'line_art') {
      final += `\n(IMPORTANT: Strictly preserve the original line art and outlines. Do NOT change the drawing lines. Only colorize, texture, or shade the image.)`;
    } else if (preservationMode === 'character_background') {
      final += `\n(IMPORTANT: Strictly preserve the main subjects (people, characters, vehicles, weapons, armor, animals) in the image exactly. Do NOT change their appearance, pose, or details. Only modify the background environment.)`;
    } else if (preservationMode === 'same_character') {
      final += `\n(IMPORTANT: Generate a new image featuring the EXACT SAME character/person from the original image. Maintain facial features, hair, and key identity traits strictly. However, you MUST change the pose, action, and background environment based on the prompt instructions.)`;
    }

    // Append Fit To Paper Prompt with Orientation Reference
    if (fitToPaperMode) {
      const paperDef = paperSizes.find(p => p.id === selectedPaperId);
      const paperName = paperDef ? t[paperDef.labelKey as keyof typeof t] : 'Selected Paper';
      const orientationName = orientation === 'portrait' ? 'Portrait (Vertical)' : 'Landscape (Horizontal)';
      
      // Explicitly instructing the model about the paper and orientation
      final += `\n(IMPORTANT: Automatically adjust and extend the composition to perfectly fit the ${paperName} size in ${orientationName} orientation. Ensure the aspect ratio is strictly adhered to. There must be no unnatural borders, cropping, or empty spaces. Fill the entire canvas seamlessly to match this specific paper format.)`;
    }

    return final;
  };

  // --- Handlers ---

  const toggleLanguage = () => setLang(prev => prev === 'en' ? 'ja' : 'en');

  const handlePopupHeaderMouseDown = (e: React.MouseEvent) => {
    isDraggingPopupRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - popupPos.x,
      y: e.clientY - popupPos.y
    };
  };

  const handleTogglePreservationPopup = () => {
    if (showPreservationPopup) {
      setShowPreservationPopup(false);
      return;
    }
    
    // Calculate initial position: Right of the button
    if (preservationBtnRef.current) {
      const rect = preservationBtnRef.current.getBoundingClientRect();
      // Position to the right (rect.right + 10), align top (rect.top)
      setPreservationPopupPos({ x: rect.right + 12, y: rect.top });
    } else {
      setPreservationPopupPos({ x: 300, y: 200 }); // Fallback
    }
    
    setShowPreservationPopup(true);
  };

  const handlePreservationPopupHeaderMouseDown = (e: React.MouseEvent) => {
    isDraggingPreservationRef.current = true;
    dragOffsetPreservationRef.current = {
      x: e.clientX - preservationPopupPos.x,
      y: e.clientY - preservationPopupPos.y
    };
  };

  const handleSelectProject = async () => {
    try {
      await selectApiKey();
    } catch (e) {
      console.error("Project selection failed", e);
    }
  };

  const processFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Calculate how many we can add
    const remainingSlots = 10 - sourceImages.length;
    if (remainingSlots <= 0) return;

    const filesToProcess = Array.from(files).slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setSourceImages(prev => [
            ...prev, 
            { 
              id: Math.random().toString(36).substr(2, 9), 
              data: reader.result as string, 
              enabled: true 
            }
          ]);
          setGeneratedImage(null);
          setError(null);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset input so same file can be selected again if deleted
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleImageEnabled = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSourceImages(prev => prev.map(img => 
      img.id === id ? { ...img, enabled: !img.enabled } : img
    ));
  };

  const removeImage = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSourceImages(prev => prev.filter(img => img.id !== id));
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    const activeImages = sourceImages.filter(img => img.enabled).map(img => img.data);
    
    // Only block if no prompt AND no active images
    if (activeImages.length === 0 && !prompt) return;

    setIsGenerating(true);
    setError(null);

    const fullPrompt = buildFinalPrompt();
    const finalAspectRatio = getCurrentAspectRatio();

    try {
      // Pass array of active images to service
      const result = await editImageWithGemini(
        activeImages, 
        fullPrompt, 
        finalAspectRatio, 
        resolution,
        selectedModel
      );
      setGeneratedImage(result);
    } catch (err: any) {
      setError(err.message || t.errorGeneric);
    } finally {
      setIsGenerating(false);
    }
  };

  // Drag & Drop
  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const onDragLeave = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); }, []);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  }, [sourceImages]);

  const handleDownload = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage;
      link.download = `proedit-ai-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleReleaseStyle = () => {
    setStyleGroup(null);
    setStyleId(null);
  };

  const handleReleaseLineStyle = () => {
    setLineStyleId(null);
  };

  const handleReleaseMode = () => {
    setModeId(null);
  };

  const activeImagesCount = sourceImages.filter(i => i.enabled).length;
  const isGenerateDisabled = (activeImagesCount === 0 && !prompt) || isGenerating;
  const isRectangular = paperSizes.find(p => p.id === selectedPaperId)?.isRectangular;
  const isProModel = selectedModel === 'gemini-3-pro-image-preview';

  // Resolution Options
  const resolutionOptions = [
    { value: ImageResolution.RES_1K, label: t.res1k, icon: <Zap className="w-4 h-4" /> },
    { value: ImageResolution.RES_2K, label: t.res2k, icon: <Layers className="w-4 h-4" /> },
    { value: ImageResolution.RES_4K, label: t.res4k, icon: <Wand2 className="w-4 h-4" /> },
  ];

  const getPreservationLabel = () => {
    switch(preservationMode) {
      case 'strict': return t.preservationStrict;
      case 'line_art': return t.preservationLine;
      case 'character_background': return t.preservationCharacter;
      case 'same_character': return t.preservationSameChar;
      default: return t.preservationNone;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-500/30 relative">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
                {t.title}
              </h1>
              <p className="text-xs text-slate-500">{t.subtitle}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             {/* Project Selector Button (Replaces manual API Key button) */}
             <button
               onClick={handleSelectProject}
               className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-white text-xs font-medium transition-colors shadow-lg shadow-blue-500/20"
               title={t.selectProject}
             >
                <img src="https://www.gstatic.com/devrel-devsite/prod/v2210075a8929/googlegemini/images/favicon.png" className="w-3.5 h-3.5" alt="Google" />
                <span className="hidden sm:inline">{t.selectProjectBtn}</span>
             </button>

             <button 
               onClick={toggleLanguage}
               className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700"
             >
               <Globe className="w-3 h-3" />
               {lang === 'en' ? 'English' : '日本語'}
             </button>

             {/* Model Selector */}
             <div className="relative">
               <select
                 value={selectedModel}
                 onChange={(e) => setSelectedModel(e.target.value as GeminiModel)}
                 className="appearance-none pl-8 pr-8 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700 outline-none cursor-pointer font-medium"
               >
                 <option value="gemini-3-pro-image-preview">Gemini 3 Pro</option>
                 <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
                 <option value="gemini-2.5-flash-image">Gemini 2.5 Flash</option>
               </select>
               <Cpu className="w-3 h-3 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
               <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none border-l border-slate-600 border-b border-slate-600 w-1.5 h-1.5 -rotate-45 mb-0.5" />
             </div>
          </div>
        </div>
      </header>

      {/* Main Content: 3-Column Grid */}
      <main className="max-w-[1600px] mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* --- LEFT COLUMN (3 cols) --- 
            Contains: Upload, Prompt, Style Settings
        */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* 1. Upload Section (Multiple Images) */}
          <section className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon className="w-4 h-4" /> {t.sourceImage}
              </h2>
              
              <div className="flex items-center gap-3">
                {/* Preservation Mode Button (Trigger for Popup) */}
                <div className="relative">
                  <button
                    ref={preservationBtnRef}
                    onClick={handleTogglePreservationPopup}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg transition-all border ${
                      preservationMode === 'none' 
                      ? 'bg-slate-800 text-slate-500 border-slate-700 hover:bg-slate-700' 
                      : preservationMode === 'strict'
                      ? 'bg-green-500/20 text-green-400 border-green-500/50'
                      : preservationMode === 'line_art'
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/50'
                      : preservationMode === 'character_background'
                      ? 'bg-purple-500/20 text-purple-400 border-purple-500/50'
                      : 'bg-indigo-500/20 text-indigo-400 border-indigo-500/50'
                    }`}
                    title={getPreservationLabel()}
                  >
                    {preservationMode === 'none' && (
                      <div className="relative">
                          <Shield className="w-4 h-4" />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-full h-0.5 bg-slate-500 rotate-45 transform scale-110"></div>
                          </div>
                      </div>
                    )}
                    {preservationMode === 'strict' && <Lock className="w-4 h-4" />}
                    {preservationMode === 'line_art' && <PenTool className="w-4 h-4" />}
                    {preservationMode === 'character_background' && <User className="w-4 h-4" />}
                    {preservationMode === 'same_character' && <Copy className="w-4 h-4" />}
                  </button>
                </div>

                <span className="text-[10px] text-slate-500">{sourceImages.length}/10</span>
              </div>
            </div>
            
            <div className="space-y-3">
              {/* Image Grid */}
              {sourceImages.length > 0 && (
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {sourceImages.map((img) => (
                    <div 
                      key={img.id} 
                      className={`relative aspect-video rounded-lg overflow-hidden border transition-all group ${
                        img.enabled ? 'border-blue-500/30 bg-slate-950' : 'border-slate-800 bg-slate-950/50 opacity-60 grayscale'
                      }`}
                      onClick={(e) => toggleImageEnabled(img.id, e)}
                    >
                      <img src={img.data} alt="Source" className="w-full h-full object-cover" />
                      
                      {/* Controls Overlay */}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <button
                          onClick={(e) => toggleImageEnabled(img.id, e)}
                          className={`p-1.5 rounded-full ${img.enabled ? 'bg-green-500 text-white' : 'bg-slate-600 text-slate-300'} shadow-sm`}
                          title={img.enabled ? "Disable" : "Enable"}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => removeImage(img.id, e)}
                          className="p-1.5 rounded-full bg-red-500 text-white shadow-sm hover:bg-red-600"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Status Indicator */}
                      <div className={`absolute top-1 right-1 w-2.5 h-2.5 rounded-full border border-black/50 ${img.enabled ? 'bg-green-500' : 'bg-slate-600'}`}></div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Dropzone */}
              {sourceImages.length < 10 && (
                <div 
                  onClick={triggerFileUpload}
                  onDragOver={onDragOver}
                  onDragLeave={onDragLeave}
                  onDrop={onDrop}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group min-h-[100px] ${
                    isDragging 
                      ? 'border-blue-500 bg-blue-500/10 scale-[1.02]'
                      : 'border-slate-700 hover:border-slate-500 hover:bg-slate-800'
                  }`}
                >
                  <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 transition-transform ${isDragging ? 'scale-110 bg-blue-500' : 'bg-slate-800 group-hover:scale-110'}`}>
                    <Upload className={`w-4 h-4 ${isDragging ? 'text-white' : 'text-slate-400'}`} />
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">{t.uploadTitle}</p>
                </div>
              )}
            </div>
          </section>

          {/* 2. Prompt Section */}
          <section className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl relative group">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Wand2 className="w-4 h-4" /> {t.editPrompt}
              </h2>
              <button 
                onClick={() => setShowPromptPopup(true)}
                className="p-1 text-slate-500 hover:text-blue-400 transition-colors"
                title={t.expandPrompt}
              >
                 <Maximize2 className="w-4 h-4" />
              </button>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder={t.promptPlaceholder}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none h-24 text-sm"
            />
          </section>

          {/* 3. Style & Touch Section */}
          <section className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl flex-1">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                <Clapperboard className="w-4 h-4" /> {t.styleSectionTitle}
              </h2>
              {styleGroup && (
                <button 
                  onClick={handleReleaseStyle}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-all"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  {t.clear}
                </button>
              )}
            </div>
            
            {/* Main Style Group Tabs - 2x2 Grid */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => setStyleGroup('anime')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  styleGroup === 'anime' 
                    ? 'bg-indigo-600 text-white shadow-lg' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Clapperboard className="w-3.5 h-3.5" /> {t.groupAnime}
              </button>
              <button
                onClick={() => setStyleGroup('manga')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  styleGroup === 'manga' 
                    ? 'bg-slate-100 text-slate-900 shadow-lg' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" /> {t.groupManga}
              </button>
              <button
                onClick={() => setStyleGroup('3dcg')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  styleGroup === '3dcg' 
                    ? 'bg-teal-600 text-white shadow-lg' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Box className="w-3.5 h-3.5" /> {t.group3dcg}
              </button>
              <button
                onClick={() => setStyleGroup('pixel')}
                className={`py-2 px-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  styleGroup === 'pixel' 
                    ? 'bg-purple-600 text-white shadow-lg' 
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Gamepad2 className="w-3.5 h-3.5" /> {t.groupPixel}
              </button>
            </div>

            {/* Sub Options */}
            {styleGroup === 'anime' && (
              <div className="grid grid-cols-2 gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                {['80s', '90s', '00s', '10s'].map(k => (
                  <button
                    key={k}
                    onClick={() => setStyleId(k)}
                    className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${
                      styleId === k 
                        ? 'bg-indigo-900/50 border-indigo-500 text-indigo-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {t[`anime${k}` as keyof typeof t]}
                  </button>
                ))}
              </div>
            )}

            {styleGroup === 'manga' && (
              <div className="grid grid-cols-2 gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                {['BW', 'Color'].map(k => (
                  <button
                    key={k}
                    onClick={() => setStyleId(k.toLowerCase())}
                    className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${
                      styleId === k.toLowerCase()
                        ? 'bg-slate-200 border-white text-slate-900' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {t[`manga${k}` as keyof typeof t]}
                  </button>
                ))}
              </div>
            )}

            {styleGroup === '3dcg' && (
              <div className="grid grid-cols-2 gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                {['Ps', 'Low', 'Modern'].map(k => (
                  <button
                    key={k}
                    onClick={() => setStyleId(k.toLowerCase())}
                    className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${
                      styleId === k.toLowerCase()
                        ? 'bg-teal-900/50 border-teal-500 text-teal-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {t[`cg${k}` as keyof typeof t]}
                  </button>
                ))}
              </div>
            )}

            {styleGroup === 'pixel' && (
              <div className="grid grid-cols-1 gap-2 mb-4 animate-in fade-in slide-in-from-top-2">
                 <button
                    onClick={() => setStyleId('standard')}
                    className={`px-2 py-1.5 rounded-md text-xs border transition-colors ${
                      styleId === 'standard'
                        ? 'bg-purple-900/50 border-purple-500 text-purple-300' 
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                    }`}
                  >
                    {t.pixelStandard}
                  </button>
              </div>
            )}

            {/* Line Art / Finish Selector */}
            <div className="pt-4 border-t border-slate-800">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                   <PenTool className="w-3 h-3" /> {t.lineStyleTitle}
                 </h3>
                 {lineStyleId && (
                   <button 
                     onClick={handleReleaseLineStyle}
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-all"
                   >
                     <XCircle className="w-3.5 h-3.5" />
                     {t.clear}
                   </button>
                 )}
               </div>
               <div className="flex flex-wrap gap-2">
                 {['std', 'hot', 'gekiga', 'real', 'lowgrade', 'kindergarten'].map(k => (
                   <button
                     key={k}
                     onClick={() => setLineStyleId(k)}
                     className={`px-2 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${
                        lineStyleId === k
                          ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                          : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                     }`}
                   >
                     {t[`line${k.charAt(0).toUpperCase() + k.slice(1)}` as keyof typeof t]}
                   </button>
                 ))}
               </div>
            </div>

            {/* Mode Selector */}
            <div className="pt-4 mt-4 border-t border-slate-800">
               <div className="flex items-center justify-between mb-2">
                 <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                   <Grid2X2 className="w-3 h-3" /> {t.modeSectionTitle}
                 </h3>
                 {modeId && (
                   <button 
                     onClick={handleReleaseMode}
                     className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-all"
                   >
                     <XCircle className="w-3.5 h-3.5" />
                     {t.clear}
                   </button>
                 )}
               </div>
               <div className="flex flex-wrap gap-2">
                 <button
                   onClick={() => setModeId('4koma_layout')}
                   className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                      modeId === '4koma_layout'
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                   }`}
                 >
                   <Grid2X2 className="w-3 h-3" /> {t.mode4komaLayout}
                 </button>
                 <button
                   onClick={() => setModeId('picture_book')}
                   className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all flex items-center gap-2 ${
                      modeId === 'picture_book'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-600'
                   }`}
                 >
                   <Book className="w-3 h-3" /> {t.modePictureBook}
                 </button>
               </div>
            </div>
          </section>
        </div>

        {/* --- CENTER COLUMN (3 cols) --- 
            Contains: Output Size, Orientation, Quality, Generate Button
        */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          <section className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-5 h-full relative">
            
            {/* Overlay for Non-Pro Models */}
            {!isProModel && (
              <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-[1px] z-20 rounded-2xl flex flex-col items-center justify-center text-center p-6 border border-slate-800/50">
                <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-700 shadow-2xl max-w-[250px]">
                  <Lock className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                  <h3 className="text-sm font-bold text-slate-300 mb-1">Advanced Settings Locked</h3>
                  <p className="text-[10px] text-slate-500">Output size, orientation, and resolution controls are only available in <span className="text-blue-400 font-bold">Gemini 3 Pro</span>.</p>
                </div>
              </div>
            )}

            {/* Paper Selection */}
            <div className={!isProModel ? "opacity-30 pointer-events-none filter grayscale" : ""}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Layout className="w-4 h-4" /> {t.outputSize}
              </h2>
              <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto pr-1 scrollbar-thin">
                {paperSizes.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setSelectedPaperId(opt.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all text-center h-14 ${
                      selectedPaperId === opt.id
                        ? 'bg-blue-600 border-blue-500 text-white shadow-md' 
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-600 hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-[10px] font-bold leading-tight">{t[opt.labelKey as keyof typeof t]}</span>
                    <span className={`text-[9px] ${selectedPaperId === opt.id ? 'text-blue-200' : 'text-slate-600'}`}>{opt.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fit to Paper Mode Toggle */}
             <div className={`bg-slate-950 rounded-xl p-3 border border-slate-800 ${!isProModel ? "opacity-30 pointer-events-none filter grayscale" : ""}`}>
               <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    <Maximize2 className={`w-4 h-4 ${fitToPaperMode ? 'text-blue-400' : 'text-slate-500'}`} />
                    <div>
                      <h2 className="text-[11px] font-bold text-slate-300">{t.fitToPaperMode}</h2>
                      <p className="text-[9px] text-slate-500 leading-tight">{t.fitToPaperDesc}</p>
                    </div>
                 </div>
                 <button
                    onClick={() => setFitToPaperMode(!fitToPaperMode)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white/75 ${
                      fitToPaperMode ? 'bg-blue-600' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                        fitToPaperMode ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
               </div>
             </div>

            {/* Orientation Toggle */}
            {isRectangular && (
              <div className={`animate-in fade-in slide-in-from-top-1 ${!isProModel ? "opacity-30 pointer-events-none filter grayscale" : ""}`}>
                 <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                   <Crop className="w-4 h-4" /> {t.orientationTitle}
                 </h2>
                 <div className="grid grid-cols-2 gap-2">
                   <button
                     onClick={() => setOrientation('portrait')}
                     className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border text-[10px] font-medium transition-all ${
                       orientation === 'portrait'
                         ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                         : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'
                     }`}
                   >
                     <MoveVertical className="w-4 h-4" /> {t.orientPortrait}
                   </button>
                   <button
                     onClick={() => setOrientation('landscape')}
                     className={`flex flex-col items-center justify-center gap-1 py-2 rounded-lg border text-[10px] font-medium transition-all ${
                       orientation === 'landscape'
                         ? 'bg-blue-500/20 border-blue-500 text-blue-300'
                         : 'bg-slate-950 border-slate-800 text-slate-500 hover:bg-slate-800'
                     }`}
                   >
                     <MoveHorizontal className="w-4 h-4" /> {t.orientLandscape}
                   </button>
                 </div>
              </div>
            )}

            {/* Resolution Selector */}
            <div className={!isProModel ? "opacity-30 pointer-events-none filter grayscale" : ""}>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Monitor className="w-4 h-4" /> {t.qualityLevel}
              </h2>
              <div className="space-y-2">
                {resolutionOptions.map((opt) => (
                  <label 
                    key={opt.value}
                    className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-all ${
                      resolution === opt.value
                        ? 'bg-blue-900/20 border-blue-500/50' 
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                       <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                         resolution === opt.value ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-500'
                       }`}>
                         {opt.icon}
                       </div>
                       <span className={`text-xs font-semibold ${resolution === opt.value ? 'text-blue-400' : 'text-slate-300'}`}>
                         {opt.label}
                       </span>
                    </div>
                    <input 
                      type="radio" 
                      name="resolution" 
                      value={opt.value} 
                      checked={resolution === opt.value}
                      onChange={() => setResolution(opt.value)}
                      className="hidden"
                    />
                    <div className={`w-3 h-3 rounded-full border-2 flex items-center justify-center ${resolution === opt.value ? 'border-blue-500' : 'border-slate-700'}`}>
                      {resolution === opt.value && <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex-grow"></div>

            {/* Generate Button - Z-index elevated to stay above overlay */}
            <div className="mt-auto relative z-30">
              <button
                onClick={handleGenerate}
                disabled={isGenerateDisabled}
                className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg transition-all transform active:scale-95 flex items-center justify-center gap-2
                  ${isGenerateDisabled
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/25'
                  }`}
              >
                {isGenerating ? t.processing : (
                  <>
                    <Wand2 className="w-5 h-5" /> {t.generate}
                  </>
                )}
              </button>
              {error && (
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] text-center whitespace-pre-wrap">
                  {error}
                </div>
              )}
            </div>
          </section>
        </div>

        {/* --- RIGHT COLUMN (6 cols) --- 
            Contains: Preview Area
        */}
        <div className="lg:col-span-6 flex flex-col h-full min-h-[500px]">
          <div className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col">
            {/* Toolbar */}
            <div className="absolute top-4 right-4 z-10 flex gap-2">
              {generatedImage && (
                <button 
                  onClick={handleDownload}
                  className="bg-slate-900/80 backdrop-blur text-white p-2 rounded-lg hover:bg-blue-600 transition-colors border border-slate-700"
                  title={t.download}
                >
                  <Download className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Canvas */}
            <div className="flex-1 w-full h-full flex items-center justify-center p-6 bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
              {isGenerating ? (
                <Loader />
              ) : generatedImage ? (
                <img 
                  src={generatedImage} 
                  alt="Generated" 
                  className="max-w-full max-h-full rounded-lg shadow-2xl object-contain animate-in fade-in zoom-in duration-500"
                />
              ) : activeImagesCount > 0 ? (
                 // Show grid of enabled source images if no result yet
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full h-full content-center opacity-80">
                  {sourceImages.filter(i => i.enabled).map((img, idx) => (
                    <div key={img.id} className="relative aspect-video rounded-lg overflow-hidden border border-slate-700 shadow-xl bg-slate-950">
                       <img src={img.data} className="w-full h-full object-contain" />
                       <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                         Source {idx + 1}
                       </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center space-y-4 opacity-30">
                  <div className="w-24 h-24 rounded-3xl bg-slate-800 mx-auto flex items-center justify-center rotate-3">
                    <ImageIcon className="w-10 h-10 text-slate-400" />
                  </div>
                  <p className="text-slate-400 font-light text-xl">{t.previewEmpty}</p>
                </div>
              )}
            </div>
            
            {/* Model Info Footer */}
            <div className="bg-slate-950/50 p-2 flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-800">
               <p>{t.modelInfo} <span className="text-blue-400 font-bold">{selectedModel === 'gemini-3-pro-image-preview' ? 'Pro' : 'Flash'}</span></p>
               <p>{selectedModel}</p>
            </div>
          </div>
        </div>
      </main>

      {/* Preservation Mode Popup Window (Draggable) */}
      {showPreservationPopup && (
         <div 
           style={{ 
             top: preservationPopupPos.y, 
             left: preservationPopupPos.x,
             zIndex: 9999
           }}
           className="fixed w-64 bg-slate-900 border border-slate-600 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
         >
            {/* Header */}
            <div 
              className="bg-slate-800 p-2 cursor-move flex items-center justify-between"
              onMouseDown={handlePreservationPopupHeaderMouseDown}
            >
              <div className="flex items-center gap-2 px-2 text-slate-300">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-[10px] font-bold uppercase">{t.preservationTip}</span>
              </div>
              <button 
                onClick={() => setShowPreservationPopup(false)}
                className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-1 flex flex-col gap-1">
               {/* Option 1: None */}
               <button
                 onClick={() => { setPreservationMode('none'); }}
                 className={`w-full text-left px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${
                   preservationMode === 'none' ? 'bg-slate-800' : 'hover:bg-slate-800/50'
                 }`}
               >
                 <div className="p-2 bg-slate-800 rounded-lg text-slate-500 border border-slate-700">
                   <Shield className="w-4 h-4 opacity-50" />
                 </div>
                 <div className="flex-1">
                    <p className="text-xs font-bold text-slate-300">Standard</p>
                    <p className="text-[9px] text-slate-500">{t.preservationNone.split('：')[1] || "No restrictions"}</p>
                 </div>
                 {preservationMode === 'none' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
               </button>

               {/* Option 2: Strict */}
               <button
                 onClick={() => { setPreservationMode('strict'); }}
                 className={`w-full text-left px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${
                   preservationMode === 'strict' ? 'bg-green-900/20' : 'hover:bg-slate-800/50'
                 }`}
               >
                 <div className="p-2 bg-green-500/20 rounded-lg text-green-400 border border-green-500/30">
                   <Lock className="w-4 h-4" />
                 </div>
                 <div className="flex-1">
                    <p className="text-xs font-bold text-green-300">Strict Preservation</p>
                    <p className="text-[9px] text-slate-500">{t.preservationStrict.split('：')[1] || "Quality Up Only"}</p>
                 </div>
                 {preservationMode === 'strict' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
               </button>

               {/* Option 3: Line Art */}
               <button
                 onClick={() => { setPreservationMode('line_art'); }}
                 className={`w-full text-left px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${
                   preservationMode === 'line_art' ? 'bg-blue-900/20' : 'hover:bg-slate-800/50'
                 }`}
               >
                 <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400 border border-blue-500/30">
                   <PenTool className="w-4 h-4" />
                 </div>
                 <div className="flex-1">
                    <p className="text-xs font-bold text-blue-300">Line Art</p>
                    <p className="text-[9px] text-slate-500">{t.preservationLine.split('：')[1] || "Color/Texture Only"}</p>
                 </div>
                 {preservationMode === 'line_art' && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
               </button>

               {/* Option 4: Character Background */}
               <button
                 onClick={() => { setPreservationMode('character_background'); }}
                 className={`w-full text-left px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${
                   preservationMode === 'character_background' ? 'bg-purple-900/20' : 'hover:bg-slate-800/50'
                 }`}
               >
                 <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 border border-purple-500/30">
                   <User className="w-4 h-4" />
                 </div>
                 <div className="flex-1">
                    <p className="text-xs font-bold text-purple-300">Character Preservation</p>
                    <p className="text-[9px] text-slate-500">{t.preservationCharacter.split('：')[1] || "Change Background"}</p>
                 </div>
                 {preservationMode === 'character_background' && <CheckCircle2 className="w-4 h-4 text-purple-500" />}
               </button>

               {/* Option 5: Same Character (New) */}
               <button
                 onClick={() => { setPreservationMode('same_character'); }}
                 className={`w-full text-left px-3 py-2 flex items-center gap-3 rounded-lg transition-colors ${
                   preservationMode === 'same_character' ? 'bg-indigo-900/20' : 'hover:bg-slate-800/50'
                 }`}
               >
                 <div className="p-2 bg-indigo-500/20 rounded-lg text-indigo-400 border border-indigo-500/30">
                   <Copy className="w-4 h-4" />
                 </div>
                 <div className="flex-1">
                    <p className="text-xs font-bold text-indigo-300">Same Character</p>
                    <p className="text-[9px] text-slate-500">{t.preservationSameChar.split('：')[1] || "Change Pose/Loc"}</p>
                 </div>
                 {preservationMode === 'same_character' && <CheckCircle2 className="w-4 h-4 text-indigo-500" />}
               </button>
            </div>
         </div>
      )}

      {/* Prompt Editor Popup (Draggable & Resizable) */}
      {showPromptPopup && (
        <div 
          style={{ 
            top: popupPos.y, 
            left: popupPos.x,
            minWidth: '300px',
            minHeight: '200px',
            resize: 'both',
            overflow: 'auto',
            zIndex: 9999
          }}
          className="fixed bg-slate-900 border border-slate-600 rounded-xl shadow-2xl flex flex-col w-[500px] h-[300px]"
        >
           {/* Drag Handle / Header */}
           <div 
             className="bg-slate-800 p-2 cursor-move flex items-center justify-between rounded-t-xl"
             onMouseDown={handlePopupHeaderMouseDown}
           >
             <div className="flex items-center gap-2 px-2 text-slate-300">
               <Move className="w-4 h-4" />
               <span className="text-xs font-bold uppercase">{t.editPrompt}</span>
             </div>
             <button 
               onClick={() => setShowPromptPopup(false)}
               className="p-1 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white"
             >
               <X className="w-4 h-4" />
             </button>
           </div>
           
           {/* Editor Area */}
           <div className="flex-1 p-0">
             <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t.promptPlaceholder}
                className="w-full h-full bg-slate-950 p-4 text-slate-200 placeholder-slate-600 focus:outline-none resize-none font-mono text-sm leading-relaxed"
              />
           </div>
        </div>
      )}
    </div>
  );
};

export default App;