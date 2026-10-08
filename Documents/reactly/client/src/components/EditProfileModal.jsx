import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom'; // [1] Import Portal
import axios from 'axios';
import { X, Camera, CaretDown, Check } from 'phosphor-react';

// --- DATA OPSI ---
const CATEGORIES = [
  "Creator", "Artist", "Developer", "Gamer", "Business", 
  "Musician", "Photographer", "Writer", "Personal"
];

const PRONOUNS = [
  { label: "he/him", value: "he/him" },
  { label: "she/her", value: "she/her" },
  { label: "they/them", value: "they/them" },
  { label: "Other", value: "Other" },
  { label: "Prefer not to say", value: "" } 
];

// --- KOMPONEN CUSTOM DROPDOWN ---
const CustomDropdown = ({ label, value, options, onChange, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLabel = options.find(opt => 
    (typeof opt === 'string' ? opt : opt.value) === value
  )?.label || value || placeholder;

  return (
    <div className="relative" ref={dropdownRef}>
      <label className="block text-xs text-slate-500 font-bold mb-1">{label}</label>
      
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between border rounded-md px-3 py-2.5 text-left bg-white transition ${
          isOpen ? 'border-black ring-1 ring-black' : 'border-slate-300 hover:border-slate-400'
        }`}
      >
        <span className={`text-sm font-medium ${!value ? 'text-slate-400' : 'text-slate-900'}`}>
           {typeof currentLabel === 'string' ? currentLabel : currentLabel?.label}
        </span>
        <CaretDown 
          size={16} 
          className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 bottom-full mb-1 w-full bg-white border border-slate-100 rounded-xl shadow-xl max-h-60 overflow-y-auto animate-in fade-in zoom-in-95 duration-100 origin-bottom">
           <div className="p-1">
              {options.map((opt, idx) => {
                const optLabel = typeof opt === 'string' ? opt : opt.label;
                const optValue = typeof opt === 'string' ? opt : opt.value;
                const isSelected = value === optValue;

                return (
                  <div 
                    key={idx}
                    onClick={() => { onChange(optValue); setIsOpen(false); }}
                    className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer text-sm transition ${
                      isSelected ? 'bg-slate-50 text-blue-600 font-bold' : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span>{optLabel}</span>
                    {isSelected && <Check size={16} weight="bold" />}
                  </div>
                );
              })}
           </div>
        </div>
      )}
    </div>
  );
};

// --- MODAL UTAMA ---
const EditProfileModal = ({ user, onClose, onUpdateSuccess }) => {
  const [formData, setFormData] = useState({
    fullName: user.fullName || '',
    bio: user.bio || '',
    location: user.location || '',
    website: user.website || '',
    category: user.category || 'Creator',
    pronouns: user.pronouns || ''
  });
  
  const [avatarFile, setAvatarFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  
  const [avatarPreview, setAvatarPreview] = useState(user.avatar);
  const [coverPreview, setCoverPreview] = useState(user.coverImage);
  
  const [loading, setLoading] = useState(false);

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // [2] Cegah scroll pada body saat modal terbuka
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleInputText = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (file) {
      if (type === 'avatar') {
        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
      } else {
        setCoverFile(file);
        setCoverPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const data = new FormData();
      
      Object.keys(formData).forEach(key => data.append(key, formData[key]));
      
      if (avatarFile) data.append('avatar', avatarFile);
      if (coverFile) data.append('coverImage', coverFile);

      const res = await axios.put('http://localhost:5000/api/users/profile', data, {
        headers: {
          'Authorization': `Bearer ${token}` 
        }
      });

      const currentUser = JSON.parse(localStorage.getItem('user'));
      const updatedUserLocal = { ...currentUser, ...res.data };
      localStorage.setItem('user', JSON.stringify(updatedUserLocal));

      onUpdateSuccess();
      onClose();
    } catch (error) {
      console.error("Gagal update profil:", error);
      alert(error.response?.data?.message || "Gagal update profil.");
    } finally {
      setLoading(false);
    }
  };

  // [3] Gunakan createPortal untuk merender langsung ke document.body
  // Ini menjamin modal selalu relative terhadap Viewport (Layar), bukan parent element.
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm sm:p-4 animate-in fade-in duration-200">
      {/* Overlay backdrop */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* Modal Content */}
      <div className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl overflow-hidden shadow-2xl relative flex flex-col transition-all">
        
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-white z-10 shrink-0">
           <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition"><X size={20} /></button>
           <h2 className="font-bold text-lg">Edit Profile</h2>
           <button 
             onClick={handleSubmit} 
             disabled={loading}
             className="bg-black text-white px-5 py-1.5 rounded-full font-bold text-sm hover:opacity-80 disabled:opacity-50 transition"
           >
             {loading ? 'Saving...' : 'Save'}
           </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-0 pb-10 flex-1">
           
           {/* Cover Image */}
           <div className="h-40 bg-slate-200 relative group shrink-0">
              {coverPreview ? (
                <img src={coverPreview} className="w-full h-full object-cover opacity-80" alt="cover" />
              ) : (
                <div className="w-full h-full bg-slate-300 flex items-center justify-center text-slate-400 text-sm font-medium">Add Cover</div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 gap-4 opacity-0 group-hover:opacity-100 transition duration-200">
                 <button onClick={() => coverInputRef.current.click()} className="bg-black/50 text-white p-2.5 rounded-full hover:bg-black/70 backdrop-blur-md transform hover:scale-110 transition">
                    <Camera size={24} />
                 </button>
              </div>
              <input type="file" ref={coverInputRef} onChange={(e) => handleFileChange(e, 'cover')} className="hidden" accept="image/*" />
           </div>

           {/* Avatar */}
           <div className="px-4 -mt-10 relative mb-6 shrink-0">
              <div className="w-24 h-24 rounded-full border-4 border-white bg-slate-100 relative group overflow-hidden shadow-sm">
                 <img src={avatarPreview || "https://i.pravatar.cc/150"} className="w-full h-full object-cover" alt="avatar" />
                 <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition duration-200">
                    <button onClick={() => avatarInputRef.current.click()} className="text-white transform hover:scale-110 transition">
                       <Camera size={26} />
                    </button>
                 </div>
              </div>
              <input type="file" ref={avatarInputRef} onChange={(e) => handleFileChange(e, 'avatar')} className="hidden" accept="image/*" />
           </div>

           {/* Form Fields */}
           <div className="px-4 space-y-5 pb-20 sm:pb-4">
              
              {/* Name */}
              <div className="group">
                 <label className="block text-xs text-slate-500 font-bold mb-1">Name</label>
                 <input 
                   name="fullName" value={formData.fullName} onChange={handleInputText}
                   className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm font-medium text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition" 
                   placeholder="Your name"
                 />
              </div>

              {/* Bio */}
              <div className="group">
                 <label className="block text-xs text-slate-500 font-bold mb-1">Bio</label>
                 <textarea 
                   name="bio" value={formData.bio} onChange={handleInputText}
                   className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition resize-none h-24 leading-relaxed" 
                   placeholder="Tell us about yourself..."
                 />
              </div>

              {/* Location & Website */}
              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-1">Location</label>
                    <input 
                        name="location" value={formData.location} onChange={handleInputText} 
                        className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition" 
                        placeholder="City, Country" 
                    />
                 </div>
                 <div>
                    <label className="block text-xs text-slate-500 font-bold mb-1">Website</label>
                    <input 
                        name="website" value={formData.website} onChange={handleInputText} 
                        className="w-full border border-slate-300 rounded-md px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-black focus:ring-1 focus:ring-black transition" 
                        placeholder="yourlink.com" 
                    />
                 </div>
              </div>

              {/* DROPDOWNS (Category & Pronouns) */}
              <div className="grid grid-cols-2 gap-4"> 
                  <CustomDropdown 
                    label="Category"
                    value={formData.category}
                    options={CATEGORIES}
                    onChange={(val) => handleChange('category', val)}
                  />

                  <CustomDropdown 
                    label="Pronouns"
                    value={formData.pronouns}
                    options={PRONOUNS}
                    onChange={(val) => handleChange('pronouns', val)}
                    placeholder="Select..."
                  />
              </div>

           </div>
        </div>
      </div>
    </div>,
    document.body // [4] Render ke document.body
  );
};

export default EditProfileModal;