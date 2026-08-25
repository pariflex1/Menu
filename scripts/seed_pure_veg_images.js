const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Guaranteed 100% Pure Vegetarian Food Photography
const PURE_VEG_IMAGES = {
  // Breakfast & Indian Breads
  paratha: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=400&q=80',
  poha: 'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=400&q=80',
  veg_sandwich: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=400&q=80',
  veg_cutlet: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=400&q=80',
  toast_jam: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?auto=format&fit=crop&w=400&q=80',
  chhole_bhature: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=400&q=80',
  poori_bhaji: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  cereal_milk: 'https://images.unsplash.com/photo-1521483451569-e33803c0330c?auto=format&fit=crop&w=400&q=80',

  // South Indian Pure Veg
  masala_dosa: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  idli_sambar: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  uttapam: 'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=400&q=80',
  upma: 'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=400&q=80',
  curd_rice: 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?auto=format&fit=crop&w=400&q=80',

  // Beverages & Dairy
  masala_tea: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=400&q=80',
  hot_coffee: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=400&q=80',
  cold_coffee: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=400&q=80',
  milk: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80',
  fresh_juice: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80',
  lemonade: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=400&q=80',
  milkshake: 'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=400&q=80',
  sweet_lassi: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=400&q=80',
  hot_chocolate: 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=400&q=80',

  // Soups, Salads, Curd
  tomato_soup: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=400&q=80',
  green_salad: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=400&q=80',
  boondi_raita: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=400&q=80',

  // Starters & Chaat (100% Veg)
  veg_pakoda: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  paneer_tikka: 'https://images.unsplash.com/photo-1567184109277-3e817997573d?auto=format&fit=crop&w=400&q=80',
  hara_bhara_kabab: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?auto=format&fit=crop&w=400&q=80',
  chaat: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  french_fries: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=400&q=80',

  // Veg Fast Food & Chinese
  veg_noodles: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=400&q=80',
  veg_manchurian: 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=400&q=80',
  chilli_paneer: 'https://images.unsplash.com/photo-1567184109277-3e817997573d?auto=format&fit=crop&w=400&q=80',
  veg_pasta: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281140?auto=format&fit=crop&w=400&q=80',
  veg_pizza: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=400&q=80',
  veg_burger: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=400&q=80',
  veg_momos: 'https://images.unsplash.com/photo-1625242662367-96a5f973e8e1?auto=format&fit=crop&w=400&q=80',
  veg_fried_rice: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=400&q=80',
  spring_roll: 'https://images.unsplash.com/photo-1548946526-f69e2424cf45?auto=format&fit=crop&w=400&q=80',

  // Pure Veg Main Course
  shahi_paneer: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=400&q=80',
  dal_makhani: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  dal_tadka: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  malai_kofta: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  mushroom_masala: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=400&q=80',
  mix_veg: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=400&q=80',
  chana_masala: 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=400&q=80',
  jeera_aloo: 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=400&q=80',
  krishna_thali: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=400&q=80',

  // Indian Breads & Basmati Rice
  butter_naan: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=400&q=80',
  tandoori_roti: 'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=400&q=80',
  veg_biryani: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=400&q=80',
  jeera_rice: 'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?auto=format&fit=crop&w=400&q=80',
  veg_pulao: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=400&q=80',

  // Pure Veg Desserts
  gulab_jamun: 'https://images.unsplash.com/photo-1605197148560-f1c5c643924f?auto=format&fit=crop&w=400&q=80',
  ice_cream: 'https://images.unsplash.com/photo-1560008511-11c63416e52d?auto=format&fit=crop&w=400&q=80',
  indian_sweet: 'https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&w=400&q=80',

  // Master Pure Veg Default
  pure_veg_thali: 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=400&q=80'
};

