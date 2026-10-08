import React, { useState, useEffect, useRef } from 'react'; // [UPDATE] Tambah useRef
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowUp, CircleNotch } from 'phosphor-react'; 
import io from 'socket.io-client';

// Import komponen
import CreatePost from '../components/CreatePost'; 
// import PostCard from '../components/PostCard'; // <-- Pastikan arah import benar (kalau sudah refactor)
import PostCard from '../components/PostCard/index'; // Arahkan ke folder index baru
import Stories from '../components/Stories';
import Layout from '../components/Layout';
import QuoteModal from '../components/QuoteModal';

const API_URL = 'http://localhost:5000/api/posts';

const socket = io("http://localhost:5000", {
  autoConnect: true,
  reconnection: true,
});

const Home = () => {
  const [activeTab, setActiveTab] = useState('foryou');
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPostsCount, setNewPostsCount] = useState(0);
  const [quotePost, setQuotePost] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const myId = user?._id || user?.id;
  const isLoggedIn = !!(token && user);

  // [FIX] Gunakan useRef untuk menyimpan controller agar tidak re-render
  const abortControllerRef = useRef(null);

  // === 1. FETCH DATA (DENGAN ABORT CONTROLLER) ===
  const fetchPosts = async () => {
    // Batalkan request sebelumnya jika ada
    if (abortControllerRef.current) {
        abortControllerRef.current.abort();
    }
    // Buat controller baru
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    setLoading(true);
    // [FIX] Kosongkan posts saat ganti tab biar user tau lagi loading (opsional, tapi bagus buat UX)
    // setPosts([]); 

    try {
      let endpoint = API_URL; 

      if (isLoggedIn) {
        if (activeTab === 'following') {
            endpoint = `${API_URL}/feed/following`;
        } else {
            endpoint = `${API_URL}/feed/foryou`;
        }
      }

      const res = await axios.get(endpoint, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: signal // [PENTING] Pasang signal disini
      });

      setPosts(res.data);
    } catch (err) {
      if (axios.isCancel(err)) {
          console.log('Request canceled', err.message);
      } else {
          console.error("Fetch Error:", err);
          // Fallback logic
          if (isLoggedIn && activeTab === 'foryou') {
             try {
                const fallbackRes = await axios.get(API_URL, { signal });
                setPosts(fallbackRes.data);
             } catch (e) {}
          }
      }
    } finally {
      // Hanya matikan loading jika request tidak dicancel
      if (!signal.aborted) {
        setLoading(false);
      }
    }
  };

  // Fetch ulang saat Tab berubah atau Login status berubah
  useEffect(() => {
    fetchPosts();
    setNewPostsCount(0);
    
    // Cleanup function: Batalkan request saat component unmount atau dependencies berubah
    return () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
    };
  }, [activeTab, isLoggedIn]);

  // === 2. SOCKET LOGIC ===
  useEffect(() => {
    if (!myId) return;
    const registerUser = () => { socket.emit("addNewUser", myId); };
    if (socket.connected) registerUser();
    socket.on("connect", registerUser);

    socket.on('newPostAvailable', (data) => {
      if (data.userId !== myId) {
        setNewPostsCount(prev => prev + 1);
      }
    });

    return () => {
      socket.off("connect", registerUser);
      socket.off('newPostAvailable');
    };
  }, [myId]);

  // ===============================================
  // HANDLERS (SAMA)
  // ===============================================
  const updatePostInState = (updatedPost) => {
    setPosts((prevPosts) => 
      prevPosts.map((p) => (p._id === updatedPost._id ? updatedPost : p))
    );
  };

  const handleLike = async (postId) => {
    if (!isLoggedIn) return navigate('/login');
    // Optimistic UI Update (Opsional: Ubah state dulu baru request ke server biar cepet)
    try {
      const res = await axios.put(`${API_URL}/${postId}/like`, {}, { headers: { Authorization: `Bearer ${token}` } });
      updatePostInState(res.data);
    } catch (err) { console.error(err); }
  };

  const handleRepost = async (postId) => {
    if (!isLoggedIn) return navigate('/login');
    try {
      const res = await axios.put(`${API_URL}/${postId}/repost`, {}, { headers: { Authorization: `Bearer ${token}` } });
      updatePostInState(res.data);
    } catch (err) { console.error(err); }
  };

  const handleBookmark = async (postId) => {
    if (!isLoggedIn) return navigate('/login');
    try {
      const res = await axios.put(`${API_URL}/${postId}/bookmark`, {}, { headers: { Authorization: `Bearer ${token}` } });
      updatePostInState(res.data);
    } catch (err) { console.error(err); }
  };

  const handleDelete = async (postId) => {
    if (!window.confirm("Are you sure?")) return;
    try {
      await axios.delete(`${API_URL}/${postId}`, { headers: { Authorization: `Bearer ${token}` } });
      setPosts((prev) => prev.filter(p => p._id !== postId));
    } catch (err) { alert("Failed to delete"); }
  };

  const handlePin = async (postId) => {
    try {
      await axios.put(`${API_URL}/${postId}/pin`, {}, { headers: { Authorization: `Bearer ${token}` } });
      fetchPosts(); 
    } catch (err) { alert(err.response?.data?.message || "Failed"); }
  };

  const handleQuote = (post) => {
    if (!isLoggedIn) return navigate('/login');
    setQuotePost(post); 
  };

  const handleRefreshClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setNewPostsCount(0);
    fetchPosts();
  };

  return (
    <Layout>
      {/* HEADER WITH TABS */}
      <div className="sticky top-0 bg-white/90 backdrop-blur-md z-30 border-b border-slate-100">
         <div className="px-4 py-2 flex justify-between items-center md:hidden">
            <h2 className="text-xl font-black cursor-pointer" onClick={handleRefreshClick}>Home</h2>
         </div>

         <div className="flex w-full">
            <button
              onClick={() => setActiveTab('foryou')}
              className={`flex-1 py-4 text-[15px] font-bold transition-colors relative hover:bg-slate-50 ${
                activeTab === 'foryou' ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              Untuk Anda
              {activeTab === 'foryou' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full" />
              )}
            </button>

            <button
              onClick={() => {
                  if (!isLoggedIn) return navigate('/login');
                  setActiveTab('following');
              }}
              className={`flex-1 py-4 text-[15px] font-bold transition-colors relative hover:bg-slate-50 ${
                activeTab === 'following' ? 'text-slate-900' : 'text-slate-400'
              }`}
            >
              Mengikuti
              {activeTab === 'following' && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-14 h-1 bg-blue-500 rounded-full" />
              )}
            </button>
         </div>
      </div>

      {newPostsCount > 0 && (
        <div className="fixed top-32 left-0 right-0 z-[9999] flex justify-center pointer-events-none">
          <button onClick={handleRefreshClick} className="pointer-events-auto bg-blue-500 text-white px-5 py-2 rounded-full shadow-lg font-bold text-sm flex items-center gap-2 animate-bounce border-2 border-white">
            <ArrowUp size={16} weight="bold" /> Postingan baru
          </button>
        </div>
      )}

      {/* Stories (Hanya di For You) */}
      {activeTab === 'foryou' && (
        <div className="border-b border-slate-100 py-2">
            <Stories />
        </div>
      )}

      <CreatePost refresh={fetchPosts} isLoggedIn={isLoggedIn} />

      {/* POST LIST */}
      <div className="pb-20 relative min-h-[50vh]">
        {loading && posts.length === 0 ? (
          <div className="flex justify-center p-10"><CircleNotch size={32} className="animate-spin text-blue-500" /></div>
        ) : (
          <>
            {posts.map(post => (
              <PostCard 
                key={post._id} 
                post={post} 
                onLike={handleLike}      
                onRepost={handleRepost}  
                onBookmark={handleBookmark} 
                onQuote={handleQuote}
                onDelete={handleDelete}
                onPin={handlePin}
                activeMenuId={activeMenuId}
                setActiveMenuId={setActiveMenuId}
                showPinLabel={true} 
              />
            ))}

            {posts.length === 0 && (
                <div className="text-center py-20 px-6">
                    <div className="text-4xl mb-4">📭</div>
                    <p className="font-bold text-lg text-slate-800">Belum ada postingan</p>
                    <p className="text-slate-500 text-sm mt-1">
                        {activeTab === 'following' 
                            ? "Coba ikuti beberapa orang." 
                            : "Server lagi sepi nih."}
                    </p>
                    {activeTab === 'following' && (
                        <button onClick={() => navigate('/explore')} className="mt-4 px-6 py-2 bg-blue-500 text-white rounded-full font-bold text-sm">
                            Cari Teman
                        </button>
                    )}
                </div>
            )}
          </>
        )}
      </div>

      {!isLoggedIn && (
        <div className="p-8 text-center bg-slate-50 border-t border-slate-100 pb-32">
          <p className="text-slate-900 font-bold text-lg mb-2">Jangan ketinggalan beritanya</p>
          <p className="text-slate-500 mb-6 text-sm">Login untuk memposting, membalas, dan berinteraksi.</p>
          <div className="flex justify-center gap-3">
             <button onClick={() => navigate('/login')} className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-2.5 rounded-full font-bold transition-all">Login</button>
             <button onClick={() => navigate('/register')} className="bg-white hover:bg-slate-50 text-blue-500 border border-slate-200 px-8 py-2.5 rounded-full font-bold transition-all">Daftar</button>
          </div>
        </div>
      )}

      <QuoteModal 
          isOpen={!!quotePost} 
          post={quotePost} 
          onClose={() => setQuotePost(null)}
          onSuccess={() => { fetchPosts(); setQuotePost(null); }}
      />
    </Layout>
  );
};

export default Home;