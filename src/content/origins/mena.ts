import type { OriginPage } from "@/lib/origins/types";

// Arabic, Persian, Turkish.
//
// Arabic and Persian are RTL: the whole envelope has to flip direction, which
// is a bigger conceptual jump than transliteration alone. Turkish is Latin
// script already, so its problem is different and narrower — the dotless ı,
// and the mahalle/sokak structure.

export const ar: OriginPage = {
  id: "mena-ar",
  lang: "ar",
  hreflang: "ar",
  slug: "kayfa-tursil-risala-ila-kanada",
  dir: "rtl",
  market: "Arabic-speaking countries",

  title: "كيف ترسل رسالة إلى كندا (2026)",
  description:
    "طريقة كتابة العنوان الكندي بشكل صحيح، وشكل الرمز البريدي، وماذا يحدث إذا تعذّر تسليم الرسالة.",
  keywords: ["إرسال رسالة إلى كندا", "العنوان في كندا", "الرمز البريدي الكندي", "البريد إلى كندا"],

  lede:
    "هناك طريقتان لإرسال رسالة إلى كندا: البريد الدولي عبر هيئة البريد في بلدك، أو خدمة تطبع الرسالة داخل كندا وترسلها كبريد محلي. وفي الحالتين، الخطأ الأكثر شيوعًا واحد — العنوان.",

  addressProblem:
    "تُكتب العناوين العربية من اليمين إلى اليسار، وكثير من الدول العربية لا تستخدم الرموز البريدية أصلًا أو تستخدمها بشكل اختياري. في كندا الأمر مختلف تمامًا: العنوان يُكتب من اليسار إلى اليمين بالحروف اللاتينية، والرمز البريدي إلزامي ويتكوّن من حرف ورقم بالتناوب — مثل M5H 2N2. هذا السطر هو أول ما تقرأه آلات الفرز الكندية.",

  localExample: {
    label: "الشكل المحلي",
    lines: ["السيد أحمد الحسن", "شارع الحمرا، بناية النور، الطابق الثالث", "منطقة المزرعة", "بيروت", "لبنان"],
  },
  canadianExample: {
    label: "الشكل الكندي",
    lines: ["AHMAD AL-HASSAN", "304-2900 STEELES AVE W", "CONCORD ON  L4K 3S8", "CANADA"],
  },

  conversionSteps: [
    "اكتب العنوان بالحروف اللاتينية ومن اليسار إلى اليمين بالكامل.",
    "ضع رقم الشقة قبل رقم المبنى وافصل بينهما بشرطة — 304-2900.",
    "اجمع المدينة ورمز المقاطعة المكوّن من حرفين والرمز البريدي في سطر واحد.",
    "استخدم اختصار المقاطعة: ON لأونتاريو، QC لكيبيك، AB لألبرتا.",
    "اكتب CANADA وحدها في السطر الأخير بحروف كبيرة.",
  ],

  scriptNote:
    "هذه أهم نقطة: العنوان على الظرف يجب أن يكون بالحروف اللاتينية ومن اليسار إلى اليمين. آلات الفرز في كندا لا تقرأ الحرف العربي، والعنوان المكتوب بالعربية سيُعالَج يدويًا في أفضل الأحوال، وقد لا يصل إطلاقًا. أما نصّ الرسالة نفسه فيمكن أن يكون بالعربية دون أي مشكلة.",

  diaspora:
    "الجاليات العربية في كندا تتركّز في مونتريال (خصوصًا الجالية اللبنانية والسورية والمغاربية)، وفي تورونتو ومنطقتها (ميسيساغا، سكاربورو)، وفي أوتاوا وإدمونتون. عناوين هذه المناطق غالبًا ما تتضمّن رقم شقة، وإغفاله سبب متكرر لعدم وصول البريد.",

  transit:
    "يستغرق البريد الدولي عادة من أسبوعين إلى أربعة أسابيع، وقد يزيد حسب بلد المصدر. أما الرسالة المرسلة من داخل كندا فتستغرق من ثلاثة إلى سبعة أيام عمل بحسب هيئة البريد الكندية.",

  returnWarning:
    "انتبه لهذه النقطة: عندما نرسل الرسالة نيابة عنك، تُطبع في كندا وتُرسل كبريد محلي كندي، بينما يكون عنوان المُرسِل في بلدك. إذا كان العنوان الكندي خاطئًا، فلا يمكن إعادة الرسالة إليك — لأن أجرة الإعادة الدولية لم تُدفع أصلًا. ووفقًا لأنظمة هيئة البريد الكندية نفسها، تُفتح هذه الرسائل وتُتلف إن لم تكن لها قيمة ظاهرة. ولن تصلك أي إشعار بذلك. لذا تحقّق من العنوان مرتين قبل الإرسال.",

  faq: [
    {
      q: "هل يمكنني كتابة العنوان بالعربية؟",
      a: "لا. آلات الفرز الكندية لا تقرأ الحرف العربي. يجب كتابة العنوان بالحروف اللاتينية ومن اليسار إلى اليمين.",
    },
    {
      q: "ما شكل الرمز البريدي الكندي؟",
      a: "ستة رموز، حرف ورقم بالتناوب، وبينها مسافة واحدة: A1A 1A1. وهو إلزامي وليس اختياريًا.",
    },
    {
      q: "هل يمكن تتبّع الرسالة؟",
      a: "البريد العادي لا يوفّر تتبّعًا. إذا كنت بحاجة إلى إثبات التسليم فعليك بالبريد المسجّل، ولا يمكن إرساله إلا من مكتب بريد داخل كندا.",
    },
  ],

  ui: {
    addressHeading: "كيف تكتب العنوان الكندي",
    stepsHeading: "تحويل العنوان المحلي إلى الشكل الكندي",
    localLabel: "الشكل المحلي",
    canadaLabel: "الشكل الكندي",
    scriptHeading: "الحروف واتجاه الكتابة",
    deliveryHeading: "كم تستغرق",
    warningHeading: "إذا تعذّر التسليم",
    faqHeading: "أسئلة شائعة",
    ctaTitle: "أرسل رسالة إلى كندا",
    ctaBody:
      "اكتب رسالتك أو ارفعها، أضف العنوان الكندي، ونحن نطبعها في كندا ونرسلها عبر البريد الكندي. ابتداءً من 3.79 دولارًا كنديًا، شاملة الطباعة والضريبة.",
    ctaButton: "أرسل الرسالة",
    hubLink: "كل الدول",
    otherLanguages: "لغات أخرى",
  },
};

