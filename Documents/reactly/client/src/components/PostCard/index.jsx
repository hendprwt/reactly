import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  DotsThree, Heart, ChatCircle, ArrowsClockwise, 
  ShareNetwork, BookmarkSimple, CircleWavyCheck, PenNib, Repeat, 
  PushPin, Trash, Sparkle
} from 'phosphor-react';
import { format } from 'date-fns';

// Import Sub-Components & Utils
import { getUrl, formatContent, formatShortTime } from './PostUtils';
import PostImages from './PostImages';
import PostPoll from './PostPoll';
import PostQuote from './PostQuote';

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
  
  const isMenuOpen = activeMenuId === post._id;
  const userStr = localStorage.getItem('user');
  const currentUser = userStr ? JSON.parse(userStr) : null;
  const currentUserId = currentUser?._id || currentUser?.id;
  
  const isMe = post.userId?._id === currentUserId || post.userId === currentUserId;

  // Stats
  const likesCount = Array.isArray(post.likes) ? post.likes.length : (post.likes || 0);
  const repostsCount = Array.isArray(post.reposts) ? post.reposts.length : (post.reposts || 0);
  const bookmarksCount = Array.isArray(post.bookmarks) ? post.bookmarks.length : (post.bookmarks || 0);
  const quoteCount = post.quoteCount || 0;
  const viewCount = post.views || 0;

  // Status
  const isLiked = Array.isArray(post.likes) && post.likes.includes(currentUserId);
  const isReposted = Array.isArray(post.reposts) && post.reposts.includes(currentUserId);
  const isBookmarked = Array.isArray(post.bookmarks) && post.bookmarks.includes(currentUserId);
  const isCommentData = post.postId !== undefined || post.parentId !== undefined;

  // Prepare Images
  let postImages = [];
  if (post.images && post.images.length > 0) postImages = post.images;
  else if (post.image) postImages = [post.image];
  else if (post.gifUrl) postImages = [post.gifUrl];
  
  // Handlers
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

  const toggleMenu = (e) => {
    e.stopPropagation();
    if (setActiveMenuId) setActiveMenuId(isMenuOpen ? null : post._id);
  };

  // Close menus on click outside
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

  // --- Sub-Render Functions (Internal UI Parts) ---

  const RecommendationLabel = () => {
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
    if (post.recommendationType === 'interest') {
      return (
        <div className="text-slate-500 text-xs font-bold flex items-center gap-2">
           <Sparkle size={14} weight="fill" className="text-blue-400" />
           <span>Suggested Topic: {post.category}</span>
        </div>
      );
    }
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
    <div className="flex items-center justify-between mt-3 max-w-[490px] pr-2">
        {/* Comment */}
        <button className="flex items-center gap-1.5 group text-slate-500 hover:text-blue-500 transition"><div className="p-2 rounded-full group-hover:bg-blue-50 transition"><ChatCircle size={18} /></div><span className="text-xs font-medium">{post.comments || 0}</span></button>

        {/* Repost */}
        <div className="relative">
            <button onClick={(e) => { e.stopPropagation(); setShowRepostMenu(!showRepostMenu); }} className={`flex items-center gap-1.5 group transition ${isReposted ? "text-green-600" : "text-slate-500 hover:text-green-600"}`}><div className="p-2 rounded-full group-hover:bg-green-50 transition"><ArrowsClockwise size={18} weight={isReposted ? "bold" : "regular"} /></div><span className="text-xs font-medium">{repostsCount}</span></button>
            {showRepostMenu && (
                <div className="absolute top-8 left-0 bg-white shadow-xl border border-slate-100 rounded-lg w-36 z-20 py-1 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                    <button onClick={(e) => { e.stopPropagation(); onRepost(post._id); setShowRepostMenu(false); }} className="px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><Repeat size={18} /> Repost</button>
                    <button onClick={(e) => { e.stopPropagation(); onQuote(post); setShowRepostMenu(false); }} className="px-4 py-3 text-left text-sm font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2"><PenNib size={18} /> Quote</button>
                </div>
            )}
        </div>

        {/* Like */}
        <button onClick={(e) => { e.stopPropagation(); onLike(post._id); }} className={`flex items-center gap-1.5 group transition ${isLiked ? "text-pink-600" : "text-slate-500 hover:text-pink-600"}`}><div className="p-2 rounded-full group-hover:bg-pink-50 transition"><Heart size={18} weight={isLiked ? "fill" : "regular"} /></div><span className="text-xs font-medium">{likesCount}</span></button>

        {/* ✅ Bookmark — sekarang ada di compact view */}
        <button onClick={(e) => { e.stopPropagation(); onBookmark(post._id); }} className={`flex items-center gap-1.5 group transition ${isBookmarked ? "text-blue-600" : "text-slate-500 hover:text-blue-600"}`}><div className="p-2 rounded-full group-hover:bg-blue-50 transition"><BookmarkSimple size={18} weight={isBookmarked ? "fill" : "regular"} /></div></button>

        {/* Share + View Count */}
        <button onClick={handleShare} className="flex items-center gap-1.5 group text-slate-500 hover:text-blue-500 transition"><div className="p-2 rounded-full group-hover:bg-blue-50 transition"><ShareNetwork size={18} /></div><span className="text-xs font-medium text-slate-400">{viewCount > 0 ? viewCount : ''}</span></button>
    </div>
  );

  // === RENDER: DETAIL VIEW ===
  if (isDetail) {
    return (
      <article className="bg-white px-4 pt-4 pb-2 cursor-default relative">
        {/* Header */}
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

        {/* Content */}
        <div className="text-slate-900 text-[22px] leading-snug whitespace-pre-wrap mb-4 font-normal">
            {formatContent(post.content)}
        </div>

        {/* Quotes, Polls, Media */}
        {post.quoteOf ? <PostQuote data={post.quoteOf} isComment={false} /> : post.quoteCommentOf ? <PostQuote data={post.quoteCommentOf} isComment={true} /> : null}
        <PostPoll poll={post.poll} postId={post._id} />
        <PostImages images={postImages} />
        
        {post.video && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 bg-black">
                <video src={getUrl(post.video)} controls className="w-full max-h-[600px]" />
            </div>
        )}

        {/* Stats & Actions */}
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
        
        {/* Action Buttons (Detail View - Bigger) */}
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
    );
  }

  // === RENDER: FEED COMPACT (LIST) ===
  return (
    <article onClick={handleCardClick} className={`cursor-pointer hover:bg-slate-50 transition-colors duration-200 relative group border-b border-slate-100 ${post.pinned && showPinLabel ? 'bg-slate-50/40' : 'bg-white'}`}>
        <div className="p-4 pt-3">
          {/* Header Labels (Reco, Repost, Pin) */}
          <div className="ml-10 mb-1 flex flex-col gap-1">
                <RecommendationLabel />
                {post.isRepost && <div className="text-slate-500 text-xs font-bold flex items-center gap-2"><ArrowsClockwise size={14} weight="bold" /> <span>{post.repostedBy} Reposted</span></div>}
                {post.pinned && showPinLabel && <div className="text-slate-500 text-xs font-bold flex items-center gap-2"><PushPin size={14} weight="fill" /> <span>Pinned</span></div>}
                {!post.isRepost && (!post.pinned || !showPinLabel) && (post.quoteOf || post.quoteCommentOf) && <div className="text-slate-500 text-xs font-bold flex items-center gap-2"><PenNib size={14} weight="bold" /> <span>Quoted</span></div>}
            </div>

          <div className="flex gap-3">
            <div className="flex-shrink-0" onClick={goToProfile}>
               <img src={post.avatar || "https://i.pravatar.cc/150"} alt={post.author} className="w-10 h-10 rounded-full object-cover border border-slate-100 hover:opacity-90 transition" />
            </div>

            <div className="flex-1 min-w-0">
              {/* User Meta */}
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

              {/* Content */}
              <div className="text-slate-900 leading-normal mb-2 whitespace-pre-wrap text-[15px]">
                 {formatContent(post.content)}
              </div>

              {/* Quotes, Polls, Media */}
              {post.quoteOf ? <PostQuote data={post.quoteOf} isComment={false} /> : post.quoteCommentOf ? <PostQuote data={post.quoteCommentOf} isComment={true} /> : null}
              <PostPoll poll={post.poll} postId={post._id} />
              <PostImages images={postImages} />
              
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
  );
};

export default PostCard;