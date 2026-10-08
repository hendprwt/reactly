import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  ArrowLeft, CircleWavyCheck, ChatCircle, DotsThree, 
  Heart, ArrowsClockwise, PenNib, PaperPlaneRight,
  Image as ImageIcon, Smiley, X, Gif, MagnifyingGlass
} from 'phosphor-react';
import EmojiPicker from 'emoji-picker-react'; 
import Layout from '../components/Layout';
import PostCard from '../components/PostCard'; 
import QuoteModal from '../components/QuoteModal'; 
import ActivityModal from '../components/ActivityModal'; // [IMPORT MODAL ACTIVITY]
import { formatDistanceToNowStrict } from 'date-fns';

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================

const getImageUrl = (img) => {
  if (!img) return null;
  if (img.startsWith('http') || img.startsWith('//')) return img;
  return `http://localhost:5000/uploads/${img}`;
};

const formatContent = (text) => {
  if (!text) return null;
  return text.split(/((?:@|#)[\w]+)/g).map((part, i) => {
    if (part.startsWith('@')) {
      return <Link key={i} to={`/profile/${part.slice(1)}`} onClick={(e) => e.stopPropagation()} className="text-blue-500 hover:underline font-medium">{part}</Link>;
    } else if (part.startsWith('#')) {
      return <span key={i} className="text-blue-500 font-medium cursor-pointer hover:underline">{part}</span>;
    }
    return part;
  });
};

const saveCursorPosition = (element) => {
  const selection = window.getSelection();
  if (selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const preSelectionRange = range.cloneRange();
  preSelectionRange.selectNodeContents(element);
  preSelectionRange.setEnd(range.startContainer, range.startOffset);
  return preSelectionRange.toString().length;
};

const restoreCursorPosition = (element, offset) => {
  const selection = window.getSelection();
  const range = document.createRange();
  let currentOffset = 0;
  let node = element.firstChild;
  while (node) {
    const nodeLength = node.textContent.length;
    if (currentOffset + nodeLength >= offset) {
      if (node.nodeType === 3) { 
        range.setStart(node, offset - currentOffset);
        range.setEnd(node, offset - currentOffset);
      } else { 
        range.setStart(node.firstChild, offset - currentOffset);
        range.setEnd(node.firstChild, offset - currentOffset);
      }
      selection.removeAllRanges();
      selection.addRange(range);
      return;
    }
    currentOffset += nodeLength;
    node = node.nextSibling;
  }
};

// ==========================================
// 2. COMPONENT: TENOR GIF PICKER (RESPONSIVE)
// ==========================================
const TenorPicker = ({ onSelect, onClose }) => {
  const [gifs, setGifs] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const API_KEY = "LIVDSRZULELA"; 
  const BASE_URL = "https://g.tenor.com/v1";

  const fetchGifs = async (query = '') => {
    setLoading(true);
    try {
      const endpoint = query ? 'search' : 'trending';
      const url = `${BASE_URL}/${endpoint}?q=${query}&key=${API_KEY}&limit=12&media_filter=minimal`;
      const res = await axios.get(url);
      setGifs(res.data.results);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  useEffect(() => { fetchGifs(); }, []);

  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      if (search) fetchGifs(search);
      else fetchGifs();
    }, 500);
    return () => clearTimeout(delayDebounce);
  }, [search]);

  return (
    <div className="
      z-[70] bg-white border-slate-200 overflow-hidden flex flex-col
      fixed bottom-0 left-0 right-0 w-full h-[50vh] rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.15)] border-t
      md:absolute md:bottom-12 md:left-0 md:w-[320px] md:h-[350px] md:rounded-xl md:border md:shadow-2xl md:h-auto
      animate-in slide-in-from-bottom-10 duration-200
    ">
       {/* Mobile Handle */}
       <div className="md:hidden w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-300 rounded-full cursor-pointer"></div>
       </div>

       {/* Search Bar */}
       <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-white">
          <MagnifyingGlass size={18} className="text-slate-400"/>
          <input 
            type="text" 
            placeholder="Search GIFs..." 
            className="w-full outline-none text-sm text-slate-700 placeholder:text-slate-400 bg-transparent"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus 
          />
          <button onClick={onClose} className="md:hidden p-1 bg-slate-100 rounded-full text-slate-500"><X size={16} weight="bold"/></button>
       </div>

       {/* Grid Content */}
       <div className="flex-1 overflow-y-auto p-1 bg-slate-50">
          {loading && <div className="text-center py-10 text-xs text-slate-400">Loading...</div>}
          <div className="grid grid-cols-3 md:grid-cols-2 gap-1">
             {!loading && gifs.map((gif) => (
                <div 
                  key={gif.id} 
                  onClick={() => onSelect(gif.media[0].tinygif.url)}
                  className="cursor-pointer active:opacity-70 hover:opacity-80 transition relative group aspect-square md:aspect-video bg-slate-200 rounded overflow-hidden"
                >
                   <img src={gif.media[0].tinygif.url} alt="GIF" className="w-full h-full object-cover"/>
                </div>
             ))}
          </div>
       </div>
       <div className="p-1.5 bg-white border-t border-slate-100 text-[10px] text-center text-slate-400">Via Tenor</div>
    </div>
  );
};

