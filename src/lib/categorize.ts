export type Category =
  | "Groceries"
  | "Transport"
  | "Subscriptions"
  | "Transfers"
  | "Dining"
  | "Shopping"
  | "Insurance"
  | "Healthcare"
  | "Savings"
  | "Income"
  | "Housing"
  | "Fuel"
  | "Parking"
  | "Charity"
  | "Finance"
  | "Other";

interface Rule {
  category: Category;
  patterns: RegExp[];
}

const RULES: Rule[] = [
  {
    category: "Income",
    patterns: [
      /\blön\b/i,
      /\bsalary\b/i,
      /\bförsäkringskassan\b/i,
      /\ba-kassa\b/i,
      /\bpension\b/i,
      /\bersättning\b/i,
      /\bstipendium\b/i,
      /swish\s+mottagen/i,
      /\binkomst\b/i,
      /\bbarnbidrag\b/i,
      /\bföräldrapenning\b/i,
      /\bforaldrapenning\b/i,
      /\bsjukpenning\b/i,
      /\bstudiebidrag\b/i,
      /\baktivitetsstöd\b/i,
      /\baktivitetsstod\b/i,
      /\bskatteåterbäring\b/i,
      /\bskatteaterbaring\b/i,
      /\butdelning\b/i,
      /\bränteinkomst\b/i,
      /\branteinkomst\b/i,
    ],
  },
  {
    category: "Groceries",
    patterns: [
      /\bica\b/i,
      /\bcoop\b/i,
      /\bwillys\b/i,
      /\blidl\b/i,
      /\bhemköp\b/i,
      /\bhemkop\b/i,
      /\bmathem\b/i,
      /\bcity\s*gross\b/i,
      /\bnetto\b/i,
      /\baldi\b/i,
      /\bsaluhall\b/i,
      /\blivs\b/i,
      /\bmataffär\b/i,
      /\bsupermarket\b/i,
      /\bkvantum\b/i,
      /\bmaxi\b/i,
      /\bpris\s+nyckelkund\b/i,
      /\btempo\b/i,
      /\bcoop\s*extra\b/i,
      /\bcoop\s*forum\b/i,
      /\bica\s*nära\b/i,
      /\bica\s*nara\b/i,
      /\bmatöppet\b/i,
      /\bmatoppet\b/i,
      /\bdelitea\b/i,
      /\bmatsmart\b/i,
      /\bfoodora\s*market\b/i,
      /\bwolt\s*market\b/i,
    ],
  },
  {
    category: "Fuel",
    patterns: [
      /\bingo\b/i,
      /\bokq8\b/i,
      /\bpreem\b/i,
      /\bcircle\s*k\b/i,
      /\bst1\b/i,
      /\bshell\b/i,
      /\bq8\b/i,
      /\bbp\b/i,
      /\bdrivmedel\b/i,
      /\bbränsle\b/i,
      /\bbransle\b/i,
      /\bsupercharger\b/i,
      /\btesla\s*supercharger\b/i,
      /\bincharge\b/i,
      /\bmer\s*sweden\b/i,
    ],
  },
  {
    category: "Transport",
    patterns: [
      /\bsl\b/i,
      /\bvästtrafik\b/i,
      /\bvasttrafik\b/i,
      /\bskånetrafiken\b/i,
      /\bskanetrafiken\b/i,
      /\bsj\b/i,
      /\bflixbus\b/i,
      /\bflixtr/i,
      /\bresplus\b/i,
      /\bträngselskat\b/i,
      /\btrangselskat\b/i,
      /\buber\b/i,
      /\bbolt\b/i,
      /\btaxi\b/i,
      /\bkollektivtrafik\b/i,
      /\bbuss\b/i,
      /\btåg\b/i,
      /\btransportstyrel/i,
      /\btrafikverket\b/i,
      /\bab\s+storstockholm\b/i,
      /v.stra\s+g.talands/i,
      /\bk\*vr\s+resa\b/i,
      /\bmalartag\b/i,
      /\bmälartåg\b/i,
      /\bmtr\b/i,
      /\bsnalltaget\b/i,
      /\bsnälltåget\b/i,
      /\barlanda\s*express\b/i,
      /\bflygbussarna\b/i,
      /\bvoi\b/i,
      /\btier\b/i,
      /\blime\b/i,
      /\breskassa\b/i,
    ],
  },
  {
    category: "Parking",
    patterns: [
      /\bparkering\b/i,
      /\bparking\b/i,
      /\bparkster\b/i,
      /\beasypark\b/i,
      /\bparkway\b/i,
      /\bparkman\b/i,
      /\bhojab\b/i,
      /\baimopark\b/i,
      /\bapcoa\b/i,
      /\bmobill\b/i,
      /\bparkando\b/i,
    ],
  },
  {
    category: "Subscriptions",
    patterns: [
      /\bnetflix\b/i,
      /\bspotify\b/i,
      /\bamazon\s*prime\b/i,
      /\bhbo\b/i,
      /\bdisney\+/i,
      /\bdisney\s*plus\b/i,
      /\bviaplay\b/i,
      /\bapple\b/i,
      /\bgoogle\b/i,
      /\bmicrosoft\b/i,
      /\bwindsurf\b/i,
      /\bgithub\b/i,
      /\bdigital\s*ocean\b/i,
      /\btelefon\b/i,
      /\btelia\b/i,
      /\btelenor\b/i,
      /\bcomviq\b/i,
      /\bthree\b/i,
      /\bhallon\b/i,
      /\bcodeium\b/i,
      /\bvercel\b/i,
      /\bneon\.tech\b/i,
      /\bname-?cheap\b/i,
      /\breplit\b/i,
      /\bzoho\b/i,
      /\bopenart\b/i,
      /\bplaystation\b/i,
      /\bsteam\b/i,
      /\bif\s+metall\b/i,
      /\btele2\b/i,
      /\bbahnhof\b/i,
      /\bbredband2\b/i,
      /\bhalebop\b/i,
      /\btv4\s*play\b/i,
      /\bstorytel\b/i,
      /\bbookbeat\b/i,
      /\bnextory\b/i,
      /\bpodme\b/i,
      /\byoutube\s*premium\b/i,
      /\bicloud\b/i,
    ],
  },
  {
    category: "Dining",
    patterns: [
      /\bzettle\b/i,
      /\brestaurang\b/i,
      /\brestaurant\b/i,
      /\bcafé\b/i,
      /\bcafe\b/i,
      /\bkafé\b/i,
      /\bpizza\b/i,
      /\bsushi\b/i,
      /\bmcdonald/i,
      /\bburger\s*king\b/i,
      /\bmax\s*burger/i,
      /\bmax\s*burgers/i,
      /\bsubway\b/i,
      /\bkebab\b/i,
      /\bfalafel\b/i,
      /\bbar\b/i,
      /\bpub\b/i,
      /\bbistro\b/i,
      /\bkrog\b/i,
      /\bwok\b/i,
      /\bfoodora\b/i,
      /\bwolt\b/i,
      /\buber\s*eats\b/i,
      /\bespresso\s*house\b/i,
      /\bwaynes\b/i,
      /\bjoe\s*&\s*the\s*juice\b/i,
    ],
  },
  {
    category: "Shopping",
    patterns: [
      /\bamazon\b/i,
      /\bh&m\b/i,
      /\bzara\b/i,
      /\bikea\b/i,
      /\belgiganten\b/i,
      /\bkjell\b/i,
      /\bnormal\b/i,
      /\bkläder\b/i,
      /\bklader\b/i,
      /\bskor\b/i,
      /\bshop\b/i,
      /\bstore\b/i,
      /\bbutik\b/i,
      /\bonline\b/i,
      /\bmktplc\b/i,
      /\baliexpress\b/i,
      /\bebay\b/i,
      /\bkungsbac/i,
      /\bamazonmktplc\b/i,
      /\bamazonretail\b/i,
      /\bjula\b/i,
      /\bbiltema\b/i,
      /\bbauhaus\b/i,
      /\bnetonnet\b/i,
      /\bdollarstore\b/i,
      /\boob\b/i,
      /\bpressbyran\b/i,
      /\bpressbyrån\b/i,
      /\balibaba\b/i,
      /\bnordicwell\b/i,
      /\bk\*autodoc\b/i,
      /\bautodoc\b/i,
      /\bpaypal\b/i,
      /\bpaddle\.net\b/i,
      /\bclas\s*ohlson\b/i,
      /\bahlens\b/i,
      /\båhl[eé]ns\b/i,
      /\bxxl\b/i,
      /\bstadium\b/i,
      /\bmio\b/i,
      /\brusta\b/i,
    ],
  },
  {
    category: "Insurance",
    patterns: [
      /\bfolksam\b/i,
      /\bif\s+försäkring\b/i,
      /\btrygg-hansa\b/i,
      /\blänsförsäkring/i,
      /\blansforsakring/i,
      /\bforsakring\b/i,
      /\bförsäkring\b/i,
      /\binsurance\b/i,
      /\bdina\s*försäkringar\b/i,
      /\bdina\s*forsakringar\b/i,
      /\bmoderna\s*försäkringar\b/i,
      /\bmoderna\s*forsakringar\b/i,
    ],
  },
  {
    category: "Healthcare",
    patterns: [
      /\bapotek\b/i,
      /\b1177\b/i,
      /\btandläkare\b/i,
      /\btandlakare\b/i,
      /\bläkare\b/i,
      /\blakare\b/i,
      /\bvårdcentral\b/i,
      /\bvardcentral\b/i,
      /\bsjukhus\b/i,
      /\bhälsa\b/i,
      /\bhalsa\b/i,
      /\boptik\b/i,
      /\bglasögon\b/i,
      /\bglasogon\b/i,
      /\bapotek\s*hjärtat\b/i,
      /\bapotek\s*hjartat\b/i,
      /\bkronans\s*apotek\b/i,
      /\bapoteksgruppen\b/i,
      /\bapotea\b/i,
      /\bkry\b/i,
      /\bdoktor\.se\b/i,
      /\bmindler\b/i,
      /\bwerlabs\b/i,
    ],
  },
  {
    category: "Housing",
    patterns: [
      /\bhyra\b/i,
      /\bhyresvärd\b/i,
      /\bhyresavi\b/i,
      /\bbostad\b/i,
      /\bel\s+och\b/i,
      /\bel-\b/i,
      /\bvatten\b/i,
      /\bfjärrvärme\b/i,
      /\bfjarrvärme\b/i,
      /\bel\b/i,
      /\bvärme\b/i,
      /\binternet\b/i,
      /\bbrf\b/i,
      /\bhsb\b/i,
      /\bavgift\b/i,
      /\bsamfällighet\b/i,
      /\bsamfallighet\b/i,
      /\bvattenfall\b/i,
      /\be\.?on\b/i,
      /\bfortum\b/i,
      /\bellevio\b/i,
      /\benergibolag\b/i,
      /\bsophämtning\b/i,
      /\bsophamtning\b/i,
      /\brenhållning\b/i,
      /\brenhallning\b/i,
    ],
  },
  {
    category: "Savings",
    patterns: [
      /\bavanza\b/i,
      /\bnordnet\b/i,
      /\brobur\b/i,
      /\bsparkonto\b/i,
      /\bspar\b/i,
      /\binvestering\b/i,
      /\bfond\b/i,
      /\baktie\b/i,
      /\bkrypto\b/i,
      /\bcrypto\b/i,
      /\bbitcoin\b/i,
      /\bisk\b/i,
      /\bkapitalförsäkring\b/i,
      /\bkapitalforsakring\b/i,
      /\bamf\b/i,
      /\bskandia\b/i,
    ],
  },
  {
    category: "Charity",
    patterns: [
      /\bislamiska\b/i,
      /\bmoské\b/i,
      /\bmoske\b/i,
      /\bkyrka\b/i,
      /\bchurch\b/i,
      /\bmosque\b/i,
      /\bdonation\b/i,
      /\bgåva\b/i,
      /\bgava\b/i,
      /\bwestern\s*union\b/i,
      /\bremittance\b/i,
      /\bröda\s*korset\b/i,
      /\broda\s*korset\b/i,
      /\bunicef\b/i,
      /\brädda\s*barnen\b/i,
      /\bradda\s*barnen\b/i,
    ],
  },
  {
    category: "Transfers",
    patterns: [
      /swish\s+skickad/i,
      /\brevolut\b/i,
      /\bwise\b/i,
      /\btransfer\b/i,
      /\boverforin/i,
      /\böverföring\b/i,
      /\boverforing\b/i,
      /\böverföring\s+via\s+internet\b/i,
      /\boverforing\s+via\s+internet\b/i,
      /\bbankgiro\b/i,
      /\bplusgiro\b/i,
      /swish\s+betalning/i,
      /^\+46\d{9}$/,
      /^\d{10,12}$/,
    ],
  },
  {
    category: "Finance",
    patterns: [
      /\bresurs\s*bank\b/i,
      /\bresurs\b/i,
      /\bsantander\b/i,
      /\bavida\s*finans\b/i,
      /\briverty\b/i,
      /\bsvea\s*p-?service\b/i,
      /\bskattekonto\b/i,
      /\bcsn\b/i,
      /\bklarna\b/i,
      /\bqliro\b/i,
      /\bcollector\b/i,
      /\bbank\s*norwegian\b/i,
      /\bremember\b/i,
    ],
  },
];

const USER_OVERRIDES_KEY = "budget-category-overrides";

export function categorize(description: string): Category {
  const overrides = loadOverrides();
  const key = description.toLowerCase().trim();
  const normalizedDescription = description
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (overrides[key]) {
    return overrides[key] as Category;
  }

  for (const rule of RULES) {
    for (const pattern of rule.patterns) {
      if (pattern.test(description) || pattern.test(normalizedDescription)) {
        return rule.category;
      }
    }
  }
  return "Other";
}

export function saveOverride(description: string, category: Category): void {
  const overrides = loadOverrides();
  overrides[description.toLowerCase().trim()] = category;
  try {
    localStorage.setItem(USER_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // no-op
  }
}

export function loadOverrides(): Record<string, string> {
  try {
    const raw = localStorage.getItem(USER_OVERRIDES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export const ALL_CATEGORIES: Category[] = [
  "Groceries",
  "Transport",
  "Fuel",
  "Parking",
  "Subscriptions",
  "Dining",
  "Shopping",
  "Insurance",
  "Healthcare",
  "Housing",
  "Savings",
  "Income",
  "Transfers",
  "Charity",
  "Other",
];
