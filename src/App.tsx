/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import React, { useState, useMemo, useEffect } from "react";
import { 
  Search, 
  PlusSquare,
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
  Zap,
  Sparkles,
  Loader2
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
  getDocs,
  addDoc
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
import { GoogleGenAI } from "@google/genai";

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

interface PantryItem {
  id: string;
  name: string;
  image: string;
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
          className="text-zinc-700 hover:text-blue-500 transition-colors relative"
        >
          <AnimatePresence mode="popLayout">
            {isLiked && (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 0], opacity: [0, 0.5, 0] }}
                transition={{ duration: 0.4 }}
                className="absolute inset-0 bg-blue-500 rounded-full blur-sm"
              />
            )}
          </AnimatePresence>
          <motion.div
            key={isLiked ? 'liked' : 'unliked'}
            initial={isLiked ? { scale: 0.5, rotate: -20 } : { scale: 1 }}
            animate={{ scale: 1, rotate: 0 }}
            whileTap={{ scale: 1.5, rotate: 15 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}
          >
            <Zap size={9} fill={isLiked ? "#3b82f6" : "none"} className={isLiked ? "text-blue-500" : ""} />
          </motion.div>
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
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [generatingIngredient, setGeneratingIngredient] = useState<string | null>(null);
  const [customIngredient, setCustomIngredient] = useState('');

  // Filter States
  const [showFilterUI, setShowFilterUI] = useState(false);
  const [filterMaxTime, setFilterMaxTime] = useState<number | null>(null);
  const [filterDifficulty, setFilterDifficulty] = useState<'Easy' | 'Medium' | 'Hard' | null>(null);
  
  // Search States
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);

  // Form State for creating a recipe
  const [newRecipe, setNewRecipe] = useState({
    title: '',
    category: '',
    time: '',
    difficulty: 'Easy' as const,
    ingredients: '',
    instructions: '',
    image: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  useEffect(() => {
    if (!user) return;
    const path = `users/${user.uid}/pantry`;
    const unsubscribe = onSnapshot(collection(db, path), (snapshot) => {
      const items: PantryItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as PantryItem);
      });
      setPantry(items);
    });

    return () => unsubscribe();
  }, [user]);

  const processImage = async (base64: string): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const MAX_DIM = 400; // Limit size to ensure staying under 1MB
        let width = img.width;
        let height = img.height;
        
        if (width > height) {
          if (width > MAX_DIM) {
            height *= MAX_DIM / width;
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width *= MAX_DIM / height;
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) { resolve(base64); return; }
        
        ctx.drawImage(img, 0, 0, width, height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i+1], b = data[i+2];
          
          // Enhanced Chroma Key for Neon Green
          // We check if Green is significantly dominant over Red and Blue
          const isGreen = (g > 130 && g > r * 1.25 && g > b * 1.25);
          
          if (isGreen) {
            data[i+3] = 0;
          }
        }
        ctx.putImageData(imageData, 0, 0);
        // Use lower quality to guarantee size limit
        resolve(canvas.toDataURL('image/png', 0.8));
      };
      img.src = base64;
    });
  };

  const handleGenerateIngredient = async (name: string) => {
    if (!user) { handleLogin(); return; }
    setGeneratingIngredient(name);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `A professional, ultra-realistic 3D render of a single ${name}, centered, 1:1 aspect ratio. The object MUST be isolated on a FLAT, SOLID, VIBRANT NEON-GREEN (hex #00FF00) background. NO shadows on the background, NO other objects, pure isolation.`;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts: [{ text: prompt }] },
      });

      let base64 = "";
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          base64 = `data:image/png;base64,${part.inlineData.data}`;
          break;
        }
      }

      if (base64) {
        const processedBase64 = await processImage(base64);
        await addDoc(collection(db, "users", user.uid, "pantry"), {
          name,
          image: processedBase64,
          userId: user.uid,
          createdAt: serverTimestamp()
        });
        if (customIngredient === name) setCustomIngredient('');
      }
    } catch (error) {
      console.error("Generation failed:", error);
    } finally {
      setGeneratingIngredient(null);
    }
  };

  const seedRecipes = async () => {
    try {
      for (const r of seedData) {
        await setDoc(doc(db, "recipes", r.id), r);
      }
    } catch (error) {
      console.error("Seeding failed:", error);
    }
  };

  const handleCreateRecipe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      handleLogin();
      return;
    }
    if (!newRecipe.title || !newRecipe.category) return;

    setIsSubmitting(true);
    try {
      const recipeId = newRecipe.title.toLowerCase().replace(/ /g, '-');
      const recipeData: Omit<Recipe, 'id'> = {
        title: newRecipe.title,
        category: newRecipe.category,
        author: user.displayName || 'BiteUp Operative',
        time: newRecipe.time || '20 min',
        difficulty: newRecipe.difficulty,
        calories: Math.floor(Math.random() * 500) + 200,
        rating: 5.0,
        image: newRecipe.image || "https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=800&q=80",
        description: `A delicious ${newRecipe.category.toLowerCase()} dish created by ${user.displayName || 'BiteUp Operative'}.`,
        ingredients: newRecipe.ingredients.split(',').map(i => i.trim()).filter(i => i !== ''),
        instructions: newRecipe.instructions.split('\n').map(i => i.trim()).filter(i => i !== '')
      };

      await setDoc(doc(db, "recipes", recipeId), recipeData);
      
      // Reset form and go back to home
      setNewRecipe({
        title: '',
        category: '',
        time: '',
        difficulty: 'Easy',
        ingredients: '',
        instructions: '',
        image: ''
      });
      setActiveTab('home');
    } catch (error) {
      console.error("Failed to create recipe:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isNavHidden = activeTab === 'create' || !!selectedRecipe;
    
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
        
        {/* Header Section */}
        <div className="pt-10 px-8 flex justify-between items-start z-20">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
            <h1 className="text-xl font-bold tracking-tight text-white">BiteUp</h1>
          </motion.div>

          <AnimatePresence mode="wait">
            {activeTab === 'home' || ['all', 'trending', 'italian', 'vegan', 'dinner'].includes(activeTab) ? (
              <motion.div
                key="title-feed"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-right"
              >
                <h2 className="text-xl font-bold text-white tracking-tight">Feed</h2>
              </motion.div>
            ) : activeTab === 'create' ? (
              <motion.div
                key="title-create"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-right"
              >
                <h2 className="text-xl font-bold text-white tracking-tight">New Recipe</h2>
              </motion.div>
            ) : activeTab === 'favorites' ? (
              <motion.div
                key="title-fav"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-right"
              >
                <h2 className="text-xl font-bold text-white tracking-tight">Saved</h2>
              </motion.div>
            ) : activeTab === 'profile' ? (
              <motion.div
                key="title-profile"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="text-right"
              >
                <h2 className="text-xl font-bold text-white tracking-tight">Settings</h2>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        {/* Spacing adjustments for content area since breadcrumb is removed */}
        <div className="h-6" />

        {/* Categories & Filters */}
        <AnimatePresence>
          {(activeTab === 'home' || ['all', 'trending', 'italian', 'vegan', 'dinner'].includes(activeTab)) && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="px-8 pb-4 space-y-4"
            >
              {/* Category Pills & Search */}
              <div className="flex items-center gap-2 h-10">
                <div className="flex-1 flex gap-2 overflow-hidden items-center">
                  <AnimatePresence mode="popLayout">
                    {showSearchInput ? (
                      <motion.div
                        key="search-box"
                        initial={{ opacity: 0, x: -20, width: 0 }}
                        animate={{ opacity: 1, x: 0, width: '100%' }}
                        exit={{ opacity: 0, x: -20, width: 0 }}
                        className="relative flex-1"
                      >
                        <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                          autoFocus
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onBlur={() => !searchQuery && setShowSearchInput(false)}
                          placeholder="Search archives..."
                          className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-9 pr-8 text-[11px] focus:outline-none focus:border-blue-500/50 transition-all font-medium placeholder:text-zinc-700"
                        />
                        {searchQuery && (
                          <button 
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white"
                          >
                            <X size={10} />
                          </button>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="categories"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex gap-2"
                      >
                        {['All'].map((cat) => (
                          <button
                            key={cat}
                            onClick={() => setActiveTab(cat.toLowerCase())}
                            className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                              activeTab === cat.toLowerCase() || activeTab === 'home'
                              ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.2)]' 
                              : 'bg-white/5 text-zinc-600 border-white/5 hover:border-white/10 hover:text-zinc-400'
                            }`}
                          >
                            {cat}
                          </button>
                        ))}

                        {/* Active Filter Indicators */}
                        {filterMaxTime && (
                          <button
                            onClick={() => setFilterMaxTime(null)}
                            className="px-3 py-2 rounded-xl text-[9px] font-bold uppercase transition-all bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1.5"
                          >
                            <span>{filterMaxTime}m</span>
                            <X size={10} />
                          </button>
                        )}
                        {filterDifficulty && (
                          <button
                            onClick={() => setFilterDifficulty(null)}
                            className="px-3 py-2 rounded-xl text-[9px] font-bold uppercase transition-all bg-blue-500/10 text-blue-500 border border-blue-500/20 flex items-center gap-1.5"
                          >
                            <span>{filterDifficulty}</span>
                            <X size={10} />
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {!showSearchInput && (
                  <button 
                    onClick={() => setShowSearchInput(true)}
                    className={`h-10 w-10 flex items-center justify-center rounded-xl border transition-all shrink-0 ${
                      searchQuery
                      ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.3)]'
                      : 'bg-white/5 text-zinc-500 border-white/5 hover:border-white/10 hover:text-zinc-300'
                    }`}
                  >
                    <Search size={14} />
                  </button>
                )}
                
                {showSearchInput && !searchQuery && (
                  <button 
                    onClick={() => setShowSearchInput(false)}
                    className="text-[9px] font-black uppercase tracking-widest text-zinc-600 hover:text-zinc-400 transition-colors px-2"
                  >
                    Close
                  </button>
                )}
              </div>

              {/* Filter UI removed from here - moved to Bottom Sheet */}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filter Bottom Sheet */}
        <AnimatePresence>
          {showFilterUI && (
            <>
              {/* Backdrop - Lower z-index than nav */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowFilterUI(false)}
                className="absolute inset-0 bg-black/40 backdrop-blur-[2px] z-40"
              />
              
              {/* Compact Floating Filter Sheet */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 20, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-[96px] left-6 right-6 bg-zinc-900/90 backdrop-blur-2xl border border-white/10 rounded-[28px] p-5 z-40 shadow-[0_20px_50px_rgba(0,0,0,0.6)]"
              >
                <div className="space-y-4">
                  <div className="space-y-2.5">
                    <div className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600 ml-1">Max Duration</div>
                    <div className="grid grid-cols-4 gap-2">
                      {[15, 30, 45, 60].map(time => (
                        <button
                          key={time}
                          onClick={() => setFilterMaxTime(filterMaxTime === time ? null : time)}
                          className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${
                            filterMaxTime === time 
                            ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                            : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {time}m
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="text-[9px] font-black uppercase tracking-[0.15em] text-zinc-600 ml-1">Difficulty</div>
                    <div className="flex gap-2">
                      {['Easy', 'Medium', 'Hard'].map(d => (
                        <button
                          key={d}
                          onClick={() => setFilterDifficulty(filterDifficulty === d ? null : d as any)}
                          className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all border ${
                            filterDifficulty === d 
                            ? 'bg-blue-500 text-white border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]' 
                            : 'bg-white/5 border-white/5 text-zinc-500 hover:text-zinc-300'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="pt-2 flex gap-2">
                    <button 
                      onClick={() => {
                        setFilterMaxTime(null);
                        setFilterDifficulty(null);
                        setSearchQuery('');
                      }}
                      className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-[9px] font-black uppercase tracking-widest text-zinc-400 rounded-xl border border-white/5 transition-all"
                    >
                      Reset
                    </button>
                    <button 
                      onClick={() => setShowFilterUI(false)}
                      className="flex-1 h-12 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-[0_5px_15px_rgba(59,130,246,0.2)]"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content Area */}
        <main className={`flex-1 overflow-y-auto no-scrollbar px-6 pb-32 transition-all duration-300 ${
          activeTab === 'home' || ['all', 'trending', 'italian', 'vegan', 'dinner'].includes(activeTab) ? 'pt-6' : 'pt-2'
        }`}>
          <AnimatePresence mode="wait">
            {activeTab === 'profile' ? (
              <motion.div
                key="profile"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="h-4" />

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

                    <div className="space-y-4 py-2">
                        <div className="flex items-center justify-between px-1">
                          <section className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Archival Pantry</section>
                          <Sparkles size={12} className="text-blue-500/50" />
                        </div>
                        
                        {/* Pantry Grid */}
                        <div className="grid grid-cols-4 gap-2">
                          {pantry.map((item) => (
                            <div key={item.id} className="relative aspect-square bg-white/5 border border-white/5 rounded-2xl p-2 flex items-center justify-center group overflow-hidden">
                              <img src={item.image} alt={item.name} className="w-full h-full object-contain filter drop-shadow-[0_5px_10px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <button onClick={() => deleteDoc(doc(db, "users", user.uid, "pantry", item.id))} className="text-white">
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          {/* Custom Generator */}
                          <div className="col-span-2 relative aspect-[2/1] bg-white/5 border border-white/5 rounded-2xl overflow-hidden flex items-center px-3">
                            <input 
                              value={customIngredient}
                              onChange={e => setCustomIngredient(e.target.value)}
                              placeholder="Add Material..."
                              className="bg-transparent border-none text-[10px] font-bold w-full focus:outline-none placeholder:text-zinc-700"
                            />
                            {customIngredient && (
                              <button 
                                onClick={() => handleGenerateIngredient(customIngredient)}
                                disabled={!!generatingIngredient}
                                className="ml-2 text-blue-500 disabled:opacity-50"
                              >
                                {generatingIngredient === customIngredient ? <Loader2 size={12} className="animate-spin" /> : <PlusSquare size={12} />}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Quick Pantry Quick Select */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                          {['Egg', 'Milk', 'Bread', 'Cheese', 'Tomato', 'Avocado'].map((ing) => (
                            <button
                              key={ing}
                              disabled={!!generatingIngredient}
                              onClick={() => handleGenerateIngredient(ing)}
                              className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-[9px] font-bold uppercase tracking-wider text-zinc-500 hover:text-blue-400 hover:border-blue-500/30 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                            >
                              {generatingIngredient === ing && <Loader2 size={10} className="animate-spin text-blue-500" />}
                              {ing}
                            </button>
                          ))}
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
                <div className="h-4" />

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
                <div className="space-y-3">
                  {(recipes.length > 0 ? recipes : seedData)
                    .filter(r => {
                      const matchesTab = activeTab === 'all' || activeTab === 'home' || r.category.toLowerCase() === activeTab;
                      const matchesTime = !filterMaxTime || parseInt(r.time) <= filterMaxTime;
                      const matchesDiff = !filterDifficulty || r.difficulty === filterDifficulty;
                      const matchesSearch = !searchQuery || 
                        r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        r.category.toLowerCase().includes(searchQuery.toLowerCase());
                      return matchesTab && matchesTime && matchesDiff && matchesSearch;
                    })
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
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Floating Navigation Bar */}
        <AnimatePresence>
          {!isNavHidden && (
            <motion.div 
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="absolute bottom-8 left-1/2 -translate-x-1/2 z-50"
            >
              <nav className="h-14 bg-zinc-900/60 backdrop-blur-2xl rounded-3xl flex items-center px-1 border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                {[
                  { id: 'profile', icon: Users, label: 'Settings' },
                  { id: 'favorites', icon: Zap, label: 'Saved' },
                  { id: 'create', icon: PlusSquare, label: 'Create' },
                  { id: 'home', icon: Grid, label: 'Feed' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.id === 'home' && (activeTab === 'home' || ['all', 'trending', 'italian', 'vegan', 'dinner'].includes(activeTab))) {
                        setShowFilterUI(!showFilterUI);
                      } else {
                        setActiveTab(item.id);
                        if (item.id !== 'home') setShowFilterUI(false);
                      }
                    }}
                    className="relative px-5 py-2 group transition-all"
                  >
                    <div className={`relative z-10 transition-all duration-300 ${
                      activeTab === item.id || (item.id === 'home' && ['all', 'trending', 'italian', 'vegan', 'dinner'].includes(activeTab)) 
                      ? 'text-blue-500' 
                      : 'text-zinc-600 group-hover:text-zinc-400'
                    }`}>
                      <item.icon size={18} strokeWidth={activeTab === item.id ? 2.5 : 2} />
                    </div>
                    
                    {(activeTab === item.id || (item.id === 'home' && ['all', 'trending', 'italian', 'vegan', 'dinner'].includes(activeTab))) && (
                      <motion.div 
                        layoutId="navActiveBg"
                        className="absolute inset-0 bg-blue-500/10 rounded-2xl"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                    
                    {(activeTab === item.id || (item.id === 'home' && ['all', 'trending', 'italian', 'vegan', 'dinner'].includes(activeTab))) && (
                      <motion.div 
                        layoutId="navActiveDot"
                        className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-blue-500 rounded-full"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                ))}
              </nav>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Create Recipe Bottom Sheet */}
      <AnimatePresence>
        {activeTab === 'create' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center p-0 md:p-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setActiveTab('home')} />
            
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="relative w-full max-w-[440px] bg-[#0a0a0a] rounded-t-[40px] md:rounded-[40px] overflow-hidden flex flex-col border border-white/10 shadow-[0_-20px_100px_rgba(0,0,0,0.8)]"
              style={{ height: '92%' }}
            >
              <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mt-4 shrink-0" />
              
              <div className="px-8 pt-8 pb-4 flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold text-white tracking-tight">Synthesize Recipe</h3>
                <button 
                  onClick={() => setActiveTab('home')}
                  className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-zinc-500"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto no-scrollbar px-8 pb-10">
                <form onSubmit={handleCreateRecipe} className="space-y-6 py-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Archival Name</label>
                    <input 
                      required
                      value={newRecipe.title}
                      onChange={e => setNewRecipe({...newRecipe, title: e.target.value})}
                      type="text" 
                      placeholder="e.g., Neon Shoyu Ramen" 
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Category Tag</label>
                      <input 
                        required
                        value={newRecipe.category}
                        onChange={e => setNewRecipe({...newRecipe, category: e.target.value})}
                        type="text" 
                        placeholder="Asian" 
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700 font-medium"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Tempo (min)</label>
                      <input 
                        value={newRecipe.time}
                        onChange={e => setNewRecipe({...newRecipe, time: e.target.value})}
                        type="text" 
                        placeholder="25 min" 
                        className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-blue-500/50 transition-all placeholder:text-zinc-700 font-medium"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Difficulty Threshold</label>
                    <div className="flex gap-2">
                      {['Easy', 'Medium', 'Hard'].map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => setNewRecipe({...newRecipe, difficulty: d as any})}
                          className={`flex-1 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            newRecipe.difficulty === d
                            ? 'bg-blue-500 text-white border-blue-500 shadow-[0_5px_15px_rgba(59,130,246,0.3)]'
                            : 'bg-white/5 text-zinc-600 border-white/5'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Material List</label>
                    <textarea 
                      value={newRecipe.ingredients}
                      onChange={e => setNewRecipe({...newRecipe, ingredients: e.target.value})}
                      placeholder="Ingredient 1, Ingredient 2..." 
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-blue-500/50 transition-all min-h-[100px] placeholder:text-zinc-700 font-medium resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-zinc-600">Operational Steps</label>
                    <textarea 
                      value={newRecipe.instructions}
                      onChange={e => setNewRecipe({...newRecipe, instructions: e.target.value})}
                      placeholder="Step 1 sequence...&#10;Step 2 sequence..." 
                      className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:border-blue-500/50 transition-all min-h-[140px] placeholder:text-zinc-700 font-medium resize-none"
                    />
                  </div>

                  <div className="pt-4">
                    <button 
                      disabled={isSubmitting}
                      type="submit"
                      className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.25em] transition-all disabled:opacity-50 active:scale-95 shadow-[0_15px_40px_rgba(59,130,246,0.3)]"
                    >
                      {isSubmitting ? 'Processing Uplink...' : 'Synchronize New Recipe'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Recipe Detail Bottom Sheet */}
      <AnimatePresence>
        {selectedRecipe && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-end justify-center p-0 md:p-6"
          >
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedRecipe(null)} />
            
            <motion.div
              layoutId={`recipe-${selectedRecipe.id}`}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300, mass: 0.8 }}
              className="relative w-full max-w-[440px] bg-[#0a0a0a] rounded-t-[40px] md:rounded-[40px] overflow-hidden flex flex-col border border-white/10 shadow-[0_-20px_100px_rgba(0,0,0,0.8)]"
              style={{ height: '88%' }}
            >
              <div className="w-12 h-1 bg-zinc-800 rounded-full mx-auto mt-4 shrink-0" />
              
              <div className="flex-1 overflow-y-auto no-scrollbar px-10 pt-6 pb-10">
                <div className="flex items-center justify-between gap-6 mb-5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-blue-500">{selectedRecipe.category}</span>
                    </div>
                    <h2 className="text-2xl font-bold text-white leading-tight tracking-tight">
                      {selectedRecipe.title}
                    </h2>
                    <p className="text-zinc-500 text-[9px] font-bold uppercase mt-1 tracking-widest flex items-center gap-2">
                      <Users size={10} /> {selectedRecipe.author}
                    </p>
                  </div>
                  
                  <div className="relative w-16 h-16 shrink-0">
                    <div className="absolute inset-0 rounded-full border border-blue-500/20 z-10" />
                    <img src={getOptimizedImageUrl(selectedRecipe.image)} alt="" className="w-full h-full object-cover rounded-full shadow-2xl" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 py-3.5 border-y border-white/5 mb-6">
                  {[
                    { val: selectedRecipe.time, label: 'Duration' },
                    { val: selectedRecipe.difficulty, label: 'Level' },
                    { val: selectedRecipe.calories, label: 'Kcal' }
                  ].map((s) => (
                    <div key={s.label} className="bg-white/5 rounded-2xl p-2 text-center">
                      <div className="text-[10px] font-black text-white leading-none mb-1 tabular-nums">{s.val}</div>
                      <div className="text-[8px] font-black uppercase tracking-tighter text-zinc-600">{s.label}</div>
                    </div>
                  ))}
                </div>

                <div className="space-y-8">
                  <section>
                    <div className="flex items-baseline justify-between mb-3">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Elements</h3>
                      <span className="text-[8px] font-bold text-zinc-700">{selectedRecipe.ingredients.length} Items</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {selectedRecipe.ingredients.map((ing, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-1 h-1 rounded-full bg-blue-600/40" />
                          <span className="text-[11px] font-medium text-zinc-300">{ing}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-baseline justify-between mb-5">
                      <h3 className="text-[9px] font-black uppercase tracking-[0.3em] text-zinc-500">Execution</h3>
                      <span className="text-[8px] font-bold text-zinc-700">Sequence</span>
                    </div>
                    <div className="space-y-5">
                      {selectedRecipe.instructions.map((step, i) => (
                        <div key={i} className="relative pl-7">
                          <div className="absolute left-0 top-0.5 w-4.5 h-4.5 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-[8px] font-black text-blue-500 tabular-nums">
                            {i + 1}
                          </div>
                          <p className="text-[12px] leading-relaxed text-zinc-400 font-light">
                            {step}
                          </p>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>

              <div className="px-10 py-8 bg-[#0a0a0a]/80 backdrop-blur-xl border-t border-white/5 flex items-center gap-3 shrink-0">
                 <button className="flex-1 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] transition-all active:scale-95 shadow-[0_15px_40px_rgba(59,130,246,0.3)] flex items-center justify-center gap-3">
                    <Play size={14} fill="currentColor" />
                    Start
                 </button>

                 <button 
                  onClick={(e) => toggleLike(selectedRecipe.id, e)}
                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-90 relative overflow-hidden"
                 >
                    <AnimatePresence mode="popLayout">
                      {likedRecipes.has(selectedRecipe.id) && (
                        <motion.div
                          initial={{ scale: 0, opacity: 0 }}
                          animate={{ scale: [0, 2, 0], opacity: [0, 0.4, 0] }}
                          transition={{ duration: 0.5 }}
                          className="absolute inset-0 bg-blue-500 rounded-full blur-md"
                        />
                      )}
                    </AnimatePresence>
                    <motion.div
                      key={likedRecipes.has(selectedRecipe.id) ? 'liked' : 'unliked'}
                      initial={likedRecipes.has(selectedRecipe.id) ? { scale: 0.8, rotate: -20 } : { scale: 1 }}
                      animate={{ scale: 1, rotate: 0 }}
                      whileTap={{ scale: 1.4, rotate: 15 }}
                      transition={{ type: "spring", stiffness: 400, damping: 10 }}
                    >
                      <Zap size={20} fill={likedRecipes.has(selectedRecipe.id) ? "#3b82f6" : "none"} className={likedRecipes.has(selectedRecipe.id) ? "text-blue-500" : ""} />
                    </motion.div>
                 </button>

                 <button 
                  onClick={() => setSelectedRecipe(null)}
                  className="w-14 h-14 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-zinc-500 hover:text-white transition-all active:scale-90"
                 >
                    <X size={20} />
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
