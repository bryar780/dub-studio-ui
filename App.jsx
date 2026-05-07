import React, { useState } from 'react';
import { motion } from 'framer-motion';

const App = () => {
  const [lang, setLang] = useState('en');
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [status, setStatus] = useState(0); 
  const [outputUrl, setOutputUrl] = useState(null);

  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, ""); 
  const isRTL = lang === 'ar' || lang === 'ku';

  const content = {
    en: { title: "DUB STUDIO AI", sub: "Production-level AI Dubbing", drop: "Selected: ", placeholder: "Drop video or tap to upload", btn: "START DUBBING", processing: "Processing AI...", done: "DOWNLOAD DUBBED VIDEO", steps: ["Extracting", "Transcribing", "Translating", "Dubbing"] },
    ar: { title: "دبلجة الذكاء الاصطناعي", sub: "إنتاج احترافي للدبلجة", drop: "تم اختيار: ", placeholder: "اسحب الفيديو أو اضغط للرفع", btn: "ابدأ الدبلجة", processing: "جاري المعالجة...", done: "تحميل الفيديو المدبلج", steps: ["استخراج الصوت", "تحويل النص", "الترجمة", "الدبلجة"] },
    ku: { title: "دۆبێ ستۆدیۆ ئای ئای", sub: "دۆبلاجکردنی پرۆفیشناڵ", drop: "دیاریکرا: ", placeholder: "ڤیدیۆکە لێرە دابنێ یان کلیک بکە", btn: "دەستپێکردن", processing: "خەریکی کارکردنە...", done: "دابەزاندنی ڤیدیۆکە", steps: ["دەرهێنانی دەنگ", "نووسینەوە", "وەرگێڕان", "دۆبلاجکردن"] }
  };

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setFile(e.target.files[0]);
      setOutputUrl(null);
      setStatus(0);
    }
  };

  const startDubbing = async () => {
    if (!file) return alert("Please select a video first!");
    if (!API_URL) return alert("API URL not configured in Vercel!");

    setIsProcessing(true);
    setStatus(1); // Start step 1

    const formData = new FormData();
    formData.append("file", file);
    formData.append("target_lang", lang);

    try {
      const response = await fetch(`${API_URL}/process`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Server error");

      const data = await response.json();
      
      // Simulate progress timing for the UI steps
      let currentStep = 1;
      const interval = setInterval(() => {
        currentStep++;
        setStatus(currentStep);
        if (currentStep >= 4) {
          clearInterval(interval);
          setIsProcessing(false);
          setOutputUrl(`${API_URL}/download/${data.job_id}`);
        }
      }, 4000);

    } catch (err) {
      alert("Connection failed. Ensure HuggingFace Space is 'Running'.");
      setIsProcessing(false);
      setStatus(0);
    }
  };

  return (
    <div className={`min-h-screen bg-[#030303] text-slate-100 selection:bg-purple-500/30 ${isRTL ? 'rtl' : 'ltr'}`} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      
      {/* Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full" />
        <div className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full" />
      </div>

      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5 px-6 py-4 flex justify-between items-center">
        <h1 className="text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-white to-purple-500 bg-clip-text text-transparent">
          {content[lang].title} <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded-full align-middle ml-2">PRO</span>
        </h1>
        <select value={lang} onChange={(e) => setLang(e.target.value)} className="bg-white/5 border border-white/10 rounded-full px-4 py-1 text-sm outline-none">
          <option value="en">English</option>
          <option value="ar">العربية</option>
          <option value="ku">کوردی</option>
        </select>
      </nav>

      <main className="relative z-10 max-w-4xl mx-auto px-6 py-12 text-center">
        <div className="mb-12">
          <p className="text-purple-400 font-medium tracking-widest text-xs uppercase mb-4">{content[lang].sub}</p>
          <h2 className="text-4xl md:text-6xl font-bold tracking-tight">Global Reach.<br/><span className="text-slate-500">Local Voice.</span></h2>
        </div>

        {/* Improved Upload Zone */}
        <div className="relative group backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-[2rem] p-12 md:p-20 transition-all hover:border-purple-500/50 shadow-2xl overflow-hidden">
          <input type="file" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" accept="video/*" />
          <div className="flex flex-col items-center pointer-events-none">
            <div className="w-16 h-16 bg-purple-600/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
               <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <p className="text-lg font-medium text-slate-300">
              {file ? `${content[lang].drop} ${file.name}` : content[lang].placeholder}
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-10">
          {!outputUrl ? (
            <button 
              onClick={startDubbing}
              disabled={isProcessing}
              className={`bg-white text-black px-12 py-4 rounded-full font-bold text-lg transition-all ${isProcessing ? 'opacity-50' : 'hover:scale-105 shadow-xl shadow-white/5'}`}
            >
              {isProcessing ? content[lang].processing : content[lang].btn}
            </button>
          ) : (
            <a href={outputUrl} download className="bg-green-500 text-white px-12 py-4 rounded-full font-bold text-lg hover:bg-green-600 transition-all shadow-xl shadow-green-500/20">
              {content[lang].done}
            </a>
          )}
        </div>

        {/* Progress Timeline */}
        <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-4">
          {content[lang].steps.map((step, i) => (
            <div key={i} className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-left">
              <span className={`text-[10px] font-black mb-1 block ${status > i ? 'text-green-400' : 'text-purple-500'}`}>
                {status > i ? "✓ DONE" : `STEP 0${i+1}`}
              </span>
              <span className="text-sm font-semibold text-slate-300">{step}</span>
              <div className="w-full h-1 bg-white/5 rounded-full mt-3 overflow-hidden">
                <div className="h-full bg-purple-500 transition-all duration-1000" style={{ width: status > i ? '100%' : status === i ? '50%' : '0%' }} />
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
