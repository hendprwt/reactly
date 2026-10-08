import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Envelope, Lock, User, At } from 'phosphor-react';

const Register = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/auth/register', { username, email, password });
      alert("Akun berhasil dibuat! Silakan Login.");
      navigate('/login');
    } catch (err) {
      alert(err.response?.data?.message || "Registrasi Gagal. Coba username/email lain.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-row-reverse"> 
      {/* flex-row-reverse: Agar gambar ada di kanan (variasi dikit dari login) */}
      
      {/* BAGIAN GAMBAR (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 relative items-center justify-center overflow-hidden">
         <img 
            src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?q=80&w=2064&auto=format&fit=crop" 
            alt="Register Visual" 
            className="absolute inset-0 w-full h-full object-cover opacity-50"
         />
         <div className="relative z-10 p-12 text-white text-right">
            <h1 className="text-6xl font-black tracking-tighter mb-6">Create.</h1>
            <p className="text-2xl font-medium leading-relaxed">
               Share your masterpiece. Connect with designers. Build your portfolio.
            </p>
         </div>
      </div>

      {/* BAGIAN FORM REGISTER */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          
          <div className="lg:hidden mb-8 text-center">
             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Reactly.</h1>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Join us today</h2>
            <p className="text-slate-500">Start your journey with our community.</p>
          </div>

          <form onSubmit={handleRegister} className="flex flex-col gap-4">
            
            {/* Input Username */}
            <div className="relative group">
               <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-black transition">
                  <At size={24} />
               </div>
               <input 
                 type="text" 
                 placeholder="Username (e.g. elonmusk)" 
                 className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-12 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition font-medium text-slate-900"
                 value={username} onChange={(e) => setUsername(e.target.value)} required
               />
            </div>

            {/* Input Email */}
            <div className="relative group">
               <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-black transition">
                  <Envelope size={24} />
               </div>
               <input 
                 type="email" 
                 placeholder="Email address" 
                 className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-12 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition font-medium text-slate-900"
                 value={email} onChange={(e) => setEmail(e.target.value)} required
               />
            </div>

            {/* Input Password */}
            <div className="relative group">
               <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-black transition">
                  <Lock size={24} />
               </div>
               <input 
                 type="password" 
                 placeholder="Password" 
                 className="w-full bg-slate-50 border border-slate-200 p-3.5 pl-12 rounded-xl outline-none focus:border-black focus:ring-1 focus:ring-black transition font-medium text-slate-900"
                 value={password} onChange={(e) => setPassword(e.target.value)} required
               />
            </div>

            <button 
               disabled={loading}
               className="bg-black text-white p-4 rounded-full font-bold text-lg hover:opacity-80 transition active:scale-[0.98] disabled:opacity-70 mt-2"
            >
              {loading ? "Creating account..." : "Sign up"}
            </button>
          </form>

          <div className="mt-8 text-center">
             <p className="text-slate-500">
               Already have an account? {' '}
               <Link to="/login" className="text-black font-bold hover:underline">Log in</Link>
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Register;