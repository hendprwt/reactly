import React from 'react';
import { Plus } from 'phosphor-react';

const Stories = () => {
  const users = [
    { name: 'You', img: 'https://i.pravatar.cc/150?u=me', isMe: true },
    { name: 'aurora', img: 'https://i.pravatar.cc/150?u=au' },
    { name: 'ericarl', img: 'https://i.pravatar.cc/150?u=er' },
    { name: 'keanuagl', img: 'https://i.pravatar.cc/150?u=ke' },
    { name: 'awkarin', img: 'https://i.pravatar.cc/150?u=aw' },
    { name: 'justin', img: 'https://i.pravatar.cc/150?u=ju' },
  ];

  return (
    <div className="w-full overflow-x-auto no-scrollbar pt-4 pb-1 px-6">
      <div className="flex gap-3">
        {users.map((u, i) => (
          <div key={i} className="flex flex-col items-center gap-2 min-w-[72px] cursor-pointer group">
            {/* Wrapper Lingkaran */}
            <div className={`relative w-[72px] h-[72px] rounded-full p-[3px] ${u.isMe ? 'border-2 border-dashed border-slate-300' : 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600'}`}>
              
              {/* Avatar Image */}
              <div className="w-full h-full bg-white rounded-full p-[2px]">
                <img src={u.img} alt={u.name} className="w-full h-full object-cover rounded-full" />
              </div>

              {/* Tombol Plus (Hanya user) - Posisi absolut presisi */}
              {u.isMe && (
                <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center border-2 border-white shadow-sm">
                  <Plus size={12} weight="bold" />
                </div>
              )}
            </div>
            
            {/* Nama */}
            <span className="text-[11px] font-bold text-slate-700 tracking-wide truncate max-w-[70px]">
              {u.name}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Stories;