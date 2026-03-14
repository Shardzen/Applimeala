import React, { useState, useEffect, useRef } from 'react';
import type { UserProfile, NutritionTargets, Recipe, DailyProgress, UserStats } from './types';
import { calculateNutritionTargets } from './services/nutrition';
import { generateDailyPlan, aggregateShoppingList } from './services/generator';
import { saveProfile, getProfile } from './services/profile';
import { signIn, signUp, signOut, getCurrentUser } from './services/auth';
import { analyzeMealImage, type AIResult } from './services/ai';
import { getDriveLink, fetchRecipesFromDB } from './services/recipeApi';
import { 
  Utensils, ShoppingCart, User as UserIcon, ChefHat, 
  Flame, DollarSign, Camera, TrendingUp, ChevronRight, CheckCircle2,
  Apple, Beef, Milk, Store, Sparkles, Loader2, X, Award, History as HistoryIcon,
  ExternalLink, Clock, BarChart3, LogOut, Mail, Lock, Droplets, Plus, Minus
} from 'lucide-react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { Toaster, toast } from 'sonner';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const MOCK_RECIPES: Recipe[] = [
  { id: 'm1', name: 'Filet de Bœuf Rossini', description: 'Le prestige dans votre assiette. Truffe et foie gras.', calories: 750, proteins: 40, carbs: 10, fats: 55, prepTime: 30, difficulty: 'HARD', costPerPortion: 12.5, tags: ['PRESTIGE'], ingredients: [] },
  { id: 'w1', name: 'Salade de Homard', description: 'Légèreté et luxe. Agrumes et homard bleu.', calories: 350, proteins: 35, carbs: 15, fats: 8, prepTime: 20, difficulty: 'MEDIUM', costPerPortion: 15.0, tags: ['PERTE'], ingredients: [] }
];

