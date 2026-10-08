import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

export const useProfileLogic = (username) => {
  const navigate = useNavigate();
  
  // Data State
  const [profile, setProfile] = useState(null);
  const [feedData, setFeedData] = useState([]); // Data dinamis (Post/Reply/Highlight)
  
  // UI State
  const [loading, setLoading] = useState(true); // Loading Profil
  const [feedLoading, setFeedLoading] = useState(false); // Loading Feed Tab
  const [activeTab, setActiveTab] = useState('Posts'); // State Tab Aktif

  // Interaction State
  const [followLoading, setFollowLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollower, setIsFollower] = useState(false);

  // [BARU] State untuk menyimpan konflik Pin (Jika user mau pin ke-3)
  const [pinConflict, setPinConflict] = useState(null); // Format: { newPostId, oldestPost }

  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const isLoggedIn = !!localStorage.getItem('token');
  const isMe = currentUser.username === username;
  const token = localStorage.getItem('token');

  const getAuthHeader = () => ({ headers: { Authorization: `Bearer ${token}` } });
  const checkLogin = (cb) => (!isLoggedIn ? navigate('/login') : cb());

  // 1. Fetch Profile
  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      try {
        const res = await axios.get(`http://localhost:5000/api/users/${username}`);
        setProfile(res.data);

        if (currentUser.id) {
          setIsFollowing(res.data.followers?.includes(currentUser.id));
          setIsFollower(res.data.following?.includes(currentUser.id));
        }
      } catch (error) {
        console.error("Fetch profile error:", error);
      } finally {
        setLoading(false);
      }
    };
    if (username) fetchProfile();
  }, [username, currentUser.id]);

  // 2. Fetch Feed (Dinamis berdasarkan Tab)
  const fetchData = useCallback(async () => {
    if (!profile) return; 

    setFeedLoading(true);
    setFeedData([]); 
    
    try {
      let endpoint = `http://localhost:5000/api/users/${username}/posts`; // Default Posts

      if (activeTab === 'Replies') endpoint = `http://localhost:5000/api/users/${username}/replies`;
      if (activeTab === 'Highlights') endpoint = `http://localhost:5000/api/users/${username}/highlights`;
      if (activeTab === 'Media') endpoint = `http://localhost:5000/api/users/${username}/media`;
      if (activeTab === 'Likes') endpoint = `http://localhost:5000/api/users/${username}/likes`;

      const res = await axios.get(endpoint);
      setFeedData(res.data);
    } catch (err) {
      console.error("Feed error:", err);
    } finally {
      setFeedLoading(false);
    }
  }, [username, activeTab, profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper Internal: Eksekusi API Pin (agar tidak duplicate code)
  const executePinAPI = async (postId, newStatus) => {
    // Optimistic Update
    setFeedData(prev => prev.map(p => 
      p._id === postId ? { ...p, pinned: newStatus } : p
    ));
    // Call API
    await axios.put(`http://localhost:5000/api/posts/${postId}/pin`, {}, getAuthHeader());
  };

  // --- Handlers ---

  const handleLike = (id) => checkLogin(async () => {
    try {
      setFeedData(prev => prev.map(p => 
        p._id === id 
          ? { ...p, likes: p.likes.includes(currentUser.id) ? p.likes.filter(uid => uid !== currentUser.id) : [...p.likes, currentUser.id] }
          : p
      ));
      await axios.put(`http://localhost:5000/api/posts/${id}/like`, {}, getAuthHeader());
    } catch (e) { fetchData(); }
  });

  const handleRepost = (id) => checkLogin(async () => {
    try {
        await axios.put(`http://localhost:5000/api/posts/${id}/repost`, {}, getAuthHeader());
        fetchData(); 
    } catch (e) { console.error(e); }
  });

  const handleBookmark = (id) => checkLogin(async () => {
    try {
        await axios.put(`http://localhost:5000/api/posts/${id}/bookmark`, {}, getAuthHeader());
        fetchData(); 
    } catch (e) { console.error(e); }
  });

  // [UPDATE] Handle Pin dengan Logika Konflik (Maks 2)
  const handlePin = (postId, isCurrentlyPinned) => checkLogin(async () => {
    try {
      // KASUS 1: Mau UNPIN (Aman, langsung eksekusi)
      if (isCurrentlyPinned) {
        await executePinAPI(postId, false);
        fetchData(); // Refresh urutan
        return;
      }

      // KASUS 2: Mau PIN (Cek Kuota dulu)
      const pinnedPosts = feedData.filter(p => p.pinned);
      
      if (pinnedPosts.length >= 2) {
        // Cari post terlama yang dipin (berdasarkan createdAt)
        const oldestPost = pinnedPosts.reduce((prev, curr) => 
           new Date(prev.createdAt) < new Date(curr.createdAt) ? prev : curr
        );
        
        // Simpan data konflik untuk memicu Modal Konfirmasi di UI
        setPinConflict({ newPostId: postId, oldestPost });
        return; // Stop disini, tunggu user konfirmasi di modal
      }

      // KASUS 3: Kuota masih ada (Langsung Pin)
      await executePinAPI(postId, true);
      fetchData(); // Refresh urutan

    } catch (e) {
      alert(e.response?.data?.message || "Failed to pin post");
      fetchData(); // Rollback
    }
  });

  // [BARU] Fungsi Confirm Replace (Dipanggil dari Modal)
  const confirmPinReplace = async () => {
    if (!pinConflict) return;
    
    try {
      const { newPostId, oldestPost } = pinConflict;
      
      // 1. Unpin yang lama
      await executePinAPI(oldestPost._id, false);
      
      // 2. Pin yang baru
      await executePinAPI(newPostId, true);
      
      // 3. Reset State & Refresh Data
      setPinConflict(null);
      fetchData();
      
    } catch (e) {
      console.error(e);
      alert("Failed to replace pin");
      fetchData(); // Rollback
    }
  };

  // [BARU] Fungsi Cancel Replace
  const cancelPinReplace = () => {
    setPinConflict(null);
  };

  const handleDelete = (postId) => checkLogin(async () => {
    try {
      // Optimistic Remove
      setFeedData(prev => prev.filter(p => p._id !== postId));
      
      await axios.delete(`http://localhost:5000/api/posts/${postId}`, getAuthHeader());
      
      // Update data profil jika perlu (opsional)
    } catch (e) {
      console.error(e);
      alert("Failed to delete post");
      fetchData(); // Rollback (munculkan lagi jika gagal)
    }
  });

  const handleFollowAction = async () => {
    if (!isLoggedIn) return navigate('/login');
    if (followLoading) return;

    setFollowLoading(true);
    const prevIsFollowing = isFollowing;
    setIsFollowing(!prevIsFollowing);
    
    setProfile(prev => ({
      ...prev,
      followers: !prevIsFollowing 
        ? [...(prev.followers || []), currentUser.id] 
        : (prev.followers || []).filter(id => id !== currentUser.id)
    }));

    try {
      const url = `http://localhost:5000/api/users/${username}/${prevIsFollowing ? 'unfollow' : 'follow'}`;
      await axios.put(url, {}, getAuthHeader());
    } catch (error) {
      setIsFollowing(prevIsFollowing); 
    } finally {
      setFollowLoading(false);
    }
  };

  return {
    profile, 
    feedData, 
    loading, 
    feedLoading, 
    isMe, 
    isFollowing, isFollower, followLoading,
    activeTab, setActiveTab,
    handleLike, handleRepost, handleBookmark, handleFollowAction, 
    handlePin, handleDelete, 
    
    // [BARU] Export State & Handler untuk Modal Pin
    pinConflict,       // State data konflik (jika tidak null, tampilkan modal)
    confirmPinReplace, // Fungsi saat tombol "Replace" ditekan
    cancelPinReplace,  // Fungsi saat tombol "Cancel" ditekan
    
    fetchData
  };
};