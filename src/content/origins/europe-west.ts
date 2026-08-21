import type { OriginPage } from "@/lib/origins/types";

// German, French (Europe), Italian, Dutch, Portuguese (Portugal is folded into
// the Brazilian page's sibling — see iberia-latam.ts).
//
// The shared European problem is the opposite of the Asian one: order is
// broadly right, but two details are inverted — the postal code sits BEFORE the
// city, and the house number comes AFTER the street name. Both are wrong in
// Canada, and both look correct enough that senders do not notice.

export const de: OriginPage = {
  id: "germany-de",
  lang: "de",
  hreflang: "de",
  slug: "brief-nach-kanada-senden",
  market: "Germany, Austria, Switzerland",

  title: "Brief nach Kanada senden: so geht's (2026)",
  description:
    "Wie man eine kanadische Adresse richtig schreibt, wie die Postleitzahl aufgebaut ist und was passiert, wenn der Brief nicht zugestellt werden kann.",
  keywords: ["Brief nach Kanada", "kanadische Adresse schreiben", "Postleitzahl Kanada", "Post nach Kanada"],

  lede:
    "Es gibt zwei Wege, einen Brief nach Kanada zu schicken: als internationale Sendung über die Deutsche Post, oder über einen Dienst, der den Brief direkt in Kanada druckt und als Inlandspost aufgibt. In beiden Fällen ist der häufigste Fehler derselbe — die Adresse.",

  addressProblem:
    "Zwei Gewohnheiten stehen im Weg. Erstens steht die Postleitzahl im deutschsprachigen Raum vor dem Ort („10115 Berlin”), in Kanada dagegen ganz am Ende der Zeile, nach der Provinz. Zweitens folgt die Hausnummer bei uns dem Straßennamen („Hauptstraße 5”), in Kanada steht sie davor („5 Main St”). Beides sieht auf den ersten Blick richtig aus, und genau deshalb fällt es niemandem auf.",

  localExample: {
    label: "Deutsches Format",
    lines: ["Herrn Thomas Müller", "Hauptstraße 5", "10115 Berlin", "Deutschland"],
  },
  canadianExample: {
    label: "Kanadisches Format",
    lines: ["THOMAS MUELLER", "5 MAIN ST W", "OTTAWA ON  K1P 5J6", "CANADA"],
  },

  conversionSteps: [
    "Hausnummer vor den Straßennamen setzen: aus „Hauptstraße 5” wird „5 Main St”.",
    "Wohnungsnummer mit Bindestrich voranstellen — 12-350, nicht in eine eigene Zeile.",
    "Ort, zweibuchstabiges Provinzkürzel und Postleitzahl in eine Zeile.",
    "Die Provinz nie ausschreiben: ON statt Ontario, QC statt Quebec, BC statt British Columbia.",
    "Umlaute auflösen: ä wird ae, ö wird oe, ü wird ue, ß wird ss.",
  ],

  scriptNote:
    "Lateinische Schrift ist bereits gegeben, aber Umlaute und das ß können von kanadischen Lesegeräten falsch erkannt werden. Schreiben Sie Müller als MUELLER. Im Brieftext selbst spielt das keine Rolle.",

  diaspora:
    "Deutschsprachige leben in Kanada vor allem im Raum Toronto und Kitchener-Waterloo — letzteres mit einer langen deutschen Siedlungsgeschichte —, außerdem in Vancouver und Calgary. Adressen in diesen Regionen enthalten häufig eine Wohnungsnummer.",

  transit:
    "Ein internationaler Brief aus Deutschland braucht in der Regel eine bis zwei Wochen. Ein innerhalb Kanadas aufgegebener Brief benötigt laut Canada Post drei bis sieben Werktage.",

  returnWarning:
    "Wichtig: Wenn wir den Brief für Sie versenden, wird er in Kanada gedruckt und als kanadische Inlandspost aufgegeben — die Absenderadresse liegt aber in Deutschland. Ist die kanadische Adresse falsch, kann der Brief nicht zurückgeschickt werden, denn internationales Rückporto wurde nie bezahlt. Nach den eigenen Bestimmungen von Canada Post wird solche Post geöffnet und vernichtet, wenn sie keinen erkennbaren Wert hat. Eine Benachrichtigung erhalten Sie nicht. Prüfen Sie die Adresse deshalb zweimal.",

  faq: [
    {
      q: "Wohin gehört die Postleitzahl?",
      a: "Ans Ende der Ortszeile, nach dem Provinzkürzel: „OTTAWA ON  K1P 5J6”. Nicht davor, wie im deutschen Format.",
    },
    {
      q: "Wie ist eine kanadische Postleitzahl aufgebaut?",
      a: "Sechs Zeichen, abwechselnd Buchstabe und Ziffer, mit einem Leerzeichen in der Mitte: A1A 1A1. Sie ist Pflicht, nicht optional.",
    },
    {
      q: "Gibt es eine Sendungsverfolgung?",
      a: "Bei normaler Briefpost nicht. Wer einen Zustellnachweis braucht, benötigt Registered Mail, und die kann nur an einem Schalter in Kanada aufgegeben werden.",
    },
  ],

  ui: {
    addressHeading: "So schreibt man eine kanadische Adresse",
    stepsHeading: "Deutsche Adresse ins kanadische Format bringen",
    localLabel: "Deutsches Format",
    canadaLabel: "Kanadisches Format",
    scriptHeading: "Sonderzeichen",
    deliveryHeading: "Wie lange es dauert",
    warningHeading: "Wenn der Brief nicht ankommt",
    faqHeading: "Häufige Fragen",
    ctaTitle: "Brief nach Kanada senden",
    ctaBody:
      "Brief schreiben oder hochladen, kanadische Adresse eingeben — wir drucken in Kanada und geben bei Canada Post auf. Ab 3,79 CAD, Druck und Steuern inklusive.",
    ctaButton: "Brief senden",
    hubLink: "Alle Länder",
    otherLanguages: "Andere Sprachen",
  },
};

