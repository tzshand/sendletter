import type { OriginPage } from "@/lib/origins/types";

// Amharic, Tigrinya, Somali, plus an English page for Nigeria.
//
// Eritrea was Canada's #6 immigration source in 2025 and Cameroon #3, which is
// why Tigrinya is here at all despite being a language nobody on our side can
// verify. All three of the Horn of Africa pages are flagged reviewNeeded.
//
// These origins share a genuinely distinct problem from the European and Asian
// sets: postal addressing is often nominal at home — P.O. boxes rather than
// street delivery, and no habit of postal codes at all — so the useful content
// is less "reorder your address" and more "Canada requires fields you have
// never had to write".

export const am: OriginPage = {
  id: "ethiopia-am",
  lang: "am",
  hreflang: "am",
  slug: "wede-canada-debdabe-melakit",
  market: "Ethiopia",
  reviewNeeded: true,

  title: "ወደ ካናዳ ደብዳቤ እንዴት መላክ ይቻላል (2026)",
  description:
    "የካናዳ አድራሻን በትክክል የመጻፍ መንገድ፣ የፖስታ ኮድ አጻጻፍ፣ እና ደብዳቤው ካልደረሰ ምን እንደሚሆን።",
  keywords: ["ወደ ካናዳ ደብዳቤ", "የካናዳ አድራሻ", "የካናዳ ፖስታ ኮድ", "ካናዳ ፖስታ"],

  lede:
    "ወደ ካናዳ ደብዳቤ ለመላክ ሁለት መንገዶች አሉ፦ በኢትዮጵያ ፖስታ በኩል ዓለም አቀፍ ፖስታ መላክ፣ ወይም ደብዳቤውን በካናዳ ውስጥ አትሞ እንደ የአገር ውስጥ ፖስታ የሚልክ አገልግሎት መጠቀም። በሁለቱም ውስጥ በጣም የተለመደው ስህተት አንድ ነው — አድራሻው።",

  addressProblem:
    "በኢትዮጵያ አድራሻ ብዙውን ጊዜ የፖስታ ሳጥን ቁጥር እና ክፍለ ከተማ ይይዛል፣ የፖስታ ኮድ ግን አይጠቀምም። በካናዳ ግን የፖስታ ኮድ ግዴታ ነው፦ ፊደልና ቁጥር እየተቀያየሩ ስድስት ቁምፊ — ለምሳሌ M5H 2N2። ካናዳ ፖስት በመጀመሪያ የሚያነበው ይህንኑ መስመር ነው። ደግሞም በካናዳ የቤት ቁጥር ከመንገዱ ስም በፊት ይጻፋል።",

  localExample: {
    label: "የኢትዮጵያ አጻጻፍ",
    lines: ["አቶ አበበ በቀለ", "ቦሌ ክፍለ ከተማ፣ ወረዳ 03", "ፖ.ሳ.ቁ. 1234", "አዲስ አበባ", "ኢትዮጵያ"],
  },
  canadianExample: {
    label: "የካናዳ አጻጻፍ",
    lines: ["ABEBE BEKELE", "12-1450 JANE ST", "TORONTO ON  M9N 2R9", "CANADA"],
  },

  conversionSteps: [
    "የክፍለ ከተማና የወረዳ መስመሮችን ያስወግዱ — በካናዳ ተመሳሳይ ነገር የለም።",
    "የአፓርታማ ቁጥር ከሕንፃ ቁጥር በፊት፣ በሰረዝ ተያይዞ — 12-1450።",
    "የቤት ቁጥር ከመንገዱ ስም በፊት ይምጣ።",
    "ከተማ፣ የሁለት ፊደል የክፍለ ሀገር ኮድ እና የፖስታ ኮድ በአንድ መስመር ላይ።",
    "አድራሻውን በሙሉ በላቲን ፊደል ይጻፉ።",
  ],

  scriptNote:
    "አድራሻው በላቲን ፊደል መጻፍ አለበት። የካናዳ ፖስት መደርደሪያ ማሽኖች የግዕዝ ፊደልን አያነቡም። የደብዳቤው ውስጠኛ ጽሑፍ በአማርኛ ሊሆን ይችላል፤ ገደቡ የሚመለከተው ፖስታው ላይ ያለውን አድራሻ ብቻ ነው።",

  diaspora:
    "በካናዳ ያለው የኢትዮጵያ ማኅበረሰብ በዋናነት በቶሮንቶ (በተለይ በዌስተን እና ላውረንስ ሃይትስ አካባቢ)፣ በኦታዋ፣ በካልጋሪ እና በኤድመንተን ይገኛል። በእነዚህ አካባቢዎች አድራሻዎች ብዙውን ጊዜ የክፍል ቁጥር አላቸው።",

  transit:
    "ዓለም አቀፍ ፖስታ ብዙውን ጊዜ ከሁለት እስከ አራት ሳምንት ይወስዳል። ከካናዳ ውስጥ የተላከ ደብዳቤ በካናዳ ፖስት መሠረት ከሦስት እስከ ሰባት የሥራ ቀናት ይወስዳል።",

  returnWarning:
    "ይህ በጣም አስፈላጊ ነው፦ በእርስዎ ስም ደብዳቤ ስንልክ፣ ደብዳቤው በካናዳ ታትሞ እንደ የካናዳ የአገር ውስጥ ፖስታ ይላካል፤ የመመለሻ አድራሻው ግን በኢትዮጵያ ነው። የካናዳው አድራሻ ስህተት ከሆነ ደብዳቤው ሊመለስ አይችልም — ዓለም አቀፍ የመመለሻ ክፍያ ተከፍሎ አያውቅምና። በካናዳ ፖስት ደንብ መሠረት እንዲህ ያለው ፖስታ ተከፍቶ ግልጽ ዋጋ ከሌለው ይወገዳል። ምንም ማሳወቂያ አይደርስዎትም።",

  faq: [
    {
      q: "አድራሻውን በአማርኛ መጻፍ እችላለሁ?",
      a: "አይቻልም። የካናዳ ፖስት ማሽኖች የግዕዝ ፊደልን አያነቡም። አድራሻው በላቲን ፊደል መሆን አለበት።",
    },
    {
      q: "የካናዳ ፖስታ ኮድ ምን ይመስላል?",
      a: "ስድስት ቁምፊ፣ ፊደልና ቁጥር እየተቀያየሩ፣ በመካከል አንድ ክፍተት፦ A1A 1A1። ግዴታ ነው።",
    },
    {
      q: "ደብዳቤው ክትትል አለው?",
      a: "ተራ የደብዳቤ ፖስታ ክትትል የለውም። የመድረስ ማረጋገጫ ከፈለጉ የተመዘገበ ፖስታ ያስፈልጋል፤ ይህም ከካናዳ ፖስታ ቤት ብቻ ይላካል።",
    },
  ],

  ui: {
    addressHeading: "የካናዳ አድራሻ እንዴት እንደሚጻፍ",
    stepsHeading: "የኢትዮጵያ አድራሻን ወደ የካናዳ አጻጻፍ መቀየር",
    localLabel: "የኢትዮጵያ አጻጻፍ",
    canadaLabel: "የካናዳ አጻጻፍ",
    scriptHeading: "ፊደል",
    deliveryHeading: "ምን ያህል ጊዜ ይወስዳል",
    warningHeading: "ደብዳቤው ካልደረሰ",
    faqHeading: "ተደጋጋሚ ጥያቄዎች",
    ctaTitle: "ወደ ካናዳ ደብዳቤ ይላኩ",
    ctaBody:
      "ደብዳቤዎን ይጻፉ ወይም ይስቀሉ፣ የካናዳ አድራሻ ያስገቡ — በካናዳ አትመን በካናዳ ፖስት እንልካለን። ከ3.79 CAD ጀምሮ፣ ኅትመትና ግብር ተካትቷል።",
    ctaButton: "ደብዳቤ ላክ",
    hubLink: "ሁሉም አገሮች",
    otherLanguages: "ሌሎች ቋንቋዎች",
  },
};

