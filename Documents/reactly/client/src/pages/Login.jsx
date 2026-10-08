import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Envelope, Lock, TwitterLogo } from 'phosphor-react'; // Gunakan icon logo/envelope

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await axios.post('http://localhost:5000/api/auth/login', { email, password });
      
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      
      navigate('/'); 
    } catch (err) {
      alert(err.response?.data?.message || "Login Gagal. Cek email/password Anda.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex">
      
      {/* BAGIAN KIRI: GAMBAR/BRANDING (Hanya tampil di Laptop/PC) */}
      <div className="hidden lg:flex lg:w-1/2 bg-black relative items-center justify-center overflow-hidden">
         {/* Background Image Estetik */}
         <img 
            src="https://images.unsplash.com/photo-1614850523060-8da1d56ae167?q=80&w=2070&auto=format&fit=crop" 
            alt="Login Visual" 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
         />
         <div className="relative z-10 p-12 text-white">
            <h1 className="text-6xl font-black tracking-tighter mb-6">Reactly.</h1>
            <p className="text-2xl font-medium leading-relaxed max-w-lg">
               See what's happening in the world right now. Join the conversation.
            </p>
         </div>
      </div>

      {/* BAGIAN KANAN: FORM LOGIN */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white">
        <div className="w-full max-w-md">
          
          {/* Logo Mobile */}
          <div className="lg:hidden mb-8 text-center">
             <h1 className="text-4xl font-black text-slate-900 tracking-tighter">Reactly.</h1>
          </div>

          <div className="mb-10">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2">Welcome back</h2>
            <p className="text-slate-500">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            
            {/* Input Email dengan Icon */}
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

            {/* Input Password dengan Icon */}
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

            <div className="flex justify-end">
               <button type="button" className="text-sm font-bold text-slate-900 hover:underline">Forgot password?</button>
            </div>

            <button 
               disabled={loading}
               className="bg-black text-white p-4 rounded-full font-bold text-lg hover:opacity-80 transition active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex justify-center"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="mt-8 text-center">
             <p className="text-slate-500">
               Don't have an account? {' '}
               <Link to="/register" className="text-black font-bold hover:underline">Sign up for free</Link>
             </p>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;