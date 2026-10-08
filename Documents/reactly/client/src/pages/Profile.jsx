import React, { useState } from 'react';
import { createPortal } from 'react-dom'; 
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, CircleWavyCheck, Plus, PenNib, Heart, 
  ChatCircle, SquaresFour // Ikon untuk indikator multi-image
} from 'phosphor-react';

import Layout from '../components/Layout';
import PostCard from '../components/PostCard';
import CreatePost from '../components/CreatePost'; 
import EditProfileModal from '../components/EditProfileModal';
import ConfirmModal from '../components/ConfirmModal'; 
import { useProfileLogic } from '../hooks/useProfileLogic'; 
import { ProfileHeader } from '../components/ProfileHeader'; 

// === HELPER COMPONENT: MEDIA GRID ITEM ===
const MediaGridItem = ({ post }) => {
  // Ambil gambar pertama (baik dari array images atau legacy string image)
  const image = (post.images && post.images.length > 0) ? post.images[0] : post.image;
  const count = post.images ? post.images.length : (post.image ? 1 : 0);

  // Helper URL
  const getUrl = (img) => (img.startsWith('http') || img.startsWith('//') ? img : `http://localhost:5000/uploads/${img}`);

  if (!image) return null;

  return (
    <div className="relative aspect-square group cursor-pointer bg-slate-100 border border-white">
       <img 
         src={getUrl(image)} 
         className="w-full h-full object-cover" 
         alt="" 
       />
       
       {/* Overlay Hover (Darken + Stats) */}
       <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-4 text-white font-bold backdrop-blur-[1px]">
          <div className="flex items-center gap-1"><Heart weight="fill" size={18}/> {post.likes?.length || 0}</div>
          <div className="flex items-center gap-1"><ChatCircle weight="fill" size={18}/> {post.comments || 0}</div>
       </div>

       {/* Multi Image Indicator (Pojok Kanan Atas) */}
       {count > 1 && (
         <div className="absolute top-2 right-2 text-white drop-shadow-md">
            <SquaresFour size={20} weight="fill" />
         </div>
       )}
    </div>
  );
};

