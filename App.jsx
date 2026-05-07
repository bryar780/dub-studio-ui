import React, { useState } from 'react';
import { motion } from 'framer-motion';

const App = () => {
  const [lang, setLang] = useState('en');
  const [isUploading, setIsUploading] = useState(false);
  
  const isRTL = lang === 'ar' || lang === 'ku';

  return (
    <div className={`min-h-screen bg-black text-white p-8 ${isRTL ? 'rtl' : 'ltr'}`} 
         style={{ direction: isRTL ? 'rtl' : 'ltr' }}>
      
      {/* Glassmorphic Header */}
      <nav className="backdrop-blur-md bg-white/10 p-6 rounded-2xl border border-white/20 flex justify-between items-center">
        <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          DUB STUDIO AI PRO
        </h1>
        <select 
          onChange={(e) => setLang(e.target.value)}
          className="bg-gray-800 border border-white/20 rounded-lg p-2"
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
          <option value="ku">کوردی (سۆرانی)</option>
        </select>
      </nav>

      <main className="mt-12 max-w-4xl mx-auto text-center">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="border-2 border-dashed border-white/30 rounded-3xl p-20 hover:border-purple-500 transition-all cursor-pointer bg-white/5"
        >
          <p className="text-xl mb-4">
            {lang === 'en' ? 'Drag & Drop Video' : lang === 'ar' ? 'اسحب الفيديو هنا' : 'ڤیدیۆکە لێرە دابنێ'}
          </p>
          <button className="bg-purple-600 hover:bg-purple-700 px-8 py-3 rounded-full font-bold transition-all">
            UPLOAD FILE
          </button>
        </motion.div>

        {/* Processing Steps Status */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-4 gap-4">
          {['Extracting', 'Transcribing', 'Translating', 'Dubbing'].map((step, i) => (
            <div key={i} className="bg-white/10 p-4 rounded-xl border border-white/10">
              <div className="w-8 h-8 rounded-full bg-purple-500 mx-auto mb-2 flex items-center justify-center font-bold">
                {i + 1}
              </div>
              <span className="text-sm opacity-70">{step}</span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
};

export default App;
