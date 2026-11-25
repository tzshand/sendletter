import type { OriginPage } from "@/lib/origins/types";

// Spanish and Portuguese.
//
// Both carry an administrative unit with no Canadian equivalent — the colonia
// in Mexico, the bairro in Brazil — which senders keep as an extra line. Both
// also put the postal code before the city.

export const es: OriginPage = {
  id: "latam-es",
  lang: "es",
  hreflang: "es",
  slug: "como-enviar-una-carta-a-canada",
  market: "Mexico, Latin America, Spain",

  title: "Cómo enviar una carta a Canadá (2026)",
  description:
    "Cómo escribir correctamente una dirección canadiense, cómo es el código postal y qué ocurre si la carta no se puede entregar.",
  keywords: ["enviar carta a Canadá", "dirección canadiense", "código postal Canadá", "correo a Canadá"],

  lede:
    "Hay dos formas de enviar una carta a Canadá: por correo internacional a través del servicio postal de tu país, o mediante un servicio que imprime la carta dentro de Canadá y la envía como correo nacional. En ambos casos, el error más común es el mismo — la dirección.",

  addressProblem:
    "Dos costumbres estorban. La colonia en México, o el barrio en otros países, no tienen equivalente en Canadá: escribirlos añade una línea que Canada Post no entiende. Y el código postal va antes de la ciudad en español, mientras que en Canadá cierra la línea, después de la provincia. Además el código canadiense no es numérico: alterna letra y número, como M5H 2N2.",

  localExample: {
    label: "Formato hispano",
    lines: ["Sr. Carlos Hernández", "Av. Insurgentes Sur 1234, Depto. 5", "Col. Del Valle", "03100 Ciudad de México, CDMX", "México"],
  },
  canadianExample: {
    label: "Formato canadiense",
    lines: ["CARLOS HERNANDEZ", "5-1234 ST CLAIR AVE W", "TORONTO ON  M6E 1B4", "CANADA"],
  },

  conversionSteps: [
    "Elimina la línea de la colonia o el barrio: no existe en el sistema canadiense.",
    "El número del departamento va antes del número del edificio, con guion — 5-1234.",
    "Ciudad, código de provincia de dos letras y código postal, todo en la misma línea.",
    "Nunca escribas la provincia completa: ON en lugar de Ontario, QC en lugar de Quebec.",
    "Quita los acentos y la eñe: Hernández se escribe HERNANDEZ, Muñoz se escribe MUNOZ.",
  ],

  scriptNote:
    "El alfabeto ya es latino, pero los acentos y la ñ pueden leerse mal en los equipos canadienses. Escribe la dirección sin tildes. Dentro de la carta puedes escribir con normalidad.",

  diaspora:
    "Las comunidades hispanohablantes en Canadá se concentran en Toronto, Montreal (con una fuerte presencia colombiana, mexicana y salvadoreña), Vancouver y Calgary. Muchas direcciones en estas ciudades incluyen número de unidad, y omitirlo es una causa habitual de no entrega.",

  transit:
    "Una carta internacional suele tardar de dos a cuatro semanas, según el país de origen. Una carta despachada dentro de Canadá tarda de tres a siete días hábiles según Canada Post.",

  returnWarning:
    "Esto es importante: cuando enviamos la carta en tu nombre, se imprime en Canadá y se despacha como correo nacional canadiense, mientras que la dirección de remitente está en tu país. Si la dirección canadiense es incorrecta, la carta no puede devolverse — nunca se pagó el franqueo de retorno internacional. Según las propias normas de Canada Post, ese correo se abre y se destruye si no tiene un valor evidente. No recibirás ningún aviso. Por eso conviene revisar la dirección dos veces antes de enviar.",

  faq: [
    {
      q: "¿Debo escribir la colonia o el barrio?",
      a: "No. En Canadá no existe esa división. Incluirla solo añade una línea que Canada Post no interpreta.",
    },
    {
      q: "¿Cómo es un código postal canadiense?",
      a: "Seis caracteres alternando letra y número, con un espacio en medio: A1A 1A1. No es numérico como el de México o España.",
    },
    {
      q: "¿La carta tiene seguimiento?",
      a: "El correo ordinario no tiene seguimiento. Si necesitas prueba de entrega, hace falta correo certificado, que solo puede despacharse desde una oficina postal en Canadá.",
    },
  ],

  ui: {
    addressHeading: "Cómo escribir una dirección canadiense",
    stepsHeading: "Convertir una dirección hispana al formato canadiense",
    localLabel: "Formato hispano",
    canadaLabel: "Formato canadiense",
    scriptHeading: "Caracteres",
    deliveryHeading: "Cuánto tarda",
    warningHeading: "Si la carta no llega",
    faqHeading: "Preguntas frecuentes",
    ctaTitle: "Envía una carta a Canadá",
    ctaBody:
      "Escribe o sube tu carta, añade la dirección canadiense: la imprimimos en Canadá y la enviamos por Canada Post. Desde 3,14 CAD, impresión e impuestos incluidos.",
    ctaButton: "Enviar carta",
    hubLink: "Todos los países",
    otherLanguages: "Otros idiomas",
  },
};

