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
  Sun, Inbox, Target, Clock
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { XAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// --- DATA: ELITE RECIPES ---
const INTERNAL_RECIPES: Recipe[] = [
  { 
    id: 'me1', name: 'Pasta Tuna Melt', description: 'Le parfait équilibre entre féculents et protéines pour la masse.', 
    calories: 850, proteins: 45, carbs: 90, fats: 25, prepTime: 12, difficulty: 'EASY', costPerPortion: 1.5, 
    tags: ['MUSCLE_GAIN', 'LOW'], 
    ingredients: [
      { id: 'i1', name: 'Pâtes complètes', quantity: 150, unit: 'g', pricePerUnit: 0.002, category: 'GROCERY' },
      { id: 'i2', name: 'Thon au naturel', quantity: 1, unit: 'boîte', pricePerUnit: 1.2, category: 'GROCERY' },
      { id: 'i3', name: 'Fromage râpé', quantity: 30, unit: 'g', pricePerUnit: 0.01, category: 'DAIRY' }
    ] 
  },
  { 
    id: 'we1', name: 'Soupe de Lentilles Corail', description: 'Volume alimentaire maximal pour une satiété totale.', 
    calories: 350, proteins: 25, carbs: 45, fats: 5, prepTime: 20, difficulty: 'EASY', costPerPortion: 1.0, 
    tags: ['WEIGHT_LOSS', 'LOW'], 
    ingredients: [
      { id: 'i4', name: 'Lentilles Corail', quantity: 100, unit: 'g', pricePerUnit: 0.003, category: 'GROCERY' },
      { id: 'i5', name: 'Carottes fraîches', quantity: 2, unit: 'pcs', pricePerUnit: 0.2, category: 'FRUITS_VEGGIES' }
    ] 
  },
  { 
    id: 'me2', name: 'Riz Œufs Signature', description: 'Recette express du Chef pour les jours intenses.', 
    calories: 700, proteins: 30, carbs: 80, fats: 20, prepTime: 8, difficulty: 'EASY', costPerPortion: 1.2, 
    tags: ['MUSCLE_GAIN', 'LOW'], 
    ingredients: [
      { id: 'i6', name: 'Riz Basmati', quantity: 120, unit: 'g', pricePerUnit: 0.002, category: 'GROCERY' },
      { id: 'i7', name: 'Oeufs bio', quantity: 3, unit: 'pcs', pricePerUnit: 0.3, category: 'DAIRY' }
    ] 
  }
];

// --- DATA: ELITE WORKOUTS ---
const WORKOUT_DATABASE: Workout[] = [
  { 
    id: 'm1', title: 'Séance A : Poussée (Push)', focus: 'Pecs, Épaules, Triceps', location: 'GYM', duration: 60, caloriesBurned: 350, 
    exercises: [
      { id: 'e1', name: 'Développé Couché', sets: 4, reps: '8-10' },
      { id: 'e2', name: 'Développé Militaire', sets: 3, reps: '10' },
      { id: 'e3', name: 'Extensions Triceps', sets: 3, reps: '12' }
    ] 
  },
  { 
    id: 'm2', title: 'Séance B : Tirage (Pull)', focus: 'Dos, Biceps', location: 'GYM', duration: 60, caloriesBurned: 350, 
    exercises: [
      { id: 'e4', name: 'Tractions Signature', sets: 4, reps: 'Max' },
      { id: 'e5', name: 'Rowing Barre', sets: 4, reps: '10' },
      { id: 'e6', name: 'Curl Biceps', sets: 3, reps: '12' }
    ] 
  },
  { 
    id: 'p1', title: 'HIIT Brûle-Gras', focus: 'Cardio Métabolique', location: 'HOME', duration: 25, caloriesBurned: 400, 
    exercises: [
      { id: 'e7', name: 'Burpees Elite', sets: 3, reps: '15' },
      { id: 'e8', name: 'Mountain Climbers', sets: 4, reps: '45s' }
    ] 
  }
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
  const [activeWorkout, setActiveWorkout] = useState<Workout | null>(null);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [portions, setPortions] = useState(1);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([{role: 'ai', text: 'Bienvenue au Palais. Comment puis-je parfaire votre journée ?'}]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { checkUser(); }, []);
  useEffect(() => { if (profile) setTargets(calculateNutritionTargets(profile)); }, [profile]);
  
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) { root.classList.add('dark'); localStorage.setItem('theme', 'dark'); }
    else { root.classList.remove('dark'); localStorage.setItem('theme', 'light'); }
  }, [isDarkMode]);

  const checkUser = async () => {
    try {
      const user = await getCurrentUser();
      if (user) {
        setSession(user);
        const dbProfile = await getProfile(user.id);
        if (dbProfile) { setProfile(prev => ({...prev, ...dbProfile})); setHasOnboarded(true); handleGenerate(dbProfile); }
      }
    } finally { setIsAuthLoading(false); }
  };

  const handleAuth = async () => {
    if (!email) return toast.error("Veuillez entrer votre email.");
    setIsAppLoading(true);
    try {
      if (authMode === 'signin') { await signIn(email, password); toast.success('Accès autorisé.'); await checkUser(); }
      else if (authMode === 'signup') { await signUp(email, password); setIsVerifyingEmail(true); }
      else { await resetPassword(email); toast.success('Lien envoyé.'); setAuthMode('signin'); }
    } catch (e: any) { toast.error(e.message); } finally { setIsAppLoading(false); }
  };

  const handleGenerate = async (prof = profile) => {
    const filtered = INTERNAL_RECIPES.filter(r => r.tags.includes(prof.goal) || r.tags.includes('LOW'));
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

  const shoppingList = aggregateShoppingList(dailyPlan);
  const remainingCalories = (targets?.calories || 0) - progress.consumedCalories + progress.exerciseCalories;

  if (isAuthLoading) return <div className="h-screen bg-palais flex items-center justify-center"><Loader2 className="animate-spin text-luxury-gold" size={48} /></div>;

  if (isVerifyingEmail) {
    return (
      <div className="min-h-screen bg-palais p-8 flex flex-col justify-center items-center text-center animate-in fade-in">
        <div className="bg-surface p-12 rounded-[60px] shadow-2xl border border-theme max-w-md w-full relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-2 bg-luxury-gold animate-pulse"></div>
           <Inbox size={64} className="mx-auto text-luxury-gold mb-6" />
           <h1 className="text-3xl font-serif font-black mb-4">Vérifiez vos emails</h1>
           <p className="opacity-60 mb-10 text-sm leading-relaxed">Un lien de validation a été envoyé à <strong>{email}</strong>. Cliquez dessus pour activer votre accès au Palais.</p>
           <button onClick={() => setIsVerifyingEmail(false)} className="w-full bg-luxury-bordeaux text-white font-black py-5 rounded-3xl uppercase text-[10px] tracking-widest shadow-xl hover:bg-luxury-charcoal transition-all">Retour à la connexion</button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-palais p-8 flex flex-col justify-center items-center space-y-12 animate-in fade-in">
        <div className="text-center">
           <ChefHat size={80} className="mx-auto text-luxury-bordeaux dark:text-luxury-gold mb-4" />
           <h1 className="text-6xl font-serif font-black tracking-tighter">AppliMeal</h1>
           <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40">L'Excellence au quotidien</p>
        </div>
        <div className="w-full max-w-sm space-y-6 bg-surface p-10 rounded-[60px] shadow-2xl border border-theme">
           <div className="space-y-4">
              <div className="relative group"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40" size={20} /><input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 pl-12 bg-palais rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all" /></div>
              {authMode !== 'forgot' && (<div className="relative group"><LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40" size={20} /><input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 pl-12 bg-palais rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all" /></div>)}
           </div>
           <button onClick={handleAuth} disabled={isAppLoading} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[32px] shadow-xl hover:bg-luxury-charcoal transition-all">
             {isAppLoading ? <Loader2 className="animate-spin mx-auto" /> : authMode === 'signin' ? "Accéder au Palais" : authMode === 'signup' ? "Créer ma Signature" : "Réinitialiser"}
           </button>
           <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="w-full text-[9px] font-black text-luxury-gold uppercase tracking-[0.3em] hover:text-luxury-bordeaux transition-colors">{authMode === 'signin' ? "Nouveau Membre ? S'inscrire" : "Déjà Membre ? Se connecter"}</button>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <div className="min-h-screen bg-palais p-6 flex flex-col justify-center animate-in fade-in">
        <div className="max-w-md mx-auto w-full bg-surface p-10 rounded-[60px] shadow-2xl border border-theme relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1.5 bg-luxury-gold transition-all duration-500" style={{ width: `${(onboardingStep / 4) * 100}%` }}></div>
          {onboardingStep === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right">
              <div className="space-y-2 text-center sm:text-left"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 1/4</h2><h1 className="text-3xl font-serif font-black">Profil Physique</h1></div>
              <div className="space-y-6">
                <div className="flex gap-2">{(['MALE', 'FEMALE', 'OTHER'] as const).map(g => (<button key={g} onClick={() => setProfile({...profile, gender: g})} className={cn("flex-1 py-4 rounded-2xl border text-[10px] font-black transition-all", profile.gender === g ? "bg-luxury-bordeaux text-white border-luxury-bordeaux shadow-lg" : "bg-palais text-luxury-gold border-theme")}>{g === 'MALE' ? 'HOMME' : g === 'FEMALE' ? 'FEMME' : 'AUTRE'}</button>))}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase pl-2">Âge</span><input type="number" value={profile.age} onChange={e => setProfile({...profile, age: +e.target.value})} className="w-full p-5 bg-palais rounded-2xl outline-none ring-1 ring-luxury-gold/10 text-theme" /></div>
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase pl-2">Poids (kg)</span><input type="number" value={profile.weight} onChange={e => setProfile({...profile, weight: +e.target.value})} className="w-full p-5 bg-palais rounded-2xl outline-none ring-1 ring-luxury-gold/10 text-theme" /></div>
                </div>
              </div>
              <button onClick={() => setOnboardingStep(2)} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[28px] shadow-xl hover:bg-luxury-charcoal transition-all text-xs uppercase tracking-widest">Suivant</button>
            </div>
          )}
          {onboardingStep === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right">
              <div className="space-y-2 text-center sm:text-left"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 2/4</h2><h1 className="text-3xl font-serif font-black leading-tight">Objectif</h1></div>
              <div className="space-y-4">
                {(['WEIGHT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN'] as const).map(goal => (<button key={goal} onClick={() => setProfile({...profile, goal})} className={cn("w-full p-6 rounded-[32px] border-2 flex justify-between items-center transition-all", profile.goal === goal ? "border-luxury-gold bg-palais shadow-inner" : "border-theme bg-palais/50")}><span className="font-black uppercase text-xs">{goal === 'WEIGHT_LOSS' ? 'Perte de Poids' : goal === 'MAINTENANCE' ? 'Maintien' : 'Prise de Masse'}</span><CheckCircle2 className={cn("transition-all", profile.goal === goal ? "text-luxury-gold" : "opacity-10")} /></button>))}
              </div>
              <div className="flex gap-4"><button onClick={() => setOnboardingStep(1)} className="flex-1 bg-palais text-luxury-gold font-black py-6 rounded-[28px] text-[10px] uppercase tracking-widest border border-theme">Retour</button><button onClick={() => setOnboardingStep(3)} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-[28px] shadow-xl">Suivant</button></div>
            </div>
          )}
          {onboardingStep === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right">
              <div className="space-y-2 text-center sm:text-left"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 3/4</h2><h1 className="text-3xl font-serif font-black">Budget</h1></div>
              <select value={profile.budget} onChange={e => setProfile({...profile, budget: e.target.value as any})} className="w-full p-6 bg-palais rounded-[32px] border-none outline-none ring-1 ring-luxury-gold/10 font-bold text-theme"><option value="LOW">Étudiant / Économique</option><option value="MEDIUM">Standard</option><option value="HIGH">Prestige</option></select>
              <div className="flex gap-4"><button onClick={() => setOnboardingStep(2)} className="flex-1 bg-palais text-luxury-gold font-black py-6 rounded-[28px] text-[10px] uppercase tracking-widest border border-theme">Retour</button><button onClick={() => setOnboardingStep(4)} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-[28px]">Suivant</button></div>
            </div>
          )}
          {onboardingStep === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right text-center">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 4/4</h2><h1 className="text-3xl font-serif font-black">Visualisation</h1></div>
              <div className="bg-palais p-10 rounded-[48px] flex flex-col items-center space-y-4 border border-theme shadow-inner text-theme">
                <span className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.4em]">Poids Cible (kg)</span>
                <input type="number" value={profile.targetWeight} onChange={e => setProfile({...profile, targetWeight: +e.target.value})} className="text-7xl font-black bg-transparent text-center text-luxury-bordeaux outline-none w-full" />
                <div className="bg-white/50 px-6 py-2 rounded-full border border-theme text-[10px] font-black text-luxury-gold uppercase animate-pulse">Objectif : {Math.abs(profile.targetWeight - profile.weight)} kg</div>
              </div>
              <button onClick={completeOnboarding} disabled={isAppLoading} className="w-full bg-luxury-gold text-white font-black py-6 rounded-[28px] shadow-xl uppercase tracking-widest text-[10px]">Générer mon Destin Elite</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-palais text-elite transition-colors duration-500 pb-32">
      <Toaster position="top-center" richColors />
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { try { const r = await analyzeMealImage(file); toast.success(`Signature détectée: ${r.name}`); } catch(e:any){toast.error(e.message);} } }} />

      {activeTab === 'dashboard' && (
        <div className="bg-surface p-10 rounded-b-[60px] shadow-2xl space-y-10 border-b border-elite animate-in slide-in-from-top duration-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-luxury-gold/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1"><div className="flex items-center gap-2 text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]"><Award size={16}/> Niv. {profile.level}</div><h1 className="text-3xl font-serif font-black">Votre Palais</h1></div>
            <div className="flex gap-2">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="bg-palais p-3 rounded-2xl text-luxury-gold shadow-sm border border-elite hover:scale-110 transition-all">
                {isDarkMode ? <Sun size={20}/> : <Sparkles size={20}/>}
              </button>
              <button onClick={() => { signOut(); setSession(null); }} className="bg-palais p-3 rounded-2xl text-luxury-bordeaux shadow-sm border border-elite hover:bg-luxury-bordeaux hover:text-white transition-all">
                <LogOut size={20}/>
              </button>
            </div>
          </div>

          <div className="relative flex justify-center items-center py-4">
             <svg className="w-72 h-72 transform -rotate-90">
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-luxury-gold/5 opacity-20" />
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 125} strokeDashoffset={2 * Math.PI * 125 * (1 - Math.min(1, progress.consumedCalories / (targets?.calories || 1)))} strokeLinecap="round" className="text-luxury-gold transition-all duration-1000 shadow-xl shadow-luxury-gold/20" />
             </svg>
             <div className="absolute text-center space-y-1 z-20">
               <span className="text-6xl font-black tracking-tighter text-theme">{remainingCalories}</span>
               <p className="text-[10px] text-luxury-gold font-black uppercase tracking-[0.3em]">Kcal de réserve</p>
             </div>
          </div>

          {/* MACROS HUD */}
          <div className="grid grid-cols-3 gap-4 relative z-10">
             {[{l: 'Prot.', v: progress.consumedProteins, t: targets?.proteins || 1, c: 'text-luxury-bordeaux'}, {l: 'Gluc.', v: progress.consumedCarbs, t: targets?.carbs || 1, c: 'text-blue-500'}, {l: 'Lip.', v: progress.consumedFats, t: targets?.fats || 1, c: 'text-amber-600'}].map(m => (
               <div key={m.l} className="bg-palais/50 p-4 rounded-3xl border border-elite text-center">
                  <p className={cn("text-[8px] font-black uppercase mb-1", m.c)}>{m.l}</p>
                  <p className="font-black text-sm">{m.v}g</p>
                  <div className="w-full h-1 bg-gray-100 dark:bg-black rounded-full mt-2 overflow-hidden"><div className="h-full bg-luxury-gold transition-all" style={{width: `${Math.min(100, (m.v/m.t)*100)}%`}}></div></div>
               </div>
             ))}
          </div>
          
          <div onClick={() => fileInputRef.current?.click()} className="bg-luxury-charcoal dark:bg-luxury-gold p-7 rounded-[40px] text-white dark:text-luxury-charcoal flex items-center justify-between shadow-2xl group cursor-pointer hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-5"><div className="bg-white/10 dark:bg-black/10 p-4 rounded-2xl shadow-inner"><Camera size={28} /></div><div><p className="text-lg font-black leading-none mb-1">Vision IA</p><p className="text-[10px] opacity-60 uppercase font-black tracking-widest">Analyser mon plat Signature</p></div></div>
            <ChevronRight size={24} />
          </div>
        </div>
      )}

      <main className="p-6 max-w-lg mx-auto space-y-8 mt-4 text-theme">
        {activeTab === 'meals' && (
          <div className="p-8 space-y-8 animate-in fade-in max-w-lg mx-auto">
             <div className="flex justify-between items-end"><h2 className="text-4xl font-serif font-black tracking-tight">Le Menu</h2><button onClick={() => handleGenerate()} className="p-3 bg-surface rounded-2xl text-luxury-gold border border-elite hover:rotate-180 transition-all duration-700 shadow-sm"><Sparkles size={20}/></button></div>
             <div className="space-y-6">
               {dailyPlan.map(recipe => (
                 <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setPortions(1); }} className="bg-surface p-7 rounded-[56px] shadow-2xl border border-elite flex gap-6 items-center group cursor-pointer hover:scale-[1.03] transition-all relative overflow-hidden">
                    <div className="w-24 h-24 bg-palais rounded-[36px] flex flex-col items-center justify-center text-luxury-bordeaux border border-theme shadow-inner group-hover:scale-105 transition-transform">
                       <span className="text-2xl font-black leading-none">{recipe.calories}</span><span className="text-[9px] font-black uppercase tracking-tighter">Kcal</span>
                    </div>
                    <div className="flex-1 space-y-2 relative z-10">
                       <h3 className="font-black text-xl leading-tight tracking-tighter">{recipe.name}</h3>
                       <div className="flex items-center gap-3"><span className="text-luxury-gold font-black text-xs bg-luxury-gold/5 px-2 py-1 rounded-lg">{(recipe.costPerPortion).toFixed(2)}€</span><div className="flex items-center gap-1 opacity-40 text-[10px] font-bold"><Clock size={12}/>{recipe.prepTime} MIN</div></div>
                    </div>
                    <ChevronRight size={28} className="text-luxury-gold/20 group-hover:text-luxury-gold transition-all" />
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'studio' && (
          <div className="space-y-10 animate-in fade-in">
             <h2 className="text-4xl font-serif font-black">Studio Elite</h2>
             <div className="space-y-6">
                {WORKOUT_DATABASE.map(w => (
                  <div key={w.id} onClick={() => setActiveWorkout(w)} className="bg-surface p-8 rounded-[56px] shadow-2xl border border-elite flex justify-between items-center group cursor-pointer hover:border-luxury-gold transition-all">
                     <div className="flex items-center gap-6"><div className="w-20 h-20 bg-palais rounded-[32px] flex items-center justify-center text-luxury-bordeaux border border-theme shadow-inner group-hover:scale-110 transition-transform"><Target size={32}/></div><div><h3 className="font-black text-lg">{w.title}</h3><p className="text-[10px] font-bold opacity-40 uppercase tracking-widest">{w.duration} MIN • {w.focus}</p></div></div>
                     <div className="text-right pr-2"><span className="text-xl font-black text-luxury-gold">+{w.caloriesBurned}</span><p className="text-[8px] font-black uppercase opacity-20">Kcal Bonus</p></div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="space-y-10 animate-in fade-in">
             <h2 className="text-4xl font-serif font-black text-center sm:text-left">Réserve</h2>
             <div className="bg-luxury-charcoal dark:bg-luxury-gold text-white dark:text-luxury-charcoal p-8 rounded-[56px] shadow-2xl flex justify-between items-center relative overflow-hidden border border-luxury-gold/20">
                <div className="space-y-1 relative z-10"><p className="text-[10px] uppercase font-black opacity-60 tracking-widest text-white/60 dark:text-luxury-charcoal/60">Estimation Signature</p><p className="text-4xl font-serif font-black tracking-tighter">48.20€</p></div>
                <a href={getDriveLink([])} target="_blank" rel="noreferrer" className="bg-white/10 dark:bg-black/10 p-5 rounded-3xl hover:scale-110 transition-all shadow-xl relative z-10"><ShoppingCart size={32}/></a>
             </div>
             {Object.entries(shoppingList).map(([cat, items]) => (
               <div key={cat} className="space-y-4">
                  <h4 className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.4em] pl-8">{cat}</h4>
                  <div className="bg-surface rounded-[48px] shadow-xl overflow-hidden border border-theme">
                     {(items as any[]).map((ing, i) => {
                        const isChecked = checkedItems.includes(ing.name);
                        return (
                           <div key={i} onClick={() => setCheckedItems(prev => isChecked ? prev.filter(it => it !== ing.name) : [...prev, ing.name])} className={cn("flex justify-between items-center p-7 border-b border-palais last:border-0 transition-all cursor-pointer group", isChecked && "opacity-30")}>
                              <div className="flex items-center gap-5"><div className={cn("w-7 h-7 border-2 border-luxury-gold/20 rounded-xl flex items-center justify-center transition-all group-hover:border-luxury-gold", isChecked && "bg-luxury-gold border-luxury-gold")}>{isChecked && <CheckCircle2 size={16} className="text-white" />}</div><span className={cn("font-bold text-lg", isChecked && "line-through")}>{ing.name}</span></div>
                              <span className="text-sm font-black text-luxury-gold uppercase">{ing.quantity} {ing.unit}</span>
                           </div>
                        );
                     })}
                  </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="bg-surface p-10 rounded-[56px] shadow-2xl border border-elite">
                <div className="flex justify-between items-center mb-10"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.4em] flex items-center gap-2"><TrendingUp size={18}/> Suivi Prestige</h3><div className="bg-palais px-4 py-1 rounded-full text-[10px] font-black text-theme border border-theme">CIBLE {profile.targetWeight} KG</div></div>
                <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={[{date: '10/03', weight: 71.5}, {date: '14/03', weight: 70.0}]}><defs><linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/><stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" opacity={0.1} /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#D4AF37'}} /><Tooltip contentStyle={{borderRadius: '24px', border: 'none', backgroundColor: isDarkMode ? '#141414' : '#fff', color: '#D4AF37'}} /><Area type="monotone" dataKey="weight" stroke="#D4AF37" strokeWidth={5} fill="url(#gW)" /></AreaChart></ResponsiveContainer></div>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-10 left-8 right-8 bg-luxury-charcoal/95 dark:bg-black/95 backdrop-blur-3xl p-6 rounded-[56px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] flex justify-around items-center z-50 border border-white/5 transition-all">
        {[
          { id: 'dashboard', icon: TrendingUp, label: 'Palais' },
          { id: 'meals', icon: Utensils, label: 'Menu' },
          { id: 'studio', icon: Dumbbell, label: 'Studio' },
          { id: 'shopping', icon: ShoppingCart, label: 'Réserve' },
          { id: 'progress', icon: HistoryIcon, label: 'Suivi' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={cn("flex flex-col items-center gap-2 transition-all duration-500", activeTab === item.id ? "text-luxury-gold scale-125 -translate-y-1" : "text-white/30 group hover:text-white/50")}>
            <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
            <span className={cn("text-[7px] font-black uppercase tracking-[0.3em] transition-all", activeTab === item.id ? "opacity-100 scale-100" : "opacity-0 scale-50")}>{item.label}</span>
          </button>
        ))}
      </nav>

      {isConciergeOpen && (
        <div className="fixed inset-x-4 bottom-32 z-[70] bg-surface rounded-[48px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border border-theme flex flex-col overflow-hidden animate-in slide-in-from-bottom" style={{maxHeight: '60vh'}}>
           <div className="bg-luxury-charcoal dark:bg-black p-6 flex justify-between items-center border-b border-theme text-white">
              <div className="flex items-center gap-3 text-luxury-gold"><Sparkles size={20}/><span className="font-serif font-black tracking-widest uppercase text-xs">Concierge Elite</span></div>
              <button onClick={() => setIsConciergeOpen(false)} className="opacity-50 hover:opacity-100 transition-colors"><X/></button>
           </div>
           <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-palais/30">
              {chatMessages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                   <div className={cn("max-w-[85%] p-5 rounded-[32px] text-sm leading-relaxed shadow-sm", m.role === 'user' ? "bg-luxury-bordeaux text-white rounded-br-none" : "bg-surface text-theme border border-theme rounded-bl-none shadow-gold-glow")}>
                      {m.text}
                   </div>
                </div>
              ))}
              {isChatLoading && <div className="flex justify-start"><div className="bg-surface p-5 rounded-[32px] border border-theme"><Loader2 className="animate-spin text-luxury-gold" size={20}/></div></div>}
           </div>
           <div className="p-4 bg-surface border-t border-theme flex gap-3">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && askCoach()} placeholder="Votre question..." className="flex-1 bg-palais rounded-3xl px-6 py-4 outline-none text-sm text-theme border border-theme focus:ring-1 focus:ring-luxury-gold" />
              <button onClick={askCoach} disabled={isChatLoading || !chatInput} className="bg-luxury-gold text-white p-4 rounded-full hover:bg-luxury-bordeaux transition-all disabled:opacity-50 shadow-lg"><ChevronRight size={24}/></button>
           </div>
        </div>
      )}

      {selectedRecipe && (
        <div className="fixed inset-0 z-[150] bg-palais overflow-y-auto animate-in slide-in-from-bottom duration-700">
           <div className="p-10 max-w-lg mx-auto space-y-12 text-theme">
              <button onClick={() => {setSelectedRecipe(null); setPortions(1);}} className="bg-surface p-5 rounded-[24px] shadow-xl text-luxury-bordeaux border border-theme hover:rotate-90 transition-all"><X size={24}/></button>
              <div className="space-y-6 text-center">
                 <div className="bg-luxury-gold/10 inline-block px-6 py-2 rounded-full text-luxury-gold text-[10px] font-black uppercase tracking-[0.4em]">Signature Gastronomique</div>
                 <h2 className="text-5xl font-serif font-black leading-[1.1] tracking-tighter">{selectedRecipe.name}</h2>
                 <p className="opacity-60 italic text-xl px-4 leading-relaxed">"{selectedRecipe.description}"</p>
              </div>
              <div className="bg-surface p-6 rounded-[40px] shadow-sm border border-theme flex items-center justify-between px-10">
                 <span className="text-xs font-black uppercase tracking-widest opacity-40">Portions</span>
                 <div className="flex items-center gap-6">
                    <button onClick={() => setPortions(p => Math.max(1, p-1))} className="p-3 bg-palais rounded-full text-luxury-bordeaux border border-theme hover:scale-110 transition-all"><Minus size={20}/></button>
                    <span className="text-4xl font-black w-10 text-center">{portions}</span>
                    <button onClick={() => setPortions(p => p+1)} className="p-3 bg-palais rounded-full text-luxury-gold border border-theme hover:scale-110 transition-all"><Plus size={20}/></button>
                 </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                 {[{v: selectedRecipe.calories * portions, l: 'Kcal'}, {v: (selectedRecipe.costPerPortion * portions).toFixed(2)+'€', l: 'Prix Signature'}].map(s => <div key={s.l} className="bg-surface p-8 rounded-[40px] text-center border border-theme shadow-xl transition-all"><p className="text-2xl font-black">{s.v}</p><p className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.3em] mt-1">{s.l}</p></div>)}
              </div>
              <div className="bg-surface p-10 rounded-[56px] shadow-xl border border-theme space-y-8">
                 <h3 className="text-xs font-black text-luxury-gold uppercase tracking-[0.4em] text-center">Ingrédients Précis</h3>
                 <div className="space-y-5">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-palais pb-5 last:border-0 last:pb-0">
                         <span className="font-bold text-xl">{ing.name}</span>
                         <span className="text-sm font-black text-luxury-gold bg-palais px-4 py-2 rounded-xl border border-theme">{ing.quantity * portions} {ing.unit}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
           <div className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-palais via-palais/90 to-transparent z-[160]"><button onClick={() => { setProgress(prev => ({...prev, consumedCalories: prev.consumedCalories + (selectedRecipe.calories * portions), consumedProteins: prev.consumedProteins + (selectedRecipe.proteins * portions), consumedCarbs: prev.consumedCarbs + (selectedRecipe.carbs * portions), consumedFats: prev.consumedFats + (selectedRecipe.fats * portions) })); setSelectedRecipe(null); setPortions(1); toast.success('Dégustation validée. Macros ajoutées.'); }} className="w-full bg-luxury-bordeaux text-white font-black py-8 rounded-[40px] shadow-2xl hover:bg-luxury-charcoal transition-all uppercase tracking-[0.4em] text-sm shadow-luxury-gold/20">Consommer cette Excellence</button></div>
        </div>
      )}

      {activeWorkout && (
        <div className="fixed inset-0 z-[150] bg-palais overflow-y-auto animate-in slide-in-from-bottom duration-700">
           <div className="p-10 max-w-lg mx-auto space-y-12 text-theme">
              <button onClick={() => setActiveWorkout(null)} className="bg-surface p-5 rounded-[24px] shadow-xl text-luxury-bordeaux border border-theme hover:rotate-90 transition-all"><X size={24}/></button>
              <div className="space-y-4 text-center">
                 <div className="bg-luxury-gold/10 inline-block px-6 py-2 rounded-full text-luxury-gold text-[10px] font-black uppercase tracking-[0.4em]">Séance Privée</div>
                 <h2 className="text-5xl font-serif font-black leading-tight tracking-tighter">{activeWorkout.title}</h2>
                 <p className="opacity-60 uppercase text-[10px] font-black tracking-widest mt-2">{activeWorkout.focus} • {activeWorkout.duration} MIN</p>
              </div>
              <div className="space-y-6">
                 {activeWorkout.exercises.map((ex, i) => (
                   <div key={i} className="bg-surface p-8 rounded-[48px] border border-theme shadow-lg space-y-6">
                      <div className="flex justify-between items-start">
                         <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest">Exercice {i+1}</span><h3 className="text-2xl font-serif font-black">{ex.name}</h3></div>
                         <div className="bg-palais p-4 rounded-3xl text-luxury-bordeaux dark:text-luxury-gold font-black border border-theme shadow-inner">{ex.sets} x {ex.reps}</div>
                      </div>
                      <div className="space-y-2"><span className="text-[8px] font-black uppercase opacity-40 pl-2">Note de charge (KG)</span><input type="text" placeholder="Notez votre poids utilisé..." className="w-full p-5 bg-palais rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all text-theme font-black" /></div>
                   </div>
                 ))}
              </div>
           </div>
           <div className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-palais via-palais/90 to-transparent z-[160]"><button onClick={() => { setProgress(p => ({...p, exerciseCalories: p.exerciseCalories + activeWorkout.caloriesBurned})); setActiveWorkout(null); toast.success('Séance terminée. +XP Elite'); }} className="w-full bg-luxury-gold text-white font-black py-8 rounded-[40px] shadow-xl hover:bg-luxury-charcoal transition-all uppercase tracking-[0.4em] text-sm shadow-luxury-gold/30">Terminer la Séance</button></div>
        </div>
      )}
    </div>
  );
}

export default App;
