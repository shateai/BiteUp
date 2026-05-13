/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import React, { useState, useMemo, useEffect } from "react";
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
  Grid,
  Zap
} from "lucide-react";
import { 
  collection, 
  onSnapshot, 
  query, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDoc,
  orderBy,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import { 
  signInAnonymously, 
  onAuthStateChanged, 
  User,
  GoogleAuthProvider,
  signInWithPopup,
  signOut
} from "firebase/auth";
import { db, auth } from "./lib/firebase";
import { getOptimizedImageUrl } from "./lib/cloudinary";

// --- Firestore Helpers ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Recipe {
  id: string; // Changed to string for Firestore ID
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

// --- Components ---
const RecipeCard = ({ 
  recipe, 
  i, 
  isLiked, 
  onSelect, 
  onToggleLike 
}: { 
  recipe: Recipe; 
  i: number; 
  isLiked: boolean; 
  onSelect: (r: Recipe) => void;
  onToggleLike: (id: string, e: React.MouseEvent) => void;
  key?: React.Key;
}) => (
  <motion.div 
    initial={{ opacity: 0, x: 20 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: i * 0.05 }}
    onClick={() => onSelect(recipe)}
    className="group cursor-pointer relative bg-white/5 border border-white/5 hover:border-blue-500/30 rounded-2xl p-4 flex items-center justify-between transition-all duration-300 h-24"
  >
    <div className="flex-1 pr-3">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="text-[7px] font-black uppercase tracking-tighter text-blue-400">{recipe.difficulty}</span>
        <span className="w-0.5 h-0.5 rounded-full bg-zinc-800" />
        <span className="text-[7px] font-bold text-zinc-600 uppercase">{recipe.time}</span>
      </div>
      <h4 className="text-[12px] font-bold text-zinc-100 group-hover:text-white transition-colors line-clamp-1">{recipe.title}</h4>
      <div className="flex items-center gap-2 mt-0.5">
        <p className="text-[8px] text-zinc-500 font-bold uppercase tracking-wider">{recipe.category}</p>
        <button 
          onClick={(e) => onToggleLike(recipe.id, e)}
          className="text-zinc-700 hover:text-blue-500 transition-colors"
        >
          <Zap size={9} fill={isLiked ? "#3b82f6" : "none"} className={isLiked ? "text-blue-500" : ""} />
        </button>
      </div>
    </div>

    <div className="relative w-16 h-16 shrink-0">
      <div className="absolute inset-0 rounded-full border border-blue-500/20 group-hover:border-blue-500/40 transition-colors z-10" />
      <img src={getOptimizedImageUrl(recipe.image)} alt="" className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-105" />
    </div>
  </motion.div>
);

export default function App() {
  const [activeTab, setActiveTab] = useState('home');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [likedRecipes, setLikedRecipes] = useState<Set<string>>(new Set());
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed:", error);
      signInAnonymously(auth).catch(console.error);
    }
  };

  const handleLogout = () => signOut(auth);

  const seedData: Recipe[] = useMemo(() => [
    {
      id: 'wild-mushroom-risotto',
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
      id: 'honey-glazed-salmon',
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
      id: 'roasted-beet-salad',
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

  // Authentication Setup
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUser(user);
        setLoading(false);
      } else {
        signInAnonymously(auth).catch((error) => {
          if (error.code === 'auth/admin-restricted-operation') {
            console.warn("Anonymous Auth is disabled. Using local fallback mode.");
          }
          setLoading(false);
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch Recipes and Seeding
  useEffect(() => {
    if (loading) return;

    const q = query(collection(db, "recipes"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const recipeData: Recipe[] = [];
      snapshot.forEach((doc) => {
        recipeData.push({ id: doc.id, ...doc.data() } as Recipe);
      });
      
      if (recipeData.length === 0 && auth.currentUser) {
        seedRecipes();
      } else if (recipeData.length > 0) {
        setRecipes(recipeData);
      }
    }, (error) => {
      console.warn("Firestore access error, recipes might not sync. Using local data.");
    });

    return () => unsubscribe();
  }, [loading, user]);

  // Fetch Likes for the current user
  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/likes`;
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const likes = new Set<string>();
      snapshot.forEach((doc) => {
        likes.add(doc.data().recipeId);
      });
      setLikedRecipes(likes);
    }, (error) => {
      // Quiet fail for likes if permissions are restricted
    });

    return () => unsubscribe();
  }, [user]);

  const seedRecipes = async () => {
    try {
      for (const r of seedData) {
        await setDoc(doc(db, "recipes", r.id), r);
      }
    } catch (error) {
      console.error("Seeding failed:", error);
    }
  };

  const toggleLike = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;

    try {
      if (likedRecipes.has(id)) {
        await deleteDoc(doc(db, "users", user.uid, "likes", id));
      } else {
        await setDoc(doc(db, "users", user.uid, "likes", id), {
          recipeId: id,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Like toggle failed:", error);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#050505] text-zinc-100 font-sans selection:bg-blue-500/30 flex items-center justify-center p-0 md:p-6">
      
      {/* Visual Texture */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[600px] h-[500px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

      {/* Main Container */}
      <div className="relative h-full w-full max-w-[440px] mx-auto flex flex-col bg-[#0a0a0a] border border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden rounded-[32px] md:rounded-[40px]">
        
        {/* Header */}
        <header className="px-8 pt-10 pb-6 flex justify-between items-center z-10">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-xl font-bold tracking-tight text-white">
              BiteUp
            </h1>
          </motion.div>
          
          <div className="flex items-center gap-3">
          </div>
        </header>

        {/* Categories - Compact Pill Buttons - Only show on home feed */}
        <AnimatePresence>
          {(activeTab === 'home' || ['all', 'trending', 'italian', 'vegan', 'dinner'].includes(activeTab)) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-8 py-2 flex gap-2 overflow-x-auto no-scrollbar whitespace-nowrap overflow-hidden"
            >
              {['All', 'Trending', 'Italian', 'Vegan', 'Dinner'].map((cat, i) => (
                <button
                  key={cat}
                  onClick={() => setActiveTab(cat.toLowerCase())}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border ${
                    activeTab === cat.toLowerCase() || (activeTab === 'home' && cat === 'All')
                    ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                    : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto no-scrollbar px-6 pb-32 transition-all duration-300 ${
          activeTab === 'home' || ['all', 'trending', 'italian', 'vegan', 'dinner'].includes(activeTab) ? 'pt-6' : 'pt-2'
        }`}>
          <AnimatePresence mode="wait">
            {activeTab === 'search' ? (
              <motion.div
                key="search"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-6"
              >
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                  <input 
                    type="text" 
                    placeholder="Search archives..." 
                    className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>
                
                <div>
                  <div className="flex flex-wrap gap-2">
                    {['Keto', 'Pasta', '30-min', 'Spicy', 'Desserts'].map(tag => (
                      <button key={tag} className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[10px] font-bold text-zinc-400 hover:text-white transition-colors">
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-10 flex flex-col items-center justify-center text-center opacity-30">
                  <UtensilsCrossed size={48} className="mb-4" />
                  <p className="text-xs font-bold uppercase tracking-widest leading-loose">
                    Transmission Ready<br/>Enter Search Parameters
                  </p>
                </div>
              </motion.div>
            ) : activeTab === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="px-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Settings</h2>
                </div>

                {user ? (
                  <div className="space-y-4">
                    {/* Compact User Card */}
                    <div className="bg-white/5 border border-white/5 p-4 rounded-2xl flex items-center gap-4">
                      <img 
                        src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} 
                        className="w-12 h-12 rounded-xl object-cover border border-white/10"
                        alt=""
                      />
                      <div>
                        <h3 className="text-sm font-bold text-white leading-tight">{user.displayName || 'BiteUp Operative'}</h3>
                        <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest mt-1">Status: Active</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                        <div className="text-[8px] font-black uppercase text-zinc-600 mb-1">Stored</div>
                        <div className="text-xl font-bold text-white tabular-nums">{likedRecipes.size}</div>
                      </div>
                      <div className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                        <div className="text-[8px] font-black uppercase text-zinc-600 mb-1">XP Level</div>
                        <div className="text-xl font-bold text-white tabular-nums">04</div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <button className="w-full py-4 bg-white/5 hover:bg-white/10 text-zinc-400 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all flex items-center justify-center gap-2">
                        <Share2 size={12} />
                        Sync Identity
                      </button>
                      <button 
                        onClick={handleLogout}
                        className="w-full py-4 bg-zinc-900/40 hover:bg-zinc-800/60 text-zinc-600 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 transition-all"
                      >
                        Terminate Session
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-blue-500/40">
                      <Zap size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white">Identity Required</h3>
                      <p className="text-zinc-500 text-xs mt-2 max-w-[200px] leading-relaxed mx-auto italic">
                        "Authentication needed to access secure archival metadata."
                      </p>
                    </div>
                    <button 
                      onClick={handleLogin}
                      className="group relative px-8 py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-[.15em] transition-all overflow-hidden flex items-center gap-3 shadow-xl"
                    >
                      <img src="https://www.google.com/favicon.ico" alt="" className="w-4 h-4" />
                      Log In to BiteUp
                    </button>
                  </div>
                )}
              </motion.div>
            ) : activeTab === 'favorites' ? (
              <motion.div
                key="favorites"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-4"
              >
                <div className="mb-4 px-2">
                  <h2 className="text-2xl font-bold text-white tracking-tight">Saved</h2>
                </div>

                {likedRecipes.size === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center opacity-40">
                    <Zap size={40} className="mb-4" />
                    <p className="text-sm">No saved sequences yet</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {(recipes.length > 0 ? recipes : seedData)
                      .filter(r => likedRecipes.has(r.id))
                      .map((recipe, i) => (
                        <RecipeCard 
                          key={recipe.id} 
                          recipe={recipe} 
                          i={i} 
                          isLiked={likedRecipes.has(recipe.id)}
                          onSelect={setSelectedRecipe}
                          onToggleLike={toggleLike}
                        />
                      ))}
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="feed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="space-y-4">
                  <div className="flex justify-between items-end mb-4 px-2">
                    <div>
                      <h2 className="text-2xl font-bold text-white tracking-tight">Feed</h2>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {(recipes.length > 0 ? recipes : seedData)
                      .filter(r => activeTab === 'all' || activeTab === 'home' || r.category.toLowerCase() === activeTab)
                      .map((recipe, i) => (
                        <RecipeCard 
                          key={recipe.id} 
                          recipe={recipe} 
                          i={i} 
                          isLiked={likedRecipes.has(recipe.id)}
                          onSelect={setSelectedRecipe}
                          onToggleLike={toggleLike}
                        />
                      ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Premium Navigation Bar */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-30">
          <nav className="h-14 bg-zinc-900/40 backdrop-blur-2xl rounded-3xl flex items-center px-2 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            {[
              { id: 'home', icon: Grid, label: 'Feed' },
              { id: 'search', icon: Search, label: 'Search' },
              { id: 'favorites', icon: Zap, label: 'Saved' },
              { id: 'profile', icon: Users, label: 'Settings' }
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative px-5 py-2 group transition-all"
              >
                <div className={`relative z-10 transition-colors duration-300 ${
                  activeTab === item.id ? 'text-blue-400' : 'text-zinc-600 group-hover:text-zinc-400'
                }`}>
                  <item.icon size={20} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                </div>
                
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="navActiveBg"
                    className="absolute inset-0 bg-blue-500/10 rounded-2xl"
                    transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                  />
                )}
                
                {activeTab === item.id && (
                  <motion.div 
                    layoutId="navDot"
                    className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full shadow-[0_0_10px_#3b82f6]"
                  />
                )}
              </button>
            ))}
          </nav>
        </div>
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
                    <h2 className="text-3xl font-bold text-white mt-1 leading-tight tracking-tight">
                      {selectedRecipe.title}
                    </h2>
                    <div className="flex items-center gap-2 mt-2">
                       <span className="text-[10px] text-zinc-500 font-bold uppercase">{selectedRecipe.category}</span>
                       <span className="text-[10px] text-zinc-700 mx-1">/</span>
                       <span className="text-[10px] text-blue-500 font-bold">★ {selectedRecipe.rating}</span>
                    </div>
                  </div>
                  
                  <div className="relative w-28 h-28 shrink-0">
                    <div className="absolute inset-0 rounded-full border-4 border-blue-500/10 z-10" />
                    <img src={getOptimizedImageUrl(selectedRecipe.image)} alt="" className="w-full h-full object-cover rounded-full shadow-2xl" />
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

                <div className="space-y-10">
                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/60 mb-4 flex items-center gap-3">
                      Ingredients
                      <div className="h-px flex-1 bg-white/5" />
                    </h3>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-2 py-1">
                          <div className="w-1 h-1 rounded-full bg-blue-500/30" />
                          <span className="text-[12px] font-medium text-zinc-400 truncate">{ing}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500/60 mb-6 flex items-center gap-3">
                      Preparation
                      <div className="h-px flex-1 bg-white/5" />
                    </h3>
                    <div className="space-y-6">
                      {selectedRecipe.instructions.map((step, i) => (
                        <div key={i} className="flex gap-5">
                          <div className="text-[11px] font-black text-blue-500/40 tabular-nums pt-0.5">
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

              {/* Action Bar - Modern sequence in bottom right */}
              <div className="px-10 py-8 bg-[#0a0a0a] border-t border-white/5 flex items-center justify-between gap-3">
                 <button className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all active:scale-95 shadow-[0_10px_30px_rgba(59,130,246,0.2)] flex items-center justify-center gap-2">
                    <Play size={12} fill="currentColor" />
                    Start Lesson
                 </button>

                 <button 
                  onClick={(e) => toggleLike(selectedRecipe.id, e)}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-90"
                 >
                    <Zap size={18} fill={likedRecipes.has(selectedRecipe.id) ? "#3b82f6" : "none"} className={likedRecipes.has(selectedRecipe.id) ? "text-blue-500" : ""} />
                 </button>

                 <button 
                  onClick={() => setSelectedRecipe(null)}
                  className="w-12 h-12 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-90"
                 >
                    <X size={18} />
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
