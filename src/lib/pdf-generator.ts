import jsPDF from "jspdf";
import QRCode from "qrcode";

const LOGO_URL = "/images/seven-trip-logo.png";
let cachedLogoBase64: string | null = null;

// Company info — single source of truth for all PDFs
const COMPANY = {
  name: "Seven Trip",
  parent: "Evan International",
  phone: "+880 1749-373748",
  email: "support@seven-trip.com",
  address: "Beena Kanon, Flat-4A, House-03, Road-17, Block-E, Banani, Dhaka-1213",
  addressShort: "Banani, Dhaka-1213",
  website: "www.seven-trip.com",
};

async function loadLogoBase64(): Promise<string | null> {
  if (cachedLogoBase64) return cachedLogoBase64;
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = LOGO_URL;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    cachedLogoBase64 = canvas.toDataURL("image/png");
    return cachedLogoBase64;
  } catch {
    return null;
  }
}

async function loadImageBase64(url: string): Promise<string | null> {
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject();
      img.src = url;
    });
    const canvas = document.createElement("canvas");
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0);
    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

function addLogo(doc: jsPDF, logo: string | null, x: number, y: number, w: number, h: number) {
  if (!logo) return;
  try {
    doc.addImage(logo, "PNG", x, y, w, h);
  } catch { /* fallback */ }
}

async function generateQRDataUrl(text: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(text, { width: 120, margin: 1 });
  } catch {
    return null;
  }
}

/**
 * Draws the standard company header matching the reference PDF exactly:
 * - Purple decorative top stripe
 * - Large logo (~50mm wide)
 * - Company contact info below logo
 * - QR code in top-right corner
 */
function drawReferenceHeader(doc: jsPDF, logo: string | null, w: number, qr: string | null): number {
  // Purple decorative stripe at very top
  doc.setFillColor(120, 90, 220);
  doc.rect(0, 0, w, 4, "F");

  // Large logo
  if (logo) {
    addLogo(doc, logo, 20, 10, 50, 18);
  } else {
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(40, 180, 160);
    doc.text("Seven Trip", 20, 24);
  }

  // QR code top-right
  if (qr) {
    try { doc.addImage(qr, "PNG", w - 42, 8, 22, 22); } catch { /* skip */ }
  }

  // Company contact info below logo
  let y = 32;
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(`Call: ${COMPANY.phone}`, 20, y);
  y += 4;
  doc.text("Beena Kanon, Flat-4A, House-03,", 20, y);
  y += 4;
  doc.text("Road-17, Block-E, Banani, Dhaka-1213", 20, y);
  y += 8;

  return y;
}

function numberToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
    "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const scales = ["", "Thousand", "Lakh", "Crore"];

  const num = Math.floor(Math.abs(n));
  if (num === 0) return "Zero";

  // Split into groups: last 3 digits, then pairs
  const groups: number[] = [];
  let remaining = num;
  groups.push(remaining % 1000);
  remaining = Math.floor(remaining / 1000);
  while (remaining > 0) {
    groups.push(remaining % 100);
    remaining = Math.floor(remaining / 100);
  }

  function groupToWords(g: number): string {
    if (g === 0) return "";
    if (g < 20) return ones[g];
    if (g < 100) return tens[Math.floor(g / 10)] + (g % 10 ? " " + ones[g % 10] : "");
    return ones[Math.floor(g / 100)] + " Hundred" + (g % 100 ? " " + groupToWords(g % 100) : "");
  }

  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (groups[i] > 0) {
      parts.push(groupToWords(groups[i]) + (scales[i] ? " " + scales[i] : ""));
    }
  }
  return parts.join(" ") + " Taka Only";
}

/* ════════════════════════════════════════════════════════════════════
   MONEY RECEIPT PDF — Matches uploaded format
   ════════════════════════════════════════════════════════════════════ */