export const fr: OriginPage = {
  id: "france-fr",
  lang: "fr",
  hreflang: "fr",
  slug: "envoyer-une-lettre-au-canada",
  market: "France, Belgium, Switzerland, Cameroon",

  title: "Envoyer une lettre au Canada : le guide (2026)",
  description:
    "Comment écrire correctement une adresse canadienne, le format du code postal, et ce qui se passe si la lettre ne peut pas être distribuée.",
  keywords: ["envoyer une lettre au Canada", "adresse canadienne", "code postal canadien", "courrier vers le Canada"],

  lede:
    "Deux possibilités pour envoyer une lettre au Canada : le courrier international via La Poste, ou un service qui imprime la lettre au Canada et la poste comme courrier intérieur. Dans les deux cas, l'erreur la plus fréquente est la même — l'adresse.",

  addressProblem:
    "Deux habitudes françaises posent problème. Le code postal se place avant la commune (« 75001 Paris »), alors qu'au Canada il vient en fin de ligne, après la province. Et le numéro précède bien la voie en France, ce qui tombe juste — mais la mention du complément d'adresse (bâtiment, escalier, appartement) sur une ligne séparée, elle, n'a pas d'équivalent : au Canada le numéro d'appartement se colle au numéro de voie avec un trait d'union.",

  localExample: {
    label: "Format français",
    lines: ["Monsieur Jean Dupont", "Bâtiment C, Appartement 12", "5 rue de la République", "75011 Paris", "France"],
  },
  canadianExample: {
    label: "Format canadien",
    lines: ["JEAN DUPONT", "12-5 RUE SAINTE-CATHERINE O", "MONTREAL QC  H3B 1A7", "CANADA"],
  },

  conversionSteps: [
    "Fusionnez l'appartement avec le numéro de voie, séparés par un trait d'union — 12-5.",
    "Supprimez la ligne « Bâtiment » : elle n'a pas d'équivalent canadien.",
    "Ville, code de province à deux lettres et code postal sur une seule ligne.",
    "N'écrivez jamais la province en toutes lettres : QC et non Québec, ON et non Ontario.",
    "Le code postal canadien se place en dernier sur cette ligne, jamais devant la ville.",
  ],

  diaspora:
    "Au Canada, les francophones d'origine française, belge, suisse et camerounaise se concentrent à Montréal et dans sa région, à Québec, à Ottawa-Gatineau et à Moncton. À noter : au Québec, les adresses s'écrivent en français, mais la structure reste canadienne — l'ordre et le code postal ne changent pas.",

  transit:
    "Une lettre internationale depuis la France met généralement une à deux semaines. Une lettre postée depuis le Canada met de trois à sept jours ouvrables selon Postes Canada.",

  returnWarning:
    "Point important : lorsque nous envoyons la lettre pour vous, elle est imprimée au Canada et postée comme courrier intérieur canadien, alors que l'adresse de retour se trouve en France. Si l'adresse canadienne est erronée, la lettre ne peut pas vous être renvoyée — l'affranchissement de retour international n'a jamais été payé. Selon les propres règles de Postes Canada, ce courrier est ouvert puis détruit s'il n'a pas de valeur apparente. Vous ne recevrez aucun avis. Vérifiez donc l'adresse deux fois avant l'envoi.",

  faq: [
    {
      q: "Où placer le code postal ?",
      a: "En fin de ligne, après le code de province : « MONTREAL QC  H3B 1A7 ». Jamais devant la ville comme en France.",
    },
    {
      q: "À quoi ressemble un code postal canadien ?",
      a: "Six caractères alternant lettre et chiffre, avec une espace au milieu : A1A 1A1. Il est obligatoire.",
    },
    {
      q: "La lettre est-elle suivie ?",
      a: "Le courrier ordinaire n'offre aucun suivi. S'il vous faut une preuve de réception, il faut le courrier recommandé, qui ne peut être déposé que dans un bureau de poste au Canada.",
    },
  ],

  ui: {
    addressHeading: "Comment écrire une adresse canadienne",
    stepsHeading: "Convertir une adresse française au format canadien",
    localLabel: "Format français",
    canadaLabel: "Format canadien",
    scriptHeading: "Caractères",
    deliveryHeading: "Délais",
    warningHeading: "Si la lettre n'arrive pas",
    faqHeading: "Questions fréquentes",
    ctaTitle: "Envoyer une lettre au Canada",
    ctaBody:
      "Rédigez ou téléversez votre lettre, ajoutez l'adresse canadienne : nous l'imprimons au Canada et la postons via Postes Canada. À partir de 3,79 $ CA, impression et taxes comprises.",
    ctaButton: "Envoyer une lettre",
    hubLink: "Tous les pays",
    otherLanguages: "Autres langues",
  },
};

