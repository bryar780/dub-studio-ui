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
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

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
      alert("AI Error: Could not read script. Ensure video has clear dialogue.");
      setStage('upload');
    }
  };

  const startCountdown = () => {
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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => setRecordedBlob(new Blob(chunksRef.current, { type: 'audio/mp3' }));

    // SYNCED START
    mediaRecorderRef.current.start();
    videoRef.current.currentTime = 0;
    videoRef.current.play();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    videoRef.current.pause();
    setIsRecording(false);
  };

  const submitDub = async (mode) => {
    if (mode === 'mp3') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(recordedBlob);
      a.download = "my_voiceover.mp3";
      a.click();
      return;
    }
    setStage('processing');
    const formData = new FormData();
    formData.append("voice", recordedBlob);
    formData.append("job_id", jobId);
    const res = await fetch(`${API_URL}/merge`, { method: "POST", body: formData });
    const data = await res.json();
    setOutputUrl(`${API_URL}/download/${jobId}`);
    setStage('result');
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 font-sans selection:bg-[#C8A2C8]/30">
      <div className="max-w-6xl mx-auto">
        
        {/* HEADER */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-2xl font-black italic text-[#C8A2C8] tracking-tighter">STUDIO<span className="text-white">DUB</span></h1>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-green-500'}`} />
            <span className="text-[10px] font-bold tracking-[0.2em] opacity-50 uppercase">{isRecording ? "On Air" : "Ready"}</span>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {stage === 'upload' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[70vh] border border-white/5 bg-white/[0.01] rounded-[3rem] flex flex-col items-center justify-center">
              <input type="file" onChange={handleInitialUpload} className="hidden" id="v-file" />
              <label htmlFor="v-file" className="cursor-pointer group text-center">
                <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mx-auto mb-6 group-hover:bg-[#C8A2C8]/20 transition-all">
                  <svg className="w-8 h-8 text-[#C8A2C8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
                </div>
                <h2 className="text-xl font-bold">Import Session</h2>
                <p className="text-white/30 text-sm mt-2">Upload the scene you want to voice act</p>
              </label>
            </motion.div>
          )}

          {stage === 'recording' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* VIDEO PLAYER */}
                <div className="lg:col-span-7 relative group rounded-[2rem] overflow-hidden bg-zinc-900 border border-white/10 shadow-2xl">
                  <video ref={videoRef} src={file ? URL.createObjectURL(file) : ""} className="w-full aspect-video object-cover" onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)} />
                  
                  {/* COUNTDOWN OVERLAY */}
                  {countdown && (
                    <div className="absolute inset-0 bg-black/80 flex items-center justify-center z-50">
                      <motion.span initial={{ scale: 0.5 }} animate={{ scale: 1.5 }} key={countdown} className="text-9xl font-black text-[#C8A2C8]">{countdown}</motion.span>
                    </div>
                  )}
                </div>

                {/* TELEPROMPTER */}
                <div className="lg:col-span-5 h-[400px] flex flex-col bg-zinc-900/50 rounded-[2rem] border border-white/10 p-8">
                  <span className="text-[10px] font-black tracking-widest text-[#C8A2C8] mb-6 uppercase">Script Monitor</span>
                  <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                    <div className="flex flex-wrap gap-x-2 gap-y-3 text-2xl font-bold leading-relaxed">
                      {script.map((item, i) => (
                        <span 
                          key={i} 
                          className={`transition-all duration-200 ${currentTime >= item.start && currentTime <= item.end ? 'text-white scale-110 bg-[#C8A2C8] px-2 rounded-lg' : 'text-white/20'}`}
                        >
                          {item.word}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ACTION BAR */}
              <div className="flex justify-center items-center gap-6 py-6 border-t border-white/5">
                {!isRecording && !recordedBlob && (
                  <button onClick={startCountdown} className="bg-[#C8A2C8] text-black px-12 py-5 rounded-full font-black text-lg hover:scale-105 transition-transform">RECORD SCENE</button>
                )}
                {isRecording && (
                  <button onClick={stopRecording} className="bg-red-600 text-white px-12 py-5 rounded-full font-black text-lg animate-pulse">STOP</button>
                )}
                {recordedBlob && !isRecording && (
                  <div className="flex gap-4">
                    <button onClick={() => { setRecordedBlob(null); setCountdown(null); }} className="px-8 py-5 rounded-full border border-white/10 font-bold hover:bg-white/5">DISCARD</button>
                    <button onClick={() => submitDub('mp3')} className="bg-white text-black px-8 py-5 rounded-full font-bold">EXPORT MP3</button>
                    <button onClick={() => submitDub('video')} className="bg-[#C8A2C8] text-black px-12 py-5 rounded-full font-black">SUBMIT DUB</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* LOADING & RESULT STAGES (KEEP SAME AS PREVIOUS) */}
          {stage === 'processing' && (
             <div className="h-[60vh] flex flex-col items-center justify-center">
                <div className="w-10 h-10 border-2 border-[#C8A2C8] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-xs tracking-[0.3em] text-[#C8A2C8] font-bold animate-pulse">PROCESSING AUDIO LAYERS</p>
             </div>
          )}

          {stage === 'result' && (
            <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-[3rem]">
              <h2 className="text-4xl font-black mb-10">Production Ready</h2>
              <a href={outputUrl} download className="bg-[#C8A2C8] text-black px-20 py-6 rounded-full font-black text-xl shadow-[0_0_50px_rgba(200,162,200,0.3)] inline-block">DOWNLOAD FINAL</a>
              <button onClick={() => window.location.reload()} className="block mx-auto mt-10 text-white/20 text-[10px] uppercase tracking-widest font-bold underline">Start New Session</button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;