export interface MoneyReceiptData {
  receiptNo?: string;
  customerName: string;
  customerPhone?: string;
  customerAddress?: string;
  items: Array<{
    description: string;
    pax: number;
    unitPrice: number;
    totalPrice: number;
  }>;
  totalAmount: number;
  due: number;
  discount: number;
  grandTotal: number;
  receivedBy?: string;
  date: string;
}

export async function generateMoneyReceiptPDF(data: MoneyReceiptData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();

  let y = drawCompanyHeader(doc, logo, w);
  y += 4;

  // Title
  doc.setFillColor(30, 30, 30);
  doc.rect(20, y, w - 40, 10, "F");
  doc.setTextColor(255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Money Receipt", w / 2, y + 7, { align: "center" });
  y += 16;

  // Receipt for section
  doc.setTextColor(100);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Receipt for-", 20, y);
  y += 6;

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(data.customerName, 20, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  if (data.customerPhone) { doc.text(data.customerPhone, 20, y); y += 5; }
  if (data.customerAddress) { doc.text(data.customerAddress, 20, y); y += 5; }

  // Receipt no on right
  if (data.receiptNo) {
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Receipt #: ${data.receiptNo}`, w - 20, y - 16, { align: "right" });
  }
  doc.text(`Date: ${data.date}`, w - 20, y - 11, { align: "right" });

  y += 6;

  // Table header
  const cols = [20, 30, w - 100, w - 70, w - 40, w - 20];
  doc.setFillColor(240, 240, 240);
  doc.rect(20, y - 4, w - 40, 8, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60);
  doc.text("No", 25, y + 1);
  doc.text("Description", 35, y + 1);
  doc.text("Pax", w - 95, y + 1, { align: "center" });
  doc.text("Unit Price", w - 65, y + 1, { align: "right" });
  doc.text("Total Price", w - 25, y + 1, { align: "right" });
  y += 8;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);
  doc.setFontSize(9);

  data.items.forEach((item, i) => {
    const rowY = y + 1;
    doc.text(String(i + 1).padStart(2, "0"), 25, rowY);
    doc.text(item.description, 35, rowY, { maxWidth: w - 140 });
    doc.text(String(item.pax), w - 95, rowY, { align: "center" });
    doc.text(`${item.unitPrice.toLocaleString()}৳`, w - 65, rowY, { align: "right" });
    doc.text(`${item.totalPrice.toLocaleString()}৳`, w - 25, rowY, { align: "right" });
    y += 7;
    doc.setDrawColor(230);
    doc.line(20, y - 2, w - 20, y - 2);
  });

  // Fill empty rows to match format (up to 3 rows)
  const emptyRows = Math.max(0, 3 - data.items.length);
  for (let i = 0; i < emptyRows; i++) {
    doc.text(String(data.items.length + i + 1).padStart(2, "0"), 25, y + 1);
    y += 7;
    doc.setDrawColor(230);
    doc.line(20, y - 2, w - 20, y - 2);
  }

  y += 4;

  // Totals
  const totalsX = w - 80;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);

  doc.text("Total Fair:", totalsX, y);
  doc.text(`${data.totalAmount.toLocaleString()}৳`, w - 25, y, { align: "right" });
  y += 6;

  doc.text("Due:", totalsX, y);
  doc.text(`${data.due.toLocaleString()}৳`, w - 25, y, { align: "right" });
  y += 6;

  doc.text("Adjustment/Discount:", totalsX, y);
  doc.text(`${data.discount.toLocaleString()}৳`, w - 25, y, { align: "right" });
  y += 8;

  // Grand total in words
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("In Words: Grand Total", 20, y);
  doc.text(`${data.grandTotal.toLocaleString()}৳`, w - 25, y, { align: "right" });
  y += 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text(numberToWords(data.grandTotal), 20, y);
  y += 8;

  // Received with gratitude line
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(60);
  const gratitudeText = `Received with gratitude from ${data.customerName}, the amount of ${numberToWords(data.grandTotal)} (BDT ${data.grandTotal.toLocaleString()}/-) towards ${data.items.map(i => i.description).join(", ")}.`;
  doc.text(gratitudeText, 20, y, { maxWidth: w - 40 });
  y += 16;

  // Signature line
  doc.setTextColor(0);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  if (data.receivedBy) {
    doc.text(data.receivedBy, w - 60, y);
    y += 5;
  }
  doc.text(data.date, w - 60, y);
  y += 3;
  doc.setDrawColor(0);
  doc.line(w - 80, y, w - 20, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(100);
  doc.text("Signature & Date", w - 60, y);

  // QR Code (bottom-left)
  const qrText = `SevenTrip Receipt | ${data.receiptNo || "N/A"} | ${data.customerName} | BDT ${data.grandTotal} | ${data.date}`;
  const qr = await generateQRDataUrl(qrText);
  if (qr) {
    try { doc.addImage(qr, "PNG", 20, y - 20, 25, 25); } catch { /* skip */ }
  }

  // Footer
  y += 15;
  doc.setFontSize(6);
  doc.setTextColor(150);
  doc.text(`${COMPANY.name} — A concern of ${COMPANY.parent} | ${COMPANY.website} | ${COMPANY.phone}`, w / 2, y, { align: "center" });

  doc.save(`MoneyReceipt-${data.receiptNo || "receipt"}.pdf`);
}

export async function printMoneyReceiptPDF(data: MoneyReceiptData) {
  // Generate same as above but open for printing
  await generateMoneyReceiptPDF(data);
}

/* ════════════════════════════════════════════════════════════════════
   INVOICE PDF — Matches uploaded format with QR
   ════════════════════════════════════════════════════════════════════ */

export interface InvoiceLineItem {
  name: string;
  description?: string;
  quantity?: number;
  unitPrice: number;
  totalPrice: number;
  extra?: Record<string, string | number>;
}

export interface InvoiceData {
  invoiceNo: string;
  date: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  customerAddress?: string;
  bookingRef: string;
  subtotal: number;
  tax: number;
  discount: number;
  amount: number;
  status: string;
  serviceType?: string;
  lineItems?: InvoiceLineItem[];
}

async function buildInvoiceDoc(inv: InvoiceData): Promise<jsPDF> {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();

  let y = drawCompanyHeader(doc, logo, w);
  y += 2;

  // Title bar
  doc.setFillColor(30, 30, 30);
  doc.rect(20, y, w - 40, 10, "F");
  doc.setTextColor(255);
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice", w / 2, y + 7, { align: "center" });
  y += 16;

  // Invoice for (left) + Invoice details (right)
  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("Invoice for", 20, y);
  doc.text("Invoice Details", w - 70, y);
  y += 6;

  doc.setTextColor(0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(inv.customerName, 20, y);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`# ${inv.invoiceNo}`, w - 70, y);
  y += 5;

  doc.setTextColor(80);
  doc.setFontSize(8);
  if (inv.customerPhone) { doc.text(inv.customerPhone, 20, y); }
  doc.text(`Submitted on ${inv.date}`, w - 70, y);
  y += 5;
  if (inv.customerEmail) { doc.text(inv.customerEmail, 20, y); y += 5; }
  if (inv.customerAddress) { doc.text(inv.customerAddress, 20, y); y += 5; }
  y += 4;

  // Build effective line items — always show a proper table
  const effectiveItems: InvoiceLineItem[] = (inv.lineItems && inv.lineItems.length > 0)
    ? inv.lineItems
    : [{
        name: inv.serviceType
          ? `${inv.serviceType.charAt(0).toUpperCase() + inv.serviceType.slice(1)} Booking`
          : "Service",
        description: inv.bookingRef ? `Ref: ${inv.bookingRef}` : undefined,
        quantity: 1,
        unitPrice: inv.subtotal || inv.amount || 0,
        totalPrice: inv.subtotal || inv.amount || 0,
      }];

  // Determine columns from first item's extra keys
  const extraKeys = effectiveItems[0]?.extra ? Object.keys(effectiveItems[0].extra) : [];

  // Table header
  doc.setFillColor(240, 240, 240);
  doc.rect(15, y - 4, w - 30, 8, "F");
  doc.setFontSize(7);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(60);

  let cx = 18;
  doc.text("No.", cx, y + 1); cx += 10;
  doc.text("Name", cx, y + 1); cx += 45;
  extraKeys.forEach(k => {
    doc.text(k, cx, y + 1); cx += 22;
  });
  doc.text("Total Price", w - 20, y + 1, { align: "right" });
  y += 8;

  // Table rows
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(0);

  effectiveItems.forEach((item, i) => {
    if (y > 265) {
      doc.addPage();
      y = 20;
      // Repeat header on new page
      doc.setFillColor(240, 240, 240);
      doc.rect(15, y - 4, w - 30, 8, "F");
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60);
      let hx = 18;
      doc.text("No.", hx, y + 1); hx += 10;
      doc.text("Name", hx, y + 1); hx += 45;
      extraKeys.forEach(k => { doc.text(k, hx, y + 1); hx += 22; });
      doc.text("Total Price", w - 20, y + 1, { align: "right" });
      y += 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(0);
    }

    let rx = 18;
    doc.text(String(i + 1).padStart(2, "0"), rx, y + 1); rx += 10;
    doc.text(item.name.substring(0, 28), rx, y + 1); rx += 45;
    extraKeys.forEach(k => {
      const val = item.extra?.[k];
      doc.text(String(val ?? ""), rx, y + 1); rx += 22;
    });
    doc.text(`${item.totalPrice.toLocaleString()}৳`, w - 20, y + 1, { align: "right" });
    y += 6;
    doc.setDrawColor(235);
    doc.line(15, y - 2, w - 15, y - 2);
  });

  // Totals section
  y += 4;
  doc.setDrawColor(180);
  doc.line(w - 90, y, w - 20, y);
  y += 7;

  const totalsX = w - 85;
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(0);

  doc.text("Subtotal:", totalsX, y);
  doc.text(`${(inv.subtotal || inv.amount || 0).toLocaleString()}৳`, w - 22, y, { align: "right" });
  y += 6;
  if (inv.tax > 0) {
    doc.text("Tax:", totalsX, y);
    doc.text(`${inv.tax.toLocaleString()}৳`, w - 22, y, { align: "right" });
    y += 6;
  }
  if (inv.discount > 0) {
    doc.setTextColor(0, 130, 0);
    doc.text("Discount:", totalsX, y);
    doc.text(`-${inv.discount.toLocaleString()}৳`, w - 22, y, { align: "right" });
    doc.setTextColor(0);
    y += 6;
  }

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Grand Total:", totalsX, y);
  doc.text(`${inv.amount.toLocaleString()}৳`, w - 22, y, { align: "right" });
  y += 6;

  // In words
  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(100);
  doc.text(numberToWords(inv.amount), totalsX, y);

  // QR Code
  const qrText = `SevenTrip Invoice | ${inv.invoiceNo} | ${inv.customerName} | BDT ${inv.amount} | ${inv.date}`;
  const qr = await generateQRDataUrl(qrText);
  if (qr) {
    try { doc.addImage(qr, "PNG", 20, y - 18, 25, 25); } catch { /* skip */ }
  }

  y += 16;

  // Footer
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(150);
  doc.text(`Thank you for choosing ${COMPANY.name}. For queries, contact ${COMPANY.email}`, w / 2, y, { align: "center" });
  y += 5;
  doc.text("This is a computer-generated invoice and does not require a signature.", w / 2, y, { align: "center" });
  y += 4;
  doc.setFontSize(6);
  doc.text(`${COMPANY.name} — A concern of ${COMPANY.parent} | ${COMPANY.website} | ${COMPANY.phone}`, w / 2, y, { align: "center" });

  return doc;
}

