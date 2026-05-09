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
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("none");
  const [scriptDirection, setScriptDirection] = useState("ltr");

  const mediaRef = useRef(null);
  const wordRefs = useRef([]);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const API_URL = import.meta.env.VITE_API_URL?.replace(/\/$/, "");

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
      alert("Error processing media.");
      setStage('upload');
    }
  };

  const prepareMic = async () => {
    try {
      // HIGH FIDELITY CAPTURE
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: false, autoGainControl: false, noiseSuppression: false, sampleRate: 48000 } 
      });
      const options = { mimeType: 'audio/webm;codecs=opus', audioBitsPerSecond: 256000 };
      mediaRecorderRef.current = new MediaRecorder(stream, options);
      mediaRecorderRef.current.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorderRef.current.onstop = () => setRecordedBlob(new Blob(chunksRef.current, { type: 'audio/webm' }));
      setMicGranted(true);
    } catch (err) { alert("Mic access denied."); }
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
    mediaRef.current?.pause();
    setIsRecording(false);
  };

  const submitDub = async (mode) => {
    if (mode === 'raw') {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(recordedBlob);
      a.download = "vocals.webm"; a.click();
      return;
    }
    setStage('processing');
    const formData = new FormData();
    formData.append("voice", recordedBlob);
    formData.append("job_id", jobId);
    await fetch(`${API_URL}/merge`, { method: "POST", body: formData });
    setOutputUrl(`${API_URL}/download/${jobId}`);
    setStage('result');
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-5 flex flex-col items-center">
      <header className="w-full max-w-4xl flex justify-between mb-10">
        <h1 className="text-2xl font-black italic">KurdDub <span className="text-[#E0B0FF]">Pro</span></h1>
        {isRecording && <span className="text-red-500 animate-pulse font-bold">● RECORDING</span>}
      </header>

      <AnimatePresence mode="wait">
        {stage === 'upload' && (
          <div className="bg-white/5 p-10 rounded-3xl border border-white/10 w-full max-w-xl">
            <div className="grid grid-cols-2 gap-4 mb-6">
              <select value={sourceLang} onChange={e => setSourceLang(e.target.value)} className="bg-black p-3 rounded-xl border border-white/10">
                <option value="auto">Auto-Detect</option>
                <option value="ja">Japanese</option>
                <option value="en">English</option>
              </select>
              <select value={targetLang} onChange={e => setTargetLang(e.target.value)} className="bg-black p-3 rounded-xl border border-[#E0B0FF]/40 text-[#E0B0FF]">
                <option value="none">Original</option>
                <option value="ckb">Kurdish</option>
                <option value="ja">Japanese</option>
                <option value="en">English</option>
              </select>
            </div>
            <input type="file" id="up" hidden onChange={handleInitialUpload} accept="video/*,audio/*" />
            <label htmlFor="up" className="block text-center p-10 border-2 border-dashed border-white/10 rounded-2xl cursor-pointer hover:border-[#E0B0FF]">
              Upload MP4 or MP3
            </label>
          </div>
        )}

        {stage === 'recording' && (
          <div className="w-full max-w-4xl flex flex-col gap-5">
            <div className="bg-black rounded-3xl overflow-hidden border border-white/10">
              {isAudioMode ? (
                <div className="h-20 flex items-center justify-center bg-purple-900/10 uppercase tracking-widest text-xs font-bold text-[#E0B0FF]">Audio Mode Active</div>
              ) : (
                <video ref={mediaRef} src={mediaUrl} className="w-full aspect-video" playsInline muted />
              )}
              <audio ref={isAudioMode ? mediaRef : null} src={isAudioMode ? mediaUrl : null} onTimeUpdate={e => setCurrentTime(e.target.currentTime)} onEnded={stopRecording} />
            </div>

            <div className="relative h-64 bg-white/5 rounded-3xl border border-white/10 overflow-hidden p-10">
              <button onClick={() => setScriptDirection(d => d === 'ltr' ? 'rtl' : 'ltr')} className="absolute top-4 right-4 text-[10px] bg-white/10 px-3 py-1 rounded-full">DIRECTION: {scriptDirection.toUpperCase()}</button>
              <div className="overflow-y-auto h-full scroll-smooth flex flex-wrap justify-center gap-3" dir={scriptDirection}>
                {script.map((item, i) => (
                  <span key={i} ref={el => wordRefs.current[i] = el} className={`text-2xl font-bold px-2 py-1 rounded-lg transition-all ${currentTime >= item.start && currentTime < item.end ? 'bg-[#E0B0FF] text-black scale-110' : 'opacity-30'}`}>
                    {item.word}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {!micGranted ? <button onClick={prepareMic} className="bg-white/10 p-5 rounded-2xl font-bold">1. SETUP STUDIO MIC</button> :
               !isRecording && !recordedBlob ? <button onClick={startAction} className="bg-[#E0B0FF] text-black p-5 rounded-2xl font-black text-xl">2. START DUBBING</button> :
               isRecording ? <button onClick={stopRecording} className="bg-red-500 p-5 rounded-2xl font-black">STOP</button> :
               <button onClick={() => submitDub('master')} className="bg-[#E0B0FF] text-black p-5 rounded-2xl font-black">PRODUCE FINAL MASTER</button>}
            </div>
          </div>
        )}

        {stage === 'processing' && <div className="animate-spin w-10 h-10 border-4 border-[#E0B0FF] border-t-transparent rounded-full" />}
        
        {stage === 'result' && (
          <div className="text-center">
            <h2 className="text-3xl font-black mb-5">Mastering Complete</h2>
            <a href={outputUrl} download className="bg-[#E0B0FF] text-black px-10 py-5 rounded-2xl font-bold">DOWNLOAD RESULT</a>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default App;