// ==========================================
// 3. COMPONENT: RICH INPUT (EDITOR)
// ==========================================
const RichCommentInput = ({ onSend, placeholder, autoFocus }) => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [content, setContent] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorCoords, setCursorCoords] = useState({ top: 0, left: 0 });

  // Media & Picker States
  const [image, setImage] = useState(null); 
  const [preview, setPreview] = useState(null); 
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  const highlightText = (text) => {
    if (!text) return "";
    return text
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/(@\w+)/g, '<span class="text-blue-500 font-bold">$1</span>')
      .replace(/(#\w+)/g, '<span class="text-blue-500 font-bold">$1</span>');
  };

  const handleInput = async (e) => {
    const text = e.target.innerText;
    setContent(text);
    
    // Logic Mention
    const selection = window.getSelection();
    if (!selection.rangeCount) return;
    const caretPos = selection.focusOffset;
    const textBeforeCaret = selection.focusNode.textContent.slice(0, caretPos);
    const words = textBeforeCaret.split(/\s+/);
    const lastWord = words[words.length - 1];

    if (lastWord.startsWith('@') && lastWord.length > 1) {
      const query = lastWord.slice(1);
      const range = selection.getRangeAt(0).cloneRange();
      const rect = range.getBoundingClientRect();
      setCursorCoords({ top: rect.bottom, left: rect.left }); 
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`http://localhost:5000/api/users/search?q=${query}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSuggestions(res.data);
        setShowSuggestions(true);
      } catch (err) { console.error(err); }
    } else { setShowSuggestions(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!showSuggestions && (content.trim() || preview)) {
         handleSend();
      }
    }
    if (e.key === ' ' || e.key === 'Enter') {
       if (editorRef.current) {
          const savedCursor = saveCursorPosition(editorRef.current);
          editorRef.current.innerHTML = highlightText(editorRef.current.innerText);
          if (document.activeElement === editorRef.current) try { restoreCursorPosition(editorRef.current, savedCursor); } catch(e){}
       }
    }
  };

  const selectSuggestion = (userHandle) => {
    const text = editorRef.current.innerText;
    const words = text.split(/\s+/);
    words.pop(); 
    const newText = words.join(" ") + (words.length > 0 ? " " : "") + `@${userHandle} `;
    editorRef.current.innerHTML = highlightText(newText);
    setContent(newText);
    setShowSuggestions(false);
    
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      setPreview(URL.createObjectURL(file));
      setShowGifPicker(false);
    }
  };

  const onEmojiClick = (emojiData) => {
    const emoji = emojiData.emoji;
    const newText = content + emoji;
    editorRef.current.innerText = newText;
    setContent(newText);
    const range = document.createRange();
    const sel = window.getSelection();
    range.selectNodeContents(editorRef.current);
    range.collapse(false);
    sel.removeAllRanges();
    sel.addRange(range);
  };

  const onSelectGif = (gifUrl) => {
    setPreview(gifUrl);
    setImage(null);
    setShowGifPicker(false);
    setTimeout(() => editorRef.current?.focus(), 100);
  };

  const handleSend = () => {
     const isGifUrl = typeof preview === 'string' && (preview.startsWith('http') || preview.startsWith('//'));
     const fileToSend = isGifUrl ? null : image;
     const gifToSend = isGifUrl ? preview : null;

     onSend(content, fileToSend, gifToSend);
     
     editorRef.current.innerText = "";
     setContent("");
     setImage(null);
     setPreview(null);
     setShowEmoji(false);
     setShowGifPicker(false);
  };

  useEffect(() => { if(autoFocus && editorRef.current) editorRef.current.focus(); }, [autoFocus]);

  return (
    <div className="relative w-full">
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        className="w-full text-[17px] outline-none text-slate-900 placeholder:text-slate-500 whitespace-pre-wrap break-words min-h-[24px] max-h-32 overflow-y-auto"
        style={{ caretColor: '#0f172a' }}
      />
      {!content && <div className="absolute top-0 left-0 text-slate-500 pointer-events-none text-[17px]">{placeholder}</div>}
      
      {/* Preview */}
      {preview && (
        <div className="relative mt-2 mb-2 w-fit">
          <img src={preview} alt="Preview" className="rounded-xl max-h-40 object-cover border border-slate-200" />
          <button 
            onClick={() => { setImage(null); setPreview(null); if(fileInputRef.current) fileInputRef.current.value=""; }}
            className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-black transition"
          >
            <X size={14} weight="bold" />
          </button>
        </div>
      )}

      {/* Toolbar with Responsive Pickers */}
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
         <div className="flex gap-1 text-blue-500 relative">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*"/>
            
            {/* 1. Image Upload */}
            <button onClick={() => fileInputRef.current.click()} className="p-1.5 hover:bg-blue-50 rounded-full transition" title="Add Image"><ImageIcon size={20} /></button>
            
            {/* 2. GIF Picker */}
            <div>
                <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmoji(false); }} className={`p-1.5 rounded-full transition ${showGifPicker ? "bg-blue-100 text-blue-600" : "hover:bg-blue-50"}`}>
                   <Gif size={20} weight="bold"/>
                </button>
                {showGifPicker && (
                  <>
                     <div className="fixed inset-0 z-[60] bg-black/20 md:bg-transparent" onClick={() => setShowGifPicker(false)}></div>
                     <TenorPicker onSelect={onSelectGif} onClose={() => setShowGifPicker(false)} />
                  </>
                )}
            </div>

            {/* 3. Emoji Picker */}
            <div>
                <button onClick={() => { setShowEmoji(!showEmoji); setShowGifPicker(false); }} className={`p-1.5 rounded-full transition ${showEmoji ? "bg-blue-100 text-blue-600" : "hover:bg-blue-50"}`}>
                   <Smiley size={20} />
                </button>
                {showEmoji && (
                   <>
                     <div className="fixed inset-0 z-[60] bg-black/20 md:bg-transparent" onClick={() => setShowEmoji(false)}></div>
                     <div className="
                        z-[70] bg-white
                        fixed bottom-0 left-0 right-0 w-full h-[50vh] rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.15)] border-t
                        md:absolute md:top-10 md:left-0 md:w-auto md:h-auto md:rounded-xl md:shadow-xl md:border-none
                        animate-in slide-in-from-bottom-10 duration-200 overflow-hidden
                     ">
                        <div className="md:hidden w-full flex justify-center py-2 bg-white" onClick={() => setShowEmoji(false)}>
                            <div className="w-12 h-1.5 bg-slate-300 rounded-full"></div>
                        </div>
                        <EmojiPicker onEmojiClick={onEmojiClick} width="100%" height="100%" searchDisabled={false} previewConfig={{ showPreview: false }} />
                     </div>
                   </>
                )}
            </div>
         </div>

         <button 
           onClick={handleSend}
           disabled={!content.trim() && !preview} 
           className="bg-black text-white px-4 py-1.5 rounded-full font-bold text-sm hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2"
         >
            <span>Reply</span>
            <PaperPlaneRight size={16} weight="fill" />
         </button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="fixed bg-white border border-slate-200 shadow-xl rounded-xl overflow-hidden z-[60] w-64 animate-in fade-in zoom-in-95 duration-100" style={{ top: cursorCoords.top + 10, left: cursorCoords.left }}>
           {suggestions.map((user) => (
             <div key={user.id} onClick={() => selectSuggestion(user.id)} className="flex items-center gap-2 p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none">
                <img src={user.avatar || "https://i.pravatar.cc/150"} className="w-8 h-8 rounded-full object-cover" alt=""/>
                <div className="flex flex-col"><span className="font-bold text-sm text-slate-900">{user.fullName}</span><span className="text-xs text-slate-500">@{user.id}</span></div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

// ==========================================
// 4. COMPONENT: REPLY ITEM
// ==========================================
const ReplyItem = ({ comment, onClick, onLike, onRepost }) => {
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  
  const isLiked = comment.likes?.includes(currentUser.id || currentUser._id);
  const isReposted = comment.reposts?.includes(currentUser.id || currentUser._id);

  return (
    <div 
      onClick={() => onClick(comment._id)}
      className="flex gap-3 px-4 py-3 border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition"
    >
      <img 
        src={comment.avatar || "https://i.pravatar.cc/150"} 
        className="w-10 h-10 rounded-full object-cover" 
        alt={comment.author}
        onClick={(e) => { e.stopPropagation(); navigate(`/profile/${comment.handle.replace('@','')}`); }}
      />
      <div className="flex-1">
         <div className="flex items-center gap-1.5">
            <span className="font-bold text-slate-900 text-[15px] hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${comment.handle.replace('@','')}`); }}>
               {comment.author}
            </span>
            {comment.isVerified && <CircleWavyCheck size={14} weight="fill" className="text-blue-500" />}
            <span className="text-slate-500 text-sm">@{comment.handle?.replace('@','')}</span>
            <span className="text-slate-400 text-xs">· {formatDistanceToNowStrict(new Date(comment.createdAt))}</span>
         </div>
         
         <div className="text-slate-900 mt-0.5 text-[15px] leading-relaxed whitespace-pre-wrap">
            {formatContent(comment.content)}
         </div>

         {comment.image && (
             <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 w-fit max-w-full">
                <img 
                   src={getImageUrl(comment.image)} 
                   className="max-h-60 object-cover" 
                   alt="Reply media"
                   onClick={(e) => { e.stopPropagation(); window.open(getImageUrl(comment.image), '_blank'); }}
                />
             </div>
         )}

         <div className="flex gap-6 mt-2 text-slate-500 text-sm">
             <button className="flex items-center gap-1 hover:text-blue-500 group">
                <div className="p-1.5 rounded-full group-hover:bg-blue-50 transition"><ChatCircle size={18}/></div>
                <span>{comment.replyCount || 0}</span>
             </button>
             
             <button 
                onClick={(e) => { e.stopPropagation(); onRepost(comment._id); }} 
                className={`flex items-center gap-1 group transition ${isReposted ? "text-green-600" : "hover:text-green-600"}`}
             >
                <div className="p-1.5 rounded-full group-hover:bg-green-50 transition">
                   <ArrowsClockwise size={18} weight={isReposted ? "bold" : "regular"}/>
                </div>
                <span>{comment.reposts?.length || 0}</span>
             </button>
             
             <button 
                onClick={(e) => { e.stopPropagation(); onLike(comment._id); }} 
                className={`flex items-center gap-1 group transition ${isLiked ? "text-pink-600" : "hover:text-pink-600"}`}
             >
                <div className="p-1.5 rounded-full group-hover:bg-pink-50 transition">
                   <Heart size={18} weight={isLiked ? "fill" : "regular"}/>
                </div>
                <span>{comment.likes?.length || 0}</span>
             </button>
         </div>
      </div>
    </div>
  );
};

