"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Lock, Mail, Store, PlayCircle, Sun, Moon } from 'lucide-react';

interface AuthScreenProps {
  onLogin: (restaurantName: string) => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [restaurantName, setRestaurantName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simulate auth
    onLogin(restaurantName || "Ristorante Demo");
  };

  return (
    <div className="h-screen w-screen bg-aura-black flex items-center justify-center relative overflow-hidden font-sans">
      
      {/* Background Ambience */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-20" 
        style={{ 
            backgroundImage: `
                linear-gradient(to right, #122a1d 1px, transparent 1px),
                linear-gradient(to bottom, #122a1d 1px, transparent 1px)
            `, 
            backgroundSize: '40px 40px' 
        }}
      />
      <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-transparent to-aura-black/90 pointer-events-none" />
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-aura-primary/10 rounded-full blur-[100px]" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-aura-primary/5 rounded-full blur-[100px]" />

      {/* Main Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md z-10"
      >
        <div className="bg-aura-card/80 backdrop-blur-xl border border-aura-border rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          
          {/* Top Shine */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-aura-primary/50 to-transparent opacity-50" />

          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div className="w-12 h-12 bg-aura-primary rounded-xl flex items-center justify-center text-black font-bold text-2xl mx-auto mb-4 shadow-[0_0_20px_-5px_rgba(0,227,107,0.5)]">
              A
            </div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">helloTable</h1>
            <p className="text-sm text-gray-500 mt-2">
              {isLogin ? 'Bentornato nel tuo spazio.' : 'Inizia a gestire la tua sala.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {!isLogin && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="space-y-4 overflow-hidden"
                >
                  <div className="relative group">
                    <Store className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-aura-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Nome Ristorante"
                      value={restaurantName}
                      onChange={(e) => setRestaurantName(e.target.value)}
                      className="w-full bg-aura-black/50 border border-aura-border rounded-xl py-3 pl-10 pr-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-aura-primary/50 focus:bg-aura-black/80 transition-all"
                      required={!isLogin}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-aura-primary transition-colors" size={18} />
              <input 
                type="email" 
                placeholder="Indirizzo Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-aura-black/50 border border-aura-border rounded-xl py-3 pl-10 pr-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-aura-primary/50 focus:bg-aura-black/80 transition-all"
                required
              />
            </div>

            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-aura-primary transition-colors" size={18} />
              <input 
                type="password" 
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-aura-black/50 border border-aura-border rounded-xl py-3 pl-10 pr-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-aura-primary/50 focus:bg-aura-black/80 transition-all"
                required
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3.5 rounded-xl bg-aura-primary text-black font-bold text-sm hover:bg-aura-secondary transition-all shadow-[0_0_20px_-5px_rgba(0,227,107,0.3)] flex items-center justify-center gap-2 mt-6"
            >
              <span>{isLogin ? 'Accedi' : 'Crea Account'}</span>
              <ArrowRight size={18} />
            </button>
          </form>

          {/* Toggle */}
          <div className="mt-6 text-center border-t border-aura-border pt-4">
            <p className="text-xs text-gray-500 mb-4">
              {isLogin ? 'Non hai un account?' : 'Hai già un account?'}
              <button 
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-aura-primary hover:text-white transition-colors font-medium"
              >
                {isLogin ? 'Registrati ora' : 'Accedi'}
              </button>
            </p>
            
            {/* Demo Scenarios */}
            <div className="grid grid-cols-2 gap-3 mt-4">
                <button 
                    onClick={() => onLogin("Demo Morning")}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-aura-border bg-aura-black/40 hover:bg-aura-primary/10 hover:border-aura-primary/30 transition-all group"
                >
                    <div className="p-2 rounded-full bg-orange-500/10 text-orange-400 group-hover:text-orange-300 transition-colors">
                        <Sun size={18} />
                    </div>
                    <div className="text-center">
                        <span className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">Morning Prep</span>
                        <span className="block text-[9px] text-gray-500 group-hover:text-gray-400">11:00 AM • Planning</span>
                    </div>
                </button>

                <button 
                    onClick={() => onLogin("Demo Evening")}
                    className="flex flex-col items-center justify-center gap-2 p-3 rounded-xl border border-aura-border bg-aura-black/40 hover:bg-aura-primary/10 hover:border-aura-primary/30 transition-all group"
                >
                    <div className="p-2 rounded-full bg-indigo-500/10 text-indigo-400 group-hover:text-indigo-300 transition-colors">
                        <Moon size={18} />
                    </div>
                    <div className="text-center">
                        <span className="block text-[10px] font-bold text-gray-300 uppercase tracking-wider">Evening Service</span>
                        <span className="block text-[9px] text-gray-500 group-hover:text-gray-400">21:25 PM • Rush Hour</span>
                    </div>
                </button>
            </div>
          </div>

        </div>
        
        {/* Footer info */}
        <div className="text-center mt-8 text-xs text-gray-600">
          <p>© 2024 Aura Systems. Mission Critical Horeca.</p>
        </div>

      </motion.div>
    </div>
  );
};

export default AuthScreen;
