// Seed everyday "staple" foods into public.foods with plain names and aliases so
// the basics (chicken breast, rice, eggs...) show up first in food search.
//
//   node scripts/seed-staple-foods.mjs          → look up each staple in USDA, upsert
//   node scripts/seed-staple-foods.mjs --dry    → only report what would be matched
//
// Safe to re-run: rows are keyed on (source, source_id). Requires USDA_API_KEY,
// NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local, and the
// columns from supabase/13-food-staples.sql.

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env.local", "utf8");
const get = (k) => env.match(new RegExp(`^${k}=(.+)$`, "m"))?.[1].trim();
const KEY = get("USDA_API_KEY");
if (!KEY) {
  console.error("USDA_API_KEY is missing from .env.local");
  process.exit(1);
}
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"), {
  auth: { persistSession: false },
});
const DRY = process.argv.includes("--dry");
const BASE = "https://api.nal.usda.gov/fdc/v1";

const SR = "SR Legacy";
const FN = "Survey (FNDDS)";
const FO = "Foundation";

// [plain name, aliases, USDA query, description regex, data types to try in order]
const STAPLES = [
  // Proteins
  ["Chicken breast, grilled (skinless)", "cooked chicken breast, grilled chicken, baked chicken breast, chicken", "chicken breast grilled without sauce skin not eaten", /^Chicken breast, grilled without sauce, skin not eaten$/, [FN]],
  ["Chicken breast, roasted (skinless)", "cooked chicken breast, roasted chicken, baked chicken, chicken", "chicken broilers or fryers breast meat only cooked roasted", /^Chicken, broilers or fryers, breast, meat only, cooked, roasted$/, [SR]],
  ["Chicken breast, raw (skinless)", "raw chicken breast, chicken", "chicken breast boneless skinless raw", /^Chicken, breast, boneless, skinless, raw$|^Chicken, broilers or fryers, breast, meat only, raw$/, [FO, SR]],
  ["Chicken thigh, cooked (skinless)", "chicken thighs, dark meat chicken", "chicken thigh meat only cooked roasted", /^Chicken, broilers or fryers, thigh, meat only, cooked, roasted$/, [SR]],
  ["Rotisserie chicken (skin not eaten)", "rotisserie chicken breast, costco chicken", "chicken breast rotisserie skin not eaten", /^Chicken breast, rotisserie, skin not eaten$/, [FN]],
  ["Ground beef 90/10, cooked", "lean ground beef, hamburger, beef", "beef ground 90% lean 10% fat patty cooked broiled", /^Beef, ground, 90% lean meat \/ 10% fat, patty, cooked, broiled$/, [SR]],
  ["Ground beef 80/20, cooked", "ground beef, hamburger, beef", "beef ground 80% lean 20% fat patty cooked broiled", /^Beef, ground, 80% lean meat \/ 20% fat, patty, cooked, broiled$/, [SR]],
  ["Ground turkey 93/7, cooked", "lean ground turkey, turkey", "turkey ground 93% lean 7% fat pan-broiled crumbles", /^Turkey, ground, 93% lean, 7% fat, pan-broiled crumbles$/, [SR]],
  ["Sirloin steak, cooked (lean)", "steak, beef steak, top sirloin", "beef top sirloin steak separable lean only cooked broiled", /^Beef, top sirloin, steak, separable lean only, trimmed to .* cooked, broiled$/, [SR]],
  ["Salmon, cooked", "salmon fillet, fish", "salmon atlantic farmed cooked dry heat", /^Fish, salmon, Atlantic, farmed, cooked, dry heat$/, [SR]],
  ["Tuna, canned in water (drained)", "canned tuna, tuna fish", "tuna light canned in water drained solids", /^Fish, tuna, light, canned in water, drained solids$/, [SR]],
  ["Shrimp, cooked", "prawns, seafood", "shrimp cooked", /^Crustaceans, shrimp, cooked$|^Crustaceans, shrimp, mixed species, cooked, moist heat/, [SR]],
  ["Tilapia, cooked", "white fish", "tilapia cooked dry heat", /^Fish, tilapia, cooked, dry heat$/, [SR]],
  ["Cod, cooked", "white fish", "cod atlantic cooked dry heat", /^Fish, cod, Atlantic, cooked, dry heat$/, [SR]],
  ["Pork tenderloin, cooked (lean)", "pork loin, pork", "pork fresh loin tenderloin separable lean only cooked roasted", /^Pork, fresh, loin, tenderloin, separable lean only, cooked, roasted$/, [SR]],
  ["Pork chop, cooked (lean)", "pork chops, pork", "pork loin chops boneless separable lean only cooked broiled", /^Pork, fresh, loin, (center loin|sirloin) \(chops\), boneless, separable lean only, cooked, broiled/, [SR]],
  ["Bacon, cooked", "bacon strips", "pork cured bacon cooked", /^Pork, cured, bacon, pre-sliced, cooked, pan-fried$|^Pork, cured, bacon, cooked, baked$/, [SR]],
  ["Turkey, deli sliced", "deli turkey, turkey breast, lunch meat, sandwich meat", "turkey prepackaged or deli luncheon meat", /^Turkey, prepackaged or deli, luncheon meat$/, [FN]],
  ["Egg, whole, hard-boiled", "boiled egg, eggs, hard boiled eggs", "egg whole cooked hard-boiled", /^Egg, whole, cooked, hard-boiled$/, [SR]],
  ["Egg, whole, scrambled", "scrambled eggs, eggs", "egg whole cooked scrambled", /^Egg, whole, cooked, scrambled$/, [SR]],
  ["Egg, whole, raw", "eggs, raw egg", "egg whole raw fresh", /^Egg, whole, raw, fresh$/, [SR]],
  ["Egg whites", "egg white, liquid egg whites", "egg white raw fresh", /^Egg, white, raw, fresh$/, [SR]],
  ["Greek yogurt, plain, nonfat", "greek yogurt, fage, oikos, yogurt", "yogurt greek plain nonfat", /^Yogurt, Greek, plain, nonfat$/, [FO, SR]],
  ["Greek yogurt, plain, whole milk", "greek yogurt full fat, yogurt", "yogurt greek plain whole milk", /^Yogurt, Greek, plain, whole milk$/, [SR]],
  ["Cottage cheese, 2%", "cottage cheese, low fat cottage cheese", "cheese cottage lowfat 2% milkfat", /^Cheese, cottage, lowfat, 2% milkfat$/, [SR]],
  ["Whey protein powder", "protein powder, protein shake, whey, isolate", "beverages protein powder whey based", /^Beverages, Protein powder whey based$|^Beverages, Whey protein powder isolate$/, [SR]],
  ["Tofu, firm", "tofu, bean curd", "tofu firm prepared with calcium sulfate", /^Tofu, firm, prepared with calcium sulfate/, [SR]],
  ["Milk, 2%", "2% milk, reduced fat milk, milk", "milk reduced fat fluid 2% milkfat with added vitamin A and vitamin D", /^Milk, reduced fat, fluid, 2% milkfat, with added vitamin A and vitamin D$/, [SR]],
  ["Milk, whole", "whole milk, milk", "milk whole 3.25% milkfat with added vitamin D", /^Milk, whole, 3\.25% milkfat, with added vitamin D$/, [SR]],
  ["Milk, skim (nonfat)", "skim milk, fat free milk, milk", "milk nonfat fluid with added vitamin A and vitamin D fat free or skim", /^Milk, nonfat, fluid, with added vitamin A and vitamin D \(fat free or skim\)$/, [SR]],
  ["Almond milk, unsweetened", "almond milk", "almond milk unsweetened", /^Almond milk, unsweetened$/, [FN]],
  ["Cheddar cheese", "cheese, shredded cheese", "cheese cheddar", /^Cheese, cheddar$/, [FO, SR]],
  ["Mozzarella, part skim", "mozzarella cheese, cheese", "cheese mozzarella part skim milk", /^Cheese, mozzarella, part skim milk$/, [SR]],
  ["Cream cheese", "cream cheese", "cheese cream", /^Cheese, cream$/, [SR]],
  ["Peanut butter", "pb, peanut butter smooth, creamy peanut butter", "peanut butter creamy", /^Peanut butter, creamy$|^Peanut butter, smooth style, with salt$/i, [FO, SR]],
  ["Almonds", "almond, nuts", "nuts almonds", /^Nuts, almonds$/, [SR]],
  ["Walnuts", "walnut, nuts", "nuts walnuts english", /^Nuts, walnuts, english$/, [SR]],
  ["Cashews", "cashew, nuts", "nuts cashew nuts raw", /^Nuts, cashew nuts, raw$/, [SR]],
  ["Olive oil", "extra virgin olive oil, evoo, oil", "oil olive salad or cooking", /^Oil, olive, salad or cooking$/, [SR]],
  ["Butter", "salted butter", "butter salted", /^Butter, salted$/, [SR]],
  ["Avocado", "avocados, guacamole", "avocados raw all commercial varieties", /^Avocados, raw, all commercial varieties$/, [SR]],
  ["Chia seeds", "chia", "seeds chia seeds dried", /^Seeds, chia seeds, dried$/, [SR]],
  // Carbs
  ["White rice, cooked", "rice, jasmine rice, cooked rice", "rice white long-grain regular enriched cooked", /^Rice, white, long-grain, regular, enriched, cooked$/, [SR]],
  ["Brown rice, cooked", "rice, cooked rice", "rice brown long-grain cooked", /^Rice, brown, long-grain, cooked$/, [SR]],
  ["Oats, dry (rolled)", "oatmeal, rolled oats, quick oats, old fashioned oats", "cereals oats regular and quick not fortified dry", /^Cereals, oats, regular and quick, not fortified, dry$/, [SR]],
  ["Oatmeal, cooked with water", "oatmeal, oats, porridge", "cereals oats regular and quick unenriched cooked with water without salt", /^Cereals, oats, regular and quick, (not fortified|unenriched), cooked with water.*without salt$/, [SR]],
  ["Sweet potato, baked", "sweet potatoes, yams", "sweet potato cooked baked in skin flesh without salt", /^Sweet potato, cooked, baked in skin, flesh, without salt$/, [SR]],
  ["Potato, baked (with skin)", "baked potato, potatoes, russet", "potatoes baked flesh and skin without salt", /^Potatoes, baked, flesh and skin, without salt$/, [SR]],
  ["Pasta, cooked", "spaghetti, noodles, penne", "pasta cooked enriched without added salt", /^Pasta, cooked, enriched, without added salt$/, [SR]],
  ["Whole wheat bread", "bread, wheat bread, toast", "bread whole-wheat commercially prepared", /^Bread, whole-wheat, commercially prepared$/, [SR]],
  ["White bread", "bread, toast", "bread white commercially prepared", /^Bread, white, commercially prepared/, [SR]],
  ["Bagel, plain", "bagels", "bagels plain enriched with calcium propionate", /^Bagels, plain, enriched, with calcium propionate/, [SR]],
  ["Flour tortilla", "tortillas, wrap", "tortilla flour", /^Tortilla, flour$|^Tortillas, ready-to-bake or -fry, flour/, [FN, SR]],
  ["Quinoa, cooked", "quinoa", "quinoa cooked", /^Quinoa, cooked$/, [SR]],
  ["Black beans, cooked", "beans", "beans black mature seeds cooked boiled without salt", /^Beans, black, mature seeds, cooked, boiled, without salt$/, [SR]],
  ["Lentils, cooked", "lentil", "lentils mature seeds cooked boiled without salt", /^Lentils, mature seeds, cooked, boiled, without salt$/, [SR]],
  ["Chickpeas, canned (drained)", "garbanzo beans, chickpea", "chickpeas garbanzo beans mature seeds canned drained solids", /^Chickpeas \(garbanzo beans, bengal gram\), mature seeds, canned, drained solids$/, [SR]],
  ["Banana", "bananas", "bananas raw", /^Bananas, raw$/, [SR]],
  ["Apple", "apples", "apples raw with skin", /^Apples, raw, with skin$/, [SR]],
  ["Blueberries", "blueberry, berries", "blueberries raw", /^Blueberries, raw$/, [SR]],
  ["Strawberries", "strawberry, berries", "strawberries raw", /^Strawberries, raw$/, [SR]],
  ["Orange", "oranges", "oranges raw all commercial varieties", /^Oranges, raw, all commercial varieties$/, [SR]],
  ["Grapes", "grape", "grapes red or green european type raw", /^Grapes, red or green \(European type, such as Thompson seedless\), raw$/, [SR]],
  ["Watermelon", "melon", "watermelon raw", /^Watermelon, raw$/, [SR]],
  ["Pineapple", "pineapple chunks", "pineapple raw all varieties", /^Pineapple, raw, all varieties$/, [SR]],
  ["Honey", "honey", "honey", /^Honey$/, [SR]],
  ["Sugar, granulated", "sugar, white sugar", "sugars granulated", /^Sugars, granulated$/, [SR]],
  ["Rice cake, plain", "rice cakes", "rice cakes brown rice plain", /^Snacks, rice cakes, brown rice, plain/, [SR]],
  ["Dark chocolate (70-85%)", "chocolate", "chocolate dark 70-85% cacao solids", /^Chocolate, dark, 70-85% cacao solids$/, [SR]],
  // Vegetables & extras
  ["Broccoli, cooked", "steamed broccoli", "broccoli cooked boiled drained without salt", /^Broccoli, cooked, boiled, drained, without salt$/, [SR]],
  ["Broccoli, raw", "broccoli", "broccoli raw", /^Broccoli, raw$/, [SR]],
  ["Spinach, raw", "spinach, greens, salad", "spinach raw", /^Spinach, raw$/, [SR]],
  ["Romaine lettuce", "lettuce, salad, greens", "lettuce cos or romaine raw", /^Lettuce, cos or romaine, raw$/, [SR]],
  ["Carrots, raw", "carrot, baby carrots", "carrots raw", /^Carrots, raw$/, [SR]],
  ["Green beans, cooked", "string beans", "beans snap green cooked boiled drained without salt", /^Beans, snap, green, cooked, boiled, drained, without salt$/, [SR]],
  ["Asparagus, cooked", "asparagus", "asparagus cooked boiled drained", /^Asparagus, cooked, boiled, drained$/, [SR]],
  ["Bell pepper, red, raw", "peppers, bell peppers", "peppers sweet red raw", /^Peppers, sweet, red, raw$/, [SR]],
  ["Onion, raw", "onions", "onions raw", /^Onions, raw$/, [SR]],
  ["Tomato, raw", "tomatoes", "tomatoes red ripe raw year round average", /^Tomatoes, red, ripe, raw, year round average$/, [SR]],
  ["Cucumber, raw", "cucumbers", "cucumber with peel raw", /^Cucumber, with peel, raw$/, [SR]],
  ["Mushrooms, white, raw", "mushroom", "mushrooms white raw", /^Mushrooms, white, raw$/, [SR]],
  ["Zucchini, cooked", "zucchini, squash", "squash summer zucchini includes skin cooked boiled drained without salt", /^Squash, summer, zucchini, includes skin, cooked, boiled, drained, without salt$/, [SR]],
  ["Corn, sweet, cooked", "corn on the cob", "corn sweet yellow cooked boiled drained without salt", /^Corn, sweet, yellow, cooked, boiled, drained, without salt$/, [SR]],
  ["Cauliflower, cooked", "cauliflower", "cauliflower cooked boiled drained without salt", /^Cauliflower, cooked, boiled, drained, without salt$/, [SR]],
  ["Hummus", "hummus", "hummus commercial", /^Hummus, commercial$/, [SR]],
  ["Salsa", "salsa", "sauce salsa ready-to-serve", /^Sauce, salsa, ready-to-serve$/, [SR]],
  ["Ketchup", "catsup", "catsup", /^Catsup$/, [SR]],
  ["Mayonnaise", "mayo", "salad dressing mayonnaise regular", /^Salad dressing, mayonnaise, regular/, [SR]],
  ["Ranch dressing", "ranch", "salad dressing ranch dressing regular", /^Salad dressing, ranch dressing, regular/, [SR]],
  ["Coffee, black", "coffee", "beverages coffee brewed prepared with tap water", /^Beverages, coffee, brewed, prepared with tap water$/, [SR]],
  ["Orange juice", "oj, juice", "orange juice", /^Orange juice, raw$|^Orange juice, no pulp, not fortified, not from concentrate, refrigerated$|^Orange juice, chilled, includes from concentrate$/, [SR, FO]],
  ["Sour cream", "sour cream", "cream sour cultured", /^Cream, sour, cultured$/, [SR]],
  ["Beef jerky", "jerky", "snacks beef jerky chopped and formed", /^Snacks, beef jerky, chopped and formed$/, [SR]],
  // Cooked grains & starches
  ["White rice, medium-grain, cooked", "cooked rice, sushi rice, calrose, rice", "rice white medium-grain cooked", /^Rice, white, medium-grain, cooked/, [SR]],
  ["Wild rice, cooked", "cooked rice", "wild rice cooked", /^Wild rice, cooked$/, [SR]],
  ["Potato, boiled (no skin)", "cooked potato, boiled potatoes, potatoes", "potatoes boiled cooked without skin flesh without salt", /^Potatoes, boiled, cooked without skin, flesh, without salt$/, [SR]],
  ["Potato, boiled (with skin)", "cooked potato, boiled potatoes, red potatoes", "potatoes boiled cooked in skin flesh without salt", /^Potatoes, boiled, cooked in skin, flesh, without salt$/, [SR]],
  ["Mashed potatoes (with milk)", "cooked potato, mashed potato", "potatoes mashed home-prepared whole milk added", /^Potatoes, mashed, home-prepared, whole milk added$/, [SR]],
  ["Potato, roasted", "cooked potato, roasted potatoes, roast potatoes", "potato roasted", /^Potato, roasted, NFS$/, [FN]],
  ["Sweet potato, boiled", "cooked sweet potato, yams", "sweet potato cooked boiled without skin", /^Sweet potato, cooked, boiled, without skin/, [SR]],
  ["Whole wheat pasta, cooked", "cooked pasta, whole grain pasta, spaghetti", "pasta whole-wheat cooked", /^Pasta, whole-wheat, cooked$/, [SR]],
  ["Rice noodles, cooked", "cooked noodles, pho noodles", "rice noodles cooked", /^Rice noodles, cooked$/, [SR]],
  ["Couscous, cooked", "cooked couscous", "couscous cooked", /^Couscous, cooked$/, [SR]],
  ["Barley, pearled, cooked", "cooked barley", "barley pearled cooked", /^Barley, pearled, cooked$/, [SR]],
  ["Corn tortilla", "tortillas, taco shell soft", "tortilla corn", /^Tortilla, corn$|^Tortillas, ready-to-bake or -fry, corn/, [FN, SR]],
  // Cooked proteins
  ["Chicken drumstick, cooked (skinless)", "cooked chicken, chicken legs, dark meat", "chicken drumstick meat only cooked roasted", /^Chicken, broilers or fryers, dark meat, drumstick, meat only, cooked, roasted$/, [SR]],
  ["Chicken wings, cooked", "cooked chicken, wings", "chicken wing meat and skin cooked roasted", /^Chicken, broilers or fryers, wing, meat and skin, cooked, roasted$/, [SR]],
  ["Ground chicken, cooked", "cooked chicken, chicken crumbles", "chicken ground crumbles cooked pan-browned", /^Chicken, ground, crumbles, cooked, pan-browned$/, [SR]],
  ["Ground beef 85/15, cooked", "cooked ground beef, hamburger", "beef ground 85% lean 15% fat patty cooked broiled", /^Beef, ground, 85% lean meat \/ 15% fat, patty, cooked, broiled$/, [SR]],
  ["Ground beef 93/7, cooked", "cooked ground beef, extra lean ground beef", "beef ground 93% lean 7% fat patty cooked broiled", /^Beef, ground, 93% lean meat \/ 7% fat, patty, cooked, broiled$/, [SR]],
  ["Ribeye steak, cooked (lean)", "cooked steak, beef steak, ribeye", "beef rib eye steak separable lean only cooked grilled", /^Beef, rib eye steak.*separable lean only.*cooked, grilled$|^Beef, rib, eye, small end.*separable lean only.*cooked, broiled$/, [SR]],
  ["Filet mignon, cooked (lean)", "cooked steak, beef tenderloin steak", "beef tenderloin steak separable lean only cooked broiled", /^Beef, tenderloin, steak, separable lean only.*cooked, broiled$/, [SR]],
  ["Flank steak, cooked (lean)", "cooked steak, carne asada, beef", "beef flank steak separable lean only cooked broiled", /^Beef, flank, steak, separable lean only.*cooked, broiled$/, [SR]],
  ["Pot roast, cooked (lean)", "cooked beef, chuck roast, beef roast", "beef chuck arm pot roast separable lean only cooked braised", /^Beef, chuck, arm pot roast, separable lean only.*cooked, braised$/, [SR]],
  ["Ground pork, cooked", "cooked pork", "pork fresh ground cooked", /^Pork, fresh, ground, cooked$|^Pork, ground, 84% lean \/ 16% fat, cooked, crumbles$/, [SR]],
  ["Pork sausage, cooked", "breakfast sausage, cooked sausage", "pork sausage link patty cooked pan-fried", /^Pork sausage, link\/patty, cooked, pan-fried$|^Sausage, pork, fresh, cooked$/, [SR]],
  ["Ham, sliced", "deli ham, lunch meat", "ham sliced regular", /^Ham, sliced, regular/, [SR]],
  ["Turkey breast, roasted", "cooked turkey, turkey", "turkey breast meat only cooked roasted", /^Turkey, whole, breast, meat only, cooked, roasted$|^Turkey, retail parts, breast, meat only, cooked, roasted$/, [SR]],
  ["Ground turkey 85/15, cooked", "cooked ground turkey", "turkey ground 85% lean 15% fat pan-broiled crumbles", /^Turkey, ground, 85% lean, 15% fat, pan-broiled crumbles$/, [SR]],
  ["Salmon, wild (sockeye), cooked", "cooked salmon, fish", "salmon sockeye cooked dry heat", /^Fish, salmon, sockeye, cooked, dry heat$/, [SR]],
  ["Tuna steak, cooked", "cooked tuna, ahi, fish", "tuna yellowfin fresh cooked dry heat", /^Fish, tuna, yellowfin, fresh, cooked, dry heat$/, [SR]],
  ["Halibut, cooked", "cooked fish, white fish", "halibut atlantic pacific cooked dry heat", /^Fish, halibut, Atlantic and Pacific, cooked, dry heat$/, [SR]],
  ["Mahi mahi, cooked", "cooked fish", "mahimahi cooked dry heat", /^Fish, mahimahi, cooked, dry heat$/, [SR]],
  ["Scallops, cooked", "cooked seafood", "scallop cooked steamed", /^Mollusks, scallop.*cooked, steamed$/, [SR]],
  ["Crab, cooked", "cooked seafood, crab meat", "crab cooked moist heat", /^Crustaceans, crab, (blue|dungeness|alaska king), cooked, moist heat$/, [SR]],
  ["Egg, fried", "fried eggs, eggs", "egg whole cooked fried", /^Egg, whole, cooked, fried$/, [SR]],
  ["Egg, poached", "poached eggs, eggs", "egg whole cooked poached", /^Egg, whole, cooked, poached$/, [SR]],
  ["Omelet, plain", "omelette, eggs", "egg whole cooked omelet", /^Egg, whole, cooked, omelet$/, [SR]],
  ["Tempeh, cooked", "cooked tempeh", "tempeh cooked", /^Tempeh, cooked$/, [SR]],
  ["Edamame, cooked", "soybeans, edamame", "edamame frozen prepared", /^Edamame, frozen, prepared$/, [SR]],
  // Cooked beans & legumes
  ["Kidney beans, cooked", "cooked beans, red beans", "beans kidney red mature seeds cooked boiled without salt", /^Beans, kidney, red, mature seeds, cooked, boiled, without salt$/, [SR]],
  ["Pinto beans, cooked", "cooked beans", "beans pinto mature seeds cooked boiled without salt", /^Beans, pinto, mature seeds, cooked, boiled, without salt$/, [SR]],
  ["Chickpeas, cooked", "cooked chickpeas, garbanzo beans", "chickpeas garbanzo beans mature seeds cooked boiled without salt", /^Chickpeas \(garbanzo beans, bengal gram\), mature seeds, cooked, boiled, without salt$/, [SR]],
  ["Refried beans, canned", "beans", "refried beans canned traditional style", /^Refried beans, canned, traditional/, [SR]],
  ["Split peas, cooked", "cooked peas, pea soup", "peas split mature seeds cooked boiled without salt", /^Peas, split, mature seeds, cooked, boiled, without salt$/, [SR]],
  // Cooked vegetables
  ["Spinach, cooked", "cooked spinach, sauteed spinach", "spinach cooked boiled drained without salt", /^Spinach, cooked, boiled, drained, without salt$/, [SR]],
  ["Kale, cooked", "cooked kale", "kale cooked boiled drained without salt", /^Kale, cooked, boiled, drained, without salt$/, [SR]],
  ["Brussels sprouts, cooked", "cooked brussels sprouts", "brussels sprouts cooked boiled drained without salt", /^Brussels sprouts, cooked, boiled, drained, without salt$/, [SR]],
  ["Carrots, cooked", "cooked carrots", "carrots cooked boiled drained without salt", /^Carrots, cooked, boiled, drained, without salt$/, [SR]],
  ["Peas, green, cooked", "cooked peas", "peas green cooked boiled drained without salt", /^Peas, green, cooked, boiled, drained, without salt$/, [SR]],
  ["Mixed vegetables, cooked", "frozen vegetables, veggies", "vegetables mixed frozen cooked boiled drained without salt", /^Vegetables, mixed, frozen, cooked, boiled, drained, without salt$/, [SR]],
  ["Mushrooms, cooked", "cooked mushrooms, sauteed mushrooms", "mushrooms white cooked boiled drained without salt", /^Mushrooms, white, cooked, boiled, drained, without salt$/, [SR]],
  ["Onion, cooked", "cooked onions, sauteed onions", "onions cooked boiled drained without salt", /^Onions, cooked, boiled, drained, without salt$/, [SR]],
  ["Bell pepper, cooked", "cooked peppers, sauteed peppers", "peppers sweet red cooked boiled drained without salt", /^Peppers, sweet, red, cooked, boiled, drained, without salt$/, [SR]],
  ["Cabbage, cooked", "cooked cabbage", "cabbage cooked boiled drained without salt", /^Cabbage, cooked, boiled, drained, without salt$/, [SR]],
  ["Butternut squash, cooked", "cooked squash", "squash winter butternut cooked baked without salt", /^Squash, winter, butternut, cooked, baked, without salt$/, [SR]],
  ["Eggplant, cooked", "cooked eggplant", "eggplant cooked boiled drained without salt", /^Eggplant, cooked, boiled, drained, without salt$/, [SR]],
  ["Marinara / pasta sauce", "tomato sauce, spaghetti sauce, red sauce", "sauce pasta spaghetti marinara ready-to-serve", /^Sauce, pasta, spaghetti\/marinara, ready-to-serve/, [SR]],
  ["Applesauce, unsweetened", "apple sauce", "applesauce canned unsweetened", /^Applesauce, canned, unsweetened/, [SR]],
];

