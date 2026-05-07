import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState('upload'); 
  const [script, setScript] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [jobId, setJobId] = useState(null);
  const [outputUrl, setOutputUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);

  const videoRef = useRef(null);
  const scrollContainerRef = useRef(null);
  const wordRefs = useRef([]); // Stores references to each word for perfect scrolling
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

  // 🎯 BULLETPROOF AUTO-SCROLL
  useEffect(() => {
    // Find exactly which word we are currently on
    const activeIndex = script.findIndex(
      (item) => currentTime >= item.start && currentTime <= item.end
    );

    // If we found the word, force the container to scroll to it
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
    setStage('processing');

    const formData = new FormData();
    formData.append("file", uploadedFile);

    try {
      const res = await fetch(`${API_URL}/prepare`, { method: "POST", body: formData });
      const data = await res.json();
      setScript(data.words);
      setJobId(data.job_id);
      setStage('recording');
    } catch (err) {
      alert("Studio Error: Couldn't generate the script.");
      setStage('upload');
    }
  };

  const startCountdown = () => {
    // 🔓 THE WAKE-UP HACK: Tricks the mobile browser into unlocking the video
    if (videoRef.current) {
      videoRef.current.muted = true; // Mute briefly to ensure it plays
      videoRef.current.play().then(() => {
        videoRef.current.pause();
        videoRef.current.muted = false; // Unmute for the actual recording
        videoRef.current.currentTime = 0;
      }).catch(e => console.log("Video unlock pending..."));
    }

    let count = 3;
    setCountdown(count);
    const timer = setInterval(() => {
      count -= 1;
      if (count === 0) {
        clearInterval(timer);
        setCountdown(null);
        actualStart();
      } else {
        setCountdown(count);
      }
    }, 1000);
  };

  const actualStart = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      chunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => setRecordedBlob(new Blob(chunksRef.current, { type: 'audio/mp3' }));

      mediaRecorderRef.current.start();
      
      // 🎬 Force video to play exactly when recording starts
      if (videoRef.current) {
        videoRef.current.currentTime = 0;
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(error => console.error("Playback prevented:", error));
        }
      }
      setIsRecording(true);
    } catch (err) {
      alert("Microphone access is required for the studio!");
      setCountdown(null);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
    }
    if (videoRef.current) {
      videoRef.current.pause();
    }
    setIsRecording(false);
  };

  const submitDub = async (mode) => {
    if (mode === 'mp3') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(recordedBlob);
      a.download = "studio_vocal_take.mp3";
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
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-[#E0B0FF]/30 overflow-hidden relative">
      
      {/* 🌌 Modern Ambient Glow Background */}
      <div className="fixed top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-[#E0B0FF]/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-5xl mx-auto px-4 py-8 relative z-10 flex flex-col h-screen">
        
        {/* ✨ Header */}
        <header className="flex justify-between items-center mb-8 shrink-0">
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-white to-[#E0B0FF]">
            STUDIO<span className="italic">DUB</span>
          </h1>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-1.5 rounded-full backdrop-blur-md">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_10px_red]' : 'bg-[#E0B0FF] shadow-[0_0_10px_#E0B0FF]'}`} />
            <span className="text-[10px] md:text-xs font-bold tracking-widest uppercase opacity-80">
              {isRecording ? "On Air" : "Standby"}
            </span>
          </div>
        </header>

        <AnimatePresence mode="wait">
          
          {/* 📤 UPLOAD STAGE */}
          {stage === 'upload' && (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="flex-1 flex flex-col items-center justify-center">
              <div className="relative group w-full max-w-lg">
                <div className="absolute inset-0 bg-gradient-to-r from-[#E0B0FF]/20 to-purple-600/20 rounded-[2.5rem] blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                <div className="relative border border-white/10 bg-black/40 backdrop-blur-2xl rounded-[2.5rem] p-12 text-center hover:border-[#E0B0FF]/30 transition-colors">
                  <input type="file" onChange={handleInitialUpload} className="hidden" id="v-file" accept="video/*" />
                  <label htmlFor="v-file" className="cursor-pointer block">
                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 group-hover:bg-[#E0B0FF]/20 transition-all duration-500">
                      <svg className="w-8 h-8 text-[#E0B0FF]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Initialize Project</h2>
                    <p className="text-white/40 text-sm">Tap to import your scene</p>
                  </label>
                </div>
              </div>
            </motion.div>
          )}

          {/* 🎙️ RECORDING STAGE */}
          {stage === 'recording' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex-1 flex flex-col gap-6 h-full">
              
              {/* Top: Video Player */}
              <div className="relative w-full max-w-2xl mx-auto rounded-[2rem] overflow-hidden bg-black border border-white/10 shadow-2xl shrink-0">
                <video 
                  ref={videoRef} 
                  src={file ? URL.createObjectURL(file) : ""} 
                  className="w-full aspect-video object-contain"
                  playsInline
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                  onEnded={stopRecording}
                />
                
                {countdown && (
                  <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
                    <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 1.5, opacity: 0 }} key={countdown} className="text-[8rem] md:text-[12rem] font-black text-[#E0B0FF] drop-shadow-[0_0_30px_rgba(224,176,255,0.5)]">
                      {countdown}
                    </motion.span>
                  </div>
                )}
              </div>

              {/* Middle: Teleprompter */}
              <div className="flex-1 relative rounded-[2rem] overflow-hidden bg-white/[0.02] border border-white/10 min-h-[200px]">
                <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-[#050505] to-transparent z-10 pointer-events-none" />
                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#050505] to-transparent z-10 pointer-events-none" />
                
                <div ref={scrollContainerRef} className="absolute inset-0 overflow-y-auto px-6 py-20 scroll-smooth custom-scrollbar">
                  <p className="text-center text-3xl md:text-5xl font-bold leading-[1.6] md:leading-[1.8] flex flex-wrap justify-center gap-x-3 gap-y-4">
                    {script.map((item, i) => {
                      const isActive = currentTime >= item.start && currentTime <= item.end;
                      return (
                        <span 
                          key={i} 
                          ref={el => wordRefs.current[i] = el}
                          className={`transition-all duration-300 rounded-xl px-2 py-1 
                            ${isActive 
                              ? 'bg-[#E0B0FF] text-black shadow-[0_0_25px_rgba(224,176,255,0.6)] scale-110 z-10' 
                              : currentTime > item.end ? 'text-white/20' : 'text-white/60'
                            }`}
                        >
                          {item.word}
                        </span>
                      );
                    })}
                  </p>
                </div>
              </div>

              {/* Bottom: Controls */}
              <div className="shrink-0 pb-6 pt-2">
                {!isRecording && !recordedBlob && (
                  <button onClick={startCountdown} className="w-full md:w-auto md:min-w-[300px] mx-auto block bg-gradient-to-r from-[#C8A2C8] to-[#E0B0FF] text-black h-16 rounded-full font-black text-xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_30px_rgba(224,176,255,0.3)]">
                    START TAKES
                  </button>
                )}
                
                {isRecording && (
                  <button onClick={stopRecording} className="w-full md:w-auto md:min-w-[300px] mx-auto block bg-red-500/20 text-red-500 border border-red-500/50 h-16 rounded-full font-black text-xl active:bg-red-500 active:text-white transition-all shadow-[0_0_30px_rgba(239,68,68,0.2)]">
                    CUT RECORDING
                  </button>
                )}

                {recordedBlob && !isRecording && (
                  <div className="flex flex-col md:flex-row gap-3 md:justify-center">
                    <button onClick={() => setRecordedBlob(null)} className="flex-1 md:flex-none md:w-40 bg-white/5 text-white border border-white/10 h-16 rounded-full font-bold hover:bg-white/10 transition-colors">
                      DISCARD
                    </button>
                    <button onClick={() => submitDub('mp3')} className="flex-1 md:flex-none md:w-48 bg-white text-black h-16 rounded-full font-bold hover:bg-zinc-200 transition-colors">
                      SAVE VOCALS
                    </button>
                    <button onClick={() => submitDub('video')} className="flex-1 md:flex-none md:w-64 bg-[#E0B0FF] text-black h-16 rounded-full font-black shadow-[0_0_20px_rgba(224,176,255,0.3)] hover:scale-[1.02] transition-transform">
                      PRODUCE MASTER
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* ⚙️ PROCESSING STAGE */}
          {stage === 'processing' && (
             <div className="flex-1 flex flex-col items-center justify-center">
                <div className="w-16 h-16 relative">
                  <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-[#E0B0FF] border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p className="mt-8 text-sm tracking-[0.4em] text-[#E0B0FF] font-bold animate-pulse uppercase">Rendering Master...</p>
             </div>
          )}

          {/* 🎬 RESULT STAGE */}
          {stage === 'result' && (
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="flex-1 flex flex-col items-center justify-center text-center">
              <div className="bg-white/[0.02] border border-white/10 p-12 md:p-20 rounded-[3rem] w-full max-w-2xl backdrop-blur-xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#E0B0FF] to-transparent"></div>
                <h2 className="text-4xl md:text-5xl font-black mb-10 text-white">Scene Mastered.</h2>
                <a href={outputUrl} download className="block w-full bg-gradient-to-r from-[#C8A2C8] to-[#E0B0FF] text-black py-6 rounded-full font-black text-xl hover:shadow-[0_0_40px_rgba(224,176,255,0.4)] hover:scale-[1.02] transition-all duration-300">
                  DOWNLOAD VIDEO
                </a>
                <button onClick={() => window.location.reload()} className="mt-8 text-white/30 text-xs uppercase tracking-widest font-bold hover:text-white/70 transition-colors">
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
