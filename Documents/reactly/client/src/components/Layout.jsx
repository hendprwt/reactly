import React, { useState, useEffect, useLayoutEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { House, PaperPlaneTilt, Compass, Heart, User, Bell, SignOut, X, ChartBar } from 'phosphor-react';
import axios from 'axios';
import { io } from 'socket.io-client'; 
import ConnectionError from './ConnectionError';
import PullToRefresh from './PullToRefresh';
import TrendingList from './TrendingList';

// === COMPONENT: MINI TOAST NOTIFICATION ===
const NotificationToast = ({ data, onClose }) => {
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setTimeout(onClose, 4000);
    return () => clearTimeout(timer);
  }, [onClose]);

  let text = "berinteraksi dengan Anda";
  if (data.type === 'vote') text = "memberikan suara pada polling Anda";
  if (data.type === 'like') text = "menyukai postingan Anda";
  if (data.type === 'reply') text = "membalas postingan Anda";
  if (data.type === 'repost') text = "membagikan ulang postingan Anda";
  if (data.type === 'follow') text = "mulai mengikuti Anda";

  return (
    <div 
      onClick={() => { navigate('/notifications'); onClose(); }}
      className="fixed top-4 right-4 z-[9999] bg-white border border-slate-100 shadow-2xl rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top-5 fade-in duration-300 cursor-pointer max-w-[320px] md:max-w-sm"
    >
       <div className="relative flex-shrink-0">
          <img src={data.sender?.avatar || "https://i.pravatar.cc/150"} className="w-10 h-10 rounded-full object-cover border border-slate-50" alt="" />
          <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-white">
             {data.type === 'vote' ? <ChartBar size={10} weight="fill" className="text-white"/> : <Heart size={10} weight="fill" className="text-white"/>}
          </div>
       </div>
       <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-900 truncate">{data.sender?.username || "Seseorang"}</p>
          <p className="text-xs text-slate-500 line-clamp-1">{text}</p>
       </div>
       <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-300 hover:text-slate-500 transition-colors">
          <X size={18} weight="bold" />
       </button>
    </div>
  );
};

