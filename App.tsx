import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AspectRatio, ImageResolution, Language, Orientation, StyleGroup } from './types';
import { editImageWithGemini, getStoredApiKey, saveApiKey, removeApiKey, selectApiKey } from './services/geminiService';
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
  Key
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
  '4koma_layout': 'Create a 4-panel comic strip (4-koma manga) layout. The image must be divided into 4 clear panels.',
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
  
  // Replaced single originalImage with array of SourceImage
  const [sourceImages, setSourceImages] = useState<SourceImage[]>([]);
  
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>("");
  
  // Style State
  const [styleGroup, setStyleGroup] = useState<StyleGroup>(null);
  const [styleId, setStyleId] = useState<string | null>(null);
  const [lineStyleId, setLineStyleId] = useState<string | null>(null); // Default null
  const [modeId, setModeId] = useState<string | null>(null);

  // Paper/Size State
  const [selectedPaperId, setSelectedPaperId] = useState<string>('a3a4'); // Default to merged A3/A4
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [resolution, setResolution] = useState<ImageResolution>(ImageResolution.RES_2K);
  const [fitToPaperMode, setFitToPaperMode] = useState<boolean>(false); // New State
  
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);

  // API Key Modal State
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);
  const [isAIStudioAvailable, setIsAIStudioAvailable] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const t = getTranslation(lang);

  // --- Logic Helpers ---

  useEffect(() => {
    // Check for API key on mount
    const key = getStoredApiKey();
    if (key) {
      setHasStoredKey(true);
      setApiKeyInput(key);
    }
    // Check if AI Studio platform integration is available
    if ((window as any).aistudio) {
      setIsAIStudioAvailable(true);
    }
  }, []);

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

  const handleOpenKeyModal = () => {
    const currentKey = getStoredApiKey() || '';
    setApiKeyInput(currentKey);
    setIsKeyModalOpen(true);
  };

  const handleSaveApiKey = () => {
    if (apiKeyInput.trim()) {
      saveApiKey(apiKeyInput.trim());
      setHasStoredKey(true);
      setError(null);
      // Optional: Close modal on save, or just show success state
      // setIsKeyModalOpen(false); 
    }
  };

  const handleRemoveApiKey = () => {
    removeApiKey();
    setApiKeyInput('');
    setHasStoredKey(false);
  };

  const handleSelectProject = async () => {
    try {
      await selectApiKey();
      setIsKeyModalOpen(false); // Close modal after selection if successful
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
    // If no local key and AI Studio is not available, force open settings
    if (!hasStoredKey && !isAIStudioAvailable) {
      setIsKeyModalOpen(true);
      setError(t.keyMissing);
      return;
    }

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
        resolution
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

  // Resolution Options
  const resolutionOptions = [
    { value: ImageResolution.RES_1K, label: t.res1k, icon: <Zap className="w-4 h-4" /> },
    { value: ImageResolution.RES_2K, label: t.res2k, icon: <Layers className="w-4 h-4" /> },
    { value: ImageResolution.RES_4K, label: t.res4k, icon: <Wand2 className="w-4 h-4" /> },
  ];

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
             {/* API Key Settings Button */}
             <button 
               onClick={handleOpenKeyModal}
               className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-colors border ${
                 hasStoredKey 
                   ? 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-blue-900/30' 
                   : 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border-red-500/30'
               }`}
               title={t.selectProject}
             >
               <Key className="w-3 h-3" />
               <span className="hidden sm:inline">{t.selectProject}</span>
             </button>

             <button 
               onClick={toggleLanguage}
               className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors border border-slate-700"
             >
               <Globe className="w-3 h-3" />
               {lang === 'en' ? 'English' : '日本語'}
             </button>
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
              <span className="text-[10px] text-slate-500">{sourceImages.length}/10</span>
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
          <section className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Wand2 className="w-4 h-4" /> {t.editPrompt}
            </h2>
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
          <section className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-5 h-full">
            
            {/* Paper Selection */}
            <div>
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
             <div className="bg-slate-950 rounded-xl p-3 border border-slate-800">
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
              <div className="animate-in fade-in slide-in-from-top-1">
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
            <div>
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

            {/* Generate Button */}
            <div className="mt-auto">
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
                <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-[10px] text-center">
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
               <p>{t.modelInfo}</p>
               <p>{t.modelSub}</p>
            </div>
          </div>
        </div>
      </main>

      {/* API Key Modal */}
      {isKeyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <button 
              onClick={() => setIsKeyModalOpen(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-blue-600/20 rounded-full text-blue-400">
                <Key className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-white">{t.apiKeyTitle}</h2>
            </div>
            
            <p className="text-sm text-slate-400 mb-6 leading-relaxed">
              {t.apiKeyDesc}
            </p>
            
            <div className="space-y-4">
              <div>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder={t.apiKeyPlaceholder}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-mono"
                />
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleSaveApiKey}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white py-3 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/20"
                >
                  {t.saveKey}
                </button>
                {hasStoredKey && (
                  <button
                    onClick={handleRemoveApiKey}
                    className="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl font-medium transition-colors border border-red-500/20"
                  >
                    {t.removeKey}
                  </button>
                )}
              </div>
              
              {hasStoredKey && (
                <p className="text-xs text-green-400 flex items-center justify-center gap-1.5 mt-2">
                  <CheckCircle2 className="w-3 h-3" /> {t.keySaved}
                </p>
              )}

              {/* AI Studio Project Fallback */}
              {isAIStudioAvailable && (
                <div className="pt-4 mt-4 border-t border-slate-800">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-px bg-slate-800 flex-1"></div>
                    <span className="text-xs text-slate-500 uppercase">{t.or}</span>
                    <div className="h-px bg-slate-800 flex-1"></div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 text-center">{t.useCloudProject}</p>
                   <button
                    onClick={handleSelectProject}
                    className="w-full py-3 rounded-xl font-medium transition-colors border border-slate-700 hover:bg-slate-800 text-slate-300 flex items-center justify-center gap-2"
                  >
                    <img src="https://www.gstatic.com/devrel-devsite/prod/v2210075a8929/googlegemini/images/favicon.png" className="w-4 h-4" alt="Google" />
                    {t.selectProjectBtn}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;