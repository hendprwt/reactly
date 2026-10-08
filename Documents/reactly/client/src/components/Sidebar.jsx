import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  House, Hash, Bell, Envelope, User,
  PaperPlaneRight, SignOut
} from 'phosphor-react';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // ✅ Baca user real dari localStorage
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const username = user?.username || 'guest';
  const fullName = user?.fullName || user?.username || 'User';
  const avatar = user?.avatar
    ? `http://localhost:5000/uploads/${user.avatar}`
    : `https://i.pravatar.cc/40?u=${username}`;

  const NAV_ITEMS = [
    { name: 'Home',          icon: House,    path: '/' },
    { name: 'Explore',       icon: Hash,     path: '/explore' },
    { name: 'Notifications', icon: Bell,     path: '/notifications' },
    { name: 'Messages',      icon: Envelope, path: '/messages' },
    { name: 'Profile',       icon: User,     path: `/profile/${username}` },
  ];

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <aside className="hidden md:flex flex-col w-20 xl:w-64 sticky top-0 h-screen p-4 border-r border-slate-200 bg-white z-20 items-center xl:items-start">
      {/* Logo */}
      <div className="mb-6 px-3">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-xl cursor-pointer"
          onClick={() => navigate('/')}>
          R
        </div>
      </div>

      {/* Nav Items */}
      <nav className="flex flex-col gap-1 flex-1 w-full">
        {NAV_ITEMS.map(({ name, icon: Icon, path }) => {
          const isActive = location.pathname === path ||
            (path !== '/' && location.pathname.startsWith(path));
          return (
            <button
              key={name}
              onClick={() => navigate(path)}
              className={`flex items-center gap-4 p-3 rounded-full hover:bg-slate-100 transition duration-200 group w-full justify-center xl:justify-start ${isActive ? 'font-bold' : ''}`}
            >
              <span className={`transition ${isActive ? 'text-slate-900' : 'text-slate-700 group-hover:text-blue-600'}`}>
                <Icon size={26} weight={isActive ? 'fill' : 'regular'} />
              </span>
              <span className={`hidden xl:block text-lg ${isActive ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>
                {name}
              </span>
            </button>
          );
        })}

        {/* Post Button */}
        <button
          onClick={() => navigate('/')}
          className="mt-4 bg-blue-500 text-white p-3 xl:px-8 xl:py-3 rounded-full font-bold shadow-lg hover:bg-blue-600 transition flex justify-center items-center"
        >
          <span className="xl:hidden"><PaperPlaneRight size={24} weight="fill" /></span>
          <span className="hidden xl:block">Post</span>
        </button>
      </nav>

      {/* User Info + Logout */}
      {user ? (
        <div className="mt-auto w-full">
          <div
            onClick={() => navigate(`/profile/${username}`)}
            className="flex items-center gap-3 p-3 rounded-full hover:bg-slate-100 cursor-pointer justify-center xl:justify-start"
          >
            <img src={avatar} alt={fullName} className="w-10 h-10 rounded-full object-cover bg-slate-200 flex-shrink-0" />
            <div className="hidden xl:block text-left overflow-hidden">
              <p className="font-bold text-sm truncate">{fullName}</p>
              <p className="text-slate-500 text-sm truncate">@{username}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 p-3 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition justify-center xl:justify-start mt-1"
          >
            <SignOut size={22} />
            <span className="hidden xl:block text-sm font-medium">Logout</span>
          </button>
        </div>
      ) : (
        <div className="mt-auto w-full">
          <button
            onClick={() => navigate('/login')}
            className="w-full bg-blue-500 text-white px-4 py-2 rounded-full font-bold hover:bg-blue-600 transition"
          >
            <span className="xl:hidden"><User size={22} /></span>
            <span className="hidden xl:block">Login</span>
          </button>
        </div>
      )}
    </aside>
  );
};

export default Sidebar;