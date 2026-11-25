import type { OriginPage } from "@/lib/origins/types";

// Filipino and Vietnamese.
//
// The Philippines is Canada's #2 immigration source. Its address problem is
// specific and rarely documented: the barangay, an administrative unit with no
// Canadian equivalent, which senders keep as an extra line that means nothing
// to Canada Post. Vietnamese addresses run large-to-small like the East Asian
// set, plus diacritics that must be stripped.

export const tl: OriginPage = {
  id: "philippines-tl",
  lang: "tl",
  hreflang: "tl",
  slug: "paano-magpadala-ng-sulat-sa-canada",
  market: "Philippines",

  title: "Paano Magpadala ng Sulat sa Canada Mula sa Pilipinas (2026)",
  description:
    "Tamang pagsulat ng address sa Canada, ang format ng postal code, at kung ano ang mangyayari kapag hindi naihatid ang sulat.",
  keywords: [
    "magpadala ng sulat sa Canada",
    "address format Canada",
    "postal code Canada",
    "sulat mula Pilipinas papuntang Canada",
  ],

  lede:
    "May dalawang paraan para magpadala ng sulat sa Canada mula sa Pilipinas: sa pamamagitan ng PHLPost bilang international mail, o sa isang serbisyong nagpi-print ng sulat sa loob mismo ng Canada at ipinapadala bilang domestic mail. Sa dalawang paraan, iisa ang pinakamadalas na pagkakamali — ang address.",

  addressProblem:
    "Sa Pilipinas, karaniwang kasama sa address ang barangay, at apat na digit ang ZIP code. Sa Canada walang katumbas ang barangay — kapag isinama mo ito bilang dagdag na linya, wala itong ibig sabihin sa Canada Post at maaaring makalito sa paghahatid. Ang postal code naman ay hindi puro numero: halinhinan ang letra at numero, tulad ng M5H 2N2, at ito ang unang binabasa ng makina.",

  localExample: {
    label: "Format sa Pilipinas",
    lines: ["Mr. Juan dela Cruz", "Blk 12 Lot 5, Sampaguita St.", "Barangay San Antonio", "Pasig City, Metro Manila 1600", "Philippines"],
  },
  canadianExample: {
    label: "Format sa Canada",
    lines: ["JUAN DELA CRUZ", "512-3300 DON MILLS RD", "NORTH YORK ON  M2J 4X7", "CANADA"],
  },

  conversionSteps: [
    "Alisin ang barangay. Walang katumbas nito sa Canada at hindi ito kailangan.",
    "Ilagay ang unit o apartment number bago ang building number, may gitling — 512-3300.",
    "Pagsamahin sa isang linya ang lungsod, ang dalawang-letrang province code, at ang postal code.",
    "Gamitin ang daglat ng probinsya: ON para sa Ontario, BC para sa British Columbia, AB para sa Alberta.",
    "Sa huling linya, CANADA lamang, naka-capital letters.",
  ],

  diaspora:
    "Ang komunidad ng mga Pilipino sa Canada ay pinakamalaki sa Greater Toronto Area (North York, Scarborough, Mississauga), Winnipeg — na may isa sa pinakamatandang Pilipinong komunidad sa bansa — at Greater Vancouver. Karaniwang may unit number ang mga address sa mga lugar na ito, at ang pagkalimot dito ay madalas na dahilan ng hindi naihatid na sulat.",

  transit:
    "Ang international mail mula sa PHLPost ay karaniwang tumatagal ng dalawa hanggang apat na linggo. Ang sulat na ipinadala mula sa loob ng Canada ay tumatagal ng tatlo hanggang pitong araw ng trabaho ayon sa Canada Post.",

  returnWarning:
    "Mahalaga ito: kapag kami ang nagpadala para sa iyo, ipi-print ang sulat sa Canada at ipapadala bilang domestic mail ng Canada, samantalang ang return address ay nasa Pilipinas. Kung mali ang address sa Canada, hindi maibabalik ang sulat sa iyo — hindi kailanman nabayaran ang international return postage. Ayon mismo sa patakaran ng Canada Post, binubuksan ang ganitong mail at sinisira kung walang malinaw na halaga. Walang abiso na darating sa iyo. Kaya tiyakin munang tama ang address bago magpadala.",

  faq: [
    {
      q: "Kailangan ko bang isulat ang barangay?",
      a: "Hindi. Walang barangay sa sistema ng Canada. Ang pagsama nito ay nagdaragdag lamang ng linyang hindi nauunawaan ng Canada Post.",
    },
    {
      q: "Ano ang hitsura ng postal code sa Canada?",
      a: "Anim na karakter, halinhinan ang letra at numero, may isang espasyo sa gitna: A1A 1A1. Hindi ito apat na digit tulad ng ZIP code sa Pilipinas.",
    },
    {
      q: "May tracking ba ang sulat?",
      a: "Walang tracking ang ordinaryong lettermail. Kung kailangan mo ng patunay ng paghahatid, Registered Mail ang kailangan, at ito ay maipapadala lamang mula sa post office sa Canada.",
    },
  ],

  ui: {
    addressHeading: "Paano isulat ang address sa Canada",
    stepsHeading: "Pagpapalit ng address ng Pilipinas sa format ng Canada",
    localLabel: "Format sa Pilipinas",
    canadaLabel: "Format sa Canada",
    scriptHeading: "Titik",
    deliveryHeading: "Gaano katagal",
    warningHeading: "Kapag hindi naihatid",
    faqHeading: "Mga madalas itanong",
    ctaTitle: "Magpadala ng sulat sa Canada",
    ctaBody:
      "Isulat o i-upload ang sulat, ilagay ang address sa Canada, at ipi-print namin ito sa Canada at ipapadala sa pamamagitan ng Canada Post. Mula 3.14 CAD, kasama na ang print at buwis.",
    ctaButton: "Magpadala ng sulat",
    hubLink: "Lahat ng bansa",
    otherLanguages: "Ibang wika",
  },
};

