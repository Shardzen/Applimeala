import { useState, useEffect, useRef } from 'react';
import type { UserProfile, NutritionTargets, Recipe, DailyProgress, Workout } from './types';
import { calculateNutritionTargets } from './services/nutrition';
import { aggregateShoppingList } from './services/generator';
import { saveProfile, getProfile } from './services/profile';
import { signIn, signUp, signOut, getCurrentUser, resetPassword } from './services/auth';
import { analyzeMealImage, askConcierge } from './services/ai';
import { getDriveLink } from './services/recipeApi';
import type { User } from '@supabase/supabase-js';
import { 
  Utensils, ShoppingCart, ChefHat, Camera, TrendingUp, ChevronRight, CheckCircle2,
  Loader2, X, Award, History as HistoryIcon, LogOut, Sparkles,
  Plus, Minus, Dumbbell, Mail, Lock as LockIcon,
  Sun, MessageSquare, Inbox, Target
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { XAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const INTERNAL_RECIPES: Recipe[] = [
  { id: 'me1', name: 'Pasta Tuna Melt', description: 'Pâtes au thon.', calories: 850, proteins: 45, carbs: 90, fats: 25, prepTime: 12, difficulty: 'EASY', costPerPortion: 1.5, tags: ['MUSCLE_GAIN', 'LOW'], ingredients: [{ id: 'i1', name: 'Pâtes', quantity: 150, unit: 'g', pricePerUnit: 0.002, category: 'GROCERY' }, { id: 'i2', name: 'Thon', quantity: 1, unit: 'boîte', pricePerUnit: 1.2, category: 'GROCERY' }] },
  { id: 'we1', name: 'Soupe Lentilles', description: 'Riche en fibres.', calories: 350, proteins: 25, carbs: 45, fats: 5, prepTime: 20, difficulty: 'EASY', costPerPortion: 1.0, tags: ['WEIGHT_LOSS', 'LOW'], ingredients: [{ id: 'i3', name: 'Lentilles', quantity: 100, unit: 'g', pricePerUnit: 0.003, category: 'GROCERY' }] }
];

const WORKOUT_DATABASE: Workout[] = [
  { id: 'm1', title: 'Poussée', focus: 'Pecs, Épaules, Triceps', location: 'GYM', duration: 60, caloriesBurned: 350, exercises: [{ id: 'e1', name: 'Dév. Couché', sets: 4, reps: '10' }] },
  { id: 'm2', title: 'Tirage', focus: 'Dos, Biceps', location: 'GYM', duration: 60, caloriesBurned: 350, exercises: [{ id: 'e2', name: 'Tractions', sets: 4, reps: '8' }] }
];

function App() {
  const [session, setSession] = useState<User | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meals' | 'studio' | 'shopping' | 'progress'>('dashboard');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [profile, setProfile] = useState<UserProfile>({ gender: 'MALE', age: 25, height: 175, weight: 70, targetWeight: 65, activityLevel: 'MODERATE', trainingFrequency: 3, workoutLocation: 'GYM', goal: 'MAINTENANCE', goalSpeed: 'STANDARD', budget: 'MEDIUM', prepTime: 'MEDIUM', diet: 'NONE', exclusions: [], xp: 0, level: 1, streak: 0 });
  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [progress, setProgress] = useState<DailyProgress>({ consumedCalories: 0, consumedProteins: 0, consumedCarbs: 0, consumedFats: 0, waterGlassCount: 0, exerciseCalories: 0 });
  const [dailyPlan, setDailyPlan] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [portions, setPortions] = useState(1);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([{role: 'ai', text: 'Bonjour.'}]);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { checkUser(); }, []);
  useEffect(() => { if (profile) setTargets(calculateNutritionTargets(profile)); }, [profile]);
  useEffect(() => { const root = document.documentElement; if (isDarkMode) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); } else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); } }, [isDarkMode]);

  const checkUser = async () => { try { const user = await getCurrentUser(); if (user) { setSession(user); const dbProfile = await getProfile(user.id); if (dbProfile) { setProfile(prev => ({...prev, ...dbProfile})); setHasOnboarded(true); handleGenerate(dbProfile); } } } finally { setIsAuthLoading(false); } };
  const handleAuth = async () => { if (!email) return toast.error("Email requis."); setIsAppLoading(true); try { if (authMode === 'signin') { await signIn(email, password); await checkUser(); } else if (authMode === 'signup') { await signUp(email, password); setIsVerifyingEmail(true); } else { await resetPassword(email); toast.success('Lien envoyé.'); setAuthMode('signin'); } } catch (e: any) { toast.error(e.message); } finally { setIsAppLoading(false); } };
  const handleGenerate = async (prof = profile) => { const filtered = INTERNAL_RECIPES.filter(r => r.tags.includes(prof.goal) || r.tags.includes('LOW')); setDailyPlan(filtered.length > 0 ? filtered.slice(0, 3) : INTERNAL_RECIPES); };
  const completeOnboarding = async () => { if (!session) return; setIsAppLoading(true); await saveProfile(session.id, profile); setHasOnboarded(true); handleGenerate(); setIsAppLoading(false); };
  const askCoach = async () => { if(!chatInput) return; const q = chatInput; setChatInput(''); setChatMessages(prev => [...prev, {role: 'user', text: q}]); setIsChatLoading(true); const answer = await askConcierge(q, profile, (targets?.calories || 0) - progress.consumedCalories); setChatMessages(prev => [...prev, {role: 'ai', text: answer}]); setIsChatLoading(false); };

  const shoppingList = aggregateShoppingList(dailyPlan);
  const remainingCalories = (targets?.calories || 0) - progress.consumedCalories + progress.exerciseCalories;

  if (isAuthLoading) return <div className="h-screen bg-palais flex items-center justify-center"><Loader2 className="animate-spin text-luxury-gold" size={48} /></div>;
  if (isVerifyingEmail) return (<div className="min-h-screen bg-palais p-8 flex flex-col justify-center items-center text-center"><div className="bg-elite-surface p-12 rounded-[60px] border border-elite max-w-md w-full animate-in zoom-in"><Inbox size={64} className="mx-auto text-luxury-gold mb-6" /><h1 className="text-3xl font-serif font-black mb-4 text-elite">Vérifiez vos emails</h1><button onClick={() => setIsVerifyingEmail(false)} className="w-full bg-luxury-bordeaux text-white font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest shadow-xl">Retour</button></div></div>);
  if (!session) return (<div className="min-h-screen bg-palais p-8 flex flex-col justify-center items-center space-y-12"><div className="text-center"><ChefHat size={80} className="mx-auto text-luxury-bordeaux dark:text-luxury-gold mb-4" /><h1 className="text-6xl font-serif font-black tracking-tighter text-elite">AppliMeal</h1></div><div className="w-full max-w-sm space-y-6 bg-elite-surface p-10 rounded-[60px] shadow-2xl border border-elite"><div className="space-y-4"><div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40" size={20} /><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 pl-12 bg-palais rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all text-elite" /></div>{authMode !== 'forgot' && (<div className="relative group"><LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40" size={20} /><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 pl-12 bg-palais rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all text-elite" /></div>)}</div><button onClick={handleAuth} disabled={isAppLoading} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[32px] shadow-xl hover:bg-luxury-charcoal transition-all">{authMode === 'signin' ? "Accéder" : "S'inscrire"}</button><button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="w-full text-[9px] font-black text-luxury-gold uppercase tracking-[0.3em]">{authMode === 'signin' ? "S'inscrire" : "Déjà Membre"}</button></div></div>);

  if (!hasOnboarded) return (<div className="min-h-screen bg-palais p-6 flex flex-col justify-center"><div className="max-w-md mx-auto w-full bg-elite-surface p-10 rounded-[60px] shadow-2xl border border-elite text-elite relative overflow-hidden"><div className="absolute top-0 left-0 h-1.5 bg-luxury-gold transition-all duration-500" style={{ width: `${(onboardingStep / 4) * 100}%` }}></div>{onboardingStep === 1 && (<div className="space-y-8 animate-in slide-in-from-right text-center"><Award size={48} className="mx-auto text-luxury-gold" /><h1 className="text-3xl font-serif font-black">Profil</h1><input type="number" value={profile.weight} onChange={e => setProfile({...profile, weight: +e.target.value})} className="w-full p-5 bg-palais rounded-2xl text-center" /><button onClick={() => setOnboardingStep(2)} className="w-full bg-luxury-bordeaux text-white py-6 rounded-3xl">Suivant</button></div>)}{onboardingStep === 2 && (<div className="space-y-8 animate-in slide-in-from-right text-center"><Target size={48} className="mx-auto text-luxury-gold" /><h1 className="text-3xl font-serif font-black">Objectif</h1><button onClick={() => setOnboardingStep(3)} className="w-full bg-luxury-bordeaux text-white py-6 rounded-3xl">Suivant</button></div>)}{onboardingStep === 3 && (<div className="space-y-8 animate-in slide-in-from-right text-center"><Sparkles size={48} className="mx-auto text-luxury-gold" /><h1 className="text-3xl font-serif font-black">Prêt</h1><button onClick={completeOnboarding} className="w-full bg-luxury-gold text-white py-6 rounded-3xl uppercase tracking-widest shadow-xl">Lancer mon Destin</button></div>)}</div></div>);

  return (
    <div className="min-h-screen bg-palais text-elite transition-colors duration-500 pb-32">
      <Toaster position="top-center" richColors />
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const r = await analyzeMealImage(file); toast.success(`Analyse Signature: ${r.name}`); } catch(e:any){toast.error(e.message);} } }} />
      
      {activeTab === 'dashboard' && (
        <div className="bg-elite-surface p-10 rounded-b-[60px] shadow-2xl space-y-10 border-b border-elite animate-in slide-in-from-top duration-700 relative overflow-hidden">
          <div className="flex justify-between items-start relative z-10"><div><Award size={16} className="text-luxury-gold" /><h1 className="text-3xl font-serif font-black">Votre Palais</h1></div><div className="flex gap-2">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className="bg-palais p-3 rounded-2xl text-luxury-gold border border-elite transition-transform hover:scale-110"><Sun size={20}/></button>
            <button onClick={() => signOut()} className="bg-palais p-3 rounded-2xl text-luxury-bordeaux border border-elite transition-transform hover:scale-110"><LogOut size={20}/></button></div>
          </div>
          <div className="flex justify-center items-center py-4"><span className="text-6xl font-black">{remainingCalories}</span></div>
          <div onClick={() => fileInputRef.current?.click()} className="bg-luxury-charcoal dark:bg-luxury-gold p-7 rounded-[40px] text-white dark:text-luxury-charcoal flex items-center justify-between group cursor-pointer hover:scale-[1.02] transition-all"><div className="flex items-center gap-5"><Camera size={28} /><div><p className="text-lg font-black leading-none">Vision IA</p></div></div><ChevronRight size={24} /></div>
        </div>
      )}

      <main className="p-6 max-w-lg mx-auto space-y-8 mt-4 text-elite">
        {activeTab === 'meals' && (<div className="space-y-8 animate-in fade-in"><h2 className="text-4xl font-serif font-black">Le Menu</h2><div className="space-y-6">{dailyPlan.map(recipe => (<div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setPortions(1); }} className="bg-elite-surface p-7 rounded-[56px] shadow-2xl border border-elite flex gap-6 items-center group cursor-pointer hover:scale-105 transition-all"><div><h3 className="font-black text-xl leading-tight">{recipe.name}</h3><span className="text-luxury-gold font-black text-xs">{recipe.calories} Kcal</span></div></div>))}</div></div>)}
        {activeTab === 'studio' && (<div className="space-y-10 animate-in fade-in"><h2 className="text-4xl font-serif font-black">Studio Elite</h2><div className="space-y-6">{WORKOUT_DATABASE.map(w => (<div key={w.id} onClick={() => setActiveWorkout(w)} className="bg-elite-surface p-8 rounded-[56px] shadow-2xl border border-elite flex justify-between items-center group cursor-pointer hover:border-luxury-gold transition-all"><div><h3 className="font-black text-lg">{w.title}</h3><p className="opacity-40">{w.focus}</p></div><Target size={24} className="text-luxury-gold" /></div>))}</div></div>)}
        {activeTab === 'shopping' && (<div className="space-y-10 animate-in fade-in"><h2 className="text-4xl font-serif font-black text-center">Réserve</h2><div className="bg-luxury-charcoal dark:bg-luxury-gold text-white dark:text-luxury-charcoal p-8 rounded-[56px] shadow-2xl flex justify-between items-center"><div className="space-y-1"><p className="text-[10px] uppercase opacity-60">Total Signature</p><p className="text-4xl font-serif font-black">48.20€</p></div><a href={getDriveLink([])} target="_blank" rel="noreferrer" className="bg-white/10 dark:bg-black/10 p-5 rounded-3xl transition-all shadow-xl"><ShoppingCart size={32}/></a></div>{Object.entries(shoppingList).map(([cat, items]) => (<div key={cat} className="space-y-4"><h4>{cat}</h4><div className="bg-elite-surface rounded-[48px] shadow-xl overflow-hidden border border-elite">{(items as any[]).map((ing, i) => (<div key={i} onClick={() => setCheckedItems(prev => prev.includes(ing.name) ? prev.filter(x=>x!==ing.name) : [...prev, ing.name])} className={cn("p-7 border-b border-palais flex justify-between cursor-pointer", checkedItems.includes(ing.name) && "opacity-30")}><div className="flex items-center gap-3"><CheckCircle2 size={16} className={cn(checkedItems.includes(ing.name) ? "text-luxury-gold" : "opacity-10")} /><span>{ing.name}</span></div><span className="text-luxury-gold font-black uppercase">{ing.quantity} {ing.unit}</span></div>))}</div></div>))}</div>)}
        {activeTab === 'progress' && (<div className="space-y-10 animate-in fade-in text-center"><div className="bg-elite-surface p-10 rounded-[56px] shadow-2xl border border-elite"><h3 className="text-luxury-gold uppercase font-black mb-6">Suivi Prestige</h3><div className="h-64"><ResponsiveContainer width="100%" height="100%"><AreaChart data={[{date:'10/03', weight:71.5},{date:'14/03', weight:70.0}]}><defs><linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/><stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} /><XAxis dataKey="date" axisLine={false} tickLine={false} /><Tooltip contentStyle={{borderRadius:'20px', border:'none'}} /><Area type="monotone" dataKey="weight" stroke="#D4AF37" strokeWidth={5} fill="url(#gW)" /></AreaChart></ResponsiveContainer></div></div></div>)}
      </main>

      <nav className="fixed bottom-10 left-8 right-8 bg-luxury-charcoal dark:bg-black p-6 rounded-[56px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] flex justify-around items-center z-50 border border-white/5 transition-all">{[{id:'dashboard',icon:TrendingUp,label:'Palais'},{id:'meals',icon:Utensils,label:'Menu'},{id:'studio',icon:Dumbbell,label:'Studio'},{id:'shopping',icon:ShoppingCart,label:'Réserve'},{id:'progress',icon:HistoryIcon,label:'Suivi'}].map(item=>(<button key={item.id} onClick={()=>setActiveTab(item.id as any)} className={cn("transition-all flex flex-col items-center gap-1",activeTab===item.id?"text-luxury-gold scale-125":"text-white/30")}><item.icon size={24}/><span className={cn("text-[6px] font-black uppercase", activeTab===item.id?"opacity-100":"opacity-0")}>{item.label}</span></button>))}</nav>
      
      {isConciergeOpen && (<div className="fixed inset-x-4 bottom-32 z-[70] bg-elite-surface rounded-[48px] shadow-2xl border border-elite flex flex-col overflow-hidden animate-in slide-in-from-bottom" style={{maxHeight:'60vh'}}><div className="bg-luxury-charcoal p-6 flex justify-between text-white border-b border-elite"><div className="flex items-center gap-3 text-luxury-gold"><MessageSquare size={20}/><span className="font-serif font-black tracking-widest uppercase text-xs">Concierge</span></div><button onClick={()=>setIsConciergeOpen(false)} className="opacity-50"><X/></button></div><div className="flex-1 p-6 overflow-y-auto space-y-6 bg-palais/30">{chatMessages.map((m,i)=>(<div key={i} className={cn("flex",m.role==='user'?"justify-end":"justify-start")}><div className={cn("max-w-[85%] p-5 rounded-[32px] shadow-sm",m.role==='user'?"bg-luxury-bordeaux text-white rounded-br-none" : "bg-elite-surface text-elite border border-elite rounded-bl-none")}>{m.text}</div></div>))}{isChatLoading && <div className="flex justify-start"><div className="bg-elite-surface p-5 rounded-[32px] border border-elite"><Loader2 className="animate-spin text-luxury-gold" size={20}/></div></div>}</div><div className="p-4 bg-elite-surface border-t border-elite flex gap-3"><input type="text" value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyPress={e=>e.key==='Enter'&&askCoach()} placeholder="Question..." className="flex-1 bg-palais rounded-3xl px-6 py-4 text-elite border border-elite outline-none" /><button onClick={askCoach} disabled={isChatLoading || !chatInput} className="bg-luxury-gold text-white p-4 rounded-full hover:bg-luxury-bordeaux transition-colors"><ChevronRight/></button></div></div>)}

      {selectedRecipe && (<div className="fixed inset-0 z-[150] bg-palais overflow-y-auto p-10 text-elite animate-in slide-in-from-bottom"><div className="max-w-lg mx-auto space-y-12"><button onClick={()=>setSelectedRecipe(null)} className="bg-elite-surface p-5 rounded-2xl shadow-xl border border-elite transition-transform hover:rotate-90"><X/></button><h2 className="text-5xl font-serif font-black text-center">{selectedRecipe.name}</h2><div className="bg-elite-surface p-6 rounded-[40px] border border-theme flex justify-between items-center px-10"><button onClick={()=>setPortions(p=>Math.max(1,p-1))}><Minus/></button><span className="text-4xl font-black">{portions}</span><button onClick={()=>setPortions(p=>p+1)}><Plus/></button></div><div className="bg-elite-surface p-10 rounded-[56px] shadow-xl border border-theme space-y-8"><h3>Ingrédients</h3><div className="space-y-5">{selectedRecipe.ingredients.map((ing,i)=>(<div key={i} className="flex justify-between border-b border-palais pb-5 last:border-0"><span>{ing.name}</span><span className="text-luxury-gold font-black">{ing.quantity*portions} {ing.unit}</span></div>))}</div></div><button onClick={()=>{setProgress(prev=>({...prev,consumedCalories:prev.consumedCalories+(selectedRecipe.calories*portions)}));setSelectedRecipe(null);setPortions(1);toast.success('Validé.');}} className="w-full bg-luxury-bordeaux text-white font-black py-8 rounded-[40px] shadow-2xl hover:bg-luxury-charcoal transition-all">Consommer</button></div></div>)}
      
      {activeWorkout && (<div className="fixed inset-0 z-[150] bg-palais overflow-y-auto p-10 text-elite animate-in slide-in-from-bottom"><div className="max-w-lg mx-auto space-y-12"><button onClick={()=>setActiveWorkout(null)} className="bg-elite-surface p-5 rounded-2xl shadow-xl border border-elite transition-transform hover:rotate-90"><X/></button><div className="text-center"><h2 className="text-5xl font-serif font-black">{activeWorkout.title}</h2><p className="opacity-60 uppercase text-xs tracking-widest mt-2">{activeWorkout.focus}</p></div><div className="space-y-6">{activeWorkout.exercises.map((ex,i)=>(<div key={i} className="bg-elite-surface p-8 rounded-[48px] border border-theme flex justify-between items-center shadow-lg"><div><h3 className="text-2xl font-serif font-black">{ex.name}</h3><p className="opacity-60">{ex.sets} x {ex.reps}</p></div><CheckCircle2 size={24} className="text-luxury-gold opacity-20" /></div>))}</div><button onClick={()=>{setProgress(p=>({...p,exerciseCalories:p.exerciseCalories+activeWorkout.caloriesBurned}));setActiveWorkout(null);toast.success('Séance terminée. +XP');}} className="w-full bg-luxury-gold text-white font-black py-8 rounded-[40px] shadow-xl hover:bg-luxury-charcoal transition-all uppercase tracking-widest text-sm">Terminer la Séance</button></div></div>)}
    </div>
  );
}

export default App;