export async function generateInvoicePDF(inv: InvoiceData) {
  const doc = await buildInvoiceDoc(inv);
  doc.save(`${inv.invoiceNo}.pdf`);
}

export async function printInvoicePDF(inv: InvoiceData) {
  const doc = await buildInvoiceDoc(inv);
  const pdfBlob = doc.output("blob");
  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url);
  if (printWindow) {
    printWindow.onload = () => { printWindow.print(); };
  }
}

/* ════════════════════════════════════════════════════════════════════
   ENTERPRISE E-TICKET / TRAVEL ITINERARY PDF
   ════════════════════════════════════════════════════════════════════ */

interface FlightSegment {
  airline: string;
  airlineCode?: string;
  flightNumber: string;
  origin: string;
  originCity?: string;
  destination: string;
  destinationCity?: string;
  departureTime: string;
  arrivalTime: string;
  duration?: string;
  cabinClass?: string;
  aircraft?: string;
  terminal?: string;
  arrivalTerminal?: string;
  stops?: number;
  baggage?: string;
  status?: string;
  meal?: string;
}

interface PassengerInfo {
  title?: string;
  firstName: string;
  lastName: string;
  passport?: string;
  seat?: string;
  ticketNumber?: string;
}

interface TicketData {
  id?: string;
  airline?: string;
  flightNo?: string;
  from?: string;
  to?: string;
  date?: string;
  time?: string;
  passenger?: string;
  pnr?: string;
  seat?: string;
  class?: string;
  bookingRef?: string;
  airlineReservationCode?: string;
  isRoundTrip?: boolean;
  outbound?: FlightSegment[];
  returnSegments?: FlightSegment[];
  passengers?: PassengerInfo[];
  meal?: string;
  extraBaggage?: string[];
  totalFare?: number;
  currency?: string;
}

