import React, { useState } from 'react';
import axios from 'axios';
import { X } from 'phosphor-react';

const QuoteModal = ({ post, isOpen, onClose, onSuccess }) => {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : {};

  if (!isOpen || !post) return null;

  // Cek apakah 'post' ini sebenarnya adalah Komentar?
  // Cara cek sederhana: Kalau objectnya punya field 'postId', berarti dia Komentar.
  const isComment = post.hasOwnProperty('postId');

  const handleSubmit = async () => {
    if (!content.trim()) return;
    setLoading(true);
    const token = localStorage.getItem('token');
    
    // Siapkan Payload
    const payload = { content };
    
    if (isComment) {
       payload.quoteCommentOf = post._id; // Quote Komentar
    } else {
       payload.quoteOf = post._id; // Quote Postingan Biasa
    }

    try {
      await axios.post('http://localhost:5000/api/posts', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setContent('');
      onSuccess(); 
      onClose();
    } catch (err) {
      console.error(err);
      alert("Gagal memposting kutipan");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-20 animate-fade-in">
      <div className="bg-white w-full max-w-lg rounded-2xl p-4 shadow-2xl relative mx-4">
        <button onClick={onClose} className="absolute top-4 left-4 p-2 rounded-full hover:bg-slate-100 transition"><X size={20} weight="bold"/></button>
        <div className="flex justify-end mb-4">
           <button onClick={handleSubmit} disabled={loading || !content.trim()} className="bg-black text-white px-5 py-1.5 rounded-full font-bold text-sm disabled:opacity-50">
             {loading ? 'Posting...' : 'Post'}
           </button>
        </div>
        <div className="flex gap-3 mt-10">
           <img src={currentUser.avatar || "https://i.pravatar.cc/150"} className="w-10 h-10 rounded-full object-cover" alt="Me" /> 
           <div className="flex-1">
              <textarea value={content} onChange={(e) => setContent(e.target.value)} placeholder="Add a comment..." className="w-full outline-none text-lg placeholder-slate-500 mb-4 resize-none min-h-[80px]" autoFocus />
              
              {/* PREVIEW KONTEN YANG DI-QUOTE */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden mt-2 select-none">
                 <div className="p-3 bg-slate-50/50">
                    <div className="flex items-center gap-2 mb-1">
                       <img src={post.avatar || "https://i.pravatar.cc/150"} className="w-5 h-5 rounded-full object-cover" alt="" />
                       <span className="font-bold text-sm text-slate-900">{post.author}</span>
                       <span className="text-slate-500 text-sm">@{post.handle?.replace('@','')}</span>
                       {isComment && <span className="bg-slate-200 text-[10px] px-1 rounded text-slate-500">Comment</span>}
                    </div>
                    <div className="text-sm text-slate-900 line-clamp-3">{post.content}</div>
                 </div>
                 {post.image && !isComment && ( // Biasanya komen jarang ada gambar di preview quote kecil
                    <div className="h-32 bg-slate-100 border-t border-slate-100">
                       <img src={`http://localhost:5000/uploads/${post.image}`} className="w-full h-full object-cover" />
                    </div>
                 )}
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};
export default QuoteModal;