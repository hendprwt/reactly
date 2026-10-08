import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, CircleNotch } from 'phosphor-react';
import io from 'socket.io-client';

import CreatePost from './CreatePost';
import PostCard from './PostCard';
import Stories from './Stories';
import QuoteModal from './QuoteModal';

const API_URL = 'http://localhost:5000/api/posts';
const socket = io("http://localhost:5000", { autoConnect: true, reconnection: true });

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostsQueue, setNewPostsQueue] = useState([]);
  const [quotePost, setQuotePost] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const navigate = useNavigate();
  const abortControllerRef = useRef(null);

  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const isLoggedIn = !!(token && user);
  const myId = user?._id || user?.id;

  // === FETCH POSTS ===
  const fetchPosts = async () => {
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    try {
      const res = await axios.get(API_URL, { signal });
      setPosts(res.data);
    } catch (err) {
      if (!axios.isCancel(err)) console.error("Feed fetch error:", err);
    } finally {
      if (!signal.aborted) setLoading(false);
    }
  };

  // === SOCKET LOGIC ===
  useEffect(() => {
    fetchPosts();
    return () => { if (abortControllerRef.current) abortControllerRef.current.abort(); };
  }, []);

  useEffect(() => {
    if (!myId) return;
    const registerUser = () => socket.emit("addNewUser", myId);
    if (socket.connected) registerUser();
    socket.on("connect", registerUser);

    socket.off("newPostAvailable");
    socket.on("newPostAvailable", (data) => {
      if (data.userId !== myId) {
        setNewPostsQueue((prev) => {
          const exists = prev.some(p => p.postId === data.postId);
          return exists ? prev : [data, ...prev];
        });
      }
    });

    return () => {
      socket.off("connect", registerUser);
      socket.off("newPostAvailable");
    };
  }, [myId]);

  const handleShowNewPosts = async () => {
    await fetchPosts();
    setNewPostsQueue([]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // === HANDLERS — ✅ SEMUA SUDAH TERHUBUNG KE API (Fix dari stub kosong) ===
  const updatePostInState = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const handleLike = async (postId) => {
    if (!isLoggedIn) return navigate('/login');
    try {
      const res = await axios.put(`${API_URL}/${postId}/like`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updatePostInState(res.data);
    } catch (err) { console.error(err); }
  };

  const handleRepost = async (postId) => {
    if (!isLoggedIn) return navigate('/login');
    try {
      const res = await axios.put(`${API_URL}/${postId}/repost`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updatePostInState(res.data);
    } catch (err) { console.error(err); }
  };

  const handleBookmark = async (postId) => {
    if (!isLoggedIn) return navigate('/login');
    try {
      const res = await axios.put(`${API_URL}/${postId}/bookmark`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      updatePostInState(res.data);
    } catch (err) { console.error(err); }
  };

  const handleQuote = (post) => !isLoggedIn ? navigate('/login') : setQuotePost(post);

  const visiblePosts = isLoggedIn ? posts : posts.slice(0, 3);

  return (
    <div className="w-full min-h-screen bg-white relative">

      {/* Sticky Header */}
      <div
        className="sticky top-0 bg-white/90 backdrop-blur-md px-4 py-3 border-b border-slate-100 z-30 cursor-pointer flex justify-between items-center"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <h2 className="text-xl font-bold text-slate-900">Home</h2>
      </div>

      {/* Pill Notification */}
      {newPostsQueue.length > 0 && (
        <div className="fixed top-20 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
          <button
            onClick={handleShowNewPosts}
            className="pointer-events-auto bg-sky-500 hover:bg-sky-600 text-white px-5 py-2.5 rounded-full shadow-2xl text-sm font-bold flex items-center gap-2 transform transition-all hover:scale-105 active:scale-95 border-2 border-white"
          >
            <ArrowUp size={18} weight="bold" />
            Show {newPostsQueue.length} new posts
          </button>
        </div>
      )}

      {/* Stories */}
      <div className="border-b border-slate-100 py-2">
        <Stories />
      </div>

      <CreatePost refresh={fetchPosts} isLoggedIn={isLoggedIn} />

      {/* Post List */}
      {loading && posts.length === 0 ? (
        <div className="flex justify-center items-center py-16">
          <CircleNotch size={32} className="animate-spin text-slate-400" />
        </div>
      ) : (
        <div className="relative">
          {visiblePosts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              onLike={handleLike}
              onRepost={handleRepost}
              onBookmark={handleBookmark}
              onQuote={handleQuote}
              activeMenuId={activeMenuId}
              setActiveMenuId={setActiveMenuId}
              showPinLabel={false}
            />
          ))}
        </div>
      )}

      {!isLoggedIn && (
        <div className="p-8 text-center bg-slate-50 mt-4 pb-32">
          <p className="text-slate-500 mb-4">Login to see more</p>
          <button onClick={() => navigate('/login')} className="bg-black text-white px-6 py-2 rounded-full">Login</button>
        </div>
      )}

      <QuoteModal
        isOpen={!!quotePost}
        post={quotePost}
        onClose={() => setQuotePost(null)}
        onSuccess={() => { fetchPosts(); setQuotePost(null); }}
      />
    </div>
  );
};

export default Feed;