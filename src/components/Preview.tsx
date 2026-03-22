"use client";

export function Preview({ htmlContent }: { htmlContent: string }) {
  // Check if content is a PDF
  const pdfMatch = htmlContent.match(/data-pdf="([^"]+)"/);

  if (pdfMatch) {
    const base64 = pdfMatch[1];
    return (
      <div>
        <h2 className="text-lg font-semibold mb-4">Print Preview</h2>
        <div className="bg-gray-100 rounded-xl p-8 flex justify-center">
          <iframe
            src={`data:application/pdf;base64,${base64}`}
            className="w-[8.5in] h-[11in] bg-white shadow-md rounded"
            title="PDF Preview"
          />
        </div>
      </div>
    );
  }

  // Split content into pages (rough estimate: ~3000 chars per page)
  const pages = splitIntoPages(htmlContent);

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">Print Preview</h2>
      <p className="text-sm text-gray-500 mb-6">
        {pages.length} page{pages.length !== 1 ? "s" : ""} — this is how your
        letter will look when printed
      </p>
      <div className="space-y-8 flex flex-col items-center">
        {pages.map((pageHtml, i) => (
          <div key={i} className="relative">
            <span className="absolute -top-5 right-0 text-xs text-gray-400">
              Page {i + 1} of {pages.length}
            </span>
            <div
              className="letter-page"
              dangerouslySetInnerHTML={{ __html: pageHtml }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

function splitIntoPages(html: string): string[] {
  // Simple heuristic: split on ~3000 character boundaries at paragraph breaks
  const MAX_CHARS = 3000;

  if (html.length <= MAX_CHARS) return [html];

  const pages: string[] = [];
  let remaining = html;

  while (remaining.length > 0) {
    if (remaining.length <= MAX_CHARS) {
      pages.push(remaining);
      break;
    }

    // Find a good break point near MAX_CHARS
    let breakPoint = remaining.lastIndexOf("</p>", MAX_CHARS);
    if (breakPoint === -1 || breakPoint < MAX_CHARS * 0.5) {
      breakPoint = MAX_CHARS;
    } else {
      breakPoint += 4; // include the </p> tag
    }

    pages.push(remaining.slice(0, breakPoint));
    remaining = remaining.slice(breakPoint);
  }

  return pages.slice(0, 10); // Max 10 pages
}
