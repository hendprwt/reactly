import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom'; 
import axios from 'axios';
import { 
  Image, Smiley, ChartBar, X, CircleNotch, 
  Gif, FilmStrip, MagnifyingGlass, Plus 
} from 'phosphor-react';
import EmojiPicker from 'emoji-picker-react';
import CustomAlert from './CustomAlert';

// === CONFIG TENOR API (V1 Legacy - Lebih Stabil) ===
const TENOR_KEY = "LIVDSRZULELA"; 
const BASE_TENOR_URL = "https://g.tenor.com/v1";

// === HELPER: RICH INPUT ===
const RichInput = ({ value, onChange, placeholder }) => {
  const editorRef = useRef(null);
  useEffect(() => {
    if (value === '' && editorRef.current) editorRef.current.innerText = '';
  }, [value]);
  const handleInput = (e) => onChange(e.target.innerText);
  return (
    <div className="relative w-full">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        className="w-full text-[17px] bg-transparent outline-none text-slate-900 leading-relaxed whitespace-pre-wrap break-words min-h-[50px] max-h-[300px] overflow-y-auto"
        style={{ caretColor: '#0f172a' }}
      />
      {!value && <div className="absolute top-0 left-0 text-slate-500 pointer-events-none text-[17px]">{placeholder}</div>}
    </div>
  );
};

