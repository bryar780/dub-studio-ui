import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const App = () => {
  const [file, setFile] = useState(null);
  const [stage, setStage] = useState('upload'); // upload, recording, processing, result
  const [script, setScript] = useState([]);
  const [currentTime, setCurrentTime] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
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
      alert("AI failed to read the speech. Try a clearer video!");
      setStage('upload');
    }
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new MediaRecorder(stream);
    chunksRef.current = [];
    mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
    mediaRecorderRef.current.onstop = () => setRecordedBlob(new Blob(chunksRef.current, { type: 'audio/mp3' }));

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
      const url = URL.createObjectURL(recordedBlob);
      const a = document.createElement('a');
      a.href = url; a.download = "recording.mp3"; a.click();
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
    <div className="min-h-screen bg-black text-white p-4 md:p-10 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-black italic tracking-tighter text-white">DUB<span className="text-[#C8A2C8]">STUDIO</span></h1>
          <div className="text-[10px] bg-white/10 px-3 py-1 rounded-full uppercase tracking-widest text-white/50">Version 2.0 • Studio Mode</div>
        </header>

        <AnimatePresence mode="wait">
          {stage === 'upload' && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-[60vh] flex flex-col items-center justify-center border border-white/10 rounded-[3rem] bg-white/[0.02]">
              <input type="file" onChange={handleInitialUpload} className="hidden" id="v-upload" />
              <label htmlFor="v-upload" className="group cursor-pointer text-center">
                <div className="w-24 h-24 bg-[#C8A2C8]/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10 text-[#C8A2C8]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"/></svg>
                </div>
                <p className="text-2xl font-bold">Import Video</p>
                <p className="text-white/40 mt-2">AI will generate your script automatically</p>
              </label>
            </motion.div>
          )}

          {stage === 'recording' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <div className="rounded-[2rem] overflow-hidden bg-[#111] border border-white/5 shadow-2xl aspect-video">
                <video ref={videoRef} src={file ? URL.createObjectURL(file) : ""} className="w-full h-full object-cover" onTimeUpdate={(e) => setCurrentTime(e.target.currentTime)} />
              </div>

              <div className="flex flex-col h-full justify-between py-4">
                <div className="bg-white/5 p-8 rounded-[2.5rem] border border-white/10 h-[300px] overflow-y-auto custom-scrollbar">
                  <div className="flex flex-wrap gap-x-3 gap-y-4 text-3xl font-bold leading-relaxed">
                    {script.map((item, i) => (
                      <span key={i} className={`transition-all duration-300 ${currentTime >= item.start && currentTime <= item.end ? 'text-[#C8A2C8] scale-110' : 'text-white/20'}`}>
                        {item.word}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 mt-8">
                  {!isRecording && !recordedBlob && (
                    <button onClick={startRecording} className="flex-1 bg-[#C8A2C8] text-black h-16 rounded-full font-black text-lg hover:shadow-[0_0_30px_rgba(200,162,200,0.4)] transition-all">START RECORDING</button>
                  )}
                  {isRecording && (
                    <button onClick={stopRecording} className="flex-1 bg-red-600 h-16 rounded-full font-black text-lg animate-pulse">STOP & FINISH</button>
                  )}
                  {recordedBlob && !isRecording && (
                    <>
                      <button onClick={() => setRecordedBlob(null)} className="px-8 h-16 rounded-full border border-white/10 font-bold hover:bg-white/5">RETRY</button>
                      <button onClick={() => submitDub('mp3')} className="flex-1 bg-white text-black h-16 rounded-full font-black">GET MP3</button>
                      <button onClick={() => submitDub('video')} className="flex-1 bg-[#C8A2C8] text-black h-16 rounded-full font-black">FINALIZE VIDEO</button>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {stage === 'processing' && (
            <div className="h-[60vh] flex flex-col items-center justify-center">
              <div className="w-12 h-12 border-2 border-[#C8A2C8] border-t-transparent rounded-full animate-spin mb-6"></div>
              <p className="text-[#C8A2C8] font-mono tracking-widest animate-pulse">ANALYZING SPEECH PATTERNS...</p>
            </div>
          )}

          {stage === 'result' && (
            <div className="text-center py-20 bg-white/[0.02] border border-white/10 rounded-[3rem]">
              <div className="text-6xl mb-6">✨</div>
              <h2 className="text-4xl font-black mb-10">Production Complete</h2>
              <a href={outputUrl} download className="bg-[#C8A2C8] text-black px-16 py-5 rounded-full font-black text-xl hover:scale-105 transition-transform inline-block">DOWNLOAD VIDEO</a>
              <button onClick={() => window.location.reload()} className="block mx-auto mt-8 text-white/30 underline uppercase text-[10px] tracking-widest">New Project</button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default App;

