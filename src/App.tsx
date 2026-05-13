/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import React, { useState, useMemo } from "react";
import { 
  Search, 
  ChefHat, 
  Clock, 
  Flame, 
  Heart, 
  UtensilsCrossed, 
  Bookmark,
  ChevronRight,
  ArrowLeft,
  X,
  Play,
  Share2,
  Users,
  Sun,
  Moon
} from "lucide-react";

interface Recipe {
  id: number;
  title: string;
  category: string;
  author: string;
  time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  calories: number;
  rating: number;
  image: string;
  description: string;
  ingredients: string[];
  instructions: string[];
}

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [likedRecipes, setLikedRecipes] = useState<Set<number>>(new Set());

  const recipes: Recipe[] = useMemo(() => [
    {
      id: 1,
      title: "Wild Mushroom Risotto",
      category: "Italian",
      author: "Chef Julian",
      time: "45 min",
      difficulty: "Medium",
      calories: 420,
      rating: 4.9,
      image: "https://images.unsplash.com/photo-1476124369491-e7addf5db371?w=800&q=80",
      description: "A rich, creamy Italian classic featuring a blend of forest mushrooms and aged Parmesan cheese.",
      ingredients: ["Arborio rice", "Wild mushrooms", "Vegetable stock", "Parmesan", "White wine", "Shallots", "Garlic", "Fresh thyme"],
      instructions: [
        "Sauté mushrooms until golden and set aside.",
        "Toast rice with shallots and garlic until translucent.",
        "Add wine and simmer until absorbed.",
        "Slowly add warm stock, one ladle at a time, stirring constantly.",
        "Finish with butter, Parmesan, and the sautéed mushrooms."
      ]
    },
    {
      id: 2,
      title: "Honey Glazed Salmon",
      category: "Seafood",
      author: "Elena Rossi",
      time: "20 min",
      difficulty: "Easy",
      calories: 320,
      rating: 4.8,
      image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=800&q=80",
      description: "Quick and elegant soy-honey glazed salmon served with steamed bok choy.",
      ingredients: ["Salmon fillets", "Honey", "Soy sauce", "Lemon juice", "Ginger", "Garlic", "Bok choy"],
      instructions: [
        "Whisk together honey, soy, lemon, ginger, and garlic.",
        "Marinate salmon for 10 minutes.",
        "Sear salmon in a hot pan for 3-4 minutes per side.",
        "Glaze with remaining sauce until thickened."
      ]
    },
    {
      id: 3,
      title: "Roasted Beet Salad",
      category: "Salads",
      author: "Marcus Wei",
      time: "15 min",
      difficulty: "Easy",
      calories: 210,
      rating: 4.7,
      image: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=80",
      description: "Vibrant roasted beets with goat cheese, walnuts, and a balsamic reduction.",
      ingredients: ["Beets", "Goat cheese", "Walnuts", "Spinach", "Balsamic vinegar", "Olive oil"],
      instructions: [
        "Slice roasted beets into rounds.",
        "Arrange on a bed of fresh spinach.",
        "Top with crumbled goat cheese and toasted walnuts.",
        "Drizzle with balsamic reduction and olive oil."
      ]
    }
  ], []);

  const toggleLike = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newLiked = new Set(likedRecipes);
    if (newLiked.has(id)) newLiked.delete(id);
    else newLiked.add(id);
    setLikedRecipes(newLiked);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#050505] text-zinc-100 font-sans selection:bg-emerald-500/30 flex items-center justify-center p-0 md:p-6">
      
      {/* Visual Texture */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[500px] bg-emerald-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="relative h-full w-full max-w-[440px] mx-auto flex flex-col bg-[#0a0a0a] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden rounded-[32px] md:rounded-[40px]">
        
        {/* Header */}
        <header className="px-8 pt-10 pb-6 flex justify-between items-center z-10">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Savory.
            </h1>
            <p className="text-[9px] uppercase font-black tracking-[0.2em] text-zinc-600 mt-1">Version 2.0 / Dark Archive</p>
          </motion.div>
          <button className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
            <Search size={18} />
          </button>
        </header>

        {/* Categories - Compact Pill Buttons */}
        <div className="px-8 py-2 flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap">
          {['All', 'Trending', 'Italian', 'Vegan', 'Dinner'].map((cat, i) => (
            <button
              key={cat}
              className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                i === 0 
                ? 'bg-emerald-500 text-black border-emerald-500' 
                : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Recipe List - Vertical stack of compact horizontal panels */}
        <main className="flex-1 overflow-y-auto no-scrollbar px-6 pb-32 pt-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-[10px] uppercase font-black tracking-widest text-zinc-500">Curated Archive</h2>
            <div className="flex items-center gap-2">
               <span className="text-[9px] font-bold text-emerald-500/60 uppercase">Live Feed</span>
               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
            </div>
          </div>

          <div className="space-y-3">
            {recipes.map((recipe, i) => (
              <motion.div 
                key={recipe.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => setSelectedRecipe(recipe)}
                className="group cursor-pointer relative bg-white/5 hover:bg-white/[0.08] border border-white/5 hover:border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between transition-all duration-300"
              >
                <div className="flex-1 pr-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[7px] font-black uppercase tracking-tighter text-emerald-500/80">{recipe.difficulty}</span>
                    <span className="w-0.5 h-0.5 rounded-full bg-zinc-800" />
                    <span className="text-[7px] font-bold text-zinc-600 uppercase">{recipe.time}</span>
                  </div>
                  <h4 className="text-[12px] font-bold text-zinc-100 group-hover:text-white transition-colors line-clamp-1">{recipe.title}</h4>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">{recipe.category}</p>
                    <button 
                      onClick={(e) => toggleLike(recipe.id, e)}
                      className="text-zinc-700 hover:text-emerald-500 transition-colors"
                    >
                      <Heart size={9} fill={likedRecipes.has(recipe.id) ? "#10b981" : "none"} className={likedRecipes.has(recipe.id) ? "text-emerald-500" : ""} />
                    </button>
                  </div>
                </div>

                <div className="relative w-16 h-16 shrink-0">
                  <div className="absolute inset-0 rounded-full border border-emerald-500/20 group-hover:border-emerald-500/40 transition-colors z-10" />
                  <img src={recipe.image} alt="" className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-105" />
                </div>
              </motion.div>
            ))}
          </div>
          
          {/* Bottom Insights */}
          <div className="mt-8 p-5 rounded-2xl bg-zinc-900/50 border border-white/5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 shrink-0">
              <ChefHat size={18} />
            </div>
            <div>
              <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Expert Mode</h5>
              <p className="text-[11px] text-zinc-500 leading-tight">Syncing your flavor profile with global trends.</p>
            </div>
          </div>
        </main>

        {/* Minimal Navigation Bar */}
        <nav className="absolute bottom-8 left-1/2 -translate-x-1/2 w-[220px] h-12 bg-white/5 backdrop-blur-xl rounded-2xl flex justify-around items-center px-4 border border-white/10 shadow-2xl z-20">
           {[
             { id: 'home', icon: UtensilsCrossed },
             { id: 'discover', icon: ChefHat },
             { id: 'favorites', icon: Heart },
             { id: 'users', icon: Users }
           ].map((item) => (
             <button
               key={item.id}
               onClick={() => setActiveTab(item.id)}
               className={`p-1.5 transition-all ${
                 activeTab === item.id ? 'text-emerald-500 scale-110' : 'text-zinc-600 hover:text-zinc-400'
               }`}
             >
               <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
               {activeTab === item.id && (
                 <motion.div layoutId="navDot" className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0.5 h-0.5 bg-emerald-500 rounded-full shadow-[0_0_10px_#10b981]" />
               )}
             </button>
           ))}
        </nav>
      </div>

      {/* Modern Overlay - High End Drawer */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6"
          >
            <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-sm" onClick={() => setSelectedRecipe(null)} />
            
            <motion.div
              layoutId={`recipe-${selectedRecipe.id}`}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-[440px] h-full max-h-[700px] bg-[#0a0a0a] rounded-[32px] md:rounded-[40px] overflow-hidden flex flex-col border border-white/10 shadow-2xl"
            >
              <button 
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-6 left-8 w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white transition-all z-50"
              >
                <ArrowLeft size={18} />
              </button>

              <div className="flex-1 overflow-y-auto no-scrollbar px-10 pt-20 pb-10">
                {/* Clean Header with Right-side Circular Image */}
                <div className="flex items-center justify-between gap-6 mb-10">
                  <div className="flex-1 min-w-0">
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] text-emerald-500">
                      Archive {selectedRecipe.id}
                    </span>
                    <h2 className="text-3xl font-bold text-white mt-1 leading-tight tracking-tight">
                      {selectedRecipe.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-[10px] text-zinc-500 font-bold uppercase">{selectedRecipe.category}</span>
                       <span className="text-[10px] text-zinc-700 mx-1">/</span>
                       <span className="text-[10px] text-amber-500 font-bold">★ {selectedRecipe.rating}</span>
                    </div>
                  </div>
                  
                  <div className="relative w-28 h-28 shrink-0">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/10 z-10" />
                    <img src={selectedRecipe.image} alt="" className="w-full h-full object-cover rounded-full shadow-2xl" />
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex justify-between items-center py-5 border-y border-white/5 mb-10">
                  {[
                    { val: selectedRecipe.time, label: 'Duration' },
                    { val: selectedRecipe.difficulty, label: 'Level' },
                    { val: selectedRecipe.calories, label: 'Energy' }
                  ].map((s) => (
                    <div key={s.label} className="text-center px-2">
                      <div className="text-[13px] font-bold text-white leading-none mb-1">{s.val}</div>
                      <div className="text-[8px] font-black uppercase tracking-widest text-zinc-600">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-12">
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-6 flex items-center gap-3">
                      Ingredients
                      <div className="h-px flex-1 bg-white/5" />
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-3 py-2 border-b border-white/[0.03]">
                          <div className="w-1 h-1 rounded-full bg-emerald-500/40" />
                          <span className="text-[13px] font-medium text-zinc-400">{ing}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/60 mb-6 flex items-center gap-3">
                      Preparation
                      <div className="h-px flex-1 bg-white/5" />
                    </h3>
                    <div className="space-y-8">
                      {selectedRecipe.instructions.map((step, i) => (
                        <div key={i} className="flex gap-5">
                          <div className="text-[11px] font-black text-emerald-500/40 tabular-nums pt-0.5">
                            {(i + 1).toString().padStart(2, '0')}
                          </div>
                          <p className="text-[13px] leading-relaxed text-zinc-300 font-light">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              {/* Action Bar */}
              <div className="px-10 py-8 bg-[#0a0a0a] border-t border-white/5 flex gap-4">
                 <button className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-400 text-black rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_10px_30px_rgba(16,185,129,0.2)]">
                    Activate Sequence
                 </button>
                 <button className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-colors">
                    <Share2 size={18} />
                 </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap');
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
      `}</style>
    </div>
  );
}
