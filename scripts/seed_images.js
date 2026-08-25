const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

/**
 * Curated, food-accurate Unsplash images for each menu item.
 * All images are 100% vegetarian Indian food dishes.
 */
const ITEM_IMAGES = {
  // ═══════════════════════════════════
  // TANDOORI NAZRANE
  // ═══════════════════════════════════
  'Achari Paneer Tikka':          'https://images.unsplash.com/photo-1567184109277-3e817997573d?auto=format&fit=crop&w=600&q=85',
  'Aloo Hangama':                 'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=85',
  'Dahi Ke Kabab':                'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=85',
  'Hara Bhara Kabab':             'https://images.unsplash.com/photo-1600803907087-f56d462fd26b?auto=format&fit=crop&w=600&q=85',
  'Kasundi Broccoli':             'https://images.unsplash.com/photo-1628773822503-930a7eaecf80?auto=format&fit=crop&w=600&q=85',
  'Malai Paneer Tikka':           'https://images.unsplash.com/photo-1567184109277-3e817997573d?auto=format&fit=crop&w=600&q=85',
  'Paneer Tikka':                 'https://images.unsplash.com/photo-1567184109277-3e817997573d?auto=format&fit=crop&w=600&q=85',
  'Tandoori Broccoli Kali Mirch': 'https://images.unsplash.com/photo-1628773822503-930a7eaecf80?auto=format&fit=crop&w=600&q=85',
  'Tandoori Chaap Kali Mirch':    'https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=600&q=85',
  'Tandoori Soya Chaap':          'https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=600&q=85',
  'Vegetable Seekh Kabab':        'https://images.unsplash.com/photo-1600803907087-f56d462fd26b?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // SALADS & RAITA
  // ═══════════════════════════════════
  'Aloo Chaat in Tangy Dressing': 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Fresh Green Salad':            'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=85',
  'Fresh Paneer (200 gm)':        'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Kachumber Salad':              'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=85',
  'Mix Fruit Raita':              'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=85',
  'Pineapple Raita':              'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=85',
  'Plain Curd Bowl':              'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=85',
  'Raita (Boondi / Mix Veg / Cucumber / Pudina)': 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=600&q=85',
  'Russian Salad':                'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // PANEER & VEGETABLES
  // ═══════════════════════════════════
  'Aloo Gobhi Masala':            'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=85',
  'Aloo Mutter':                  'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=85',
  'Bhindi Masala (Seasonal)':     'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=85',
  'Chana Masala':                 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=85',
  'Dal Fry':                      'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=85',
  'Dal Makhani':                  'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=85',
  'Dum Aloo (Banarasi / Kashmiri)':'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=85',
  'Gobhi Mutter Masala':          'https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=600&q=85',
  'Jeera Aloo':                   'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=85',
  'Kadhai Chaap':                 'https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=600&q=85',
  'Kadhai Paneer':                'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Malai Kofta':                  'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Masala Chaap':                 'https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=600&q=85',
  'Mix Veg.':                     'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=85',
  'Mushroom Masala':              'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=85',
  'Mutter Mushroom':              'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=600&q=85',
  'Mutter Paneer':                'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Navratan Korma':               'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=85',
  'Palak Paneer':                 'https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?auto=format&fit=crop&w=600&q=85',
  'Paneer Bhurji':                'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Paneer Butter Masala':         'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Paneer Lababdar':              'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Paneer Tikka Masala':          'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Rajma Rasila':                 'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=85',
  'Rogani Chaap':                 'https://images.unsplash.com/photo-1567337710282-00832b415979?auto=format&fit=crop&w=600&q=85',
  'Rogani Kathal (Jackfruit)':    'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=85',
  'Shahi Paneer (White Gravy)':   'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Subz Diwani Handi':            'https://images.unsplash.com/photo-1645177628172-a94c1f96e6db?auto=format&fit=crop&w=600&q=85',
  'Veg Kofta':                    'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?auto=format&fit=crop&w=600&q=85',
  'Yellow Dal Tadka':             'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // BREAKFAST
  // ═══════════════════════════════════
  'Aloo Stuffed Tawa Paratha':    'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=85',
  'Butter Toast with Jam':        'https://images.unsplash.com/photo-1484723091739-30a097e8f929?auto=format&fit=crop&w=600&q=85',
  'Cereals':                      'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=600&q=85',
  'Chhole Bhature':               'https://images.unsplash.com/photo-1626132647523-66f5bf380027?auto=format&fit=crop&w=600&q=85',
  'Mix Veg / Gobhi Paratha':      'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=85',
  'Paneer Stuffed Paratha':       'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=85',
  'Plain Paratha':                'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=85',
  'Poha with Bhaujia':            'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=600&q=85',
  'Poori with Bhaji':             'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Veg Cheese Grilled Sandwiches':'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=85',
  'Veg Club Sandwich':            'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=85',
  'Vegetable Cutlets':            'https://images.unsplash.com/photo-1606491956689-2ea866880c84?auto=format&fit=crop&w=600&q=85',
  'Vegetable Grilled Sandwiches': 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=85',
  'Vegetable Plain Sandwiches':   'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // CHINESE FAVOURITES
  // ═══════════════════════════════════
  'American Chopsuey':            'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=85',
  'Chilly Mushroom (Dry / Gravy)':'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=600&q=85',
  'Chilly Paneer (Dry / Gravy)':  'https://images.unsplash.com/photo-1565557623262-b51c2513a641?auto=format&fit=crop&w=600&q=85',
  'Hakka Noodles':                'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=85',
  'Honey Chilly Potato':          'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=85',
  'Paneer / Mushroom Fried Rice': 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=85',
  'Schezwan Rice':                'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=85',
  'Veg Noodles':                  'https://images.unsplash.com/photo-1585032226651-759b368d7246?auto=format&fit=crop&w=600&q=85',
  'Veg. Fried Rice':              'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=600&q=85',
  'Vegetable Manchurian (Dry / Gravy)': 'https://images.unsplash.com/photo-1525755662778-989d0524087e?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // DESSERTS & ICE CREAMS
  // ═══════════════════════════════════
  'American Nuts Ice Cream (2 scoop)': 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=85',
  'Brownie with Ice Cream':       'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=85',
  'Butterscotch (2 scoop)':       'https://images.unsplash.com/photo-1560008511-11c63416e52d?auto=format&fit=crop&w=600&q=85',
  'Chocolate Brownie':            'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=600&q=85',
  'Coffee Ice Cream':             'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=85',
  'Gulab Jamun (2 pcs)':          'https://images.unsplash.com/photo-1605197148560-f1c5c643924f?auto=format&fit=crop&w=600&q=85',
  'Kesar Pista Ice Cream':        'https://images.unsplash.com/photo-1560008511-11c63416e52d?auto=format&fit=crop&w=600&q=85',
  'Kulfi Kesar Badam':            'https://images.unsplash.com/photo-1560008511-11c63416e52d?auto=format&fit=crop&w=600&q=85',
  'Mango Ice Cream (2 scoop)':    'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=85',
  'Moong Dal Halwa (100 gm)':     'https://images.unsplash.com/photo-1579372786545-d24232daf58c?auto=format&fit=crop&w=600&q=85',
  'Strawberry Ice Cream':         'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=85',
  'Vanilla (2 Scoop)':            'https://images.unsplash.com/photo-1560008511-11c63416e52d?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // MOCKTAILS
  // ═══════════════════════════════════
  'Blue Lagoon':                  'https://images.unsplash.com/photo-1590301157890-4810ed352733?auto=format&fit=crop&w=600&q=85',
  'Fruit Punch':                  'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=85',
  'Mint Pina Colada':             'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=600&q=85',
  'Mojito':                       'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=600&q=85',
  'Strawberry Mojito':            'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=600&q=85',
  'Virgin Mojito':                'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=600&q=85',
  'Watermelon Mojito':            'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // INDIAN BREADS
  // ═══════════════════════════════════
  'Bread Basket':                 'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&w=600&q=85',
  'Butter Naan':                  'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Extra Butter (Cubes)':         'https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=600&q=85',
  'Lachcha Paratha Butter':       'https://images.unsplash.com/photo-1626074353765-517a681e40be?auto=format&fit=crop&w=600&q=85',
  'Missi Roti Butter':            'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&w=600&q=85',
  'Plain Naan':                   'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Stuffed Naan - Paneer':        'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Stuffed Naan Potato':          'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Tandoori Roti - Plain':        'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&w=600&q=85',
  'Tandoori Roti Butter':         'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&w=600&q=85',
  'Tawa Roti - Plain':            'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&w=600&q=85',
  'Tawa Roti Butter':             'https://images.unsplash.com/photo-1568254183919-78a4f43a2877?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // BEVERAGES
  // ═══════════════════════════════════
  'Butter Milk':                  'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=85',
  'Cold Coffee (Without Ice Cream)': 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=85',
  'Cold Coffee with Ice Cream':   'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=85',
  'Cold Drink (200 ml)':          'https://images.unsplash.com/photo-1532558759-1b77d7f54b38?auto=format&fit=crop&w=600&q=85',
  'Dry Fruit Kulhar Lassi':       'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=85',
  'Fresh Juices (200 ml)':        'https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=600&q=85',
  'Fresh Lime Water':             'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=85',
  'Fruit Shake':                  'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=85',
  'Ginger Tea':                   'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=85',
  'Honey Lemon Tea':              'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&w=600&q=85',
  'Hot / Cold Milk':              'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=600&q=85',
  'Hot Chocolate':                'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?auto=format&fit=crop&w=600&q=85',
  'Hot Coffee':                   'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=600&q=85',
  'Jaljeera':                     'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=85',
  'Milk Shake with Ice Cream':    'https://images.unsplash.com/photo-1572490122747-3968b75cc699?auto=format&fit=crop&w=600&q=85',
  'Mineral Water Bottle':         'https://images.unsplash.com/photo-1548839140-29a749e1cf4d?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // SOUP KETTLE
  // ═══════════════════════════════════
  'Cream of Mushroom Soup':       'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=85',
  'Lemon Coriander Soup':         'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=85',
  'Sweet Corn Soup':              'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=85',
  'Tomato Soup':                  'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=85',
  'Veg Hot & Sour Soup':          'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=85',
  'Veg Manchow Soup':             'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // SOUTH INDIAN SPECIAL
  // ═══════════════════════════════════
  'Curd Rice':                    'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?auto=format&fit=crop&w=600&q=85',
  'Idli with Sambar':             'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=85',
  'Masala Dosa':                  'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=85',
  'Paneer Dosa':                  'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=85',
  'Paneer Uttapam with Sambar':   'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=85',
  'Plain / Tomato / Veg. Uttapam':'https://images.unsplash.com/photo-1668236543090-82eba5ee5976?auto=format&fit=crop&w=600&q=85',
  'Plain Dosa / Pepper Dosa':     'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=85',
  'Upma with Sambar':             'https://images.unsplash.com/photo-1613292443284-8d10ef9383fe?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // THALI
  // ═══════════════════════════════════
  'Delux Thaali':                 'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=85',
  'Regular Thaali':               'https://images.unsplash.com/photo-1610057099443-fde8c4d50f91?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // SNACKS
  // ═══════════════════════════════════
  'French Fries':                 'https://images.unsplash.com/photo-1576107232684-1279f3908594?auto=format&fit=crop&w=600&q=85',
  'Masala Papad':                 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Mixed Veg Pakora':             'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',
  'Paneer Pakora':                'https://images.unsplash.com/photo-1567184109277-3e817997573d?auto=format&fit=crop&w=600&q=85',
  'Peanuts Masala':               'https://images.unsplash.com/photo-1548167048-c212ba1a3a96?auto=format&fit=crop&w=600&q=85',
  'Plain Papad (Roast / Fried)':  'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=85',

  // ═══════════════════════════════════
  // BAHAR-E-BASMATI (Rice)
  // ═══════════════════════════════════
  'Jeera Rice':                   'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?auto=format&fit=crop&w=600&q=85',
  'Kashmiri Pulao':               'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=85',
  'Lemon Rice':                   'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?auto=format&fit=crop&w=600&q=85',
  'Mutter Pulao':                 'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=85',
  'Plain Rice':                   'https://images.unsplash.com/photo-1516714435131-44d6b64dc6a2?auto=format&fit=crop&w=600&q=85',
  'Soya Chaap Biryani':           'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=85',
  'Veg. Biryani':                 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=85',
  'Veg. Pulao':                   'https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=600&q=85',
};

async function updateImages() {
  console.log('Fetching all menu items from database...\n');
  const { data: items, error } = await supabase
    .from('menu_items')
    .select('id, name, image_url');

  if (error) {
    console.error('Error fetching items:', error);
    return;
  }

  console.log(`Found ${items.length} menu items. Updating images...\n`);

  let updated = 0;
  let skipped = 0;
  let notFound = [];

  for (const item of items) {
    const imageUrl = ITEM_IMAGES[item.name];

    if (!imageUrl) {
      notFound.push(item.name);
      skipped++;
      continue;
    }

    const { error: updateError } = await supabase
      .from('menu_items')
      .update({ image_url: imageUrl })
      .eq('id', item.id);

    if (updateError) {
      console.error(`❌ Failed to update "${item.name}":`, updateError.message);
    } else {
      console.log(`✅ ${item.name}`);
      updated++;
    }
  }

  console.log(`\n${'═'.repeat(50)}`);
  console.log(`🎉 Updated: ${updated} items`);
  if (notFound.length) {
    console.log(`⚠️  Not in map (${notFound.length}):`);
    notFound.forEach(n => console.log(`   - ${n}`));
  }
}

updateImages().catch(console.error);
