import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [lang, setLang] = useState('en');
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(0); 
  const [outputUrl, setOutputUrl] = useState(null);
  const pollingRef = useRef(null);

  // PULLS THE URL FROM VERCEL ENVIRONMENT VARIABLES
  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, ""); 
  const isRTL = lang === 'ar' || lang === 'ku';

  const content = {
    en: { title: "DUB STUDIO AI", sub: "Production-level AI Dubbing", drop: "Selected: ", placeholder: "Drop video or tap to upload", btn: "START DUBBING", processing: "AI is working...", done: "DOWNLOAD DUBBED VIDEO", steps: ["Extracting", "Transcribing", "Translating", "Dubbing"] },
    ar: { title: "دبلجة الذكاء الاصطناعي", sub: "إنتاج احترافی للدبلجة", drop: "تم اختيار: ", placeholder: "اسحب الفيديو أو اضغط للرفع", btn: "ابدأ الدبلجة", processing: "الذكاء الاصطناعي يعمل...", done: "تحميل الفيديو المدبلج", steps: ["استخراج الصوت", "تحویل النص", "الترجمة", "الدبلجة"] },
    ku: { title: "دۆبێ ستۆدیۆ ئای ئای", sub: "دۆبلاجکردنی پرۆفیشناڵ", drop: "دیاریکرا: ", placeholder: "ڤیدیۆکە لێرە دابنێ یان کلیک بکە", btn: "دەستپێکردن", processing: "خەریکی کارکردنە...", done: "دابەزاندنی ڤیدیۆکە", steps: ["دەرهێنانی دەنگ", "نووسینەوە", "وەرگێڕان", "دۆبلاجکردن"] }
  };

  // Clean up polling if user leaves page
  useEffect(() => {
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, []);

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setOutputUrl(null);
      setStatus(0);
    }
  };

  const startDubbing = async () => {
    if (!file) return alert("Please select a video first!");
    if (!API_URL) return alert("API URL is missing in Vercel Settings!");

    setIsProcessing(true);
    setStatus(1);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_lang", lang);

    try {
      // 1. Initial Upload - Returns Job ID immediately
      const response = await fetch(`${API_URL}/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");
      const { job_id } = await response.json();

      // 2. Start Polling the status endpoint
      pollingRef.current = setInterval(async () => {
        try {
          const res = await fetch(`${API_URL}/status/${job_id}`);
          const data = await res.json();

          if (data.status === "completed") {
            clearInterval(pollingRef.current);
            setStatus(4);
            setIsProcessing(false);
            setOutputUrl(`${API_URL}/download/${job_id}`);
          } else if (data.status === "failed") {
            clearInterval(pollingRef.current);
            alert("AI processing failed on the server.");
            setIsProcessing(false);
          } else if (data.status === "processing") {
            // Gradually increment steps based on time to keep UI feeling alive
            setStatus((prev) => (prev < 3 ? prev + 1 : prev));
          }
        } catch (e) {
          console.log("Waiting for server to respond...");
        }
      }, 5000); // Check every 5 seconds

    } catch (err) {
      alert("Connection failed. Ensure HuggingFace is 'Running'.");
      setIsProcessing(false);
    }
  };

  return (
    <div className={`min-h-screen bg-[#030303] text-slate-100 selection:bg-purple-500/30 ${isRTL ? 'rtl' : 'ltr'}`} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      
      {/* Dynamic Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-purple-500 bg-clip-text text-transparent">
          {content[lang].title} <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full align-middle ml-2 font-bold">PRO</span>
        </h1>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-xs md:text-sm outline-none cursor-pointer hover:bg-white/10 transition-all">
          <option value="en">English</option>
          <option value="ar">العربية</option>
          <option value="ku">کوردی</option>
        </select>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 md:py-20 text-center">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <p className="text-purple-400 font-semibold tracking-widest text-xs uppercase mb-4">{content[lang].sub}</p>
          <h2 className="text-4xl md:text-7xl font-bold tracking-tight mb-12">Global Reach.<br/><span className="text-slate-500 text-3xl md:text-6xl">Local Voice.</span></h2>
        </motion.div>

        {/* Glassmorphic Upload Zone */}
        <div className="relative group backdrop-blur-3xl bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-12 md:p-24 transition-all hover:border-purple-500/40 shadow-2xl overflow-hidden">
          <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" accept="video/*" />
          <div className="flex flex-col items-center pointer-events-none transition-transform group-hover:scale-105 duration-500">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-500/20 to-blue-500/20 rounded-3xl flex items-center justify-center mb-8 border border-white/10 group-hover:rotate-6 transition-all">
               <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <p className="text-xl font-medium text-slate-200">
              {file ? `${content[lang].drop} ${file.name}` : content[lang].placeholder}
            </p>
            <p className="text-slate-500 mt-2 text-sm">MP4, MOV up to 500MB</p>
          </div>
        </div>

        {/* Interactive Button */}
        <div className="mt-12">
          {!outputUrl ? (
            <motion.button 
              whileTap={{ scale: 0.95 }}
              onClick={startDubbing}
              disabled={isProcessing}
              className={`relative bg-white text-black px-16 py-5 rounded-full font-bold text-lg transition-all ${isProcessing ? 'opacity-40 cursor-wait' : 'hover:bg-purple-50 shadow-xl shadow-white/5'}`}
            >
              {isProcessing ? content[lang].processing : content[lang].btn}
            </motion.button>
          ) : (
            <motion.a 
              initial={{ scale: 0.8 }} animate={{ scale: 1 }}
              href={outputUrl} download className="inline-block bg-gradient-to-r from-green-400 to-emerald-600 text-white px-16 py-5 rounded-full font-bold text-lg hover:shadow-2xl hover:shadow-green-500/30 transition-all"
            >
              {content[lang].done}
            </motion.a>
          )}
        </div>

        {/* Progress Grid */}
        <div className="mt-24 grid grid-cols-2 lg:grid-cols-4 gap-4">
          {content[lang].steps.map((step, i) => (
            <div key={i} className={`p-5 rounded-[1.5rem] border transition-all duration-700 ${status > i ? 'bg-green-500/5 border-green-500/20' : 'bg-white/[0.01] border-white/5'}`}>
              <div className="flex justify-between items-center mb-3">
                <span className={`text-[10px] font-black tracking-widest ${status > i ? 'text-green-400' : 'text-purple-500'}`}>
                  {status > i ? "✓ COMPLETED" : `STEP 0${i+1}`}
                </span>
                {status === i && isProcessing && (
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-ping" />
                )}
              </div>
              <span className={`text-sm font-semibold transition-colors ${status > i ? 'text-white' : 'text-slate-400'}`}>{step}</span>
              <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-1000 ${status > i ? 'bg-green-500' : 'bg-purple-600'}`} 
                  style={{ width: status > i ? '100%' : status === i ? '60%' : '0%' }} 
                />
              </div>
            </div>
          ))}
        </div>
      </main>

      <footer className="py-12 text-center text-slate-600 text-xs font-medium tracking-widest uppercase opacity-50">
        &copy; 2026 DUB STUDIO AI PRO • {API_URL ? "Engine Online" : "System Error"}
      </footer>
    </div>
  );
};

export default App;

