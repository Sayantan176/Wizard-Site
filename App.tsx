import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateWebsiteFromImage } from './services/geminiService';
import { GenerationStatus } from './types';
import PreviewFrame from './components/PreviewFrame';

type View = 'landing' | 'generator' | 'how-it-works';

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
  const [hasUserKey, setHasUserKey] = useState(false);

  // Generator State
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const root = window.document.documentElement;
    if (isDark) {
      root.classList.add('dark');
      localStorage.setItem('wizard-theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('wizard-theme', 'light');
    }
  }, [isDark]);

  useEffect(() => {
    const checkKey = async () => {
      const aiStudio = (window as any).aistudio;
      if (aiStudio) {
        try {
          const has = await aiStudio.hasSelectedApiKey();
          setHasUserKey(has);
        } catch (e) {
          console.debug("API key check skipped", e);
        }
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyPicker = async () => {
    const aiStudio = (window as any).aistudio;
    if (aiStudio) {
      await aiStudio.openSelectKey();
      setHasUserKey(true);
      setError(null);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = async () => {
    if (!image) {
      setError("Please upload a sketch first.");
      return;
    }
    setStatus(GenerationStatus.LOADING);
    setError(null);
    try {
      const code = await generateWebsiteFromImage(image, prompt);
      setGeneratedCode(code);
      setStatus(GenerationStatus.SUCCESS);
      setActiveTab('preview');
    } catch (err: any) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
      setStatus(GenerationStatus.ERROR);
      
      if (msg.includes("Requested entity was not found")) {
        setHasUserKey(false);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedCode);
  };

  const renderLanding = () => (
    <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 transition-colors">
      <section className="relative py-20 px-6 max-w-7xl mx-auto text-center overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full opacity-10 pointer-events-none">
          <div className="absolute top-10 left-10 w-64 h-64 bg-purple-500 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-10 right-10 w-64 h-64 bg-blue-500 rounded-full blur-[120px]"></div>
        </div>
        
        <div className="relative z-10">
          <span className="inline-block py-1 px-3 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 text-sm font-semibold mb-6">
            Powered by Gemini 3 Flash
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8">
            Code from <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Thin Air.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
            Turn your drawings, whiteboard sketches, or wireframes into fully functional websites instantly.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => setView('generator')}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/20 transition-all active:scale-95 w-full sm:w-auto"
            >
              Start Building
            </button>
            {!hasUserKey && (
              <button 
                onClick={handleOpenKeyPicker}
                className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all w-full sm:w-auto"
              >
                Use Private Key
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        {[
          { title: "Fast Generation", desc: "Built with Gemini 3 Flash for rapid prototyping and higher availability.", icon: "⚡" },
          { title: "Visual Logic", desc: "The Wizard extracts the exact layout from your photo using advanced vision.", icon: "👁️" },
          { title: "Code Ready", desc: "Get clean Tailwind CSS and HTML you can use immediately.", icon: "🏗️" }
        ].map((feat, i) => (
          <div key={i} className="p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm hover:shadow-md transition-all">
            <div className="text-3xl mb-4">{feat.icon}</div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );

  const renderGenerator = () => (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
      <div className="w-full md:w-1/3 lg:w-1/4 border-r dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto p-6 gap-6 transition-colors">
        <section>
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Step 1: Upload Sketch</h2>
            {hasUserKey && <span className="text-[10px] px-2 py-0.5 bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 rounded-full font-bold">Premium Key</span>}
          </div>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
              image ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-purple-300'
            }`}
          >
            {image ? (
              <div className="w-full flex flex-col items-center gap-3">
                <img src={image} alt="Upload preview" className="max-h-56 rounded-xl shadow-lg object-contain" />
                <span className="text-sm text-purple-600 font-bold">Change Image</span>
              </div>
            ) : (
              <div className="text-center">
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                </div>
                <p className="text-sm text-slate-500">Click to upload photo</p>
              </div>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Step 2: Add Context</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g. 'Use a dark blue theme', 'Make buttons rounded'..."
            className="w-full h-24 p-4 text-sm border dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none resize-none bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
          />
        </section>

        <button
          onClick={handleGenerate}
          disabled={status === GenerationStatus.LOADING || !image}
          className={`w-full py-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
            status === GenerationStatus.LOADING || !image
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-purple-600 hover:bg-purple-700 shadow-lg active:scale-95'
          }`}
        >
          {status === GenerationStatus.LOADING ? "Casting Spell..." : "Generate Website"}
        </button>

        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30 flex flex-col gap-3">
            <div className="flex gap-2">
              <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>{error}</span>
            </div>
            {error.includes("quota") && (
              <button 
                onClick={handleOpenKeyPicker}
                className="bg-red-600 text-white py-2 rounded-lg font-bold hover:bg-red-700 transition-colors"
              >
                Connect Your Own Key
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 p-4 md:p-8 flex flex-col overflow-hidden">
        {generatedCode ? (
          <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setActiveTab('preview')} className={`px-4 py-1.5 text-sm font-bold rounded-lg ${activeTab === 'preview' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Preview</button>
                <button onClick={() => setActiveTab('code')} className={`px-4 py-1.5 text-sm font-bold rounded-lg ${activeTab === 'code' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm' : 'text-slate-500'}`}>Code</button>
              </div>
              <button onClick={copyToClipboard} className="text-xs font-bold text-slate-500 hover:text-purple-600">Copy Code</button>
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === 'preview' ? <PreviewFrame code={generatedCode} /> : (
                <div className="h-full bg-slate-950 p-6 overflow-auto font-mono text-xs text-indigo-100 scrollbar-thin"><pre><code>{generatedCode}</code></pre></div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center">
            <div className="max-w-xs">
              <div className="text-6xl mb-6 opacity-50">✨</div>
              <h3 className="text-xl font-bold mb-2">Ready to Build?</h3>
              <p className="text-slate-500 text-sm">Upload a photo of your sketch and the Wizard will bring it to life.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <button onClick={() => setView('landing')} className="flex items-center gap-2">
          <div className="bg-purple-600 p-2 rounded-xl text-white">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
          </div>
          <span className="text-lg font-black dark:text-white tracking-tight">Wizard</span>
        </button>
        <div className="flex items-center gap-4">
          <nav className="hidden md:flex gap-6 mr-6">
            <button onClick={() => setView('generator')} className={`text-sm font-bold ${view === 'generator' ? 'text-purple-600' : 'text-slate-500'}`}>Generator</button>
          </nav>
          <button onClick={() => setIsDark(!isDark)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 hover:ring-2 ring-purple-500/20">
            {isDark ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 16.243l.707.707M7.757 7.757l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg> : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>}
          </button>
        </div>
      </header>
      <main className="flex-1 flex flex-col h-[calc(100vh-65px)]">
        {view === 'landing' ? renderLanding() : renderGenerator()}
      </main>
    </div>
  );
};

export default App;