function drawBox(doc: jsPDF, x: number, y: number, w: number, h: number) {
  doc.setDrawColor(180);
  doc.setLineWidth(0.3);
  doc.rect(x, y, w, h);
}

function drawFilledBox(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, g: number, b: number) {
  doc.setFillColor(r, g, b);
  doc.rect(x, y, w, h, "F");
}

async function drawFlightSegment(
  doc: jsPDF,
  seg: FlightSegment,
  y: number,
  pageW: number,
  airlineLogo: string | null,
  direction: string,
): Promise<number> {
  const lm = 15;
  const boxW = pageW - 30;

  drawFilledBox(doc, lm, y, boxW, 8, 50, 50, 50);
  doc.setTextColor(255);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text(`DEPARTURE: ${direction.toUpperCase()}`, lm + 4, y + 5.5);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Please verify flight times prior to departure", lm + 80, y + 5.5);
  y += 12;

  const segBoxH = 55;
  drawBox(doc, lm, y, boxW, segBoxH);

  const col1W = 50;
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");

  if (airlineLogo) {
    try { doc.addImage(airlineLogo, "PNG", lm + 3, y + 3, 12, 12); } catch { /* skip */ }
  }

  doc.text(seg.airline.toUpperCase(), lm + (airlineLogo ? 17 : 4), y + 9);
  doc.setFontSize(12);
  doc.text(seg.flightNumber, lm + 4, y + 18);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  let infoY = y + 25;
  doc.text(`Duration:`, lm + 4, infoY);
  doc.text(seg.duration || "—", lm + 28, infoY);
  infoY += 5;
  doc.text(`Cabin:`, lm + 4, infoY);
  doc.text(`${seg.cabinClass || "Economy"}`, lm + 28, infoY);
  infoY += 5;
  doc.text(`Status:`, lm + 4, infoY);
  doc.setTextColor(0, 130, 0);
  doc.setFont("helvetica", "bold");
  doc.text(seg.status || "Confirmed", lm + 28, infoY);
  doc.setTextColor(80);
  doc.setFont("helvetica", "normal");

  const col2X = lm + col1W + 2;
  doc.setDrawColor(200);
  doc.line(col2X - 2, y + 1, col2X - 2, y + segBoxH - 1);

  doc.setTextColor(0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(seg.origin, col2X + 4, y + 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(seg.originCity?.toUpperCase() || "", col2X + 4, y + 17);

  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.text("▶", col2X + 35, y + 12);

  doc.setFontSize(8);
  doc.setTextColor(80);
  doc.text("Departing At:", col2X + 4, y + 26);
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(seg.departureTime ? new Date(seg.departureTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—", col2X + 4, y + 34);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  if (seg.terminal) {
    doc.text(`Terminal:`, col2X + 4, y + 41);
    doc.text(seg.terminal, col2X + 4, y + 46);
  }

  const col3X = col2X + 48;
  doc.setDrawColor(200);
  doc.line(col3X - 2, y + 1, col3X - 2, y + segBoxH - 1);

  doc.setTextColor(0);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(seg.destination, col3X + 4, y + 12);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  doc.text(seg.destinationCity?.toUpperCase() || "", col3X + 4, y + 17);

  doc.setFontSize(8);
  doc.text("Arriving At:", col3X + 4, y + 26);
  doc.setTextColor(0);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(seg.arrivalTime ? new Date(seg.arrivalTime).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }) : "—", col3X + 4, y + 34);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  if (seg.arrivalTerminal) {
    doc.text(`Terminal:`, col3X + 4, y + 41);
    doc.text(seg.arrivalTerminal, col3X + 4, y + 46);
  }

  const col4X = col3X + 48;
  doc.setDrawColor(200);
  doc.line(col4X - 2, y + 1, col4X - 2, y + segBoxH - 1);

  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  let detY = y + 8;
  doc.text("Aircraft:", col4X + 2, detY);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text(seg.aircraft || "—", col4X + 2, detY + 5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(80);
  detY += 14;
  doc.text("Meals:", col4X + 2, detY);
  doc.text(seg.meal || "Meals", col4X + 2, detY + 5);
  detY += 14;
  doc.text("Baggage:", col4X + 2, detY);
  doc.text(seg.baggage || "20kg", col4X + 2, detY + 5);

  y += segBoxH + 2;
  return y;
}

export async function generateTicketPDF(ticket: TicketData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();
  const lm = 15;

  const outboundSegments: FlightSegment[] = ticket.outbound || [];
  const returnSegments: FlightSegment[] = ticket.returnSegments || [];

  if (outboundSegments.length === 0 && ticket.from) {
    outboundSegments.push({
      airline: ticket.airline || "Seven Trip",
      airlineCode: (ticket as any).airlineCode || "",
      flightNumber: ticket.flightNo || "",
      origin: ticket.from || "",
      destination: ticket.to || "",
      departureTime: ticket.time || ticket.date || "",
      arrivalTime: "",
      duration: "",
      cabinClass: ticket.class || "Economy",
      baggage: "20kg",
      status: "Confirmed",
    });
  }

  const passengers: PassengerInfo[] = ticket.passengers || [
    { firstName: ticket.passenger || "Traveller", lastName: "", seat: ticket.seat, ticketNumber: ticket.id },
  ];

  const bookingRef = ticket.bookingRef || ticket.pnr || ticket.id || "";
  const departDate = ticket.date || (outboundSegments[0]?.departureTime ? new Date(outboundSegments[0].departureTime).toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" }) : "");
  const destCity = outboundSegments[outboundSegments.length - 1]?.destinationCity || outboundSegments[outboundSegments.length - 1]?.destination || ticket.to || "";

  // HEADER BAR
  drawFilledBox(doc, 0, 0, w, 22, 30, 30, 30);
  if (logo) {
    try { doc.addImage(logo, "PNG", lm, 3, 40, 10); } catch { /* skip */ }
  } else {
    doc.setTextColor(255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(COMPANY.name, lm, 14);
  }

  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text(`${departDate}  ▸  TRIP TO ${destCity.toUpperCase()}`, lm + (logo ? 45 : 52), 9);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.parent} | ${COMPANY.website} | ${COMPANY.phone}`, lm + (logo ? 45 : 52), 16);

  let y = 28;

  doc.setTextColor(100);
  doc.setFontSize(8);
  doc.text("PREPARED FOR", lm, y);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  y += 6;
  passengers.forEach((p) => {
    doc.text(`${p.lastName ? `${p.lastName.toUpperCase()}/${p.firstName.toUpperCase()}` : p.firstName.toUpperCase()} ${p.title?.toUpperCase() || ""}`.trim(), lm, y);
    y += 6;
  });

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text("RESERVATION CODE", w - 60, 28);
  doc.setTextColor(0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text(bookingRef, w - 60, 35);

  if (ticket.airlineReservationCode) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100);
    doc.text("AIRLINE RESERVATION CODE", w - 60, 41);
    doc.setTextColor(0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text(ticket.airlineReservationCode, w - 60, 47);
  }

  y += 4;
  doc.setDrawColor(180);
  doc.line(lm, y, w - lm, y);
  y += 6;

  const firstCode = outboundSegments[0]?.airlineCode || "";
  let airlineLogo: string | null = null;
  if (firstCode) {
    airlineLogo = await loadImageBase64(`https://images.kiwi.com/airlines/64/${firstCode}.png`);
  }

  const outDate = outboundSegments[0]?.departureTime
    ? new Date(outboundSegments[0].departureTime).toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "short" }).toUpperCase()
    : departDate.toUpperCase();

  for (const seg of outboundSegments) {
    y = await drawFlightSegment(doc, seg, y, w, airlineLogo, outDate);

    drawFilledBox(doc, lm, y, w - 30, 6, 230, 230, 230);
    doc.setFontSize(7);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(60);
    doc.text("Passenger Name:", lm + 3, y + 4);
    doc.text("Seats:", w - 50, y + 4);
    y += 7;

    passengers.forEach((p) => {
      doc.setTextColor(0);
      doc.setFontSize(8);
      doc.setFont("helvetica", "normal");
      const name = `» ${p.lastName ? `${p.lastName.toUpperCase()}/${p.firstName.toUpperCase()}` : p.firstName.toUpperCase()} ${p.title?.toUpperCase() || ""}`.trim();
      doc.text(name, lm + 3, y + 3);
      doc.text(p.seat || "Check-In Required", w - 50, y + 3);
      y += 6;
    });

    y += 4;
  }

  if (returnSegments.length > 0) {
    const retDate = returnSegments[0]?.departureTime
      ? new Date(returnSegments[0].departureTime).toLocaleDateString("en-US", { weekday: "long", day: "2-digit", month: "short" }).toUpperCase()
      : "";

    const retCode = returnSegments[0]?.airlineCode || firstCode;
    let retLogo = airlineLogo;
    if (retCode && retCode !== firstCode) {
      retLogo = await loadImageBase64(`https://images.kiwi.com/airlines/64/${retCode}.png`);
    }

    for (const seg of returnSegments) {
      if (y > 240) { doc.addPage(); y = 15; }

      y = await drawFlightSegment(doc, seg, y, w, retLogo, retDate);

      drawFilledBox(doc, lm, y, w - 30, 6, 230, 230, 230);
      doc.setFontSize(7);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(60);
      doc.text("Passenger Name:", lm + 3, y + 4);
      doc.text("Seats:", w - 50, y + 4);
      y += 7;

      passengers.forEach((p) => {
        doc.setTextColor(0);
        doc.setFontSize(8);
        doc.setFont("helvetica", "normal");
        const name = `» ${p.lastName ? `${p.lastName.toUpperCase()}/${p.firstName.toUpperCase()}` : p.firstName.toUpperCase()} ${p.title?.toUpperCase() || ""}`.trim();
        doc.text(name, lm + 3, y + 3);
        doc.text(p.seat || "Check-In Required", w - 50, y + 3);
        y += 6;
      });

      y += 4;
    }
  }

  // FOOTER
  if (y > 260) { doc.addPage(); y = 15; }
  y += 4;
  drawFilledBox(doc, lm, y, w - 30, 18, 240, 240, 240);
  doc.setTextColor(60);
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.text("TRAVEL CONSULTANT", lm + 4, y + 6);
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.parent} (${COMPANY.name})`, lm + 4, y + 11);
  doc.text(`${COMPANY.email} | ${COMPANY.phone}`, lm + 4, y + 15);

  doc.setTextColor(100);
  doc.setFontSize(6);
  doc.text("This is a computer-generated travel itinerary. Please arrive at the airport at least 2 hours before departure for domestic and 3 hours for international flights.", w / 2, y + 24, { align: "center" });
  doc.text(`Powered by ${COMPANY.name} — ${COMPANY.website}`, w / 2, y + 28, { align: "center" });

  doc.save(`E-Ticket-${bookingRef}.pdf`);
}

export async function printTicketPDF(ticket: TicketData) {
  const doc = new jsPDF();
  const w = doc.internal.pageSize.getWidth();
  const logo = await loadLogoBase64();
  const lm = 15;

  const outboundSegments: FlightSegment[] = ticket.outbound || [];
  const returnSegments: FlightSegment[] = ticket.returnSegments || [];

  if (outboundSegments.length === 0 && ticket.from) {
    outboundSegments.push({
      airline: ticket.airline || "Seven Trip",
      airlineCode: (ticket as any).airlineCode || "",
      flightNumber: ticket.flightNo || "",
      origin: ticket.from || "",
      destination: ticket.to || "",
      departureTime: ticket.time || ticket.date || "",
      arrivalTime: "",
      cabinClass: ticket.class || "Economy",
      baggage: "20kg",
      status: "Confirmed",
    });
  }

  const passengers: PassengerInfo[] = ticket.passengers || [
    { firstName: ticket.passenger || "Traveller", lastName: "", seat: ticket.seat },
  ];

  const bookingRef = ticket.bookingRef || ticket.pnr || ticket.id || "";

  drawFilledBox(doc, 0, 0, w, 22, 30, 30, 30);
  if (logo) {
    try { doc.addImage(logo, "PNG", lm, 3, 40, 10); } catch { /* */ }
  }
  doc.setTextColor(255);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("TRAVEL ITINERARY", w - lm, 12, { align: "right" });
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text(`${COMPANY.parent} (${COMPANY.name})`, w - lm, 18, { align: "right" });

  let y = 30;
  doc.setTextColor(0);
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  passengers.forEach((p) => {
    doc.text(`${p.lastName ? `${p.lastName.toUpperCase()}/${p.firstName.toUpperCase()}` : p.firstName.toUpperCase()}`, lm, y);
    y += 6;
  });
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Reservation: ${bookingRef}`, lm, y);
  y += 8;

  const firstCode = outboundSegments[0]?.airlineCode || "";
  let airlineLogo: string | null = null;
  if (firstCode) {
    airlineLogo = await loadImageBase64(`https://images.kiwi.com/airlines/64/${firstCode}.png`);
  }

  for (const seg of outboundSegments) {
    y = await drawFlightSegment(doc, seg, y, w, airlineLogo, "OUTBOUND");
    y += 2;
  }

  for (const seg of returnSegments) {
    if (y > 240) { doc.addPage(); y = 15; }
    const retCode = seg.airlineCode || firstCode;
    let retLogo = airlineLogo;
    if (retCode !== firstCode) {
      retLogo = await loadImageBase64(`https://images.kiwi.com/airlines/64/${retCode}.png`);
    }
    y = await drawFlightSegment(doc, seg, y, w, retLogo, "RETURN");
    y += 2;
  }

  const pdfBlob = doc.output("blob");
  const url = URL.createObjectURL(pdfBlob);
  const printWindow = window.open(url);
  if (printWindow) {
    printWindow.onload = () => { printWindow.print(); };
  }
}
