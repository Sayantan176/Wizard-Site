
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { generateWebsiteFromImage } from './services/geminiService';
import { GenerationStatus } from './types';
import PreviewFrame from './components/PreviewFrame';

type View = 'landing' | 'generator' | 'how-it-works';

const App: React.FC = () => {
  // Navigation & Theme State
  const [view, setView] = useState<View>('landing');
  const [isDark, setIsDark] = useState(false);

  // Generator State
  const [image, setImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [status, setStatus] = useState<GenerationStatus>(GenerationStatus.IDLE);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply Dark Mode
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

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
      setError("Please upload an image first.");
      return;
    }
    setStatus(GenerationStatus.LOADING);
    setError(null);
    try {
      const code = await generateWebsiteFromImage(image, prompt);
      setGeneratedCode(code);
      setStatus(GenerationStatus.SUCCESS);
      setActiveTab('preview');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setStatus(GenerationStatus.ERROR);
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
            Powered by Gemini 3
          </span>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-8">
            Code from <span className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Thin Air.</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto mb-10">
            Transform your hand-drawn sketches, wireframes, or screenshots into high-fidelity, responsive websites in seconds. It's not magic, it's Wizard.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={() => setView('generator')}
              className="px-8 py-4 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-bold text-lg shadow-xl shadow-purple-500/20 transition-all active:scale-95"
            >
              Start Building
            </button>
            <button 
              onClick={() => setView('how-it-works')}
              className="px-8 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl font-bold text-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-all"
            >
              How it works
            </button>
          </div>
        </div>
      </section>

      <section className="py-20 px-6 max-w-7xl mx-auto grid md:grid-cols-3 gap-8">
        {[
          { title: "Ultra Fast", desc: "Go from napkin sketch to functional code in under 30 seconds.", icon: "⚡" },
          { title: "Tailwind Native", desc: "Generated code uses clean, modern Tailwind CSS for easy styling.", icon: "🎨" },
          { title: "Interactive", desc: "Wizard automatically adds basic JS for menus, forms, and tabs.", icon: "🪄" }
        ].map((feat, i) => (
          <div key={i} className="p-8 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl shadow-sm">
            <div className="text-3xl mb-4">{feat.icon}</div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{feat.title}</h3>
            <p className="text-slate-500 dark:text-slate-400 leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </section>
    </div>
  );

  const renderHowItWorks = () => (
    <div className="flex-1 overflow-y-auto bg-white dark:bg-slate-950 transition-colors py-20 px-6">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-4xl font-extrabold text-slate-900 dark:text-white mb-4 text-center">The Wizardry Process</h2>
        <p className="text-slate-500 dark:text-slate-400 text-center mb-16 text-lg">Three simple steps to bring your vision to life.</p>
        
        <div className="space-y-16">
          {[
            { step: "01", title: "Upload your Vision", desc: "Take a photo of a whiteboard sketch, a hand-drawn napkin layout, or even a screenshot of a site you admire.", img: "📸" },
            { step: "02", title: "Describe the Magic", desc: "Tell the Wizard what you want. 'Make it a dark theme', 'Add a booking form', or 'Use modern gradients'.", img: "✍️" },
            { step: "03", title: "Abracadabra", desc: "Our AI engine analyzes your input and generates production-ready HTML/Tailwind code ready for deployment.", img: "✨" }
          ].map((item, i) => (
            <div key={i} className="flex gap-8 items-start">
              <div className="text-6xl font-black text-slate-100 dark:text-slate-800 leading-none">{item.step}</div>
              <div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
                  <span>{item.img}</span> {item.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed text-lg">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-20 text-center">
          <button 
            onClick={() => setView('generator')}
            className="px-10 py-5 bg-purple-600 text-white rounded-2xl font-bold text-xl shadow-xl shadow-purple-200 dark:shadow-none transition-all active:scale-95"
          >
            Try it now
          </button>
        </div>
      </div>
    </div>
  );

  const renderGenerator = () => (
    <div className="flex-1 flex flex-col md:flex-row overflow-hidden bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Inputs */}
      <div className="w-full md:w-1/3 lg:w-1/4 border-r dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col overflow-y-auto p-6 gap-6 transition-colors">
        <section>
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Step 1: The Blueprint</h2>
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-all ${
              image ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700 hover:border-purple-300 dark:hover:border-purple-500'
            }`}
          >
            {image ? (
              <div className="w-full flex flex-col items-center gap-3">
                <img src={image} alt="Upload preview" className="max-h-56 rounded-xl shadow-lg object-contain" />
                <span className="text-sm text-purple-600 dark:text-purple-400 font-bold">Swap Image</span>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium text-center">Drop sketch or click to browse</p>
              </>
            )}
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>
        </section>

        <section>
          <h2 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3">Step 2: The Incantation</h2>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Add special instructions for the Wizard..."
            className="w-full h-32 p-4 text-sm border dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-purple-500 outline-none resize-none bg-slate-50 dark:bg-slate-800 dark:text-white"
          />
        </section>

        <button
          onClick={handleGenerate}
          disabled={status === GenerationStatus.LOADING || !image}
          className={`w-full py-4 px-4 rounded-2xl font-bold text-white transition-all flex items-center justify-center gap-2 ${
            status === GenerationStatus.LOADING || !image
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:scale-[1.02] shadow-lg shadow-purple-500/20 active:scale-95'
          }`}
        >
          {status === GenerationStatus.LOADING ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Casting Spell...
            </>
          ) : "Cast Spell"}
        </button>

        {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-900/30">{error}</div>}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 md:p-8 flex flex-col bg-slate-100 dark:bg-slate-950 transition-colors">
        {generatedCode ? (
          <div className="h-full flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border dark:border-slate-800 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b dark:border-slate-800">
              <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                <button onClick={() => setActiveTab('preview')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'preview' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>Preview</button>
                <button onClick={() => setActiveTab('code')} className={`px-4 py-1.5 text-sm font-bold rounded-lg transition-all ${activeTab === 'code' ? 'bg-white dark:bg-slate-700 text-purple-600 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`}>Code</button>
              </div>
              {activeTab === 'code' && (
                <button onClick={copyToClipboard} className="text-sm font-bold text-purple-600 dark:text-purple-400 hover:opacity-75">Copy Code</button>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              {activeTab === 'preview' ? <div className="h-full p-2"><PreviewFrame code={generatedCode} /></div> : (
                <div className="h-full bg-slate-950 p-6 overflow-auto font-mono text-sm text-indigo-100"><pre><code>{generatedCode}</code></pre></div>
              )}
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <div className="w-24 h-24 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl text-4xl">✨</div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">Your creation awaits</h3>
              <p className="text-slate-500 dark:text-slate-400 leading-relaxed">The Wizard is ready to materialize your design. Upload a sketch to begin.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col font-sans selection:bg-purple-100 dark:selection:bg-purple-900/30">
      {/* Universal Nav */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b dark:border-slate-800 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-8">
          <button onClick={() => setView('landing')} className="flex items-center gap-2 group transition-transform active:scale-95">
            <div className="bg-gradient-to-br from-purple-600 to-indigo-600 p-2 rounded-xl group-hover:rotate-12 transition-transform shadow-lg shadow-purple-200 dark:shadow-none">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xl font-black text-slate-900 dark:text-white">Wizard</span>
          </button>
          
          <nav className="hidden md:flex items-center gap-6">
            <button onClick={() => setView('generator')} className={`text-sm font-bold transition-colors ${view === 'generator' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>Generator</button>
            <button onClick={() => setView('how-it-works')} className={`text-sm font-bold transition-colors ${view === 'how-it-works' ? 'text-purple-600 dark:text-purple-400' : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'}`}>How it works</button>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDark(!isDark)}
            className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:ring-2 ring-purple-500/50 transition-all"
          >
            {isDark ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 16.243l.707.707M7.757 7.757l.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" /></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
            )}
          </button>
          <button 
            onClick={() => setView('generator')}
            className="hidden md:block px-5 py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-sm font-bold transition-transform active:scale-95"
          >
            Get Started
          </button>
        </div>
      </header>

      {/* Main Content Switching */}
      <main className="flex-1 flex flex-col h-[calc(100vh-72px)] overflow-hidden">
        {view === 'landing' && renderLanding()}
        {view === 'generator' && renderGenerator()}
        {view === 'how-it-works' && renderHowItWorks()}
      </main>
    </div>
  );
};

export default App;
