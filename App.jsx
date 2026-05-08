import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [file, setFile] = useState(null);
  const [videoUrl, setVideoUrl] = useState(""); 
  const [stage, setStage] = useState('upload'); 
  const [script, setScript] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [outputUrl, setOutputUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);

  // New Translation States
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("none");

  const videoRef = useRef(null);
  const wordRefs = useRef([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

  const goHome = () => {
    if (isRecording) stopRecording();
    setStage('upload');
    setFile(null);
    setVideoUrl("");
    setScript([]);
    setCurrentTime(0);
    setRecordedBlob(null);
    setMicGranted(false);
  };

  useEffect(() => {
    if (script.length === 0) return;
    const activeIndex = script.findIndex((item, i) => {
      const nextItem = script[i + 1];
      return currentTime >= item.start && (!nextItem || currentTime < nextItem.start);
    });

    if (activeIndex !== -1 && wordRefs.current[activeIndex]) {
      wordRefs.current[activeIndex].scrollIntoView({
        behavior: 'smooth',
        block: 'center',
        inline: 'center'
      });
    }
  }, [currentTime, script]);

  const handleInitialUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setFile(uploadedFile);
    setVideoUrl(URL.createObjectURL(uploadedFile)); 
    setStage('processing');

    const formData = new FormData();
    formData.append("file", uploadedFile);
    formData.append("source_lang", sourceLang);
    formData.append("target_lang", targetLang);

    try {
      const res = await fetch(`${API_URL}/prepare`, { method: "POST", body: formData });
      const data = await res.json();
      setScript(data.words);
      setJobId(data.job_id);
      setStage('recording');
    } catch (err) {
      alert("KurdDub Error: Couldn't extract dialogue.");
      setStage('upload');
    }
  };

  const prepareMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          autoGainControl: false,
          noiseSuppression: false,
        } 
      });
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        setRecordedBlob(new Blob(chunksRef.current, { type: 'audio/mp3' }));
      };
      setMicGranted(true);
    } catch (err) {
      alert("Microphone access is required for KurdDub!");
    }
  };

  const startAction = async () => {
    if (!videoRef.current || !mediaRecorderRef.current) return;
    try {
      // FORCE MUTE: Stops video audio from bleeding into your mic
      videoRef.current.muted = true;
      videoRef.current.currentTime = 0;
      await videoRef.current.play(); 
      
      chunksRef.current = [];
      mediaRecorderRef.current.start(); 
      setIsRecording(true);
    } catch (e) {
      alert("Playback blocked. Check phone settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) mediaRecorderRef.current.stop();
    if (videoRef.current) videoRef.current.pause();
    setIsRecording(false);
    setMicGranted(false);
  };

  const submitDub = async (mode) => {
    if (mode === 'mp3') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(recordedBlob);
      a.download = "kurddub_vocals.mp3"; 
      a.click();
      return;
    }
    
    setStage('processing');
    const formData = new FormData();
    formData.append("voice", recordedBlob);
    formData.append("job_id", jobId);
    
    try {
      await fetch(`${API_URL}/merge`, { method: "POST", body: formData });
      setOutputUrl(`${API_URL}/download/${jobId}`);
      setStage('result');
    } catch (e) {
      alert("Failed to mix audio.");
      setStage('recording');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#E0B0FF]/30 overflow-hidden relative pb-10">
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#E0B0FF]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-5 py-6 relative z-10 flex flex-col h-screen">
        <header className="flex justify-between items-center mb-6 shrink-0">
          <button onClick={goHome} className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-[#E0B0FF] hover:scale-105 transition-transform origin-left">
            Kurd<span className="italic">Dub</span>
          </button>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_10px_red]' : 'bg-[#E0B0FF] shadow-[0_0_10px_#E0B0FF]'}`} />
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">
              {isRecording ? "On Air" : "Standby"}
            </span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {stage === 'upload' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
              <div className="relative border border-white/10 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] p-10 w-full hover:border-[#E0B0FF]/40 transition-colors shadow-2xl">
                
                {/* 🌍 TRANSLATION SETTINGS */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase tracking-widest mb-2">Video Language</label>
                    <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#E0B0FF] appearance-none">
                      <option value="auto">Auto-Detect</option>
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#E0B0FF]/70 uppercase tracking-widest mb-2">Translate To</label>
                    <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="w-full bg-[#E0B0FF]/10 border border-[#E0B0FF]/30 rounded-xl px-4 py-3 text-[#E0B0FF] font-bold focus:outline-none focus:border-[#E0B0FF] appearance-none">
                      <option value="none">No Translation</option>
                      <option value="ckb">Kurdish (Sorani)</option>
                      <option value="ku">Kurdish (Kurmanji)</option>
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                    </select>
                  </div>
                </div>

                <div className="text-center border-t border-white/10 pt-8">
                  <input type="file" onChange={handleInitialUpload} className="hidden" id="v-file" accept="video/*" />
                  <label htmlFor="v-file" className="cursor-pointer block">
                    <div className="w-20 h-20 bg-[#E0B0FF]/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 transition-transform hover:scale-105 hover:bg-[#E0B0FF]/20">
                      <svg className="w-8 h-8 text-[#E0B0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Import Scene</h2>
                    <p className="text-white/40 text-sm">Upload video to generate script</p>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'recording' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-4 h-full">
              
              <div className="relative w-full rounded-[2rem] overflow-hidden bg-black border border-white/10 shadow-2xl shrink-0">
                <video 
                  ref={videoRef} 
                  src={videoUrl} 
                  className="w-full aspect-video object-contain"
                  playsInline
                  webkit-playsinline="true"
                  muted={true} // FORCED MUTE: Prevents video echo in your recording
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                  onEnded={stopRecording}
                />
              </div>

              <div className="flex-1 relative rounded-[2rem] overflow-hidden bg-white/[0.02] border border-white/10">
                <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-[#050505] to-transparent z-10" />
                <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-t from-[#050505] to-transparent z-10" />
                
                <div className="absolute inset-0 overflow-y-auto px-5 py-24 scroll-smooth custom-scrollbar">
                  <p className="text-center text-3xl font-bold leading-relaxed flex flex-wrap justify-center gap-x-2 gap-y-3">
                    {script.map((item, i) => {
                      const nextStart = script[i + 1] ? script[i + 1].start : item.end + 1;
                      const isActive = currentTime >= item.start && currentTime < nextStart;
                      
                      return (
                        <span 
                          key={i} 
                          ref={el => { if (el) wordRefs.current[i] = el; }}
                          className={`transition-all duration-200 rounded-xl px-2 py-1 
                            ${isActive 
                              ? 'bg-[#E0B0FF] text-black shadow-[0_0_20px_rgba(224,176,255,0.5)] scale-[1.15] z-10' 
                              : currentTime > item.end ? 'text-white/30' : 'text-white/70'
                            }`}
                        >
                          {item.word}
                        </span>
                      );
                    })}
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-2 pb-4">
                {!isRecording && !recordedBlob && !micGranted && (
                  <button onClick={prepareMic} className="w-full bg-white/10 text-white border border-white/20 h-16 rounded-[1.5rem] font-bold text-lg hover:bg-white/20 transition-all">
                    1. ENABLE STUDIO MIC
                  </button>
                )}

                {!isRecording && !recordedBlob && micGranted && (
                  <button onClick={startAction} className="w-full bg-[#E0B0FF] text-black h-16 rounded-[1.5rem] font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(224,176,255,0.4)]">
                    2. ACTION! 🎬
                  </button>
                )}
                
                {isRecording && (
                  <button onClick={stopRecording} className="w-full bg-red-500/20 text-red-500 border border-red-500/50 h-16 rounded-[1.5rem] font-black text-xl active:bg-red-500 active:text-white transition-all shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    CUT RECORDING
                  </button>
                )}

                {recordedBlob && !isRecording && (
                  <div className="flex flex-col gap-3 w-full">
                    <button onClick={() => submitDub('video')} className="w-full bg-[#E0B0FF] text-black h-16 rounded-[1.5rem] font-black text-lg shadow-[0_0_20px_rgba(224,176,255,0.3)] active:scale-[0.98] transition-transform">
                      PRODUCE MASTER VIDEO
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => {setRecordedBlob(null); setMicGranted(false);}} className="w-full bg-white/5 text-white border border-white/10 h-14 rounded-[1.25rem] font-bold active:bg-white/10 transition-colors text-sm">
                        DISCARD
                      </button>
                      <button onClick={() => submitDub('mp3')} className="w-full bg-white text-black h-14 rounded-[1.25rem] font-bold active:bg-zinc-200 transition-colors text-sm">
                        SAVE VOCALS (MP3)
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {stage === 'processing' && (
             <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-[#E0B0FF] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-6 text-xs tracking-widest text-[#E0B0FF] font-bold animate-pulse uppercase">
                  {script.length === 0 ? "Translating Script..." : "Rendering Master..."}
                </p>
             </div>
          )}

          {stage === 'result' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[2.5rem] w-full max-w-md">
                <h2 className="text-3xl font-black mb-8 text-white">Scene Mastered.</h2>
                <a href={outputUrl} download className="block w-full bg-[#E0B0FF] text-black py-5 rounded-[1.5rem] font-black text-lg hover:shadow-[0_0_30px_rgba(224,176,255,0.4)] transition-all">
                  DOWNLOAD
                </a>
                <button onClick={goHome} className="mt-6 text-white/40 text-xs uppercase tracking-widest font-bold underline hover:text-white transition-colors">
                  Close Project
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;

