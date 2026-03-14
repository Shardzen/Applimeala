-- 1. Profiles: Linked to auth.users for physical data
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  updated_at timestamp with time zone,
  age integer,
  weight float,
  height float,
  gender text check (gender in ('MALE', 'FEMALE')),
  activity_level text check (activity_level in ('SEDENTARY', 'ACTIVE', 'VERY_ACTIVE')),
  goal text check (goal in ('WEIGHT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN')),
  budget text check (budget in ('LOW', 'MEDIUM', 'HIGH'))
);

-- 2. Recipes: The library of meals
create table recipes (
  id uuid default gen_random_uuid() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  description text,
  calories integer,
  proteins float,
  carbs float,
  fats float,
  prep_time integer,
  difficulty text check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
  cost_per_portion float,
  category text,
  image_url text,
  tags text[]
);

-- 3. Ingredients: Linked to recipes
create table ingredients (
  id uuid default gen_random_uuid() primary key,
  recipe_id uuid references recipes(id) on delete cascade,
  name text not null,
  quantity float,
  unit text,
  price_per_unit float,
  category text
);

-- 4. User Plans: Tracking meals day by day
create table user_plans (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade,
  recipe_id uuid references recipes(id) on delete cascade,
  planned_date date default current_date,
  is_completed boolean default false
);

-- RLS (Row Level Security) - Everyone can read recipes, but users only read their own profile/plans
alter table recipes enable row level security;
create policy "Recipes are viewable by everyone" on recipes for select using (true);

alter table profiles enable row level security;
create policy "Users can view own profile" on profiles for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles for update using (auth.uid() = id);

alter table user_plans enable row level security;
create policy "Users can manage their own plans" on user_plans for all using (auth.uid() = user_id);