export const vi: OriginPage = {
  id: "vietnam-vi",
  lang: "vi",
  hreflang: "vi",
  slug: "gui-thu-di-canada-tu-viet-nam",
  market: "Vietnam",

  title: "Cách gửi thư đi Canada từ Việt Nam (2026)",
  description:
    "Cách viết địa chỉ Canada cho đúng, định dạng mã bưu chính, và điều gì xảy ra nếu thư không phát được.",
  keywords: ["gửi thư đi Canada", "địa chỉ Canada", "mã bưu chính Canada", "gửi thư từ Việt Nam"],

  lede:
    "Có hai cách gửi thư từ Việt Nam sang Canada: gửi thư quốc tế qua Bưu điện Việt Nam, hoặc dùng dịch vụ in thư ngay tại Canada rồi gửi như thư nội địa. Ở cả hai cách, lỗi phổ biến nhất đều giống nhau — thứ tự địa chỉ.",

  addressProblem:
    "Địa chỉ tiếng Việt viết từ đơn vị lớn đến nhỏ. Canada thì ngược lại: bắt đầu bằng tên người nhận và kết thúc bằng tên quốc gia. Ngoài ra, mã bưu chính Việt Nam gồm sáu chữ số, còn mã bưu chính Canada xen kẽ chữ và số — dạng M5H 2N2. Đây là dòng mà Canada Post đọc trước tiên.",

  localExample: {
    label: "Kiểu Việt Nam (lớn đến nhỏ)",
    lines: ["Ông Nguyễn Văn An", "Số 25, ngõ 108, đường Trần Duy Hưng", "Phường Trung Hòa, Quận Cầu Giấy", "Hà Nội 100000", "Việt Nam"],
  },
  canadianExample: {
    label: "Kiểu Canada (nhỏ đến lớn)",
    lines: ["AN NGUYEN VAN", "808-5000 YONGE ST", "NORTH YORK ON  M2N 7E9", "CANADA"],
  },

  conversionSteps: [
    "Đảo ngược hoàn toàn thứ tự: dòng đầu là tên người nhận, dòng cuối là tên quốc gia.",
    "Số căn hộ đặt trước số nhà, nối bằng dấu gạch ngang — 808-5000.",
    "Thành phố, mã tỉnh bang hai chữ cái và mã bưu chính viết trên cùng một dòng.",
    "Không có khái niệm phường hay quận trong địa chỉ Canada — bỏ những dòng đó đi.",
    "Bỏ hết dấu tiếng Việt. Viết AN NGUYEN VAN, không phải Nguyễn Văn An.",
  ],

  scriptNote:
    "Địa chỉ phải viết bằng chữ Latinh không dấu. Máy phân loại của Canada Post không nhận diện được dấu tiếng Việt, và một địa chỉ có dấu có thể bị đọc sai. Nội dung bên trong thư thì viết tiếng Việt có dấu bình thường.",

  diaspora:
    "Cộng đồng người Việt tại Canada tập trung chủ yếu ở Toronto, Montréal, Calgary và Vancouver. Địa chỉ ở những khu vực này thường có số căn hộ — bỏ sót số căn hộ là nguyên nhân thường gặp khiến thư không đến nơi.",

  transit:
    "Thư quốc tế qua Bưu điện Việt Nam thường mất từ hai đến bốn tuần. Thư gửi từ trong Canada mất khoảng ba đến bảy ngày làm việc theo Canada Post.",

  returnWarning:
    "Điều quan trọng cần biết: khi chúng tôi gửi thư thay bạn, thư được in tại Canada và gửi như thư nội địa Canada, trong khi địa chỉ người gửi lại ở Việt Nam. Nếu địa chỉ Canada sai, thư không thể gửi trả về Việt Nam — cước phí hoàn trả quốc tế chưa bao giờ được thanh toán. Theo quy định của chính Canada Post, thư như vậy sẽ bị mở ra và bị tiêu hủy nếu không có giá trị rõ ràng. Bạn sẽ không nhận được bất kỳ thông báo nào. Vì vậy hãy kiểm tra kỹ địa chỉ trước khi gửi.",

  faq: [
    {
      q: "Tôi có thể viết địa chỉ bằng tiếng Việt có dấu không?",
      a: "Không nên. Hãy bỏ dấu và viết bằng chữ Latinh thường. Máy phân loại của Canada Post có thể đọc sai các ký tự có dấu.",
    },
    {
      q: "Mã bưu chính Canada trông như thế nào?",
      a: "Sáu ký tự, xen kẽ chữ và số, có một khoảng trắng ở giữa: A1A 1A1. Không phải sáu chữ số như ở Việt Nam.",
    },
    {
      q: "Thư có được theo dõi không?",
      a: "Thư thường không có dịch vụ theo dõi. Nếu cần bằng chứng đã phát, bạn cần thư bảo đảm (Registered Mail), chỉ gửi được tại bưu cục ở Canada.",
    },
  ],

  ui: {
    addressHeading: "Cách viết địa chỉ Canada",
    stepsHeading: "Chuyển địa chỉ Việt Nam sang kiểu Canada",
    localLabel: "Kiểu Việt Nam",
    canadaLabel: "Kiểu Canada",
    scriptHeading: "Chữ viết",
    deliveryHeading: "Mất bao lâu",
    warningHeading: "Nếu thư không phát được",
    faqHeading: "Câu hỏi thường gặp",
    ctaTitle: "Gửi thư đi Canada",
    ctaBody:
      "Viết hoặc tải lên lá thư, nhập địa chỉ Canada, chúng tôi in tại Canada và gửi qua Canada Post. Từ 3,14 CAD, đã gồm in ấn và thuế.",
    ctaButton: "Gửi thư",
    hubLink: "Tất cả quốc gia",
    otherLanguages: "Ngôn ngữ khác",
  },
};