export const fa: OriginPage = {
  id: "iran-fa",
  lang: "fa",
  hreflang: "fa",
  slug: "ersal-name-be-canada",
  dir: "rtl",
  market: "Iran",

  title: "چگونه از ایران به کانادا نامه بفرستیم (۲۰۲۶)",
  description:
    "روش صحیح نوشتن نشانی کانادایی، قالب کد پستی، و اینکه اگر نامه تحویل داده نشود چه اتفاقی می‌افتد.",
  keywords: ["ارسال نامه به کانادا", "نشانی کانادا", "کد پستی کانادا", "پست از ایران به کانادا"],

  lede:
    "برای فرستادن نامه از ایران به کانادا دو راه وجود دارد: پست بین‌المللی از طریق شرکت پست ایران، یا سرویسی که نامه را داخل خود کانادا چاپ و به‌صورت پست داخلی ارسال می‌کند. در هر دو حالت، رایج‌ترین اشتباه یکی است — نشانی.",

  addressProblem:
    "نشانی فارسی از راست به چپ نوشته می‌شود و کد پستی ایران ده رقم است. در کانادا نشانی از چپ به راست و با حروف لاتین نوشته می‌شود، و کد پستی ترکیبی از حرف و عدد است — مانند M5H 2N2. این سطر نخستین چیزی است که دستگاه‌های تفکیک پست کانادا می‌خوانند.",

  localExample: {
    label: "قالب ایرانی",
    lines: ["جناب آقای رضا محمدی", "تهران، خیابان ولیعصر، کوچه شهید احمدی", "پلاک ۱۲، واحد ۵", "کد پستی ۱۴۳۴۸۷۳۱۵۱", "ایران"],
  },
  canadianExample: {
    label: "قالب کانادایی",
    lines: ["REZA MOHAMMADI", "5-1200 SHEPPARD AVE E", "NORTH YORK ON  M2K 2S5", "CANADA"],
  },

  conversionSteps: [
    "کل نشانی را با حروف لاتین و از چپ به راست بنویسید.",
    "شماره واحد را پیش از شماره ساختمان و با خط تیره بیاورید — 5-1200.",
    "شهر، کد دو حرفی استان و کد پستی را در یک سطر بنویسید.",
    "نام استان را کامل ننویسید: به‌جای Ontario بنویسید ON.",
    "در سطر آخر فقط CANADA با حروف بزرگ.",
  ],

  scriptNote:
    "نشانی روی پاکت باید با حروف لاتین و از چپ به راست باشد. دستگاه‌های پست کانادا خط فارسی را نمی‌خوانند. متن خود نامه می‌تواند به فارسی باشد؛ محدودیت فقط مربوط به نشانی روی پاکت است.",

  diaspora:
    "جامعه ایرانیان کانادا بیشتر در تورنتو و حومه (نورث یورک، ریچموندهیل، تورنهیل) و ونکوور بزرگ (نورث ونکوور، کوکیتلام) و مونترال متمرکز است. نشانی‌های این مناطق معمولاً شماره واحد دارند و جا انداختن آن از دلایل رایج نرسیدن نامه است.",

  transit:
    "پست بین‌المللی معمولاً دو تا چهار هفته زمان می‌برد. نامه‌ای که از داخل کانادا ارسال شود، بنا بر اعلام پست کانادا سه تا هفت روز کاری زمان می‌برد.",

  returnWarning:
    "این نکته مهم است: وقتی ما به نمایندگی از شما نامه می‌فرستیم، نامه در کانادا چاپ و به‌عنوان پست داخلی کانادا ارسال می‌شود، در حالی که نشانی بازگشت در ایران است. اگر نشانی کانادایی نادرست باشد، نامه قابل بازگشت نیست — هزینه بازگشت بین‌المللی هرگز پرداخت نشده است. طبق مقررات خود پست کانادا، چنین مرسولاتی باز می‌شوند و اگر ارزش آشکاری نداشته باشند از بین برده می‌شوند. هیچ اطلاعیه‌ای هم دریافت نخواهید کرد.",

  faq: [
    {
      q: "آیا می‌توانم نشانی را به فارسی بنویسم؟",
      a: "خیر. دستگاه‌های پست کانادا خط فارسی را نمی‌خوانند. نشانی باید با حروف لاتین نوشته شود.",
    },
    {
      q: "کد پستی کانادا چه شکلی است؟",
      a: "شش نویسه، حرف و عدد به‌تناوب، با یک فاصله در میان: A1A 1A1. برخلاف ایران ده رقمی نیست.",
    },
    {
      q: "آیا نامه رهگیری دارد؟",
      a: "پست نامه‌ای معمولی رهگیری ندارد. اگر به اثبات تحویل نیاز دارید باید از پست سفارشی استفاده کنید که فقط از باجه پست در کانادا ارسال می‌شود.",
    },
  ],

  ui: {
    addressHeading: "نوشتن نشانی کانادایی",
    stepsHeading: "تبدیل نشانی ایرانی به قالب کانادایی",
    localLabel: "قالب ایرانی",
    canadaLabel: "قالب کانادایی",
    scriptHeading: "خط و جهت نوشتار",
    deliveryHeading: "چقدر طول می‌کشد",
    warningHeading: "اگر نامه تحویل نشود",
    faqHeading: "پرسش‌های متداول",
    ctaTitle: "ارسال نامه به کانادا",
    ctaBody:
      "نامه را بنویسید یا بارگذاری کنید، نشانی کانادایی را وارد کنید، ما آن را در کانادا چاپ و با پست کانادا ارسال می‌کنیم. از ۳٫۷۹ دلار کانادا، با احتساب چاپ و مالیات.",
    ctaButton: "ارسال نامه",
    hubLink: "همه کشورها",
    otherLanguages: "زبان‌های دیگر",
  },
};

