/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import React, { useState, useMemo } from "react";
import { 
  Home, 
  Search, 
  PlusSquare, 
  Heart, 
  User, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  SendHorizontal,
  Globe,
  X
} from "lucide-react";

interface Post {
  id: number;
  user: string;
  avatar: string;
  content: string;
  likes: number;
  comments: number;
  timestamp: string;
  image?: string;
  type: 'standard' | 'showcase' | 'course';
  price?: string; 
}

export default function App() {
  const [activeTab, setActiveTab] = useState('feed');
  const [isPostSheetOpen, setIsPostSheetOpen] = useState(false);
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [swallows, setSwallows] = useState(1240);
  const [postType, setPostType] = useState<'standard' | 'showcase' | 'course'>('standard');

  const mockPosts: Post[] = useMemo(() => [
    {
      id: 1,
      user: "Alex Rivera",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Alex",
      content: "Exploring the deep blue vibes of SwaBoard tonight. Launching my first board! 🚀",
      likes: 128,
      comments: 24,
      timestamp: "2h ago",
      image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&q=80",
      type: 'standard'
    },
    {
      id: 2,
      user: "Sarah Chen",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah",
      content: "Mastering the Flow: A complete guide to digital minimalism and SwaBoard strategy.",
      likes: 856,
      comments: 142,
      timestamp: "5h ago",
      type: 'course',
      price: '45 Swallows'
    },
    {
      id: 3,
      user: "Liquid Digital",
      avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Liquid",
      content: "Synchronizing systems. Pure flow state achieved. #SwaBoard #Vibe",
      likes: 45,
      comments: 3,
      timestamp: "12m ago",
      image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&q=80",
      type: 'showcase'
    }
  ], []);

  const mockActivities = [
    { id: 1, type: 'like', user: 'Marcus', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus', time: '5m ago' },
    { id: 2, type: 'comment', user: 'Elena', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Elena', time: '12m ago', text: 'Stunning visuals!' },
    { id: 3, type: 'boost', user: 'Orbital', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Orbital', time: '1h ago' },
  ];

  const searchTrends = [
    { tag: '#Strategy', posts: '15.2k' },
    { tag: '#Ethereal', posts: '12.4k' },
    { tag: '#BlueSwallows', posts: '9.8k' },
    { tag: '#FlowState', posts: '5.1k' },
  ];

  const toggleLike = (id: number) => {
    const newLiked = new Set(likedPosts);
    if (newLiked.has(id)) newLiked.delete(id);
    else newLiked.add(id);
    setLikedPosts(newLiked);
  };

  const handleBoost = () => {
    if (swallows >= 50) {
      setSwallows(prev => prev - 50);
    }
  };

  return (
    <div className="relative h-screen w-full overflow-hidden bg-[#020617] text-blue-50 font-sans selection:bg-blue-500/30">
      {/* Background Decor */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Main Content Area */}
      <div className="relative h-full w-full max-w-md mx-auto flex flex-col bg-black/40 backdrop-blur-3xl border-x border-white/5 shadow-2xl">
        
        {/* Header */}
        <header className="px-6 pt-6 pb-4 flex justify-between items-center z-20">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex flex-col"
          >
            <h1 className="text-2xl font-light tracking-tighter text-blue-100">
              Swa<span className="font-semibold text-blue-500">Board</span>
            </h1>
          </motion.div>
          <div className="flex gap-3">
             <motion.div 
              whileTap={{ scale: 0.9 }} 
              className="px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 flex items-center gap-2 cursor-pointer group"
             >
                <SendHorizontal size={14} className="text-blue-400 -rotate-45 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                <span className="text-xs font-medium text-blue-100">{swallows}</span>
             </motion.div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 overflow-y-auto no-scrollbar pb-24 px-4">
          <AnimatePresence mode="wait">
            {activeTab === 'feed' && (
              <motion.div 
                key="feed"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 pt-2"
              >
                {mockPosts.map((post, i) => (
                  <motion.div
                    key={post.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-xl group"
                  >
                    <div className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-blue-500/20 border border-white/10 p-0.5">
                          <img src={post.avatar} alt="" className="w-full h-full rounded-full" />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-blue-100 uppercase tracking-wide">{post.user}</span>
                            {post.type === 'course' && <span className="text-[8px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-[0.1em]">Course</span>}
                            {post.type === 'showcase' && <span className="text-[8px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-full border border-blue-500/30 uppercase tracking-[0.1em]">Showcase</span>}
                          </div>
                          <span className="text-[10px] text-blue-400/40">{post.timestamp}</span>
                        </div>
                      </div>
                      <button className="text-blue-400/40 hover:text-blue-400 transition-colors">
                        <MoreHorizontal size={20} />
                      </button>
                    </div>

                    <div className="px-5 pb-2 text-sm leading-relaxed text-blue-100/80 font-light">
                      {post.content}
                      {post.type === 'course' && post.price && (
                        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-100 text-xs font-normal">
                          <Globe size={12} className="text-blue-400" /> Unlock for {post.price}
                        </div>
                      )}
                    </div>

                    {post.image && (
                      <div className="mx-4 mb-4 rounded-2xl overflow-hidden aspect-[16/10] bg-blue-900/20 border border-white/5">
                        <img src={post.image} alt="" className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-700" />
                      </div>
                    )}

                    <div className="px-5 pb-5 flex items-center gap-6">
                      <button 
                        onClick={() => toggleLike(post.id)}
                        className={`flex items-center gap-1.5 transition-all ${likedPosts.has(post.id) ? 'text-blue-500' : 'text-blue-400/40 hover:text-blue-400/60'}`}
                      >
                        <Heart size={18} fill={likedPosts.has(post.id) ? "currentColor" : "none"} strokeWidth={1.5} />
                        <span className="text-xs font-medium">{post.likes + (likedPosts.has(post.id) ? 1 : 0)}</span>
                      </button>
                      <button className="flex items-center gap-1.5 text-blue-400/40 hover:text-blue-400/60 transition-colors">
                        <MessageCircle size={18} strokeWidth={1.5} />
                        <span className="text-xs font-medium">{post.comments}</span>
                      </button>
                      <button 
                        onClick={handleBoost}
                        className="ml-auto text-blue-400/40 hover:text-blue-400 flex items-center gap-1.5 py-1 px-3 bg-white/5 border border-white/5 rounded-full transition-all hover:bg-blue-500/10"
                      >
                        <SendHorizontal size={14} className="-rotate-45" />
                        <span className="text-[10px] uppercase tracking-widest font-medium">Boost</span>
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'explore' && (
              <motion.div 
                key="explore"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6 pt-4"
              >
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-blue-400/40 group-focus-within:text-blue-400 transition-colors" size={18} />
                  <input 
                    type="text" 
                    placeholder="Search Dimensions..." 
                    className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 text-sm outline-none focus:border-blue-500/50 transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {searchTrends.map((trend, i) => (
                    <motion.div 
                      key={trend.tag}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="p-4 rounded-2xl bg-gradient-to-br from-blue-600/10 to-blue-900/20 border border-white/5 hover:border-blue-500/30 transition-all cursor-pointer"
                    >
                      <div className="text-blue-400/60 text-[10px] uppercase tracking-widest mb-1">Trending</div>
                      <div className="text-blue-100 font-medium text-sm">{trend.tag}</div>
                      <div className="text-blue-400/40 text-[10px] mt-2">{trend.posts} boardings</div>
                    </motion.div>
                  ))}
                </div>

                <div className="pt-2">
                  <h3 className="text-[10px] text-blue-400/60 uppercase tracking-[0.4em] font-medium mb-4">Recommended Boards</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3, 4, 5, 6].map((idx) => (
                      <div key={idx} className="aspect-square rounded-xl overflow-hidden bg-blue-900/20 border border-white/5">
                        <img src={`https://images.unsplash.com/photo-${1600000000000 + idx}?w=300&q=80`} alt="" className="w-full h-full object-cover opacity-60" />
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === 'activity' && (
              <motion.div 
                key="activity"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-4 pt-4"
              >
                {mockActivities.map((activity, i) => (
                  <motion.div 
                    key={activity.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-4 p-4 rounded-[24px] bg-white/5 border border-white/10"
                  >
                    <div className="w-12 h-12 rounded-full p-0.5 border border-blue-500/20">
                      <img src={activity.avatar} alt="" className="w-full h-full rounded-full" />
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <span className="text-sm font-light">
                        <span className="font-semibold text-blue-400 uppercase tracking-wide mr-1">{activity.user}</span>
                        {activity.type === 'like' && 'pulsed your board'}
                        {activity.type === 'comment' && 'shared a thought'}
                        {activity.type === 'follow' && 'is now synchronized'}
                        {activity.type === 'boost' && 'sent swallows to boost you'}
                      </span>
                      {activity.text && <p className="text-xs text-blue-400/60 mt-1 italic">"{activity.text}"</p>}
                      <span className="text-[10px] text-blue-400/20 mt-1 uppercase tracking-tighter">{activity.time}</span>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}

            {activeTab === 'profile' && (
              <motion.div 
                key="profile"
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.05 }}
                className="pt-8 space-y-8"
              >
                <div className="flex flex-col items-center text-center">
                  <div className="relative group mb-4">
                    <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-[20px] group-hover:blur-[30px] transition-all" />
                    <div className="relative w-24 h-24 rounded-full p-1 border-2 border-blue-500/40 bg-black backdrop-blur-md">
                      <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Me" alt="" className="w-full h-full rounded-full" />
                    </div>
                  </div>
                  <h2 className="text-2xl font-light tracking-tight">SwaPrototype</h2>
                  <p className="text-blue-400/60 text-xs italic mt-1 font-light tracking-wider">Level 12 Strategy Entity</p>
                  
                  <div className="flex gap-8 mt-8">
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-blue-100">2.4k</span>
                      <span className="text-[10px] text-blue-400/40 uppercase tracking-widest">Followers</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-blue-100">{swallows}</span>
                      <span className="text-[10px] text-blue-400/40 uppercase tracking-widest">Swallows</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-lg font-semibold text-blue-100">128</span>
                      <span className="text-[10px] text-blue-400/40 uppercase tracking-widest">Boards</span>
                    </div>
                  </div>
                  
                  <button className="mt-8 px-8 py-2.5 rounded-full bg-white/5 border border-white/10 text-xs uppercase tracking-widest font-medium hover:bg-white/10 transition-all">
                    Creator Dashboard
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-1 pt-4">
                  {[...Array(9)].map((_, idx) => (
                    <div key={idx} className="aspect-square bg-blue-900/10 border border-white/5 hover:bg-blue-500/20 transition-colors cursor-pointer" />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Bottom Navigation */}
        <nav className="absolute bottom-6 left-6 right-6 h-16 bg-white/5 border border-white/10 rounded-full backdrop-blur-2xl flex items-center justify-around px-2 z-50">
          {[
            { id: 'feed', icon: Home },
            { id: 'explore', icon: Search },
            { id: 'post', icon: PlusSquare },
            { id: 'activity', icon: Heart },
            { id: 'profile', icon: User }
          ].map((item) => (
            <motion.button
              key={item.id}
              whileTap={{ scale: 0.9 }}
              onClick={() => {
                if (item.id === 'post') {
                  setIsPostSheetOpen(true);
                } else {
                  setActiveTab(item.id);
                }
              }}
              className={`relative p-3 rounded-full transition-all duration-500 ${
                activeTab === item.id 
                ? 'text-blue-400 bg-blue-500/10' 
                : 'text-blue-400/40 hover:text-blue-400/60'
              }`}
            >
              <item.icon size={22} strokeWidth={activeTab === item.id ? 2 : 1.5} />
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTab"
                  className="absolute inset-0 border border-blue-500/20 rounded-full"
                  transition={{ type: "spring", bounce: 0.3, duration: 0.6 }}
                />
              )}
            </motion.button>
          ))}
        </nav>

        {/* Home Indicator */}
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-16 h-1 bg-white/10 rounded-full" />

        {/* Bottom Sheet for Posting */}
        <AnimatePresence>
          {isPostSheetOpen && (
            <>
              {/* Backdrop */}
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsPostSheetOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60]"
              />
              
              {/* Sheet */}
              <motion.div 
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="absolute bottom-0 left-0 right-0 h-[75vh] bg-[#020617] border-t border-white/10 rounded-t-[40px] z-[70] flex flex-col overflow-hidden shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
              >
                {/* Drag Handle & Close */}
                <div className="flex flex-col items-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-white/10 rounded-full mb-4" />
                  <div className="w-full px-6 flex justify-between items-center mb-6">
                    <h2 className="text-xl font-light tracking-tight">Create Board</h2>
                    <button 
                      onClick={() => setIsPostSheetOpen(false)}
                      className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-blue-400/40 hover:text-blue-400 transition-colors"
                    >
                      <X size={18} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto px-6 pb-12 no-scrollbar">
                  {/* Template Selection */}
                  <div className="flex gap-2 mb-8">
                    {['standard', 'showcase', 'course'].map((type) => (
                      <button
                        key={type}
                        onClick={() => setPostType(type as any)}
                        className={`flex-1 py-3 rounded-2xl text-[10px] uppercase tracking-widest border transition-all ${
                          postType === type 
                          ? 'bg-blue-500/10 border-blue-500/40 text-blue-100' 
                          : 'bg-white/5 border-white/5 text-blue-400/40'
                        }`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-[32px] p-6 space-y-6">
                    <textarea 
                      placeholder={
                        postType === 'course' ? "What will your students learn? Describe your frequency..." :
                        postType === 'showcase' ? "Display your light. What are you promoting?" :
                        "Capture your frequency..."
                      }
                      className="w-full h-40 bg-transparent text-lg font-light outline-none resize-none placeholder:text-blue-400/20"
                    />
                    
                    {postType === 'course' && (
                      <div className="pt-4 border-t border-white/5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-blue-400/60 lowercase italic">Course Access Price</span>
                          <div className="flex items-center gap-2 bg-blue-500/5 px-3 py-1 rounded-full border border-blue-500/20">
                            <SendHorizontal size={12} className="-rotate-45 text-blue-400" />
                            <input type="number" defaultValue={20} className="w-12 bg-transparent text-xs text-blue-100 outline-none" />
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-4 pt-2">
                      <button className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400/60 hover:text-blue-400 transition-colors">
                        <PlusSquare size={24} />
                      </button>
                      <button className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-blue-400/60 hover:text-blue-400 transition-colors">
                        <Globe size={24} />
                      </button>
                      <button 
                        onClick={() => setIsPostSheetOpen(false)}
                        className="flex-1 rounded-2xl bg-blue-600/20 border border-blue-500/40 text-blue-100 text-sm font-medium tracking-widest uppercase hover:bg-blue-600/30 transition-all"
                      >
                        Launch Board
                      </button>
                    </div>
                  </div>

                  <p className="mt-8 text-center text-[10px] text-blue-400/20 uppercase tracking-[0.3em]">
                    Visibility: Global Dimension
                  </p>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
}
