/* ==========================================================================
   Olea Coffee & Kitchen — an imaginary café used to demo scan-to-order menus.
   Everything a real café would change lives here: name, tables, WhatsApp
   number, Wi-Fi, hours, prices and the menu itself. Texts are in
   assets/lang/<code>.js.
   ========================================================================== */
const CAFE = {
  name: 'Olea', tagline: 'Coffee & Kitchen',
  tables: 20,
  // Café WhatsApp number, digits only with country code (e.g. '905321234567').
  // Left empty for the demo: WhatsApp then lets the guest pick the chat.
  whatsapp: '',
  phone: '+90 500 000 00 00', phoneHref: 'tel:+905000000000',
  email: 'hello@oleacafe.com',
  address: 'Your street 00, Your city',
  hours: { open: '08:00', close: '23:00' },
  wifi: { ssid: 'Olea-Guests', pass: 'olea2026' },
  cur: '₺',
  house: 'en', // language the staff read orders in
  social: { instagram: 'https://www.instagram.com/', linkedin: 'https://www.linkedin.com/' },
};

const LANGS = [
  { code: 'en', name: 'English', intl: 'en-GB', dir: 'ltr' },
  { code: 'tr', name: 'Türkçe', intl: 'tr-TR', dir: 'ltr' },
  { code: 'fr', name: 'Français', intl: 'fr-FR', dir: 'ltr' },
  { code: 'de', name: 'Deutsch', intl: 'de-DE', dir: 'ltr' },
  { code: 'ar', name: 'العربية', intl: 'ar', dir: 'rtl' },
];
const FLAGS = {
  en: '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="60" height="30" fill="#012169"/><path d="M0 0l60 30M60 0L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30M60 0L0 30" stroke="#C8102E" stroke-width="2.5"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#C8102E" stroke-width="6"/></svg>',
  tr: '<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="30" height="20" fill="#E30A17"/><circle cx="11" cy="10" r="5" fill="#fff"/><circle cx="12.25" cy="10" r="4" fill="#E30A17"/><polygon fill="#fff" points="13.20,10.00 14.83,9.44 14.86,7.72 15.89,9.10 17.54,8.59 16.55,10.00 17.54,11.41 15.89,10.90 14.86,12.28 14.83,10.56"/></svg>',
  fr: '<svg viewBox="0 0 30 20" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="10" height="20" fill="#002395"/><rect x="10" width="10" height="20" fill="#fff"/><rect x="20" width="10" height="20" fill="#ED2939"/></svg>',
  de: '<svg viewBox="0 0 30 18" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="30" height="6" fill="#000"/><rect y="6" width="30" height="6" fill="#DD0000"/><rect y="12" width="30" height="6" fill="#FFCE00"/></svg>',
  ar: '<svg viewBox="0 0 30 18" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><rect width="30" height="6" fill="#00732F"/><rect y="6" width="30" height="6" fill="#fff"/><rect y="12" width="30" height="6" fill="#000"/><rect width="9" height="18" fill="#FF0000"/></svg>',
};

const CATS = [
  { id: 'coffee', icon: 'cup', img: 'cappuccino.jpg' },
  { id: 'cold', icon: 'ice', img: 'icedlatte.jpg' },
  { id: 'tea', icon: 'leaf', img: 'tea.jpg' },
  { id: 'breakfast', icon: 'egg', img: 'menemen.jpg' },
  { id: 'food', icon: 'bowl', img: 'halloumi.jpg' },
  { id: 'sweets', icon: 'cake', img: 'cheesecake.jpg' },
];

/* option groups: choices are [id, price difference]; toggles add a fixed price */
const OPTS = {
  size: { c: [['s', -15], ['m', 0], ['l', 20]], def: 'm' },
  temp: { c: [['hot', 0], ['iced', 10]], def: 'hot' },
  milk: { c: [['whole', 0], ['oat', 20], ['almond', 20], ['lf', 10]], def: 'whole' },
  syrup: { c: [['none', 0], ['vanilla', 15], ['caramel', 15], ['hazel', 15]], def: 'none' },
  sugar: { c: [['none', 0], ['little', 0], ['medium', 0], ['sweet', 0]], def: 'medium' },
  shot: { toggle: 25 },
  egg: { toggle: 45 },
};

