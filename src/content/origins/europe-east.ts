import type { OriginPage } from "@/lib/origins/types";

// Russian, Ukrainian, Polish, Romanian.
//
// Russian and Ukrainian carry two problems at once: Cyrillic transliteration
// AND the Soviet-era large-to-small address order that is still taught. Polish
// and Romanian are Latin script, so their issue narrows to postal-code
// placement and diacritics.

export const ru: OriginPage = {
  id: "russia-ru",
  lang: "ru",
  hreflang: "ru",
  slug: "kak-otpravit-pismo-v-kanadu",
  market: "Russia and Russian-speaking countries",

  title: "Как отправить письмо в Канаду (2026)",
  description:
    "Как правильно написать канадский адрес, как устроен почтовый индекс и что происходит, если письмо невозможно доставить.",
  keywords: ["отправить письмо в Канаду", "канадский адрес", "почтовый индекс Канады", "почта в Канаду"],

  lede:
    "Отправить письмо в Канаду можно двумя способами: международным отправлением через Почту России, либо через сервис, который печатает письмо уже в Канаде и отправляет его как внутреннее. В обоих случаях чаще всего ошибаются в одном и том же — в адресе.",

  addressProblem:
    "Привычный порядок — от большего к меньшему: страна, область, город, улица, дом, квартира, фамилия. В Канаде порядок обратный: сначала имя получателя, в конце — страна. Кроме того, российский индекс состоит из шести цифр, а канадский чередует буквы и цифры — например M5H 2N2. Именно эту строку сортировочная машина читает первой.",

  localExample: {
    label: "Российский формат",
    lines: ["125009, Россия", "г. Москва", "ул. Тверская, д. 12, кв. 45", "Иванову Ивану Ивановичу"],
  },
  canadianExample: {
    label: "Канадский формат",
    lines: ["IVAN IVANOV", "45-12 BLOOR ST W", "TORONTO ON  M4W 1A8", "CANADA"],
  },

  conversionSteps: [
    "Полностью переверните порядок: первая строка — имя получателя, последняя — страна.",
    "Номер квартиры ставится перед номером дома через дефис — 45-12, а не «кв. 45» отдельной строкой.",
    "Город, двухбуквенный код провинции и почтовый индекс — в одной строке.",
    "Название провинции не пишется полностью: ON вместо Ontario, QC вместо Quebec.",
    "Весь адрес — латиницей. Кириллица на конверте недопустима.",
  ],

  scriptNote:
    "Адрес обязательно пишется латиницей. Сортировочное оборудование Canada Post не распознаёт кириллицу: письмо с кириллическим адресом уйдёт на ручную обработку, а скорее всего просто не дойдёт. Сам текст письма можно писать по-русски — ограничение касается только конверта.",

  diaspora:
    "Русскоязычная община в Канаде сосредоточена в Торонто (Норт-Йорк, Ричмонд-Хилл, Торнхилл), Ванкувере и Монреале. В адресах этих районов почти всегда есть номер квартиры, и его пропуск — частая причина недоставки.",

  transit:
    "Международное письмо обычно идёт от двух до четырёх недель, иногда дольше. Письмо, отправленное внутри Канады, по данным Canada Post идёт от трёх до семи рабочих дней.",

  returnWarning:
    "Важно понимать: когда мы отправляем письмо от вашего имени, оно печатается в Канаде и отправляется как внутреннее канадское, тогда как обратный адрес находится за пределами Канады. Если канадский адрес указан неверно, письмо невозможно вернуть — международный обратный тариф никто не оплачивал. По собственным правилам Canada Post такие отправления вскрывают и уничтожают, если в них нет очевидной ценности. Никакого уведомления вы не получите. Поэтому проверьте адрес дважды.",

  faq: [
    {
      q: "Можно написать адрес по-русски?",
      a: "Нет. Оборудование Canada Post не читает кириллицу. Адрес нужно писать латиницей.",
    },
    {
      q: "Как выглядит канадский индекс?",
      a: "Шесть символов, буквы и цифры чередуются, посередине пробел: A1A 1A1. Это не шесть цифр, как в России.",
    },
    {
      q: "Есть ли отслеживание?",
      a: "У обычного письма отслеживания нет. Если нужно подтверждение вручения, потребуется заказное письмо, а его можно отправить только из отделения в Канаде.",
    },
  ],

  ui: {
    addressHeading: "Как писать канадский адрес",
    stepsHeading: "Перевод российского адреса в канадский формат",
    localLabel: "Российский формат",
    canadaLabel: "Канадский формат",
    scriptHeading: "Письменность",
    deliveryHeading: "Сколько идёт письмо",
    warningHeading: "Если письмо не доставлено",
    faqHeading: "Частые вопросы",
    ctaTitle: "Отправить письмо в Канаду",
    ctaBody:
      "Напишите или загрузите письмо, укажите канадский адрес — мы напечатаем его в Канаде и отправим через Canada Post. От 3,49 CAD, печать и налог включены.",
    ctaButton: "Отправить письмо",
    hubLink: "Все страны",
    otherLanguages: "Другие языки",
  },
};