export const ti: OriginPage = {
  id: "eritrea-ti",
  lang: "ti",
  hreflang: "ti",
  slug: "nab-canada-debdabe-milak",
  market: "Eritrea",
  reviewNeeded: true,

  title: "ናብ ካናዳ ደብዳበ ከመይ ይለአኽ (2026)",
  description: "ናይ ካናዳ አድራሻ ብትኽክል ናይ ምጽሓፍ መንገዲ፣ ናይ ፖስታ ኮድ አጻጽሓፋ፣ ደብዳበ እንተዘይበጺሑ እንታይ ከም ዝኸውን።",
  keywords: ["ናብ ካናዳ ደብዳበ", "ናይ ካናዳ አድራሻ", "ናይ ካናዳ ፖስታ ኮድ"],

  lede:
    "ናብ ካናዳ ደብዳበ ንምልኣኽ ክልተ መንገድታት አለዉ፦ ብዓለምለኸ ፖስታ ምልኣኽ፣ ወይ ነቲ ደብዳበ ኣብ ውሽጢ ካናዳ ኣትሒዙ ከም ናይ ውሽጢ ሃገር ፖስታ ዝልእኽ ኣገልግሎት ምጥቃም። ኣብ ክልቲኡ እቲ ዝበዝሐ ጌጋ ሓደ እዩ — እቲ ኣድራሻ።",

  addressProblem:
    "ኣብ ኤርትራ ኣድራሻ መብዛሕትኡ ግዜ ናይ ፖስታ ሳጹን ቁጽሪ እዩ ዝሓቁፍ፣ ናይ ፖስታ ኮድ ግን ኣይጥቀምን። ኣብ ካናዳ ግን ናይ ፖስታ ኮድ ግዴታ እዩ፦ ፊደልን ቁጽርን እናተቐያየሩ ሽዱሽተ ቁምፊ — ንኣብነት M5H 2N2። ካናዳ ፖስት ቅድሚ ኩሉ ነዚ መስመር እያ እተንብብ።",

  localExample: {
    label: "ናይ ኤርትራ አጻጽሓፋ",
    lines: ["ኣቶ ተስፋይ ገብረ", "ፖ.ሳ.ቁ. 456", "ኣስመራ", "ኤርትራ"],
  },
  canadianExample: {
    label: "ናይ ካናዳ አጻጽሓፋ",
    lines: ["TESFAY GEBRE", "8-2900 EGLINTON AVE W", "TORONTO ON  M6M 1V1", "CANADA"],
  },

  conversionSteps: [
    "ናይ ፖስታ ሳጹን ቁጽሪ ኣይጠቅምን — ኣብ ካናዳ ናይ ጎደና ኣድራሻ የድሊ።",
    "ናይ ኣፓርታማ ቁጽሪ ቅድሚ ናይ ህንጻ ቁጽሪ፣ ብሰረዝ ተኣሳሲሩ — 8-2900።",
    "ናይ ገዛ ቁጽሪ ቅድሚ ስም ጎደና ይምጻእ።",
    "ከተማ፣ ናይ ክልል ናይ ክልተ ፊደል ኮድን ናይ ፖስታ ኮድን ኣብ ሓደ መስመር።",
    "ኩሉ ኣድራሻ ብላቲን ፊደል ይጸሓፍ።",
  ],

  scriptNote:
    "እቲ ኣድራሻ ብላቲን ፊደል ክጽሓፍ ኣለዎ። ናይ ካናዳ ፖስት መመደቢ ማሽናት ናይ ግእዝ ፊደል ኣየንብባን። ውሽጢ እቲ ደብዳበ ግን ብትግርኛ ክኸውን ይኽእል እዩ።",

  diaspora:
    "ኣብ ካናዳ ዘሎ ኤርትራዊ ማሕበረሰብ ብቐንዱ ኣብ ቶሮንቶ፣ ካልጋሪ፣ ኤድመንተንን ዊኒፐግን ይርከብ። ኣብዞም ከባቢታት ዘለዉ ኣድራሻታት መብዛሕትኦም ናይ ክፍሊ ቁጽሪ ኣለዎም።",

  transit:
    "ዓለምለኸ ፖስታ መብዛሕትኡ ግዜ ካብ ክልተ ክሳብ ኣርባዕተ ሰሙን ይወስድ። ካብ ውሽጢ ካናዳ እተላእከ ደብዳበ ብመሰረት ካናዳ ፖስት ካብ ሰለስተ ክሳብ ሸውዓተ ናይ ስራሕ መዓልትታት ይወስድ።",

  returnWarning:
    "እዚ ኣገዳሲ እዩ፦ ብስምኩም ደብዳበ ክንልእኽ ከለና፣ እቲ ደብዳበ ኣብ ካናዳ ተሓቲሙ ከም ናይ ካናዳ ውሽጢ ሃገር ፖስታ ይለኣኽ፣ እቲ መመለሲ ኣድራሻ ግን ኣብ ኤርትራ እዩ። እቲ ናይ ካናዳ ኣድራሻ ጌጋ እንተኾይኑ እቲ ደብዳበ ክምለስ ኣይክእልን — ዓለምለኸ ናይ መመለሲ ክፍሊት ፈጺሙ ኣይተኸፍለን። ብመሰረት ናይ ካናዳ ፖስት ሕጊ ከምዚ ዓይነት ፖስታ ተኸፊቱ ንጹር ዋጋ እንተዘይብሉ ይጠፍእ። ዝኾነ ሓበሬታ ኣይክመጸኩምን።",

  faq: [
    {
      q: "ኣድራሻ ብትግርኛ ክጽሕፍ እኽእል ድየ?",
      a: "ኣይክኣልን። ናይ ካናዳ ፖስት ማሽናት ናይ ግእዝ ፊደል ኣየንብባን። ኣድራሻ ብላቲን ፊደል ክኸውን ኣለዎ።",
    },
    {
      q: "ናይ ካናዳ ፖስታ ኮድ ከመይ ይመስል?",
      a: "ሽዱሽተ ቁምፊ፣ ፊደልን ቁጽርን እናተቐያየሩ፣ ኣብ ማእከል ሓደ ክፍተት፦ A1A 1A1። ግዴታ እዩ።",
    },
    {
      q: "እቲ ደብዳበ ምክትታል ኣለዎ ድዩ?",
      a: "ተራ ናይ ደብዳበ ፖስታ ምክትታል የብሉን። ናይ ምብጻሕ መረጋገጺ እንተደሊኹም እተመዝገበ ፖስታ የድሊ፣ ንሱ ድማ ካብ ካናዳ ጥራይ ይለኣኽ።",
    },
  ],

  ui: {
    addressHeading: "ናይ ካናዳ ኣድራሻ ከመይ ይጸሓፍ",
    stepsHeading: "ናይ ኤርትራ ኣድራሻ ናብ ናይ ካናዳ ኣጻጽሓፋ ምቕያር",
    localLabel: "ናይ ኤርትራ ኣጻጽሓፋ",
    canadaLabel: "ናይ ካናዳ ኣጻጽሓፋ",
    scriptHeading: "ፊደል",
    deliveryHeading: "ክንደይ ግዜ ይወስድ",
    warningHeading: "ደብዳበ እንተዘይበጺሑ",
    faqHeading: "ተደጋገምቲ ሕቶታት",
    ctaTitle: "ናብ ካናዳ ደብዳበ ልኣኽ",
    ctaBody:
      "ደብዳበኹም ጽሓፉ ወይ ስቐሉ፣ ናይ ካናዳ ኣድራሻ ኣእትዉ — ኣብ ካናዳ ሓቲምና ብካናዳ ፖስት ንልእኾ። ካብ 3.79 CAD ጀሚሩ።",
    ctaButton: "ደብዳበ ልኣኽ",
    hubLink: "ኩለን ሃገራት",
    otherLanguages: "ካልኦት ቋንቋታት",
  },
};