export const it: OriginPage = {
  id: "italy-it",
  lang: "it",
  hreflang: "it",
  slug: "spedire-una-lettera-in-canada",
  market: "Italy",

  title: "Come spedire una lettera in Canada (2026)",
  description:
    "Come si scrive correttamente un indirizzo canadese, com'è fatto il codice postale e cosa succede se la lettera non può essere recapitata.",
  keywords: ["spedire lettera in Canada", "indirizzo canadese", "codice postale Canada", "posta per il Canada"],

  lede:
    "Ci sono due modi per spedire una lettera in Canada dall'Italia: la posta internazionale di Poste Italiane, oppure un servizio che stampa la lettera direttamente in Canada e la imbuca come posta interna. In entrambi i casi l'errore più comune è lo stesso — l'indirizzo.",

  addressProblem:
    "In Italia il CAP precede il comune e la provincia si indica tra parentesi con due lettere (« 20121 Milano (MI) »). In Canada la logica è simile ma l'ordine è invertito: prima la città, poi la sigla della provincia, poi il codice postale, tutto sulla stessa riga e senza parentesi. Anche il numero civico cambia posto: in Italia segue la via, in Canada la precede.",

  localExample: {
    label: "Formato italiano",
    lines: ["Sig. Marco Rossi", "Via Roma 15, Scala B, Interno 7", "20121 Milano (MI)", "Italia"],
  },
  canadianExample: {
    label: "Formato canadese",
    lines: ["MARCO ROSSI", "7-15 COLLEGE ST", "TORONTO ON  M5G 1K2", "CANADA"],
  },

  conversionSteps: [
    "Il numero civico va prima del nome della via: da « Via Roma 15 » a « 15 College St ».",
    "L'interno si unisce al civico con un trattino — 7-15. La scala si omette.",
    "Città, sigla della provincia e codice postale sulla stessa riga, senza parentesi.",
    "Mai scrivere la provincia per esteso: ON e non Ontario, QC e non Quebec.",
    "Ultima riga: solo CANADA, in maiuscolo.",
  ],

  diaspora:
    "La comunità italiana in Canada è tra le più radicate del paese: Toronto (Woodbridge, Vaughan), Montréal (Saint-Léonard, Rivière-des-Prairies) e Hamilton. Molti indirizzi in queste zone includono il numero di interno.",

  transit:
    "Una lettera internazionale da Poste Italiane impiega di norma una o due settimane. Una lettera imbucata all'interno del Canada impiega dai tre ai sette giorni lavorativi secondo Canada Post.",

  returnWarning:
    "Attenzione a questo punto: quando spediamo noi per conto vostro, la lettera viene stampata in Canada e imbucata come posta interna canadese, mentre l'indirizzo del mittente è in Italia. Se l'indirizzo canadese è sbagliato, la lettera non può essere restituita — l'affrancatura di ritorno internazionale non è mai stata pagata. Secondo le norme di Canada Post, questa posta viene aperta e distrutta se non ha un valore evidente. Non riceverete alcun avviso.",

  faq: [
    {
      q: "Dove va il CAP canadese?",
      a: "Alla fine della riga della città, dopo la sigla della provincia: « TORONTO ON  M5G 1K2 ». Non prima della città come in Italia.",
    },
    {
      q: "Com'è fatto un codice postale canadese?",
      a: "Sei caratteri, lettera e cifra alternate, con uno spazio in mezzo: A1A 1A1. È obbligatorio.",
    },
    {
      q: "C'è la tracciabilità?",
      a: "La posta ordinaria non è tracciata. Se serve la prova di consegna occorre la raccomandata, che si può spedire solo da un ufficio postale in Canada.",
    },
  ],

  ui: {
    addressHeading: "Come si scrive un indirizzo canadese",
    stepsHeading: "Convertire un indirizzo italiano nel formato canadese",
    localLabel: "Formato italiano",
    canadaLabel: "Formato canadese",
    scriptHeading: "Caratteri",
    deliveryHeading: "Quanto tempo serve",
    warningHeading: "Se la lettera non arriva",
    faqHeading: "Domande frequenti",
    ctaTitle: "Spedisci una lettera in Canada",
    ctaBody:
      "Scrivi o carica la lettera, inserisci l'indirizzo canadese: la stampiamo in Canada e la spediamo con Canada Post. Da 3,79 CAD, stampa e tasse incluse.",
    ctaButton: "Spedisci la lettera",
    hubLink: "Tutti i paesi",
    otherLanguages: "Altre lingue",
  },
};