// === MAIN LAYOUT ===
const Layout = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // [BARU] Deteksi Halaman Explore
  const isExplorePage = location.pathname === '/explore';

  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [serverError, setServerError] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [socket, setSocket] = useState(null);
  const [newNotif, setNewNotif] = useState(null);

  useEffect(() => {
    if (user.id || user._id) {
      const newSocket = io("http://localhost:5000"); 
      setSocket(newSocket);
      newSocket.emit("addNewUser", user.id || user._id);
      return () => newSocket.disconnect();
    }
  }, [user.id, user._id]);

  useEffect(() => {
    if (!socket) return;
    const handleNotification = (data) => {
      setUnreadCount((prev) => prev + 1);
      setNewNotif(data);
      try { new Audio('/notification.mp3').play().catch(() => {}); } catch(e){}
    };
    socket.on("getNotification", handleNotification);
    return () => socket.off("getNotification", handleNotification);
  }, [socket]);

  useEffect(() => {
    if (user.username) {
      const fetchNotifications = async () => {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          const res = await axios.get('http://localhost:5000/api/notifications', {
             headers: { Authorization: `Bearer ${token}` }
          });
          setUnreadCount(res.data.filter(n => !n.read).length);
        } catch (err) { console.error(err); }
      };
      fetchNotifications();
    }
  }, [location.pathname, user.username]);

  useEffect(() => {
    const handleOnline = () => { setIsOffline(false); setServerError(false); };
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useLayoutEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.code === 'ERR_NETWORK' || (error.response && error.response.status >= 500)) {
          setServerError(true);
        }
        return Promise.reject(error);
      }
    );
    setIsReady(true);
    return () => { axios.interceptors.response.eject(interceptor); };
  }, []);

  const handleRetry = () => { setServerError(false); window.location.reload(); };
  const handleGlobalRefresh = () => new Promise((resolve) => setTimeout(() => { window.location.reload(); resolve(); }, 500));
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);
  const getMenuClass = (path) => isActive(path) ? "text-black font-bold text-xl" : "text-slate-500 font-medium text-xl group-hover:text-black transition-colors";

  let mainContent;
  if (!isReady) mainContent = null;
  else if (isOffline) mainContent = <ConnectionError type="offline" onRetry={() => window.location.reload()} />;
  else if (serverError) mainContent = <ConnectionError type="server" onRetry={handleRetry} />;
  else mainContent = <PullToRefresh onRefresh={handleGlobalRefresh}>{children}</PullToRefresh>;

  return (
    // [MODIFIKASI] Gunakan min-h-screen agar scroll dilakukan oleh Window (bukan div),
    // ini penting agar fitur 'Sticky Header' dan 'PullToRefresh' bekerja sempurna.
    <div className="min-h-screen w-full bg-[#FDFDFD] flex justify-center font-sans text-slate-900">
      
      {newNotif && <NotificationToast data={newNotif} onClose={() => setNewNotif(null)} />}

      {/* MOBILE TOP BAR */}
      {/* [MODIFIKASI] Sembunyikan Header jika di halaman Explore (karena Explore punya search bar sendiri) */}
      {!isExplorePage && (
        <nav className="md:hidden fixed top-0 w-full bg-white/90 backdrop-blur-md z-50 px-6 py-4 flex justify-between items-center border-b border-slate-50 h-16">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 cursor-pointer" onClick={() => navigate('/')}>Reactly</h1>
          <div className="relative" onClick={() => navigate('/notifications')}>
            <Bell size={26} />
            {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
          </div>
        </nav>
      )}

      {/* PC SIDEBAR */}
      {/* [MODIFIKASI] Tambahkan 'sticky top-0 h-screen' agar sidebar diam saat window di-scroll */}
      <aside className="hidden md:flex flex-col w-[275px] h-screen sticky top-0 px-6 py-8 border-r border-slate-100 bg-white flex-shrink-0 z-30">
        <h1 className="text-3xl font-black tracking-tighter mb-10 pl-4 text-slate-900 cursor-pointer" onClick={() => navigate('/')}>Reactly</h1>
        <nav className="space-y-1 flex-1 overflow-y-auto no-scrollbar">
          <button onClick={() => navigate('/')} className="flex items-center gap-4 px-4 py-3 rounded-full w-full text-left transition hover:bg-slate-50 group">
             <House size={28} weight={isActive('/') ? "fill" : "regular"} className={isActive('/') ? "text-black" : "text-slate-500 group-hover:text-black"} />
             <span className={getMenuClass('/')}>Feed</span>
          </button>
          
          <button onClick={() => navigate('/explore')} className="flex items-center gap-4 px-4 py-3 rounded-full w-full text-left transition hover:bg-slate-50 group">
             <Compass size={28} weight={isActive('/explore') ? "fill" : "regular"} className={isActive('/explore') ? "text-black" : "text-slate-500 group-hover:text-black"} />
             <span className={getMenuClass('/explore')}>Explore</span>
          </button>

          <button className="flex items-center gap-4 px-4 py-3 rounded-full w-full text-left transition hover:bg-slate-50 group">
             <PaperPlaneTilt size={28} className="text-slate-500 group-hover:text-black transition-colors" />
             <span className="text-slate-500 font-medium text-xl group-hover:text-black transition-colors">Messages</span>
          </button>

          <button onClick={() => navigate('/notifications')} className="flex items-center gap-4 px-4 py-3 rounded-full w-full text-left transition hover:bg-slate-50 group relative">
             <div className="relative">
               <Heart size={28} weight={isActive('/notifications') ? "fill" : "regular"} className={isActive('/notifications') ? "text-black" : "text-slate-500 group-hover:text-black"} />
               {unreadCount > 0 && <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white"></span>}
             </div>
             <span className={getMenuClass('/notifications')}>Notifications</span>
          </button>

          <button onClick={() => user.username ? navigate(`/profile/${user.username}`) : navigate('/login')} className="flex items-center gap-4 px-4 py-3 rounded-full w-full text-left transition hover:bg-slate-50 group">
             <User size={28} weight={isActive('/profile') ? "fill" : "regular"} className={isActive('/profile') ? "text-black" : "text-slate-500 group-hover:text-black"} />
             <span className={getMenuClass('/profile')}>Profile</span>
          </button>
        </nav>

        {user.username && (
            <div className="mt-auto pt-6 border-t border-slate-50">
               <div className="flex items-center justify-between p-3 rounded-full hover:bg-slate-50 transition cursor-pointer group">
                  <div className="flex items-center gap-3 flex-1 min-w-0" onClick={() => navigate(`/profile/${user.username}`)}>
                     <img src={user.avatar || "https://i.pravatar.cc/150?u=me"} className="w-10 h-10 rounded-full border border-slate-200 object-cover flex-shrink-0" alt="me" />
                     <div className="leading-tight truncate">
                        <p className="font-bold text-sm text-slate-900 truncate">{user.username}</p>
                        <p className="text-xs text-slate-400">@{user.username}</p>
                     </div>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full transition flex-shrink-0">
                     <SignOut size={20} weight="bold" />
                  </button>
               </div>
            </div>
        )}
      </aside>

      {/* --- MAIN CONTENT --- */}
      {/* [MODIFIKASI] Hapus 'h-screen overflow-y-auto'. Ganti ke 'min-h-screen'. */}
      {/* [MODIFIKASI] Atur padding top dinamis: 0 jika di Explore (karena header explore sticky), 16 jika di halaman lain (utk header mobile) */}
      <main className={`w-full md:w-[600px] min-h-screen border-r border-slate-100 bg-[#FDFDFD] ${isExplorePage ? 'pt-0' : 'pt-16'} md:pt-0 pb-24 md:pb-8 flex-shrink-0`}>
        {mainContent}
      </main>

      {/* PC RIGHT SIDEBAR */}
      {/* [MODIFIKASI] Tambahkan 'sticky top-0 h-screen' */}
      <aside className="hidden lg:block w-[380px] h-screen sticky top-0 p-8 bg-white overflow-y-auto no-scrollbar flex-shrink-0 z-10">
          <div className="relative group mb-8 cursor-pointer" onClick={() => navigate('/explore')}>
             <div className="w-full bg-slate-100 border-none rounded-full py-3 px-6 pl-12 text-sm font-medium text-slate-500 flex items-center transition-all hover:ring-2 hover:ring-slate-200">
                Search Reactly...
             </div>
             <div className="absolute left-4 top-3 text-slate-500"><Compass size={20} /></div>
          </div>

          <TrendingList />

          <div className="mt-8 text-[13px] text-slate-500 px-3">
             <div className="flex flex-wrap gap-x-4 gap-y-1">
                <span className="hover:underline cursor-pointer">Terms</span>
                <span className="hover:underline cursor-pointer">Privacy</span>
                <span className="hover:underline cursor-pointer">Cookies</span>
             </div>
             <p className="mt-4">© 2026 Reactly Inc.</p>
          </div>
      </aside>

      {/* MOBILE BOTTOM NAV */}
      {!isExplorePage && (
      <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-100 pb-safe px-8 py-4 flex justify-between items-center z-50">
          <button onClick={() => navigate('/')}><House size={28} weight={isActive('/') ? "fill" : "regular"} className={isActive('/') ? "text-black" : "text-slate-400"} /></button>
          <button onClick={() => navigate('/explore')}><Compass size={28} weight={isActive('/explore') ? "fill" : "regular"} className={isActive('/explore') ? "text-black" : "text-slate-400"} /></button>
          <button onClick={() => navigate('/notifications')} className="relative">
              <Heart size={28} weight={isActive('/notifications') ? "fill" : "regular"} className={isActive('/notifications') ? "text-red-500" : "text-slate-400"} />
              {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
          </button>
          <button onClick={() => user.username ? navigate(`/profile/${user.username}`) : navigate('/login')}>
             <User size={28} weight={isActive('/profile') ? "fill" : "regular"} className={isActive('/profile') ? "text-black" : "text-slate-400"} />
          </button>
      </nav>
      )}
      
      {/* Jika ingin Bottom Nav tetap muncul di Explore, hapus conditional wrapping !isExplorePage di atas. 
          Biasanya BottomNav tetap muncul. Jika mau tetap muncul, pakai kode di bawah ini saja: */}
      {isExplorePage && (
        <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-100 pb-safe px-8 py-4 flex justify-between items-center z-50">
            <button onClick={() => navigate('/')}><House size={28} weight={isActive('/') ? "fill" : "regular"} className={isActive('/') ? "text-black" : "text-slate-400"} /></button>
            <button onClick={() => navigate('/explore')}><Compass size={28} weight={isActive('/explore') ? "fill" : "regular"} className={isActive('/explore') ? "text-black" : "text-slate-400"} /></button>
            <button onClick={() => navigate('/notifications')} className="relative">
                <Heart size={28} weight={isActive('/notifications') ? "fill" : "regular"} className={isActive('/notifications') ? "text-red-500" : "text-slate-400"} />
                {unreadCount > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>}
            </button>
            <button onClick={() => user.username ? navigate(`/profile/${user.username}`) : navigate('/login')}>
              <User size={28} weight={isActive('/profile') ? "fill" : "regular"} className={isActive('/profile') ? "text-black" : "text-slate-400"} />
            </button>
        </nav>
      )}

    </div>
  );
};

export default Layout;