export const uk: OriginPage = {
  id: "ukraine-uk",
  lang: "uk",
  hreflang: "uk",
  slug: "yak-nadislaty-lyst-do-kanady",
  market: "Ukraine",

  title: "Як надіслати лист до Канади (2026)",
  description:
    "Як правильно написати канадську адресу, як влаштований поштовий індекс і що станеться, якщо лист неможливо доставити.",
  keywords: ["надіслати лист до Канади", "канадська адреса", "поштовий індекс Канади", "пошта до Канади"],

  lede:
    "Надіслати лист до Канади можна двома способами: міжнародним відправленням через Укрпошту або через сервіс, який друкує лист уже в Канаді й надсилає його як внутрішній. В обох випадках найчастіша помилка та сама — адреса.",

  addressProblem:
    "Звичний порядок — від більшого до меншого. У Канаді навпаки: спершу ім'я одержувача, наприкінці — країна. Український індекс складається з п'яти цифр, канадський чергує літери й цифри — наприклад M5H 2N2. Саме цей рядок машина зчитує першим.",

  localExample: {
    label: "Український формат",
    lines: ["01001, Україна", "м. Київ", "вул. Хрещатик, буд. 22, кв. 10", "Шевченку Тарасу Григоровичу"],
  },
  canadianExample: {
    label: "Канадський формат",
    lines: ["TARAS SHEVCHENKO", "10-22 ROBLIN BLVD", "WINNIPEG MB  R3R 0G3", "CANADA"],
  },

  conversionSteps: [
    "Переверніть порядок: перший рядок — ім'я одержувача, останній — країна.",
    "Номер квартири перед номером будинку через дефіс — 10-22.",
    "Місто, дволітерний код провінції та поштовий індекс — в одному рядку.",
    "Назву провінції не пишіть повністю: MB замість Manitoba, ON замість Ontario.",
    "Уся адреса — латиницею.",
  ],

  scriptNote:
    "Адресу обов'язково писати латиницею. Обладнання Canada Post не розпізнає кирилицю. Текст самого листа може бути українською — обмеження стосується лише конверта.",

  diaspora:
    "Українська громада в Канаді — одна з найбільших у світі й історично зосереджена у Вінніпезі, Едмонтоні, Саскатуні та Торонто. Саме тому в цьому переліку прикладом узято Вінніпег: у Манітобі індекси починаються з літери R.",

  transit:
    "Міжнародний лист зазвичай іде від двох до чотирьох тижнів. Лист, надісланий у межах Канади, за даними Canada Post іде від трьох до семи робочих днів.",

  returnWarning:
    "Важливо: коли ми надсилаємо лист від вашого імені, його друкують у Канаді й відправляють як внутрішній канадський, тоді як зворотна адреса — за межами Канади. Якщо канадська адреса хибна, лист повернути неможливо — міжнародний зворотний тариф ніхто не сплачував. За власними правилами Canada Post такі відправлення відкривають і знищують, якщо вони не мають очевидної цінності. Жодного повідомлення ви не отримаєте.",

  faq: [
    {
      q: "Чи можна писати адресу українською?",
      a: "Ні. Обладнання Canada Post не читає кирилицю. Адресу треба писати латиницею.",
    },
    {
      q: "Який вигляд має канадський індекс?",
      a: "Шість символів, літери й цифри чергуються, посередині пробіл: A1A 1A1. Це не п'ять цифр, як в Україні.",
    },
    {
      q: "Чи є відстеження?",
      a: "У звичайного листа відстеження немає. Для підтвердження вручення потрібен рекомендований лист, який можна відправити лише з відділення в Канаді.",
    },
  ],

  ui: {
    addressHeading: "Як писати канадську адресу",
    stepsHeading: "Переведення української адреси в канадський формат",
    localLabel: "Український формат",
    canadaLabel: "Канадський формат",
    scriptHeading: "Письмо",
    deliveryHeading: "Скільки йде лист",
    warningHeading: "Якщо лист не доставлено",
    faqHeading: "Часті запитання",
    ctaTitle: "Надіслати лист до Канади",
    ctaBody:
      "Напишіть або завантажте лист, вкажіть канадську адресу — ми надрукуємо його в Канаді й надішлемо через Canada Post. Від 3,49 CAD, друк і податок включені.",
    ctaButton: "Надіслати лист",
    hubLink: "Усі країни",
    otherLanguages: "Інші мови",
  },
};

