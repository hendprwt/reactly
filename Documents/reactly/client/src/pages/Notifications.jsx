import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import Layout from '../components/Layout';
import ConfirmModal from '../components/ConfirmModal'; 
import { 
  Heart, ArrowsClockwise, ChatCircle, User, Quotes, 
  CircleWavyCheck, CircleNotch, Trash, CaretDown, CheckCircle, X,
  ChartBar // [BARU] Import icon ChartBar untuk Vote
} from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNowStrict } from 'date-fns';

// === 1. COMPONENT: TOAST NOTIFICATION ===
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
       onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 px-6 py-3 rounded-full shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-5 fade-in duration-300 ${type === 'error' ? 'bg-red-500 text-white' : 'bg-slate-900 text-white'}`}>
       {type === 'success' ? <CheckCircle size={20} weight="fill" className="text-green-400"/> : <X size={20} weight="bold"/>}
       <span className="font-medium text-sm">{message}</span>
    </div>
  );
};

// === 2. HELPER: GROUPING LOGIC (UPDATED) ===
const groupNotifications = (notifs) => {
  const groups = {};

  notifs.forEach((n) => {
    if (!n.sender) return; 
    let key;
    if (n.type === 'follow') key = 'follow_group';
    else {
        const targetId = n.postId?._id || n.commentId?._id;
        if (!targetId) return; 
        key = `${n.type}_${targetId}`;
    }

    if (!groups[key]) {
      // [UPDATE] Cek apakah backend sudah mengirim grouping (array senders)
      // Jika n.senders ada isinya (kasus vote), gunakan panjangnya sebagai count awal
      const initialCount = (n.senders && n.senders.length > 0) ? n.senders.length : 1;

      groups[key] = {
        ...n,
        ids: [n._id],
        senders: [n.sender], // Sender utama (terbaru)
        count: initialCount,
        latestAt: n.createdAt,
        isGroup: (initialCount > 1)
      };
    } else {
      // Logic merging client-side (untuk notif tipe lain yg belum di-group backend)
      groups[key].ids.push(n._id);
      
      const isSenderExist = groups[key].senders.find(s => s._id === n.sender._id);
      if (!isSenderExist) {
        groups[key].senders.push(n.sender);
        groups[key].count += 1;
      }
      
      groups[key].isGroup = true;
      if (new Date(n.createdAt) > new Date(groups[key].latestAt)) groups[key].latestAt = n.createdAt;
      if (!n.read) groups[key].read = false;
    }
  });

  return Object.values(groups).sort((a, b) => new Date(b.latestAt) - new Date(a.latestAt));
};

// === 3. COMPONENT: SWIPEABLE ITEM (UPDATED) ===
const SwipeableNotificationItem = ({ group, onDelete }) => {
  const navigate = useNavigate();
  const [offset, setOffset] = useState(0);
  const startX = useRef(0);
  const isSwiping = useRef(false);

  const handleTouchStart = (e) => {
    startX.current = e.touches[0].clientX;
    isSwiping.current = true;
  };

  const handleTouchMove = (e) => {
    if (!isSwiping.current) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    if (diff < 0 && diff > -120) {
       setOffset(diff);
    }
  };

  const handleTouchEnd = () => {
    isSwiping.current = false;
    if (offset < -60) setOffset(-80);
    else setOffset(0);
  };

  const { type, senders, count, postId, commentId, read, latestAt } = group;
  const firstSender = senders[0];
  const secondSender = senders[1];

  let Icon = Heart;
  let iconColor = "text-pink-600";
  let actionText = "liked your post";

  if (type === 'repost') { Icon = ArrowsClockwise; iconColor = "text-green-600"; actionText = "reposted"; }
  if (type === 'reply') { Icon = ChatCircle; iconColor = "text-sky-500"; actionText = "replied"; }
  if (type === 'quote') { Icon = Quotes; iconColor = "text-sky-500"; actionText = "quoted"; }
  if (type === 'follow') { Icon = User; iconColor = "text-violet-600"; actionText = "followed you"; }
  
  // [BARU] Konfigurasi untuk tipe Vote
  if (type === 'vote') { Icon = ChartBar; iconColor = "text-purple-500"; actionText = "voted on your poll"; }

  const renderName = (s) => (
    <span className="font-bold text-slate-900 hover:underline cursor-pointer" onClick={(e) => { e.stopPropagation(); navigate(`/profile/${s.username}`); }}>
      {s.fullName || s.username} 
      {s.isVerified && <CircleWavyCheck size={14} weight="fill" className="text-blue-500 inline -mt-0.5 ml-0.5" />}
    </span>
  );

  const generateText = () => {
    if (count === 1) return renderName(firstSender);
    if (count === 2 && secondSender) return <span>{renderName(firstSender)}<span className="font-normal text-slate-500"> and </span>{renderName(secondSender)}</span>;
    // Jika count > 1 tapi secondSender tidak ada (karena backend grouping vote hanya populate sender terakhir), pakai logika "others"
    return <span>{renderName(firstSender)}<span className="font-normal text-slate-500"> and </span><span className="font-bold text-slate-900">{count - 1} others</span></span>;
  };

  const handleClick = () => {
    if (offset < 0) { setOffset(0); return; }
    if (type === 'follow') return navigate(`/profile/${firstSender.username}`);
    if (type === 'reply' && commentId) return navigate(`/comment/${commentId._id}`);
    if (type === 'quote' && postId) return navigate(`/post/${postId._id}`);
    if (postId) return navigate(`/post/${postId._id}`);
  };

  return (
    <div className="relative overflow-hidden border-b border-slate-50">
       <div className="absolute inset-y-0 right-0 w-full bg-red-500 flex items-center justify-end px-6">
          <Trash size={24} weight="bold" className="text-white" />
       </div>

       <div 
         className={`relative bg-white p-4 flex gap-3 items-start transition-transform duration-200 ease-out cursor-pointer ${!read ? 'bg-blue-50/40' : ''}`}
         style={{ transform: `translateX(${offset}px)` }}
         onTouchStart={handleTouchStart}
         onTouchMove={handleTouchMove}
         onTouchEnd={handleTouchEnd}
         onClick={handleClick}
       >
          <div className="mt-1 flex-shrink-0"><Icon size={26} weight="fill" className={iconColor} /></div>
          <div className="flex-1 min-w-0 pointer-events-none">
             <div className="flex mb-1.5 pl-1 relative h-8 pointer-events-auto">
                {senders.slice(0, 5).map((s, idx) => (
                   <img key={s._id} src={s.avatar || "https://i.pravatar.cc/150"} className={`w-8 h-8 rounded-full object-cover border-2 border-white absolute transition hover:scale-110 hover:z-20`} style={{ left: `${idx * 20}px`, zIndex: 10 - idx }} alt=""/>
                ))}
             </div>
             <div className="text-[14px] leading-snug pointer-events-auto">
                {generateText()} <span className="text-slate-500 ml-0.5">{actionText}</span>
                <span className="text-slate-400 text-xs ml-2 whitespace-nowrap">{formatDistanceToNowStrict(new Date(latestAt))}</span>
             </div>
             {(postId || commentId) && type !== 'follow' && (
                <div className="mt-1.5 text-slate-500 text-sm line-clamp-1 border-l-2 border-slate-200 pl-2 italic">
                   {type === 'reply' ? `"${commentId?.content || 'Image'}"` : (postId?.content || "Poll Content")}
                </div>
             )}
          </div>
          
          {offset <= -60 && (
             <div 
               className="absolute inset-y-0 right-0 w-20 cursor-pointer z-10" 
               onClick={(e) => { e.stopPropagation(); onDelete(group.ids); }}
             ></div>
          )}
       </div>
    </div>
  );
};

// === 4. MAIN PAGE ===
const Notifications = () => {
  const [allGroups, setAllGroups] = useState([]);
  const [filteredGroups, setFilteredGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); 
  const [visibleCount, setVisibleCount] = useState(12);
  const [toast, setToast] = useState(null);
  const [showClearModal, setShowClearModal] = useState(false);

  useEffect(() => {
    fetchNotifs();
  }, []);

  useEffect(() => {
    if (activeTab === 'priority') {
      const priority = allGroups.filter(g => {
        const isDirect = g.type === 'reply' || g.type === 'quote';
        const isVerified = g.senders.some(s => s.isVerified);
        const isBig = g.senders.some(s => s.followers && s.followers.length >= 10);
        return isDirect || isVerified || isBig;
      });
      setFilteredGroups(priority);
    } else {
      setFilteredGroups(allGroups);
    }
    setVisibleCount(12);
  }, [activeTab, allGroups]);

  const showToast = (msg, type = 'success') => {
    setToast({ message: msg, type });
  };

  const fetchNotifs = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('http://localhost:5000/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      setAllGroups(groupNotifications(res.data));
      await axios.put('http://localhost:5000/api/notifications/read', {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const requestClearAll = () => {
    setShowClearModal(true);
  };

  const confirmClearAll = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete('http://localhost:5000/api/notifications', { headers: { Authorization: `Bearer ${token}` } });
      setAllGroups([]);
      setShowClearModal(false); 
      showToast("All notifications cleared");
    } catch(err) { 
        setShowClearModal(false);
        showToast("Failed to clear", 'error'); 
    }
  };

  const handleDeleteItem = async (ids) => {
    try {
        const token = localStorage.getItem('token');
        await axios.post('http://localhost:5000/api/notifications/delete', { ids }, { 
            headers: { Authorization: `Bearer ${token}` } 
        });

        setAllGroups(prev => prev.filter(g => {
            return g.ids[0] !== ids[0]; 
        }));
        showToast("Notification deleted");
    } catch (err) {
        console.error(err);
        showToast("Failed to delete", "error");
    }
  };

  return (
    <Layout>
       <div className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-100 z-30">
         <div className="flex justify-between items-center px-4 py-3">
            <h2 className="text-xl font-black text-slate-900">Notifications</h2>
            {allGroups.length > 0 && (
              <button 
                onClick={requestClearAll} 
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition"
              >
                <Trash size={20} weight="bold"/>
              </button>
            )}
         </div>
         <div className="flex px-4 pb-0 space-x-6">
            {['all', 'priority'].map(tab => (
               <button key={tab} onClick={() => setActiveTab(tab)} className={`pb-3 text-[15px] font-bold capitalize relative ${activeTab === tab ? 'text-black' : 'text-slate-400'}`}>
                 {tab}
                 {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-[3px] bg-sky-500 rounded-t-full"></div>}
               </button>
            ))}
         </div>
       </div>
       
       {loading ? (
          <div className="p-10 flex justify-center"><CircleNotch size={32} className="animate-spin text-sky-500" /></div>
       ) : filteredGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
             <Heart size={40} weight="duotone" className="text-slate-200 mb-4" />
             <p className="font-bold text-slate-900">No notifications</p>
          </div>
       ) : (
          <div className="pb-20">
             {filteredGroups.slice(0, visibleCount).map(group => (
                <SwipeableNotificationItem 
                   key={`${group.type}-${group.ids[0]}`}
                   group={group} 
                   onDelete={handleDeleteItem}
                />
             ))}

             {visibleCount < filteredGroups.length && (
               <div className="py-6 text-center border-t border-slate-50">
                 <button onClick={() => setVisibleCount(prev => prev + 12)} className="text-sky-500 font-bold text-sm hover:underline flex items-center justify-center gap-1 mx-auto">
                   Show older notifications <CaretDown weight="bold"/>
                 </button>
               </div>
             )}
          </div>
       )}

       {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

       <ConfirmModal 
         isOpen={showClearModal}
         onClose={() => setShowClearModal(false)}
         onConfirm={confirmClearAll}
         title="Clear all notifications?"
         message="This can't be undone and will remove all notifications from your list."
         confirmText="Clear All"
         cancelText="Cancel"
         isDanger={true}
       />
    </Layout>
  );
};

export default Notifications;