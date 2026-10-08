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
import ActivityModal from '../components/ActivityModal'; 
import { formatDistanceToNowStrict } from 'date-fns';

// ==========================================
// 1. HELPER FUNCTIONS (Tetap Sama)
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
// 2. COMPONENT: TENOR GIF PICKER (Tetap Sama)
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
    <div className="z-[70] bg-white border-slate-200 overflow-hidden flex flex-col fixed bottom-0 left-0 right-0 w-full h-[50vh] rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.15)] border-t md:absolute md:bottom-12 md:left-0 md:w-[320px] md:h-[350px] md:rounded-xl md:border md:shadow-2xl md:h-auto animate-in slide-in-from-bottom-10 duration-200">
       <div className="md:hidden w-full flex justify-center pt-3 pb-1" onClick={onClose}>
          <div className="w-12 h-1.5 bg-slate-300 rounded-full cursor-pointer"></div>
       </div>
       <div className="p-3 border-b border-slate-100 flex items-center gap-2 bg-white">
          <MagnifyingGlass size={18} className="text-slate-400"/>
          <input type="text" placeholder="Search GIFs..." className="w-full outline-none text-sm text-slate-700 placeholder:text-slate-400 bg-transparent" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
          <button onClick={onClose} className="md:hidden p-1 bg-slate-100 rounded-full text-slate-500"><X size={16} weight="bold"/></button>
       </div>
       <div className="flex-1 overflow-y-auto p-1 bg-slate-50">
          {loading && <div className="text-center py-10 text-xs text-slate-400">Loading...</div>}
          <div className="grid grid-cols-3 md:grid-cols-2 gap-1">
             {!loading && gifs.map((gif) => (
                <div key={gif.id} onClick={() => onSelect(gif.media[0].tinygif.url)} className="cursor-pointer active:opacity-70 hover:opacity-80 transition relative group aspect-square md:aspect-video bg-slate-200 rounded overflow-hidden">
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
// 3. COMPONENT: RICH INPUT (Tetap Sama)
// ==========================================
const RichCommentInput = ({ onSend, placeholder, autoFocus }) => {
  const editorRef = useRef(null);
  const fileInputRef = useRef(null);
  const [content, setContent] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [cursorCoords, setCursorCoords] = useState({ top: 0, left: 0 });
  const [image, setImage] = useState(null); 
  const [preview, setPreview] = useState(null); 
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);

  const highlightText = (text) => {
    if (!text) return "";
    return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/(@\w+)/g, '<span class="text-blue-500 font-bold">$1</span>').replace(/(#\w+)/g, '<span class="text-blue-500 font-bold">$1</span>');
  };

  const handleInput = async (e) => {
    const text = e.target.innerText;
    setContent(text);
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
        const res = await axios.get(`http://localhost:5000/api/users/search?q=${query}`, { headers: { Authorization: `Bearer ${token}` } });
        setSuggestions(res.data);
        setShowSuggestions(true);
      } catch (err) { console.error(err); }
    } else { setShowSuggestions(false); }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!showSuggestions && (content.trim() || preview)) handleSend();
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
      <div ref={editorRef} contentEditable onInput={handleInput} onKeyDown={handleKeyDown} className="w-full text-[17px] outline-none text-slate-900 placeholder:text-slate-500 whitespace-pre-wrap break-words min-h-[24px] max-h-32 overflow-y-auto" style={{ caretColor: '#0f172a' }} />
      {!content && <div className="absolute top-0 left-0 text-slate-500 pointer-events-none text-[17px]">{placeholder}</div>}
      {preview && (
        <div className="relative mt-2 mb-2 w-fit">
          <img src={preview} alt="Preview" className="rounded-xl max-h-40 object-cover border border-slate-200" />
          <button onClick={() => { setImage(null); setPreview(null); if(fileInputRef.current) fileInputRef.current.value=""; }} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full hover:bg-black transition"><X size={14} weight="bold" /></button>
        </div>
      )}
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
         <div className="flex gap-1 text-blue-500 relative">
            <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*"/>
            <button onClick={() => fileInputRef.current.click()} className="p-1.5 hover:bg-blue-50 rounded-full transition" title="Add Image"><ImageIcon size={20} /></button>
            <div>
                <button onClick={() => { setShowGifPicker(!showGifPicker); setShowEmoji(false); }} className={`p-1.5 rounded-full transition ${showGifPicker ? "bg-blue-100 text-blue-600" : "hover:bg-blue-50"}`}><Gif size={20} weight="bold"/></button>
                {showGifPicker && (<><div className="fixed inset-0 z-[60] bg-black/20 md:bg-transparent" onClick={() => setShowGifPicker(false)}></div><TenorPicker onSelect={onSelectGif} onClose={() => setShowGifPicker(false)} /></>)}
            </div>
            <div>
                <button onClick={() => { setShowEmoji(!showEmoji); setShowGifPicker(false); }} className={`p-1.5 rounded-full transition ${showEmoji ? "bg-blue-100 text-blue-600" : "hover:bg-blue-50"}`}><Smiley size={20} /></button>
                {showEmoji && (<><div className="fixed inset-0 z-[60] bg-black/20 md:bg-transparent" onClick={() => setShowEmoji(false)}></div><div className="z-[70] bg-white fixed bottom-0 left-0 right-0 w-full h-[50vh] rounded-t-2xl shadow-[0_-5px_20px_rgba(0,0,0,0.15)] border-t md:absolute md:top-10 md:left-0 md:w-auto md:h-auto md:rounded-xl md:shadow-xl md:border-none animate-in slide-in-from-bottom-10 duration-200 overflow-hidden"><div className="md:hidden w-full flex justify-center py-2 bg-white" onClick={() => setShowEmoji(false)}><div className="w-12 h-1.5 bg-slate-300 rounded-full"></div></div><EmojiPicker onEmojiClick={onEmojiClick} width="100%" height="100%" searchDisabled={false} previewConfig={{ showPreview: false }} /></div></>)}
            </div>
         </div>
         <button onClick={handleSend} disabled={!content.trim() && !preview} className="bg-black text-white px-4 py-1.5 rounded-full font-bold text-sm hover:opacity-80 transition disabled:opacity-50 flex items-center gap-2"><span>Reply</span><PaperPlaneRight size={16} weight="fill" /></button>
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
// 4. COMPONENT: COMMENT ITEM (Tetap Sama)
// ==========================================
const CommentItem = ({ comment, allComments, onReplySubmit, onQuote, depth = 0 }) => {
  const navigate = useNavigate();
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isRepliesOpen, setIsRepliesOpen] = useState(false);
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};
  
  const replies = allComments.filter(c => c.parentId === comment._id).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
  const hasReplies = replies.length > 0;
  
  const isLiked = comment.likes?.includes(currentUser.id || currentUser._id);
  const isReposted = comment.reposts?.includes(currentUser.id || currentUser._id);
  const likesCount = comment.likes?.length || 0;
  const repostsCount = comment.reposts?.length || 0;

  const handleNavigateToDetail = () => navigate(`/comment/${comment._id}`);

  // Actions
  const handleLike = async () => { try { await axios.put(`http://localhost:5000/api/posts/comments/${comment._id}/like`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); } catch (err) {} };
  const handleRepost = async () => { try { await axios.put(`http://localhost:5000/api/posts/comments/${comment._id}/repost`, {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); } catch (err) {} };
  
  const handleInlineReply = async (text, image, gif) => {
     await onReplySubmit(text, image, gif, comment._id);
     setShowReplyForm(false); setIsRepliesOpen(true);
  };

  return (
    <div className={`flex flex-col animate-in fade-in duration-300 ${depth > 0 ? 'mt-0' : 'border-b border-slate-100'}`}>
      <div onClick={handleNavigateToDetail} className="flex gap-3 px-4 py-3 hover:bg-slate-50/80 transition duration-200 cursor-pointer relative">
        <div className="flex flex-col items-center">
          <img src={comment.avatar || "https://i.pravatar.cc/150"} className="w-10 h-10 rounded-full object-cover z-10 bg-white border border-slate-100 hover:opacity-80 transition" alt={comment.author} onClick={(e) => { e.stopPropagation(); navigate(`/profile/${comment.handle.replace('@','')}`); }} />
          {(hasReplies && isRepliesOpen) && <div className="flex-1 w-[2px] bg-slate-200 my-1 rounded-full min-h-[20px]"></div>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start">
             <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-bold text-slate-900 text-[15px] hover:underline" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${comment.handle.replace('@','')}`); }}>{comment.author}</span>
                {comment.isVerified && <CircleWavyCheck size={14} weight="fill" className="text-blue-500" />}
                <span className="text-slate-500 text-[14px]">@{comment.handle?.replace('@','')}</span>
                <span className="text-slate-400 text-xs">· {formatDistanceToNowStrict(new Date(comment.createdAt))}</span>
             </div>
             <button className="text-slate-300 hover:text-blue-500 transition p-1 rounded-full hover:bg-blue-50" onClick={(e) => e.stopPropagation()}><DotsThree size={18} /></button>
          </div>
          <div className="text-slate-900 text-[15px] mt-0.5 whitespace-pre-wrap leading-relaxed">{formatContent(comment.content)}</div>
          {comment.image && (
             <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 w-fit max-w-full">
                <img src={getImageUrl(comment.image)} className="max-h-60 object-cover" alt="Media" onClick={(e) => { e.stopPropagation(); window.open(getImageUrl(comment.image), '_blank'); }} />
             </div>
          )}
          <div className="flex items-center justify-between max-w-[300px] mt-2 text-slate-500">
             <button onClick={(e) => { e.stopPropagation(); setShowReplyForm(!showReplyForm); }} className={`flex items-center gap-1.5 group text-xs font-medium transition ${showReplyForm ? "text-blue-500" : "hover:text-blue-500"}`}><div className={`p-2 rounded-full transition ${showReplyForm ? "bg-blue-50" : "group-hover:bg-blue-50"}`}><ChatCircle size={18} weight={showReplyForm ? "fill" : "regular"} /></div><span>{comment.replyCount || replies.length || ''}</span></button>
             <button onClick={(e) => { e.stopPropagation(); handleRepost(); }} className={`flex items-center gap-1.5 group text-xs font-medium transition ${isReposted ? "text-green-600" : "hover:text-green-600"}`}><div className="p-2 rounded-full group-hover:bg-green-50 transition"><ArrowsClockwise size={18} weight={isReposted ? "bold" : "regular"}/></div><span>{repostsCount || ''}</span></button>
             <button onClick={(e) => { e.stopPropagation(); handleLike(); }} className={`flex items-center gap-1.5 group text-xs font-medium transition ${isLiked ? "text-pink-600" : "hover:text-pink-600"}`}><div className="p-2 rounded-full group-hover:bg-pink-50 transition"><Heart size={18} weight={isLiked ? "fill" : "regular"}/></div><span>{likesCount || ''}</span></button>
             <button onClick={(e) => { e.stopPropagation(); onQuote(comment); }} className="flex items-center gap-1.5 group text-xs font-medium hover:text-blue-500 transition"><div className="p-2 rounded-full group-hover:bg-blue-50 transition"><PenNib size={18} /></div></button>
          </div>
          {showReplyForm && (
             <div className="mt-3 flex gap-3 animate-in fade-in slide-in-from-top-1 duration-200" onClick={(e) => e.stopPropagation()}>
                <img src={currentUser.avatar || "https://i.pravatar.cc/150"} className="w-8 h-8 rounded-full object-cover" alt="" />
                <div className="flex-1">
                   <div className="text-[13px] text-slate-500 mb-1">Replying to <span className="text-blue-500">@{comment.handle?.replace('@','')}</span></div>
                   <RichCommentInput onSend={handleInlineReply} placeholder="Post your reply" autoFocus={true} />
                </div>
             </div>
          )}
          {hasReplies && (
             <button onClick={(e) => { e.stopPropagation(); setIsRepliesOpen(!isRepliesOpen); }} className="mt-3 text-blue-500 text-sm font-medium hover:underline flex items-center gap-2">
                {isRepliesOpen ? "Hide replies" : <><div className="w-6 h-[1px] bg-slate-200"></div> View {replies.length} replies</>}
             </button>
          )}
        </div>
      </div>
      {hasReplies && isRepliesOpen && (
         <div className="flex">
            <div className="flex flex-col items-center w-[72px] flex-shrink-0"></div> 
            <div className="flex-1">{replies.map(reply => <CommentItem key={reply._id} comment={reply} allComments={allComments} onReplySubmit={onReplySubmit} onQuote={onQuote} depth={depth + 1} />)}</div>
         </div>
      )}
    </div>
  );
};

// ==========================================
// 5. MAIN PAGE (POST DETAIL)
// ==========================================
const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // State Modal
  const [quoteTarget, setQuoteTarget] = useState(null);
  const [activityType, setActivityType] = useState(null); 

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};

  const fetchDetail = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/posts/${id}`);
      setPost(res.data.post);
      setComments(res.data.comments);
      setLoading(false);
    } catch (error) { setLoading(false); }
  };

  useEffect(() => { window.scrollTo(0, 0); fetchDetail(); }, [id]);

  const handleReplySubmit = async (content, imageFile = null, gifUrl = null, parentId = null) => {
    const token = localStorage.getItem('token');
    if (!token) return navigate('/login');
    try {
      const formData = new FormData();
      const tempDiv = document.createElement("div"); tempDiv.innerHTML = content;
      formData.append('content', tempDiv.innerText);
      if (parentId) formData.append('parentId', parentId);
      if (imageFile) formData.append('image', imageFile);
      else if (gifUrl) formData.append('gifUrl', gifUrl);

      await axios.post(`http://localhost:5000/api/posts/${id}/comment`, formData, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } });
      fetchDetail();
    } catch (error) { console.error("Gagal reply:", error); }
  };

  // [FIX] FUNGSI INTERAKSI REAL
  const checkLogin = (callback) => {
    if (!localStorage.getItem('token')) {
      navigate('/login');
    } else {
      callback();
    }
  };

  const handleLike = () => {
    checkLogin(async () => {
      try {
        await axios.put(`http://localhost:5000/api/posts/${id}/like`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchDetail(); // Refresh data biar UI update
      } catch (err) { console.error(err); }
    });
  };

  const handleRepost = () => {
    checkLogin(async () => {
      try {
        await axios.put(`http://localhost:5000/api/posts/${id}/repost`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchDetail();
      } catch (err) { console.error(err); }
    });
  };

  const handleBookmark = () => {
    checkLogin(async () => {
      try {
        await axios.put(`http://localhost:5000/api/posts/${id}/bookmark`, {}, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
        });
        fetchDetail();
      } catch (err) { console.error(err); }
    });
  };

  if (loading) return <Layout><div className="flex justify-center p-10"><div className="animate-spin h-8 w-8 border-2 border-black rounded-full border-t-transparent"></div></div></Layout>;
  if (!post) return <Layout><div className="p-10 text-center">Post not found</div></Layout>;

  const rootComments = comments.filter(c => !c.parentId).sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <Layout>
      <div className="sticky top-0 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-slate-100 z-20 flex items-center gap-6">
         <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition"><ArrowLeft size={20} weight="bold"/></button>
         <h2 className="text-xl font-bold">Post</h2>
      </div>

      <div className="border-b border-slate-100 pb-1">
         <PostCard 
            post={post} 
            isDetail={true} 
            // [FIX] Menggunakan fungsi real, bukan dummy
            onLike={handleLike} 
            onRepost={handleRepost} 
            onBookmark={handleBookmark} 
            onQuote={(p) => setQuoteTarget(p)}
            onShowActivity={(type) => setActivityType(type)}
         />
      </div>

      <div className="p-4 border-b border-slate-100 flex gap-4">
         <img src={currentUser.avatar || "https://i.pravatar.cc/150"} className="w-11 h-11 rounded-full object-cover border border-slate-100" alt="me"/>
         <div className="flex-1 pt-1.5">
            <RichCommentInput onSend={handleReplySubmit} placeholder="Post your reply" />
         </div>
      </div>

      <div className="pb-20">
         {rootComments.map((comment) => <CommentItem key={comment._id} comment={comment} allComments={comments} onReplySubmit={handleReplySubmit} onQuote={(item) => setQuoteTarget(item)} />)}
         {comments.length === 0 && <div className="py-12 text-center text-slate-400 text-sm">No comments yet. Be the first to reply!</div>}
      </div>
      
      <QuoteModal isOpen={!!quoteTarget} post={quoteTarget} onClose={() => setQuoteTarget(null)} onSuccess={() => { setQuoteTarget(null); navigate('/'); }} />
      
      {post && (
        <ActivityModal 
           isOpen={!!activityType} 
           onClose={() => setActivityType(null)} 
           postId={post._id} 
           initialTab={activityType} 
        />
      )}
    </Layout>
  );
};

export default PostDetail;