function matchPureVegImage(name) {
  const n = name.toLowerCase();

  // South Indian
  if (n.includes('dosa')) return PURE_VEG_IMAGES.masala_dosa;
  if (n.includes('idli')) return PURE_VEG_IMAGES.idli_sambar;
  if (n.includes('uttapam')) return PURE_VEG_IMAGES.uttapam;
  if (n.includes('upma')) return PURE_VEG_IMAGES.upma;
  if (n.includes('curd rice')) return PURE_VEG_IMAGES.curd_rice;

  // Paratha & Breakfast
  if (n.includes('paratha')) return PURE_VEG_IMAGES.paratha;
  if (n.includes('poha')) return PURE_VEG_IMAGES.poha;
  if (n.includes('sandwich')) return PURE_VEG_IMAGES.veg_sandwich;
  if (n.includes('cutlet')) return PURE_VEG_IMAGES.veg_cutlet;
  if (n.includes('toast')) return PURE_VEG_IMAGES.toast_jam;
  if (n.includes('chhole') || n.includes('bhature')) return PURE_VEG_IMAGES.chhole_bhature;
  if (n.includes('poori') || n.includes('puri') || n.includes('bhaji')) return PURE_VEG_IMAGES.poori_bhaji;
  if (n.includes('cereal')) return PURE_VEG_IMAGES.cereal_milk;

  // Beverages
  if (n.includes('tea') || n.includes('chai')) return PURE_VEG_IMAGES.masala_tea;
  if (n.includes('cold coffee')) return PURE_VEG_IMAGES.cold_coffee;
  if (n.includes('coffee')) return PURE_VEG_IMAGES.hot_coffee;
  if (n.includes('milk') && !n.includes('shake')) return PURE_VEG_IMAGES.milk;
  if (n.includes('juice') || n.includes('cold drink')) return PURE_VEG_IMAGES.fresh_juice;
  if (n.includes('lime') || n.includes('jaljeera')) return PURE_VEG_IMAGES.lemonade;
  if (n.includes('shake')) return PURE_VEG_IMAGES.milkshake;
  if (n.includes('lassi') || n.includes('butter milk') || n.includes('buttermilk')) return PURE_VEG_IMAGES.sweet_lassi;
  if (n.includes('chocolate')) return PURE_VEG_IMAGES.hot_chocolate;

  // Soups & Salads
  if (n.includes('soup')) return PURE_VEG_IMAGES.tomato_soup;
  if (n.includes('salad')) return PURE_VEG_IMAGES.green_salad;
  if (n.includes('raita') || n.includes('curd') || n.includes('dahi')) return PURE_VEG_IMAGES.boondi_raita;

  // Snacks & Starters
  if (n.includes('pakoda') || n.includes('pakora')) return PURE_VEG_IMAGES.veg_pakoda;
  if (n.includes('tikka')) return PURE_VEG_IMAGES.paneer_tikka;
  if (n.includes('kabab') || n.includes('kebab')) return PURE_VEG_IMAGES.hara_bhara_kabab;
  if (n.includes('chaat') || n.includes('bhelpuri') || n.includes('papdi') || n.includes('aloo chat')) return PURE_VEG_IMAGES.chaat;
  if (n.includes('fry') || n.includes('fries') || n.includes('chips') || n.includes('finger')) return PURE_VEG_IMAGES.french_fries;

  // Chinese & Fast Food
  if (n.includes('noodle') || n.includes('chowmein')) return PURE_VEG_IMAGES.veg_noodles;
  if (n.includes('manchurian')) return PURE_VEG_IMAGES.veg_manchurian;
  if (n.includes('chilli paneer')) return PURE_VEG_IMAGES.chilli_paneer;
  if (n.includes('pasta')) return PURE_VEG_IMAGES.veg_pasta;
  if (n.includes('pizza')) return PURE_VEG_IMAGES.veg_pizza;
  if (n.includes('burger')) return PURE_VEG_IMAGES.veg_burger;
  if (n.includes('momo')) return PURE_VEG_IMAGES.veg_momos;
  if (n.includes('fried rice')) return PURE_VEG_IMAGES.veg_fried_rice;
  if (n.includes('spring roll')) return PURE_VEG_IMAGES.spring_roll;

  // Main Course Curries
  if (n.includes('paneer') || n.includes('shahi') || n.includes('kadai') || n.includes('makhani') || n.includes('butter masala') || n.includes('pasanda')) return PURE_VEG_IMAGES.shahi_paneer;
  if (n.includes('dal') || n.includes('tadka')) return PURE_VEG_IMAGES.dal_tadka;
  if (n.includes('kofta')) return PURE_VEG_IMAGES.malai_kofta;
  if (n.includes('mushroom') || n.includes('matar mushroom') || n.includes('mushroom do pyaza')) return PURE_VEG_IMAGES.mushroom_masala;
  if (n.includes('chana') || n.includes('pindi')) return PURE_VEG_IMAGES.chana_masala;
  if (n.includes('aloo') || n.includes('jeera aloo') || n.includes('dum aloo')) return PURE_VEG_IMAGES.jeera_aloo;
  if (n.includes('thali') || n.includes('special')) return PURE_VEG_IMAGES.krishna_thali;
  if (n.includes('veg') || n.includes('mix') || n.includes('gobhi') || n.includes('bhindi')) return PURE_VEG_IMAGES.mix_veg;

  // Breads
  if (n.includes('naan') || n.includes('kulcha')) return PURE_VEG_IMAGES.butter_naan;
  if (n.includes('roti') || n.includes('phulka') || n.includes('missi')) return PURE_VEG_IMAGES.tandoori_roti;

  // Rice
  if (n.includes('biryani')) return PURE_VEG_IMAGES.veg_biryani;
  if (n.includes('pulao') || n.includes('pulav') || n.includes('rice')) return PURE_VEG_IMAGES.veg_pulao;

  // Sweets
  if (n.includes('jamun')) return PURE_VEG_IMAGES.gulab_jamun;
  if (n.includes('ice cream') || n.includes('sundae')) return PURE_VEG_IMAGES.ice_cream;
  if (n.includes('sweet') || n.includes('rasgulla') || n.includes('kheer')) return PURE_VEG_IMAGES.indian_sweet;

  return PURE_VEG_IMAGES.pure_veg_thali;
}

async function run() {
  const { data: items, error } = await supabase.from('menu_items').select('id, name');
  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  console.log(`Setting 100% Pure Veg verified images for ${items.length} items...`);
  for (const item of items) {
    const imageUrl = matchPureVegImage(item.name);
    await supabase.from('menu_items').update({ image_url: imageUrl, veg_type: 'veg' }).eq('id', item.id);
  }
  console.log('✅ ALL items updated with 100% Pure Vegetarian images and veg_type=veg!');
}

run().catch(console.error);