// ==========================================
// 5. MAIN COMPONENT (COMMENT DETAIL)
// ==========================================
const CommentDetail = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // State Modal
  const [quoteTarget, setQuoteTarget] = useState(null);
  const [activityType, setActivityType] = useState(null); // 'likes', 'reposts', 'quotes'

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};

  const fetchDetail = async () => {
    try {
      // Backend akan otomatis increment views jika getPostById dipanggil (utk Post)
      // Utk Comment, kita panggil endpoint comment detail (yang mungkin belum ada view counter, tapi gak apa)
      const res = await axios.get(`http://localhost:5000/api/posts/comments/${id}`);
      setData(res.data);
      setLoading(false);
    } catch (error) {
      console.error(error);
      setLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchDetail();
  }, [id]);

  // === HANDLERS (REAL INTERACTION) ===
  const checkLogin = (callback) => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    } else {
      callback();
    }
  };

  const getAuthHeader = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // Handler Kirim Reply
  const handleReplySubmit = async (content, imageFile = null, gifUrl = null) => {
    checkLogin(async () => {
      try {
        const formData = new FormData();
        const tempDiv = document.createElement("div"); tempDiv.innerHTML = content;
        
        formData.append('content', tempDiv.innerText);
        formData.append('parentId', data.comment._id); 
        
        if (imageFile) formData.append('image', imageFile);
        else if (gifUrl) formData.append('gifUrl', gifUrl);

        await axios.post(`http://localhost:5000/api/posts/${data.originalPost._id}/comment`, 
          formData,
          { headers: { 
              Authorization: `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'multipart/form-data'
          } }
        );
        fetchDetail(); 
      } catch (err) { console.error(err); }
    });
  };

  // Handler Like/Repost untuk KOMENTAR UTAMA (Yang sedang dilihat)
  const handleLikeMain = () => checkLogin(async () => {
    try {
      await axios.put(`http://localhost:5000/api/posts/comments/${data.comment._id}/like`, {}, getAuthHeader());
      fetchDetail();
    } catch (err) { console.error(err); }
  });

  const handleRepostMain = () => checkLogin(async () => {
    try {
      await axios.put(`http://localhost:5000/api/posts/comments/${data.comment._id}/repost`, {}, getAuthHeader());
      fetchDetail();
    } catch (err) { console.error(err); }
  });

  const handleBookmarkMain = () => {
    // Komentar belum punya fitur bookmark di backend, kita dummy-kan saja atau alert
    alert("Bookmark feature for comments coming soon!");
  };

  // Handler Like/Repost untuk REPLY ITEM (Daftar balasan di bawah)
  const handleLikeReply = (replyId) => checkLogin(async () => {
    try {
      await axios.put(`http://localhost:5000/api/posts/comments/${replyId}/like`, {}, getAuthHeader());
      fetchDetail();
    } catch (err) { console.error(err); }
  });

  const handleRepostReply = (replyId) => checkLogin(async () => {
    try {
      await axios.put(`http://localhost:5000/api/posts/comments/${replyId}/repost`, {}, getAuthHeader());
      fetchDetail();
    } catch (err) { console.error(err); }
  });


  if (loading) return <Layout><div className="flex justify-center p-10"><div className="animate-spin h-8 w-8 border-2 border-black rounded-full border-t-transparent"></div></div></Layout>;
  if (!data) return <Layout><div className="p-10 text-center">Comment not found</div></Layout>;

  // Mapping data Comment agar bisa dibaca oleh PostCard (Detail Mode)
  const commentAsPost = {
    ...data.comment,
    comments: data.comment.replyCount || 0, 
    _id: data.comment._id,
    postId: data.originalPost._id,
    
    // [PENTING] View Count & Quote Count (jika backend support)
    quoteCount: data.comment.quoteCount || 0, 
    views: data.comment.views || 0 // Counter Views
  };

  return (
    <Layout>
      <div className="sticky top-0 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-slate-100 z-20 flex items-center gap-6">
         <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20} weight="bold"/></button>
         <h2 className="text-xl font-bold">Thread</h2>
      </div>

      {/* Komentar Utama */}
      <div className="border-b border-slate-100 pb-1">
        <PostCard 
            post={commentAsPost} 
            isDetail={true} 
            onLike={handleLikeMain} 
            onRepost={handleRepostMain} 
            onBookmark={handleBookmarkMain}
            onQuote={(p) => setQuoteTarget(p)}
            // Activity Modal Trigger
            onShowActivity={(type) => setActivityType(type)}
        />
      </div>

      {/* Rich Input Reply */}
      <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/30">
         <img src={currentUser.avatar || "https://i.pravatar.cc/150"} className="w-11 h-11 rounded-full object-cover border border-slate-100" alt="me"/>
         <div className="flex-1 pt-1">
             <div className="text-[13px] text-slate-500 mb-1 ml-1">Replying to <span className="text-blue-500">@{data.comment.handle?.replace('@','')}</span></div>
             <RichCommentInput 
                onSend={handleReplySubmit} 
                placeholder="Post your reply" 
                autoFocus={true} 
             />
         </div>
      </div>

      {/* List Balasan */}
      <div className="pb-20">
         {data.replies.map(reply => (
            <ReplyItem 
               key={reply._id} 
               comment={reply} 
               onClick={(id) => navigate(`/comment/${id}`)} 
               onLike={handleLikeReply}
               onRepost={handleRepostReply}
            />
         ))}
         {data.replies.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">No replies yet.</div>}
      </div>

      <QuoteModal 
         isOpen={!!quoteTarget} 
         post={quoteTarget} 
         onClose={() => setQuoteTarget(null)}
         onSuccess={() => { setQuoteTarget(null); navigate('/'); }}
      />

      {/* Modal Activity (Untuk Komentar Utama) */}
      <ActivityModal 
          isOpen={!!activityType} 
          onClose={() => setActivityType(null)} 
          postId={data.comment._id} 
          initialTab={activityType} 
      />
    </Layout>
  );
};

export default CommentDetail;