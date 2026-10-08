import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { 
  MagnifyingGlass, X, CircleWavyCheck, TrendUp, Clock, Users, House, CaretRight
} from 'phosphor-react';
import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import TrendingList from '../components/TrendingList';

// === COMPONENT: SKELETON LOADER ===
const SkeletonPost = () => (
  <div className="p-4 border-b border-slate-100 animate-pulse">
    <div className="flex gap-3">
      <div className="w-12 h-12 bg-slate-200 rounded-full flex-shrink-0"></div>
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
        <div className="h-4 bg-slate-200 rounded w-3/4"></div>
        <div className="h-20 bg-slate-200 rounded w-full mt-2"></div>
      </div>
    </div>
  </div>
);

const Explore = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const queryParam = searchParams.get('q') || '';
  const tabParam = searchParams.get('f') || 'all';

  const [inputValue, setInputValue] = useState(queryParam); 
  const [suggestions, setSuggestions] = useState({ users: [], keywords: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Infinite Scroll State
  const [results, setResults] = useState({ posts: [], users: [], hashtags: [] });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Header State
  const [showHeader, setShowHeader] = useState(true);
  const lastScrollY = useRef(0);
  const observer = useRef();

  // === 1. SMART HEADER LOGIC ===
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY < 0) return;
      
      // Jika sugesti sedang tampil, JANGAN hide header biar gak aneh
      if (showSuggestions) return;

      if (Math.abs(currentScrollY - lastScrollY.current) < 10) return;

      if (currentScrollY > lastScrollY.current && currentScrollY > 60) {
        setShowHeader(false); 
      } else if (currentScrollY < lastScrollY.current) {
        setShowHeader(true); 
      }
      lastScrollY.current = currentScrollY;
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showSuggestions]); // Dependency showSuggestions penting!

  // === 2. SUGGESTION LOGIC ===
  useEffect(() => {
    if (inputValue === queryParam) return;
    const timer = setTimeout(async () => {
      if (inputValue.trim().length > 0) {
        try {
          const res = await axios.get(`http://localhost:5000/api/search/suggestions?q=${inputValue}`);
          setSuggestions(res.data);
          setShowSuggestions(true);
        } catch (err) { console.error(err); }
      } else {
        setSuggestions({ users: [], keywords: [] });
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, queryParam]);

  // === 3. MAIN SEARCH LOGIC ===
  useEffect(() => {
    if (queryParam !== inputValue) setInputValue(queryParam);
    if (!queryParam.trim()) {
      setResults({ posts: [], users: [], hashtags: [] });
      setHasMore(false);
      return;
    }

    setResults({ posts: [], users: [], hashtags: [] });
    setPage(1);
    setHasMore(true);
    setLoading(true);

    fetchData(queryParam, tabParam, 1);
  }, [queryParam, tabParam]);

  // === 4. FETCH DATA (Pagination + Duplicate Fix) ===
  const fetchData = async (q, t, p) => {
    try {
      const res = await axios.get(`http://localhost:5000/api/search?q=${q}&tab=${t}&page=${p}&limit=10`);
      
      const newPosts = res.data.posts || [];
      const newUsers = res.data.users || [];
      const newHashtags = res.data.hashtags || [];

      setResults(prev => {
        const uniquePosts = newPosts.filter(np => !prev.posts.some(pp => pp._id === np._id));
        const uniqueUsers = newUsers.filter(nu => !prev.users.some(pu => pu._id === nu._id));

        return {
            users: p === 1 ? newUsers : [...prev.users, ...uniqueUsers],
            posts: p === 1 ? newPosts : [...prev.posts, ...uniquePosts],
            hashtags: newHashtags
        };
      });

      if (newPosts.length < 10) setHasMore(false);
      setLoading(false);
    } catch (err) { console.error(err); setLoading(false); } 
  };

  // === 5. INFINITE SCROLL OBSERVER ===
  const lastElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prev => {
          const nextPage = prev + 1;
          fetchData(queryParam, tabParam, nextPage);
          return nextPage;
        });
      }
    });
    if (node) observer.current.observe(node);
  }, [loading, hasMore, queryParam, tabParam]);

  // Handlers
  const handleInputChange = (e) => {
    setInputValue(e.target.value);
    if (!e.target.value) setShowSuggestions(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      setSearchParams({ q: inputValue, f: tabParam });
      setShowSuggestions(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleClickSuggestion = (val, type) => {
    if (type === 'user') navigate(`/profile/${val}`);
    else setSearchParams({ q: val, f: 'all' });
    setShowSuggestions(false);
  };

  const handleTabChange = (newTab) => {
    setSearchParams({ q: queryParam, f: newTab });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleClear = () => {
    setInputValue('');
    setSearchParams({});
    setResults({ posts: [], users: [], hashtags: [] });
    setShowSuggestions(false);
  };

  // Interaction Handler
  const handleInteraction = async (postId, type) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(`http://localhost:5000/api/posts/${postId}/${type}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setResults(prev => ({
        ...prev,
        posts: prev.posts.map(p => p._id === postId ? { ...p, [type + 's']: res.data[type + 's'] } : p)
      }));
    } catch (err) { console.error(err); }
  };

  return (
    <Layout>
      <div className="flex flex-col min-h-full bg-white relative">
        
        {/* === HEADER (STICKY) === */}
        <div className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100 shadow-sm">
          
          {/* SEARCH BAR CONTAINER */}
          {/* [FIX SUGESTI ILANG] Gunakan 'overflow-visible' saat sugesti muncul agar dropdown gak kepotong */}
          <div className={`transition-all duration-300 ease-in-out ${
              showHeader ? 'mt-0' : '-mt-[68px] opacity-0 pointer-events-none'
            } ${showSuggestions ? 'overflow-visible' : 'overflow-hidden'}`
          }>
            <div className="px-4 py-3 h-[68px] relative"> 
              <div className="relative group">
                <MagnifyingGlass size={20} className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${inputValue ? 'text-blue-500' : 'text-slate-400'}`} />
                <input
                  type="text"
                  placeholder="Cari..."
                  className="w-full bg-slate-100 border-none focus:ring-1 focus:ring-blue-500 rounded-full py-2.5 pl-12 pr-10 text-[15px] outline-none transition-all placeholder-slate-500"
                  value={inputValue}
                  onChange={handleInputChange}
                  onFocus={() => inputValue && setShowSuggestions(true)}
                  onKeyDown={handleKeyDown}
                  autoComplete="off"
                />
                {inputValue && (
                  <button onClick={handleClear} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 bg-slate-200 hover:bg-slate-300 rounded-full text-slate-500">
                    <X size={14} weight="bold" />
                  </button>
                )}
              </div>

              {/* DROPDOWN SUGGESTIONS */}
              {showSuggestions && inputValue && (
                <div className="absolute top-full left-0 w-full bg-white shadow-2xl rounded-b-xl border border-slate-100 overflow-hidden py-2 animate-in fade-in zoom-in-95 duration-100 z-[100]">
                   <div onClick={() => handleClickSuggestion(inputValue, 'keyword')} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3 border-b border-slate-50">
                      <div className="p-2 bg-slate-100 rounded-full text-slate-500"><MagnifyingGlass size={18} /></div>
                      <div className="text-[15px] font-medium text-slate-800">Cari "{inputValue}"</div>
                   </div>
                   {suggestions.users.map(u => (
                     <div key={u._id} onClick={() => handleClickSuggestion(u.username, 'user')} className="px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                        <img src={u.avatar || "https://i.pravatar.cc/150"} className="w-10 h-10 rounded-full object-cover border border-slate-100" />
                        <div className="flex-1 min-w-0">
                           <div className="flex items-center gap-1">
                              <span className="font-bold text-slate-900 truncate text-[15px]">{u.fullName}</span>
                              {u.isVerified && <CircleWavyCheck size={14} weight="fill" className="text-blue-500" />}
                           </div>
                           <div className="text-slate-500 text-sm truncate">@{u.username}</div>
                        </div>
                     </div>
                   ))}
                </div>
              )}
            </div>
          </div>

          {/* TABS */}
          {queryParam && (
            <div className="flex px-2 overflow-x-auto no-scrollbar pt-1 bg-white/95 backdrop-blur-md relative z-40">
              {[
                { id: 'all', l: 'Top', i: <House size={18}/> },
                { id: 'populer', l: 'Populer', i: <TrendUp size={18}/> },
                { id: 'terbaru', l: 'Terbaru', i: <Clock size={18}/> },
                { id: 'users', l: 'Orang', i: <Users size={18}/> },
              ].map((t) => (
                <button key={t.id} onClick={() => handleTabChange(t.id)} 
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm font-bold border-b-[3px] transition-colors ${tabParam === t.id ? 'border-blue-500 text-blue-500' : 'border-transparent text-slate-500 hover:bg-slate-50'}`}>
                  {tabParam === t.id && t.i}
                  {t.l}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* CONTENT */}
        <div className="flex-1 min-h-screen pb-20" onClick={() => setShowSuggestions(false)}>
          {loading && page === 1 ? (
             <div className="pt-10"><SkeletonPost /><SkeletonPost /></div>
          ) : !queryParam ? (
             <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="p-4 px-5 flex items-center justify-between border-b border-slate-100">
                   <h2 className="text-xl font-black text-slate-900">Tren untuk Anda</h2>
                </div>
                <TrendingList isMobile={true} />
             </div>
          ) : (
            <div className="divide-y divide-slate-100">
               {/* USERS RESULT */}
               {(tabParam === 'all' || tabParam === 'users') && results.users.length > 0 && (
                 <div className="bg-white border-b-8 border-slate-50">
                   <div className="px-4 py-3 font-bold text-lg text-slate-800">Orang</div>
                   {results.users.map(u => (
                     <UserItem key={u._id} user={u} navigate={navigate} />
                   ))}
                   {tabParam === 'all' && results.users.length >= 3 && (
                     <div onClick={() => handleTabChange('users')} className="p-3 text-blue-500 text-sm font-bold text-center cursor-pointer hover:bg-slate-50 transition">
                        Lihat semua orang
                     </div>
                   )}
                 </div>
               )}

               {/* POSTS RESULT (Infinite Scroll) */}
               {tabParam !== 'users' && results.posts.map((post, index) => {
                  const isLastElement = results.posts.length === index + 1;
                  return (
                   <div key={`${post._id}-${index}`} ref={isLastElement ? lastElementRef : null}>
                     <PostCard 
                       post={{
                         ...post,
                         _id: post._id, 
                         author: post.userId?.fullName || post.userId?.username,
                         handle: post.userId?.username ? `@${post.userId.username}` : "",
                         avatar: post.userId?.avatar,
                         isVerified: post.userId?.isVerified,
                         quoteOf: post.quoteOf,
                         quoteCommentOf: post.quoteCommentOf
                       }}
                       onLike={() => handleInteraction(post._id, 'like')}
                       onRepost={() => handleInteraction(post._id, 'repost')}
                       onBookmark={() => handleInteraction(post._id, 'bookmark')}
                       onQuote={(p) => navigate(`/?quote=${p._id}`)} 
                     />
                   </div>
                  );
               })}

               {/* LOAD MORE / EMPTY */}
               {loading && page > 1 && <SkeletonPost />}
               {!loading && results.posts.length === 0 && results.users.length === 0 && (
                  <div className="py-20 text-center px-10">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 bg-slate-100">
                      <MagnifyingGlass size={32} className="text-slate-400" />
                    </div>
                    <p className="text-slate-900 font-bold text-lg">Tidak ditemukan</p>
                  </div>
               )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
};

// === SUB-COMPONENT: USER ITEM (Fixed Follow Button) ===
const UserItem = ({ user, navigate }) => {
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const myId = currentUser.id || currentUser._id;
  
  // [FIX BUTTON] Gunakan safe navigation (?.) agar tidak crash kalau followers undefined
  const [isFollowing, setIsFollowing] = useState(
    user.followers?.includes(myId) || false
  );
  
  const [loading, setLoading] = useState(false);
  const isMe = myId === user._id;

  const handleFollow = async (e) => {
    e.stopPropagation();
    if (!myId) return navigate('/login');
    if (loading) return;

    setLoading(true);
    const token = localStorage.getItem('token');
    
    try {
      if (isFollowing) {
        await axios.put(`http://localhost:5000/api/users/${user.username}/unfollow`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFollowing(false);
      } else {
        await axios.put(`http://localhost:5000/api/users/${user.username}/follow`, {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setIsFollowing(true);
      }
    } catch (err) {
      console.error("Gagal follow:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div onClick={() => navigate(`/profile/${user.username}`)} className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors">
      <img src={user.avatar || "https://i.pravatar.cc/150"} className="w-10 h-10 rounded-full object-cover border border-slate-100" alt="" />
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
           <span className="font-bold text-slate-900 truncate text-[15px]">{user.fullName}</span>
           {user.isVerified && <CircleWavyCheck size={14} weight="fill" className="text-blue-500" />}
        </div>
        <p className="text-slate-500 text-sm truncate">@{user.username}</p>
      </div>
      
      {/* Tombol Follow (Hanya muncul jika bukan diri sendiri) */}
      {!isMe && (
        <button 
          onClick={handleFollow}
          disabled={loading}
          className={`px-5 py-1.5 rounded-full text-xs font-bold transition-all border ${
            isFollowing 
              ? "bg-white border-slate-300 text-slate-700 hover:bg-red-50 hover:text-red-600 hover:border-red-200" 
              : "bg-black border-transparent text-white hover:opacity-90"
          }`}
        >
          {isFollowing ? "Mengikuti" : "Ikuti"}
        </button>
      )}
    </div>
  );
};

export default Explore;