function App() {
  const [session, setSession] = useState<any>(null);
  const [hasOnboarded, setHasOnboarded] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAppLoading, setIsAppLoading] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const [aiResult, setAIResult] = useState<AIResult | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showWeightModal, setShowWeightModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<UserProfile>({
    age: 25, weight: 70, height: 175, gender: 'MALE', activityLevel: 'ACTIVE', goal: 'MAINTENANCE', budget: 'HIGH', diet: 'NONE', exclusions: []
  });

  const [stats, setStats] = useState<UserStats>({
    streak: 15, badges: ['ELITE_CLUB'], weightHistory: [{ date: '10/03', weight: 71.5 }, { date: '14/03', weight: 70.0 }]
  });

  const [targets, setTargets] = useState<NutritionTargets | null>(null);
  const [progress, setProgress] = useState<DailyProgress>({
    consumedCalories: 0, consumedProteins: 0, consumedCarbs: 0, consumedFats: 0, waterGlassCount: 0
  });

  const [dailyPlan, setDailyPlan] = useState<Recipe[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'meals' | 'shopping' | 'progress'>('dashboard');

  useEffect(() => { checkUser(); }, []);
  useEffect(() => { if (profile) setTargets(calculateNutritionTargets(profile)); }, [profile]);

  const checkUser = async () => {
    const user = await getCurrentUser();
    if (user) {
      setSession(user);
      const dbProfile = await getProfile(user.id);
      if (dbProfile) { setProfile(dbProfile as any); setHasOnboarded(true); handleGenerate(dbProfile as any); }
    }
    setIsAuthLoading(false);
  };

  const handleAuth = async () => {
    setIsAppLoading(true);
    try {
      if (authMode === 'signin') { await signIn(email, password); toast.success('Bienvenue au Palais.'); }
      else { await signUp(email, password); toast.success('Signature créée !'); }
      checkUser();
    } catch (e: any) { toast.error(e.message); } finally { setIsAppLoading(false); }
  };

  const handleCompleteOnboarding = async () => {
    if (!session) return;
    setIsAppLoading(true);
    try { await saveProfile(session.id, profile); setHasOnboarded(true); handleGenerate(); }
    catch (e: any) { setHasOnboarded(true); handleGenerate(); }
    finally { setIsAppLoading(false); }
  };

  const handleGenerate = async (prof = profile) => {
    const t = calculateNutritionTargets(prof);
    try { const dbRecipes = await fetchRecipesFromDB(prof, t.calories); setDailyPlan(dbRecipes.length > 0 ? dbRecipes : MOCK_RECIPES); }
    catch (e) { setDailyPlan(MOCK_RECIPES); }
  };

  const logMeal = (recipe: Recipe) => {
    setProgress(prev => ({
      ...prev,
      consumedCalories: prev.consumedCalories + recipe.calories,
      consumedProteins: prev.consumedProteins + recipe.proteins,
      consumedCarbs: prev.consumedCarbs + recipe.carbs,
      consumedFats: prev.consumedFats + recipe.fats,
    }));
    setSelectedRecipe(null);
    toast.success('Dégustation enregistrée.');
  };

  const remainingCalories = (targets?.calories || 0) - progress.consumedCalories;
  const shoppingList = aggregateShoppingList(dailyPlan);

  if (isAuthLoading) return <div className="h-screen bg-luxury-cream flex items-center justify-center"><Loader2 className="animate-spin text-luxury-gold" size={48} /></div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-luxury-cream p-8 flex flex-col justify-center items-center space-y-12">
        <div className="text-center space-y-2 animate-in fade-in duration-1000">
           <ChefHat size={80} className="mx-auto text-luxury-bordeaux mb-4" />
           <h1 className="text-5xl font-serif font-black text-luxury-charcoal">AppliMeal</h1>
           <p className="text-luxury-bordeaux/60 font-medium italic">L'Excellence au quotidien.</p>
        </div>
        <div className="w-full max-w-sm space-y-6 bg-white p-10 rounded-[48px] shadow-2xl border border-luxury-gold/10">
           <div className="space-y-4">
              <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-4 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold" />
              <input type="password" placeholder="Moteur de passe" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-4 bg-luxury-cream rounded-2xl border-none outline-none ring-1 ring-luxury-gold/10 focus:ring-2 focus:ring-luxury-gold" />
           </div>
           <button onClick={handleAuth} className="w-full bg-luxury-bordeaux text-white font-black py-5 rounded-3xl shadow-xl hover:bg-luxury-charcoal transition-all">{authMode === 'signin' ? "Entrer au Palais" : "Créer mon Compte"}</button>
           <button onClick={() => setAuthMode(authMode === 'signin' ? 'signup' : 'signin')} className="w-full text-xs font-black text-luxury-gold uppercase tracking-widest underline">{authMode === 'signin' ? "Pas encore membre ?" : "Déjà membre ?"}</button>
        </div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return (
      <div className="min-h-screen bg-luxury-cream p-8 flex flex-col justify-center animate-in fade-in">
        <div className="max-w-md mx-auto w-full space-y-10 bg-white p-10 rounded-[60px] shadow-2xl border border-luxury-gold/10">
          <div className="space-y-2"><h2 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]">Signature Santé</h2><h1 className="text-3xl font-serif font-black text-luxury-charcoal">Configurons votre excellence.</h1></div>
          <div className="space-y-6">
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase">Âge</span><input type="number" value={profile.age} onChange={e => setProfile({...profile, age: +e.target.value})} className="w-full p-4 bg-luxury-cream rounded-2xl border-none ring-1 ring-luxury-gold/10" /></div>
                <div className="space-y-1"><span className="text-[10px] font-black text-luxury-gold uppercase">Poids (kg)</span><input type="number" value={profile.weight} onChange={e => setProfile({...profile, weight: +e.target.value})} className="w-full p-4 bg-luxury-cream rounded-2xl border-none ring-1 ring-luxury-gold/10" /></div>
             </div>
             <button onClick={handleCompleteOnboarding} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-3xl shadow-xl">Calculer ma Signature</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-luxury-cream pb-32">
      <Toaster position="top-center" richColors />
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { setIsAILoading(true); const r = await analyzeMealImage(file); setAIResult(r); setIsAILoading(false); }}} />

      {activeTab === 'dashboard' && (
        <div className="bg-white p-10 rounded-b-[60px] shadow-2xl space-y-10 animate-in slide-in-from-top duration-700">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em]"><Award size={16}/> {stats.streak} Jours de série</div>
              <h1 className="text-3xl font-serif font-black text-luxury-charcoal">Votre Palais</h1>
            </div>
            <button onClick={signOut} className="bg-luxury-cream p-3 rounded-2xl text-luxury-bordeaux hover:bg-luxury-bordeaux hover:text-white transition-all"><LogOut size={20}/></button>
          </div>

          <div className="relative flex justify-center items-center">
             <svg className="w-72 h-72 transform -rotate-90">
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" className="text-luxury-gold/5" />
               <circle cx="144" cy="144" r="125" stroke="currentColor" strokeWidth="12" fill="transparent" strokeDasharray={2 * Math.PI * 125} strokeDashoffset={2 * Math.PI * 125 * (1 - Math.min(1, progress.consumedCalories / (targets?.calories || 1)))} strokeLinecap="round" className="text-luxury-gold transition-all duration-1000 shadow-xl shadow-luxury-gold/20" />
             </svg>
             <div className="absolute text-center space-y-1">
               <span className="text-5xl font-black text-luxury-charcoal tracking-tighter">{remainingCalories}</span>
               <p className="text-[10px] text-luxury-gold font-black uppercase tracking-widest">Kcal Restantes</p>
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
             <div onClick={() => setShowWeightModal(true)} className="bg-luxury-cream/30 p-5 rounded-[32px] border border-luxury-gold/10 flex flex-col items-center justify-center space-y-2 cursor-pointer hover:bg-luxury-gold/5 transition-all">
                <div className="text-luxury-gold font-black uppercase text-[10px] tracking-widest">Poids Actuel</div>
                <span className="text-2xl font-black text-luxury-charcoal">{profile.weight} <span className="text-xs text-luxury-gold/60">kg</span></span>
             </div>
          </div>

          <div onClick={() => fileInputRef.current?.click()} className="bg-luxury-bordeaux p-6 rounded-[32px] text-white flex items-center justify-between shadow-2xl group cursor-pointer hover:bg-luxury-charcoal transition-all">
            <div className="flex items-center gap-4"><div className="bg-luxury-gold p-3 rounded-2xl"><Camera size={24} className="text-luxury-bordeaux" /></div><div><p className="text-md font-bold">L'Œil Vision IA</p><p className="text-[10px] opacity-60 uppercase font-black tracking-widest">Analyser mon assiette</p></div></div>
            <ChevronRight size={24} className="text-luxury-gold" />
          </div>
        </div>
      )}

      <main className="p-6 max-w-lg mx-auto space-y-8 mt-4">
        {activeTab === 'meals' && (
          <div className="space-y-6 animate-in fade-in">
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

        {activeTab === 'shopping' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="space-y-1 px-2"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.2em]">Réserve Prestige</h3><h2 className="text-2xl font-serif font-black text-luxury-charcoal">Votre Liste</h2></div>
             <div className="bg-luxury-charcoal text-white p-8 rounded-[48px] shadow-2xl border border-luxury-gold/20 relative overflow-hidden"><div className="absolute -right-10 -top-10 w-40 h-40 bg-luxury-gold/10 rounded-full blur-3xl"></div><div className="flex justify-between items-end mb-6 relative z-10"><div><p className="text-[10px] font-black uppercase tracking-widest text-luxury-gold/60 mb-1">Total Estimé</p><p className="text-4xl font-serif font-black tracking-tighter">48.20€</p></div><div className="bg-luxury-gold/10 p-4 rounded-[24px]"><ShoppingCart className="text-luxury-gold" size={28}/></div></div><a href={getDriveLink([])} target="_blank" rel="noreferrer" className="w-full bg-luxury-gold text-white font-black py-4 rounded-3xl flex items-center justify-center gap-2 hover:bg-luxury-gold/90 transition-all relative z-10">Commander sur Drive <ExternalLink size={16} /></a></div>
             {Object.entries(shoppingList).map(([cat, items]) => (
               <div key={cat} className="space-y-4">
                  <h4 className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.4em] pl-6">{cat}</h4>
                  <div className="bg-white rounded-[40px] shadow-xl overflow-hidden border border-luxury-gold/5">
                     {(items as any[]).map((ing, idx) => (
                        <div key={idx} className="flex justify-between items-center p-6 border-b border-luxury-cream last:border-0 hover:bg-luxury-cream/10 cursor-pointer group">
                           <div className="flex items-center gap-4"><div className="w-6 h-6 border-2 border-luxury-gold/20 rounded-lg group-hover:border-luxury-gold transition-all"></div><span className="font-bold text-luxury-charcoal">{ing.name}</span></div>
                           <span className="text-xs font-black text-luxury-gold">{ing.quantity} {ing.unit}</span>
                        </div>
                     ))}
                  </div>
               </div>
             ))}
          </div>
        )}

        {activeTab === 'progress' && (
          <div className="space-y-8 animate-in fade-in">
             <div className="bg-white p-8 rounded-[40px] shadow-xl space-y-8">
                <div className="flex justify-between items-center"><h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2"><TrendingUp size={16}/> Courbe de Poids</h3><button onClick={() => setShowWeightModal(true)} className="bg-luxury-cream p-2 rounded-xl text-luxury-gold hover:bg-luxury-gold hover:text-white transition-all"><Plus size={18}/></button></div>
                <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.weightHistory}><defs><linearGradient id="gW" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#D4AF37" stopOpacity={0.3}/><stop offset="95%" stopColor="#D4AF37" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f5f5f5" /><XAxis dataKey="date" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#D4AF37'}} /><Tooltip contentStyle={{borderRadius: '20px', border: 'none'}} /><Area type="monotone" dataKey="weight" stroke="#D4AF37" strokeWidth={4} fill="url(#gW)" /></AreaChart></ResponsiveContainer></div>
             </div>
             <div className="bg-luxury-charcoal p-8 rounded-[48px] shadow-2xl text-white space-y-6">
                <h3 className="text-luxury-gold font-black uppercase text-[10px] tracking-[0.3em] flex items-center gap-2"><Award size={16}/> Vos Succès</h3>
                <div className="grid grid-cols-2 gap-4">
                   {stats.badges.map(b => <div key={b} className="bg-white/5 p-6 rounded-[32px] border border-white/10 flex flex-col items-center gap-3 text-center"><div className="bg-luxury-gold/20 p-4 rounded-2xl text-luxury-gold"><Sparkles size={28}/></div><p className="text-[10px] font-black uppercase tracking-widest">{b.replace('_', ' ')}</p></div>)}
                </div>
             </div>
          </div>
        )}
      </main>

      <nav className="fixed bottom-10 left-8 right-8 bg-luxury-charcoal/90 backdrop-blur-2xl p-6 rounded-[48px] shadow-2xl flex justify-around items-center z-50 border border-white/10">
        {[
          { id: 'dashboard', icon: TrendingUp, label: 'Palais' },
          { id: 'meals', icon: Utensils, label: 'Menu' },
          { id: 'shopping', icon: ShoppingCart, label: 'Réserve' },
          { id: 'progress', icon: HistoryIcon, label: 'Suivi' },
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id as any)} className={cn("flex flex-col items-center gap-2 transition-all duration-500", activeTab === item.id ? "text-luxury-gold scale-125" : "text-luxury-gold/20")}>
            <item.icon size={26} strokeWidth={activeTab === item.id ? 2.5 : 1.5} />
            <span className="text-[7px] font-black uppercase tracking-[0.2em]">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* MODALS */}
      {showWeightModal && (
        <div className="fixed inset-0 z-[120] bg-luxury-charcoal/80 backdrop-blur-md flex items-center justify-center p-6 animate-in fade-in">
           <div className="bg-white w-full max-w-sm rounded-[48px] p-8 space-y-8 shadow-2xl relative">
              <button onClick={() => setShowWeightModal(false)} className="absolute top-6 right-6 text-gray-300"><X/></button>
              <div className="space-y-2"><h3 className="text-[10px] font-black text-luxury-gold uppercase tracking-[0.2em]">Poids d'Exception</h3><p className="text-2xl font-serif font-black text-luxury-charcoal">Nouvelle Pesée</p></div>
              <div className="bg-luxury-cream p-8 rounded-[32px] flex flex-col items-center space-y-4">
                 <input type="number" step="0.1" value={profile.weight} onChange={e => setProfile({...profile, weight: +e.target.value})} className="text-6xl font-black bg-transparent text-center text-luxury-bordeaux outline-none w-full" />
                 <span className="text-xs font-black text-luxury-gold uppercase tracking-[0.4em]">Kilogrammes</span>
              </div>
              <button onClick={() => { setStats(s => ({...s, weightHistory: [...s.weightHistory, {date: new Date().toLocaleDateString('fr-FR', {day:'2-digit', month:'2-digit'}), weight: profile.weight}]})); setShowWeightModal(false); toast.success('Poids Signature enregistré.'); }} className="w-full bg-luxury-bordeaux text-white font-black py-6 rounded-3xl shadow-xl transition-all">Valider la Mesure</button>
           </div>
        </div>
      )}

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
              <button onClick={() => logMeal(selectedRecipe)} className="w-full bg-luxury-bordeaux text-white font-black py-7 rounded-[32px] shadow-2xl">Marquer comme Consommé</button>
           </div>
        </div>
      )}

      {aiResult && (
        <div className="fixed inset-0 z-[200] bg-luxury-charcoal/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in zoom-in duration-300">
           <div className="bg-white w-full max-w-sm rounded-[56px] p-10 space-y-8 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center"><div className="bg-luxury-gold/10 p-4 rounded-[20px] text-luxury-gold"><Sparkles size={24}/></div><button onClick={() => setAIResult(null)}><X className="text-gray-300"/></button></div>
              <div className="space-y-6 relative">
                 <div className="space-y-1"><h3 className="text-[10px] font-black text-luxury-gold uppercase tracking-widest">Correction Manuelle</h3><input type="text" value={aiResult.name} onChange={e => setAIResult({...aiResult, name: e.target.value})} className="w-full text-2xl font-serif font-black text-luxury-charcoal border-b-2 border-luxury-gold/20 outline-none bg-transparent" /></div>
                 <div className="bg-luxury-cream p-6 rounded-[32px] flex justify-between items-center"><span className="text-xs font-black uppercase text-luxury-gold tracking-widest">Estimation Kcal</span><input type="number" value={aiResult.calories} onChange={e => setAIResult({...aiResult, calories: +e.target.value})} className="w-24 bg-transparent text-right text-4xl font-black text-luxury-bordeaux outline-none" /></div>
              </div>
              <button onClick={() => { setProgress(p => ({...p, consumedCalories: p.consumedCalories + aiResult.calories})); setAIResult(null); toast.success('Plat analysé et ajouté.'); }} className="w-full bg-luxury-bordeaux text-white font-black py-5 rounded-[28px] shadow-2xl active:scale-95 transition-all">Confirmer au Journal</button>
           </div>
        </div>
      )}

      {isAILoading && (
        <div className="fixed inset-0 z-[250] bg-luxury-charcoal/95 backdrop-blur-3xl flex flex-col items-center justify-center text-white space-y-10">
           <div className="relative"><Camera size={80} className="text-luxury-gold animate-pulse" /><Loader2 size={100} className="absolute -top-2.5 -left-2.5 text-luxury-gold animate-spin opacity-30" /></div>
           <p className="text-2xl font-serif font-black tracking-[0.5em] uppercase text-luxury-gold">Analyse Vision IA...</p>
        </div>
      )}
    </div>
  );
}

export default App;
