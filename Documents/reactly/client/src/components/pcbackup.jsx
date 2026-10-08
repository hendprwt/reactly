import React, { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom'; 
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import { 
  DotsThree, Heart, ChatCircle, ArrowsClockwise, 
  ShareNetwork, BookmarkSimple, CircleWavyCheck, PenNib, Repeat, 
  PushPin, Trash, X, CaretLeft, CaretRight, Sparkle, User
} from 'phosphor-react';
import { formatDistanceToNowStrict, format, isValid } from 'date-fns';

// ==========================================
// 1. HELPER FUNCTIONS
// ==========================================

const getUrl = (img) => {
    if (!img) return null;
    if (img.startsWith('http') || img.startsWith('//') || img.startsWith('blob:')) return img;
    return `http://localhost:5000/uploads/${img}`;
};

const formatShortTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (!isValid(date)) return '';
  
  return formatDistanceToNowStrict(date)
    .replace(' seconds', 's').replace(' second', 's')
    .replace(' minutes', 'm').replace(' minute', 'm')
    .replace(' hours', 'h').replace(' hour', 'h')
    .replace(' days', 'd').replace(' day', 'd');
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

// ==========================================
// 2. COMPONENT: LIGHTBOX MODAL
// ==========================================
const LightboxModal = ({ images, initialIndex, onClose }) => {
    const [currentIndex, setCurrentIndex] = useState(initialIndex);
    const hasNext = currentIndex < images.length - 1;
    const hasPrev = currentIndex > 0;
  
    const handleKeyDown = useCallback((e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && hasNext) setCurrentIndex(prev => prev + 1);
      if (e.key === 'ArrowLeft' && hasPrev) setCurrentIndex(prev => prev - 1);
    }, [onClose, hasNext, hasPrev]);
  
    useEffect(() => {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = 'unset';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [handleKeyDown]);
  
    if (!images || images.length === 0) return null;
  
    return createPortal(
      <div className="fixed inset-0 z-[9999] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200" onClick={onClose}>
         <button onClick={onClose} className="absolute top-4 left-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition z-20"><X size={24} weight="bold"/></button>
         
         {hasPrev && <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev - 1); }} className="absolute left-4 p-3 text-white hover:bg-white/10 rounded-full transition z-20"><CaretLeft size={32} weight="bold"/></button>}
         
         <img 
           src={getUrl(images[currentIndex])} 
           alt={`fullscreen-${currentIndex}`}
           className="max-h-[90vh] max-w-[90vw] object-contain animate-in zoom-in-95 duration-200 select-none"
           onClick={(e) => e.stopPropagation()} 
         />
  
         {hasNext && <button onClick={(e) => { e.stopPropagation(); setCurrentIndex(prev => prev + 1); }} className="absolute right-4 p-3 text-white hover:bg-white/10 rounded-full transition z-20"><CaretRight size={32} weight="bold"/></button>}
         
         {images.length > 1 && <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white font-medium bg-black/50 px-3 py-1 rounded-full">{currentIndex + 1} / {images.length}</div>}
      </div>,
      document.body
    );
};

// ==========================================
// 3. COMPONENT: IMAGE GRID
// ==========================================
const ImageGrid = ({ images, onImageClick }) => {
  if (!images || images.length === 0) return null;

  const count = images.length;
  let containerClass = "mt-3 rounded-xl overflow-hidden grid gap-0.5 border border-slate-200 bg-slate-100 relative z-10";

  if (count === 1) containerClass += " grid-cols-1";
  else if (count === 2) containerClass += " grid-cols-2 aspect-[3/2]";
  else if (count === 3) containerClass += " grid-cols-2 grid-rows-2 aspect-[3/2]";
  else if (count >= 4) containerClass += " grid-cols-2 grid-rows-2 aspect-[3/2]";

  return (
    <div className={containerClass}>
        {images.slice(0, 4).map((img, idx) => {
           let imgClass = "w-full h-full object-cover cursor-pointer hover:opacity-90 transition bg-slate-200";
           let style = {};
           if (count === 1) style = { maxHeight: '510px' };
           if (count === 3 && idx === 0) imgClass += " row-span-2";

           return (
             <img key={idx} src={getUrl(img)} alt={`grid-${idx}`} className={imgClass} style={style} onClick={(e) => { e.stopPropagation(); onImageClick(idx); }} />
           );
        })}
    </div>
  );
};