export const tr: OriginPage = {
  id: "turkey-tr",
  lang: "tr",
  hreflang: "tr",
  slug: "turkiyeden-kanadaya-mektup-gonderme",
  market: "Türkiye",

  title: "Türkiye'den Kanada'ya Mektup Nasıl Gönderilir (2026)",
  description:
    "Kanada adresinin doğru yazımı, posta kodu biçimi ve mektup teslim edilemezse ne olduğu.",
  keywords: ["Kanada'ya mektup göndermek", "Kanada adres yazımı", "Kanada posta kodu", "Türkiye'den Kanada'ya posta"],

  lede:
    "Türkiye'den Kanada'ya mektup göndermenin iki yolu var: PTT üzerinden uluslararası posta ya da mektubu doğrudan Kanada'da basıp yurt içi posta olarak gönderen bir hizmet. Her ikisinde de en sık yapılan hata aynı — adres.",

  addressProblem:
    "Türkiye'de adresler mahalle, cadde, sokak, kapı ve daire numarası sırasıyla yazılır ve posta kodu beş rakamdır. Kanada'da mahalle kavramının karşılığı yoktur ve posta kodu harf ile rakamın dönüşümlü geldiği altı karakterdir — M5H 2N2 gibi. Kanada Postası önce bu satırı okur.",

  localExample: {
    label: "Türkiye biçimi",
    lines: ["Sayın Mehmet Yılmaz", "Kültür Mahallesi, Atatürk Caddesi", "Gül Sokak No: 12, Daire: 5", "34710 Kadıköy / İstanbul", "Türkiye"],
  },
  canadianExample: {
    label: "Kanada biçimi",
    lines: ["MEHMET YILMAZ", "5-1250 BAYVIEW AVE", "TORONTO ON  M4G 3A5", "CANADA"],
  },

  conversionSteps: [
    "Mahalle satırını çıkarın. Kanada adres sisteminde karşılığı yoktur.",
    "Daire numarasını kapı numarasından önce, tire ile yazın — 5-1250.",
    "Şehir, iki harfli eyalet kodu ve posta kodunu aynı satıra koyun.",
    "Eyalet adını açık yazmayın: Ontario değil ON, Quebec değil QC.",
    "Türkçe karakterleri sadeleştirin: ı, ş, ğ, ü, ö, ç yerine i, s, g, u, o, c kullanın.",
  ],

  scriptNote:
    "Latin alfabesi kullandığınız için transliterasyon gerekmez, ancak Türkçeye özgü harfler sorun çıkarabilir. Özellikle noktasız ı harfi Kanada'daki tarama sistemlerinde yanlış okunabilir. Adresi sade Latin harfleriyle yazmak en güvenlisidir.",

  diaspora:
    "Kanada'daki Türk topluluğu ağırlıklı olarak Toronto ve çevresi ile Montreal'de yaşıyor. Bu bölgelerdeki adreslerde çoğu zaman daire numarası bulunur; onu atlamak mektubun ulaşmamasının yaygın nedenidir.",

  transit:
    "PTT üzerinden uluslararası mektup genellikle iki ila dört hafta sürer. Kanada içinden gönderilen bir mektup ise Kanada Postası'na göre üç ila yedi iş günü sürer.",

  returnWarning:
    "Bu önemli: sizin adınıza mektup gönderdiğimizde mektup Kanada'da basılır ve Kanada yurt içi postası olarak gönderilir, iade adresi ise Türkiye'dedir. Kanada adresi hatalıysa mektup size iade edilemez — uluslararası iade ücreti hiçbir zaman ödenmemiştir. Kanada Postası'nın kendi kurallarına göre bu tür gönderiler açılır ve belirgin bir değeri yoksa imha edilir. Size herhangi bir bildirim yapılmaz. Bu yüzden göndermeden önce adresi iki kez kontrol edin.",

  faq: [
    {
      q: "Mahalle bilgisini yazmalı mıyım?",
      a: "Hayır. Kanada'da mahalle kavramı yoktur; bu satır Kanada Postası için anlam taşımaz ve gereksiz karışıklık yaratır.",
    },
    {
      q: "Kanada posta kodu nasıl görünür?",
      a: "Altı karakter, harf ve rakam dönüşümlü, ortada bir boşluk: A1A 1A1. Türkiye'deki gibi beş rakam değildir.",
    },
    {
      q: "Mektup takip edilebilir mi?",
      a: "Normal mektup postasında takip yoktur. Teslim kanıtı gerekiyorsa taahhütlü posta gerekir ve bu yalnızca Kanada'daki bir postaneden gönderilebilir.",
    },
  ],

  ui: {
    addressHeading: "Kanada adresi nasıl yazılır",
    stepsHeading: "Türkiye adresini Kanada biçimine çevirmek",
    localLabel: "Türkiye biçimi",
    canadaLabel: "Kanada biçimi",
    scriptHeading: "Harfler",
    deliveryHeading: "Ne kadar sürer",
    warningHeading: "Mektup teslim edilemezse",
    faqHeading: "Sık sorulan sorular",
    ctaTitle: "Kanada'ya mektup gönderin",
    ctaBody:
      "Mektubu yazın veya yükleyin, Kanada adresini girin; biz Kanada'da basıp Kanada Postası ile gönderelim. 3,79 CAD'den başlayan fiyatlarla, baskı ve vergi dahil.",
    ctaButton: "Mektup gönder",
    hubLink: "Tüm ülkeler",
    otherLanguages: "Diğer diller",
  },
};
