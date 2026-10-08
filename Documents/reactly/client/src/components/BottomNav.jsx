import React from 'react';
import { House, MagnifyingGlass, Bell, Envelope } from 'phosphor-react';

const BottomNav = () => {
  return (
    <nav className="md:hidden fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-between px-6 py-3 z-50 pb-safe">
       <button className="text-slate-900"><House size={26} weight="fill" /></button>
       <button className="text-slate-400 hover:text-slate-900"><MagnifyingGlass size={26} /></button>
       <button className="text-slate-400 hover:text-slate-900"><Bell size={26} /></button>
       <button className="text-slate-400 hover:text-slate-900"><Envelope size={26} /></button>
    </nav>
  );
};

export default BottomNav;