// ==========================================
// 4. COMPONENT: POLL DISPLAY
// ==========================================
const PollDisplay = ({ poll, postId }) => {
    const [localPoll, setLocalPoll] = useState(poll);
    const [isVoting, setIsVoting] = useState(false);

    const userStr = localStorage.getItem('user');
    const currentUser = userStr ? JSON.parse(userStr) : {};
    const myId = currentUser.id || currentUser._id;

    if (!localPoll || !localPoll.options || localPoll.options.length === 0) return null;

    const totalVotes = localPoll.options.reduce((acc, opt) => acc + opt.votes.length, 0);
    const hasVoted = localPoll.options.some(opt => opt.votes.includes(myId));
    
    let isExpired = false;
    let timeLeftString = "No time limit";

    if (localPoll.expiresAt) {
        const expireDate = new Date(localPoll.expiresAt);
        if (isValid(expireDate)) {
            isExpired = expireDate < new Date();
            timeLeftString = isExpired ? "Final results" : `${formatDistanceToNowStrict(expireDate)} left`;
        }
    }

    const handleVote = async (optionIndex) => {
        if (hasVoted || isExpired || isVoting) return;
        setIsVoting(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.put(`http://localhost:5000/api/posts/${postId}/vote`, 
                { optionIndex }, 
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if(res.data.poll) setLocalPoll(res.data.poll);
        } catch (error) {
            console.error("Vote failed", error);
            alert("Failed to vote.");
        } finally {
            setIsVoting(false);
        }
    };

    return (
        <div className="mt-3 flex flex-col gap-2 w-full" onClick={(e) => e.stopPropagation()}>
            {localPoll.options.map((opt, idx) => {
                const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                const isSelected = opt.votes.includes(myId);
                const showResults = hasVoted || isExpired;

                return (
                    <div key={idx} className="relative h-8 w-full group">
                        {showResults && (
                            <div 
                                className={`absolute top-0 left-0 h-full rounded-md transition-all duration-500 ${isSelected ? 'bg-sky-200' : 'bg-slate-200'}`}
                                style={{ width: `${percentage}%` }}
                            ></div>
                        )}

                        <button
                            onClick={() => handleVote(idx)}
                            disabled={showResults || isVoting}
                            className={`absolute inset-0 flex items-center justify-between px-3 w-full border rounded-md transition-all z-10 
                                ${showResults 
                                    ? 'border-transparent cursor-default' 
                                    : 'border-blue-500 text-blue-500 hover:bg-blue-50 font-bold cursor-pointer'
                                }
                            `}
                        >
                            <span className={`text-sm truncate flex items-center gap-1 ${showResults ? 'text-slate-900 font-medium' : ''}`}>
                                {opt.text} {isSelected && <CircleWavyCheck size={16} weight="fill" className="text-blue-500"/>}
                            </span>
                            {showResults && (
                                <span className="text-sm font-bold text-slate-700">{percentage}%</span>
                            )}
                        </button>
                    </div>
                );
            })}
            <div className="flex gap-2 text-slate-500 text-xs mt-1 font-medium">
                <span>{totalVotes} votes</span>
                <span>•</span>
                <span>{timeLeftString}</span>
            </div>
        </div>
    );
};

// ==========================================
// 5. COMPONENT: QUOTE CONTENT
// ==========================================
const QuoteContent = ({ data, isComment }) => {
    const navigate = useNavigate();
    if (!data) return <div className="mt-3 border border-slate-200 rounded-2xl p-3 bg-slate-50 text-slate-400 text-sm italic">Content unavailable.</div>;
  
    const handleQuoteClick = (e) => {
      e.stopPropagation();
      e.preventDefault();
      const targetUrl = isComment ? `/comment/${data._id}` : `/post/${data._id}`;
      navigate(targetUrl);
    };

    let quoteImages = [];
    if (data.images && data.images.length > 0) quoteImages = data.images;
    else if (data.image) quoteImages = [data.image];
    else if (data.gifUrl) quoteImages = [data.gifUrl];
  
    return (
      <div className="mt-3 border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:bg-slate-50 transition relative group z-10 bg-white" onClick={handleQuoteClick}>
         <div className="p-3">
            <div className="flex items-center gap-1.5 mb-1">
               <img src={data.avatar || "https://i.pravatar.cc/150"} className="w-5 h-5 rounded-full object-cover" alt="" />
               <span className="font-bold text-sm text-slate-900 truncate">{data.author}</span>
               <span className="text-slate-500 text-sm truncate">@{data.handle?.replace('@','')}</span>
               <span className="text-slate-400 text-xs">· {formatShortTime(data.createdAt)}</span>
            </div>
            <div className="text-[15px] text-slate-900 leading-snug line-clamp-3">
               {formatContent(data.content)}
            </div>
         </div>
         {quoteImages.length > 0 && (
            <div className="w-full h-48 bg-slate-100 border-t border-slate-100 pointer-events-none overflow-hidden">
               <img src={getUrl(quoteImages[0])} className="w-full h-full object-cover" alt="Quoted" />
            </div>
         )}
      </div>
    );
};

// ==========================================
// 6. MAIN COMPONENT: POST CARD
// ==========================================
const PostCard = ({ 
  post, onLike, onRepost, onBookmark, onQuote, 
  onPin, onDelete, 
  isDetail = false, 
  onShowActivity,
  activeMenuId,      
  setActiveMenuId,   
  showPinLabel = true 
}) => {
  const navigate = useNavigate();
  const [showRepostMenu, setShowRepostMenu] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null); 
  
  const isMenuOpen = activeMenuId === post._id;

  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currentUserId = currentUser?._id || currentUser?.id;
  
  const isMe = post.userId?._id === currentUserId || post.userId === currentUserId;

  const likesCount = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);
  const repostsCount = Array.isArray(post.reposts) ? post.reposts.length : (post.reposts || 0);
  const bookmarksCount = Array.isArray(post.bookmarks) ? post.bookmarks.length : (post.bookmarks || 0);
  const quoteCount = post.quoteCount || 0;
  const viewCount = post.views || 0;

  const isLiked = Array.isArray(post.likes) && post.likes.includes(currentUserId);
  const isReposted = Array.isArray(post.reposts) && post.reposts.includes(currentUserId);
  const isBookmarked = Array.isArray(post.bookmarks) && post.bookmarks.includes(currentUserId);
  
  const isCommentData = post.postId !== undefined || post.parentId !== undefined;

  let postImages = [];
  if (post.images && post.images.length > 0) {
      postImages = post.images;
  } else if (post.image) {
      postImages = [post.image];
  } else if (post.gifUrl) {
      postImages = [post.gifUrl]; 
  }
  
  const handleCardClick = () => {
    if (isDetail) return;
    if (isCommentData) navigate(`/comment/${post._id}`);
    else navigate(`/post/${post._id}`);
  };

  const goToProfile = (e) => {
    e.stopPropagation(); 
    navigate(`/profile/${post.handle?.replace('@', '') || post.author}`);
  };

  const handleShare = (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/post/${post._id}`;
    navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard!")).catch(() => alert("Failed to copy link"));
  };

  useEffect(() => {
    const handleClickOutside = () => {
        if (isMenuOpen && setActiveMenuId) setActiveMenuId(null);
        setShowRepostMenu(false);
    };
    if (isMenuOpen || showRepostMenu) {
        setTimeout(() => window.addEventListener('click', handleClickOutside), 0);
    }
    return () => window.removeEventListener('click', handleClickOutside);
  }, [isMenuOpen, showRepostMenu, setActiveMenuId]);

  const toggleMenu = (e) => {
      e.stopPropagation();
      if (setActiveMenuId) setActiveMenuId(isMenuOpen ? null : post._id);
  };

  const MainDropdown = () => (
    <div className="absolute top-8 right-0 bg-white shadow-xl border border-slate-100 rounded-xl w-52 z-[60] py-1 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-right">
       {isMe && (
         <>
           {onPin && (
             <button onClick={(e) => { e.stopPropagation(); onPin(post._id, post.pinned); if(setActiveMenuId) setActiveMenuId(null); }} className="px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
               <PushPin size={18} weight={post.pinned ? "fill" : "bold"} className={post.pinned ? "text-blue-500" : ""} /> 
               {post.pinned ? "Unpin from profile" : "Pin to profile"}
             </button>
           )}
           {onDelete && (
             <button onClick={(e) => { e.stopPropagation(); onDelete(post._id); if(setActiveMenuId) setActiveMenuId(null); }} className="px-4 py-3 text-left text-sm font-bold text-red-600 hover:bg-red-50 flex items-center gap-2 border-b border-slate-100">
               <Trash size={18} weight="bold" /> Delete post
             </button>
           )}
         </>
       )}
       <button onClick={handleShare} className="px-4 py-3 text-left text-sm font-medium text-slate-500 hover:bg-slate-50 flex items-center gap-2">
         <ShareNetwork size={18} /> Copy link
       </button>
    </div>
  );

  const PostFooter = () => (
    <div className="flex items-center justify-between mt-3 max-w-[450px] pr-2">
        <button className="flex items-center gap-1.5 group text-slate-500 hover:text-blue-500 transition"><div className="p-2 rounded-full group-hover:bg-blue-50 transition"><ChatCircle size={18} /></div><span className="text-xs font-medium">{post.comments || 0}</span></button>
        <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowRepostMenu(!showRepostMenu); }} className={`flex items-center gap-1.5 group transition ${isReposted ? "text-green-600" : "text-slate-500 hover:text-green-600"}`}><div className="p-2 rounded-full group-hover:bg-green-50 transition"><ArrowsClockwise size={18} weight={isReposted ? "bold" : "regular"} /></div><span className="text-xs font-medium">{repostsCount}</span></button>
            {showRepostMenu && (
                <div className="absolute top-8 left-0 bg-white shadow-xl border border-slate-100 rounded-lg w-36 z-20 py-1 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={(e) => { e.stopPropagation(); onRepost(post._id); setShowRepostMenu(false); }} className="px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Repeat size={18} /> Repost</button>
                    <button onClick={(e) => { e.stopPropagation(); onQuote(post); setShowRepostMenu(false); }} className="px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><PenNib size={18} /> Quote</button>
                </div>
            )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onLike(post._id); }} className={`flex items-center gap-1.5 group transition ${isLiked ? "text-pink-600" : "text-slate-500 hover:text-pink-600"}`}><div className="p-2 rounded-full group-hover:bg-pink-50 transition"><Heart size={18} weight={isLiked ? "fill" : "regular"} /></div><span className="text-xs font-medium">{likesCount}</span></button>
        <button onClick={handleShare} className="flex items-center gap-1.5 group text-slate-500 hover:text-blue-500 transition"><div className="p-2 rounded-full group-hover:bg-blue-50 transition"><ShareNetwork size={18} /></div><span className="text-xs font-medium">{viewCount > 0 ? viewCount : ''}</span></button>
    </div>
  );

  // [BARU] LOGIC RENDER LABEL REKOMENDASI DI FEED COMPACT
  const RecommendationLabel = () => {
    // 1. Social Signal (Teman nge-Like)
    if (post.recommendationType === 'social_like' && post.friendsWhoLiked && post.friendsWhoLiked.length > 0) {
      const friendName = post.friendsWhoLiked[0].fullName || post.friendsWhoLiked[0].username;
      const othersCount = post.friendsWhoLiked.length - 1;
      return (
        <div className="text-slate-500 text-xs font-bold flex items-center gap-2">
           <Heart size={14} weight="fill" className="text-slate-400" />
           <span>{friendName} {othersCount > 0 ? `& ${othersCount} others` : ''} liked</span>
        </div>
      );
    }
    // 2. Interest (Sesuai Minat)
    if (post.recommendationType === 'interest') {
      return (
        <div className="text-slate-500 text-xs font-bold flex items-center gap-2">
           <Sparkle size={14} weight="fill" className="text-blue-400" />
           <span>Suggested Topic: {post.category}</span>
        </div>
      );
    }
    // 3. Viral/Trending
    if (post.recommendationType === 'viral') {
      return (
        <div className="text-slate-500 text-xs font-bold flex items-center gap-2">
           <ShareNetwork size={14} weight="fill" className="text-green-400" />
           <span>Popular now</span>
        </div>
      );
    }
    return null;
  };

  // === VIEW 1: DETAIL (FULL PAGE) ===
  if (isDetail) {
    return (
      <>
        <article className="bg-white px-4 pt-4 pb-2 cursor-default relative">
            <div className="flex justify-between items-start mb-4">
            <div className="flex gap-3 cursor-pointer" onClick={goToProfile}>
                <img src={post.avatar || "https://i.pravatar.cc/150"} alt={post.author} className="w-11 h-11 rounded-full object-cover" />
                <div className="flex flex-col justify-center">
                    <div className="font-bold text-slate-900 text-[16px] leading-tight flex items-center gap-1">
                        {post.author} {post.isVerified && <CircleWavyCheck size={16} weight="fill" className="text-blue-500" />}
                    </div>
                    <div className="text-slate-500 text-[15px]">@{post.handle?.replace('@', '')}</div>
                </div>
            </div>
            <div className="relative">
                <button onClick={toggleMenu} className="text-slate-400 hover:text-blue-500 transition p-2 rounded-full hover:bg-blue-50"><DotsThree size={20} weight="bold" /></button>
                {isMenuOpen && <MainDropdown />}
            </div>
            </div>
            <div className="text-slate-900 text-[22px] leading-snug whitespace-pre-wrap mb-4 font-normal">
                {formatContent(post.content)}
            </div>
            {post.quoteOf ? <QuoteContent data={post.quoteOf} isComment={false} /> : post.quoteCommentOf ? <QuoteContent data={post.quoteCommentOf} isComment={true} /> : null}
            
            {post.poll && post.poll.options && post.poll.options.length > 0 && <PollDisplay poll={post.poll} postId={post._id} />}

            <ImageGrid images={postImages} onImageClick={(index) => setLightboxIndex(index)} />
            
            {post.video && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 bg-black">
                    <video src={getUrl(post.video)} controls className="w-full max-h-[600px]" />
                </div>
            )}

            <div className="py-4 border-b border-slate-100 text-slate-500 text-[15px] font-medium">
            {post.createdAt ? format(new Date(post.createdAt), 'h:mm a · MMM d, yyyy') : ''}
            <span className="mx-1">·</span> <span className="text-slate-900 font-bold">{viewCount}</span> Views
            </div>
            {(repostsCount > 0 || likesCount > 0 || quoteCount > 0) && (
            <div className="py-4 border-b border-slate-100 flex gap-6 text-[15px]">
                {repostsCount > 0 && <button onClick={() => onShowActivity && onShowActivity('reposts')} className="hover:underline decoration-slate-400"><span className="font-bold text-slate-900">{repostsCount}</span> <span className="text-slate-500">Reposts</span></button>}
                {quoteCount > 0 && <button onClick={() => onShowActivity && onShowActivity('quotes')} className="hover:underline decoration-slate-400"><span className="font-bold text-slate-900">{quoteCount}</span> <span className="text-slate-500">Quotes</span></button>}
                {likesCount > 0 && <button onClick={() => onShowActivity && onShowActivity('likes')} className="hover:underline decoration-slate-400"><span className="font-bold text-slate-900">{likesCount}</span> <span className="text-slate-500">Likes</span></button>}
                {bookmarksCount > 0 && <div><span className="font-bold text-slate-900">{bookmarksCount}</span> <span className="text-slate-500">Bookmarks</span></div>}
            </div>
            )}
            <div className="flex items-center justify-around py-2 border-b border-slate-100 mt-1">
                <button className="p-2.5 text-slate-500 hover:text-blue-500 rounded-full hover:bg-blue-50 transition"><ChatCircle size={22} /></button>
                <div className="relative">
                    <button onClick={(e) => { e.stopPropagation(); setShowRepostMenu(!showRepostMenu); }} className={`p-2.5 rounded-full hover:bg-green-50 transition ${isReposted ? "text-green-600" : "text-slate-500 hover:text-green-600"}`}><ArrowsClockwise size={22} weight={isReposted ? "bold" : "regular"} /></button>
                    {showRepostMenu && (
                        <div className="absolute top-10 -left-6 bg-white shadow-xl border border-slate-100 rounded-lg w-32 z-20 py-1 flex flex-col animate-in fade-in zoom-in-95 duration-100">
                            <div onClick={(e) => { e.stopPropagation(); onRepost(post._id); setShowRepostMenu(false); }} className="px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"><Repeat size={18} /> Repost</div>
                            <div onClick={(e) => { e.stopPropagation(); onQuote(post); setShowRepostMenu(false); }} className="px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer"><PenNib size={18} /> Quote</div>
                        </div>
                    )}
                </div>
                <button onClick={() => onLike(post._id)} className={`p-2.5 rounded-full hover:bg-pink-50 transition ${isLiked ? "text-pink-600" : "text-slate-500 hover:text-pink-600"}`}><Heart size={22} weight={isLiked ? "fill" : "regular"} /></button>
                <button onClick={() => onBookmark(post._id)} className={`p-2.5 rounded-full hover:bg-blue-50 transition ${isBookmarked ? "text-blue-600" : "text-slate-500 hover:text-blue-600"}`}><BookmarkSimple size={22} weight={isBookmarked ? "fill" : "regular"} /></button>
                <button onClick={handleShare} className="p-2.5 text-slate-500 hover:text-blue-500 rounded-full hover:bg-blue-50 transition"><ShareNetwork size={22} /></button>
            </div>
        </article>
        {lightboxIndex !== null && <LightboxModal images={postImages} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
      </>
    );
  }

  // === VIEW 2: FEED COMPACT (LIST) ===
  return (
    <>
      <article onClick={handleCardClick} className={`cursor-pointer hover:bg-slate-50 transition-colors duration-200 relative group border-b border-slate-100 ${post.pinned && showPinLabel ? 'bg-slate-50/40' : 'bg-white'}`}>
        <div className="p-4 pt-3">
          {/* HEADER: META INFO (Repost, Pin, Recommendation) */}
          <div className="ml-10 mb-1 flex flex-col gap-1">
                {/* 1. Recommendation Label (X Style) */}
                <RecommendationLabel />

                {/* 2. Repost Label */}
                {post.isRepost && <div className="text-slate-500 text-xs font-bold flex items-center gap-2"><ArrowsClockwise size={14} weight="bold" /> <span>{post.repostedBy} Reposted</span></div>}
                
                {/* 3. Pin Label */}
                {post.pinned && showPinLabel && <div className="text-slate-500 text-xs font-bold flex items-center gap-2"><PushPin size={14} weight="fill" /> <span>Pinned</span></div>}
                
                {/* 4. Quote Label */}
                {!post.isRepost && (!post.pinned || !showPinLabel) && (post.quoteOf || post.quoteCommentOf) && <div className="text-slate-500 text-xs font-bold flex items-center gap-2"><PenNib size={14} weight="bold" /> <span>Quoted</span></div>}
            </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0" onClick={goToProfile}>
               <img src={post.avatar || "https://i.pravatar.cc/150"} alt={post.author} className="w-10 h-10 rounded-full object-cover border border-slate-100 hover:opacity-90 transition" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-0.5 relative">
                <div className="flex items-center gap-1 overflow-hidden text-[15px] leading-5">
                    <span onClick={goToProfile} className="font-bold text-slate-900 truncate hover:underline cursor-pointer flex items-center gap-1">{post.author} {post.isVerified && <CircleWavyCheck size={14} weight="fill" className="text-blue-500" />}</span>
                    <span className="text-slate-500 truncate font-normal">@{post.handle?.replace('@', '')}</span>
                    <span className="text-slate-400 text-xs">·</span>
                    <span className="text-slate-500 text-sm font-normal hover:underline">{formatShortTime(post.createdAt)}</span>
                </div>
                <div className="relative">
                    <button onClick={toggleMenu} className="text-slate-300 hover:text-blue-500 transition -mt-1 -mr-2 p-2 rounded-full hover:bg-blue-50 active:bg-blue-100"><DotsThree size={20} weight="bold" /></button>
                    {isMenuOpen && <MainDropdown />}
                </div>
                </div>

              <div className="text-slate-900 leading-normal mb-2 whitespace-pre-wrap text-[15px]">
                 {formatContent(post.content)}
              </div>

              {post.quoteOf ? <QuoteContent data={post.quoteOf} isComment={false} /> : post.quoteCommentOf ? <QuoteContent data={post.quoteCommentOf} isComment={true} /> : null}

              {/* RENDER POLL STRICT CHECK */}
              {post.poll && post.poll.options && post.poll.options.length > 0 && <PollDisplay poll={post.poll} postId={post._id} />}

              <ImageGrid images={postImages} onImageClick={(index) => setLightboxIndex(index)} />
              
              {post.video && (
                <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 bg-black" onClick={(e) => e.stopPropagation()}>
                    <video src={getUrl(post.video)} controls className="w-full max-h-[500px]" />
                </div>
              )}

              <PostFooter />
            </div>
          </div>
        </div>
      </article>
      {lightboxIndex !== null && <LightboxModal images={postImages} initialIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />}
    </>
  );
};

export default PostCard;