export const nl: OriginPage = {
  id: "netherlands-nl",
  lang: "nl",
  hreflang: "nl",
  slug: "brief-naar-canada-sturen",
  market: "Netherlands, Belgium",

  title: "Een brief naar Canada sturen (2026)",
  description:
    "Hoe je een Canadees adres correct schrijft, hoe de postcode is opgebouwd en wat er gebeurt als de brief niet bezorgd kan worden.",
  keywords: ["brief naar Canada", "Canadees adres schrijven", "postcode Canada", "post naar Canada"],

  lede:
    "Er zijn twee manieren om vanuit Nederland of België een brief naar Canada te sturen: internationale post via PostNL of bpost, of een dienst die de brief in Canada zelf print en als binnenlandse post verstuurt. In beide gevallen is de meest gemaakte fout dezelfde — het adres.",

  addressProblem:
    "De Nederlandse postcode staat vóór de plaatsnaam en heeft een eigen vorm: vier cijfers, een spatie, twee letters (« 1012 AB Amsterdam »). De Canadese postcode lijkt er oppervlakkig op — ook letters en cijfers — maar staat achteraan, ná de provincieafkorting, en wisselt letter en cijfer af: M5H 2N2. Daarnaast komt het huisnummer in Canada vóór de straatnaam.",

  localExample: {
    label: "Nederlands formaat",
    lines: ["Dhr. Jan de Vries", "Keizersgracht 123-B", "1015 CJ Amsterdam", "Nederland"],
  },
  canadianExample: {
    label: "Canadees formaat",
    lines: ["JAN DE VRIES", "B-123 QUEEN ST W", "TORONTO ON  M5H 2N2", "CANADA"],
  },

  conversionSteps: [
    "Huisnummer vóór de straatnaam zetten: van « Keizersgracht 123 » naar « 123 Queen St ».",
    "Toevoeging (bijvoorbeeld B) vooraan met een streepje — B-123.",
    "Plaats, tweeletterige provinciecode en postcode op één regel.",
    "Provincie nooit voluit: ON in plaats van Ontario, BC in plaats van British Columbia.",
    "Laatste regel: alleen CANADA, in hoofdletters.",
  ],

  diaspora:
    "De Nederlandse gemeenschap in Canada is grotendeels van naoorlogse komaf en zit vooral in Zuid-Ontario (Chatham, Sarnia, de regio Toronto), Alberta en British Columbia. Veel adressen daar hebben een unitnummer.",

  transit:
    "Een internationale brief vanuit Nederland doet er meestal één tot twee weken over. Een brief die binnen Canada op de post gaat, doet er volgens Canada Post drie tot zeven werkdagen over.",

  returnWarning:
    "Belangrijk: als wij de brief namens u versturen, wordt hij in Canada geprint en als Canadese binnenlandse post verzonden, terwijl het retouradres in Nederland ligt. Klopt het Canadese adres niet, dan kan de brief niet worden teruggestuurd — internationale retourporto is nooit betaald. Volgens de eigen regels van Canada Post wordt zulke post geopend en vernietigd als er geen duidelijke waarde in zit. U krijgt daarvan geen bericht.",

  faq: [
    {
      q: "Waar staat de Canadese postcode?",
      a: "Achteraan op de plaatsregel, ná de provincieafkorting: « TORONTO ON  M5H 2N2 ». Niet ervoor, zoals in Nederland.",
    },
    {
      q: "Hoe ziet een Canadese postcode eruit?",
      a: "Zes tekens, afwisselend letter en cijfer, met een spatie ertussen: A1A 1A1. Anders dan het Nederlandse 1234 AB.",
    },
    {
      q: "Is er track and trace?",
      a: "Gewone brievenpost heeft geen tracking. Voor een bewijs van bezorging is Registered Mail nodig, en dat kan alleen bij een postkantoor in Canada.",
    },
  ],

  ui: {
    addressHeading: "Zo schrijf je een Canadees adres",
    stepsHeading: "Een Nederlands adres omzetten naar Canadees formaat",
    localLabel: "Nederlands formaat",
    canadaLabel: "Canadees formaat",
    scriptHeading: "Tekens",
    deliveryHeading: "Hoe lang het duurt",
    warningHeading: "Als de brief niet aankomt",
    faqHeading: "Veelgestelde vragen",
    ctaTitle: "Stuur een brief naar Canada",
    ctaBody:
      "Schrijf of upload je brief, vul het Canadese adres in — wij printen in Canada en versturen via Canada Post. Vanaf 3,79 CAD, print en belasting inbegrepen.",
    ctaButton: "Brief versturen",
    hubLink: "Alle landen",
    otherLanguages: "Andere talen",
  },
};