export const pt: OriginPage = {
  id: "brazil-pt",
  lang: "pt",
  hreflang: "pt",
  slug: "como-enviar-uma-carta-para-o-canada",
  market: "Brazil, Portugal",

  title: "Como enviar uma carta para o Canadá (2026)",
  description:
    "Como escrever corretamente um endereço canadense, como é o código postal e o que acontece se a carta não puder ser entregue.",
  keywords: ["enviar carta para o Canadá", "endereço canadense", "código postal Canadá", "correio para o Canadá"],

  lede:
    "Há duas maneiras de enviar uma carta para o Canadá: pelo correio internacional dos Correios, ou por um serviço que imprime a carta dentro do próprio Canadá e a posta como correspondência nacional. Nos dois casos, o erro mais comum é o mesmo — o endereço.",

  addressProblem:
    "O bairro, obrigatório num endereço brasileiro, não tem equivalente no Canadá: mantê-lo acrescenta uma linha que os Correios canadenses não interpretam. Além disso o CEP brasileiro tem oito dígitos e vem antes da cidade, enquanto o código postal canadense alterna letra e número — M5H 2N2 — e fecha a linha, depois da sigla da província.",

  localExample: {
    label: "Formato brasileiro",
    lines: ["Sr. João Silva", "Rua das Flores, 250, Apto. 32", "Bairro Jardim Paulista", "São Paulo - SP, 01415-000", "Brasil"],
  },
  canadianExample: {
    label: "Formato canadense",
    lines: ["JOAO SILVA", "32-250 DUNDAS ST W", "TORONTO ON  M5T 1H1", "CANADA"],
  },

  conversionSteps: [
    "Remova a linha do bairro — não existe no sistema canadense.",
    "O número do apartamento vem antes do número do prédio, com hífen — 32-250.",
    "O número vem antes do nome da rua: de « Rua das Flores, 250 » para « 250 Dundas St ».",
    "Cidade, sigla da província com duas letras e código postal na mesma linha.",
    "Tire os acentos: João vira JOAO, Conceição vira CONCEICAO.",
  ],

  scriptNote:
    "O alfabeto já é latino, mas os acentos e o til podem ser lidos incorretamente pelos equipamentos canadenses. Escreva o endereço sem acentuação. No corpo da carta isso não importa.",

  diaspora:
    "A comunidade brasileira e portuguesa no Canadá está concentrada em Toronto (a Little Portugal na Dundas Street é histórica), Montreal e Vancouver. Muitos endereços nessas áreas têm número de unidade.",

  transit:
    "Uma carta internacional dos Correios costuma levar de duas a quatro semanas. Uma carta postada dentro do Canadá leva de três a sete dias úteis, segundo o Canada Post.",

  returnWarning:
    "Isto é importante: quando enviamos a carta em seu nome, ela é impressa no Canadá e postada como correspondência nacional canadense, enquanto o endereço do remetente está no Brasil. Se o endereço canadense estiver errado, a carta não pode ser devolvida — a tarifa internacional de devolução nunca foi paga. Pelas próprias regras do Canada Post, esse tipo de correspondência é aberto e destruído se não tiver valor evidente. Você não receberá nenhum aviso. Por isso, confira o endereço duas vezes antes de enviar.",

  faq: [
    {
      q: "Preciso escrever o bairro?",
      a: "Não. O Canadá não usa bairros no endereçamento. Incluir essa linha só acrescenta informação que o Canada Post não interpreta.",
    },
    {
      q: "Como é o código postal canadense?",
      a: "Seis caracteres alternando letra e número, com um espaço no meio: A1A 1A1. Não tem oito dígitos como o CEP.",
    },
    {
      q: "A carta tem rastreamento?",
      a: "A correspondência comum não tem rastreamento. Se precisar de comprovante de entrega, é necessário o correio registrado, que só pode ser postado numa agência no Canadá.",
    },
  ],

  ui: {
    addressHeading: "Como escrever um endereço canadense",
    stepsHeading: "Converter um endereço brasileiro para o formato canadense",
    localLabel: "Formato brasileiro",
    canadaLabel: "Formato canadense",
    scriptHeading: "Caracteres",
    deliveryHeading: "Quanto tempo leva",
    warningHeading: "Se a carta não chegar",
    faqHeading: "Perguntas frequentes",
    ctaTitle: "Envie uma carta para o Canadá",
    ctaBody:
      "Escreva ou envie sua carta, informe o endereço canadense: imprimimos no Canadá e postamos pelo Canada Post. A partir de 3,14 CAD, impressão e impostos incluídos.",
    ctaButton: "Enviar carta",
    hubLink: "Todos os países",
    otherLanguages: "Outros idiomas",
  },
};
