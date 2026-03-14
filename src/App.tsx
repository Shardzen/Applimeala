import { useState, useEffect, useRef } from 'react';
import type { UserProfile, NutritionTargets, Recipe, DailyProgress, ActivityLevel, BudgetLevel, DietType, Workout } from './types';
import { calculateNutritionTargets } from './services/nutrition';
import { saveProfile, getProfile } from './services/profile';
import { signIn, signUp, signOut, getCurrentUser, signInWithGoogle } from './services/auth';
import { analyzeMealImage, type AIResult } from './services/ai';
import { fetchRecipesFromDB } from './services/recipeApi';
import type { User } from '@supabase/supabase-js';
import { 
  Utensils, ShoppingCart, ChefHat, Camera, TrendingUp, ChevronRight, CheckCircle2,
  Loader2, X, Award, History as HistoryIcon, Clock, LogOut, Sparkles,
  Droplets, Plus, Minus, Dumbbell, MapPin, Zap, Target
} from 'lucide-react';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }

const WORKOUTS: Workout[] = [
  { id: 'w1', title: 'Brûle-Gras Express', focus: 'CARDIO', location: 'HOME', duration: 15, caloriesBurned: 250, exercises: [] },
  { id: 'w2', title: 'Puissance Athlétique', focus: 'STRENGTH', location: 'GYM', duration: 45, caloriesBurned: 400, exercises: [] },
  { id: 'w3', title: 'Full Body Elite', focus: 'STRENGTH', location: 'HOME', duration: 30, caloriesBurned: 300, exercises: [] }
];

const MOCK_RECIPES: Recipe[] = [
  { id: 'm1', name: 'Filet de Bœuf Rossini', description: 'Le prestige dans votre assiette. Truffe et foie gras.', calories: 750, proteins: 40, carbs: 10, fats: 55, prepTime: 30, difficulty: 'HARD', costPerPortion: 12.5, tags: ['PRESTIGE'], ingredients: [] },
  { id: 'w1', name: 'Salade de Homard', description: 'Légèreté et luxe. Agrumes et homard bleu.', calories: 350, proteins: 35, carbs: 15, fats: 8, prepTime: 20, difficulty: 'MEDIUM', costPerPortion: 15.0, tags: ['PERTE'], ingredients: [] }
];