export const pl: OriginPage = {
  id: "poland-pl",
  lang: "pl",
  hreflang: "pl",
  slug: "jak-wyslac-list-do-kanady",
  market: "Poland",

  title: "Jak wysłać list do Kanady (2026)",
  description:
    "Jak poprawnie zapisać kanadyjski adres, jak zbudowany jest kod pocztowy i co się dzieje, gdy listu nie da się doręczyć.",
  keywords: ["wysłać list do Kanady", "adres kanadyjski", "kod pocztowy Kanada", "poczta do Kanady"],

  lede:
    "List do Kanady można wysłać na dwa sposoby: przesyłką międzynarodową przez Pocztę Polską albo przez usługę, która drukuje list już w Kanadzie i nadaje go jako przesyłkę krajową. W obu przypadkach najczęstszy błąd jest ten sam — adres.",

  addressProblem:
    "W Polsce kod pocztowy stoi przed miejscowością („00-001 Warszawa”), a numer domu po nazwie ulicy („ul. Marszałkowska 15”). W Kanadzie jest odwrotnie w obu punktach: numer poprzedza nazwę ulicy, a kod pocztowy zamyka wiersz z miastem, po dwuliterowym skrócie prowincji. Sam kod też wygląda inaczej: zamiast 00-001 jest M5H 2N2.",

  localExample: {
    label: "Format polski",
    lines: ["Pan Piotr Kowalski", "ul. Marszałkowska 15 m. 8", "00-001 Warszawa", "Polska"],
  },
  canadianExample: {
    label: "Format kanadyjski",
    lines: ["PIOTR KOWALSKI", "8-15 RONCESVALLES AVE", "TORONTO ON  M6R 2K3", "CANADA"],
  },

  conversionSteps: [
    "Numer domu przed nazwą ulicy: z „Marszałkowska 15” na „15 Roncesvalles Ave”.",
    "Numer mieszkania z myślnikiem na początku — 8-15, zamiast „m. 8”.",
    "Miasto, dwuliterowy kod prowincji i kod pocztowy w jednym wierszu.",
    "Nigdy nie zapisuj prowincji w całości: ON zamiast Ontario, BC zamiast British Columbia.",
    "Usuń polskie znaki diakrytyczne: ł na l, ó na o, ż i ź na z, ą na a.",
  ],

  scriptNote:
    "Alfabet łaciński już jest, ale polskie znaki diakrytyczne bywają błędnie odczytywane przez kanadyjskie czytniki. Bezpieczniej zapisać adres bez ogonków i kresek. W treści listu nie ma to znaczenia.",

  diaspora:
    "Polonia w Kanadzie koncentruje się w Toronto (Roncesvalles — historyczna polska dzielnica), Mississaudze, Hamilton i Edmonton. W tych rejonach adresy często zawierają numer lokalu.",

  transit:
    "List międzynarodowy z Polski idzie zwykle od jednego do dwóch tygodni. List nadany na terenie Kanady idzie według Canada Post od trzech do siedmiu dni roboczych.",

  returnWarning:
    "To ważne: gdy wysyłamy list w Państwa imieniu, jest on drukowany w Kanadzie i nadawany jako kanadyjska przesyłka krajowa, natomiast adres zwrotny znajduje się w Polsce. Jeśli adres kanadyjski jest błędny, listu nie da się zwrócić — międzynarodowa opłata zwrotna nigdy nie została uiszczona. Zgodnie z własnymi przepisami Canada Post taka przesyłka jest otwierana i niszczona, jeśli nie ma oczywistej wartości. Nie otrzymają Państwo żadnego powiadomienia.",

  faq: [
    {
      q: "Gdzie wpisać kod pocztowy?",
      a: "Na końcu wiersza z miastem, po skrócie prowincji: „TORONTO ON  M6R 2K3”. Nie przed miastem, jak w Polsce.",
    },
    {
      q: "Jak wygląda kanadyjski kod pocztowy?",
      a: "Sześć znaków, litery i cyfry na przemian, ze spacją w środku: A1A 1A1. Nie jest to format 00-001.",
    },
    {
      q: "Czy list można śledzić?",
      a: "Zwykła przesyłka listowa nie ma śledzenia. Potwierdzenie doręczenia daje list polecony, który można nadać tylko w placówce w Kanadzie.",
    },
  ],

  ui: {
    addressHeading: "Jak zapisać kanadyjski adres",
    stepsHeading: "Zamiana polskiego adresu na format kanadyjski",
    localLabel: "Format polski",
    canadaLabel: "Format kanadyjski",
    scriptHeading: "Znaki",
    deliveryHeading: "Ile to trwa",
    warningHeading: "Jeśli list nie dotrze",
    faqHeading: "Częste pytania",
    ctaTitle: "Wyślij list do Kanady",
    ctaBody:
      "Napisz lub wgraj list, podaj adres w Kanadzie — wydrukujemy go w Kanadzie i nadamy przez Canada Post. Od 3,49 CAD, druk i podatek w cenie.",
    ctaButton: "Wyślij list",
    hubLink: "Wszystkie kraje",
    otherLanguages: "Inne języki",
  },
};

