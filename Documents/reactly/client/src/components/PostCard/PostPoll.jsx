import React, { useState } from 'react';
import axios from 'axios';
import { CircleWavyCheck } from 'phosphor-react';
import { formatDistanceToNowStrict, isValid } from 'date-fns';

const PostPoll = ({ poll, postId }) => {
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

export default PostPoll;