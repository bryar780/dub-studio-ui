import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [file, setFile] = useState(null);
  const [mediaUrl, setMediaUrl] = useState(""); 
  const [isAudioMode, setIsAudioMode] = useState(false);
  const [stage, setStage] = useState('upload'); 
  const [script, setScript] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [outputUrl, setOutputUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);

  // Translation & Direction States
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("none");
  const [scriptDirection, setScriptDirection] = useState("ltr");

  const mediaRef = useRef(null);
  const wordRefs = useRef([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

  const goHome = () => {
    if (isRecording) stopRecording();
    setStage('upload');
    setFile(null);
    setMediaUrl("");
    setScript([]);
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
      wordRefs.current[activeIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime, script]);

  const handleInitialUpload = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;
    
    setIsAudioMode(uploadedFile.type.startsWith('audio/'));
    setFile(uploadedFile);
    setMediaUrl(URL.createObjectURL(uploadedFile)); 
    setStage('processing');

    setScriptDirection((targetLang === 'ckb' || targetLang === 'ar') ? 'rtl' : 'ltr');

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
      alert("KurdDub Error: Processing failed.");
      setStage('upload');
    }
  };

  const prepareMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false, sampleRate: 48000 } 
      });
      const options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => {
        setRecordedBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
      };
      setMicGranted(true);
    } catch (err) {
      alert("Mic access is required for high-quality dubbing!");
    }
  };

  const startAction = async () => {
    mediaRef.current.muted = true;
    mediaRef.current.currentTime = 0;
    await mediaRef.current.play(); 
    chunksRef.current = [];
    mediaRecorderRef.current.start(); 
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop();
    mediaRef.current.pause();
    setIsRecording(false);
  };

  const submitDub = async (mode) => {
    if (mode === 'vocals') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(recordedBlob);
      a.download = "kurddub_vocals.webm"; 
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
      alert("Mixing failed.");
      setStage('recording');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans overflow-hidden relative pb-10">
      {/* Background Glows */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#E0B0FF]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl mx-auto px-5 py-6 relative z-10 flex flex-col h-screen">
        <header className="flex justify-between items-center mb-6 shrink-0">
          <button onClick={goHome} className="text-2xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-[#E0B0FF]">
            Kurd<span className="italic">Dub</span> <span className="text-xs font-bold opacity-50 ml-1">V4 PRO</span>
          </button>
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-[#E0B0FF]'}`} />
            <span className="text-[10px] font-bold tracking-widest uppercase opacity-80">
              {isRecording ? "On Air" : "Standby"}
            </span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {stage === 'upload' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
              <div className="relative border border-white/10 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] p-10 w-full shadow-2xl">
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div>
                    <label className="block text-xs font-bold text-white/50 uppercase mb-2">Original Lang</label>
                    <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white appearance-none">
                      <option value="auto">Auto-Detect</option>
                      <option value="ja">Japanese</option>
                      <option value="en">English</option>
                      <option value="ar">Arabic</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#E0B0FF]/70 uppercase mb-2">Translate To</label>
                    <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="w-full bg-[#E0B0FF]/10 border border-[#E0B0FF]/30 rounded-xl px-4 py-3 text-[#E0B0FF] font-bold appearance-none">
                      <option value="none">Original</option>
                      <option value="ckb">Kurdish</option>
                      <option value="ja">Japanese</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>

                <div className="text-center border-t border-white/10 pt-8">
                  <input type="file" onChange={handleInitialUpload} className="hidden" id="v-file" accept="video/*,audio/*" />
                  <label htmlFor="v-file" className="cursor-pointer block group">
                    <div className="w-20 h-20 bg-[#E0B0FF]/10 rounded-[1.5rem] flex items-center justify-center mx-auto mb-6 group-hover:bg-[#E0B0FF]/20 transition-all">
                      <svg className="w-8 h-8 text-[#E0B0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Import Media</h2>
                    <p className="text-white/40 text-sm">Upload MP4 or MP3 to start</p>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'recording' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-4 h-full">
              
              <div className={`relative w-full rounded-[2rem] overflow-hidden bg-black border border-white/10 shadow-2xl shrink-0 ${isAudioMode ? 'h-24 flex items-center justify-center bg-gradient-to-r from-[#E0B0FF]/5 to-black' : ''}`}>
                {isAudioMode ? (
                   <audio ref={mediaRef} src={mediaUrl} muted={true} onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)} onEnded={stopRecording} className="hidden" />
                ) : (
                  <video ref={mediaRef} src={mediaUrl} className="w-full aspect-video object-contain" playsInline muted={true} onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)} onEnded={stopRecording} />
                )}
                {isAudioMode && <div className="text-[#E0B0FF] font-bold text-xs tracking-widest animate-pulse">AUDIO TRACK LOADED</div>}
              </div>

              <div className="flex-1 relative rounded-[2rem] overflow-hidden bg-white/[0.02] border border-white/10">
                <button onClick={() => setScriptDirection(prev => prev === 'ltr' ? 'rtl' : 'ltr')} className="absolute top-4 right-4 z-20 bg-white/10 hover:bg-white/20 text-white/70 px-3 py-1 rounded-full text-[10px] font-bold uppercase backdrop-blur-md border border-white/10 transition-all">
                  Layout: {scriptDirection.toUpperCase()} ⮂
                </button>
                
                <div className="absolute inset-0 overflow-y-auto px-5 py-20 scroll-smooth custom-scrollbar">
                  <p className="text-center text-3xl font-bold leading-relaxed flex flex-wrap justify-center gap-x-2 gap-y-3" dir={scriptDirection}>
                    {script.map((item, i) => (
                        <span key={i} ref={el => { if (el) wordRefs.current[i] = el; }}
                          className={`transition-all duration-200 rounded-xl px-2 py-1 ${currentTime >= item.start && currentTime < (script[i+1]?.start || item.end + 1)
                              ? 'bg-[#E0B0FF] text-black shadow-[0_0_20px_#E0B0FF] scale-[1.15] z-10' 
                              : currentTime > item.end ? 'text-white/20' : 'text-white/70'
                            }`}
                        >
                          {item.word}
                        </span>
                    ))}
                  </p>
                </div>
              </div>

              <div className="shrink-0 pt-2 pb-4">
                {!isRecording && !recordedBlob && !micGranted && (
                  <button onClick={prepareMic} className="w-full bg-white/10 text-white border border-white/20 h-16 rounded-[1.5rem] font-bold hover:bg-white/20 transition-all">
                    1. ENABLE STUDIO MIC
                  </button>
                )}

                {!isRecording && !recordedBlob && micGranted && (
                  <button onClick={startAction} className="w-full bg-[#E0B0FF] text-black h-16 rounded-[1.5rem] font-black text-xl hover:scale-[1.02] transition-all shadow-[0_0_30px_rgba(224,176,255,0.4)]">
                    2. ACTION! 🎬
                  </button>
                )}
                
                {isRecording && (
                  <button onClick={stopRecording} className="w-full bg-red-500 text-white h-16 rounded-[1.5rem] font-black text-xl animate-pulse">
                    STOP RECORDING
                  </button>
                )}

                {recordedBlob && !isRecording && (
                  <div className="flex flex-col gap-3 w-full">
                    <button onClick={() => submitDub('master')} className="w-full bg-[#E0B0FF] text-black h-16 rounded-[1.5rem] font-black text-lg shadow-[0_0_20px_#E0B0FF]/40">
                      PRODUCE MASTER {isAudioMode ? "AUDIO" : "VIDEO"}
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => {setRecordedBlob(null); setMicGranted(false);}} className="bg-white/5 text-white border border-white/10 h-14 rounded-[1.25rem] font-bold">
                        DISCARD
                      </button>
                      <button onClick={() => submitDub('vocals')} className="bg-white text-black h-14 rounded-[1.25rem] font-bold">
                        SAVE VOCALS ONLY
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {stage === 'processing' && (
             <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-[#E0B0FF] border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-6 text-xs tracking-widest text-[#E0B0FF] font-bold uppercase animate-pulse">Mixing Studio Quality Media...</p>
             </div>
          )}

          {stage === 'result' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="bg-white/[0.02] border border-white/10 p-10 rounded-[2.5rem] w-full max-w-md shadow-2xl">
                <h2 className="text-3xl font-black mb-8">Production Ready.</h2>
                <a href={outputUrl} download className="block w-full bg-[#E0B0FF] text-black py-5 rounded-[1.5rem] font-black text-lg hover:shadow-[0_0_30px_#E0B0FF]/50 transition-all">
                  DOWNLOAD MASTER
                </a>
                <button onClick={goHome} className="mt-6 text-white/40 text-xs uppercase tracking-widest font-bold underline">
                  Start New Project
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

