import React from 'react';
import { useNavigate } from 'react-router-dom';
import { getUrl, formatContent, formatShortTime } from './PostUtils';

const PostQuote = ({ data, isComment }) => {
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

export default PostQuote;