export const so: OriginPage = {
  id: "somalia-so",
  lang: "so",
  hreflang: "so",
  slug: "sida-loo-diro-warqad-canada",
  market: "Somalia",
  reviewNeeded: true,

  title: "Sida loo diro warqad Canada (2026)",
  description:
    "Sida si sax ah loo qoro cinwaanka Kanadiyaanka ah, qaabka koodhka boostada, iyo waxa dhaca haddii warqadda la gaarsiin waayo.",
  keywords: ["dir warqad Canada", "cinwaanka Canada", "koodhka boostada Canada", "boosta Canada"],

  lede:
    "Waxaa jira laba siyaabood oo warqad Canada loogu diri karo: boosta caalamiga ah, ama adeeg warqadda ku daabaca gudaha Canada oo u diro sida boosta gudaha. Labadaba, khaladka ugu badan waa isku mid — cinwaanka.",

  addressProblem:
    "Soomaaliya, cinwaannada badanaa ma laha koodh boosta oo la isticmaalo, waxaana caadi ah in la isticmaalo sanduuqa boosta. Canada waa lidkeeda: koodhka boostada waa qasab, wuxuuna ka kooban yahay lix xaraf oo xaraf iyo lambar isku beddelaya — sida M5H 2N2. Kanada Post waxay ugu horrayn akhridaa sadarkaas.",

  localExample: {
    label: "Qaabka Soomaaliya",
    lines: ["Mudane Cabdi Xasan", "Sanduuqa Boosta 1234", "Waaberi, Muqdisho", "Soomaaliya"],
  },
  canadianExample: {
    label: "Qaabka Canada",
    lines: ["ABDI HASSAN", "410-1615 DIXON RD", "ETOBICOKE ON  M9P 3T2", "CANADA"],
  },

  conversionSteps: [
    "Sanduuqa boosta ma shaqeeyo — Canada waxaa loo baahan yahay cinwaan waddo dhab ah.",
    "Lambarka guriga ka hor lambarka dhismaha, oo jajab ku xiran — 410-1615.",
    "Lambarka dhismaha wuxuu ka horreeyaa magaca waddada.",
    "Magaalada, koodhka gobolka ee laba xaraf, iyo koodhka boostada isku sadar ku qor.",
    "Cinwaanka oo dhan ku qor xarfaha Laatiinka.",
  ],

  diaspora:
    "Bulshada Soomaalida ee Canada waxay ku badan tahay Toronto (gaar ahaan Etobicoke iyo Rexdale), Ottawa, Edmonton iyo Calgary. Cinwaannada meelahaas badanaa waxay leeyihiin lambar unug, oo ka tegistiisu waa sabab caadi ah oo warqaddu ku lumo.",

  transit:
    "Boosta caalamiga ah caadi ahaan waxay qaadataa laba ilaa afar toddobaad. Warqad laga diro gudaha Canada waxay qaadataa saddex ilaa toddoba maalmood oo shaqo sida Canada Post sheegtay.",

  returnWarning:
    "Tani waa muhiim: marka aan warqadda kuu dirno, waxaa lagu daabacaa Canada waxaana loo diraa sida boosta gudaha Canada, halka cinwaanka soo celinta uu ku yaal Soomaaliya. Haddii cinwaanka Canada uu khaldan yahay, warqadda lama soo celin karo — lacagta soo celinta caalamiga ah waligeed lama bixin. Sida ay sharciyada Canada Post qabaan, boosta noocaas ah waa la furaa, haddii aysan lahayn qiimo cad waa la burburiyaa. Wax ogeysiis ah lama soo dirayo.",

  faq: [
    {
      q: "Ma isticmaali karaa sanduuqa boosta?",
      a: "Maya. Adeeggan wuxuu u baahan yahay cinwaan waddo dhab ah oo leh lambar guri iyo koodh boosta.",
    },
    {
      q: "Sidee bay u eg tahay koodhka boostada Canada?",
      a: "Lix xaraf, xaraf iyo lambar isku beddelaya, oo boos u dhexeeya: A1A 1A1. Waa qasab.",
    },
    {
      q: "Warqadda ma la raad raaci karaa?",
      a: "Boosta caadiga ah raad raac ma laha. Haddii aad u baahan tahay caddayn gaarsiin, waxaa loo baahan yahay boosta diiwaangashan, taas oo kaliya laga diri karo xafiis boosta oo Canada ku yaal.",
    },
  ],

  ui: {
    addressHeading: "Sida loo qoro cinwaanka Canada",
    stepsHeading: "U beddelidda cinwaanka Soomaaliya qaabka Canada",
    localLabel: "Qaabka Soomaaliya",
    canadaLabel: "Qaabka Canada",
    scriptHeading: "Xarfaha",
    deliveryHeading: "Intee in le'eg ayay qaadanaysaa",
    warningHeading: "Haddii warqadda la gaarsiin waayo",
    faqHeading: "Su'aalaha inta badan la weydiiyo",
    ctaTitle: "Dir warqad Canada",
    ctaBody:
      "Qor ama soo geli warqaddaada, ku dar cinwaanka Canada — waxaan ku daabacaynaa Canada oo aan ku dirnaa Canada Post. Laga bilaabo 3.79 CAD.",
    ctaButton: "Dir warqadda",
    hubLink: "Dhammaan wadamada",
    otherLanguages: "Luqado kale",
  },
};

