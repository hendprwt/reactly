const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  // === 1. OTENTIKASI UTAMA ===
  username: { 
    type: String, 
    required: true, 
    unique: true, 
    trim: true, 
    minlength: 3 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true, 
    lowercase: true, 
    trim: true 
  },
  password: { 
    type: String, 
    required: true 
  },

  // === 2. PROFIL LENGKAP ===
  fullName: { type: String, default: "" }, 
  avatar:   { type: String, default: "" }, 
  coverImage: { type: String, default: "" }, 
  bio:      { type: String, default: "", maxlength: 160 }, 
  location: { type: String, default: "" }, 
  website:  { type: String, default: "" }, 
  birthDate: { type: Date },              

  // === 3. SOCIAL GRAPH ===
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

  category: { type: String, default: "Creator" }, 
  pronouns: { type: String, default: "" },        
  
  // === 4. STATUS AKUN ===
  isVerified: { type: Boolean, default: false }, 
  isAdmin:    { type: Boolean, default: false }, 
  isPrivate:  { type: Boolean, default: false }, 
  
  // === 5. LAINNYA ===
  fcmToken: { type: String, default: "" }, 

}, { 
  timestamps: true 
});

// ==========================================================
// [OPTIMISASI PENCARIAN] - PENTING!
// Membuat "Daftar Isi" (Text Index) untuk username & fullName.
// Ini membuat pencarian user berjalan INSTAN (O(1)) walau data jutaan.
// ==========================================================
UserSchema.index({ username: 'text', fullName: 'text' });

module.exports = mongoose.model('User', UserSchema);