// === MAIN COMPONENT ===
const Profile = () => {
  const { username } = useParams();
  const navigate = useNavigate();
  
  // 1. Logic Hooks
  const { 
    profile, feedData, loading, feedLoading, isMe, 
    isFollowing, isFollower, followLoading, 
    activeTab, setActiveTab, 
    handleLike, handleRepost, handleBookmark, handleFollowAction, 
    handlePin, handleDelete, fetchData,
    
    // State & Handler untuk Konflik Pin (Maks 2)
    pinConflict, confirmPinReplace, cancelPinReplace
  } = useProfileLogic(username);

  // 2. Local UI State
  const [showPostModal, setShowPostModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null); // Kontrol Dropdown agar tidak tumpang tindih
  
  // State Delete Confirmation
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // 3. Handlers
  const onRequestDelete = (postId) => setDeleteTargetId(postId);
  
  const onConfirmDelete = () => {
    if (deleteTargetId) {
      handleDelete(deleteTargetId);
      setDeleteTargetId(null);
    }
  };

  // 4. Loading Check
  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
      </div>
    </Layout>
  );

  if (!profile) return <Layout><div className="p-8 text-center mt-10">User not found</div></Layout>;

  return (
    <Layout>
      <div className="relative min-h-screen">
        
        {/* === A. STICKY HEADER === */}
        <div 
          className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-4 flex items-center gap-6 border-b border-slate-100 transition-all cursor-pointer h-[60px]" 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
           <button onClick={(e) => { e.stopPropagation(); navigate(-1); }} className="p-2 hover:bg-slate-100 rounded-full transition">
             <ArrowLeft size={20} weight="bold" />
           </button>
           <div className="flex flex-col justify-center">
              <h2 className="font-black text-xl leading-none flex items-center gap-1">
                {profile.username}
                {profile.isVerified && <CircleWavyCheck size={18} weight="fill" className="text-blue-500" />}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">{feedData ? feedData.length : 0} posts</p>
           </div>
        </div>

        {/* === B. COVER IMAGE === */}
        <div className="h-32 sm:h-48 bg-slate-200 w-full relative">
           {profile.coverImage ? (
             <img src={profile.coverImage} alt="Cover" className="w-full h-full object-cover" />
           ) : (
             <div className="w-full h-full bg-gradient-to-r from-sky-400 to-indigo-500 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/10"></div>
             </div>
           )}
        </div>

        {/* === C. PROFILE INFO === */}
        <ProfileHeader 
          profile={profile}
          isMe={isMe}
          isFollowing={isFollowing}
          isFollower={isFollower}
          followLoading={followLoading}
          onFollow={handleFollowAction}
          onEdit={() => setShowEditModal(true)}
        />

        {/* === D. STICKY TABS === */}
        <div className="sticky top-[60px] bg-white/95 backdrop-blur-sm z-20 border-b border-slate-100">
           <div className="flex overflow-x-auto no-scrollbar"> 
              {['Posts', 'Replies', 'Highlights', 'Media', 'Likes'].map((tab) => (
                <div 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 min-w-[80px] text-center py-3.5 text-sm font-medium cursor-pointer hover:bg-slate-50 transition relative whitespace-nowrap px-4 ${activeTab === tab ? "text-slate-900 font-bold" : "text-slate-500"}`}
                >
                  {tab} 
                  {activeTab === tab && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-blue-500 rounded-full"></div>}
                </div>
              ))}
           </div>
        </div>

        {/* === E. FEED CONTENT === */}
        <div className="pb-24 min-h-[300px]">
           {feedLoading ? (
             <div className="py-10 flex justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300"></div></div>
           ) : feedData && feedData.length > 0 ? (
             
             // LOGIKA TAMPILAN: GRID vs LIST
             activeTab === 'Media' ? (
                // --- VIEW 1: MEDIA GRID ---
                <div className="grid grid-cols-3 gap-0.5">
                   {feedData.map(post => (
                     <div key={post._id} onClick={() => navigate(`/post/${post._id}`)}>
                        <MediaGridItem post={post} />
                     </div>
                   ))}
                </div>
             ) : (
                // --- VIEW 2: STANDARD LIST ---
                feedData.map(item => (
                  <PostCard 
                    key={item._id} 
                    post={item} 
                    onLike={handleLike} 
                    onRepost={handleRepost} 
                    onBookmark={handleBookmark}
                    onPin={handlePin}
                    onDelete={onRequestDelete} 
                    
                    // Props Kontrol Menu & Label
                    activeMenuId={activeMenuId}
                    setActiveMenuId={setActiveMenuId}
                    showPinLabel={true} // Tampilkan label Pinned di sini
                  />
                ))
             )

           ) : (
             // --- EMPTY STATE ---
             <div className="py-16 flex flex-col items-center justify-center text-slate-400">
                <div className="bg-slate-50 p-4 rounded-full mb-3">
                   {activeTab === 'Likes' ? <Heart size={32} weight="duotone"/> : <PenNib size={32} weight="duotone"/>}
                </div>
                <p className="font-bold text-lg text-slate-900">
                  {activeTab === 'Likes' ? "No liked posts yet" : 
                   activeTab === 'Media' ? "No media posts yet" : 
                   "No posts yet"}
                </p>
             </div>
           )}
        </div>
      </div>

      {/* === F. PORTALS & MODALS === */}
      
      {/* 1. FAB (Floating Button) */}
      {createPortal(
        <div className="fixed inset-0 z-[100] flex justify-center pointer-events-none">
          <div className="w-full md:w-[600px] relative h-full">
            <button 
              onClick={() => setShowPostModal(true)} 
              className="absolute bottom-20 right-4 sm:bottom-10 sm:right-6 bg-blue-500 hover:bg-blue-600 text-white p-3.5 md:p-4 rounded-full shadow-[0_8px_30px_rgb(59,130,246,0.4)] pointer-events-auto flex items-center justify-center transform hover:scale-110 active:scale-95 transition-all duration-200"
            >
              <Plus size={24} weight="bold" />
            </button>
          </div>
        </div>,
        document.body
      )}
      
      {/* 2. Create Post Modal */}
      {showPostModal && createPortal(
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 p-4 animate-in fade-in duration-200" onClick={() => setShowPostModal(false)}>
            <div className="bg-white w-full max-w-lg rounded-2xl p-1 shadow-2xl" onClick={e => e.stopPropagation()}>
                <CreatePost refresh={fetchData} isLoggedIn={true} onClose={() => setShowPostModal(false)} />
            </div>
          </div>,
          document.body
      )}

      {/* 3. Edit Profile Modal */}
      {isMe && showEditModal && (
        <EditProfileModal 
          user={profile} 
          onClose={() => setShowEditModal(false)} 
          onUpdateSuccess={fetchData} 
        />
      )}

      {/* 4. Delete Confirm Modal */}
      <ConfirmModal 
        isOpen={!!deleteTargetId}
        onClose={() => setDeleteTargetId(null)}
        onConfirm={onConfirmDelete}
        title="Delete post?"
        message="This can’t be undone and it will be removed from your profile, the timeline of any accounts that follow you, and from search results."
        confirmText="Delete"
        isDanger={true}
      />

      {/* 5. Replace Pin Confirm Modal */}
      <ConfirmModal 
        isOpen={!!pinConflict}
        onClose={cancelPinReplace}
        onConfirm={confirmPinReplace}
        title="Replace pinned post?"
        message="You can only pin 2 posts. Doing this will replace your oldest pinned post."
        confirmText="Replace"
        cancelText="Cancel"
        isDanger={false}
      />

    </Layout>
  );
};

export default Profile;