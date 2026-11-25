// Geometry of the #10 window address page, in points from the top-left of a US
// Letter page. Shared by the server's print-ready PDF (print-pdf.ts) and the
// in-browser preview so they cannot drift. Kept free of imports on purpose: the
// browser must be able to use it without pulling in pdf-lib.
//
// From the "with envelope page" samples: the return address sits high, where the
// folded panel is hidden by the envelope until it is opened; the recipient sits
// lower, in the window zone. Calibrate with a test print and adjust here.

export const ADDRESS_PAGE = {
  width: 612,
  height: 792,
  left: 65,
  fromTop: 68,
  toTop: 163,
  lineHeight: 15,
  fontSize: 12,
};
