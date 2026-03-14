import { useState, useEffect, useRef } from 'react';
import type { UserProfile, NutritionTargets, Recipe, DailyProgress, UserStats, Workout } from './types';
import { calculateNutritionTargets } from './services/nutrition';
import { aggregateShoppingList } from './services/generator';
import { saveProfile, getProfile } from './services/profile';
import { signIn, signUp, signOut, getCurrentUser, signInWithGoogle, resetPassword } from './services/auth';
import { analyzeMealImage, askConcierge, type AIResult } from './services/ai';
import { fetchRecipesFromDB, getDriveLink } from './services/recipeApi';
import type { User } from '@supabase/supabase-js';
import { 
  Utensils, ShoppingCart, ChefHat, Camera, TrendingUp, ChevronRight, CheckCircle2,
  Loader2, X, Award, History as HistoryIcon, LogOut, Sparkles,
  Droplets, Plus, Minus, Dumbbell, Zap, Target, ExternalLink, Mail, Lock as LockIcon,
  Moon, Sun, MessageSquare, Inbox
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { XAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

// --- DATA: RECIPES ---
const INTERNAL_RECIPES: Recipe[] = [
  { id: 'me1', name: 'Pasta Tuna Melt', description: 'Pâtes, thon en boîte, maïs, beaucoup de fromage râpé.', calories: 850, proteins: 45, carbs: 90, fats: 25, prepTime: 12, difficulty: 'EASY', costPerPortion: 1.5, tags: ['MUSCLE_GAIN', 'LOW'], ingredients: [] },
  { id: 'me2', name: 'Riz aux Œufs et Beurre', description: 'Riz, 3 œufs, noisette de beurre, sauce soja.', calories: 700, proteins: 30, carbs: 80, fats: 20, prepTime: 10, difficulty: 'EASY', costPerPortion: 1.2, tags: ['MUSCLE_GAIN', 'LOW'], ingredients: [] },
  { id: 'we1', name: 'Soupe de Lentilles Corail', description: 'Lentilles, carottes, oignons (très rassasiant).', calories: 350, proteins: 25, carbs: 45, fats: 5, prepTime: 20, difficulty: 'EASY', costPerPortion: 1.0, tags: ['WEIGHT_LOSS', 'LOW'], ingredients: [] },
  { id: 'we2', name: 'Colin & Haricots Verts', description: 'Poisson blanc (surgelé), haricots vapeur.', calories: 300, proteins: 40, carbs: 10, fats: 4, prepTime: 15, difficulty: 'EASY', costPerPortion: 1.8, tags: ['WEIGHT_LOSS', 'LOW'], ingredients: [] }
];

const WORKOUT_DATABASE: Workout[] = [
  { id: 'm1', title: 'Séance A : Poussée', focus: 'Pecs, Épaules, Triceps', location: 'GYM', duration: 60, caloriesBurned: 350, exercises: [
    { id: 'e1', name: 'Développé Couché', sets: 4, reps: '10' },
    { id: 'e2', name: 'Développé Militaire', sets: 3, reps: '10' }
  ]},
  { id: 'p1', title: 'Full Body Brûle-Gras', focus: 'Circuit Cardio', location: 'HOME', duration: 30, caloriesBurned: 400, exercises: [
    { id: 'e13', name: 'Gobelet Squat', sets: 4, reps: '20' }
  ]}
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
  const [aiResult, setAIResult] = useState<AIResult | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const [checkedItems, setCheckedItems] = useState<string[]>([]);
  
  // THEME MANAGEMENT
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  const [portions, setPortions] = useState(1);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatMessages, setChatMessages] = useState<{role: 'user' | 'ai', text: string}[]>([{role: 'ai', text: 'Bonjour. Je suis votre Concierge Elite. Comment puis-je parfaire votre journée ?'}]);
  const [isChatLoading, setIsChatLoading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [stats] = useState<UserStats>({
    streak: 12, badges: ['CHEF_ECONOME', 'ELITE_CLUB'], weightHistory: [{ date: '10/03', weight: 71.5 }, { date: '14/03', weight: 70.0 }]
  });

  useEffect(() => { checkUser(); }, []);
  useEffect(() => { if (profile) setTargets(calculateNutritionTargets(profile)); }, [profile]);
  
  // Theme effect at root level
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
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
    if (!email) return toast.error("Veuillez entrer votre adresse email.");
    setIsAppLoading(true);
    try {
      if (authMode === 'signin') { 
        await signIn(email, password); 
        toast.success('Bienvenue au Palais.'); 
        await checkUser(); 
      }
      else if (authMode === 'signup') { 
        await signUp(email, password); 
        setIsVerifyingEmail(true); // SHOW VERIFICATION SCREEN
      }
      else { 
        await resetPassword(email); 
        toast.success('Un lien de réinitialisation a été envoyé.'); 
        setAuthMode('signin'); 
      }
    } catch (e: any) { 
      toast.error(e.message); 
    } finally { 
      setIsAppLoading(false); 
    }
  };

  const handleGenerate = async (prof = profile) => {
    const t = calculateNutritionTargets(prof);
    const filtered = INTERNAL_RECIPES.filter(r => r.tags.includes(prof.goal) && r.tags.includes(prof.budget));
    if (filtered.length > 0) setDailyPlan(filtered.slice(0, 3));
    else {
      const dbRecipes = await fetchRecipesFromDB(prof, t.calories);
      setDailyPlan(dbRecipes.length > 0 ? dbRecipes : INTERNAL_RECIPES);
    }
  };

  const completeOnboarding = async () => {
    if (!session) return;
    setIsAppLoading(true);
    await saveProfile(session.id, profile);
    setHasOnboarded(true);
    handleGenerate();
    setIsAppLoading(false);
    toast.success('Votre Signature Elite a été activée.');
  };

  const logWorkout = (w: Workout) => {
    setProgress(p => ({...p, exerciseCalories: p.exerciseCalories + w.caloriesBurned}));
    setProfile(p => ({...p, xp: p.xp + 50}));
    toast.success(`${w.title} terminé. +50 XP.`);
  };

  const askCoach = async () => {
    if(!chatInput) return;
    setChatMessages(prev => [...prev, {role: 'user', text: chatInput}]);
    setIsChatLoading(true);
    const q = chatInput;
    setChatInput('');
    const remainingCals = (targets?.calories || 0) - progress.consumedCalories + progress.exerciseCalories;
    const answer = await askConcierge(q, profile, remainingCals);
    setChatMessages(prev => [...prev, {role: 'ai', text: answer}]);
    setIsChatLoading(false);
  };

  const substituteIngredient = (ingName: string) => {
    toast.success(`Le Chef Elite a remplacé ${ingName} par une alternative idéale.`, { icon: '✨' });
  };

  const shoppingList = aggregateShoppingList(dailyPlan);
  const remainingCalories = (targets?.calories || 0) - progress.consumedCalories + progress.exerciseCalories;

  if (isAuthLoading) return <div className="h-screen bg-luxury-cream dark:bg-midnight-base flex items-center justify-center"><Loader2 className="animate-spin text-luxury-gold" size={48} /></div>;

  // --- VERIFICATION SCREEN ---
  if (isVerifyingEmail) {
    return (
      <div className="min-h-screen bg-luxury-cream dark:bg-midnight-base p-8 flex flex-col justify-center items-center text-center space-y-10 animate-in fade-in duration-1000">
        <div className="bg-white dark:bg-midnight-surface p-12 rounded-[60px] shadow-2xl border border-luxury-gold/10 relative overflow-hidden max-w-md w-full">
           <div className="absolute top-0 left-0 w-full h-2 bg-luxury-gold animate-pulse" />
           <div className="w-24 h-24 bg-luxury-gold/10 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-luxury-gold">
              <Inbox size={48} />
           </div>
           <h1 className="text-3xl font-serif font-black text-luxury-charcoal dark:text-luxury-cream mb-4">Signature en attente</h1>
           <p className="text-luxury-bordeaux/60 dark:text-luxury-gold/60 font-medium leading-relaxed mb-10">
              Un message de confirmation a été envoyé à <strong>{email}</strong>. <br/><br/>
              Veuillez valider votre accès pour entrer dans le Palais AppliMeal.
           </p>
           <button onClick={() => setIsVerifyingEmail(false)} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[32px] shadow-xl hover:bg-luxury-charcoal transition-all uppercase tracking-widest text-xs">Retour à la connexion</button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-luxury-cream dark:bg-midnight-base p-8 flex flex-col justify-center items-center space-y-12 animate-in fade-in duration-1000">
        <div className="text-center space-y-4">
           <ChefHat size={80} className="mx-auto text-luxury-bordeaux dark:text-luxury-gold mb-4" />
           <h1 className="text-6xl font-serif font-black text-luxury-charcoal dark:text-luxury-cream tracking-tighter">AppliMeal</h1>
           <p className="text-luxury-bordeaux/60 dark:text-luxury-gold/60 font-medium italic uppercase text-[10px] tracking-[0.3em]">L'Excellence au quotidien</p>
        </div>
        <div className="w-full max-w-sm space-y-6 bg-white dark:bg-midnight-surface p-10 rounded-[60px] shadow-2xl border border-luxury-gold/10 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1.5 bg-luxury-gold/20" />
           <div className="space-y-6">
              <div className="space-y-4">
                 <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40 group-focus-within:text-luxury-gold" size={20} />
                    <input type="email" placeholder="Email Signature" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-5 pl-12 bg-luxury-cream dark:bg-black rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all font-medium text-luxury-charcoal dark:text-luxury-cream" />
                 </div>
                 {authMode !== 'forgot' && (
                   <div className="relative group">
                      <LockIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40 group-focus-within:text-luxury-gold" size={20} />
                      <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-5 pl-12 bg-luxury-cream dark:bg-black rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all font-medium text-luxury-charcoal dark:text-luxury-cream" />
                   </div>
                 )}
              </div>
              {authMode === 'signin' && (<div className="flex justify-end pr-2"><button onClick={() => setAuthMode('forgot')} className="text-[10px] font-black text-luxury-gold/60 dark:text-luxury-gold/40 uppercase tracking-widest hover:text-luxury-gold transition-colors">Mot de passe oublié ?</button></div>)}
              <button onClick={handleAuth} disabled={isAppLoading} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[32px] shadow-xl hover:bg-luxury-charcoal transition-all">
                {isAppLoading ? <Loader2 className="animate-spin mx-auto" /> : authMode === 'signin' ? "Accéder au Palais" : authMode === 'signup' ? "Créer ma Signature" : "Réinitialiser"}
              </button>
              {authMode !== 'forgot' && (
                <>
                  <div className="relative flex items-center py-2"><div className="flex-grow border-t border-luxury-gold/10"></div><span className="flex-shrink mx-4 text-luxury-gold/40 text-[10px] font-black uppercase tracking-widest">Ou</span><div className="flex-grow border-t border-luxury-gold/10"></div></div>
                  <button onClick={signInWithGoogle} className="w-full bg-white dark:bg-black border border-luxury-gold/20 text-luxury-charcoal dark:text-luxury-cream font-bold py-5 rounded-[28px] flex items-center justify-center gap-4 shadow-sm hover:bg-luxury-cream dark:hover:bg-midnight-base transition-all group"><img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Google" /><span className="text-xs tracking-widest uppercase">Signature Google</span></button>
                </>
              )}
           </div>
           <p className="text-center"><button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="text-[9px] font-black text-luxury-gold uppercase tracking-[0.3em] hover:text-luxury-bordeaux transition-colors border-b border-luxury-gold/20 pb-1">{authMode === 'signin' ? "Nouveau Membre ? S'inscrire" : "Déjà Membre ? Se connecter"}</button></p>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <div className="min-h-screen bg-luxury-cream dark:bg-midnight-base p-6 flex flex-col justify-center animate-in fade-in duration-500">
        <div className="max-w-md mx-auto w-full bg-white dark:bg-midnight-surface p-10 rounded-[60px] shadow-2xl border border-luxury-gold/10 relative overflow-hidden text-luxury-charcoal dark:text-luxury-cream">
          <div className="absolute top-0 left-0 h-1.5 bg-luxury-gold transition-all duration-500" style={{ width: `${(onboardingStep / 4) * 100}%` }}></div>
          {onboardingStep === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2 text-center sm:text-left"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 1/4</h2><h1 className="text-3xl font-serif font-black leading-tight">Profil Physique</h1></div>
              <div className="space-y-6">
                <div className="flex gap-2">{(['MALE', 'FEMALE', 'OTHER'] as const).map(g => (<button key={g} onClick={() => setProfile({...profile, gender: g})} className={cn("flex-1 py-4 rounded-2xl border text-[10px] font-black transition-all", profile.gender === g ? "bg-luxury-bordeaux text-white border-luxury-bordeaux shadow-lg" : "bg-luxury-cream dark:bg-black text-luxury-gold border-luxury-gold/10")}>{g === 'MALE' ? 'HOMME' : g === 'FEMALE' ? 'FEMME' : 'AUTRE'}</button>))}</div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Âge</span><input type="number" value={profile.age} onChange={e => setProfile({...profile, age: +e.target.value})} className="w-full p-5 bg-luxury-cream dark:bg-black rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold" /></div>
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Poids (kg)</span><input type="number" value={profile.weight} onChange={e => setProfile({...profile, weight: +e.target.value})} className="w-full p-5 bg-luxury-cream dark:bg-black rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold" /></div>
                </div>
                <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Taille (cm)</span><input type="number" value={profile.height} onChange={e => setProfile({...profile, height: +e.target.value})} className="w-full p-5 bg-luxury-cream dark:bg-black rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold" /></div>
              </div>
              <button onClick={() => setOnboardingStep(2)} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[28px] shadow-xl hover:bg-luxury-charcoal transition-all">Suivant</button>
            </div>
          )}
          {onboardingStep === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2 text-center sm:text-left"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 2/4</h2><h1 className="text-3xl font-serif font-black leading-tight">Objectif & Sport</h1></div>
              <div className="space-y-4">
                {(['WEIGHT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN'] as const).map(goal => (<button key={goal} onClick={() => setProfile({...profile, goal})} className={cn("w-full p-6 rounded-[32px] border-2 flex justify-between items-center transition-all", profile.goal === goal ? "border-luxury-gold bg-luxury-cream dark:bg-black" : "border-gray-50 dark:border-black/50 bg-white dark:bg-black/20")}><span className="font-black uppercase text-xs">{goal === 'WEIGHT_LOSS' ? 'Perte de Poids' : goal === 'MAINTENANCE' ? 'Maintien' : 'Prise de Masse'}</span><CheckCircle2 className={cn("transition-all", profile.goal === goal ? "text-luxury-gold" : "text-gray-100 dark:text-gray-800")} /></button>))}
                <div className="grid grid-cols-2 gap-2 mt-4">
                   {(['HOME', 'GYM'] as const).map(loc => (<button key={loc} onClick={() => setProfile({...profile, workoutLocation: loc})} className={cn("py-4 rounded-2xl border text-[10px] font-black uppercase transition-all", profile.workoutLocation === loc ? "bg-luxury-gold text-white" : "bg-luxury-cream dark:bg-black text-luxury-gold border-luxury-gold/10")}>{loc === 'GYM' ? 'En Salle' : 'Maison'}</button>))}
                </div>
                <div className="space-y-1 mt-4"><span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Fréquence</span><div className="flex justify-between items-center bg-luxury-cream dark:bg-black p-4 rounded-2xl"><button onClick={() => setProfile({...profile, trainingFrequency: Math.max(1, profile.trainingFrequency - 1)})} className="p-2 bg-white dark:bg-midnight-surface rounded-xl text-luxury-bordeaux"><Minus size={20}/></button><span className="text-3xl font-black">{profile.trainingFrequency}</span><button onClick={() => setProfile({...profile, trainingFrequency: Math.min(7, profile.trainingFrequency + 1)})} className="p-2 bg-white dark:bg-midnight-surface rounded-xl text-luxury-gold"><Plus size={20}/></button></div></div>
              </div>
              <div className="flex gap-4"><button onClick={() => setOnboardingStep(1)} className="flex-1 bg-luxury-cream dark:bg-black text-luxury-gold font-black py-6 rounded-[28px] text-[10px] uppercase tracking-widest">Retour</button><button onClick={() => setOnboardingStep(3)} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-[28px] shadow-xl hover:bg-luxury-charcoal transition-all">Suivant</button></div>
            </div>
          )}
          {onboardingStep === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2 text-center sm:text-left"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 3/4</h2><h1 className="text-3xl font-serif font-black leading-tight">Budget & Mode</h1></div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Budget par Repas</span>
                  <select value={profile.budget} onChange={e => setProfile({...profile, budget: e.target.value as any})} className="w-full p-5 bg-luxury-cream dark:bg-black rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 font-bold text-luxury-charcoal dark:text-luxury-cream"><option value="LOW">Économique (Étudiant)</option><option value="MEDIUM">Standard</option><option value="HIGH">Gourmet / Prestige</option></select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Temps de Cuisine</span>
                  <select value={profile.prepTime} onChange={e => setProfile({...profile, prepTime: e.target.value as any})} className="w-full p-5 bg-luxury-cream dark:bg-black rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 font-bold text-luxury-charcoal dark:text-luxury-cream"><option value="EXPRESS">Express (&lt; 15 min)</option><option value="MEDIUM">Normal (~ 30 min)</option><option value="CHEF">Chef (45 min +)</option></select>
                </div>
              </div>
              <div className="flex gap-4"><button onClick={() => setOnboardingStep(2)} className="flex-1 bg-luxury-cream dark:bg-black text-luxury-gold font-black py-6 rounded-[28px] text-[10px] uppercase tracking-widest">Retour</button><button onClick={() => setOnboardingStep(4)} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-[28px] shadow-xl hover:bg-luxury-charcoal transition-all">Suivant</button></div>
            </div>
          )}
          {onboardingStep === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2 text-center"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 4/4</h2><h1 className="text-3xl font-serif font-black leading-tight">Visualisation</h1></div>
              <div className="bg-luxury-cream dark:bg-black p-10 rounded-[48px] flex flex-col items-center space-y-4 border border-luxury-gold/10 shadow-inner">
                <span className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.4em]">Poids Cible (kg)</span>
                <input type="number" value={profile.targetWeight} onChange={e => setProfile({...profile, targetWeight: +e.target.value})} className="text-7xl font-black bg-transparent text-center text-luxury-bordeaux dark:text-luxury-gold outline-none w-full" />
                <div className="bg-white dark:bg-midnight-surface px-6 py-2 rounded-full border border-luxury-gold/10 text-[10px] font-black text-luxury-gold uppercase tracking-widest animate-pulse">Objectif : {Math.abs(profile.targetWeight - profile.weight)} kg</div>
              </div>
              <button onClick={completeOnboarding} disabled={isAppLoading} className="w-full bg-luxury-gold text-white font-black py-6 rounded-[28px] shadow-xl shadow-luxury-gold/30 hover:bg-luxury-charcoal transition-all uppercase tracking-widest text-xs">{isAppLoading ? <Loader2 className="animate-spin mx-auto" /> : "Générer mon Destin Elite"}</button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-cream dark:bg-midnight-base text-luxury-charcoal dark:text-luxury-cream transition-colors duration-500 pb-32">
      <Toaster position="top-center" richColors />
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { setIsAILoading(true); try { const r = await analyzeMealImage(file); setAIResult(r); } finally { setIsAILoading(false); } } }} />

      {activeTab === 'dashboard' && (
        <div className="bg-white dark:bg-midnight-surface p-10 rounded-b-[60px] shadow-2xl space-y-10 animate-in slide-in-from-top duration-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-luxury-gold/5 rounded-full -translate-y-1/2 translate-x-1/2"></div>
          
          {/* HEADER ELITE INTEGRÉ */}
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">
                <Award size={16}/> Niv. {profile.level} • {profile.xp} XP
              </div>
              <h1 className="text-3xl font-serif font-black">Votre Palais</h1>
            </div>
            
            <div className="flex gap-2">
              <button onClick={() => setIsDarkMode(!isDarkMode)} className="bg-luxury-cream dark:bg-black p-3 rounded-2xl text-luxury-gold hover:scale-110 transition-all shadow-sm border border-luxury-gold/10">
                {isDarkMode ? <Sun size={20}/> : <Moon size={20}/>}
              </button>
              <button onClick={() => { signOut(); setSession(null); }} className="bg-luxury-cream dark:bg-black p-3 rounded-2xl text-luxury-bordeaux hover:bg-luxury-bordeaux hover:text-white transition-all shadow-sm border border-luxury-gold/10">
                <LogOut size={20}/>
              </button>
            </div>
          </div>

          <div className="relative flex justify-center items-center py-4">
             <svg className="w-72 h-72 transform -rotate-90">
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-luxury-gold/5 dark:text-luxury-gold/10" />
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 125} strokeDashoffset={2 * Math.PI * 125 * (1 - Math.min(1, progress.consumedCalories / (targets?.calories || 1)))} strokeLinecap="round" className="text-luxury-gold transition-all duration-1000 shadow-xl shadow-luxury-gold/20" />
             </svg>
             <div className="absolute text-center space-y-1 z-20">
               {progress.exerciseCalories > 0 && <div className="text-[10px] font-black text-luxury-gold uppercase flex items-center justify-center gap-1 animate-pulse"><Zap size={12}/> +{progress.exerciseCalories} Kcal Sport</div>}
               <span className="text-6xl font-black tracking-tighter">{remainingCalories}</span>
               <p className="text-[10px] text-luxury-gold font-black uppercase tracking-widest tracking-[0.3em]">Calories de réserve</p>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 relative z-10">
             <div className="bg-luxury-cream/30 dark:bg-black/30 p-6 rounded-[40px] border border-luxury-gold/10 flex flex-col items-center space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-luxury-gold font-black uppercase text-[10px] tracking-widest"><Droplets size={16}/> Hydratation</div>
                <div className="flex items-center gap-5"><button onClick={() => setProgress(p => ({...p, waterGlassCount: Math.max(0, p.waterGlassCount-1)}))} className="text-luxury-bordeaux hover:scale-125 transition-transform"><Minus size={20}/></button><span className="text-3xl font-black">{progress.waterGlassCount}</span><button onClick={() => setProgress(p => ({...p, waterGlassCount: p.waterGlassCount+1}))} className="text-luxury-gold hover:scale-125 transition-transform"><Plus size={20}/></button></div>
             </div>
             <div onClick={() => setActiveTab('studio')} className="bg-luxury-bordeaux p-6 rounded-[40px] flex flex-col items-center justify-center space-y-3 cursor-pointer shadow-2xl shadow-luxury-bordeaux/30 hover:scale-105 transition-all text-white group">
                <div className="text-luxury-gold/60 group-hover:text-luxury-gold font-black uppercase text-[10px] tracking-widest opacity-60 group-hover:opacity-100">Elite Studio</div>
                <span className="text-xl font-black flex items-center gap-2"><Dumbbell size={20}/> Entraîner</span>
             </div>
          </div>
          <div onClick={() => fileInputRef.current?.click()} className="bg-luxury-charcoal dark:bg-black p-7 rounded-[40px] text-white flex items-center justify-between shadow-2xl group cursor-pointer hover:scale-[1.02] transition-all">
            <div className="flex items-center gap-5 relative z-10"><div className="bg-luxury-gold p-4 rounded-2xl shadow-inner"><Camera size={28} className="text-luxury-charcoal" /></div><div><p className="text-lg font-black leading-none mb-1">L'Œil Vision IA</p><p className="text-[10px] opacity-60 uppercase font-black tracking-widest tracking-[0.2em]">Analyser mon plat</p></div></div>
            <ChevronRight size={24} className="text-luxury-gold" />
          </div>
        </div>
      )}

      <main className="p-6 max-w-lg mx-auto space-y-8 mt-4">
        {activeTab === 'studio' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="space-y-2 px-2 text-center sm:text-left"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.4em]">Elite Training</h3><h2 className="text-4xl font-serif font-black leading-tight tracking-tight">Studio Privé</h2></div>
             <div className="space-y-6">
                {WORKOUT_DATABASE.filter(w => w.location === profile.workoutLocation).map(w => (
                  <div key={w.id} onClick={() => setActiveWorkout(w)} className="bg-white dark:bg-midnight-surface p-8 rounded-[56px] shadow-2xl border border-luxury-gold/5 flex justify-between items-center group cursor-pointer hover:border-luxury-gold transition-all relative overflow-hidden text-luxury-charcoal dark:text-luxury-cream">
                     <div className="flex items-center gap-6 relative z-10">
                        <div className="w-20 h-20 bg-luxury-cream dark:bg-black rounded-[32px] flex items-center justify-center text-luxury-bordeaux shadow-inner border border-luxury-gold/5 group-hover:scale-110 transition-transform"><Target size={32}/></div>
                        <div><h3 className="font-black text-lg">{w.title}</h3><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{w.duration} MIN • {w.focus}</p></div>
                     </div>
                     <div className="text-right pr-2 relative z-10"><span className="text-xl font-black text-luxury-gold">+{w.caloriesBurned}</span><p className="text-[8px] font-black uppercase text-gray-400 tracking-tighter">Kcal Bonus</p></div>
                  </div>
                ))}
             </div>
          </div>
        )}

        {activeTab === 'meals' && (
          <div className="p-8 space-y-8 animate-in fade-in max-w-lg mx-auto">
             <div className="flex justify-between items-end px-2"><div className="space-y-2"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.4em]">Votre Sélection</h3><h2 className="text-4xl font-serif font-black tracking-tight">Le Menu</h2></div><button onClick={() => handleGenerate()} className="bg-white dark:bg-midnight-surface p-4 rounded-3xl text-luxury-gold shadow-lg hover:rotate-180 transition-all duration-700 border border-luxury-gold/10"><Sparkles /></button></div>
             <div className="space-y-6">
               {dailyPlan.map(recipe => (
                 <div key={recipe.id} onClick={() => { setSelectedRecipe(recipe); setPortions(1); }} className="bg-white dark:bg-midnight-surface p-7 rounded-[56px] shadow-2xl border border-luxury-gold/5 flex gap-6 items-center group cursor-pointer hover:scale-[1.03] transition-all relative overflow-hidden text-luxury-charcoal dark:text-luxury-cream">
                    <div className="w-24 h-24 bg-luxury-cream dark:bg-black rounded-[36px] flex flex-col items-center justify-center text-luxury-bordeaux border border-luxury-gold/10 shadow-inner group-hover:scale-105 transition-transform">
                       <span className="text-2xl font-black leading-none">{recipe.calories}</span><span className="text-[9px] font-black uppercase tracking-tighter">Kcal</span>
                    </div>
                    <div className="flex-1 space-y-2 relative z-10">
                       <h3 className="font-black text-xl leading-tight tracking-tighter">{recipe.name}</h3>
                       <div className="flex items-center gap-3">
                          <span className="text-luxury-gold font-black text-xs bg-luxury-gold/5 px-2 py-1 rounded-lg">{(recipe.costPerPortion).toFixed(2)}€</span>
                          <span className="text-[10px] text-luxury-gold/60 font-black uppercase tracking-[0.2em]">{recipe.prepTime} MIN</span>
                       </div>
                    </div>
                    <ChevronRight size={28} className="text-luxury-gold/20 group-hover:text-luxury-gold transition-all" />
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeTab === 'shopping' && (
          <div className="space-y-10 animate-in fade-in">
             <div className="space-y-2 px-2"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.4em]">Réserve Prestige</h3><h2 className="text-2xl font-serif font-black tracking-tight">Ma Liste</h2></div>
             <div className="bg-luxury-charcoal dark:bg-black text-white p-8 rounded-[56px] shadow-2xl border border-luxury-gold/20 relative overflow-hidden">
                <div className="flex justify-between items-end mb-8 relative z-10"><div><p className="text-[10px] font-black uppercase tracking-widest text-luxury-gold/60 mb-1">Total de l'Excellence</p><p className="text-5xl font-serif font-black tracking-tighter">48.20€</p></div><div className="bg-luxury-gold/10 p-5 rounded-[28px]"><ShoppingCart className="text-luxury-gold" size={32}/></div></div>
                <a href={getDriveLink([])} target="_blank" rel="noreferrer" className="w-full bg-luxury-gold text-white font-black py-5 rounded-[28px] flex items-center justify-center gap-3 hover:bg-luxury-gold/90 transition-all relative z-10 shadow-xl shadow-luxury-gold/20 text-xs uppercase tracking-widest">Commander au Drive Elite <ExternalLink size={18} /></a>
             </div>
             {Object.entries(shoppingList).map(([cat, items]) => (
               <div key={cat} className="space-y-4">
                  <h4 className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.4em] pl-8">{cat}</h4>
                  <div className="bg-white dark:bg-midnight-surface rounded-[48px] shadow-xl overflow-hidden border border-luxury-gold/5 text-luxury-charcoal dark:text-luxury-cream">
                     {(items as any[]).map((ing, i) => {
                        const isChecked = checkedItems.includes(ing.name);
                        return (
                           <div key={i} onClick={() => setCheckedItems(prev => isChecked ? prev.filter(it => it !== ing.name) : [...prev, ing.name])} className={cn("flex justify-between items-center p-7 border-b border-luxury-cream dark:border-black last:border-0 transition-all cursor-pointer", isChecked && "opacity-50")}>
                              <div className="flex items-center gap-5">
                                 <div className={cn("w-7 h-7 border-2 border-luxury-gold/20 rounded-xl transition-all flex items-center justify-center", isChecked && "bg-luxury-gold border-luxury-gold")}>{isChecked && <CheckCircle2 size={16} className="text-white" />}</div>
                                 <span className={cn("font-bold text-lg", isChecked && "line-through")}>{ing.name}</span>
                              </div>
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
             <div className="bg-white dark:bg-midnight-surface p-10 rounded-[56px] shadow-2xl border border-luxury-gold/5 text-luxury-charcoal dark:text-luxury-cream">
                <div className="flex justify-between items-center mb-10"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.4em] flex items-center gap-2"><TrendingUp size={18}/> Courbe Prestige</h3><div className="bg-luxury-cream dark:bg-black px-4 py-1 rounded-full text-[10px] font-black text-luxury-gold shadow-sm border border-luxury-gold/10">OBJECTIF {profile.targetWeight} KG</div></div>
                <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.weightHistory}><defs><linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/><stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" opacity={0.1} /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#D4AF37'}} /><Tooltip contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.1)', backgroundColor: isDarkMode ? '#141414' : '#fff', color: '#D4AF37'}} /><Area type="monotone" dataKey="weight" stroke="#D4AF37" strokeWidth={5} fill="url(#gW)" /></AreaChart></ResponsiveContainer></div>
             </div>
             <div className="bg-luxury-charcoal dark:bg-black p-10 rounded-[60px] shadow-2xl text-white space-y-8 relative overflow-hidden border border-luxury-gold/10">
                <h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.4em] flex items-center gap-3 relative z-10"><Award size={20}/> Succès & Distinction</h3>
                <div className="grid grid-cols-2 gap-5 relative z-10">
                   {stats.badges.map(b => <div key={b} className="bg-white/5 p-8 rounded-[40px] border border-white/10 flex flex-col items-center gap-4 text-center hover:bg-white/10 transition-all group hover:scale-110 transition-transform"><div className="bg-luxury-gold/20 p-5 rounded-[24px] text-luxury-gold group-pulse"><Sparkles size={32}/></div><p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">{b.replace('_', ' ')}</p></div>)}
                </div>
             </div>
          </div>
        )}
      </main>

      {/* FLOATING CONCIERGE BUTTON */}
      {!isConciergeOpen && !selectedRecipe && !activeWorkout && !aiResult && !isVerifyingEmail && (
        <button onClick={() => setIsConciergeOpen(true)} className="fixed bottom-36 right-6 z-[60] bg-luxury-gold text-white p-5 rounded-[28px] shadow-2xl shadow-luxury-gold/40 hover:scale-110 transition-all animate-bounce">
          <MessageSquare size={28} />
        </button>
      )}

      {/* CONCIERGE CHAT MODAL */}
      {isConciergeOpen && (
        <div className="fixed inset-x-4 bottom-32 z-[70] bg-white dark:bg-midnight-surface rounded-[48px] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.6)] border border-luxury-gold/20 flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-500" style={{maxHeight: '60vh'}}>
           <div className="bg-luxury-charcoal dark:bg-black p-6 flex justify-between items-center border-b border-luxury-gold/10">
              <div className="flex items-center gap-3 text-luxury-gold"><Sparkles size={20}/><span className="font-serif font-black tracking-widest uppercase text-xs">Concierge Elite</span></div>
              <button onClick={() => setIsConciergeOpen(false)} className="text-white/50 hover:text-white transition-colors"><X/></button>
           </div>
           <div className="flex-1 p-6 overflow-y-auto space-y-6 bg-luxury-cream/30 dark:bg-black/30">
              {chatMessages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === 'user' ? "justify-end" : "justify-start")}>
                   <div className={cn("max-w-[85%] p-5 rounded-[32px] text-sm leading-relaxed shadow-sm", m.role === 'user' ? "bg-luxury-bordeaux text-white rounded-br-none" : "bg-white dark:bg-black text-luxury-charcoal dark:text-luxury-cream border border-luxury-gold/10 rounded-bl-none")}>
                      {m.text}
                   </div>
                </div>
              ))}
              {isChatLoading && <div className="flex justify-start"><div className="bg-white dark:bg-black p-5 rounded-[32px] rounded-bl-none shadow-sm border border-luxury-gold/10"><Loader2 className="animate-spin text-luxury-gold" size={20}/></div></div>}
           </div>
           <div className="p-4 bg-white dark:bg-midnight-surface border-t border-luxury-gold/10 flex gap-3">
              <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={e => e.key === 'Enter' && askCoach()} placeholder="Posez votre question..." className="flex-1 bg-luxury-cream dark:bg-black rounded-3xl px-6 py-4 outline-none text-sm focus:ring-1 focus:ring-luxury-gold text-luxury-charcoal dark:text-luxury-cream" />
              <button onClick={askCoach} disabled={isChatLoading || !chatInput} className="bg-luxury-gold text-white p-4 rounded-full disabled:opacity-50 hover:bg-luxury-bordeaux transition-colors shadow-lg"><ChevronRight size={24}/></button>
           </div>
        </div>
      )}

      <nav className="fixed bottom-10 left-8 right-8 bg-luxury-charcoal/95 dark:bg-black/95 backdrop-blur-3xl p-6 rounded-[56px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] flex justify-around items-center z-50 border border-white/5 transition-all">
        {[
          { id: 'dashboard', icon: TrendingUp, label: 'Palais' },
          { id: 'meals', icon: Utensils, label: 'Menu' },
          { id: 'studio', icon: Dumbbell, label: 'Studio' },
          { id: 'shopping', icon: ShoppingCart, label: 'Réserve' },
          { id: 'progress', icon: HistoryIcon, label: 'Suivi' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={cn("flex flex-col items-center gap-2 transition-all duration-500", activeTab === item.id ? "text-luxury-gold scale-125 -translate-y-1" : "text-white/30 hover:text-luxury-gold/40 group")}>
            <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
            <span className={cn("text-[7px] font-black uppercase tracking-[0.3em] transition-all", activeTab === item.id ? "opacity-100 scale-100" : "opacity-0 scale-50")}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* FOOTER MODALS ELITE (Portion Scaler & Substitution inside) */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[150] bg-luxury-cream dark:bg-midnight-base overflow-y-auto animate-in slide-in-from-bottom duration-700">
           <div className="p-10 max-w-lg mx-auto space-y-12 pb-48 text-luxury-charcoal dark:text-luxury-cream">
              <button onClick={() => {setSelectedRecipe(null); setPortions(1);}} className="bg-white dark:bg-midnight-surface p-5 rounded-[24px] shadow-xl text-luxury-bordeaux hover:rotate-90 transition-all shadow-luxury-gold/10 border border-luxury-gold/10"><X size={24}/></button>
              <div className="space-y-6 text-center">
                 <div className="bg-luxury-gold/10 inline-block px-6 py-2 rounded-full text-luxury-gold text-[10px] font-black uppercase tracking-[0.4em]">Signature Gastronomique</div>
                 <h2 className="text-5xl font-serif font-black leading-[1.1] tracking-tighter">{selectedRecipe.name}</h2>
                 <p className="text-luxury-bordeaux/60 dark:text-luxury-gold/60 font-medium italic text-xl px-4 leading-relaxed">"{selectedRecipe.description}"</p>
              </div>
              
              <div className="bg-white dark:bg-midnight-surface p-6 rounded-[40px] shadow-sm border border-luxury-gold/10 flex items-center justify-between px-10">
                 <span className="text-xs font-black uppercase tracking-widest text-gray-400">Portions</span>
                 <div className="flex items-center gap-6">
                    <button onClick={() => setPortions(p => Math.max(1, p-1))} className="p-3 bg-luxury-cream dark:bg-black rounded-full text-luxury-bordeaux border border-luxury-gold/10"><Minus size={20}/></button>
                    <span className="text-4xl font-black w-10 text-center">{portions}</span>
                    <button onClick={() => setPortions(p => p+1)} className="p-3 bg-luxury-cream dark:bg-black rounded-full text-luxury-gold border border-luxury-gold/10"><Plus size={20}/></button>
                 </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                 {[{v: selectedRecipe.calories * portions, l: 'Kcal'}, {v: (selectedRecipe.proteins * portions)+'g', l: 'Prot.'}, {v: (selectedRecipe.costPerPortion * portions).toFixed(2)+'€', l: 'Prix Total'}].map(s => <div key={s.l} className="bg-white dark:bg-midnight-surface p-8 rounded-[40px] text-center border border-luxury-gold/10 shadow-xl transition-all"><p className="text-2xl font-black">{s.v}</p><p className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.3em] mt-1">{s.l}</p></div>)}
              </div>
              <div className="bg-white dark:bg-midnight-surface p-10 rounded-[56px] shadow-xl border border-luxury-gold/5 space-y-8">
                 <h3 className="text-xs font-black text-luxury-gold uppercase tracking-[0.4em] text-center">Ingrédients Précis</h3>
                 <div className="space-y-5">
                    {selectedRecipe.ingredients.length === 0 && <div className="text-center italic text-gray-400 uppercase text-[10px] tracking-widest py-10">Ingrédients exclusifs en cours de préparation...</div>}
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-luxury-cream dark:border-black pb-5 last:border-0 last:pb-0 group">
                         <div>
                            <span className="font-bold text-xl block">{ing.name}</span>
                            <button onClick={() => substituteIngredient(ing.name)} className="text-[9px] font-black uppercase tracking-widest text-luxury-gold/50 hover:text-luxury-gold flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity"><Sparkles size={10}/> Remplacer</button>
                         </div>
                         <span className="text-sm font-black text-luxury-gold bg-luxury-cream dark:bg-black px-4 py-2 rounded-xl border border-luxury-gold/10">{ing.quantity * portions} {ing.unit}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
           <div className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-luxury-cream dark:from-midnight-base via-luxury-cream/90 dark:via-midnight-base/90 to-transparent z-[160]"><button onClick={() => { setProgress(prev => ({...prev, consumedCalories: prev.consumedCalories + (selectedRecipe.calories * portions) })); setSelectedRecipe(null); setPortions(1); setProfile(p => ({...p, xp: p.xp + 20})); toast.success('Expérience Gastronomique validée. +20 XP'); }} className="w-full bg-luxury-bordeaux text-white font-black py-8 rounded-[40px] shadow-[0_30px_60px_-15px_rgba(74,4,4,0.4)] hover:bg-luxury-charcoal transition-all uppercase tracking-[0.4em] text-sm shadow-luxury-gold/20">Consommer cette Excellence</button></div>
        </div>
      )}

      {activeWorkout && (
        <div className="fixed inset-0 z-[150] bg-luxury-cream dark:bg-midnight-base overflow-y-auto animate-in slide-in-from-bottom duration-700">
           <div className="p-10 max-w-lg mx-auto space-y-12 pb-48 text-luxury-charcoal dark:text-luxury-cream">
              <button onClick={() => setActiveWorkout(null)} className="bg-white dark:bg-midnight-surface p-5 rounded-[24px] shadow-xl text-luxury-bordeaux hover:rotate-90 transition-all border border-luxury-gold/10"><X size={24}/></button>
              <div className="space-y-4 text-center">
                 <div className="bg-luxury-gold/10 inline-block px-6 py-2 rounded-full text-luxury-gold text-[10px] font-black uppercase tracking-[0.4em]">Séance Privée</div>
                 <h2 className="text-5xl font-serif font-black leading-tight tracking-tighter">{activeWorkout.title}</h2>
                 <p className="text-luxury-bordeaux/60 dark:text-luxury-gold/60 font-black uppercase text-xs tracking-widest tracking-[0.3em]">Échauffement : 5 MIN de mobilité</p>
              </div>
              <div className="space-y-6">
                 {activeWorkout.exercises.map((ex, i) => (
                   <div key={i} className="bg-white dark:bg-midnight-surface p-8 rounded-[48px] shadow-2xl border border-luxury-gold/5 space-y-6">
                      <div className="flex justify-between items-start">
                         <div className="space-y-1">
                            <span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest">Exercice {i+1}</span>
                            <h3 className="text-2xl font-serif font-black">{ex.name}</h3>
                         </div>
                         <div className="bg-luxury-cream dark:bg-black p-4 rounded-3xl text-luxury-bordeaux dark:text-luxury-gold font-black border border-luxury-gold/10">{ex.sets} x {ex.reps}</div>
                      </div>
                      <div className="space-y-3">
                         <span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Charge utilisée (KG)</span>
                         <input type="text" placeholder="Entrez votre poids..." className="w-full p-5 bg-luxury-cream dark:bg-black rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold font-black text-luxury-charcoal dark:text-luxury-cream" />
                      </div>
                   </div>
                 ))}
              </div>
           </div>
           <div className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-luxury-cream dark:from-midnight-base via-luxury-cream/90 dark:via-midnight-base/90 to-transparent z-[160]"><button onClick={() => { logWorkout(activeWorkout); setActiveWorkout(null); }} className="w-full bg-luxury-gold text-white font-black py-8 rounded-[40px] shadow-2xl hover:bg-luxury-charcoal transition-all uppercase tracking-[0.4em] text-sm shadow-luxury-gold/20">Valider la Séance Elite</button></div>
        </div>
      )}

      {aiResult && (
        <div className="fixed inset-0 z-[200] bg-luxury-charcoal/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-in zoom-in duration-500">
           <div className="bg-white dark:bg-midnight-surface w-full max-w-sm rounded-[64px] p-12 space-y-10 shadow-2xl relative overflow-hidden border border-luxury-gold/20">
              <div className="flex justify-between items-center relative z-10"><div className="bg-luxury-gold/10 p-5 rounded-[24px] text-luxury-gold animate-bounce shadow-inner border border-luxury-gold/10"><Sparkles size={32}/></div><button onClick={() => setAIResult(null)}><X className="text-gray-300 dark:text-gray-600" size={24}/></button></div>
              <div className="space-y-8 relative z-10">
                <div className="space-y-3 text-center"><h3 className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.4em] text-center">Vision IA : Excellence détectée</h3><input type="text" value={aiResult.name} onChange={e => setAIResult({...aiResult, name: e.target.value})} className="w-full text-3xl font-serif font-black border-b-2 border-luxury-gold/20 outline-none bg-transparent text-center focus:border-luxury-gold transition-all pb-2 text-luxury-charcoal dark:text-luxury-cream" /></div>
                <div className="bg-luxury-cream dark:bg-black p-10 rounded-[48px] flex flex-col items-center space-y-2 shadow-inner border border-luxury-gold/10">
                  <span className="text-[10px] font-black uppercase text-luxury-gold tracking-[0.3em]">Signature Calorique</span>
                  <div className="flex items-end gap-1"><input type="number" value={aiResult.calories} onChange={e => setAIResult({...aiResult, calories: +e.target.value})} className="w-32 bg-transparent text-center text-6xl font-black text-luxury-bordeaux dark:text-luxury-gold outline-none" /><span className="text-sm font-serif font-black text-luxury-gold/40 mb-2">KCAL</span></div>
                </div>
              </div>
              <button onClick={() => { setProgress(p => ({...p, consumedCalories: p.consumedCalories + (aiResult?.calories || 0)})); setAIResult(null); setProfile(p => ({...p, xp: p.xp + 15})); toast.success('Analyse enregistrée. +15 XP'); }} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[32px] shadow-2xl uppercase tracking-[0.2em] hover:bg-luxury-charcoal transition-all">Confirmer l'Excellence</button>
           </div>
        </div>
      )}

      {isAILoading && (
        <div className="fixed inset-0 z-[250] bg-luxury-charcoal/98 backdrop-blur-3xl flex flex-col items-center justify-center text-white space-y-12">
           <div className="relative"><Camera size={100} className="text-luxury-gold relative z-10" /><Loader2 size={130} className="absolute -top-3.5 -left-3.5 text-luxury-gold animate-spin opacity-40" /></div>
           <p className="text-2xl font-serif font-black tracking-[0.5em] uppercase text-luxury-gold text-center px-10">ANALYSE VISION IA<br/>EN COURS D'EXCELLENCE</p>
        </div>
      )}
    </div>
  );
}

export default App;
