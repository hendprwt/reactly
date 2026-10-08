import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { MapPin, Link as LinkIcon, Briefcase, CalendarBlank, CircleWavyCheck } from 'phosphor-react';

// PERHATIKAN: Gunakan 'export const', BUKAN 'export default'
export const ProfileHeader = ({ profile, isMe, isFollowing, isFollower, followLoading, onFollow, onEdit }) => {
  const navigate = useNavigate();

  // Helper render Bio
  const renderBio = (text) => {
    if (!text) return <p className="mt-3 text-slate-400 italic text-sm">No bio yet.</p>;
    return (
      <p className="mt-3 text-slate-900 leading-relaxed whitespace-pre-wrap">
        {text.split(/((?:@|#)[\w]+)/g).map((part, i) => 
          part.startsWith('@') ? <Link key={i} to={`/profile/${part.slice(1)}`} className="text-blue-500 hover:underline font-medium">{part}</Link> :
          part.startsWith('#') ? <span key={i} className="text-blue-500 font-medium cursor-pointer hover:underline">{part}</span> :
          part
        )}
      </p>
    );
  };

  return (
    <div className="px-4 pb-4 relative">
      {/* Avatar & Actions */}
      <div className="flex justify-between items-end -mt-[15%] mb-3">
        <div className="w-[28%] aspect-square rounded-full border-[5px] border-[#FDFDFD] overflow-hidden bg-white shadow-sm relative group">
          <img src={profile.avatar || `https://ui-avatars.com/api/?name=${profile.username}`} alt={profile.username} className="w-full h-full object-cover" />
        </div>
        
        <div className="flex gap-2">
          {isMe ? (
            <button onClick={onEdit} className="border border-slate-300 font-bold text-sm px-5 py-2 rounded-full hover:bg-slate-50 transition">Edit profile</button>
          ) : (
            <button 
              onClick={onFollow} 
              disabled={followLoading}
              className={`font-bold text-sm px-6 py-2 rounded-full transition shadow-lg ${isFollowing ? "bg-white border border-slate-300 text-slate-900 hover:border-red-200 hover:text-red-600" : "bg-black text-white hover:opacity-80"}`}
            >
              {followLoading ? "..." : (isFollowing ? "Following" : (isFollower ? "Follow back" : "Follow"))}
            </button>
          )}
        </div>
      </div>

      {/* Names & Badges */}
      <div className="mb-5">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <h1 className="font-black text-2xl text-slate-900 leading-none flex items-center gap-1">
            {profile.fullName || profile.username}
            {profile.isVerified && <CircleWavyCheck size={24} weight="fill" className="text-blue-500" />}
          </h1>
          {profile.pronouns && <span className="text-slate-500 text-xs bg-slate-100 px-2 py-0.5 rounded-full font-medium lowercase border border-slate-200">{profile.pronouns}</span>}
        </div>

        <div className="flex items-center gap-2 text-slate-500 text-[15px]">
          <span>@{profile.username}</span>
          {isFollower && !isMe && <span className="bg-slate-100 text-[10px] px-1.5 py-0.5 rounded font-bold text-slate-500 uppercase tracking-tight">Follows you</span>}
        </div>

        {renderBio(profile.bio)}

        {/* Metadata Details */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 mt-4 text-slate-500 text-[14px]">
          <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
            <Briefcase size={14} weight="fill" className="text-slate-500" /> <span className="uppercase">{profile.category || "Creator"}</span>
          </div>
          {profile.location && <div className="flex items-center gap-1.5"><MapPin size={18} /> <span>{profile.location}</span></div>}
          {profile.website && (
            <div className="flex items-center gap-1.5 text-blue-500 hover:underline max-w-[200px] truncate">
              <LinkIcon size={18} /> <a href={profile.website} target="_blank" rel="noreferrer">{profile.website.replace(/^https?:\/\/(www\.)?/, '')}</a>
            </div>
          )}
          <div className="flex items-center gap-1.5"><CalendarBlank size={18} /> <span>Joined {new Date(profile.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span></div>
        </div>

        {/* Mutuals */}
        {profile.mutuals?.length > 0 && (
          <div className="flex items-center gap-3 mt-5 mb-2 cursor-pointer" onClick={() => navigate(`/profile/${profile.mutuals[0].username}`)}>
            <div className="flex -space-x-2 overflow-hidden py-1 pl-1">
              {profile.mutuals.map((m, idx) => (
                <img key={idx} className="inline-block h-6 w-6 rounded-full ring-2 ring-white object-cover relative z-10" src={m.avatar || `https://ui-avatars.com/api/?name=${m.username}`} alt={m.username} />
              ))}
            </div>
            <p className="text-xs text-slate-500">Followed by <span className="font-bold text-slate-800 hover:underline">{profile.mutuals[0].username}</span> {profile.mutuals.length > 1 && <span>and {profile.mutuals.length - 1} others</span>}</p>
          </div>
        )}

        {/* Stats */}
        <div className="flex gap-4 mt-4 text-sm">
          <div className="hover:underline cursor-pointer"><span className="font-bold text-slate-900">{profile.following?.length || 0}</span> <span className="text-slate-500">Following</span></div>
          <div className="hover:underline cursor-pointer"><span className="font-bold text-slate-900">{profile.followers?.length || 0}</span> <span className="text-slate-500">Followers</span></div>
        </div>
      </div>
    </div>
  );
};