function App() {
  const [session, setSession] = useState<User | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [onboardingStep, setOnboardingStep] = useState(1);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meals' | 'shopping' | 'studio' | 'progress'>('dashboard');
  
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [profile, setProfile] = useState<UserProfile>({
    gender: 'MALE', age: 25, height: 175, weight: 70, targetWeight: 65,
    activityLevel: 'MODERATE', goal: 'WEIGHT_LOSS', goalSpeed: 'STANDARD',
    budget: 'MEDIUM', prepTime: 'MEDIUM', diet: 'NONE', exclusions: [], xp: 0, level: 1, streak: 0
  });

  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [progress, setProgress] = useState<DailyProgress>({ consumedCalories: 0, consumedProteins: 0, consumedCarbs: 0, consumedFats: 0, waterGlassCount: 0, exerciseCalories: 0 });
  const [dailyPlan, setDailyPlan] = useState<Recipe[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [aiResult, setAIResult] = useState<AIResult | null>(null);
  const [isAILoading, setIsAILoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { checkUser(); }, []);
  useEffect(() => { if (profile) setTargets(calculateNutritionTargets(profile)); }, [profile]);

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
    setIsAppLoading(true);
    try {
      if (authMode === 'signin') await signIn(email, password);
      else await signUp(email, password);
      checkUser();
    } catch (e: any) { toast.error(e.message); } finally { setIsAppLoading(false); }
  };

  const handleGoogleAuth = async () => {
    try { await signInWithGoogle(); } catch (e: any) { toast.error(e.message); }
  };

  const handleGenerate = async (prof = profile) => {
    const t = calculateNutritionTargets(prof);
    const dbRecipes = await fetchRecipesFromDB(prof, t.calories);
    setDailyPlan(dbRecipes.length > 0 ? dbRecipes : MOCK_RECIPES);
  };

  const nextStep = () => setOnboardingStep(s => s + 1);
  const prevStep = () => setOnboardingStep(s => Math.max(1, s - 1));

  const completeOnboarding = async () => {
    if (!session) return;
    setIsAppLoading(true);
    await saveProfile(session.id, profile);
    setHasOnboarded(true);
    handleGenerate();
    setIsAppLoading(false);
    toast.success('Signature Elite activée.');
  };

  const logWorkout = (w: Workout) => {
    setProgress(p => ({...p, exerciseCalories: p.exerciseCalories + w.caloriesBurned}));
    setProfile(p => ({...p, xp: p.xp + 50}));
    toast.success(`${w.title} terminé. +50 XP & +${w.caloriesBurned} kcal bonus.`);
  };

  if (isAuthLoading) return <div className="h-screen bg-luxury-cream flex items-center justify-center"><Loader2 className="animate-spin text-luxury-gold" size={48} /></div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-luxury-cream p-8 flex flex-col justify-center items-center space-y-12">
        <div className="text-center space-y-2 animate-in fade-in duration-1000">
           <ChefHat size={80} className="mx-auto text-luxury-bordeaux mb-4" />
           <h1 className="text-5xl font-serif font-black text-luxury-charcoal tracking-tighter">AppliMeal</h1>
           <p className="text-luxury-bordeaux/60 font-medium italic tracking-widest uppercase text-[10px]">L'Excellence Nutritionnelle</p>
        </div>
        <div className="w-full max-w-sm space-y-6 bg-white p-10 rounded-[48px] shadow-2xl border border-luxury-gold/10">
           <div className="space-y-4">
              <input type="email" placeholder="Email Signature" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold" />
              <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold" />
           </div>
           <button onClick={handleAuth} disabled={isAppLoading} className="w-full bg-luxury-bordeaux text-white font-black py-5 rounded-3xl shadow-xl hover:bg-luxury-charcoal transition-all">
             {isAppLoading ? <Loader2 className="animate-spin mx-auto" /> : authMode === 'signin' ? "Accéder au Palais" : "Créer ma Signature"}
           </button>
           <div className="relative flex items-center py-2"><div className="flex-grow border-t border-gray-100"></div><span className="flex-shrink mx-4 text-gray-300 text-[10px] font-bold uppercase">Ou</span><div className="flex-grow border-t border-gray-100"></div></div>
           <button onClick={handleGoogleAuth} className="w-full bg-white border border-gray-100 text-gray-600 font-bold py-4 rounded-3xl flex items-center justify-center gap-3 shadow-sm hover:bg-gray-50 transition-all">
             <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" /> Se connecter avec Google
           </button>
           <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="w-full text-xs font-black text-luxury-gold uppercase tracking-widest underline mt-2">{authMode === 'signin' ? "Nouveau ici ?" : "Déjà membre ?"}</button>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <div className="min-h-screen bg-luxury-cream p-6 flex flex-col justify-center animate-in fade-in duration-500">
        <div className="max-w-md mx-auto w-full bg-white p-10 rounded-[60px] shadow-2xl border border-luxury-gold/10 relative overflow-hidden">
          <div className="absolute top-0 left-0 h-1.5 bg-luxury-gold transition-all duration-500" style={{ width: `${(onboardingStep / 4) * 100}%` }}></div>
          
          {onboardingStep === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 1/4</h2><h1 className="text-3xl font-serif font-black text-luxury-charcoal leading-tight">Profil Physique</h1></div>
              <div className="space-y-6">
                <div className="flex gap-2">
                  {(['MALE', 'FEMALE', 'OTHER'] as const).map(g => (
                    <button key={g} onClick={() => setProfile({...profile, gender: g})} className={cn("flex-1 py-4 rounded-2xl border text-[10px] font-black transition-all", profile.gender === g ? "bg-luxury-bordeaux text-white" : "bg-luxury-cream text-luxury-gold")}>{g === 'MALE' ? 'HOMME' : g === 'FEMALE' ? 'FEMME' : 'AUTRE'}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase">Âge</span><input type="number" value={profile.age} onChange={e => setProfile({...profile, age: +e.target.value})} className="w-full p-4 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10" /></div>
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase">Taille (cm)</span><input type="number" value={profile.height} onChange={e => setProfile({...profile, height: +e.target.value})} className="w-full p-4 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10" /></div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-luxury-gold uppercase">Niveau d'Activité</span>
                  <select value={profile.activityLevel} onChange={e => setProfile({...profile, activityLevel: e.target.value as ActivityLevel})} className="w-full p-4 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 font-bold">
                    <option value="SEDENTARY">Sédentaire (Bureau)</option>
                    <option value="LIGHT">Léger (1-2 séances)</option>
                    <option value="MODERATE">Modéré (3-4 séances)</option>
                    <option value="INTENSE">Intense (Elite)</option>
                  </select>
                </div>
              </div>
              <button onClick={nextStep} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-3xl shadow-xl">Suivant</button>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 2/4</h2><h1 className="text-3xl font-serif font-black text-luxury-charcoal leading-tight">Votre Objectif</h1></div>
              <div className="space-y-6">
                {(['WEIGHT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN'] as const).map(goal => (
                  <button key={goal} onClick={() => setProfile({...profile, goal})} className={cn("w-full p-6 rounded-[32px] border-2 flex justify-between items-center transition-all", profile.goal === goal ? "border-luxury-gold bg-luxury-cream" : "border-gray-50")}>
                    <span className="font-black text-luxury-charcoal">{goal === 'WEIGHT_LOSS' ? 'Perte de Poids' : goal === 'MAINTENANCE' ? 'Maintien & Santé' : 'Prise de Masse'}</span>
                    {profile.goal === goal && <CheckCircle2 className="text-luxury-gold" />}
                  </button>
                ))}
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-luxury-gold uppercase">Vitesse souhaitée</span>
                  <div className="flex gap-2">
                    {(['SLOW', 'STANDARD', 'FAST'] as const).map(s => (
                      <button key={s} onClick={() => setProfile({...profile, goalSpeed: s})} className={cn("flex-1 py-3 rounded-xl border text-[9px] font-black", profile.goalSpeed === s ? "bg-luxury-gold text-white" : "bg-luxury-cream text-luxury-gold")}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4"><button onClick={prevStep} className="flex-1 bg-luxury-cream text-luxury-gold font-black py-6 rounded-3xl">Retour</button><button onClick={nextStep} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-3xl shadow-xl">Suivant</button></div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 3/4</h2><h1 className="text-3xl font-serif font-black text-luxury-charcoal leading-tight">Mode de Vie</h1></div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-luxury-gold uppercase">Budget par Repas</span>
                  <select value={profile.budget} onChange={e => setProfile({...profile, budget: e.target.value as BudgetLevel})} className="w-full p-4 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 font-bold">
                    <option value="LOW">Économique (Étudiant)</option>
                    <option value="MEDIUM">Standard</option>
                    <option value="HIGH">Gourmet / Sans Limite</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-luxury-gold uppercase">Régime Spécifique</span>
                  <select value={profile.diet} onChange={e => setProfile({...profile, diet: e.target.value as DietType})} className="w-full p-4 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 font-bold">
                    <option value="NONE">Aucun</option>
                    <option value="VEGETARIAN">Végétarien</option>
                    <option value="VEGAN">Végan</option>
                    <option value="HALAL">Halal</option>
                    <option value="GLUTEN_FREE">Sans Gluten</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4"><button onClick={prevStep} className="flex-1 bg-luxury-cream text-luxury-gold font-black py-6 rounded-3xl">Retour</button><button onClick={nextStep} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-3xl shadow-xl">Suivant</button></div>
            </div>
          )}

          {onboardingStep === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 4/4</h2><h1 className="text-3xl font-serif font-black text-luxury-charcoal leading-tight">Visualisation</h1></div>
              <div className="space-y-6">
                <div className="bg-luxury-cream p-8 rounded-[40px] flex flex-col items-center space-y-4 border border-luxury-gold/10">
                  <span className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.4em]">Poids Cible</span>
                  <input type="number" value={profile.targetWeight} onChange={e => setProfile({...profile, targetWeight: +e.target.value})} className="text-6xl font-black bg-transparent text-center text-luxury-bordeaux outline-none w-full" />
                  <span className="text-xs font-bold text-luxury-bordeaux/40 italic">Objectif : {profile.targetWeight - profile.weight} kg</span>
                </div>
              </div>
              <div className="flex gap-4"><button onClick={prevStep} className="flex-1 bg-luxury-cream text-luxury-gold font-black py-6 rounded-3xl">Retour</button><button onClick={completeOnboarding} disabled={isAppLoading} className="flex-[2] bg-luxury-gold text-white font-black py-6 rounded-3xl shadow-xl">
                {isAppLoading ? <Loader2 className="animate-spin mx-auto" /> : "Finaliser ma Signature"}
              </button></div>
            </div>
          )}
        </div>
      </div>
    );
  }

  const remainingCalories = (targets?.calories || 0) - progress.consumedCalories + progress.exerciseCalories;

  return (
    <div className="min-h-screen bg-luxury-cream pb-32">
      <Toaster position="top-center" richColors />
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { setIsAILoading(true); try { const r = await analyzeMealImage(file); setAIResult(r); } finally { setIsAILoading(false); } } }} />

      {activeTab === 'dashboard' && (
        <div className="bg-white p-10 rounded-b-[60px] shadow-2xl space-y-10 animate-in slide-in-from-top duration-700">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]"><Award size={16}/> Niv. {profile.level} • XP {profile.xp}</div>
              <h1 className="text-3xl font-serif font-black text-luxury-charcoal">Votre Palais</h1>
            </div>
            <button onClick={() => { signOut(); setSession(null); }} className="bg-luxury-cream p-3 rounded-2xl text-luxury-bordeaux"><LogOut size={20}/></button>
          </div>

          <div className="relative flex justify-center items-center">
             <svg className="w-72 h-72 transform -rotate-90">
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-luxury-gold/5" />
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 125} strokeDashoffset={2 * Math.PI * 125 * (1 - Math.min(1, progress.consumedCalories / (targets?.calories || 1)))} strokeLinecap="round" className="text-luxury-gold transition-all duration-1000 shadow-xl shadow-luxury-gold/20" />
             </svg>
             <div className="absolute text-center space-y-1">
               {progress.exerciseCalories > 0 && <div className="text-[10px] font-black text-luxury-gold uppercase tracking-widest flex items-center justify-center gap-1 mb-1 animate-pulse"><Zap size={12}/> +{progress.exerciseCalories} Kcal Sport</div>}
               <span className="text-5xl font-black text-luxury-charcoal tracking-tighter">{remainingCalories}</span>
               <p className="text-[10px] text-luxury-gold font-black uppercase tracking-widest">Kcal de réserve</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="bg-luxury-cream/30 p-5 rounded-[32px] border border-luxury-gold/10 flex flex-col items-center space-y-2">
                <div className="flex items-center gap-2 text-luxury-gold font-black uppercase text-[10px] tracking-widest"><Droplets size={16}/> Hydratation</div>
                <div className="flex items-center gap-4">
                   <button onClick={() => setProgress(p => ({...p, waterGlassCount: Math.max(0, p.waterGlassCount-1)}))} className="text-luxury-bordeaux"><Minus size={18}/></button>
                   <span className="text-2xl font-black text-luxury-charcoal">{progress.waterGlassCount}</span>
                   <button onClick={() => setProgress(p => ({...p, waterGlassCount: p.waterGlassCount+1}))} className="text-luxury-gold"><Plus size={18}/></button>
                </div>
             </div>
             <div onClick={() => setActiveTab('studio')} className="bg-luxury-bordeaux p-5 rounded-[32px] flex flex-col items-center justify-center space-y-2 cursor-pointer shadow-xl shadow-luxury-bordeaux/20 hover:scale-105 transition-all text-white">
                <div className="text-luxury-gold font-black uppercase text-[10px] tracking-widest">Studio Sport</div>
                <span className="text-xl font-black flex items-center gap-2"><Dumbbell size={18}/> Entraîner</span>
             </div>
          </div>

          <div onClick={() => fileInputRef.current?.click()} className="bg-luxury-charcoal p-6 rounded-[32px] text-white flex items-center justify-between shadow-2xl group cursor-pointer hover:bg-black transition-all">
            <div className="flex items-center gap-4"><div className="bg-luxury-gold p-3 rounded-2xl"><Camera size={24} className="text-luxury-charcoal" /></div><div><p className="text-md font-bold">L'Œil Vision IA</p><p className="text-[10px] opacity-60 uppercase font-black tracking-widest tracking-[0.2em]">Analyser mon plat</p></div></div>
            <ChevronRight size={24} className="text-luxury-gold" />
          </div>
        </div>
      )}

      {activeTab === 'studio' && (
        <div className="p-6 space-y-8 animate-in fade-in">
           <div className="space-y-1 px-2"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.2em]">Elite Studio</h3><h2 className="text-2xl font-serif font-black text-luxury-charcoal leading-tight">Programmes d'Excellence</h2></div>
           <div className="grid grid-cols-2 gap-4">
              {['HOME', 'GYM'].map(loc => (
                <button key={loc} className="bg-white p-6 rounded-[40px] flex flex-col items-center gap-2 shadow-sm border border-luxury-gold/5"><MapPin size={24} className="text-luxury-gold"/><span className="text-[10px] font-black uppercase tracking-widest">{loc === 'HOME' ? 'À la maison' : 'En Salle'}</span></button>
              ))}
           </div>
           <div className="space-y-4">
              {WORKOUTS.map(w => (
                <div key={w.id} onClick={() => logWorkout(w)} className="bg-white p-6 rounded-[40px] shadow-xl border border-luxury-gold/5 flex justify-between items-center group cursor-pointer hover:border-luxury-gold transition-all">
                   <div className="flex items-center gap-5">
                      <div className="w-16 h-16 bg-luxury-cream rounded-[24px] flex items-center justify-center text-luxury-bordeaux"><Target size={28}/></div>
                      <div><h3 className="font-black text-luxury-charcoal">{w.title}</h3><p className="text-[10px] font-bold text-gray-400 uppercase">{w.duration} min • {w.focus}</p></div>
                   </div>
                   <div className="text-right"><span className="text-luxury-gold font-black">+{w.caloriesBurned}</span><p className="text-[8px] font-black uppercase text-gray-300">Kcal</p></div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'meals' && (
        <div className="p-6 space-y-6 animate-in fade-in">
           <div className="flex justify-between items-end px-2"><div className="space-y-1"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.2em]">Votre Sélection</h3><h2 className="text-2xl font-serif font-black text-luxury-charcoal">Menu Gastronomique</h2></div><button onClick={() => handleGenerate()} className="text-luxury-gold hover:rotate-180 transition-all duration-500"><Sparkles /></button></div>
           {dailyPlan.map(recipe => (
             <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="bg-white p-6 rounded-[40px] shadow-xl border border-luxury-gold/5 flex gap-6 items-center group cursor-pointer hover:scale-[1.02] transition-all">
                <div className="w-24 h-24 bg-luxury-cream rounded-[32px] flex flex-col items-center justify-center text-luxury-bordeaux border border-luxury-gold/10"><span className="text-xl font-black">{recipe.calories}</span><span className="text-[10px] font-black uppercase">Kcal</span></div>
                <div className="flex-1 space-y-2"><h3 className="font-black text-luxury-charcoal text-lg leading-tight">{recipe.name}</h3><div className="flex items-center gap-3"><span className="text-luxury-gold font-black text-xs flex items-center gap-1"><Clock size={14}/> {recipe.prepTime} min</span><div className="w-1 h-1 bg-luxury-gold/30 rounded-full" /><span className="text-[10px] text-luxury-gold/60 font-black uppercase tracking-widest">{recipe.difficulty}</span></div></div>
                <ChevronRight size={24} className="text-luxury-gold/20" />
             </div>
           ))}
        </div>
      )}

      <nav className="fixed bottom-10 left-8 right-8 bg-luxury-charcoal/90 backdrop-blur-2xl p-6 rounded-[48px] shadow-2xl flex justify-around items-center z-50 border border-white/10">
        {[
          { id: 'dashboard', icon: TrendingUp, label: 'Palais' },
          { id: 'meals', icon: Utensils, label: 'Menu' },
          { id: 'studio', icon: Dumbbell, label: 'Studio' },
          { id: 'shopping', icon: ShoppingCart, label: 'Réserve' },
          { id: 'progress', icon: HistoryIcon, label: 'Suivi' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={cn("flex flex-col items-center gap-2 transition-all duration-500", activeTab === item.id ? "text-luxury-gold scale-125" : "text-luxury-gold/20")}>
            <item.icon size={24} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
            <span className="text-[7px] font-black uppercase tracking-[0.2em]">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* FOOTER PWA STYLE MODALS */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[150] bg-luxury-cream overflow-y-auto animate-in slide-in-from-bottom duration-700">
           <div className="p-10 max-w-lg mx-auto space-y-12 pb-40">
              <button onClick={() => setSelectedRecipe(null)} className="bg-white p-4 rounded-2xl shadow-sm text-luxury-bordeaux"><X /></button>
              <div className="space-y-4 text-center">
                 <h2 className="text-4xl font-serif font-black text-luxury-charcoal leading-tight">{selectedRecipe.name}</h2>
                 <p className="text-luxury-bordeaux/60 font-medium italic text-lg">{selectedRecipe.description}</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                 {[{v: selectedRecipe.calories, l: 'Kcal'}, {v: selectedRecipe.proteins+'g', l: 'Prot.'}, {v: selectedRecipe.prepTime+'m', l: 'Temps'}].map(s => <div key={s.l} className="bg-white p-6 rounded-[32px] text-center border border-luxury-gold/10 shadow-sm"><p className="text-2xl font-black text-luxury-charcoal">{s.v}</p><p className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.2em]">{s.l}</p></div>)}
              </div>
              <button onClick={() => { setProgress(prev => ({...prev, consumedCalories: prev.consumedCalories + (selectedRecipe?.calories || 0) })); setSelectedRecipe(null); setProfile(p => ({...p, xp: p.xp + 10})); toast.success('Dégustation Signature. +10 XP'); }} className="w-full bg-luxury-bordeaux text-white font-black py-7 rounded-[32px] shadow-2xl">Déguster ce Repas</button>
           </div>
        </div>
      )}

      {/* AI MODAL (MANUAL LOG) */}
      {aiResult && (
        <div className="fixed inset-0 z-[200] bg-luxury-charcoal/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[56px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-luxury-gold/10 rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="flex justify-between items-center relative"><div className="bg-luxury-gold/10 p-4 rounded-[20px] text-luxury-gold"><Sparkles size={24}/></div><button onClick={() => setAIResult(null)}><X className="text-gray-300"/></button></div>
              <div className="space-y-6 relative">
                 <div className="space-y-1"><h3 className="text-[10px] font-black text-luxury-gold uppercase tracking-widest">Correction Manuelle</h3><input type="text" value={aiResult.name} onChange={e => setAIResult({...aiResult, name: e.target.value})} className="w-full text-2xl font-serif font-black text-luxury-charcoal border-b-2 border-luxury-gold/20 outline-none bg-transparent" /></div>
                 <div className="bg-luxury-cream p-6 rounded-[32px] flex justify-between items-center"><span className="text-xs font-black uppercase text-luxury-gold tracking-widest">Estimation Kcal</span><input type="number" value={aiResult.calories} onChange={e => setAIResult({...aiResult, calories: +e.target.value})} className="w-24 bg-transparent text-right text-4xl font-black text-luxury-bordeaux outline-none" /></div>
              </div>
              <button onClick={() => { setProgress(p => ({...p, consumedCalories: p.consumedCalories + (aiResult?.calories || 0)})); setAIResult(null); toast.success('Plat analysé et ajouté.'); }} className="w-full bg-luxury-bordeaux text-white font-black py-5 rounded-[28px] shadow-2xl active:scale-95 transition-all">Confirmer au Journal</button>
           </div>
        </div>
      )}

      {isAILoading && (
        <div className="fixed inset-0 z-[250] bg-luxury-charcoal/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white space-y-10">
           <div className="relative"><Camera size={80} className="text-luxury-gold animate-pulse" /><Loader2 size={100} className="absolute -top-2.5 -left-2.5 text-luxury-gold animate-spin opacity-30" /></div>
           <p className="text-2xl font-serif font-black tracking-[0.5em] uppercase text-luxury-gold text-center px-10 leading-relaxed">ANALYSE VISION IA<br/>EN COURS D'EXCELLENCE</p>
        </div>
      )}
    </div>
  );
}

export default App;
