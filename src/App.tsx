import { useState, useEffect, useRef } from 'react';
import type { UserProfile, NutritionTargets, Recipe, DailyProgress } from './types';
import { calculateNutritionTargets } from './services/nutrition';
import { saveProfile, getProfile } from './services/profile';
import { signIn, signUp, signOut, getCurrentUser, resetPassword } from './services/auth';
import { analyzeMealImage, askConcierge } from './services/ai';
import type { User } from '@supabase/supabase-js';
import { 
  Utensils, ShoppingCart, ChefHat, Camera, TrendingUp, ChevronRight, CheckCircle2,
  Loader2, X, Award, History as HistoryIcon, LogOut, Sparkles,
  Plus, Minus, Dumbbell, Mail, Lock as LockIcon,
  Moon, Sun, MessageSquare, Inbox
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const INTERNAL_RECIPES: Recipe[] = [
  { id: 'me1', name: 'Pasta Tuna Melt', description: 'Pâtes, thon en boîte, fromage.', calories: 850, proteins: 45, carbs: 90, fats: 25, prepTime: 12, difficulty: 'EASY', costPerPortion: 1.5, tags: ['MUSCLE_GAIN', 'LOW'], ingredients: [] },
  { id: 'we1', name: 'Soupe de Lentilles', description: 'Lentilles, carottes, oignons.', calories: 350, proteins: 25, carbs: 45, fats: 5, prepTime: 20, difficulty: 'EASY', costPerPortion: 1.0, tags: ['WEIGHT_LOSS', 'LOW'], ingredients: [] }
];

function App() {
  const [session, setSession] = useState<User | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [isVerifyingEmail, setIsVerifyingEmail] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meals' | 'studio' | 'shopping' | 'progress'>('dashboard');
  
  const [authMode, setAuthMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [profile, setProfile] = useState<UserProfile>({
    gender: 'MALE', age: 25, height: 175, weight: 70, targetWeight: 65,
    activityLevel: 'MODERATE', trainingFrequency: 3, workoutLocation: 'GYM',
    goal: 'MAINTENANCE', goalSpeed: 'STANDARD', budget: 'MEDIUM',
    prepTime: 'MEDIUM', diet: 'NONE', exclusions: [], xp: 0, level: 1, streak: 0
  });

  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [progress, setProgress] = useState<DailyProgress>({ consumedCalories: 0, consumedProteins: 0, consumedCarbs: 0, consumedFats: 0, waterGlassCount: 0, exerciseCalories: 0 });
  const [dailyPlan, setDailyPlan] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [portions, setPortions] = useState(1);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([{role: 'ai', text: 'Bonjour. Je suis votre Concierge Elite.'}]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { checkUser(); }, []);
  useEffect(() => { if (profile) setTargets(calculateNutritionTargets(profile)); }, [profile]);
  
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const checkUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setSession(user);
        const dbProfile = await getProfile(user.id);
        if (dbProfile) { 
          setProfile(prev => ({...prev, ...dbProfile})); 
          setHasOnboarded(true); 
          handleGenerate(dbProfile); 
        }
      }
    } finally { setIsAuthLoading(false); }
  };

  const handleAuth = async () => {
    if (!email) return toast.error("Entrez votre email.");
    setIsAppLoading(true);
    try {
      if (authMode === 'signin') { await signIn(email, password); toast.success('Accès autorisé.'); await checkUser(); }
      else if (authMode === 'signup') { await signUp(email, password); setIsVerifyingEmail(true); }
      else { await resetPassword(email); toast.success('Lien envoyé.'); setAuthMode('signin'); }
    } catch (e: any) { toast.error(e.message); } finally { setIsAppLoading(false); }
  };

  const handleGenerate = async (prof = profile) => {
    const filtered = INTERNAL_RECIPES.filter(r => r.tags.includes(prof.goal));
    setDailyPlan(filtered.length > 0 ? filtered.slice(0, 3) : INTERNAL_RECIPES);
  };

  const completeOnboarding = async () => {
    if (!session) return;
    setIsAppLoading(true);
    await saveProfile(session.id, profile);
    setHasOnboarded(true);
    handleGenerate();
    setIsAppLoading(false);
  };

  const askCoach = async () => {
    if(!chatInput) return;
    const q = chatInput; setChatInput('');
    setChatMessages(prev => [...prev, {role: 'user', text: q}]);
    setIsChatLoading(true);
    const answer = await askConcierge(q, profile, (targets?.calories || 0) - progress.consumedCalories);
    setChatMessages(prev => [...prev, {role: 'ai', text: answer}]);
    setIsChatLoading(false);
  };

  const remainingCalories = (targets?.calories || 0) - progress.consumedCalories + progress.exerciseCalories;

  if (isAuthLoading) return <div className="h-screen bg-palais flex items-center justify-center"><Loader2 className="animate-spin text-luxury-gold" size={48} /></div>;

  if (isVerifyingEmail) {
    return (
      <div className="min-h-screen bg-palais p-8 flex flex-col justify-center items-center text-center">
        <div className="bg-elite-surface p-12 rounded-[60px] shadow-2xl border border-elite max-w-md w-full animate-in zoom-in duration-500">
           <Inbox size={64} className="mx-auto text-luxury-gold mb-6" />
           <h1 className="text-3xl font-serif font-black mb-4 text-elite">Vérifiez vos emails</h1>
           <p className="opacity-60 mb-10 text-sm leading-relaxed text-elite">Un lien a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre compte.</p>
           <button onClick={() => setIsVerifyingEmail(false)} className="w-full bg-luxury-bordeaux text-white font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest shadow-xl">Retour</button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-palais p-8 flex flex-col justify-center items-center space-y-12">
        <div className="text-center animate-in fade-in duration-1000">
           <ChefHat size={80} className="mx-auto text-luxury-bordeaux dark:text-luxury-gold mb-4" />
           <h1 className="text-6xl font-serif font-black tracking-tighter text-elite">AppliMeal</h1>
        </div>
        <div className="w-full max-w-sm space-y-6 bg-elite-surface p-10 rounded-[60px] shadow-2xl border border-elite">
           <div className="space-y-4">
              <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40" size={20} /><input type="email" placeholder="Email Signature" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 pl-12 bg-palais rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all text-elite" /></div>
              {authMode !== 'forgot' && (<div className="relative group"><LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40" size={20} /><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 pl-12 bg-palais rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all text-elite" /></div>)}
           </div>
           <button onClick={handleAuth} disabled={isAppLoading} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[32px] shadow-xl hover:bg-luxury-charcoal transition-all">
             {isAppLoading ? <Loader2 className="animate-spin mx-auto" /> : authMode === 'signin' ? "Accéder au Palais" : authMode === 'signup' ? "Créer ma Signature" : "Réinitialiser"}
           </button>
           <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="w-full text-[9px] font-black text-luxury-gold uppercase tracking-[0.3em] text-theme">{authMode === 'signin' ? "Nouveau Membre ? S'inscrire" : "Déjà Membre ? Se connecter"}</button>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <div className="min-h-screen bg-palais p-6 flex flex-col justify-center animate-in fade-in">
        <div className="max-w-md mx-auto w-full bg-elite-surface p-10 rounded-[60px] shadow-2xl border border-elite text-elite relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1.5 bg-luxury-gold transition-all duration-500" style={{ width: `${(onboardingStep / 4) * 100}%` }}></div>
          {onboardingStep === 1 && (
            <div className="space-y-8">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 1/4</h2><h1 className="text-3xl font-serif font-black">Profil Physique</h1></div>
              <div className="space-y-6">
                <div className="flex gap-2">{(['MALE', 'FEMALE'] as const).map(g => (<button key={g} onClick={() => setProfile({...profile, gender: g})} className={cn("flex-1 py-4 rounded-2xl border text-[10px] font-black", profile.gender === g ? "bg-luxury-bordeaux text-white" : "bg-palais text-luxury-gold border-elite")}>{g === 'MALE' ? 'HOMME' : g === 'FEMALE' ? 'FEMME' : 'AUTRE'}</button>))}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase pl-2">Âge</span><input type="number" value={profile.age} onChange={e => setProfile({...profile, age: +e.target.value})} className="w-full p-5 bg-palais rounded-2xl outline-none ring-1 ring-luxury-gold/10 text-elite" /></div>
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase pl-2">Poids (kg)</span><input type="number" value={profile.weight} onChange={e => setProfile({...profile, weight: +e.target.value})} className="w-full p-5 bg-palais rounded-2xl outline-none ring-1 ring-luxury-gold/10 text-elite" /></div>
                </div>
              </div>
              <button onClick={() => setOnboardingStep(2)} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[28px] shadow-xl">Suivant</button>
            </div>
          )}
          {onboardingStep === 2 && (
            <div className="space-y-8">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 2/4</h2><h1 className="text-3xl font-serif font-black">Objectif</h1></div>
              <div className="space-y-4">
                {(['WEIGHT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN'] as const).map(goal => (<button key={goal} onClick={() => setProfile({...profile, goal})} className={cn("w-full p-6 rounded-[32px] border-2 flex justify-between items-center transition-all", profile.goal === goal ? "border-luxury-gold bg-palais" : "border-elite bg-palais/50")}><span className="font-black uppercase text-xs">{goal.replace('_', ' ')}</span><CheckCircle2 className={cn(profile.goal === goal ? "text-luxury-gold" : "opacity-10")} /></button>))}
              </div>
              <div className="flex gap-4"><button onClick={() => setOnboardingStep(1)} className="flex-1 bg-palais text-luxury-gold font-black py-6 rounded-[28px] border border-elite">Retour</button><button onClick={() => setOnboardingStep(3)} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-[28px]">Suivant</button></div>
            </div>
          )}
          {onboardingStep === 3 && (
            <div className="space-y-8">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 3/4</h2><h1 className="text-3xl font-serif font-black">Budget</h1></div>
              <select value={profile.budget} onChange={e => setProfile({...profile, budget: e.target.value as any})} className="w-full p-6 bg-palais rounded-[32px] border-none outline-none ring-1 ring-luxury-gold/10 font-bold text-elite"><option value="LOW">Étudiant / Économique</option><option value="MEDIUM">Standard</option><option value="HIGH">Prestige</option></select>
              <div className="flex gap-4"><button onClick={() => setOnboardingStep(2)} className="flex-1 bg-palais text-luxury-gold font-black py-6 rounded-[28px] border border-elite">Retour</button><button onClick={() => setOnboardingStep(4)} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-[28px]">Suivant</button></div>
            </div>
          )}
          {onboardingStep === 4 && (
            <div className="space-y-8">
              <div className="space-y-2 text-center"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 4/4</h2><h1 className="text-3xl font-serif font-black">Visualisation</h1></div>
              <div className="bg-palais p-10 rounded-[48px] flex flex-col items-center space-y-4 border border-elite shadow-inner">
                <span className="text-[10px] font-black text-luxury-gold uppercase">Poids Cible (kg)</span>
                <input type="number" value={profile.targetWeight} onChange={e => setProfile({...profile, targetWeight: +e.target.value})} className="text-7xl font-black bg-transparent text-center text-luxury-bordeaux outline-none w-full" />
              </div>
              <button onClick={completeOnboarding} disabled={isAppLoading} className="w-full bg-luxury-gold text-white font-black py-6 rounded-[28px] shadow-xl uppercase tracking-widest text-[10px]">Lancer mon Destin Elite</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-palais text-elite transition-colors duration-500 pb-32">
      <Toaster position="top-center" richColors />
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const r = await analyzeMealImage(file); toast.success(`Analyse: ${r.name}`); } catch(e:any){toast.error(e.message);} } }} />

      {activeTab === 'dashboard' && (
        <div className="bg-elite-surface p-10 rounded-b-[60px] shadow-2xl space-y-10 animate-in slide-in-from-top duration-700 relative overflow-hidden border-b border-elite">
          <div className="absolute top-0 right-0 w-64 h-64 bg-luxury-gold/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1"><div className="flex items-center gap-2 text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]"><Award size={16}/> Niv. {profile.level}</div><h1 className="text-3xl font-serif font-black">Votre Palais</h1></div>
            <div className="flex gap-2">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="bg-palais p-3 rounded-2xl text-luxury-gold shadow-sm border border-elite hover:scale-110 transition-transform">
                {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
              </button>
              <button onClick={() => { signOut(); setSession(null); }} className="bg-palais p-3 rounded-2xl text-luxury-bordeaux shadow-sm border border-elite"><LogOut size={20}/></button>
            </div>
          </div>

          <div className="relative flex justify-center items-center py-4">
             <svg className="w-72 h-72 transform -rotate-90">
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-luxury-gold/5" />
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 125} strokeDashoffset={2 * Math.PI * 125 * (1 - Math.min(1, progress.consumedCalories / (targets?.calories || 1)))} strokeLinecap="round" className="text-luxury-gold transition-all duration-1000 shadow-xl" />
             </svg>
             <div className="absolute text-center space-y-1 z-20">
               <span className="text-6xl font-black tracking-tighter">{remainingCalories}</span>
               <p className="text-[10px] text-luxury-gold font-black uppercase tracking-[0.3em]">Kcal de réserve</p>
             </div>
          </div>
          
          <div onClick={() => fileInputRef.current?.click()} className="bg-luxury-charcoal dark:bg-luxury-gold p-7 rounded-[40px] text-white dark:text-luxury-charcoal flex items-center justify-between shadow-2xl group cursor-pointer hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-5"><div className="bg-white/10 dark:bg-black/10 p-4 rounded-2xl shadow-inner"><Camera size={28} /></div><div><p className="text-lg font-black leading-none mb-1">Vision IA</p><p className="text-[10px] opacity-60 uppercase font-black tracking-widest">Scanner mon plat</p></div></div>
            <ChevronRight size={24} />
          </div>
        </div>
      )}

      <main className="p-6 max-w-lg mx-auto mt-4">
        {activeTab === 'meals' && (
          <div className="p-8 space-y-8 animate-in fade-in">
             <h2 className="text-4xl font-serif font-black tracking-tight">Le Menu</h2>
             <div className="space-y-6">
               {dailyPlan.map(recipe => (
                 <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setPortions(1); }} className="bg-elite-surface p-7 rounded-[56px] shadow-2xl border border-elite flex gap-6 items-center group cursor-pointer hover:scale-[1.03] transition-all relative overflow-hidden">
                    <div className="w-24 h-24 bg-palais rounded-[36px] flex flex-col items-center justify-center text-luxury-bordeaux border border-elite shadow-inner group-hover:scale-105 transition-transform">
                       <span className="text-2xl font-black leading-none">{recipe.calories}</span><span className="text-[9px] font-black uppercase">Kcal</span>
                    </div>
                    <div className="flex-1 text-elite"><h3 className="font-black text-xl leading-tight">{recipe.name}</h3><span className="text-luxury-gold font-black text-xs bg-luxury-gold/5 px-2 py-1 rounded-lg">{(recipe.costPerPortion).toFixed(2)}€</span></div>
                    <ChevronRight size={28} className="text-luxury-gold/20" />
                 </div>
               ))}
             </div>
          </div>
        )}
      </main>

      {!isConciergeOpen && !selectedRecipe && !isVerifyingEmail && (
        <button onClick={() => setIsConciergeOpen(true)} className="fixed bottom-36 right-6 z-[60] bg-luxury-gold text-white p-5 rounded-[28px] shadow-2xl animate-bounce"><MessageSquare size={28} /></button>
      )}

      {isConciergeOpen && (
        <div className="fixed inset-x-4 bottom-32 z-[70] bg-elite-surface rounded-[48px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border border-elite flex flex-col overflow-hidden animate-in slide-in-from-bottom" style={{maxHeight: '60vh'}}>
           <div className="bg-luxury-charcoal dark:bg-black p-6 flex justify-between items-center text-white border-b border-elite"><div className="flex items-center gap-3 text-luxury-gold"><Sparkles size={20}/><span className="font-serif font-black tracking-widest uppercase text-xs">Concierge</span></div><button onClick={() => setIsConciergeOpen(false)} className="opacity-50"><X/></button></div>
           <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-palais/30">
              {chatMessages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                   <div className={cn("max-w-[85%] p-5 rounded-[32px] text-sm shadow-sm", m.role === 'user' ? "bg-luxury-bordeaux text-white rounded-br-none" : "bg-elite-surface text-elite border border-elite rounded-bl-none")}>{m.text}</div>
                </div>
              ))}
              {isChatLoading && <div className="flex justify-start"><div className="bg-elite-surface p-5 rounded-[32px] border border-elite"><Loader2 className="animate-spin text-luxury-gold" size={20}/></div></div>}
           </div>
           <div className="p-4 bg-elite-surface border-t border-elite flex gap-3">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && askCoach()} placeholder="Votre question..." className="flex-1 bg-palais rounded-3xl px-6 py-4 outline-none text-sm text-elite border border-elite" />
              <button onClick={askCoach} className="bg-luxury-gold text-white p-4 rounded-full"><ChevronRight size={24}/></button>
           </div>
        </div>
      )}

      <nav className="fixed bottom-10 left-8 right-8 bg-luxury-charcoal/95 dark:bg-black/95 backdrop-blur-3xl p-6 rounded-[56px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] flex justify-around items-center z-50 border border-white/5">
        {[
          { id: 'dashboard', icon: TrendingUp, label: 'Palais' },
          { id: 'meals', icon: Utensils, label: 'Menu' },
          { id: 'studio', icon: Dumbbell, label: 'Studio' },
          { id: 'shopping', icon: ShoppingCart, label: 'Réserve' },
          { id: 'progress', icon: HistoryIcon, label: 'Suivi' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={cn("flex flex-col items-center gap-2 transition-all duration-500", activeTab === item.id ? "text-luxury-gold scale-125 -translate-y-1" : "text-white/30 group")}>
            <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 1.5} /><span className={cn("text-[7px] font-black uppercase tracking-[0.3em] transition-all", activeTab === item.id ? "opacity-100" : "opacity-0")}>{item.label}</span>
          </button>
        ))}
      </nav>

      {selectedRecipe && (
        <div className="fixed inset-0 z-[150] bg-palais overflow-y-auto animate-in slide-in-from-bottom duration-700">
           <div className="p-10 max-w-lg mx-auto space-y-12 text-elite">
              <button onClick={() => {setSelectedRecipe(null); setPortions(1);}} className="bg-elite-surface p-5 rounded-[24px] shadow-xl text-luxury-bordeaux border border-elite"><X size={24}/></button>
              <div className="text-center"><h2 className="text-5xl font-serif font-black leading-[1.1] mb-4">{selectedRecipe.name}</h2><p className="opacity-60 italic text-xl">"{selectedRecipe.description}"</p></div>
              <div className="bg-elite-surface p-6 rounded-[40px] shadow-sm border border-elite flex items-center justify-between px-10">
                 <span className="text-xs font-black uppercase opacity-40">Portions</span>
                 <div className="flex items-center gap-6">
                    <button onClick={() => setPortions(p => Math.max(1, p-1))} className="p-3 bg-palais rounded-full text-luxury-bordeaux border border-elite"><Minus size={20}/></button>
                    <span className="text-4xl font-black w-10 text-center">{portions}</span>
                    <button onClick={() => setPortions(p => p+1)} className="p-3 bg-palais rounded-full text-luxury-gold border border-elite"><Plus size={20}/></button>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 {[{v: selectedRecipe.calories * portions, l: 'Kcal'}, {v: (selectedRecipe.costPerPortion * portions).toFixed(2)+'€', l: 'Total'}].map(s => <div key={s.l} className="bg-elite-surface p-8 rounded-[40px] text-center border border-elite shadow-xl"><p className="text-2xl font-black">{s.v}</p><p className="text-[10px] font-black text-luxury-gold uppercase mt-1">{s.l}</p></div>)}
              </div>
           </div>
           <div className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-palais via-palais/90 to-transparent z-[160]"><button onClick={() => { setProgress(prev => ({...prev, consumedCalories: prev.consumedCalories + (selectedRecipe.calories * portions) })); setSelectedRecipe(null); setPortions(1); toast.success('Dégustation validée.'); }} className="w-full bg-luxury-bordeaux text-white font-black py-8 rounded-[40px] shadow-2xl hover:bg-luxury-charcoal transition-all uppercase tracking-[0.4em] text-sm">Valider le repas</button></div>
        </div>
      )}
    </div>
  );
}

export default App;