/* t = tags (pop, new, vegan, veg, gf, nocaf shown; strong, sweet, cold, light, kids used by the assistant)
   al = allergens, o = options */
const MENU = [
  { id: 'espresso', cat: 'coffee', p: 95, o: ['shot'], t: ['vegan', 'gf', 'strong'], al: [], kcal: 5 },
  { id: 'americano', cat: 'coffee', p: 110, o: ['size', 'temp', 'shot'], t: ['vegan', 'gf', 'strong'], al: [], kcal: 10 },
  { id: 'cappuccino', cat: 'coffee', p: 135, o: ['size', 'milk', 'shot', 'syrup'], t: ['pop', 'veg', 'gf'], al: ['milk'], kcal: 120 },
  { id: 'latte', cat: 'coffee', p: 140, o: ['size', 'temp', 'milk', 'shot', 'syrup'], t: ['pop', 'veg', 'gf'], al: ['milk'], kcal: 180 },
  { id: 'flatwhite', cat: 'coffee', p: 145, o: ['milk', 'shot'], t: ['veg', 'gf', 'strong'], al: ['milk'], kcal: 110 },
  { id: 'mocha', cat: 'coffee', p: 155, o: ['size', 'temp', 'milk'], t: ['veg', 'gf', 'sweet'], al: ['milk'], kcal: 290 },
  { id: 'turkish', cat: 'coffee', p: 90, o: ['sugar'], t: ['pop', 'vegan', 'gf', 'strong'], al: [], kcal: 10 },
  { id: 'filter', cat: 'coffee', p: 120, o: [], t: ['new', 'vegan', 'gf'], al: [], kcal: 5 },

  { id: 'icedlatte', cat: 'cold', p: 150, o: ['size', 'milk', 'shot', 'syrup'], t: ['pop', 'veg', 'gf', 'cold'], al: ['milk'], kcal: 170 },
  { id: 'coldbrew', cat: 'cold', p: 145, o: ['size'], t: ['vegan', 'gf', 'strong', 'cold'], al: [], kcal: 5 },
  { id: 'frappe', cat: 'cold', p: 165, o: ['milk', 'syrup'], t: ['veg', 'gf', 'sweet', 'cold'], al: ['milk'], kcal: 340 },
  { id: 'matcha', cat: 'cold', p: 160, o: ['temp', 'milk'], t: ['new', 'veg', 'gf', 'cold'], al: ['milk'], kcal: 160 },
  { id: 'juice', cat: 'cold', p: 120, o: [], t: ['vegan', 'gf', 'nocaf', 'cold', 'light', 'kids'], al: [], kcal: 110 },
  { id: 'lemonade', cat: 'cold', p: 110, o: [], t: ['vegan', 'gf', 'nocaf', 'cold'], al: [], kcal: 120 },
  { id: 'smoothie', cat: 'cold', p: 165, o: [], t: ['vegan', 'gf', 'nocaf', 'cold', 'light'], al: ['nuts'], kcal: 210 },
  { id: 'water', cat: 'cold', p: 50, o: [], t: ['vegan', 'gf', 'nocaf', 'cold', 'light'], al: [], kcal: 0 },

  { id: 'tea', cat: 'tea', p: 45, o: [], t: ['pop', 'vegan', 'gf'], al: [], kcal: 2 },
  { id: 'herbal', cat: 'tea', p: 85, o: [], t: ['vegan', 'gf', 'nocaf', 'light'], al: [], kcal: 2 },
  { id: 'hotchoc', cat: 'tea', p: 140, o: ['size', 'milk'], t: ['veg', 'gf', 'sweet', 'nocaf', 'kids'], al: ['milk'], kcal: 320 },
  { id: 'sahlep', cat: 'tea', p: 130, o: [], t: ['veg', 'sweet', 'nocaf'], al: ['milk', 'nuts'], kcal: 240 },

  { id: 'croissant', cat: 'breakfast', p: 95, o: [], t: ['veg'], al: ['gluten', 'milk', 'egg'], kcal: 280 },
  { id: 'avotoast', cat: 'breakfast', p: 290, o: ['egg'], t: ['pop', 'vegan', 'light'], al: ['gluten'], kcal: 410 },
  { id: 'benedict', cat: 'breakfast', p: 320, o: [], t: [], al: ['gluten', 'egg', 'milk'], kcal: 620 },
  { id: 'menemen', cat: 'breakfast', p: 240, o: [], t: ['pop', 'veg'], al: ['egg', 'gluten'], kcal: 390 },
  { id: 'pancakes', cat: 'breakfast', p: 260, o: [], t: ['veg', 'sweet', 'kids'], al: ['gluten', 'milk', 'egg'], kcal: 540 },
  { id: 'granola', cat: 'breakfast', p: 220, o: [], t: ['veg', 'light'], al: ['milk', 'nuts', 'gluten'], kcal: 380 },

  { id: 'club', cat: 'food', p: 310, o: [], t: ['pop'], al: ['gluten', 'egg', 'milk'], kcal: 690 },
  { id: 'caesar', cat: 'food', p: 330, o: [], t: ['light'], al: ['gluten', 'egg', 'milk'], kcal: 480 },
  { id: 'halloumi', cat: 'food', p: 300, o: [], t: ['new', 'veg', 'gf', 'light'], al: ['milk'], kcal: 520 },
  { id: 'toastie', cat: 'food', p: 180, o: [], t: ['veg', 'kids'], al: ['gluten', 'milk'], kcal: 430 },

  { id: 'cheesecake', cat: 'sweets', p: 195, o: [], t: ['pop', 'veg', 'gf', 'sweet'], al: ['milk', 'egg'], kcal: 420 },
  { id: 'tiramisu', cat: 'sweets', p: 190, o: [], t: ['veg', 'sweet'], al: ['milk', 'egg', 'gluten'], kcal: 450 },
  { id: 'brownie', cat: 'sweets', p: 170, o: [], t: ['veg', 'sweet', 'kids'], al: ['gluten', 'milk', 'egg', 'nuts'], kcal: 520 },
  { id: 'cinnamon', cat: 'sweets', p: 120, o: [], t: ['new', 'veg', 'sweet'], al: ['gluten', 'milk', 'egg'], kcal: 380 },
  { id: 'baklava', cat: 'sweets', p: 210, o: [], t: ['veg', 'sweet'], al: ['gluten', 'nuts', 'milk'], kcal: 460 },
];

