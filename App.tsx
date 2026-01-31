
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateWebsiteFromImage, ColorPalette, GenerationOptions } from './services/geminiService';
import { GenerationStatus } from './types';
import PreviewFrame from './components/PreviewFrame';

type View = 'landing' | 'generator' | 'history';
type PreviewDevice = 'desktop' | 'mobile';

interface HistoryItem {
  id: string;
  timestamp: number;
  code: string;
  image: string | null;
  prompt: string;
  paletteName: string;
  fontFamily: string;
  colors: { primary: string; accent: string };
}

const PALETTES: ColorPalette[] = [
  { name: 'Midnight Pro', colors: ['#0f172a', '#334155', '#8b5cf6'], description: 'Sleek dark mode with deep blues.' },
  { name: 'Forest Deep', colors: ['#064e3b', '#065f46', '#10b981'], description: 'Organic emerald and sage.' },
  { name: 'Sunset Flare', colors: ['#7c2d12', '#9a3412', '#f97316'], description: 'Warm oranges and ambers.' },
  { name: 'Ocean Deep', colors: ['#1e3a8a', '#1d4ed8', '#0ea5e9'], description: 'Professional blues.' },
  { name: 'Royal Gold', colors: ['#1a1a1a', '#451a03', '#fbbf24'], description: 'Elegant black and gold.' },
  { name: 'Minimalist', colors: ['#ffffff', '#f1f5f9', '#0f172a'], description: 'Clean white space.' },
];

const FONTS = ['Inter', 'Roboto', 'Playfair Display', 'Montserrat', 'Merriweather', 'Space Grotesk', 'Fira Code', 'Lora', 'Poppins'];

