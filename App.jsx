import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [lang, setLang] = useState('en');
  const [file, setFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);

  const isRTL = lang === 'ar' || lang === 'ku';

  const content = {
    en: { title: "DUB STUDIO AI", sub: "Production-level AI Dubbing", drop: "Drop video or tap to upload", btn: "START DUBBING", steps: ["Extracting", "Transcribing", "Translating", "Dubbing"] },
    ar: { title: "دبلجة الذكاء الاصطناعي", sub: "إنتاج احترافي للدبلجة", drop: "اسحب الفيديو أو اضغط للرفع", btn: "ابدأ الدبلجة", steps: ["استخراج الصوت", "تحويل النص", "الترجمة", "الدبلجة"] },
    ku: { title: "دۆبێ ستۆدیۆ ئای ئای", sub: "دۆبلاجکردنی پرۆفیشناڵ", drop: "ڤیدیۆکە لێرە دابنێ یان کلیک بکە", btn: "دەستپێکردن", steps: ["دەرهێنانی دەنگ", "نووسینەوە", "وەرگێڕان", "دۆبلاجکردن"] }
  };

  return (
    <div className={`min-h-screen bg-[#030303] text-slate-100 font-sans selection:bg-purple-500/30 ${isRTL ? 'rtl' : 'ltr'}`} style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      
      {/* Animated Background Blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[30%] h-[30%] bg-blue-600/10 blur-[100px] rounded-full animate-pulse delay-700" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-black/50 border-b border-white/5 px-4 py-4 md:px-10">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
            className="text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-purple-400 to-purple-600 bg-clip-text text-transparent">
            {content[lang].title} <span className="text-xs bg-purple-600 text-white px-2 py-0.5 rounded-full ml-2 align-middle">PRO</span>
          </motion.h1>
          
          <select 
            value={lang}
            onChange={(e) => setLang(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-full px-4 py-1.5 text-sm outline-none focus:ring-2 ring-purple-500/50 transition-all cursor-pointer"
          >
            <option value="en">English</option>
            <option value="ar">العربية</option>
            <option value="ku">کوردی</option>
          </select>
        </div>
      </nav>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-12 md:py-20">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-purple-400 font-medium tracking-widest text-xs md:text-sm uppercase mb-4">
            {content[lang].sub}
          </motion.p>
          <h2 className="text-4xl md:text-7xl font-bold tracking-tight mb-6">
            Global Reach.<br/><span className="text-slate-500">Local Voice.</span>
          </h2>
        </div>

        {/* Upload Zone */}
        <motion.div 
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          className="group relative backdrop-blur-2xl bg-white/[0.03] border border-white/10 rounded-[2rem] p-8 md:p-20 text-center transition-all hover:border-purple-500/50 hover:bg-white/[0.05] shadow-2xl"
        >
          <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" accept="video/*" />
          <div className="flex flex-col items-center">
            <div className="w-16 h-16 md:w-20 md:h-20 bg-purple-600/20 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
              <svg className="w-8 h-8 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
            </div>
            <p className="text-lg md:text-xl font-medium text-slate-300 mb-2">{content[lang].drop}</p>
            <p className="text-sm text-slate-500">MP4, MOV or MKV (Max 500MB)</p>
          </div>
        </motion.div>

        {/* Action Button */}
        <div className="mt-10 flex justify-center">
          <button className="relative group overflow-hidden bg-white text-black px-10 py-4 rounded-full font-bold text-lg hover:pr-14 transition-all shadow-xl shadow-white/5">
            <span className="relative z-10">{content[lang].btn}</span>
            <span className="absolute right-6 opacity-0 group-hover:opacity-100 transition-all">→</span>
          </button>
        </div>

        {/* Progress Steps */}
        <div className="mt-24 grid grid-cols-2 md:grid-cols-4 gap-4">
          {content[lang].steps.map((step, i) => (
            <div key={i} className="flex flex-col items-center md:items-start p-4 rounded-2xl bg-white/[0.02] border border-white/5">
              <span className="text-[10px] font-black text-purple-500 mb-2 uppercase tracking-widest">Step 0{i+1}</span>
              <span className="text-sm md:text-base font-semibold text-slate-300">{step}</span>
              <div className="w-full h-1 bg-white/5 rounded-full mt-4 overflow-hidden">
                <div className={`h-full bg-purple-500 transition-all duration-1000 ${isProcessing ? 'w-full' : 'w-0'}`} />
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="py-10 text-center border-t border-white/5 text-slate-600 text-xs">
        &copy; 2026 DUB STUDIO AI PRO • Made for Bryar Honar
      </footer>
    </div>
  );
};

export default App;