export const ro: OriginPage = {
  id: "romania-ro",
  lang: "ro",
  hreflang: "ro",
  slug: "cum-trimiti-o-scrisoare-in-canada",
  market: "Romania, Moldova",

  title: "Cum trimiți o scrisoare în Canada (2026)",
  description:
    "Cum se scrie corect o adresă canadiană, cum arată codul poștal și ce se întâmplă dacă scrisoarea nu poate fi livrată.",
  keywords: ["trimite scrisoare în Canada", "adresă canadiană", "cod poștal Canada", "poștă către Canada"],

  lede:
    "Sunt două moduri de a trimite o scrisoare în Canada: prin Poșta Română, ca trimitere internațională, sau printr-un serviciu care tipărește scrisoarea chiar în Canada și o expediază ca poștă internă. În ambele cazuri, cea mai frecventă greșeală este aceeași — adresa.",

  addressProblem:
    "În România adresa include blocul, scara, etajul și apartamentul, fiecare pe rândul său, iar codul poștal are șase cifre. În Canada nu există echivalent pentru bloc sau scară: numărul apartamentului se lipește de numărul clădirii cu o cratimă, iar codul poștal alternează litere și cifre — M5H 2N2 — și se pune la sfârșitul rândului cu orașul.",

  localExample: {
    label: "Format românesc",
    lines: ["Domnul Andrei Popescu", "Str. Victoriei nr. 25, Bl. A2, Sc. 1, Ap. 14", "Sector 1, București 010101", "România"],
  },
  canadianExample: {
    label: "Format canadian",
    lines: ["ANDREI POPESCU", "14-25 EGLINTON AVE E", "TORONTO ON  M4P 1A6", "CANADA"],
  },

  conversionSteps: [
    "Elimină blocul, scara și etajul — nu au corespondent în Canada.",
    "Apartamentul se pune înaintea numărului clădirii, cu cratimă — 14-25.",
    "Orașul, codul de două litere al provinciei și codul poștal, pe același rând.",
    "Nu scrie provincia în întregime: ON, nu Ontario; QC, nu Quebec.",
    "Renunță la diacritice: ș devine s, ț devine t, ă și â devin a.",
  ],

  scriptNote:
    "Alfabetul latin este deja folosit, dar diacriticele românești pot fi citite greșit de echipamentele canadiene. Scrie adresa fără diacritice. În textul scrisorii nu contează.",

  diaspora:
    "Comunitatea românească din Canada este concentrată în Toronto și zona metropolitană, în Montréal și în Kitchener-Waterloo. Multe adrese din aceste zone includ numărul apartamentului.",

  transit:
    "O scrisoare internațională din România ajunge de obicei în una-două săptămâni. O scrisoare expediată din interiorul Canadei durează, potrivit Canada Post, între trei și șapte zile lucrătoare.",

  returnWarning:
    "Important: când trimitem scrisoarea în numele dumneavoastră, ea este tipărită în Canada și expediată ca poștă internă canadiană, în timp ce adresa de retur este în România. Dacă adresa canadiană este greșită, scrisoarea nu poate fi returnată — tariful internațional de retur nu a fost plătit niciodată. Conform propriilor reguli ale Canada Post, o astfel de trimitere este deschisă și distrusă dacă nu are o valoare evidentă. Nu veți primi nicio notificare.",

  faq: [
    {
      q: "Trebuie să scriu blocul și scara?",
      a: "Nu. În Canada nu există aceste noțiuni. Doar numărul apartamentului contează, iar el se lipește de numărul clădirii cu o cratimă.",
    },
    {
      q: "Cum arată un cod poștal canadian?",
      a: "Șase caractere, literă și cifră alternativ, cu un spațiu la mijloc: A1A 1A1. Nu are șase cifre ca în România.",
    },
    {
      q: "Există urmărire pentru scrisoare?",
      a: "Scrisoarea obișnuită nu are urmărire. Pentru dovada livrării este nevoie de scrisoare recomandată, care se poate expedia doar dintr-un oficiu poștal din Canada.",
    },
  ],

  ui: {
    addressHeading: "Cum se scrie o adresă canadiană",
    stepsHeading: "Transformarea adresei românești în format canadian",
    localLabel: "Format românesc",
    canadaLabel: "Format canadian",
    scriptHeading: "Caractere",
    deliveryHeading: "Cât durează",
    warningHeading: "Dacă scrisoarea nu ajunge",
    faqHeading: "Întrebări frecvente",
    ctaTitle: "Trimite o scrisoare în Canada",
    ctaBody:
      "Scrie sau încarcă scrisoarea, adaugă adresa canadiană — o tipărim în Canada și o expediem prin Canada Post. De la 3,49 CAD, tipar și taxe incluse.",
    ctaButton: "Trimite scrisoarea",
    hubLink: "Toate țările",
    otherLanguages: "Alte limbi",
  },
};