const App: React.FC = () => {
  const [view, setView] = useState<View>('landing');
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('wizard-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  // Generator State
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [selectedPalette, setSelectedPalette] = useState<ColorPalette>(PALETTES[0]);
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [customColors, setCustomColors] = useState({ primary: PALETTES[0].colors[0], accent: PALETTES[0].colors[2] });
  const [useCustomColors, setUseCustomColors] = useState(false);
  
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [previewDevice, setPreviewDevice] = useState<PreviewDevice>('desktop');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Editor State
  const [isEditing, setIsEditing] = useState(false);
  const [selectedElementData, setSelectedElementData] = useState<{ tag: string; colors: { bg: string; text: string }; textContent: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const exportMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const savedHistory = localStorage.getItem('wizard-history');
    if (savedHistory) {
      try {
        setHistory(JSON.parse(savedHistory));
      } catch (e) {
        console.error("Failed to parse history", e);
        setHistory([]);
      }
    }

    const root = window.document.documentElement;
    if (isDark) root.classList.add('dark');
    else root.classList.remove('dark');
  }, [isDark]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    let interval: any;
    if (status === GenerationStatus.LOADING) {
      setProgress(0);
      interval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 99) return 99;
          return +(prev + (prev < 30 ? 3 : prev < 70 ? 1 : 0.2)).toFixed(1);
        });
      }, 100);
    } else if (status === GenerationStatus.SUCCESS) {
      setProgress(100);
    }
    return () => clearInterval(interval);
  }, [status]);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('wizard-theme', next ? 'dark' : 'light');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const a = document.createElement('a');
    const file = new Blob([content], { type: contentType });
    a.href = URL.createObjectURL(file);
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const handleDownload = (type: 'html' | 'css' | 'js') => {
    if (!generatedCode) return;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(generatedCode, 'text/html');

    if (type === 'html') {
      downloadFile(generatedCode, 'index.html', 'text/html');
    } else if (type === 'css') {
      const styles = Array.from(doc.querySelectorAll('style')).map(s => s.innerHTML).join('\n\n');
      downloadFile(styles || '/* No custom styles found */', 'style.css', 'text/css');
    } else if (type === 'js') {
      const scripts = Array.from(doc.querySelectorAll('script:not([src])'))
        .filter(s => !s.id.includes('wizard-editor-runtime'))
        .map(s => s.innerHTML).join('\n\n');
      downloadFile(scripts || '/* No custom scripts found */', 'script.js', 'text/javascript');
    }
    setShowExportMenu(false);
  };

  /**
   * Robust storage helper that handles quota issues by removing old items
   */
  const saveToHistory = (code: string) => {
    const newItem: HistoryItem = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      code,
      image,
      prompt,
      paletteName: selectedPalette.name,
      fontFamily: selectedFont,
      colors: useCustomColors ? customColors : { primary: selectedPalette.colors[0], accent: selectedPalette.colors[2] }
    };

    let currentHistory = [newItem, ...history];
    const maxItems = 12; // Reduced from 20 to preserve space
    if (currentHistory.length > maxItems) {
      currentHistory = currentHistory.slice(0, maxItems);
    }

    // Attempt to save to localStorage with retry logic if quota is exceeded
    let success = false;
    let attempts = 0;
    while (!success && currentHistory.length > 0 && attempts < currentHistory.length + 1) {
      try {
        localStorage.setItem('wizard-history', JSON.stringify(currentHistory));
        success = true;
      } catch (e) {
        // If storage is full, remove the oldest item and try again
        console.warn("Storage quota exceeded, removing oldest history item and retrying...");
        currentHistory.pop();
        attempts++;
      }
    }
    
    setHistory(currentHistory);
  };

  const clearHistory = () => {
    if (window.confirm("Are you sure you want to delete all items in the archive? This cannot be undone.")) {
      setHistory([]);
      localStorage.removeItem('wizard-history');
    }
  };

  const loadFromHistory = (item: HistoryItem) => {
    setGeneratedCode(item.code);
    setImage(item.image);
    setPrompt(item.prompt);
    setSelectedFont(item.fontFamily);
    const palette = PALETTES.find(p => p.name === item.paletteName) || PALETTES[0];
    setSelectedPalette(palette);
    setCustomColors(item.colors);
    setUseCustomColors(true);
    setView('generator');
    setActiveTab('preview');
    setIsEditing(false);
    setError(null);
  };

  const handleGenerate = async () => {
    if (!image) { setError("Please upload a sketch first."); return; }
    setStatus(GenerationStatus.LOADING);
    setError(null);
    setIsEditing(false);
    try {
      const code = await generateWebsiteFromImage({
        image, prompt, palette: selectedPalette, fontFamily: selectedFont,
        customColors: useCustomColors ? customColors : undefined
      });
      setGeneratedCode(code);
      saveToHistory(code);
      setStatus(GenerationStatus.SUCCESS);
      setActiveTab('preview');
    } catch (err: any) {
      console.error("Generation failed:", err);
      setError(err instanceof Error ? err.message : "The transmutation failed unexpectedly.");
      setStatus(GenerationStatus.ERROR);
    }
  };

  const addElementToSite = (tag: string, text: string, className: string) => {
    const iframe = document.querySelector('iframe');
    iframe?.contentWindow?.postMessage({ type: 'ADD_ELEMENT', payload: { tag, text, className } }, '*');
  };

  const pickColor = async (target: 'primary' | 'accent' | 'edit-bg' | 'edit-text') => {
    if (!('EyeDropper' in window)) { alert("Eyedropper tool not supported."); return; }
    try {
      // @ts-ignore
      const eyeDropper = new EyeDropper();
      const result = await eyeDropper.open();
      if (target === 'primary' || target === 'accent') {
        setCustomColors({ ...customColors, [target]: result.sRGBHex });
      } else {
        const key = target === 'edit-bg' ? 'backgroundColor' : 'color';
        const iframe = document.querySelector('iframe');
        iframe?.contentWindow?.postMessage({ type: 'UPDATE_STYLE', payload: { key, value: result.sRGBHex } }, '*');
      }
    } catch (e) { console.log("Cancelled"); }
  };

  const deleteElement = () => {
    const iframe = document.querySelector('iframe');
    iframe?.contentWindow?.postMessage({ type: 'DELETE_ELEMENT' }, '*');
    setSelectedElementData(null);
  };

  const renderLanding = () => (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 flex flex-col items-center justify-center p-8 text-center">
      <div className="max-w-4xl space-y-8 animate-in fade-in zoom-in duration-700">
        <div className="inline-block p-4 rounded-3xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 mb-4 ring-8 ring-purple-50 dark:ring-purple-900/10">
          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h1 className="text-6xl md:text-8xl font-black tracking-tighter dark:text-white leading-[0.9]">
          Paper to <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">Product</span> in Seconds.
        </h1>
        <p className="text-xl md:text-2xl text-slate-500 dark:text-slate-400 font-medium max-w-2xl mx-auto">
          The ultimate AI design-to-code companion. Upload your hand-drawn sketch and watch the Wizard conjure a high-fidelity website instantly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center pt-8">
          <button onClick={() => setView('generator')} className="px-10 py-5 bg-purple-600 text-white rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-2xl shadow-purple-500/20 active:scale-95">
            Start Conjuring
          </button>
          <button onClick={() => setView('history')} className="px-10 py-5 bg-white dark:bg-slate-900 border-2 dark:border-slate-800 text-slate-900 dark:text-white rounded-2xl font-black text-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95">
            View Archive
          </button>
        </div>
        <div className="pt-16 grid grid-cols-1 sm:grid-cols-3 gap-8 text-left border-t dark:border-slate-800">
          <div>
            <h4 className="font-black text-purple-600 dark:text-purple-400 text-xs uppercase tracking-widest mb-2">Vision-to-HTML</h4>
            <p className="text-sm text-slate-500">Perfectly replicate your hand-drawn sketches with AI vision.</p>
          </div>
          <div>
            <h4 className="font-black text-purple-600 dark:text-purple-400 text-xs uppercase tracking-widest mb-2">Live Editor</h4>
            <p className="text-sm text-slate-500">Modify elements, change colors, and reorder sections in real-time.</p>
          </div>
          <div>
            <h4 className="font-black text-purple-600 dark:text-purple-400 text-xs uppercase tracking-widest mb-2">Clean Export</h4>
            <p className="text-sm text-slate-500">Get production-ready Tailwind CSS and semantic HTML5.</p>
          </div>
        </div>
      </div>
    </div>
  );

  const renderGenerator = () => (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-100 dark:bg-slate-950">
      <div className="w-full md:w-1/3 lg:w-[25%] border-r dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto p-6 gap-8 scrollbar-none">
        
        {isEditing && generatedCode ? (
          <div className="flex flex-col gap-6 animate-in slide-in-from-left-4 duration-500">
            <header className="flex items-center justify-between border-b pb-4 dark:border-slate-800">
              <h2 className="text-xs font-black text-purple-600 dark:text-purple-400 uppercase tracking-widest">Editor Panel</h2>
              <button onClick={() => setIsEditing(false)} className="text-xs font-bold text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">BACK</button>
            </header>

            <section className="space-y-4">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Create Magic</h3>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => addElementToSite('h2', 'New Heading', 'text-4xl font-black mb-4')} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs font-bold hover:border-purple-500 transition-all">+ Heading</button>
                <button onClick={() => addElementToSite('p', 'New Paragraph text goes here.', 'text-slate-600 mb-4')} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs font-bold hover:border-purple-500 transition-all">+ Paragraph</button>
                <button onClick={() => addElementToSite('button', 'Get Started', 'px-6 py-2 bg-purple-600 text-white rounded-full font-bold')} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs font-bold hover:border-purple-500 transition-all">+ Button</button>
                <button onClick={() => addElementToSite('div', '', 'w-full h-64 bg-slate-200 rounded-2xl flex items-center justify-center')} className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border text-xs font-bold hover:border-purple-500 transition-all">+ Section</button>
              </div>
            </section>

            {selectedElementData ? (
              <section className="space-y-6 pt-6 border-t dark:border-slate-800 animate-in fade-in">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black text-purple-600 uppercase tracking-widest">Editing: {selectedElementData.tag}</h3>
                  <button onClick={deleteElement} className="text-xs font-bold text-red-500 hover:underline">Delete</button>
                </div>
                
                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase">Colors</label>
                    <div className="flex gap-4">
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400">Background</span>
                        <div className="flex gap-1">
                          <input type="color" value={selectedElementData.colors.bg === 'rgba(0, 0, 0, 0)' ? '#ffffff' : selectedElementData.colors.bg} onChange={(e) => {
                            const iframe = document.querySelector('iframe');
                            iframe?.contentWindow?.postMessage({ type: 'UPDATE_STYLE', payload: { key: 'backgroundColor', value: e.target.value } }, '*');
                          }} className="h-8 w-8 rounded cursor-pointer" />
                          <button onClick={() => pickColor('edit-bg')} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7V3m0 0L8 5m2-2l2 2" /></svg></button>
                        </div>
                      </div>
                      <div className="flex-1 flex flex-col gap-1">
                        <span className="text-[9px] text-slate-400">Text</span>
                        <div className="flex gap-1">
                          <input type="color" value={selectedElementData.colors.text} onChange={(e) => {
                            const iframe = document.querySelector('iframe');
                            iframe?.contentWindow?.postMessage({ type: 'UPDATE_STYLE', payload: { key: 'color', value: e.target.value } }, '*');
                          }} className="h-8 w-8 rounded cursor-pointer" />
                          <button onClick={() => pickColor('edit-text')} className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7V3m0 0L8 5m2-2l2 2" /></svg></button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-500 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl">Tip: You can edit text directly in the preview and drag elements to reorder them.</p>
                </div>
              </section>
            ) : (
              <div className="py-10 text-center border-2 border-dashed rounded-3xl dark:border-slate-800">
                <p className="text-slate-400 text-xs font-bold uppercase tracking-widest px-6">Select any element to style it</p>
              </div>
            )}
            
            <button onClick={() => setIsEditing(false)} className="mt-auto w-full py-4 rounded-2xl bg-purple-600 text-white font-black hover:bg-purple-700 transition-all shadow-xl shadow-purple-500/20">Finalize Magic</button>
          </div>
        ) : (
          <>
            <section>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">1. Upload Vision</h2>
              <div onClick={() => fileInputRef.current?.click()} className={`border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${image ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-purple-500'}`}>
                {image ? <img src={image} className="max-h-40 rounded-xl shadow-lg" /> : <div className="text-center py-4 text-slate-400"><svg className="w-10 h-10 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 4v16m8-8H4" /></svg><p className="text-xs font-bold">Add Sketch</p></div>}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>
            </section>

            <section>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">2. Typography</h2>
              <select value={selectedFont} onChange={(e) => setSelectedFont(e.target.value)} className="w-full p-4 rounded-2xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 font-bold outline-none focus:border-purple-500 transition-all">
                {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            </section>

            <section>
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest">3. Colors</h2>
                <button onClick={() => setUseCustomColors(!useCustomColors)} className="text-[10px] font-black text-purple-600 uppercase underline decoration-2">{useCustomColors ? 'Presets' : 'Custom'}</button>
              </div>
              {useCustomColors ? (
                <div className="grid grid-cols-1 gap-3">
                  {['primary', 'accent'].map(k => (
                    <div key={k} className="flex gap-2">
                      <div className="relative h-12 w-16 shrink-0 rounded-xl overflow-hidden border">
                        <input type="color" value={(customColors as any)[k]} onChange={(e) => setCustomColors({...customColors, [k]: e.target.value})} className="absolute inset-0 scale-[3] cursor-pointer" />
                      </div>
                      <input type="text" value={(customColors as any)[k]} onChange={(e) => setCustomColors({...customColors, [k]: e.target.value})} className="flex-1 p-3 rounded-xl border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 font-mono text-sm uppercase outline-none focus:border-purple-500" />
                      <button onClick={() => pickColor(k as any)} className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7V3m0 0L8 5m2-2l2 2" /></svg></button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {PALETTES.map(p => (
                    <button key={p.name} onClick={() => setSelectedPalette(p)} className={`p-2 rounded-xl border transition-all text-left ${selectedPalette.name === p.name ? 'border-purple-600 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-100 dark:border-slate-800 hover:border-slate-300'}`}>
                      <div className="flex gap-1 mb-1">{p.colors.map((c, i) => <div key={i} className="h-2 flex-1 rounded-full" style={{ backgroundColor: c }} />)}</div>
                      <span className="text-[10px] font-black uppercase tracking-tighter truncate block">{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">4. Refining the Spell</h2>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Add a navigation bar, make it look modern and sleek..."
                className="w-full h-32 p-4 text-sm border bg-slate-50 dark:bg-slate-800 dark:border-slate-700 rounded-3xl focus:border-purple-500 outline-none resize-none transition-all dark:text-white"
              />
            </section>

            <button onClick={handleGenerate} disabled={status === GenerationStatus.LOADING || !image} className={`w-full py-4 rounded-2xl font-black text-lg text-white transition-all shadow-xl ${status === GenerationStatus.LOADING || !image ? 'bg-slate-200 dark:bg-slate-800 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-105 active:scale-95'}`}>
              {status === GenerationStatus.LOADING ? <div className="flex items-center justify-center gap-3"><svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>{progress}%</div> : "Conjure Site"}
            </button>
          </>
        )}
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col relative overflow-hidden">
        {status === GenerationStatus.LOADING && (
          <div className="absolute inset-0 z-20 bg-white/80 dark:bg-slate-950/90 backdrop-blur-xl flex flex-col items-center justify-center animate-in fade-in">
            <div className="relative w-40 h-40 mb-8 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800"></div>
              <div className="absolute inset-0 rounded-full border-4 border-purple-600 border-t-transparent animate-spin"></div>
              <span className="text-3xl font-black">{Math.floor(progress)}%</span>
            </div>
            <h3 className="text-2xl font-black tracking-tight mb-2">Architecting Reality...</h3>
            <p className="text-slate-500 font-medium">Mixing CSS spells and HTML nodes</p>
          </div>
        )}

        {error && (
          <div className="absolute inset-0 z-30 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in">
            <div className="w-20 h-20 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
            </div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white mb-4">Transmutation Failed</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mb-8 text-lg">{error}</p>
            <button onClick={() => setError(null)} className="px-10 py-5 bg-purple-600 text-white rounded-2xl font-black text-xl hover:scale-105 transition-all shadow-xl shadow-purple-500/20 active:scale-95">Try Again</button>
          </div>
        )}

        {generatedCode ? (
          <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl border dark:border-slate-800 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between px-6 py-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 gap-4">
              <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-2xl gap-1">
                <button onClick={() => { setActiveTab('preview'); setIsEditing(false); }} className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'preview' && !isEditing ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>PREVIEW</button>
                <button onClick={() => { setActiveTab('preview'); setIsEditing(true); }} className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${isEditing ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-500'}`}>LIVE EDITOR</button>
                <button onClick={() => { setActiveTab('code'); setIsEditing(false); }} className={`px-4 py-2 text-xs font-black rounded-xl transition-all ${activeTab === 'code' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>SOURCE</button>
              </div>

              <div className="flex items-center gap-3">
                {!isEditing && activeTab === 'preview' && (
                  <div className="flex bg-slate-200/50 dark:bg-slate-800/50 p-1 rounded-xl">
                    <button onClick={() => setPreviewDevice('desktop')} className={`p-2 rounded-lg ${previewDevice === 'desktop' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm' : 'text-slate-400'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg></button>
                    <button onClick={() => setPreviewDevice('mobile')} className={`p-2 rounded-lg ${previewDevice === 'mobile' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm' : 'text-slate-400'}`}><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg></button>
                  </div>
                )}

                <div className="relative" ref={exportMenuRef}>
                  <button 
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-xs font-black hover:scale-105 active:scale-95 transition-all shadow-lg shadow-slate-900/10"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                    EXPORT
                  </button>
                  
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border dark:border-slate-800 z-30 py-2 animate-in fade-in zoom-in duration-200">
                      <button onClick={() => handleDownload('html')} className="w-full text-left px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between">
                        <span>index.html</span>
                        <span className="text-[10px] bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded uppercase">Full</span>
                      </button>
                      <button onClick={() => handleDownload('css')} className="w-full text-left px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between">
                        <span>style.css</span>
                        <span className="text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded uppercase">Styles</span>
                      </button>
                      <button onClick={() => handleDownload('js')} className="w-full text-left px-4 py-3 text-xs font-black text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors flex items-center justify-between">
                        <span>script.js</span>
                        <span className="text-[10px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 px-1.5 py-0.5 rounded uppercase">Logic</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden flex justify-center bg-slate-100 dark:bg-slate-950 p-2 transition-all duration-300">
              <div className={`h-full transition-all duration-500 ease-in-out shadow-2xl rounded-xl overflow-hidden ${activeTab === 'preview' && previewDevice === 'mobile' ? 'w-[375px]' : 'w-full'}`}>
                {activeTab === 'preview' ? (
                  <PreviewFrame code={generatedCode} isEditing={isEditing} onElementSelected={(d) => setSelectedElementData(d as any)} onCodeUpdate={(c) => setGeneratedCode(c)} />
                ) : (
                  <div className="h-full bg-slate-950 p-6 overflow-auto font-mono text-xs text-indigo-100 scrollbar-thin">
                    <div className="flex justify-between items-center mb-4 border-b border-slate-800 pb-2">
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Source Code</span>
                      <button onClick={() => { navigator.clipboard.writeText(generatedCode); }} className="text-[10px] font-black uppercase text-purple-400 hover:text-purple-300">Copy to clipboard</button>
                    </div>
                    <pre className="leading-relaxed whitespace-pre-wrap"><code>{generatedCode}</code></pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-white/50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-200 dark:border-slate-800">
            <span className="text-8xl mb-8 animate-bounce">🔮</span>
            <h3 className="text-3xl font-black mb-4 tracking-tighter">Enter the Wizard's Sanctum</h3>
            <p className="text-slate-500 dark:text-slate-400 max-w-sm text-lg font-medium">Upload a sketch and pick your style to transmute paper into functional code.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-8 md:p-20 transition-all">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-5xl font-black tracking-tight mb-2">The Archive</h2>
            <p className="text-lg text-slate-500 font-medium">Revisit your previous creations.</p>
          </div>
          <div className="flex gap-4">
            {history.length > 0 && (
              <button onClick={clearHistory} className="text-red-500 font-black hover:underline uppercase tracking-widest text-sm">Clear Archive</button>
            )}
            <button onClick={() => setView('generator')} className="text-purple-600 font-black hover:underline uppercase tracking-widest text-sm">Return to Lab</button>
          </div>
        </div>
        {history.length === 0 ? (
          <div className="py-20 text-center bg-white dark:bg-slate-900 rounded-[3rem] border-2 border-dashed dark:border-slate-800">
            <p className="text-slate-400 text-xl font-black uppercase">Archive is empty</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {history.map(item => (
              <div key={item.id} onClick={() => loadFromHistory(item)} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] overflow-hidden border border-slate-200 dark:border-slate-800 cursor-pointer hover:shadow-2xl transition-all hover:-translate-y-2">
                <div className="h-40 bg-slate-100 dark:bg-slate-800 relative overflow-hidden flex items-center justify-center">
                  {item.image ? <img src={item.image} className="w-full h-full object-cover opacity-60 group-hover:scale-110 transition-transform duration-700" /> : <span className="text-5xl">🔮</span>}
                  <button onClick={(e) => { e.stopPropagation(); const updated = history.filter(h => h.id !== item.id); setHistory(updated); localStorage.setItem('wizard-history', JSON.stringify(updated)); }} className="absolute top-4 right-4 p-2 bg-red-500/80 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                </div>
                <div className="p-6"><h3 className="text-lg font-black truncate mb-1">{item.prompt || "Untitled Vision"}</h3><p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">{new Date(item.timestamp).toLocaleDateString()}</p></div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b dark:border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-50 transition-colors">
        <button onClick={() => setView('landing')} className="flex items-center gap-3 group active:scale-95 transition-all">
          <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2 rounded-2xl text-white shadow-lg group-hover:rotate-12 transition-transform"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg></div>
          <span className="text-2xl font-black dark:text-white tracking-tighter">WIZARD</span>
        </button>
        <div className="flex items-center gap-8">
          <nav className="hidden md:flex gap-8">
            <button onClick={() => setView('generator')} className={`text-xs font-black tracking-widest uppercase transition-all ${view === 'generator' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Lab</button>
            <button onClick={() => setView('history')} className={`text-xs font-black tracking-widest uppercase transition-all ${view === 'history' ? 'text-purple-600' : 'text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>Archive</button>
          </nav>
          <button onClick={toggleTheme} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-500 hover:scale-110 active:scale-90 transition-all">{isDark ? "☀️" : "🌙"}</button>
        </div>
      </header>
      <main className="flex-1 flex flex-col h-[calc(100vh-81px)] overflow-hidden">
        {view === 'landing' ? renderLanding() : view === 'history' ? renderHistory() : renderGenerator()}
      </main>
    </div>
  );
};

export default App;