// === COMPONENT UTAMA ===
const CreatePost = ({ refresh, isLoggedIn, onClose }) => { 
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  
  // [BARU] State Progress Upload
  const [uploadProgress, setUploadProgress] = useState(0);

  const [showEmoji, setShowEmoji] = useState(false);
  const [alertState, setAlertState] = useState(null); 

  // Tenor GIF State
  const [showTenor, setShowTenor] = useState(false);
  const [gifSearch, setGifSearch] = useState('');
  const [gifResults, setGifResults] = useState([]);
  const [gifLoading, setGifLoading] = useState(false);

  // Media & Poll State
  const [mediaType, setMediaType] = useState(null); 
  const [files, setFiles] = useState([]); 
  const [previews, setPreviews] = useState([]); 
  const [selectedGifUrl, setSelectedGifUrl] = useState(null); 

  // Poll State
  const [showPoll, setShowPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState(['', '']);
  const [pollDays, setPollDays] = useState(1);

  const fileInputRef = useRef(null);
  const videoInputRef = useRef(null);

  const showAlert = (msg, type = 'error') => {
    setAlertState({ message: msg, type });
  };

  // ... (Logic Fetch Tenor tetap sama) ...
  const fetchTenor = async (query = '') => {
    setGifLoading(true);
    try {
        const endpoint = query ? 'search' : 'trending';
        const url = `${BASE_TENOR_URL}/${endpoint}?q=${query}&key=${TENOR_KEY}&limit=12&media_filter=minimal`;
        const res = await axios.get(url);
        setGifResults(res.data.results || []);
    } catch (e) {
        console.error("Tenor Error:", e);
        showAlert("Gagal memuat GIF.", "error");
    } finally {
        setGifLoading(false);
    }
  };

  useEffect(() => { if (showTenor) { fetchTenor(); setGifSearch(''); } }, [showTenor]);
  useEffect(() => {
      if (!showTenor) return;
      const delay = setTimeout(() => fetchTenor(gifSearch), 500); 
      return () => clearTimeout(delay);
  }, [gifSearch]);

  const handleSelectGif = (gifUrl) => {
      setMediaType('gif');
      setSelectedGifUrl(gifUrl); 
      setPreviews([gifUrl]); 
      setShowTenor(false);
  };

  // ... (Handlers Media Lokal tetap sama) ...
  const handleImageChange = (e) => {
    if (mediaType === 'video' || mediaType === 'gif') return; 
    const newFiles = Array.from(e.target.files);
    if (files.length + newFiles.length > 4) return showAlert("Maksimal 4 gambar.", "error");
    setMediaType('image');
    setFiles([...files, ...newFiles]);
    setPreviews([...previews, ...newFiles.map(f => URL.createObjectURL(f))]);
    e.target.value = null;
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) return showAlert("Ukuran video maksimal 50MB.", "error"); // Update ke 50MB sesuai backend

    const videoUrl = URL.createObjectURL(file);
    const videoEl = document.createElement('video');
    videoEl.src = videoUrl;
    videoEl.preload = 'metadata';
    videoEl.onloadedmetadata = () => {
      window.URL.revokeObjectURL(videoUrl);
      if (videoEl.duration > 300) {
        showAlert("Durasi video maksimal 300 detik.", "error");
      } else {
        setMediaType('video');
        setFiles([file]);
        setPreviews([URL.createObjectURL(file)]);
      }
    };
    e.target.value = null;
  };

  const removeMedia = (index) => {
    if (mediaType === 'gif') { setSelectedGifUrl(null); setPreviews([]); setMediaType(null); return; }
    const newFiles = files.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setFiles(newFiles); setPreviews(newPreviews);
    if (newFiles.length === 0) setMediaType(null);
  };

  const handleAddOption = () => { if (pollOptions.length < 4) setPollOptions([...pollOptions, '']); };
  const handleOptionChange = (idx, val) => { const n = [...pollOptions]; n[idx] = val; setPollOptions(n); };
  const removePoll = () => { setShowPoll(false); setPollOptions(['', '']); };

  // === SUBMIT POST DENGAN PROGRESS ===
  const handleSubmit = async (e) => {
    e.preventDefault();
    const hasPoll = showPoll && pollOptions.every(o => o.trim() !== '');
    if (!content.trim() && files.length === 0 && !selectedGifUrl && !hasPoll) return;

    setLoading(true);
    setUploadProgress(0); // Reset progress

    const formData = new FormData();
    formData.append('content', content);

    if (mediaType === 'video') formData.append('video', files[0]);
    else if (mediaType === 'image') files.forEach(f => formData.append('images', f));
    if (mediaType === 'gif' && selectedGifUrl) formData.append('gifUrl', selectedGifUrl);

    if (showPoll) {
        const pollData = { options: pollOptions.filter(o => o.trim() !== ''), days: pollDays };
        formData.append('poll', JSON.stringify(pollData));
    }

    try {
      const token = localStorage.getItem('token');
      
      // [UPDATE] Tambahkan onUploadProgress
      await axios.post('http://localhost:5000/api/posts', formData, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
        }
      });
      
      setContent(''); setFiles([]); setPreviews([]); setSelectedGifUrl(null);
      setMediaType(null); removePoll(); setShowEmoji(false);
      
      showAlert("Berhasil diposting!", "success");
      if (refresh) refresh();
      if (onClose) onClose();
    } catch (error) {
      console.error(error);
      showAlert(error.response?.data?.message || "Gagal memposting", "error");
    } finally { 
        setLoading(false); 
        setUploadProgress(0); 
    }
  };

  if (!isLoggedIn) return null; 
  const userAvatar = JSON.parse(localStorage.getItem('user'))?.avatar || "https://i.pravatar.cc/150?u=me";

  return (
    <div className="px-4 py-4 border-b border-slate-100 bg-white relative">
       
       {alertState && createPortal(
         <CustomAlert message={alertState.message} type={alertState.type} onClose={() => setAlertState(null)} />,
         document.body
       )}

       {showTenor && createPortal(
         <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200" onClick={() => setShowTenor(false)}>
            <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden shadow-2xl h-[600px] flex flex-col" onClick={e => e.stopPropagation()}>
               <div className="p-3 border-b border-slate-100 flex gap-2 items-center">
                  <div className="flex-1 bg-slate-100 rounded-full flex items-center px-3 py-2.5">
                     <MagnifyingGlass size={18} className="text-slate-400 flex-shrink-0"/>
                     <input className="bg-transparent border-none outline-none text-sm ml-2 w-full text-slate-900 placeholder:text-slate-400" placeholder="Cari GIF..." value={gifSearch} onChange={(e) => setGifSearch(e.target.value)} autoFocus />
                  </div>
                  <button onClick={() => setShowTenor(false)} className="p-2.5 hover:bg-slate-100 rounded-full text-slate-500 transition"><X size={20} weight="bold"/></button>
               </div>
               <div className="flex-1 overflow-y-auto p-2 bg-white custom-scrollbar">
                  {gifLoading ? <div className="h-full flex items-center justify-center"><CircleNotch size={32} className="animate-spin text-blue-500"/></div> : 
                     <div className="grid grid-cols-2 gap-2">
                        {gifResults.map(gif => {
                           const previewUrl = gif.media?.[0]?.tinygif?.url || gif.media?.[0]?.gif?.url;
                           const fullUrl = gif.media?.[0]?.gif?.url;
                           if(!previewUrl) return null;
                           return <img key={gif.id} src={previewUrl} className="w-full h-auto rounded-lg cursor-pointer hover:opacity-90" onClick={() => handleSelectGif(fullUrl)} alt="gif" loading="lazy" />;
                        })}
                     </div>
                  }
               </div>
               <div className="p-2 text-center text-[10px] text-slate-400 bg-slate-50 uppercase tracking-wider font-bold border-t border-slate-100">Via Tenor</div>
            </div>
         </div>, document.body
       )}

       {showEmoji && (
         <div className="absolute top-16 left-4 z-50 shadow-2xl rounded-xl">
            <div className="fixed inset-0" onClick={() => setShowEmoji(false)}/>
            <div className="relative"><EmojiPicker onEmojiClick={(e) => setContent(prev => prev + e.emoji)} width={300} height={400} previewConfig={{ showPreview: false }} /></div>
         </div>
       )}

       <div className="flex gap-4">
         <img src={userAvatar} className="w-11 h-11 rounded-full object-cover border border-slate-100 flex-shrink-0" alt="me" />
         
         <div className="flex-1 pt-2"> 
            <RichInput value={content} onChange={setContent} placeholder="Apa yang sedang terjadi?" />

            {/* PREVIEW MEDIA */}
            {previews.length > 0 && (
              <div className={`mt-3 mb-2 grid gap-2 ${previews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                {previews.map((src, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-black">
                    {mediaType === 'video' ? <video src={src} className="w-full max-h-[400px] object-contain" controls /> : <img src={src} alt="preview" className="w-full h-full object-cover max-h-[400px]" />}
                    <button onClick={() => removeMedia(idx)} className="absolute top-2 right-2 bg-black/70 text-white p-1.5 rounded-full hover:bg-black transition z-10"><X size={16} weight="bold" /></button>
                  </div>
                ))}
              </div>
            )}

            {/* POLL CREATOR */}
            {showPoll && (
                <div className="mt-3 border border-slate-200 rounded-xl p-3 bg-slate-50 relative animate-in zoom-in-95 duration-200">
                    <button onClick={removePoll} className="absolute top-2 right-2 text-slate-400 hover:text-red-500"><X size={18} weight="bold"/></button>
                    <div className="space-y-2 mb-3">
                        {pollOptions.map((opt, idx) => (
                            <div key={idx} className="flex items-center gap-2">
                                <input type="text" placeholder={`Opsi ${idx + 1}`} value={opt} onChange={(e) => handleOptionChange(idx, e.target.value)} className="flex-1 border border-slate-300 rounded-md px-3 py-2 text-sm outline-none focus:border-blue-500 transition" />
                                {idx >= 2 && <button onClick={() => {const n=[...pollOptions]; n.splice(idx,1); setPollOptions(n)}}><X className="text-red-500"/></button>}
                            </div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center border-t border-slate-200 pt-2">
                        <button onClick={handleAddOption} disabled={pollOptions.length >= 4} className="text-blue-500 text-sm font-bold flex items-center gap-1 disabled:opacity-50 hover:underline"><Plus weight="bold"/> Tambah opsi</button>
                        <select value={pollDays} onChange={(e) => setPollDays(e.target.value)} className="text-sm bg-transparent font-medium text-slate-600 outline-none cursor-pointer"><option value={1}>1 Hari</option><option value={3}>3 Hari</option><option value={7}>7 Hari</option></select>
                    </div>
                </div>
            )}

            {/* [BARU] PROGRESS BAR UI */}
            {loading && (
                <div className="mt-3 mb-1 animate-in fade-in duration-200">
                    <div className="flex justify-between text-xs text-blue-600 font-bold mb-1">
                        <span>{mediaType === 'video' ? 'Mengunggah Video...' : 'Memposting...'}</span>
                        <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out" 
                            style={{ width: `${uploadProgress}%` }}
                        ></div>
                    </div>
                </div>
            )}

            {/* TOOLBAR */}
            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50"> 
               <div className="flex gap-0.5 text-blue-500">
                  <input type="file" multiple ref={fileInputRef} onChange={handleImageChange} className="hidden" accept="image/png, image/jpeg, image/jpg, image/webp" />
                  <button onClick={() => fileInputRef.current.click()} disabled={mediaType === 'video' || mediaType === 'gif' || showPoll || loading} className="p-2 rounded-full hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"><Image size={20} weight="bold" /></button>

                  <button onClick={() => setShowTenor(true)} disabled={mediaType !== null || showPoll || loading} className="p-2 rounded-full hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed"><Gif size={20} weight="bold" /></button>

                  <button onClick={() => setShowPoll(!showPoll)} disabled={mediaType !== null || loading} className={`p-2 rounded-full hover:bg-blue-50 disabled:opacity-30 disabled:cursor-not-allowed ${showPoll ? 'text-blue-600 bg-blue-50' : ''}`}><ChartBar size={20} weight="bold" /></button>
                  <button onClick={() => setShowEmoji(!showEmoji)} disabled={loading} className="p-2 hover:bg-blue-50 rounded-full"><Smiley size={20} weight="bold" /></button>

                  <input type="file" ref={videoInputRef} onChange={handleVideoChange} className="hidden" accept="video/mp4, video/quicktime, video/webm" />
                  <button onClick={() => videoInputRef.current.click()} disabled={mediaType !== null || showPoll || loading} className="p-2 hover:bg-blue-50 rounded-full disabled:opacity-30 disabled:cursor-not-allowed"><FilmStrip size={20} weight="bold" /></button>
               </div>

               <button onClick={handleSubmit} disabled={loading || (!content.trim() && !mediaType && !showPoll)} className="bg-blue-500 hover:bg-blue-600 text-white px-5 py-2 rounded-full font-bold text-sm hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2">
                 {loading ? <CircleNotch size={16} className="animate-spin" /> : "Post"}
               </button>
            </div>
         </div>
       </div>
    </div>
  );
};

export default CreatePost;