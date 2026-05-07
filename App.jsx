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
  const scrollRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

  // Auto-scroll logic: keeps the active word in view
  useEffect(() => {
    const activeWord = document.getElementById('active-word');
    if (activeWord && scrollRef.current) {
      activeWord.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [currentTime]);

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
      alert("Error preparing script.");
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

    mediaRecorderRef.current.start();
    videoRef.current.currentTime = 0;
    videoRef.current.play(); // FIX: Explicitly play video
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
      a.download = "recording.mp3";
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
    <div className="min-h-screen bg-black text-white p-4 font-sans">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-black text-[#C8A2C8] mb-8 italic">STUDIO DUB PRO</h1>

        <AnimatePresence mode="wait">
          {stage === 'upload' && (
            <div className="h-[60vh] border border-white/10 rounded-[2rem] flex items-center justify-center bg-white/[0.02]">
              <input type="file" onChange={handleInitialUpload} className="hidden" id="file" />
              <label htmlFor="file" className="text-center cursor-pointer">
                <div className="text-4xl mb-4">📤</div>
                <p className="font-bold">Import scene</p>
              </label>
            </div>
          )}

          {stage === 'recording' && (
            <div className="space-y-6">
              {/* Video Player */}
              <div className="relative rounded-[2rem] overflow-hidden bg-black border border-white/10 aspect-video">
                <video 
                  ref={videoRef} 
                  src={file ? URL.createObjectURL(file) : ""} 
                  className="w-full h-full object-contain"
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                />
                {countdown && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-50">
                    <span className="text-9xl font-black text-[#C8A2C8]">{countdown}</span>
                  </div>
                )}
              </div>

              {/* Script Teleprompter */}
              <div ref={scrollRef} className="h-[250px] overflow-y-auto bg-zinc-900/50 p-6 rounded-[2rem] border border-white/10 scroll-smooth">
                <div className="flex flex-wrap gap-x-3 gap-y-4 text-3xl font-bold leading-relaxed justify-center">
                  {script.map((item, i) => {
                    const isActive = currentTime >= item.start && currentTime <= item.end;
                    return (
                      <span 
                        key={i} 
                        id={isActive ? "active-word" : ""}
                        className={`transition-all duration-150 rounded-lg px-2 ${isActive ? 'bg-[#C8A2C8] text-black scale-110 shadow-[0_0_20px_#C8A2C8]' : 'text-white/20'}`}
                      >
                        {item.word}
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-4">
                {!isRecording && !recordedBlob && <button onClick={startCountdown} className="bg-[#C8A2C8] text-black px-12 py-4 rounded-full font-black">RECORD</button>}
                {isRecording && <button onClick={stopRecording} className="bg-red-600 px-12 py-4 rounded-full font-black animate-pulse">STOP</button>}
                {recordedBlob && !isRecording && (
                  <>
                    <button onClick={() => setRecordedBlob(null)} className="px-8 py-4 rounded-full border border-white/10 font-bold">RETRY</button>
                    <button onClick={() => submitDub('mp3')} className="bg-white text-black px-8 py-4 rounded-full font-bold">GET MP3</button>
                    <button onClick={() => submitDub('video')} className="bg-[#C8A2C8] text-black px-12 py-4 rounded-full font-black">MERGE VIDEO</button>
                  </>
                )}
              </div>
            </div>
          )}

          {stage === 'processing' && (
            <div className="text-center py-20">
              <div className="w-10 h-10 border-2 border-[#C8A2C8] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#C8A2C8] font-bold tracking-widest">STITCHING AUDIO LAYERS...</p>
            </div>
          )}

          {stage === 'result' && (
            <div className="text-center bg-white/[0.02] border border-white/10 p-12 rounded-[2rem]">
              <h2 className="text-3xl font-black mb-8">Dub Complete!</h2>
              <a href={outputUrl} download className="bg-[#C8A2C8] text-black px-12 py-5 rounded-full font-black text-xl inline-block">DOWNLOAD FINAL</a>
              <button onClick={() => window.location.reload()} className="block mx-auto mt-8 text-white/30 underline">New Session</button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;

