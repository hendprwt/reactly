import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, CircleWavyCheck } from 'phosphor-react';
import { useNavigate } from 'react-router-dom';
import PostCard from './PostCard'; // Reuse PostCard untuk Quotes

const ActivityModal = ({ isOpen, onClose, postId, initialTab = 'likes' }) => {
  const [activeTab, setActiveTab] = useState(initialTab); // 'reposts' | 'quotes' | 'likes'
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      fetchData(initialTab);
    }
  }, [isOpen, initialTab]);

  const fetchData = async (type) => {
    setLoading(true);
    setData([]);
    try {
      const res = await axios.get(`http://localhost:5000/api/posts/${postId}/activity?type=${type}`);
      setData(res.data);
    } catch (err) { console.error(err); } 
    finally { setLoading(false); }
  };

  const handleTabChange = (type) => {
    setActiveTab(type);
    fetchData(type);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="bg-white rounded-2xl w-full max-w-md h-[600px] flex flex-col z-10 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100">
          <h2 className="font-bold text-lg">Post Activity</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full"><X size={20}/></button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100">
           {['reposts', 'quotes', 'likes'].map((tab) => (
             <button 
                key={tab}
                onClick={() => handleTabChange(tab)}
                className={`flex-1 py-3 text-sm font-bold capitalize transition relative ${activeTab === tab ? 'text-black' : 'text-slate-500 hover:bg-slate-50'}`}
             >
                {tab}
                {activeTab === tab && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 rounded-t-full"></div>}
             </button>
           ))}
        </div>

        {/* Content List */}
        <div className="flex-1 overflow-y-auto">
           {loading && <div className="p-8 text-center text-slate-400">Loading...</div>}
           
           {!loading && data.length === 0 && (
              <div className="p-10 text-center text-slate-500 text-sm">No {activeTab} yet.</div>
           )}

           {!loading && activeTab === 'quotes' && (
              // Render List Postingan untuk Quotes
              <div>
                 {data.map(post => (
                    <div key={post._id} className="border-b border-slate-100">
                       <PostCard post={post} /> 
                    </div>
                 ))}
              </div>
           )}

           {!loading && (activeTab === 'likes' || activeTab === 'reposts') && (
              // Render List User untuk Likes/Reposts
              <div>
                 {data.map(user => (
                    <div 
                      key={user._id} 
                      onClick={() => { onClose(); navigate(`/profile/${user.username}`); }}
                      className="flex items-center gap-3 p-4 hover:bg-slate-50 cursor-pointer transition border-b border-slate-50"
                    >
                       <img src={user.avatar || "https://i.pravatar.cc/150"} className="w-10 h-10 rounded-full object-cover" alt=""/>
                       <div className="flex-1">
                          <div className="font-bold text-slate-900 text-sm flex items-center gap-1">
                             {user.fullName}
                             {user.isVerified && <CircleWavyCheck size={14} weight="fill" className="text-blue-500"/>}
                          </div>
                          <div className="text-slate-500 text-sm">@{user.username}</div>
                          {user.bio && <div className="text-slate-600 text-xs mt-1 line-clamp-1">{user.bio}</div>}
                       </div>
                       {/* Tombol Follow Dummy */}
                       <button className="bg-black text-white text-xs font-bold px-4 py-1.5 rounded-full">Follow</button>
                    </div>
                 ))}
              </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default ActivityModal;