import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  // --- States ---
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState('upload'); // upload, recording, processing, result
  const [script, setScript] = useState([]); // [{word: "Hello", start: 0.5, end: 1.2}]
  const [currentTime, setCurrentTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [outputUrl, setOutputUrl] = useState(null);
  const [recordedBlob, setRecordedBlob] = useState(null);

  // --- Refs ---
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

  // --- 1. Prepare Karaoke (Get Script) ---
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
      alert("Failed to prepare karaoke script.");
      setStage('upload');
    }
  };

  // --- 2. Recording Logic ---
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/mpeg' });
      setRecordedBlob(blob);
    };

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

  const resetRecording = () => {
    setRecordedBlob(null);
    videoRef.current.currentTime = 0;
    setIsRecording(false);
  };

  // --- 3. Final Submission ---
  const submitDub = async (mode) => {
    if (mode === 'mp3') {
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = "my_dub.mp3";
      a.click();
      return;
    }

    setStage('processing');
    const formData = new FormData();
    formData.append("voice", recordedBlob);
    formData.append("job_id", jobId);

    try {
      const res = await fetch(`${API_URL}/merge`, { method: "POST", body: formData });
      const data = await res.json();
      setOutputUrl(`${API_URL}/download/${jobId}`);
      setStage('result');
    } catch (err) {
      alert("Merging failed!");
      setStage('recording');
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans p-6">
      <header className="max-w-4xl mx-auto flex justify-between items-center mb-10">
        <h1 className="text-2xl font-black tracking-tighter text-purple-500">DUB STUDIO <span className="text-white">PRO</span></h1>
      </header>

      <main className="max-w-4xl mx-auto">
        <AnimatePresence mode="wait">
          
          {/* STAGE: UPLOAD */}
          {stage === 'upload' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-2 border-dashed border-white/10 rounded-3xl p-20 text-center">
              <input type="file" onChange={handleInitialUpload} className="hidden" id="v-upload" />
              <label htmlFor="v-upload" className="cursor-pointer">
                <div className="text-5xl mb-4">🎬</div>
                <p className="text-xl font-bold">Upload video to start karaoke</p>
              </label>
            </motion.div>
          )}

          {/* STAGE: RECORDING (KARAOKE) */}
          {stage === 'recording' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8">
              <div className="relative rounded-3xl overflow-hidden bg-black aspect-video border border-white/5">
                <video 
                  ref={videoRef} 
                  src={file ? URL.createObjectURL(file) : ""} 
                  className="w-full h-full object-contain"
                  onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)}
                />
                
                {/* KARAOKE OVERLAY */}
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black to-transparent">
                  <div className="flex flex-wrap justify-center gap-2 text-2xl font-bold">
                    {script.map((item, i) => (
                      <span 
                        key={i} 
                        className={`transition-colors duration-200 ${currentTime >= item.start && currentTime <= item.end ? 'text-purple-500 scale-110' : 'text-white/40'}`}
                      >
                        {item.word}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* CONTROLS */}
              <div className="flex justify-center gap-4">
                {!isRecording && !recordedBlob && <button onClick={startRecording} className="bg-purple-600 px-8 py-3 rounded-full font-bold">⏺ START RECORDING</button>}
                {isRecording && <button onClick={stopRecording} className="bg-red-600 px-8 py-3 rounded-full font-bold animate-pulse">⏹ STOP</button>}
                {recordedBlob && !isRecording && (
                  <>
                    <button onClick={resetRecording} className="bg-white/10 px-8 py-3 rounded-full font-bold">🔄 RESET</button>
                    <button onClick={() => submitDub('mp3')} className="bg-blue-600 px-8 py-3 rounded-full font-bold">🎵 DOWNLOAD MP3</button>
                    <button onClick={() => submitDub('video')} className="bg-green-600 px-8 py-3 rounded-full font-bold">🎬 MERGE TO VIDEO</button>
                  </>
                )}
              </div>
            </motion.div>
          )}

          {/* STAGE: PROCESSING */}
          {stage === 'processing' && (
            <div className="text-center py-20">
              <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
              <p className="text-xl font-bold italic">AI is preparing your studio...</p>
            </div>
          )}

          {/* STAGE: RESULT */}
          {stage === 'result' && (
            <div className="text-center space-y-6">
              <div className="text-6xl">🔥</div>
              <h2 className="text-3xl font-bold">Your Dub is Ready!</h2>
              <a href={outputUrl} download className="inline-block bg-white text-black px-12 py-4 rounded-full font-black text-lg">DOWNLOAD FINAL VIDEO</a>
              <button onClick={() => setStage('upload')} className="block mx-auto text-white/50 underline">Start New Project</button>
            </div>
          )}

        </AnimatePresence>
      </main>
    </div>
  );
};

export default App;
