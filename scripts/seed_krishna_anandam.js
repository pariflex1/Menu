const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mjgneisuyrlvvcjtdaaz.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1qZ25laXN1eXJsdnZjanRkYWF6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjcwODE1NCwiZXhwIjoyMTAyMjg0MTU0fQ.0DfWYxbgxmwrzBF58RXP6vxrJqrQyvfXzJ8OtnkGslc';

const supabase = createClient(supabaseUrl, supabaseKey);

const RESTAURANT_ID = '11111111-1111-1111-1111-111111111111';

async function seed() {
  console.log('🚀 Seeding Krishna Anandam restaurant data...');

  // 1. Update/Upsert Restaurant
  const { error: restError } = await supabase
    .from('restaurants')
    .upsert({
      id: RESTAURANT_ID,
      name: 'KRISHNA ANANDAM',
      slug: 'krishna-anandam',
      phone: '+91 91290 54406, +91 92085 50807',
      email: 'krishnaanandam08@gmail.com',
      address: 'Plot No. E-17, Sector-2, Rukmani Vihar, Opposite Sanskar City, Vrindavan, Mathura (UP) 281121',
      currency: 'INR'
    });

  if (restError) throw new Error('Failed to upsert restaurant: ' + restError.message);
  console.log('✅ Restaurant details updated to KRISHNA ANANDAM');

  // 2. Update/Upsert Restaurant Settings (settings stored as JSONB + flat columns)
  const { error: settingsError } = await supabase
    .from('restaurant_settings')
    .upsert({
      restaurant_id: RESTAURANT_ID,
      tax_percent: 5.00,
      table_ordering_enabled: true,
      room_service_enabled: true,
      home_delivery_enabled: true,
      min_home_order_amount: 100.00,
      delivery_fee: 30.00,
      opening_time: '07:30',
      closing_time: '23:00',
      manual_override: null,
      settings: {
        tax_percent: 5.00,
        table_ordering_enabled: true,
        room_service_enabled: true,
        home_delivery_enabled: true,
        min_home_order_amount: 100.00,
        delivery_fee: 30.00,
        opening_time: '07:30',
        closing_time: '23:00',
        manual_override: null
      }
    }, { onConflict: 'restaurant_id' });

  if (settingsError) throw new Error('Failed to upsert settings: ' + settingsError.message);
  console.log('✅ Restaurant settings updated (GST 5% extra, opening 07:30 AM)');

  // 3. Delete existing menu items and categories for a clean reload
  console.log('🧹 Cleaning old menu items and categories...');
  await supabase.from('menu_item_addons').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('order_items').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('menu_items').delete().eq('restaurant_id', RESTAURANT_ID);
  await supabase.from('categories').delete().eq('restaurant_id', RESTAURANT_ID);

  // 4. Define Categories & Items
  const menuData = [
    {
      category: 'BREAKFAST',
      description: 'Served from 07:30 AM',
      items: [
        { name: 'Cereals', price: 120.00, description: 'Nutritious breakfast cereals' },
        { name: 'Butter Toast with Jam', price: 110.00, description: '4 pcs fried bread with butter & jam' },
        { name: 'Vegetable Cutlets', price: 140.00, description: '2 pcs served with potato chips' },
        { name: 'Aloo Stuffed Tawa Paratha', price: 150.00, description: '2 pcs with curd and pickle' },
        { name: 'Plain Paratha', price: 120.00, description: '2 pcs with curd and pickle' },
        { name: 'Mix Veg / Gobhi Paratha', price: 180.00, description: '2 pcs with curd and pickle' },
        { name: 'Paneer Stuffed Paratha', price: 200.00, description: '2 pcs with curd and pickle' },
        { name: 'Poha with Bhaujia', price: 140.00, description: 'Flattened rice tossed with spices and crisp bhujia' },
        { name: 'Vegetable Plain Sandwiches', price: 100.00, description: 'Fresh vegetable sandwich' },
        { name: 'Vegetable Grilled Sandwiches', price: 120.00, description: 'Crispy grilled sandwich with vegetables' },
        { name: 'Veg Cheese Grilled Sandwiches', price: 150.00, description: 'Grilled sandwich loaded with cheese and vegetables' },
        { name: 'Veg Club Sandwich', price: 175.00, description: 'Multi-layer sandwich served fresh' },
        { name: 'Chhole Bhature', price: 150.00, description: 'Spiced chickpeas served with 2 fluffy bhaturas' },
        { name: 'Poori with Bhaji', price: 150.00, description: '4 pcs hot pooris served with flavorful potato bhaji' },
      ]
    },
    {
      category: 'SOUTH INDIAN SPECIAL',
      description: 'Traditional South Indian delicacies',
      items: [
        { name: 'Idli with Sambar', price: 120.00, description: '2 pcs each served with sambar, coconut and tomato chutney' },
        { name: 'Upma with Sambar', price: 150.00, description: 'Served with sambar, coconut and tomato chutney' },
        { name: 'Plain / Tomato / Veg. Uttapam', price: 150.00, description: 'Served with sambar, coconut and tomato chutney' },
        { name: 'Paneer Uttapam with Sambar', price: 180.00, description: 'Served with sambar, coconut and tomato chutney' },
        { name: 'Masala Dosa', price: 150.00, description: 'Crispy rice crepe filled with spiced potato masala' },
        { name: 'Plain Dosa / Pepper Dosa', price: 120.00, description: 'Golden crispy dosa served with chutneys & sambar' },
        { name: 'Paneer Dosa', price: 220.00, description: 'Crispy dosa loaded with spiced paneer filling' },
        { name: 'Curd Rice', price: 160.00, description: 'Tempered yogurt rice with mustard, ginger, and curry leaves' }
      ]
    },
    {
      category: 'BEVERAGES',
      description: 'Hot drinks, shakes & refreshing beverages',
      items: [
        { name: 'Hot Chocolate', price: 120.00, description: 'Rich chocolate drink served with hot milk' },
        { name: 'Hot / Cold Milk', price: 80.00, description: '200 ml glass of fresh milk' },
        { name: 'Hot Coffee', price: 60.00, description: 'Freshly brewed aromatic coffee' },
        { name: 'Ginger Tea', price: 40.00, description: 'Fresh Indian chai infused with ginger' },
        { name: 'Cold Coffee with Ice Cream', price: 140.00, description: 'Creamy cold coffee topped with vanilla ice cream' },
        { name: 'Cold Coffee (Without Ice Cream)', price: 120.00, description: 'Chilled blended coffee' },
        { name: 'Honey Lemon Tea', price: 70.00, description: 'Warm tea with honey and fresh lemon' },
        { name: 'Mineral Water Bottle', price: 20.00, description: 'Packaged drinking water (MRP)' },
        { name: 'Jaljeera', price: 60.00, description: 'Refreshing spiced cumin cooler' },
        { name: 'Butter Milk', price: 60.00, description: 'Traditional spiced chaas' },
        { name: 'Fresh Lime Water', price: 70.00, description: 'Sweet or salted' },
        { name: 'Fresh Juices (200 ml)', price: 80.00, description: 'Orange, Pineapple, or Mix Fruits' },
        { name: 'Cold Drink (200 ml)', price: 80.00, description: 'Orange, Lemon, or Cola' },
        { name: 'Milk Shake with Ice Cream', price: 140.00, description: 'Chocolate / Strawberry / Vanilla / Butterscotch' },
        { name: 'Dry Fruit Kulhar Lassi', price: 110.00, description: 'Sweet or salted lassi served in traditional kulhad' },
        { name: 'Fruit Shake', price: 140.00, description: 'Pineapple / Mix Fruit / Banana / Mango' }
      ]
    },
    {
      category: 'MOCKTAILS',
      description: 'Handcrafted signature mocktails',
      items: [
        { name: 'Fruit Punch', price: 120.00, description: 'Mix fruit juices with rose ice cream' },
        { name: 'Mint Pina Colada', price: 120.00, description: 'Pineapple, coconut milk, banana, and honey' },
        { name: 'Blue Lagoon', price: 120.00, description: 'Refreshing curacao with lime and fizz' },
        { name: 'Mojito', price: 120.00, description: 'Lemon, fresh mint, peppermint balls, and lemonade' },
        { name: 'Watermelon Mojito', price: 120.00, description: 'Fresh watermelon, mint, and lemon' },
        { name: 'Strawberry Mojito', price: 120.00, description: 'Strawberry puree with mint and sparkling soda' },
        { name: 'Virgin Mojito', price: 120.00, description: 'Classic mint and lime cooler' }
      ]
    },
    {
      category: 'SNACKS',
      description: 'Quick bites and crunchy snacks',
      items: [
        { name: 'Mixed Veg Pakora', price: 120.00, description: '8 pcs crispy assorted vegetable fritters' },
        { name: 'Paneer Pakora', price: 200.00, description: '8 pcs soft paneer coated in spiced gram flour batter' },
        { name: 'Peanuts Masala', price: 150.00, description: 'Roasted peanuts tossed with onion, tomato, and spices' },
        { name: 'Masala Papad', price: 100.00, description: '2 pcs crisp papad topped with tangy onion-tomato mixture' },
        { name: 'Plain Papad (Roast / Fried)', price: 60.00, description: '2 pcs roasted or fried papad' },
        { name: 'French Fries', price: 120.00, description: 'Golden salted potato fries' }
      ]
    },
    {
      category: 'SOUP KETTLE',
      description: 'Warm, comforting and delicious soups',
      items: [
        { name: 'Cream of Mushroom Soup', price: 140.00, description: 'Velvety soup with freshly sautéed mushrooms' },
        { name: 'Tomato Soup', price: 120.00, description: 'Classic creamy ripe tomato soup with croutons' },
        { name: 'Sweet Corn Soup', price: 120.00, description: 'Comforting soup with tender sweet corn kernels' },
        { name: 'Lemon Coriander Soup', price: 120.00, description: 'Clear tangy soup with fresh lemon and coriander' },
        { name: 'Veg Manchow Soup', price: 140.00, description: 'Spicy and tangy soup served with crispy fried noodles' },
        { name: 'Veg Hot & Sour Soup', price: 120.00, description: 'Zesty Indo-Chinese soup with vegetables' }
      ]
    },
    {
      category: 'CHINESE FAVOURITES',
      description: 'Indo-Chinese starters, noodles & rice',
      items: [
        { name: 'Chilly Paneer (Dry / Gravy)', price: 250.00, description: 'Cottage cheese tossed with bell peppers and green chillies' },
        { name: 'Chilly Mushroom (Dry / Gravy)', price: 220.00, description: 'Fresh mushrooms in spicy soya-chilli glaze' },
        { name: 'Honey Chilly Potato', price: 180.00, description: 'Crisp potato fingers glazed with sweet and spicy sesame honey sauce' },
        { name: 'Hakka Noodles', price: 200.00, description: 'Wok-tossed noodles with shredded vegetables' },
        { name: 'Veg. Fried Rice', price: 200.00, description: 'Aromatic wok-tossed rice with vegetables' },
        { name: 'Schezwan Rice', price: 220.00, description: 'Fiery wok-tossed rice with spicy Schezwan sauce' },
        { name: 'Veg Noodles', price: 180.00, description: 'Classic street style vegetable noodles' },
        { name: 'Vegetable Manchurian (Dry / Gravy)', price: 220.00, description: 'Seasonal vegetable dumplings tossed in mild sauce' },
        { name: 'American Chopsuey', price: 220.00, description: 'Crispy noodles topped with vegetables cooked in sweet and sour sauce' },
        { name: 'Paneer / Mushroom Fried Rice', price: 240.00, description: 'Fragrant fried rice loaded with paneer and mushrooms' }
      ]
    },
    {
      category: 'TANDOORI NAZRANE',
      description: 'Clay-oven grilled appetizers & kebabs',
      items: [
        { name: 'Paneer Tikka', price: 260.00, description: '6 pcs cottage cheese cubes marinated in tandoori spices and grilled' },
        { name: 'Achari Paneer Tikka', price: 270.00, description: '6 pcs paneer marinated in tangy pickling spices' },
        { name: 'Malai Paneer Tikka', price: 290.00, description: '6 pcs rich paneer marinated in cream, cashew paste, and mild spices' },
        { name: 'Vegetable Seekh Kabab', price: 200.00, description: '8 pcs minced vegetable skewers roasted over coals' },
        { name: 'Tandoori Soya Chaap', price: 220.00, description: '6 pcs soya chaap in spiced tandoori marinade' },
        { name: 'Tandoori Chaap Kali Mirch', price: 250.00, description: 'Soya chaap marinated with crushed black pepper and cream' },
        { name: 'Tandoori Broccoli Kali Mirch', price: 250.00, description: 'Tender broccoli florets infused with black pepper marinade' },
        { name: 'Kasundi Broccoli', price: 250.00, description: 'Charred broccoli flavored with mustard Kasundi relish' },
        { name: 'Dahi Ke Kabab', price: 235.00, description: '6 pcs creamy hung curd patties with a golden crust' },
        { name: 'Hara Bhara Kabab', price: 200.00, description: '8 pcs spinach, green peas, and potato patties' },
        { name: 'Aloo Hangama', price: 200.00, description: '8 pcs marinated baby potatoes roasted in tandoor' }
      ]
    },
    {
      category: 'SALADS & RAITA',
      description: 'Fresh accompaniments & yogurt bowls',
      items: [
        { name: 'Fresh Green Salad', price: 100.00, description: 'Sliced cucumbers, tomatoes, carrots, and onions' },
        { name: 'Russian Salad', price: 150.00, description: 'Diced boiled vegetables dressed in creamy mayonnaise' },
        { name: 'Aloo Chaat in Tangy Dressing', price: 140.00, description: 'Crispy fried potatoes tossed in spicy tamarind and mint chutneys' },
        { name: 'Kachumber Salad', price: 120.00, description: 'Finely chopped onion, tomato, and cucumber tossed with lemon juice' },
        { name: 'Fresh Paneer (200 gm)', price: 180.00, description: 'Fresh raw cottage cheese with chaat masala' },
        { name: 'Raita (Boondi / Mix Veg / Cucumber / Pudina)', price: 100.00, description: 'Whisked spiced yogurt with choice of mix-in' },
        { name: 'Pineapple Raita', price: 140.00, description: 'Sweet and chilled yogurt with juicy pineapple bits' },
        { name: 'Mix Fruit Raita', price: 150.00, description: 'Creamy yogurt folded with seasonal fruits' },
        { name: 'Plain Curd Bowl', price: 70.00, description: 'Fresh home-style set yogurt' }
      ]
    },
    {
      category: 'BAHAR-E-BASMATI',
      description: 'Fragrant aromatic Basmati rice preparations & biryanis',
      items: [
        { name: 'Veg. Biryani', price: 240.00, description: 'Fragrant basmati rice layered with spiced vegetables and herbs' },
        { name: 'Veg. Pulao', price: 220.00, description: 'Basmati rice cooked with fresh seasonal vegetables and whole spices' },
        { name: 'Kashmiri Pulao', price: 270.00, description: 'Sweet and rich pulao garnished with dry fruits and fresh fruits' },
        { name: 'Lemon Rice', price: 180.00, description: 'Tempered rice with fresh lemon juice, curry leaves, and peanuts' },
        { name: 'Mutter Pulao', price: 200.00, description: 'Basmati rice tossed with sweet green peas' },
        { name: 'Jeera Rice', price: 180.00, description: 'Basmati rice tempered with roasted cumin seeds and ghee' },
        { name: 'Plain Rice', price: 160.00, description: 'Steamed premium long-grain basmati rice' },
        { name: 'Soya Chaap Biryani', price: 250.00, description: 'Flavorful basmati rice cooked with marinated soya chaap pieces' }
      ]
    },
    {
      category: 'PANEER & VEGETABLES',
      description: 'Main course North Indian curries and gravies',
      items: [
        { name: 'Yellow Dal Tadka', price: 200.00, description: 'Yellow lentils tempered with cumin, garlic, and ghee' },
        { name: 'Dal Fry', price: 180.00, description: 'Homestyle cooked yellow lentils with onion-tomato tadka' },
        { name: 'Rajma Rasila', price: 240.00, description: 'Red kidney beans slow cooked in rich aromatic gravy' },
        { name: 'Dal Makhani', price: 250.00, description: 'Slow-cooked black lentils simmered with butter and fresh cream' },
        { name: 'Jeera Aloo', price: 160.00, description: 'Diced potatoes tempered with roasted cumin seeds' },
        { name: 'Aloo Gobhi Masala', price: 220.00, description: 'Potatoes and cauliflower florets cooked in spicy masala' },
        { name: 'Mix Veg.', price: 240.00, description: 'Assorted seasonal vegetables simmered in onion-tomato gravy' },
        { name: 'Gobhi Mutter Masala', price: 240.00, description: 'Cauliflower and peas tossed in rich gravy' },
        { name: 'Bhindi Masala (Seasonal)', price: 220.00, description: 'Crisp ladyfingers sautéed with onions and dry spices' },
        { name: 'Aloo Mutter', price: 200.00, description: 'Potatoes and green peas in home-style curry' },
        { name: 'Mushroom Masala', price: 280.00, description: 'Fresh button mushrooms cooked in thick spicy gravy' },
        { name: 'Mutter Mushroom', price: 260.00, description: 'Mushrooms and sweet green peas in spiced onion gravy' },
        { name: 'Dum Aloo (Banarasi / Kashmiri)', price: 260.00, description: 'Stuffed or whole baby potatoes simmered in rich gravy' },
        { name: 'Chana Masala', price: 220.00, description: 'Spiced chickpeas cooked in traditional Punjabi gravy' },
        { name: 'Mutter Paneer', price: 220.00, description: 'Cottage cheese cubes and peas in classic tomato gravy' },
        { name: 'Kadhai Paneer', price: 280.00, description: 'Paneer tossed with bell peppers and freshly ground kadhai spices' },
        { name: 'Paneer Butter Masala', price: 290.00, description: 'Paneer cubes in creamy, mildly sweet tomato-butter gravy' },
        { name: 'Paneer Tikka Masala', price: 300.00, description: 'Charred paneer tikka pieces in rich spiced gravy' },
        { name: 'Shahi Paneer (White Gravy)', price: 300.00, description: 'Paneer cooked in rich cashew and cream white gravy' },
        { name: 'Paneer Lababdar', price: 290.00, description: 'Rich tomato gravy with grated paneer and cottage cheese cubes' },
        { name: 'Paneer Bhurji', price: 320.00, description: 'Scrambled paneer cooked with onion, tomato, and spices' },
        { name: 'Palak Paneer', price: 280.00, description: 'Paneer cubes in vibrant spinach puree gravy' },
        { name: 'Navratan Korma', price: 320.00, description: 'Nine gem assortment of vegetables and dry fruits in creamy sweet gravy' },
        { name: 'Malai Kofta', price: 280.00, description: 'Melt-in-mouth paneer and potato dumplings in silky cashew gravy' },
        { name: 'Kadhai Chaap', price: 280.00, description: 'Soya chaap cooked with onions, capsicum, and ground kadhai masala' },
        { name: 'Masala Chaap', price: 250.00, description: 'Tender soya chaap in thick spicy tomato gravy' },
        { name: 'Rogani Chaap', price: 250.00, description: 'Soya chaap cooked in Kashmiri rogan josh style gravy' },
        { name: 'Rogani Kathal (Jackfruit)', price: 280.00, description: 'Tender jackfruit cooked in aromatic spiced gravy' },
        { name: 'Veg Kofta', price: 220.00, description: 'Vegetable dumplings in savory curry' },
        { name: 'Subz Diwani Handi', price: 240.00, description: 'Assorted vegetables cooked handi-style in aromatic spinach gravy' }
      ]
    },
    {
      category: 'INDIAN BREADS',
      description: 'Fresh tandoor and tawa baked breads',
      items: [
        { name: 'Tandoori Roti - Plain', price: 30.00, description: 'Whole wheat bread baked in clay oven' },
        { name: 'Tandoori Roti Butter', price: 40.00, description: 'Clay oven baked wheat bread brushed with butter' },
        { name: 'Tawa Roti - Plain', price: 25.00, description: 'Traditional homestyle flatbread' },
        { name: 'Tawa Roti Butter', price: 30.00, description: 'Homestyle flatbread brushed with fresh butter' },
        { name: 'Missi Roti Butter', price: 50.00, description: 'Spiced gram flour and wheat bread with butter' },
        { name: 'Plain Naan', price: 60.00, description: 'Soft refined flour bread baked in tandoor' },
        { name: 'Butter Naan', price: 70.00, description: 'Layered soft naan generously coated with butter' },
        { name: 'Stuffed Naan Potato', price: 100.00, description: 'Naan stuffed with spiced mashed potatoes' },
        { name: 'Stuffed Naan - Paneer', price: 120.00, description: 'Naan stuffed with seasoned grated paneer' },
        { name: 'Bread Basket', price: 250.00, description: 'Assortment of Roti, Butter Naan, Missi Roti, and Lachcha Paratha' },
        { name: 'Lachcha Paratha Butter', price: 80.00, description: 'Multi-layered crispy whole wheat paratha brushed with butter' },
        { name: 'Extra Butter (Cubes)', price: 20.00, description: 'Portion of extra table butter' }
      ]
    },
    {
      category: 'DESSERTS & ICE CREAMS',
      description: 'Sweet treats, halwas and premium ice creams',
      items: [
        { name: 'Chocolate Brownie', price: 120.00, description: 'Warm fudgy chocolate brownie' },
        { name: 'Gulab Jamun (2 pcs)', price: 120.00, description: 'Soft milk-solid dumplings soaked in rose sugar syrup' },
        { name: 'Moong Dal Halwa (100 gm)', price: 100.00, description: 'Rich traditional lentil pudding cooked in pure desi ghee' },
        { name: 'Kulfi Kesar Badam', price: 80.00, description: 'Traditional saffron and almond matka kulfi' },
        { name: 'Butterscotch (2 scoop)', price: 120.00, description: 'Creamy butterscotch ice cream with crunchy praline' },
        { name: 'Vanilla (2 Scoop)', price: 100.00, description: 'Classic creamy vanilla ice cream' },
        { name: 'Brownie with Ice Cream', price: 180.00, description: 'Warm chocolate brownie paired with vanilla ice cream and chocolate sauce' },
        { name: 'Mango Ice Cream (2 scoop)', price: 120.00, description: 'Alphonso mango flavored ice cream' },
        { name: 'American Nuts Ice Cream (2 scoop)', price: 150.00, description: 'Rich ice cream studded with almonds, cashews, and raisins' },
        { name: 'Kesar Pista Ice Cream', price: 120.00, description: 'Saffron and pistachio ice cream' },
        { name: 'Strawberry Ice Cream', price: 120.00, description: 'Sweet strawberry ice cream' },
        { name: 'Coffee Ice Cream', price: 120.00, description: 'Rich espresso flavored ice cream' }
      ]
    },
    {
      category: 'THALI',
      description: 'Complete wholesome meal platters',
      items: [
        {
          name: 'Delux Thaali',
          price: 350.00,
          description: 'Includes: Paneer Butter Masala, Dal Makhani, Mix Veg, Jeera Rice, Mix Raita, Green Salad, Sweet, 2 Butter Roti, 1 Missi Roti, 1 Butter Naan, APC (as per choice).'
        },
        {
          name: 'Regular Thaali',
          price: 250.00,
          description: 'Includes: Dal Tadka, Gravy Subji, Mix Veg, Green Salad, Rice, 2 Butter Roti, 1 Missi Roti, APC.'
        }
      ]
    }
  ];

  console.log(`📦 Inserting ${menuData.length} categories...`);

  for (let catIdx = 0; catIdx < menuData.length; catIdx++) {
    const cat = menuData[catIdx];
    const { data: createdCat, error: catError } = await supabase
      .from('categories')
      .insert({
        restaurant_id: RESTAURANT_ID,
        name: cat.category,
        description: cat.description,
        sort_order: catIdx + 1,
        is_active: true
      })
      .select('id')
      .single();

    if (catError) {
      console.error(`Error inserting category ${cat.category}:`, catError.message);
      continue;
    }

    const itemsToInsert = cat.items.map((item, itemIdx) => ({
      restaurant_id: RESTAURANT_ID,
      category_id: createdCat.id,
      name: item.name,
      description: item.description,
      price: item.price,
      veg_type: 'veg',
      is_available: true,
      is_featured: (cat.category === 'THALI' || item.name.includes('Paneer Tikka') || item.name.includes('Paneer Butter Masala') || item.name.includes('Dal Makhani')),
      sort_order: itemIdx + 1
    }));

    const { error: itemsError } = await supabase
      .from('menu_items')
      .insert(itemsToInsert);

    if (itemsError) {
      console.error(`Error inserting items for category ${cat.category}:`, itemsError.message);
    } else {
      console.log(`  ✓ ${cat.category} (${cat.items.length} items)`);
    }
  }

  console.log('\n🎉 ALL KRISHNA ANANDAM MENU ITEMS SUCCESSFULLY LOADED!');
}

seed().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});
