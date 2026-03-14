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
  Droplets, Plus, Minus, Dumbbell, MapPin, Zap, Target, Mail, Lock
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
        if (dbProfile) { 
          setProfile(prev => ({...prev, ...dbProfile})); 
          setHasOnboarded(true); 
          handleGenerate(dbProfile); 
        } else {
          toast.info("Bienvenue ! Créons votre profil Signature.");
        }
      }
    } catch (e: any) {
      console.error("Supabase Error:", e);
      toast.error("Connexion au Palais impossible : " + (e.message || "Erreur inconnue"));
    } finally { 
      setIsAuthLoading(false); 
    }
  };

  const handleAuth = async () => {
    setIsAppLoading(true);
    try {
      if (authMode === 'signin') await signIn(email, password);
      else await signUp(email, password);
      await checkUser();
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

  if (isAuthLoading) return (
    <div className="h-screen bg-luxury-cream flex flex-col items-center justify-center space-y-4">
      <Loader2 className="animate-spin text-luxury-gold" size={48} />
      <p className="text-luxury-bordeaux font-serif italic tracking-widest animate-pulse text-sm">Chargement du Palais...</p>
    </div>
  );

  if (!session) {
    return (
      <div className="min-h-screen bg-luxury-cream p-8 flex flex-col justify-center items-center space-y-12 animate-in fade-in duration-1000">
        <div className="text-center space-y-4">
           <div className="relative inline-block">
              <ChefHat size={100} className="mx-auto text-luxury-bordeaux mb-4" />
              <Sparkles size={24} className="absolute -top-2 -right-4 text-luxury-gold animate-pulse" />
           </div>
           <h1 className="text-6xl font-serif font-black text-luxury-charcoal tracking-tighter">AppliMeal</h1>
           <p className="text-luxury-bordeaux/60 font-medium italic tracking-[0.2em] uppercase text-[10px]">L'Excellence au service de votre corps</p>
        </div>

        <div className="w-full max-w-sm space-y-8 bg-white p-10 rounded-[60px] shadow-2xl border border-luxury-gold/10 relative overflow-hidden">
           <div className="absolute top-0 left-0 w-full h-1.5 bg-luxury-gold/20" />
           
           <div className="space-y-6">
              <div className="space-y-4">
                 <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40 group-focus-within:text-luxury-gold transition-colors" size={20} />
                    <input type="email" placeholder="Email Signature" value={email} onChange={e => setEmail(e.target.value)} 
                      className="w-full p-5 pl-12 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all font-medium text-luxury-charcoal" />
                 </div>
                 <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-luxury-gold/40 group-focus-within:text-luxury-gold transition-colors" size={20} />
                    <input type="password" placeholder="Moteur de passe" value={password} onChange={e => setPassword(e.target.value)} 
                      className="w-full p-5 pl-12 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold transition-all font-medium text-luxury-charcoal" />
                 </div>
              </div>

              <button onClick={handleAuth} disabled={isAppLoading}
                className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[32px] shadow-xl shadow-luxury-bordeaux/20 hover:bg-luxury-charcoal transform active:scale-95 transition-all flex items-center justify-center gap-3">
                {isAppLoading ? <Loader2 className="animate-spin" /> : authMode === 'signin' ? "Accéder au Palais" : "Créer ma Signature"}
              </button>

              <div className="relative flex items-center py-4">
                <div className="flex-grow border-t border-luxury-gold/10"></div>
                <span className="flex-shrink mx-4 text-luxury-gold/40 text-[10px] font-black uppercase tracking-widest">Ou</span>
                <div className="flex-grow border-t border-luxury-gold/10"></div>
              </div>

              <button onClick={handleGoogleAuth}
                className="w-full bg-white border border-luxury-gold/20 text-luxury-charcoal font-bold py-5 rounded-[28px] flex items-center justify-center gap-4 shadow-sm hover:bg-luxury-cream transition-all group active:scale-95">
                <img src="https://www.google.com/favicon.ico" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" alt="Google" />
                <span className="text-sm tracking-tight uppercase">Continuer avec Google</span>
              </button>
           </div>

           <p className="text-center">
             <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} 
               className="text-xs font-black text-luxury-gold uppercase tracking-[0.2em] hover:text-luxury-bordeaux transition-colors border-b border-luxury-gold/20 pb-1">
               {authMode === 'signin' ? "Nouveau Membre ? S'inscrire" : "Déjà Membre ? Se connecter"}
             </button>
           </p>
        </div>
        
        <p className="text-[10px] font-bold text-luxury-gold/30 uppercase tracking-[0.3em]">Signature elite © 2026</p>
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
              <div className="space-y-2 text-center sm:text-left"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 1/4</h2><h1 className="text-3xl font-serif font-black text-luxury-charcoal leading-tight">Profil Physique</h1></div>
              <div className="space-y-6">
                <div className="flex gap-2">
                  {(['MALE', 'FEMALE', 'OTHER'] as const).map(g => (
                    <button key={g} onClick={() => setProfile({...profile, gender: g})} className={cn("flex-1 py-4 rounded-2xl border text-[10px] font-black transition-all uppercase tracking-widest", profile.gender === g ? "bg-luxury-bordeaux text-white border-luxury-bordeaux shadow-lg" : "bg-luxury-cream text-luxury-gold border-luxury-gold/10")}>{g === 'MALE' ? 'Homme' : g === 'FEMALE' ? 'Femme' : 'Autre'}</button>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Âge</span><input type="number" value={profile.age} onChange={e => setProfile({...profile, age: +e.target.value})} className="w-full p-5 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold" /></div>
                  <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Taille (cm)</span><input type="number" value={profile.height} onChange={e => setProfile({...profile, height: +e.target.value})} className="w-full p-5 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold" /></div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Activité</span>
                  <select value={profile.activityLevel} onChange={e => setProfile({...profile, activityLevel: e.target.value as ActivityLevel})} className="w-full p-5 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 font-bold appearance-none cursor-pointer">
                    <option value="SEDENTARY">Sédentaire (Bureau)</option>
                    <option value="LIGHT">Léger (1-2 séances)</option>
                    <option value="MODERATE">Modéré (3-4 séances)</option>
                    <option value="INTENSE">Intense (Elite)</option>
                  </select>
                </div>
              </div>
              <button onClick={nextStep} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[28px] shadow-xl hover:bg-luxury-charcoal transition-all">Suivant</button>
            </div>
          )}

          {onboardingStep === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 2/4</h2><h1 className="text-3xl font-serif font-black text-luxury-charcoal leading-tight">Votre Objectif</h1></div>
              <div className="space-y-4">
                {(['WEIGHT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN'] as const).map(goal => (
                  <button key={goal} onClick={() => setProfile({...profile, goal})} className={cn("w-full p-6 rounded-[32px] border-2 flex justify-between items-center transition-all", profile.goal === goal ? "border-luxury-gold bg-luxury-cream shadow-inner" : "border-gray-50 bg-white hover:bg-gray-50")}>
                    <span className="font-black text-luxury-charcoal uppercase text-sm tracking-tighter">{goal === 'WEIGHT_LOSS' ? 'Silhouette & Définition' : goal === 'MAINTENANCE' ? 'Équilibre & Vitalité' : 'Puissance & Masse'}</span>
                    <div className={cn("w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all", profile.goal === goal ? "bg-luxury-gold border-luxury-gold" : "border-gray-200")}>{profile.goal === goal && <CheckCircle2 size={14} className="text-white" />}</div>
                  </button>
                ))}
                <div className="space-y-2 mt-4">
                  <span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Vitesse souhaitée</span>
                  <div className="flex gap-2">
                    {(['SLOW', 'STANDARD', 'FAST'] as const).map(s => (
                      <button key={s} onClick={() => setProfile({...profile, goalSpeed: s})} className={cn("flex-1 py-4 rounded-xl border text-[9px] font-black uppercase transition-all", profile.goalSpeed === s ? "bg-luxury-gold text-white border-luxury-gold" : "bg-luxury-cream text-luxury-gold/40 border-luxury-gold/10")}>{s === 'SLOW' ? 'Douce' : s === 'FAST' ? 'Rapide' : 'Standard'}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-4"><button onClick={prevStep} className="flex-1 bg-luxury-cream text-luxury-gold font-black py-6 rounded-[28px] text-[10px] uppercase tracking-widest">Retour</button><button onClick={nextStep} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-[28px] shadow-xl hover:bg-luxury-charcoal transition-all">Suivant</button></div>
            </div>
          )}

          {onboardingStep === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 3/4</h2><h1 className="text-3xl font-serif font-black text-luxury-charcoal leading-tight">Mode de Vie</h1></div>
              <div className="space-y-6">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Budget par Repas</span>
                  <select value={profile.budget} onChange={e => setProfile({...profile, budget: e.target.value as BudgetLevel})} className="w-full p-5 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 font-bold cursor-pointer">
                    <option value="LOW">Économique (Étudiant)</option>
                    <option value="MEDIUM">Standard</option>
                    <option value="HIGH">Gourmet / Sans Limite</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest pl-2">Régime Spécifique</span>
                  <select value={profile.diet} onChange={e => setProfile({...profile, diet: e.target.value as DietType})} className="w-full p-5 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 font-bold cursor-pointer">
                    <option value="NONE">Aucun</option>
                    <option value="VEGETARIAN">Végétarien</option>
                    <option value="VEGAN">Végan</option>
                    <option value="HALAL">Halal</option>
                    <option value="GLUTEN_FREE">Sans Gluten</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-4"><button onClick={prevStep} className="flex-1 bg-luxury-cream text-luxury-gold font-black py-6 rounded-[28px] text-[10px] uppercase tracking-widest">Retour</button><button onClick={nextStep} className="flex-[2] bg-luxury-bordeaux text-white font-black py-6 rounded-[28px] shadow-xl hover:bg-luxury-charcoal transition-all">Suivant</button></div>
            </div>
          )}

          {onboardingStep === 4 && (
            <div className="space-y-8 animate-in slide-in-from-right duration-300">
              <div className="space-y-2 text-center"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Étape 4/4</h2><h1 className="text-3xl font-serif font-black text-luxury-charcoal leading-tight">La Visualisation</h1></div>
              <div className="space-y-6">
                <div className="bg-luxury-cream p-10 rounded-[48px] flex flex-col items-center space-y-4 border border-luxury-gold/10 shadow-inner">
                  <span className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.4em]">Poids Cible</span>
                  <div className="flex items-end gap-2">
                    <input type="number" value={profile.targetWeight} onChange={e => setProfile({...profile, targetWeight: +e.target.value})} className="text-7xl font-black bg-transparent text-center text-luxury-bordeaux outline-none w-40" />
                    <span className="text-xl font-serif font-black text-luxury-gold/40 mb-2">KG</span>
                  </div>
                  <div className="bg-white px-6 py-2 rounded-full border border-luxury-gold/10 shadow-sm animate-pulse">
                    <span className="text-[10px] font-black text-luxury-gold uppercase tracking-widest">Objectif : {Math.abs(profile.targetWeight - profile.weight)} kg à {profile.targetWeight > profile.weight ? 'gagner' : 'perdre'}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-4"><button onClick={prevStep} className="flex-1 bg-luxury-cream text-luxury-gold font-black py-6 rounded-[28px] text-[10px] uppercase tracking-widest">Retour</button><button onClick={completeOnboarding} disabled={isAppLoading} className="flex-[2] bg-luxury-gold text-white font-black py-6 rounded-[28px] shadow-xl shadow-luxury-gold/30 hover:bg-luxury-charcoal transition-all uppercase tracking-widest text-xs">
                {isAppLoading ? <Loader2 className="animate-spin mx-auto" /> : "Générer mon Destin"}
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
        <div className="bg-white p-10 rounded-b-[60px] shadow-2xl space-y-10 animate-in slide-in-from-top duration-700 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-luxury-gold/5 rounded-full -translate-y-1/2 translate-x-1/2 -z-0"></div>
          
          <div className="flex justify-between items-start relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]"><Award size={16}/> Niv. {profile.level} • {profile.xp} XP</div>
              <h1 className="text-3xl font-serif font-black text-luxury-charcoal">Votre Palais</h1>
            </div>
            <button onClick={() => { signOut(); setSession(null); }} className="bg-luxury-cream p-3 rounded-2xl text-luxury-bordeaux hover:bg-luxury-bordeaux hover:text-white transition-all shadow-sm"><LogOut size={20}/></button>
          </div>

          <div className="relative flex justify-center items-center py-4">
             <div className="absolute -inset-4 bg-luxury-gold/5 rounded-full blur-3xl opacity-50"></div>
             <svg className="w-72 h-72 transform -rotate-90 relative z-10">
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-luxury-gold/5" />
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 125} strokeDashoffset={2 * Math.PI * 125 * (1 - Math.min(1, progress.consumedCalories / (targets?.calories || 1)))} strokeLinecap="round" className="text-luxury-gold transition-all duration-1000 shadow-xl shadow-luxury-gold/20" />
             </svg>
             <div className="absolute text-center space-y-1 z-20">
               {progress.exerciseCalories > 0 && <div className="text-[10px] font-black text-luxury-gold uppercase tracking-widest flex items-center justify-center gap-1 mb-1 animate-pulse"><Zap size={12}/> +{progress.exerciseCalories} Kcal Sport</div>}
               <span className="text-6xl font-black text-luxury-charcoal tracking-tighter">{remainingCalories}</span>
               <p className="text-[10px] text-luxury-gold font-black uppercase tracking-widest tracking-[0.3em]">Calories de réserve</p>
             </div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative z-10">
             <div className="bg-luxury-cream/30 p-6 rounded-[40px] border border-luxury-gold/10 flex flex-col items-center space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-luxury-gold font-black uppercase text-[10px] tracking-widest"><Droplets size={16}/> Hydratation</div>
                <div className="flex items-center gap-5">
                   <button onClick={() => setProgress(p => ({...p, waterGlassCount: Math.max(0, p.waterGlassCount-1)}))} className="text-luxury-bordeaux hover:scale-125 transition-transform"><Minus size={20}/></button>
                   <span className="text-3xl font-black text-luxury-charcoal">{progress.waterGlassCount}</span>
                   <button onClick={() => setProgress(p => ({...p, waterGlassCount: p.waterGlassCount+1}))} className="text-luxury-gold hover:scale-125 transition-transform"><Plus size={20}/></button>
                </div>
             </div>
             <div onClick={() => setActiveTab('studio')} className="bg-luxury-bordeaux p-6 rounded-[40px] flex flex-col items-center justify-center space-y-3 cursor-pointer shadow-2xl shadow-luxury-bordeaux/30 hover:scale-105 transition-all text-white group">
                <div className="text-luxury-gold/60 group-hover:text-luxury-gold font-black uppercase text-[10px] tracking-widest">Elite Studio</div>
                <span className="text-xl font-black flex items-center gap-2"><Dumbbell size={20}/> S'entraîner</span>
             </div>
          </div>

          <div onClick={() => fileInputRef.current?.click()} className="bg-luxury-charcoal p-7 rounded-[40px] text-white flex items-center justify-between shadow-2xl group cursor-pointer hover:bg-black transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-1/2 -translate-y-1/2"></div>
            <div className="flex items-center gap-5 relative z-10">
              <div className="bg-luxury-gold p-4 rounded-2xl shadow-inner"><Camera size={28} className="text-luxury-charcoal" /></div>
              <div>
                <p className="text-lg font-black text-white leading-none mb-1">L'Œil Vision IA</p>
                <p className="text-[10px] opacity-60 uppercase font-black tracking-[0.2em]">Analyser mon plat gastronomique</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-luxury-gold relative z-10 group-hover:translate-x-2 transition-transform" />
          </div>
        </div>
      )}

      {activeTab === 'studio' && (
        <div className="p-8 space-y-10 animate-in fade-in max-w-lg mx-auto">
           <div className="space-y-2"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.4em]">Elite Training</h3><h2 className="text-4xl font-serif font-black text-luxury-charcoal leading-tight tracking-tight">Studio Privé</h2></div>
           <div className="grid grid-cols-2 gap-4">
              {['HOME', 'GYM'].map(loc => (
                <button key={loc} className="bg-white p-8 rounded-[48px] flex flex-col items-center gap-3 shadow-xl border border-luxury-gold/5 active:scale-95 transition-all"><MapPin size={32} className="text-luxury-gold"/><span className="text-xs font-black uppercase tracking-widest">{loc === 'HOME' ? 'Maison' : 'Salle Elite'}</span></button>
              ))}
           </div>
           <div className="space-y-5">
              {WORKOUTS.map(w => (
                <div key={w.id} onClick={() => logWorkout(w)} className="bg-white p-7 rounded-[48px] shadow-2xl border border-luxury-gold/5 flex justify-between items-center group cursor-pointer hover:border-luxury-gold transition-all hover:scale-[1.02]">
                   <div className="flex items-center gap-6">
                      <div className="w-20 h-20 bg-luxury-cream rounded-[28px] flex items-center justify-center text-luxury-bordeaux shadow-inner border border-luxury-gold/5 group-hover:scale-110 transition-transform"><Target size={36}/></div>
                      <div><h3 className="font-black text-luxury-charcoal text-lg">{w.title}</h3><p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{w.duration} MIN • {w.focus}</p></div>
                   </div>
                   <div className="text-right pr-2"><span className="text-xl font-black text-luxury-gold">+{w.caloriesBurned}</span><p className="text-[8px] font-black uppercase text-gray-300 tracking-tighter">Kcal Brulées</p></div>
                </div>
              ))}
           </div>
        </div>
      )}

      {activeTab === 'meals' && (
        <div className="p-8 space-y-8 animate-in fade-in max-w-lg mx-auto">
           <div className="flex justify-between items-end"><div className="space-y-2"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.4em]">Votre Sélection</h3><h2 className="text-4xl font-serif font-black text-luxury-charcoal tracking-tight">Le Menu</h2></div><button onClick={() => handleGenerate()} className="bg-white p-4 rounded-3xl text-luxury-gold shadow-lg hover:rotate-180 transition-all duration-700 border border-luxury-gold/10"><Sparkles /></button></div>
           <div className="space-y-6">
             {dailyPlan.map(recipe => (
               <div key={recipe.id} onClick={() => setSelectedRecipe(recipe)} className="bg-white p-7 rounded-[56px] shadow-2xl border border-luxury-gold/5 flex gap-6 items-center group cursor-pointer hover:scale-[1.03] transition-all relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-luxury-gold/5 rounded-full translate-x-1/2 -translate-y-1/2"></div>
                  <div className="w-24 h-24 bg-luxury-cream rounded-[36px] flex flex-col items-center justify-center text-luxury-bordeaux border border-luxury-gold/10 shadow-inner relative z-10 group-hover:scale-105 transition-transform">
                     <span className="text-2xl font-black leading-none">{recipe.calories}</span><span className="text-[9px] font-black uppercase tracking-tighter">Kcal</span>
                  </div>
                  <div className="flex-1 space-y-2 relative z-10">
                     <h3 className="font-black text-luxury-charcoal text-xl leading-tight tracking-tighter">{recipe.name}</h3>
                     <div className="flex items-center gap-3"><span className="text-luxury-gold font-black text-xs flex items-center gap-1.5 bg-luxury-gold/5 px-2 py-1 rounded-lg"><Clock size={14}/> {recipe.prepTime}m</span><div className="w-1.5 h-1.5 bg-luxury-gold/20 rounded-full" /><span className="text-[10px] text-luxury-gold/60 font-black uppercase tracking-[0.2em]">{recipe.difficulty}</span></div>
                  </div>
                  <ChevronRight size={28} className="text-luxury-gold/20 group-hover:text-luxury-gold group-hover:translate-x-2 transition-all" />
               </div>
             ))}
           </div>
        </div>
      )}

      {/* FOOTER NAV BAR PREMIUM */}
      <nav className="fixed bottom-10 left-8 right-8 bg-luxury-charcoal/95 backdrop-blur-3xl p-6 rounded-[56px] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.6)] flex justify-around items-center z-50 border border-white/5">
        {[
          { id: 'dashboard', icon: TrendingUp, label: 'Palais' },
          { id: 'meals', icon: Utensils, label: 'Menu' },
          { id: 'studio', icon: Dumbbell, label: 'Studio' },
          { id: 'shopping', icon: ShoppingCart, label: 'Réserve' },
          { id: 'progress', icon: HistoryIcon, label: 'Suivi' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={cn("flex flex-col items-center gap-2 transition-all duration-500", activeTab === item.id ? "text-luxury-gold scale-125 -translate-y-1" : "text-luxury-gold/20 hover:text-luxury-gold/40")}>
            <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
            <span className={cn("text-[7px] font-black uppercase tracking-[0.3em] transition-all", activeTab === item.id ? "opacity-100" : "opacity-0")}>{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MODALS CLASSIQUES RÉÉCRITS POUR LE LUXE */}
      {selectedRecipe && (
        <div className="fixed inset-0 z-[150] bg-luxury-cream overflow-y-auto animate-in slide-in-from-bottom duration-700">
           <div className="p-10 max-w-lg mx-auto space-y-12 pb-48">
              <button onClick={() => setSelectedRecipe(null)} className="bg-white p-5 rounded-[24px] shadow-xl text-luxury-bordeaux hover:rotate-90 transition-all"><X size={24}/></button>
              <div className="space-y-6 text-center">
                 <div className="bg-luxury-gold/10 inline-block px-6 py-2 rounded-full text-luxury-gold text-[10px] font-black uppercase tracking-[0.4em]">Signature Gastronomique</div>
                 <h2 className="text-5xl font-serif font-black text-luxury-charcoal leading-[1.1] tracking-tighter">{selectedRecipe.name}</h2>
                 <p className="text-luxury-bordeaux/60 font-medium italic text-xl px-4 leading-relaxed leading-relaxed">"{selectedRecipe.description}"</p>
              </div>
              <div className="grid grid-cols-3 gap-4">
                 {[{v: selectedRecipe.calories, l: 'Kcal'}, {v: selectedRecipe.proteins+'g', l: 'Prot.'}, {v: selectedRecipe.prepTime+'m', l: 'Temps'}].map(s => <div key={s.l} className="bg-white p-8 rounded-[40px] text-center border border-luxury-gold/10 shadow-2xl group hover:border-luxury-gold/30 transition-all"><p className="text-3xl font-black text-luxury-charcoal group-hover:scale-110 transition-transform">{s.v}</p><p className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.3em] mt-1">{s.l}</p></div>)}
              </div>
              <div className="bg-white p-8 rounded-[48px] shadow-xl border border-luxury-gold/5 space-y-6">
                 <h3 className="text-xs font-black text-luxury-gold uppercase tracking-[0.4em] text-center">Les Ingrédients</h3>
                 <div className="space-y-4">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between items-center border-b border-luxury-cream pb-4 last:border-0 last:pb-0">
                         <span className="font-bold text-luxury-charcoal text-lg">{ing.name}</span>
                         <span className="text-sm font-black text-luxury-gold bg-luxury-cream px-3 py-1 rounded-lg">{ing.quantity} {ing.unit}</span>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
           <div className="fixed bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-luxury-cream via-luxury-cream/90 to-transparent z-[160]">
              <button onClick={() => { setProgress(prev => ({...prev, consumedCalories: prev.consumedCalories + (selectedRecipe?.calories || 0) })); setSelectedRecipe(null); setProfile(p => ({...p, xp: p.xp + 20})); toast.success('Expérience Gastronomique validée. +20 XP'); }} 
                className="w-full bg-luxury-bordeaux text-white font-black py-8 rounded-[40px] shadow-[0_30px_60px_-15px_rgba(74,4,4,0.4)] hover:bg-luxury-charcoal transform active:scale-95 transition-all uppercase tracking-[0.3em] text-sm">
                Consommer cette Excellence
              </button>
           </div>
        </div>
      )}

      {aiResult && (
        <div className="fixed inset-0 z-[200] bg-luxury-charcoal/95 backdrop-blur-2xl flex items-center justify-center p-8 animate-in zoom-in duration-500">
           <div className="bg-white w-full max-w-sm rounded-[64px] p-12 space-y-10 shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden">
              <div className="absolute -top-10 -right-10 w-40 h-40 bg-luxury-gold/10 rounded-full blur-3xl"></div>
              <div className="flex justify-between items-center relative z-10">
                 <div className="bg-luxury-gold/10 p-5 rounded-[24px] text-luxury-gold animate-bounce"><Sparkles size={32}/></div>
                 <button onClick={() => setAIResult(null)} className="bg-luxury-cream p-3 rounded-full text-gray-300 hover:text-luxury-bordeaux transition-colors"><X size={24}/></button>
              </div>
              <div className="space-y-8 relative z-10">
                 <div className="space-y-3">
                    <h3 className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.4em] text-center">L'IA a détecté une perfection</h3>
                    <input type="text" value={aiResult.name} onChange={e => setAIResult({...aiResult, name: e.target.value})} 
                      className="w-full text-3xl font-serif font-black text-luxury-charcoal border-b-2 border-luxury-gold/20 outline-none bg-transparent text-center focus:border-luxury-gold transition-all pb-2" />
                 </div>
                 <div className="bg-luxury-cream p-10 rounded-[48px] flex flex-col items-center space-y-2 shadow-inner border border-luxury-gold/5">
                    <span className="text-[10px] font-black uppercase text-luxury-gold tracking-[0.3em]">Signature Calorique</span>
                    <div className="flex items-end gap-1">
                       <input type="number" value={aiResult.calories} onChange={e => setAIResult({...aiResult, calories: +e.target.value})} 
                        className="w-32 bg-transparent text-center text-6xl font-black text-luxury-bordeaux outline-none" />
                       <span className="text-sm font-serif font-black text-luxury-gold/40 mb-2">KCAL</span>
                    </div>
                 </div>
              </div>
              <button onClick={() => { setProgress(p => ({...p, consumedCalories: p.consumedCalories + (aiResult?.calories || 0)})); setAIResult(null); setProfile(p => ({...p, xp: p.xp + 15})); toast.success('Vision IA enregistrée. +15 XP'); }} 
                className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-[32px] shadow-2xl hover:bg-luxury-charcoal active:scale-95 transition-all uppercase tracking-[0.2em]">
                Confirmer l'Analyse
              </button>
           </div>
        </div>
      )}

      {isAILoading && (
        <div className="fixed inset-0 z-[250] bg-luxury-charcoal/98 backdrop-blur-3xl flex flex-col items-center justify-center text-white space-y-12">
           <div className="relative">
              <div className="absolute inset-0 bg-luxury-gold/20 rounded-full blur-[80px] animate-pulse"></div>
              <Camera size={100} className="text-luxury-gold relative z-10" />
              <Loader2 size={130} className="absolute -top-3.5 -left-3.5 text-luxury-gold animate-spin opacity-40" />
           </div>
           <div className="text-center space-y-4 relative z-10 px-12">
              <p className="text-3xl font-serif font-black tracking-[0.2em] uppercase text-luxury-gold leading-tight">Vision Artificielle</p>
              <p className="text-[10px] font-black tracking-[0.5em] uppercase text-white/40">Analyse de l'excellence en cours...</p>
           </div>
        </div>
      )}
    </div>
  );
}

export default App;