// ---- USDA helpers -------------------------------------------------------------

async function usda(path, init) {
  const sep = path.includes("?") ? "&" : "?";
  const res = await fetch(`${BASE}${path}${sep}api_key=${encodeURIComponent(KEY)}`, {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`USDA ${res.status} for ${path.split("?")[0]}`);
  return res.json();
}

async function findFood(query, regex, types) {
  for (const type of types) {
    const data = await usda("/foods/search", {
      method: "POST",
      body: JSON.stringify({ query, pageSize: 50, dataType: [type] }),
    });
    // Many SR Legacy names end in "(Includes foods for USDA's Food Distribution Program)".
    const clean = (s) => s.replace(/\s*\(Includes foods for USDA's Food Distribution Program\)\s*$/i, "");
    const hit = (data.foods ?? []).find((f) => regex.test(clean(f.description)));
    if (hit) return hit;
  }
  return null;
}

const trimNum = (n) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100));

function normalize(d) {
  const by = new Map();
  const nutrients = [];
  for (const n of d.foodNutrients ?? []) {
    if (!n.nutrient || typeof n.amount !== "number") continue;
    by.set(n.nutrient.id, n.amount);
    if (n.amount > 0) nutrients.push({ id: n.nutrient.id, name: n.nutrient.name, unit: n.nutrient.unitName, amount: n.amount });
  }
  const g = (id) => (by.has(id) ? by.get(id) : null);
  const p = g(1003) ?? 0;
  const f = g(1004) ?? 0;
  const c = g(1005) ?? 0;
  let kcal = g(1008) ?? g(2048) ?? g(2047);
  if (!(kcal > 0)) kcal = p || c || f ? Math.round(4 * p + 4 * c + 9 * f) : 0;

  const portions = [];
  const seen = new Set();
  for (const po of d.foodPortions ?? []) {
    const grams = po.gramWeight ?? 0;
    if (!(grams > 0)) continue;
    let label = po.portionDescription?.trim();
    if (!label || /quantity not specified/i.test(label)) {
      const unit = po.measureUnit?.name && po.measureUnit.name.toLowerCase() !== "undetermined" ? po.measureUnit.name.trim() : "";
      const raw = po.modifier?.trim() ?? "";
      const mod = /^\d+$/.test(raw) ? "" : raw;
      if (!unit && !mod) continue;
      const amount = po.amount > 0 ? trimNum(po.amount) : "1";
      label = [amount, unit, mod].filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
    }
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    portions.push({ label, grams: Math.round(grams * 10) / 10 });
    if (portions.length >= 12) break;
  }

  return {
    data_type: d.dataType,
    category: d.foodCategory?.description ?? d.wweiaFoodCategory?.wweiaFoodCategoryDescription ?? null,
    kcal_100: kcal,
    protein_100: p,
    carbs_100: c,
    fat_100: f,
    fiber_100: g(1079),
    sugar_100: g(2000),
    sat_fat_100: g(1258),
    sodium_100: g(1093),
    portions,
    nutrients: nutrients.length ? nutrients : null,
  };
}

// ---- run ------------------------------------------------------------------------

let ok = 0;
let missed = 0;
const queue = [...STAPLES];
async function worker() {
  while (queue.length) {
    const [name, aliases, query, regex, types] = queue.shift();
    try {
      const hit = await findFood(query, regex, types);
      if (!hit) {
        missed += 1;
        console.log(`NO MATCH   ${name}  (query: ${query})`);
        continue;
      }
      if (DRY) {
        ok += 1;
        console.log(`would seed ${name}  ←  ${hit.description} [${hit.dataType} ${hit.fdcId}]`);
        continue;
      }
      const detail = await usda(`/food/${hit.fdcId}?format=full`);
      const n = normalize(detail);
      const row = {
        source: "usda",
        source_id: String(hit.fdcId),
        owner_id: null,
        name,
        brand: null,
        search_terms: `${aliases} | ${hit.description}`,
        staple: true,
        ...n,
        updated_at: new Date().toISOString(),
      };
      const { error } = await supabase.from("foods").upsert(row, { onConflict: "source,source_id" });
      if (error) throw new Error(error.message);
      ok += 1;
      console.log(`seeded     ${name}  ←  ${hit.description} [${hit.dataType}] ${n.kcal_100} kcal/100g, ${n.portions.length} portions`);
    } catch (e) {
      missed += 1;
      console.log(`FAILED     ${name}: ${e.message}`);
    }
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
console.log(`\nDone: ${ok} ${DRY ? "matched" : "seeded"}, ${missed} missed.`);