/* "goes well with" suggestions in the item sheet */
const PAIR = {
  espresso: 'baklava', americano: 'croissant', cappuccino: 'croissant', latte: 'cinnamon', flatwhite: 'brownie',
  mocha: 'cheesecake', turkish: 'baklava', filter: 'cheesecake', icedlatte: 'brownie', coldbrew: 'avotoast',
  frappe: 'brownie', matcha: 'granola', juice: 'pancakes', lemonade: 'club', smoothie: 'granola', water: 'halloumi',
  tea: 'menemen', herbal: 'cinnamon', hotchoc: 'pancakes', sahlep: 'baklava', croissant: 'cappuccino',
  avotoast: 'juice', benedict: 'flatwhite', menemen: 'tea', pancakes: 'latte', granola: 'matcha', club: 'lemonade',
  caesar: 'lemonade', halloumi: 'icedlatte', toastie: 'tea', cheesecake: 'filter', tiramisu: 'espresso',
  brownie: 'icedlatte', cinnamon: 'latte', baklava: 'turkish',
};

/* logo mark: a cup with an olive leaf rising like steam */
const MARK = '<svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="24" fill="#2B2118"/><path d="M13.5 22h19v5a9.5 9.5 0 0 1-19 0z" fill="#F5ECDD"/><path d="M32.4 24h1.9a3.4 3.4 0 0 1 0 6.8h-2.7" fill="none" stroke="#F5ECDD" stroke-width="2.2"/><path d="M21.2 19.6c1.2-5.6 6-9.3 12.8-9.6-.9 6.4-5.7 10.3-12.8 9.6z" fill="#A3B163"/><path d="M21.6 19.3c2.8-2.9 5.6-5 9.2-6.6" stroke="#2B2118" stroke-width=".9" fill="none"/><circle cx="17.4" cy="16.4" r="2.7" fill="#6E7D3A"/></svg>';