// Nigeria was Canada's #5 immigration source in 2025 and is Anglophone — it
// needs a country page, not a new language. The address problem here is the
// absence of a postcode habit rather than a conflicting one.
export const enNg: OriginPage = {
  id: "nigeria-en",
  lang: "en",
  hreflang: "en",
  slug: "mail-a-letter-to-canada-from-nigeria",
  market: "Nigeria",

  title: "How to Mail a Letter to Canada From Nigeria (2026)",
  description:
    "Canadian addresses require a postal code and a two-letter province — two fields Nigerian senders rarely write. Here is the format, and what happens if it goes wrong.",
  keywords: [
    "mail a letter to canada from nigeria",
    "canadian address format",
    "send letter nigeria to canada",
    "canada postal code",
  ],

  lede:
    "Two options: international post through NIPOST, or a service that prints your letter inside Canada and mails it domestically. The failure mode is the same either way, and it is not the one most senders expect — it is the postal code.",

  addressProblem:
    "Nigerian addresses work perfectly well without a postcode. NIPOST issues six-digit codes, but almost nobody writes them, and delivery does not depend on them. Canada is the opposite: the postal code is the first thing the sorting machine reads, and an address without one is handled by exception — slowly, if at all. The province abbreviation is the second field you will not be used to writing.",

  localExample: {
    label: "Nigerian format",
    lines: ["Mr. Chinedu Okafor", "15 Awolowo Road, Ikoyi", "Lagos", "Nigeria"],
  },
  canadianExample: {
    label: "Canadian format",
    lines: ["CHINEDU OKAFOR", "22-140 ERIN MILLS PKWY", "MISSISSAUGA ON  L5A 3P2", "CANADA"],
  },

  conversionSteps: [
    "Find the postal code before you send. It is mandatory and it is the field that actually routes the letter.",
    "Put the unit or apartment number before the building number with a hyphen — 22-140.",
    "City, two-letter province code and postal code all go on one line.",
    "Never spell the province out: ON, not Ontario. AB, not Alberta.",
    "Last line is CANADA, on its own, in capitals.",
  ],

  diaspora:
    "Nigerian communities in Canada are concentrated in the Greater Toronto Area (Brampton, Mississauga, Scarborough), Calgary, Edmonton and Winnipeg. Apartment living is common in these areas, so the unit number is usually part of the address — leaving it off is a frequent cause of non-delivery.",

  transit:
    "International post from Nigeria typically takes two to four weeks, sometimes longer. A letter posted inside Canada takes three to seven business days according to Canada Post.",

  returnWarning:
    "This matters more here than most places: when we send on your behalf, the letter is printed in Canada and posted as Canadian domestic mail, while the return address is in Nigeria. If the Canadian address is wrong, the letter cannot be returned to you — international return postage was never paid. Under Canada Post's own rules such mail is opened and destroyed if it has no obvious value. You will get no notification. Since the postal code is the field most likely to be missing or guessed, confirm it with the recipient before sending.",

  faq: [
    {
      q: "What if I don't know the postal code?",
      a: "Ask the recipient. Do not guess — a wrong postal code routes the letter to the wrong sorting area, and unlike a missing house number there is no human who can correct it.",
    },
    {
      q: "What does a Canadian postal code look like?",
      a: "Six characters alternating letter and number, with a space in the middle: A1A 1A1. It is not six digits like a NIPOST code.",
    },
    {
      q: "Is the letter tracked?",
      a: "Ordinary lettermail has no tracking. If you need proof of delivery you need Registered Mail, which can only be lodged at a post office counter in Canada.",
    },
  ],

  ui: {
    addressHeading: "How to write a Canadian address",
    stepsHeading: "Converting a Nigerian address to Canadian format",
    localLabel: "Nigerian format",
    canadaLabel: "Canadian format",
    scriptHeading: "Characters",
    deliveryHeading: "How long it takes",
    warningHeading: "If the letter can't be delivered",
    faqHeading: "Frequently asked questions",
    ctaTitle: "Send a letter to Canada",
    ctaBody:
      "Write or upload your letter, add the Canadian address, and we print it in Canada and mail it via Canada Post. From $3.79 CAD, printing and tax included.",
    ctaButton: "Send a letter",
    hubLink: "All countries",
    otherLanguages: "Other languages",
  },
};
