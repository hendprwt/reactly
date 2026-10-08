import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import PostDetail from './pages/PostDetail'; 
import CommentDetail from './pages/CommentDetail'; 
import Notifications from './pages/Notifications';

// [BARU] Import halaman Explore
import Explore from './pages/Explore';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        {/* [BARU] Route untuk Pencarian/Explore */}
        <Route path="/explore" element={<Explore />} />
        
        <Route path="/profile/:username" element={<Profile />} />
        
        <Route path="/post/:id" element={<PostDetail />} />
        <Route path="/comment/:id" element={<CommentDetail />} />
        <Route path="/notifications" element={<Notifications />} />
        
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;