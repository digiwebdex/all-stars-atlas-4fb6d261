/**
 * Enterprise Document OCR Engine v4
 * Extracts structured data from ANY passport, National ID, or Driving License worldwide.
 * 
 * Architecture:
 *   1. Google Vision API → raw OCR text (images + PDF support)
 *   2. Multi-strategy parser:
 *      a) MRZ parsing with OCR error correction (ICAO 9303 TD1/TD2/TD3)
 *      b) NID/ID Card specific parsing (BD NID, smart card, any country ID)
 *      c) Universal labeled field extraction (supports 50+ label variations)
 *      d) Contextual heuristic extraction with date disambiguation
 *      e) Cross-validation & conflict resolution across strategies
 *   3. Post-processing: name cleanup, country normalization, date validation
 */
const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ── Config cache ──
let configCache = null;
let configCacheTime = 0;

async function getVisionConfig() {
  if (configCache && Date.now() - configCacheTime < 5 * 60 * 1000) return configCache;
  try {
    const [rows] = await db.query(
      "SELECT setting_value FROM system_settings WHERE setting_key = 'api_google_vision'"
    );
    if (rows.length > 0) {
      const config = JSON.parse(rows[0].setting_value);
      if (config.enabled !== false && config.apiKey) {
        configCache = config;
        configCacheTime = Date.now();
        return config;
      }
    }
  } catch (err) {
    console.error('[OCR] Config load error:', err.message);
  }
  if (process.env.GOOGLE_VISION_API_KEY) {
    const config = { apiKey: process.env.GOOGLE_VISION_API_KEY, enabled: true };
    configCache = config;
    configCacheTime = Date.now();
    return config;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
// ROUTE HANDLER
// ═══════════════════════════════════════════════════════════

router.post('/ocr', async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ message: 'No image data provided' });

    const config = await getVisionConfig();
    if (!config) return res.status(503).json({ message: 'Google Vision API not configured.' });

    const isPDF = image.startsWith('data:application/pdf');

    const base64Data = image
      .replace(/^data:image\/\w+;base64,/, '')
      .replace(/^data:application\/pdf;base64,/, '');

    let fullText = '';

    if (isPDF) {
      const filesUrl = `https://vision.googleapis.com/v1/files:annotate?key=${config.apiKey}`;
      const response = await fetch(filesUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            inputConfig: { content: base64Data, mimeType: 'application/pdf' },
            features: [{ type: 'DOCUMENT_TEXT_DETECTION', maxResults: 5 }],
            pages: [1, 2],
          }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[OCR] Vision Files API error:', response.status, errorData);
        return res.status(502).json({ message: 'Google Vision API error processing PDF', detail: errorData });
      }

      const data = await response.json();
      const pages = data.responses?.[0]?.responses || [];
      for (const page of pages) {
        const pageText = page.fullTextAnnotation?.text || '';
        if (pageText) fullText += pageText + '\n';
      }
    } else {
      const visionUrl = `https://vision.googleapis.com/v1/images:annotate?key=${config.apiKey}`;
      const response = await fetch(visionUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requests: [{
            image: { content: base64Data },
            features: [
              { type: 'TEXT_DETECTION', maxResults: 1 },
              { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
            ],
          }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('[OCR] Vision API error:', response.status, errorData);
        return res.status(502).json({ message: 'Google Vision API error', detail: errorData });
      }

      const data = await response.json();
      const resp0 = data.responses?.[0] || {};
      fullText = resp0.fullTextAnnotation?.text ||
                 resp0.textAnnotations?.[0]?.description || '';
    }

    console.log('[OCR] ──── RAW TEXT ────');
    console.log(fullText);
    console.log('[OCR] ──── END RAW TEXT ────');

    const extracted = parseDocument(fullText);

    res.json({ success: true, extracted, rawText: fullText });
  } catch (err) {
    console.error('[OCR] Error:', err.message);
    res.status(500).json({ message: 'OCR processing failed', error: err.message });
  }
});

module.exports = router;

// ═══════════════════════════════════════════════════════════
// BANGLA NUMERAL CONVERSION
// ═══════════════════════════════════════════════════════════

const BANGLA_DIGITS = { '০':'0','১':'1','২':'2','৩':'3','৪':'4','৫':'5','৬':'6','৭':'7','৮':'8','৯':'9' };

function convertBanglaNumbers(text) {
  if (!text) return '';
  return text.replace(/[০-৯]/g, ch => BANGLA_DIGITS[ch] || ch);
}

// ═══════════════════════════════════════════════════════════
// BANGLA PLACE NAME MAPPING
// ═══════════════════════════════════════════════════════════

const BANGLA_PLACE_MAP = {
  'ঢাকা': 'Dhaka', 'চট্টগ্রাম': 'Chittagong', 'চাটগাঁ': 'Chittagong', 'চট্টগ্ৰাম': 'Chittagong',
  'খুলনা': 'Khulna', 'রাজশাহী': 'Rajshahi', 'সিলেট': 'Sylhet',
  'বরিশাল': 'Barishal', 'বারিশাল': 'Barishal', 'রংপুর': 'Rangpur', 'ময়মনসিংহ': 'Mymensingh',
  'কুমিল্লা': 'Cumilla', 'কুমিল্লা': 'Cumilla', 'গাজীপুর': 'Gazipur', 'নারায়ণগঞ্জ': 'Narayanganj',
  'টাঙ্গাইল': 'Tangail', 'মুন্সীগঞ্জ': 'Munshiganj', 'মানিকগঞ্জ': 'Manikganj',
  'নরসিংদী': 'Narsingdi', 'কিশোরগঞ্জ': 'Kishoreganj', 'ফরিদপুর': 'Faridpur',
  'গোপালগঞ্জ': 'Gopalganj', 'মাদারীপুর': 'Madaripur', 'শরীয়তপুর': 'Shariatpur',
  'রাজবাড়ী': 'Rajbari', 'যশোর': 'Jashore', 'সাতক্ষীরা': 'Satkhira',
  'মেহেরপুর': 'Meherpur', 'নড়াইল': 'Narail', 'কুষ্টিয়া': 'Kushtia',
  'চুয়াডাঙ্গা': 'Chuadanga', 'ঝিনাইদহ': 'Jhenaidah', 'মাগুরা': 'Magura',
  'বাগেরহাট': 'Bagerhat', 'পটুয়াখালী': 'Patuakhali', 'পিরোজপুর': 'Pirojpur',
  'বরগুনা': 'Barguna', 'ভোলা': 'Bhola', 'ঝালকাঠী': 'Jhalokati',
  'নোয়াখালী': 'Noakhali', 'ফেনী': 'Feni', 'লক্ষ্মীপুর': 'Lakshmipur',
  'চাঁদপুর': 'Chandpur', 'বান্দরবান': 'Bandarban', 'রাঙ্গামাটি': 'Rangamati',
  'খাগড়াছড়ি': 'Khagrachari', 'কক্সবাজার': "Cox's Bazar",
  'বগুড়া': 'Bogura', 'জয়পুরহাট': 'Joypurhat', 'নওগাঁ': 'Naogaon',
  'নাটোর': 'Natore', 'চাঁপাইনবাবগঞ্জ': 'Chapainawabganj', 'পাবনা': 'Pabna',
  'সিরাজগঞ্জ': 'Sirajganj', 'দিনাজপুর': 'Dinajpur', 'গাইবান্ধা': 'Gaibandha',
  'কুড়িগ্রাম': 'Kurigram', 'লালমনিরহাট': 'Lalmonirhat', 'নীলফামারী': 'Nilphamari',
  'পঞ্চগড়': 'Panchagarh', 'ঠাকুরগাঁও': 'Thakurgaon',
  'সুনামগঞ্জ': 'Sunamganj', 'মৌলভীবাজার': 'Moulvibazar', 'হবিগঞ্জ': 'Habiganj',
  'ব্রাহ্মণবাড়িয়া': 'Brahmanbaria', 'নেত্রকোনা': 'Netrokona', 'জামালপুর': 'Jamalpur',
  'শেরপুর': 'Sherpur', 'মিরপুর': 'Mirpur',
};

function translateBanglaPlace(text) {
  if (!text) return '';
  const trimmed = text.trim();
  // Direct match
  if (BANGLA_PLACE_MAP[trimmed]) return BANGLA_PLACE_MAP[trimmed];
  // Partial match
  for (const [bangla, english] of Object.entries(BANGLA_PLACE_MAP)) {
    if (trimmed.includes(bangla)) return english;
  }
  return '';
}

// ═══════════════════════════════════════════════════════════
// INTELLIGENT GENDER INFERENCE FROM NAME
// ═══════════════════════════════════════════════════════════

/**
 * Infer gender from name using extensive name databases.
 * Covers South Asian (Bangladesh, India, Pakistan), Arabic, and international names.
 * Returns 'Male', 'Female', or '' if uncertain.
 */
function inferGenderFromName(firstName, lastName) {
  const full = ((firstName || '') + ' ' + (lastName || '')).toUpperCase().trim();
  if (!full) return '';

  const parts = full.split(/\s+/);

  // ── FEMALE indicators (check first — more specific patterns) ──
  const femaleNames = [
    // Bangladeshi / Bengali female
    'NAHAR', 'BEGUM', 'AKTER', 'AKTAR', 'AKHTER', 'KHATUN', 'KHATOON', 'SULTANA',
    'FATEMA', 'FATIMA', 'MONI', 'MONIRA', 'MUNIRA', 'HASINA', 'HALIMA', 'NASRIN',
    'NASREEN', 'NARGIS', 'REHANA', 'RUKSANA', 'RUMA', 'RINA', 'RITA', 'SHAPLA',
    'SHAMIMA', 'SHIRIN', 'SALMA', 'SALEHA', 'SABINA', 'SABERA', 'RAHIMA',
    'PARVIN', 'PARVEEN', 'PARUL', 'DILARA', 'DALIA', 'JASMIN', 'JASMEEN',
    'TASLIMA', 'TANIA', 'TAMANNA', 'SHAHNAZ', 'SHANTA', 'SHATHI', 'SHIULI',
    'AFROZA', 'AYESHA', 'AISHA', 'AMINA', 'ASMA', 'AFRIN', 'ARJU', 'ARIFA',
    'BILKIS', 'BITHI', 'CHAMPA', 'CHANDNI', 'FARZANA', 'FARIDA', 'FIROZA',
    'HENA', 'JHARNA', 'JOYTI', 'JYOTI', 'KAKOLI', 'KAMRUN', 'KOHINOOR',
    'KULSUM', 'LABONI', 'LATA', 'LIPI', 'LUBNA', 'LUCKY', 'MALA', 'MALEKA',
    'MARIUM', 'MARIAM', 'MARYAM', 'MASUDA', 'MAZEDA', 'MOUSHUMI', 'MUKTA',
    'NAHIDA', 'NAIMA', 'NAJU', 'NAZIA', 'NIPA', 'NISHI', 'NUSRAT', 'POLY',
    'RABEYA', 'RAZIA', 'RENU', 'ROJINA', 'ROKEYA', 'RUMANA', 'SABRINA',
    'SADIA', 'SAFINA', 'SAIDA', 'SAJEDA', 'SAKINA', 'SAMIA', 'SANJIDA',
    'SARIKA', 'SHEFA', 'SHELINA', 'SHILA', 'SHIMA', 'SHIREEN', 'SHOMPA',
    'SONIA', 'SUFIA', 'SUMA', 'SWEETIE', 'THAMINA', 'ZAHIDA', 'ZAKIA',
    'ZANNAT', 'ZARIN', 'ZENAT', 'ZOHRA', 'ZUBAIDA',
    // Bangla name parts
    'MOSSAMMAT', 'MOSAMMAT', 'MOSSAMMAD', 'MST', 'MOST',
    // Indian female
    'DEVI', 'KUMARI', 'BAI', 'PRIYA', 'LAKSHMI', 'LAXMI', 'SITA', 'GITA',
    'ANITA', 'SUNITA', 'KAVITA', 'SAVITA', 'MAMTA', 'MEENA', 'NEHA',
    'POOJA', 'PUJA', 'RANI', 'REKHA', 'SEEMA', 'SHOBHA', 'SWATI', 'USHA',
    // Arabic female
    'KHADIJA', 'MARYAM', 'ZAINAB', 'SARAH', 'SARA', 'HUDA', 'NOOR', 'LAYLA',
    'LEILA', 'ZAHRA', 'SAMIRA', 'YASMIN', 'YASMEEN',
    // International female
    'MARIA', 'ANNA', 'EMMA', 'SOPHIA', 'OLIVIA', 'EMILY', 'ELIZABETH',
    'JESSICA', 'JENNIFER', 'MICHELLE', 'NICOLE', 'AMANDA', 'STEPHANIE',
    'CATHERINE', 'CHRISTINE', 'PATRICIA', 'MARGARET', 'SANDRA', 'HELEN',
  ];

  // ── MALE indicators ──
  const maleNames = [
    // Bangladeshi / Bengali male
    'MOHAMMAD', 'MOHAMMED', 'MUHAMMED', 'MUHAMMAD', 'MOHAMMOD', 'MD', 'ULLAH',
    'HOSSAIN', 'HOSSEN', 'HUSSAIN', 'HUSSEIN', 'HASAN', 'HASSAN', 'UDDIN',
    'RAHMAN', 'RAHIM', 'AHMED', 'AHAMED', 'ALAM', 'ALI', 'ISLAM', 'KHAN',
    'MIAH', 'MIA', 'MIAN', 'SHEIKH', 'SHAIKH', 'CHOWDHURY', 'CHOUDHURY',
    'TALUKDER', 'SARKER', 'SARKAR', 'SIKDER', 'SIDDIQUE', 'SIDDIQUI',
    'KARIM', 'KABIR', 'RAZZAK', 'RASHID', 'RASHED', 'SHAFIQ', 'SHAHID',
    'SHARIF', 'SOHEL', 'SUMON', 'TAREK', 'TARIQ', 'ZAHIR', 'ZAHID',
    'JAMAL', 'KAMRUL', 'MORSHED', 'MASUD', 'NASIR', 'OMAR', 'RAFIQ',
    'RAJIB', 'RUBEL', 'SAJJAD', 'SAKIB', 'SHAKIL', 'SHAMIM', 'SHOAIB',
    'TANVIR', 'TOUFIQ', 'YUSUF', 'ZAMAN', 'BILLAL', 'FAISAL', 'HABIB',
    'IMRAN', 'IQBAL', 'JABBAR', 'JASHIM', 'JEWEL', 'JUNAID', 'LITON',
    'MANIK', 'MILON', 'MONIR', 'MOSTOFA', 'MUSTAFA', 'NAEEM', 'PARVEZ',
    'POLASH', 'RASEL', 'RIPON', 'ROBIN', 'SAIFUL', 'SELIM', 'SHOHAG',
    'BABUL', 'DULAL', 'FARUK', 'GAZI', 'HELAL',
    // Bangla male prefix
    'GORBAN', 'GURBAN', 'QURBAN',
    // Indian male
    'KUMAR', 'SINGH', 'RAJ', 'RAVI', 'AMIT', 'ANIL', 'ASHOK', 'DEEPAK',
    'GANESH', 'KRISHNA', 'MANOJ', 'MOHAN', 'PANKAJ', 'RAHUL', 'RAKESH',
    'RAMESH', 'ROHIT', 'SANJAY', 'SUNIL', 'VIJAY', 'VIKRAM', 'VINOD',
    // Arabic male
    'ABDULLAH', 'ABDUL', 'IBRAHIM', 'ISMAIL', 'KHALID', 'NABIL', 'SAEED',
    'WALEED', 'YASSER', 'ZAYED',
    // International male
    'JAMES', 'JOHN', 'ROBERT', 'MICHAEL', 'WILLIAM', 'DAVID', 'RICHARD',
    'CHARLES', 'JOSEPH', 'THOMAS', 'DANIEL', 'MATTHEW', 'ANTHONY', 'MARK',
    'STEVEN', 'PAUL', 'ANDREW', 'GEORGE', 'EDWARD', 'PETER',
  ];

  // Score-based: count matches across all name parts
  let femaleScore = 0;
  let maleScore = 0;

  for (const part of parts) {
    if (femaleNames.includes(part)) femaleScore += 2;
    if (maleNames.includes(part)) maleScore += 2;
  }

  // Check prefix patterns (Mst./Most./Mosammat = female, Md./Mohammad = male)
  if (/^(MST|MOST|MOSSAMMAT|MOSAMMAT|MOSSAMMAD)\b/.test(full)) femaleScore += 5;
  if (/^(MD|MOHAMMAD|MOHAMMED|MUHAMMAD)\b/.test(full)) maleScore += 5;

  // Suffix patterns
  if (full.endsWith('NAHAR') || full.endsWith('BEGUM') || full.endsWith('AKTER') || full.endsWith('KHATUN') || full.endsWith('SULTANA')) femaleScore += 3;
  if (full.endsWith('UDDIN') || full.endsWith('ULLAH') || full.endsWith('ALAM') || full.endsWith('ISLAM') || full.endsWith('HOSSAIN')) maleScore += 3;

  console.log(`[OCR] Gender inference for "${full}": female=${femaleScore}, male=${maleScore}`);

  if (femaleScore > maleScore && femaleScore >= 2) return 'Female';
  if (maleScore > femaleScore && maleScore >= 2) return 'Male';
  return '';
}

// ═══════════════════════════════════════════════════════════
// MASTER PARSER
// ═══════════════════════════════════════════════════════════


function parseDocument(text) {
  const empty = () => ({
    title: '', firstName: '', lastName: '', country: '', countryCode: '',
    nationality: '', phone: '',
    passportNumber: '', birthDate: '', birthPlace: '',
    gender: '', issuanceDate: '', expiryDate: '',
  });

  if (!text || text.trim().length < 5) return empty();

  // Convert Bangla numerals to Arabic throughout
  const normalizedText = convertBanglaNumbers(text);

  const lines = normalizedText.split('\n').map(l => l.trim()).filter(Boolean);
  const upper = normalizedText.toUpperCase();

  // Detect document type
  const isNID = detectNID(normalizedText, lines);
  console.log('[OCR] Document type:', isNID ? 'NID/ID Card' : 'Passport/Travel Doc');

  // Run all strategies
  const mrz = parseMRZ(lines);
  const nid = isNID ? parseNID(lines, normalizedText) : emptyResult();
  const labels = parseLabeledFields(lines);
  const heuristic = parseHeuristic(lines, upper, normalizedText);

  console.log('[OCR] MRZ result:', JSON.stringify(mrz));
  console.log('[OCR] NID result:', JSON.stringify(nid));
  console.log('[OCR] Label result:', JSON.stringify(labels));
  console.log('[OCR] Heuristic result:', JSON.stringify(heuristic));

  // Merge with priority (NID strategy gets high priority for ID cards)
  const result = empty();
  const fields = Object.keys(result);

  for (const f of fields) {
    if (isNID) {
      result[f] = mergePickNID(f, nid[f], labels[f], heuristic[f], mrz[f]);
    } else {
      result[f] = mergePick(f, mrz[f], labels[f], heuristic[f]);
    }
  }

  // Post-processing
  result.passportNumber = cleanDocNumber(result.passportNumber);
  result.firstName = cleanName(result.firstName);
  result.lastName = cleanName(result.lastName);
  result.birthPlace = cleanPlace(result.birthPlace);

  // ─── ADVANCED NAME INTELLIGENCE ───
  // MRZ swap fix: In Bangladesh passports, MRZ line 1 has SURNAME<<GIVEN_NAMES
  // Surname = family name (e.g., UDDIN, ISLAM, HOSSAIN, MEEM)
  // Given names = first/middle names (e.g., MOHAMMED NAZIM, MOHAMMAD SAZZADUL KABIR)
  // MRZ is authoritative — if MRZ extracted names, reject label/heuristic noise
  if (mrz.firstName && mrz.lastName && !isNID) {
    // MRZ is authoritative for passport — override any noisy label extraction
    result.firstName = cleanName(mrz.firstName);
    result.lastName = cleanName(mrz.lastName);
    console.log('[OCR] MRZ names enforced (passport priority):', result.firstName, '/', result.lastName);
  }

  // Name noise rejection: reject names containing address/NID noise words
  const NAME_NOISE = ['ADDRESS', 'HAJEE', 'PARA', 'WARD', 'ROAD', 'FLAT', 'HOUSE', 'BLOCK',
    'NENT', 'PERMANENT', 'EMERGENCY', 'FATHER', 'MOTHER', 'SPOUSE', 'TELEPHONE',
    'RELATIONSHIP', 'CONTACT', 'SHUKCHAR', 'DARBAR', 'SHARIF', 'LOHAGARA', 'DAKSHI',
    'ENTERPRISE', 'SIRAJ', 'SHOPPING', 'PANCHLAISH', 'MURADPUR', 'BOBY'];
  if (result.lastName && NAME_NOISE.some(n => result.lastName.toUpperCase().includes(n))) {
    console.log('[OCR] Rejected noisy lastName:', result.lastName);
    result.lastName = mrz.lastName ? cleanName(mrz.lastName) : '';
  }
  if (result.firstName && NAME_NOISE.some(n => result.firstName.toUpperCase().includes(n))) {
    console.log('[OCR] Rejected noisy firstName:', result.firstName);
    result.firstName = mrz.firstName ? cleanName(mrz.firstName) : '';
  }

  // Normalize country: resolve to full name + 3-letter ISO code
  const countryResolved = resolveCountryFull(result.country);
  result.country = countryResolved.name;       // "Bangladesh"
  result.countryCode = countryResolved.code3;   // "BGD"

  // ─── NATIONALITY from country ───
  if (!result.nationality && countryResolved.code3) {
    const CODE3_TO_NATIONALITY = {
      BGD:'Bangladeshi',IND:'Indian',USA:'American',GBR:'British',PAK:'Pakistani',
      NPL:'Nepalese',LKA:'Sri Lankan',MMR:'Myanmar',MYS:'Malaysian',SGP:'Singaporean',
      ARE:'Emirati',SAU:'Saudi',KWT:'Kuwaiti',QAT:'Qatari',BHR:'Bahraini',OMN:'Omani',
      CAN:'Canadian',AUS:'Australian',JPN:'Japanese',KOR:'Korean',CHN:'Chinese',
      THA:'Thai',IDN:'Indonesian',PHL:'Filipino',TUR:'Turkish',EGY:'Egyptian',
      DEU:'German',FRA:'French',ITA:'Italian',ESP:'Spanish',NLD:'Dutch',CHE:'Swiss',
      SWE:'Swedish',NOR:'Norwegian',DNK:'Danish',FIN:'Finnish',IRL:'Irish',
      PRT:'Portuguese',GRC:'Greek',POL:'Polish',ROU:'Romanian',RUS:'Russian',
      BRA:'Brazilian',MEX:'Mexican',ARG:'Argentine',COL:'Colombian',
      ZAF:'South African',NGA:'Nigerian',KEN:'Kenyan',ETH:'Ethiopian',GHA:'Ghanaian',
      AFG:'Afghan',IRQ:'Iraqi',IRN:'Iranian',JOR:'Jordanian',LBN:'Lebanese',
      VNM:'Vietnamese',KHM:'Cambodian',BTN:'Bhutanese',MDV:'Maldivian',
    };
    result.nationality = CODE3_TO_NATIONALITY[countryResolved.code3] || '';
  }

  // ─── PHONE extraction from NID or text ───
  if (!result.phone) {
    // Look for Bangladesh phone numbers in text
    const phoneRegex = /(?:\+?880|0)?\s*1[3-9]\d[\s\-]?\d{2}[\s\-]?\d{2}[\s\-]?\d{2,3}/g;
    const phones = normalizedText.match(phoneRegex);
    if (phones && phones.length > 0) {
      // Clean up the phone number
      let phone = phones[0].replace(/[\s\-]/g, '');
      if (phone.startsWith('+880')) phone = '0' + phone.substring(4);
      else if (phone.startsWith('880')) phone = '0' + phone.substring(3);
      else if (!phone.startsWith('0')) phone = '0' + phone;
      if (/^01[3-9]\d{8}$/.test(phone)) {
        result.phone = phone;
        console.log('[OCR] Phone extracted:', phone);
      }
    }
  }

  // Infer gender from name if not detected (critical for NID cards without gender field)
  if (!result.gender) {
    result.gender = inferGenderFromName(result.firstName, result.lastName);
  }

  // Title from gender
  if (!result.title && result.gender === 'Male') result.title = 'MR';
  if (!result.title && result.gender === 'Female') result.title = 'MS';

  // Validate dates
  result.birthDate = validateDate(result.birthDate);
  result.issuanceDate = validateDate(result.issuanceDate);
  result.expiryDate = validateDate(result.expiryDate);

  // Sanity: DOB must be before issue date, issue before expiry
  if (result.birthDate && result.expiryDate && result.birthDate > result.expiryDate) {
    [result.birthDate, result.expiryDate] = [result.expiryDate, result.birthDate];
  }

  console.log('[OCR] FINAL:', JSON.stringify(result, null, 2));
  return result;
}

// ═══════════════════════════════════════════════════════════
// DOCUMENT TYPE DETECTION
// ═══════════════════════════════════════════════════════════

function detectNID(text, lines) {
  const indicators = [
    /NATIONAL\s*ID/i,
    /জাতীয়\s*পরিচয়/,
    /জাতীয়\s*পিরচয়/,
    /\bNID\b/i,
    /\bID\s*(?:NO|NUMBER|CARD)\b/i,
    /SMART\s*CARD/i,
    /IDENTITY\s*CARD/i,
    /CARTE\s*D['']IDENTIT[ÉE]/i,
    /CEDULA\s*DE\s*IDENTIDAD/i,
    /PERSONALAUSWEIS/i,
    /CARTA\s*DI\s*IDENTIT[AÀ]/i,
    /TARJETA\s*DE\s*IDENTIDAD/i,
    /পিতা/,           // Father label in Bangla
    /মাতা/,           // Mother label in Bangla
    /রক্তের\s*গ্রুপ/,  // Blood group in Bangla
    /Blood\s*Group/i,
    /VOTER\s*(?:ID|NO|NUMBER)/i,
    /AADHAAR/i,
    /AADHAR/i,
  ];
  let score = 0;
  for (const pat of indicators) {
    if (pat.test(text)) score++;
  }
  // Also check if there's NO passport indicator
  const passportIndicators = [/\bPASSPORT\b/i, /^P[<A-Z]/m];
  let ppScore = 0;
  for (const pat of passportIndicators) {
    if (pat.test(text)) ppScore++;
  }
  return score >= 1 && ppScore === 0;
}

// ═══════════════════════════════════════════════════════════
// STRATEGY 2: NID / ID CARD SPECIFIC PARSING
// ═══════════════════════════════════════════════════════════

function parseNID(lines, fullText) {
  const r = emptyResult();

  // ── Name extraction ──
  // BD NID: "নাম: সাবিকুন নাহার সারাহ" or "Name: Sabiqun Nahar Sarah"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // English name
    const nameMatchEn = line.match(/^(?:Full\s*)?Name\s*[:：]\s*(.+)/i);
    if (nameMatchEn && !r.firstName) {
      const name = nameMatchEn[1].trim();
      if (name.length >= 2 && /[A-Za-z]/.test(name)) {
        splitAndAssignName(name, r);
      }
    }

    // Bangla name label (নাম:)
    if (/^নাম\s*[:：]/.test(line) && !r.firstName) {
      const after = line.replace(/^নাম\s*[:：]\s*/, '').trim();
      // Check next line for English name
      if (after && /[A-Za-z]/.test(after)) {
        splitAndAssignName(after, r);
      } else {
        // Look for English version on next lines
        for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
          const next = lines[j].trim();
          if (/^Name\s*[:：]/i.test(next)) {
            const eName = next.replace(/^Name\s*[:：]\s*/i, '').trim();
            if (eName.length >= 2) splitAndAssignName(eName, r);
            break;
          }
          // If next line is just an English name (no label)
          if (/^[A-Z][a-z]/.test(next) && next.split(/\s+/).length >= 2 && next.length < 50) {
            splitAndAssignName(next, r);
            break;
          }
        }
      }
    }

    // Standalone "Name:" with value on same line or next
    if (/^Name\s*[:：]/i.test(line) && !r.firstName) {
      const val = line.replace(/^Name\s*[:：]\s*/i, '').trim();
      if (val.length >= 2 && /[A-Za-z]{2}/.test(val)) {
        splitAndAssignName(val, r);
      } else {
        // Check next line
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const next = lines[j].trim();
          if (next.length >= 2 && /^[A-Za-z]/.test(next) && !isLabelLine(next) && !isHeaderNoise(next)) {
            splitAndAssignName(next, r);
            break;
          }
        }
      }
    }
  }

  // ── ID Number ──
  for (const line of lines) {
    // "ID NO: 6927760105" or "NID No: ..." or "ID Number: ..."
    const idMatch = line.match(/(?:ID|NID|NATIONAL\s*ID)\s*(?:NO|NUMBER|#|N[°º])?\s*[:：.]\s*(\d{8,17})/i);
    if (idMatch) {
      r.passportNumber = idMatch[1];
      break;
    }
    // "VOTER ID: ..." or "Voter No: ..."
    const voterMatch = line.match(/VOTER\s*(?:ID|NO|NUMBER)\s*[:：.]\s*(\d{8,17})/i);
    if (voterMatch) {
      r.passportNumber = voterMatch[1];
      break;
    }
    // Aadhaar
    const aadhaarMatch = line.match(/(?:AADHAAR|AADHAR)\s*(?:NO|NUMBER)?\s*[:：.]\s*(\d[\d\s]{10,15})/i);
    if (aadhaarMatch) {
      r.passportNumber = aadhaarMatch[1].replace(/\s/g, '');
      break;
    }
  }

  // If no ID found, look for standalone long number (10-17 digits)
  if (!r.passportNumber) {
    for (const line of lines) {
      if (isHeaderNoise(line)) continue;
      const standalone = line.match(/\b(\d{10,17})\b/);
      if (standalone) {
        // Make sure it's not a date or phone number
        const num = standalone[1];
        if (num.length >= 10 && !/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(line.trim())) {
          r.passportNumber = num;
          break;
        }
      }
    }
  }

  // ── Date of Birth ──
  for (const line of lines) {
    const dobMatch = line.match(/(?:Date\s*of\s*Birth|D\.?O\.?B\.?|জন্ম\s*তারিখ)\s*[:：.]\s*(.+)/i);
    if (dobMatch) {
      const d = normalizeDate(dobMatch[1].trim());
      if (d) { r.birthDate = d; break; }
    }
  }

  // ── Birth Place ──
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Bangla birth place: জন্মস্থান: ঢাকা or জন্মŪান
    if (/জন্ম(?:স্থান|Ūান|Ūান)/.test(line)) {
      const after = line.replace(/.*জন্ম(?:স্থান|Ūান|Ūান)\s*[:：.]*\s*/, '').trim();
      // Try Bangla place translation
      const translated = translateBanglaPlace(after);
      if (translated) { r.birthPlace = translated; }
      else if (after.length >= 2) {
        // Check if it's already English
        if (/[A-Za-z]{2,}/.test(after)) r.birthPlace = after;
        else {
          // Check next lines for English version
          for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
            const next = lines[j].trim();
            const t2 = translateBanglaPlace(next);
            if (t2) { r.birthPlace = t2; break; }
            if (/^[A-Za-z]{2,}/.test(next) && isValidPlaceName(next)) { r.birthPlace = next; break; }
          }
          if (!r.birthPlace) r.birthPlace = after; // Keep Bangla as fallback
        }
      }
      // If birth place on same line is empty, check next line
      if (!r.birthPlace) {
        for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
          const next = lines[j].trim();
          const t = translateBanglaPlace(next);
          if (t) { r.birthPlace = t; break; }
          if (/[A-Za-z]{2,}/.test(next) && isValidPlaceName(next)) { r.birthPlace = next; break; }
        }
      }
    }
    // English: "Place of Birth: Dhaka"
    if (/Place\s*of\s*Birth/i.test(line) && !r.birthPlace) {
      const after = line.replace(/.*Place\s*of\s*Birth\s*[:：.]*\s*/i, '').trim();
      if (after.length >= 2 && isValidPlaceName(after)) r.birthPlace = after;
    }
  }

  // ── Gender (from explicit labels OR inferred from father/mother context) ──
  for (const line of lines) {
    // Explicit gender labels
    if (/(?:লিঙ্গ|SEX|GENDER)\s*[:：.]\s*(পুরুষ|মহিলা|MALE|FEMALE|M\b|F\b)/i.test(line)) {
      const m = line.match(/(?:লিঙ্গ|SEX|GENDER)\s*[:：.]\s*(পুরুষ|মহিলা|MALE|FEMALE|M\b|F\b)/i);
      if (m) {
        const val = m[1].trim();
        if (/^(M|MALE|পুরুষ)$/i.test(val)) { r.gender = 'Male'; r.title = 'MR'; }
        else if (/^(F|FEMALE|মহিলা)$/i.test(val)) { r.gender = 'Female'; r.title = 'MS'; }
      }
    }
  }

  // If no explicit gender found, infer from the extracted name
  if (!r.gender && (r.firstName || r.lastName)) {
    const inferred = inferGenderFromName(r.firstName, r.lastName);
    if (inferred) {
      r.gender = inferred;
      r.title = inferred === 'Male' ? 'MR' : 'MS';
    }
  }

  // ── Issue Date (Bangla or English) ──
  for (const line of lines) {
    // Bangla: প্রদানের তারিখ: ১৯/০২/২০২৪ (already converted to 19/02/2024)
    const issueMatch = line.match(/(?:প্রদানের\s*তারিখ|প্রদােনর\s*তারিখ|Ĵদানের\s*তারিখ|Ĵদােনর\s*তািরখ|Issue\s*Date|Date\s*of\s*Issue)\s*[:：.]\s*(.+)/i);
    if (issueMatch) {
      const d = normalizeDate(issueMatch[1].trim());
      if (d) r.issuanceDate = d;
    }
  }

  // ── Expiry Date ──
  for (const line of lines) {
    const expMatch = line.match(/(?:মেয়াদ|Expiry|Expiration|Valid\s*Until|EXP)\s*(?:Date|তারিখ)?\s*[:：.]\s*(.+)/i);
    if (expMatch) {
      const d = normalizeDate(expMatch[1].trim());
      if (d) r.expiryDate = d;
    }
  }

  // ── Country detection for NID ──
  if (/BANGLADESH|বাংলাদেশ|বাংলােদশ/i.test(fullText)) r.country = 'BD';
  else if (/\bINDIA\b|भारत/i.test(fullText)) r.country = 'IN';
  else if (/\bPAKISTAN\b|پاکستان/i.test(fullText)) r.country = 'PK';
  else if (/\bNEPAL\b|नेपाल/i.test(fullText)) r.country = 'NP';
  else if (/\bSRI\s*LANKA\b|ශ්‍රී\s*ලංකා/i.test(fullText)) r.country = 'LK';

  // ── Blood Group (bonus field — store in birthPlace if birthPlace empty? No, just log) ──
  // We log it for debugging but don't override any field
  const bloodMatch = fullText.match(/(?:Blood\s*Group|রক্তের\s*গ্রুপ|রেক্তর\s*Ƈপ)\s*[:：.]\s*([ABO][+-]|AB[+-])/i);
  if (bloodMatch) console.log('[OCR] Blood Group detected:', bloodMatch[1]);

  // ── Father / Mother name (for reference logging) ──
  const fatherMatch = fullText.match(/(?:পিতা|Father)\s*[:：.]\s*(.+)/i);
  if (fatherMatch) console.log('[OCR] Father:', fatherMatch[1].trim());
  const motherMatch = fullText.match(/(?:মাতা|Mother)\s*[:：.]\s*(.+)/i);
  if (motherMatch) console.log('[OCR] Mother:', motherMatch[1].trim());

  return r;
}

/** Split a full name into firstName and lastName intelligently */
function splitAndAssignName(fullName, r) {
  if (!fullName) return;
  // Remove titles
  fullName = fullName.replace(/^(MR\.?|MRS\.?|MS\.?|DR\.?|PROF\.?)\s+/i, '').trim();
  // Remove non-alpha noise
  fullName = fullName.replace(/[^A-Za-z\s\-'.]/g, '').trim();
  
  const parts = fullName.split(/\s+/).filter(p => p.length >= 1);
  if (parts.length === 0) return;
  
  if (parts.length === 1) {
    r.firstName = parts[0];
  } else if (parts.length === 2) {
    r.firstName = parts[0];
    r.lastName = parts[1];
  } else {
    // Last word is lastName, rest is firstName
    r.lastName = parts[parts.length - 1];
    r.firstName = parts.slice(0, -1).join(' ');
  }
}

// ═══════════════════════════════════════════════════════════
// STRATEGY 1: MRZ (ICAO 9303 TD1 / TD2 / TD3)
// ═══════════════════════════════════════════════════════════

function correctMRZChar(ch, expectDigit) {
  if (expectDigit) {
    const map = { O: '0', o: '0', I: '1', l: '1', B: '8', S: '5', Z: '2', G: '6', D: '0' };
    return map[ch] || ch;
  }
  const map = { '0': 'O', '1': 'I', '8': 'B', '5': 'S', '2': 'Z', '6': 'G' };
  return map[ch] || ch;
}

function cleanMRZLine(raw) {
  return raw.replace(/\s/g, '').replace(/[^A-Z0-9<]/gi, '<');
}

function parseMRZ(lines) {
  const r = emptyResult();

  const candidates = [];
  for (let i = 0; i < lines.length; i++) {
    const cleaned = cleanMRZLine(lines[i]);
    if (cleaned.length >= 28 && /^[A-Z0-9<]{28,}$/i.test(cleaned)) {
      candidates.push({ line: cleaned.toUpperCase(), idx: i, len: cleaned.length });
    }
  }

  if (candidates.length < 1) return r;

  let format = null;
  let mrzLines = [];

  // Try TD3: find P< line (44 chars)
  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    if ((c.line.startsWith('P') && c.line.includes('<')) && c.len >= 40) {
      format = 'TD3';
      mrzLines = [c.line];
      for (let j = i + 1; j < candidates.length; j++) {
        if (candidates[j].len >= 40) {
          mrzLines.push(candidates[j].line);
          break;
        }
      }
      break;
    }
  }

  // Try TD1: 3 consecutive short lines
  if (!format && candidates.length >= 3) {
    for (let i = 0; i < candidates.length - 2; i++) {
      if (candidates[i].len >= 28 && candidates[i].len <= 34 &&
          candidates[i+1].len >= 28 && candidates[i+1].len <= 34 &&
          candidates[i+2].len >= 28 && candidates[i+2].len <= 34) {
        format = 'TD1';
        mrzLines = [candidates[i].line, candidates[i+1].line, candidates[i+2].line];
        break;
      }
    }
  }

  // Try TD2: 2 lines of ~36 chars
  if (!format && candidates.length >= 2) {
    for (let i = 0; i < candidates.length - 1; i++) {
      if (candidates[i].len >= 34 && candidates[i].len <= 40 &&
          candidates[i+1].len >= 34 && candidates[i+1].len <= 40) {
        format = 'TD2';
        mrzLines = [candidates[i].line, candidates[i+1].line];
        break;
      }
    }
  }

  // Fallback
  if (!format && candidates.length >= 2) {
    format = 'TD3';
    mrzLines = [candidates[0].line, candidates[1].line];
  }

  if (mrzLines.length < 2) return r;

  console.log(`[OCR] MRZ format: ${format}, lines: ${mrzLines.length}`);
  mrzLines.forEach((l, i) => console.log(`[OCR] MRZ[${i}]: ${l}`));

  if (format === 'TD3') return parseTD3(mrzLines, r);
  if (format === 'TD1') return parseTD1(mrzLines, r);
  if (format === 'TD2') return parseTD2(mrzLines, r);

  return r;
}

function parseTD3(mrzLines, r) {
  const line1 = mrzLines[0];
  const line2 = mrzLines.length > 1 ? mrzLines[1] : '';

  if (line1.startsWith('P')) {
    const issuing = line1.substring(2, 5).replace(/</g, '');
    r.country = issuing;
    const nameSection = line1.substring(5);
    const parts = nameSection.split(/<<+/).filter(Boolean);
    if (parts.length >= 1) r.lastName = parts[0].replace(/</g, ' ').trim();
    if (parts.length >= 2) r.firstName = parts.slice(1).join(' ').replace(/</g, ' ').trim();
  }

  if (line2.length >= 28) {
    let ppNum = line2.substring(0, 9).replace(/</g, '');
    const corrected = [];
    for (let i = 0; i < ppNum.length; i++) {
      if (i < 2 && /[A-Z]/i.test(ppNum[i])) corrected.push(ppNum[i]);
      else corrected.push(correctMRZChar(ppNum[i], true));
    }
    r.passportNumber = corrected.join('');

    const dobRaw = line2.substring(13, 19);
    const dob = correctMRZDate(dobRaw);
    if (dob) r.birthDate = mrzDateToISO(dob, true);

    const sex = line2.charAt(20);
    if (sex === 'M') { r.gender = 'Male'; r.title = 'MR'; }
    else if (sex === 'F') { r.gender = 'Female'; r.title = 'MS'; }

    const expRaw = line2.substring(21, 27);
    const exp = correctMRZDate(expRaw);
    if (exp) r.expiryDate = mrzDateToISO(exp, false);
  }

  return r;
}

function parseTD1(mrzLines, r) {
  const line1 = mrzLines[0];
  const line2 = mrzLines[1];
  const line3 = mrzLines[2];

  if (line1.length >= 14) {
    r.country = line1.substring(2, 5).replace(/</g, '');
    r.passportNumber = line1.substring(5, 14).replace(/</g, '');
  }

  if (line2.length >= 18) {
    const dobRaw = line2.substring(0, 6);
    const dob = correctMRZDate(dobRaw);
    if (dob) r.birthDate = mrzDateToISO(dob, true);
    const sex = line2.charAt(7);
    if (sex === 'M') { r.gender = 'Male'; r.title = 'MR'; }
    else if (sex === 'F') { r.gender = 'Female'; r.title = 'MS'; }
    const expRaw = line2.substring(8, 14);
    const exp = correctMRZDate(expRaw);
    if (exp) r.expiryDate = mrzDateToISO(exp, false);
    const nat = line2.substring(15, 18).replace(/</g, '');
    if (nat && !r.country) r.country = nat;
  }

  if (line3) {
    const parts = line3.split(/<<+/).filter(Boolean);
    if (parts.length >= 1) r.lastName = parts[0].replace(/</g, ' ').trim();
    if (parts.length >= 2) r.firstName = parts.slice(1).join(' ').replace(/</g, ' ').trim();
  }

  return r;
}

function parseTD2(mrzLines, r) {
  const line1 = mrzLines[0];
  const line2 = mrzLines[1];

  if (line1.length >= 5) {
    r.country = line1.substring(2, 5).replace(/</g, '');
    const nameSection = line1.substring(5);
    const parts = nameSection.split(/<<+/).filter(Boolean);
    if (parts.length >= 1) r.lastName = parts[0].replace(/</g, ' ').trim();
    if (parts.length >= 2) r.firstName = parts.slice(1).join(' ').replace(/</g, ' ').trim();
  }

  if (line2 && line2.length >= 28) {
    r.passportNumber = line2.substring(0, 9).replace(/</g, '');
    const dobRaw = line2.substring(13, 19);
    const dob = correctMRZDate(dobRaw);
    if (dob) r.birthDate = mrzDateToISO(dob, true);
    const sex = line2.charAt(20);
    if (sex === 'M') { r.gender = 'Male'; r.title = 'MR'; }
    else if (sex === 'F') { r.gender = 'Female'; r.title = 'MS'; }
    const expRaw = line2.substring(21, 27);
    const exp = correctMRZDate(expRaw);
    if (exp) r.expiryDate = mrzDateToISO(exp, false);
  }

  return r;
}

function correctMRZDate(raw) {
  if (!raw || raw.length < 6) return null;
  let corrected = '';
  for (let i = 0; i < 6; i++) corrected += correctMRZChar(raw[i], true);
  if (/^\d{6}$/.test(corrected)) return corrected;
  return null;
}

function mrzDateToISO(yymmdd, isBirthDate) {
  const yy = parseInt(yymmdd.substring(0, 2));
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  let year = isBirthDate ? (yy > 30 ? 1900 + yy : 2000 + yy) : 2000 + yy;
  return `${year}-${mm}-${dd}`;
}

// ═══════════════════════════════════════════════════════════
// STRATEGY 3: UNIVERSAL LABELED FIELD EXTRACTION
// ═══════════════════════════════════════════════════════════

const LABEL_PATTERNS = {
  surname: [
    /(?:বংশগত\s*নাম\s*[\/\|]?\s*)?SURNAME/i,
    /FAMILY\s*NAME/i, /LAST\s*NAME/i, /NOM\s*(?:DE\s*FAMILLE)?/i,
    /APELLIDO/i, /NACHNAME/i,
  ],
  givenName: [
    /(?:প্রদত্ত\s*নাম\s*[\/\|]?\s*)?GIVEN\s*NAME/i,
    /FIRST\s*NAME/i, /FORENAME/i, /PR[EÉ]NOM/i, /NOMBRE/i, /VORNAME/i,
  ],
  passportNumber: [
    /(?:পাসপোর্ট\s*(?:নং|নম্বর)\s*[\/\|]?\s*)?PASSPORT\s*(?:NO|NUMBER|#|N[°º])/i,
    /DOCUMENT\s*(?:NO|NUMBER)/i,
    /(?:নং\s*[\/\|]?\s*)?NO\s*(?:DU\s*)?PASSEPORT/i,
  ],
  nationality: [
    /(?:জাতীয়তা\s*[\/\|]?\s*)?NATIONALITY/i,
    /NATIONALIT[ÉE]/i, /CIUDADAN[ÍI]A/i,
  ],
  countryCode: [
    /(?:দেশ\s*কোড\s*[\/\|]?\s*)?COUNTRY\s*CODE/i,
    /CODE\s*(?:DU\s*)?PAYS/i,
  ],
  dateOfBirth: [
    /(?:জন্ম\s*তারিখ\s*[\/\|]?\s*)?DATE\s*OF\s*BIRTH/i,
    /D\.?O\.?B\.?/i, /BIRTH\s*DATE/i, /DATE\s*DE\s*NAISSANCE/i,
    /FECHA\s*DE\s*NACIMIENTO/i, /GEBURTSDATUM/i,
  ],
  sex: [
    /(?:লিঙ্গ\s*[\/\|]?\s*)?SEX/i, /GENDER/i, /SEXE/i, /GESCHLECHT/i,
  ],
  placeOfBirth: [
    /(?:জন্মস্থান\s*[\/\|]?\s*)?PLACE\s*OF\s*BIRTH/i,
    /BIRTH\s*PLACE/i, /LIEU\s*DE\s*NAISSANCE/i, /LUGAR\s*DE\s*NACIMIENTO/i,
  ],
  dateOfIssue: [
    /(?:প্রদানের\s*তারিখ\s*[\/\|]?\s*)?DATE\s*OF\s*ISSUE/i,
    /ISSUE\s*DATE/i, /ISSUANCE\s*DATE/i, /ISSUED/i,
    /DATE\s*DE\s*D[ÉE]LIVRANCE/i,
  ],
  dateOfExpiry: [
    /(?:মেয়াদোত্তীর্ণের\s*তারিখ\s*[\/\|]?\s*)?DATE\s*OF\s*EXPIR/i,
    /EXPIRY\s*(?:DATE)?/i, /EXPIRATION\s*(?:DATE)?/i, /EXP\.?\s*DATE/i,
    /DATE\s*D['']EXPIRATION/i, /VALID\s*UNTIL/i,
  ],
};

function parseLabeledFields(lines) {
  const r = emptyResult();
  const indexed = lines.map((text, i) => ({ text, upper: text.toUpperCase(), i }));

  r.lastName = findLabeledValue(indexed, LABEL_PATTERNS.surname, 'name') || '';
  r.firstName = findLabeledValue(indexed, LABEL_PATTERNS.givenName, 'name') || '';

  const ppRaw = findLabeledValue(indexed, LABEL_PATTERNS.passportNumber, 'passport') || '';
  if (ppRaw) {
    const m = ppRaw.match(/([A-Z]{0,3}\d{5,10})/i) || ppRaw.match(/([A-Z0-9]{7,12})/i);
    r.passportNumber = m ? m[1].toUpperCase() : ppRaw;
  }

  const nat = findLabeledValue(indexed, LABEL_PATTERNS.nationality, 'text') || '';
  if (nat) r.country = nat;
  if (!r.country) {
    const cc = findLabeledValue(indexed, LABEL_PATTERNS.countryCode, 'text') || '';
    if (cc) r.country = cc.replace(/[^A-Z]/gi, '').substring(0, 3);
  }

  const dobStr = findLabeledValue(indexed, LABEL_PATTERNS.dateOfBirth, 'date') || '';
  if (dobStr) r.birthDate = normalizeDate(dobStr);

  const sexStr = findLabeledValue(indexed, LABEL_PATTERNS.sex, 'gender') || '';
  if (sexStr) {
    const su = sexStr.toUpperCase().trim();
    if (su === 'M' || su.startsWith('MALE') || su.startsWith('MASCULIN')) { r.gender = 'Male'; r.title = 'MR'; }
    else if (su === 'F' || su.startsWith('FEMALE') || su.startsWith('FEMININ') || su.startsWith('FÉMININ')) { r.gender = 'Female'; r.title = 'MS'; }
  }

  r.birthPlace = findBirthPlaceFromLabels(indexed) || '';

  const issStr = findLabeledValue(indexed, LABEL_PATTERNS.dateOfIssue, 'date') || '';
  if (issStr) r.issuanceDate = normalizeDate(issStr);

  const expStr = findLabeledValue(indexed, LABEL_PATTERNS.dateOfExpiry, 'date') || '';
  if (expStr) r.expiryDate = normalizeDate(expStr);

  return r;
}

function findBirthPlaceFromLabels(indexed) {
  const patterns = LABEL_PATTERNS.placeOfBirth;
  for (const pat of patterns) {
    for (let i = 0; i < indexed.length; i++) {
      const line = indexed[i].text;
      const match = line.match(pat);
      if (!match) continue;
      let after = line.substring(match.index + match[0].length);
      after = after.replace(/^[\s:\/\|,\-–—]+/, '').replace(/^[^\x20-\x7E]+\s*/, '').trim();
      if (after.length >= 3 && isValidPlaceName(after)) return after;
      for (let j = i + 1; j < Math.min(i + 5, indexed.length); j++) {
        let nextLine = indexed[j].text.trim();
        if (isLabelLine(nextLine)) continue;
        if (isHeaderNoise(nextLine)) continue;
        nextLine = nextLine.replace(/^[^\x20-\x7E]+\s*/, '').trim();
        nextLine = nextLine.replace(/^\d+\s*/, '').trim();
        if (nextLine.length >= 3 && isValidPlaceName(nextLine)) return nextLine;
      }
    }
  }
  return '';
}

function isValidPlaceName(text) {
  const clean = text.replace(/[^A-Za-z\s\-',]/g, '').trim();
  if (clean.length < 2) return false;
  const u = clean.toUpperCase();
  const rejectValues = ['M', 'F', 'MALE', 'FEMALE', 'MR', 'MS', 'MRS', 'SEX', 'GENDER',
    'PASSPORT', 'TYPE', 'CODE', 'DATE', 'BIRTH', 'ISSUE', 'EXPIRY', 'NUMBER',
    'PERSONAL', 'EMERGENCY', 'CONTACT', 'DATA', 'AUTHORITY', 'DIP'];
  if (rejectValues.includes(u)) return false;
  if (!/[A-Za-z]{2,}/.test(clean)) return false;
  return true;
}

function findLabeledValue(indexed, patterns, valueType = 'text') {
  for (const pat of patterns) {
    for (let i = 0; i < indexed.length; i++) {
      const line = indexed[i].text;
      const match = line.match(pat);
      if (!match) continue;
      let after = line.substring(match.index + match[0].length);
      after = after.replace(/^[\s:\/\|,\-–—]+/, '').replace(/^[^\x20-\x7E]+\s*/, '').trim();
      if (after.length >= 1 && !isHeaderNoise(after) && isValidFieldValue(after, valueType)) return after;
      for (let j = i + 1; j < Math.min(i + 4, indexed.length); j++) {
        let nextLine = indexed[j].text.trim();
        if (isLabelLine(nextLine)) continue;
        nextLine = nextLine.replace(/^[^\x20-\x7E]+\s*/, '').trim();
        if (nextLine.length >= 1 && !isHeaderNoise(nextLine) && isValidFieldValue(nextLine, valueType)) return nextLine;
      }
    }
  }
  return '';
}

function isValidFieldValue(value, type) {
  if (!value || value.length === 0) return false;
  switch (type) {
    case 'name': return /[A-Za-z]{2,}/.test(value) && !isLabelLine(value);
    case 'date': return /\d/.test(value);
    case 'passport': return /\d/.test(value);
    case 'gender': return true;
    default: return true;
  }
}

function isLabelLine(text) {
  const u = text.toUpperCase();
  const labelWords = ['SURNAME', 'GIVEN', 'NAME', 'PASSPORT', 'DATE', 'BIRTH', 'SEX', 'GENDER',
    'PLACE', 'ISSUE', 'EXPIRY', 'EXPIRATION', 'NATIONALITY', 'COUNTRY', 'CODE', 'TYPE',
    'PERSONAL', 'PREVIOUS', 'ISSUING', 'AUTHORITY', 'NUMBER', 'HOLDER'];
  const words = u.split(/\s+/);
  const labelCount = words.filter(w => labelWords.includes(w)).length;
  return labelCount >= Math.ceil(words.length * 0.6) && words.length <= 5;
}

function isHeaderNoise(text) {
  const u = text.toUpperCase();
  const noise = [
    'PERSONAL DATA AND EMERGENCY', 'EMERGENCY CONTACT', "PEOPLE'S REPUBLIC",
    'REPUBLIC OF BANGLADESH', 'MACHINE READABLE', 'TRAVEL DOCUMENT', 'GOVERNMENT OF',
  ];
  return noise.some(n => u.includes(n));
}

// ═══════════════════════════════════════════════════════════
// STRATEGY 4: HEURISTIC / CONTEXTUAL EXTRACTION
// ═══════════════════════════════════════════════════════════

function parseHeuristic(lines, upper, fullText) {
  const r = emptyResult();

  // Passport number by pattern
  for (const line of lines) {
    const u = line.toUpperCase().replace(/\s/g, '');
    if (u.length > 30 && /^[A-Z0-9<]+$/.test(u)) continue;
    if (isHeaderNoise(line)) continue;
    const ppMatch = line.match(/\b([A-Z]{1,3}\d{6,9})\b/i);
    if (ppMatch && !r.passportNumber) r.passportNumber = ppMatch[1].toUpperCase();
  }

  // Gender
  if (/\bFEMALE\b/.test(upper)) { r.gender = 'Female'; r.title = 'MS'; }
  else if (/\bMALE\b/.test(upper) && !/FEMALE/.test(upper)) { r.gender = 'Male'; r.title = 'MR'; }

  // Country
  detectCountry(upper, r);

  // Birth place via district lookup (BD) + contextual search + Bangla
  if (!r.birthPlace) r.birthPlace = findBirthPlace(lines, upper, fullText);

  // Date extraction with context-aware assignment
  const allDates = extractAllDates(lines);
  assignDatesByContext(allDates, r);

  return r;
}

function detectCountry(upper, r) {
  const countryPatterns = [
    [/BANGLADES/i, 'BD'], [/\bINDIA\b/i, 'IN'], [/\bPAKISTAN/i, 'PK'],
    [/\bNEPAL/i, 'NP'], [/\bSRI\s*LANKA/i, 'LK'], [/\bMYANMAR/i, 'MM'],
    [/\bUNITED STATES/i, 'US'], [/\bUNITED KINGDOM/i, 'GB'], [/\bCANAD/i, 'CA'],
    [/\bAUSTRALI/i, 'AU'], [/\bMALAYSI/i, 'MY'], [/\bSINGAPORE/i, 'SG'],
    [/\bPHILIPPIN/i, 'PH'], [/\bTHAILAND/i, 'TH'], [/\bINDONESI/i, 'ID'],
    [/\bCHINA/i, 'CN'], [/\bJAPAN/i, 'JP'], [/\bKOREA/i, 'KR'],
    [/\bSAUDI/i, 'SA'], [/\bEMIRAT|\bUAE\b/i, 'AE'], [/\bKUWAIT/i, 'KW'],
    [/\bQATAR/i, 'QA'], [/\bBAHRAIN/i, 'BH'], [/\bOMAN\b/i, 'OM'],
    [/\bTURK/i, 'TR'], [/\bEGYPT/i, 'EG'], [/\bGERMAN/i, 'DE'],
    [/\bFRANC/i, 'FR'], [/\bITAL/i, 'IT'], [/\bSPAIN\b|ESPAÑOL/i, 'ES'],
  ];
  for (const [pat, code] of countryPatterns) {
    if (pat.test(upper)) { r.country = code; return; }
  }
}

function extractAllDates(lines) {
  const dates = [];
  for (const line of lines) {
    const u = line.toUpperCase();
    if (u.replace(/\s/g, '').length > 30 && /^[A-Z0-9<]+$/.test(u.replace(/\s/g, ''))) continue;
    if (isHeaderNoise(line)) continue;

    const pat1 = /(\d{1,2})\s+([A-Z]{3})\s+(\d{4})/gi;
    let m;
    while ((m = pat1.exec(line)) !== null) {
      const d = normalizeDate(m[0]);
      if (d) dates.push({ normalized: d, context: u, raw: m[0] });
    }

    const pat2 = /(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/g;
    while ((m = pat2.exec(line)) !== null) {
      const d = normalizeDate(m[0]);
      if (d) dates.push({ normalized: d, context: u, raw: m[0] });
    }
  }
  return dates;
}

function assignDatesByContext(dates, r) {
  for (const d of dates) {
    const ctx = d.context;
    if (!r.birthDate && /BIRTH/i.test(ctx)) r.birthDate = d.normalized;
    else if (!r.issuanceDate && /ISSUE/i.test(ctx)) r.issuanceDate = d.normalized;
    else if (!r.expiryDate && (/EXPIR/i.test(ctx) || /VALID/i.test(ctx))) r.expiryDate = d.normalized;
  }

  const used = new Set([r.birthDate, r.issuanceDate, r.expiryDate].filter(Boolean));
  const remaining = [...new Set(dates.map(d => d.normalized).filter(d => !used.has(d)))].sort();

  if (!r.birthDate && remaining.length >= 1) r.birthDate = remaining[0];
  if (!r.issuanceDate && remaining.length >= 2) r.issuanceDate = remaining[1];
  if (!r.expiryDate && remaining.length >= 3) r.expiryDate = remaining[2];
}

// ═══════════════════════════════════════════════════════════
// BIRTH PLACE — BD districts + contextual + Bangla
// ═══════════════════════════════════════════════════════════

const BD_DISTRICTS = [
  'BAGERHAT','BANDARBAN','BARGUNA','BARISAL','BARISHAL','BHOLA','BOGRA','BOGURA',
  'BRAHMANBARIA','CHANDPUR','CHAPAINAWABGANJ','CHATTOGRAM','CHITTAGONG','CHUADANGA',
  'COMILLA','CUMILLA',"COX'S BAZAR",'COXS BAZAR','DHAKA','DINAJPUR','FARIDPUR',
  'FENI','GAIBANDHA','GAZIPUR','GOPALGANJ','HABIGANJ','JAMALPUR','JESSORE','JASHORE',
  'JHALOKATHI','JHALOKATI','JHENAIDAH','JOYPURHAT','KHAGRACHARI','KHULNA','KISHOREGANJ',
  'KURIGRAM','KUSHTIA','LAKSHMIPUR','LALMONIRHAT','MADARIPUR','MAGURA','MANIKGANJ',
  'MEHERPUR','MOULVIBAZAR','MUNSHIGANJ','MYMENSINGH','NAOGAON','NARAIL','NARAYANGANJ',
  'NARSINGDI','NATORE','NETROKONA','NILPHAMARI','NOAKHALI','PABNA','PANCHAGARH',
  'PATUAKHALI','PIROJPUR','RAJBARI','RAJSHAHI','RANGAMATI','RANGPUR','SATKHIRA',
  'SHARIATPUR','SHERPUR','SIRAJGANJ','SUNAMGANJ','SYLHET','TANGAIL','THAKURGAON',
  'MIRPUR','UTTARA','GULSHAN','DHANMONDI','MOHAMMADPUR','MOTIJHEEL','LALBAGH',
];

function findBirthPlace(lines, upper, fullText) {
  // Strategy A: Bangla birth place label
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/জন্ম(?:স্থান|Ūান|Ūান)/.test(line)) {
      const after = line.replace(/.*জন্ম(?:স্থান|Ūান|Ūান)\s*[:：.]*\s*/, '').trim();
      const translated = translateBanglaPlace(after);
      if (translated) return translated;
      // Check next lines
      for (let j = i + 1; j < Math.min(i + 3, lines.length); j++) {
        const t = translateBanglaPlace(lines[j].trim());
        if (t) return t;
      }
    }
  }

  // Strategy B: "Place of Birth" label
  for (let i = 0; i < lines.length; i++) {
    const u = lines[i].toUpperCase();
    if (/PLACE\s*OF\s*BIRTH|BIRTH\s*PLACE/i.test(u)) {
      const after = u.replace(/.*(?:PLACE\s*OF\s*BIRTH|BIRTH\s*PLACE)\s*[:\s\/]*/i, '').trim();
      const cleanedAfter = after.replace(/^\s*[MF]\s*$/i, '').replace(/\d+/g, '').trim();
      if (cleanedAfter.length >= 3 && isValidPlaceName(cleanedAfter)) return titleCase(cleanedAfter);
      for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
        let next = lines[j].replace(/^[^\x20-\x7E]+\s*/, '').trim().replace(/^\d+\s*/, '').trim();
        if (next.length < 2 || isLabelLine(next) || isHeaderNoise(next)) continue;
        if (/^\d{1,2}\s*[\/\-\.]\s*\d{1,2}/.test(next)) continue;
        if (/^(M|F|MALE|FEMALE)$/i.test(next.trim())) continue;
        if (next.length >= 2 && isValidPlaceName(next)) {
          for (const d of BD_DISTRICTS) {
            if (next.toUpperCase().includes(d)) return titleCase(d);
          }
          return titleCase(next);
        }
      }
    }
  }

  // Strategy C: Bangla place names anywhere in document
  if (fullText) {
    for (const [bangla, english] of Object.entries(BANGLA_PLACE_MAP)) {
      if (fullText.includes(bangla)) {
        // Only use if it's near birth-related context
        const idx = fullText.indexOf(bangla);
        const context = fullText.substring(Math.max(0, idx - 100), idx + 50);
        if (/জন্ম|birth/i.test(context)) return english;
      }
    }
  }

  // Strategy D: Known BD district names anywhere
  for (const d of BD_DISTRICTS) {
    const regex = new RegExp(`\\b${d.replace(/['\s]/g, "[\\s']?")}\\b`, 'i');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (isHeaderNoise(line)) continue;
      if (/EMERGENCY|PERMANENT\s*ADDRESS|FATHER|MOTHER|SPOUSE/i.test(line)) continue;
      if (regex.test(line.toUpperCase())) {
        let nearBirthLabel = false;
        for (let k = Math.max(0, i - 3); k <= Math.min(lines.length - 1, i + 1); k++) {
          if (/PLACE\s*OF\s*BIRTH|BIRTH\s*PLACE|জন্মস্থান|জন্মŪান/i.test(lines[k])) {
            nearBirthLabel = true; break;
          }
        }
        if (nearBirthLabel) return titleCase(d);
      }
    }
  }

  // Strategy E: Bangla place name anywhere (no context requirement — last resort for NID)
  if (fullText) {
    for (const [bangla, english] of Object.entries(BANGLA_PLACE_MAP)) {
      if (fullText.includes(bangla)) return english;
    }
  }

  return '';
}

// ═══════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════

function emptyResult() {
  return {
    title: '', firstName: '', lastName: '', country: '', countryCode: '',
    passportNumber: '', birthDate: '', birthPlace: '',
    gender: '', issuanceDate: '', expiryDate: '',
  };
}

/** Pick best value for NID — NID strategy gets highest priority */
function mergePickNID(field, nidVal, labelVal, heuristicVal, mrzVal) {
  const nv = (nidVal || '').trim();
  const lv = (labelVal || '').trim();
  const hv = (heuristicVal || '').trim();
  const mv = (mrzVal || '').trim();

  // For NID: NID strategy first, then labels, then heuristic, then MRZ
  if (field === 'passportNumber') {
    // For NID, prefer the NID number (longer digit sequences)
    if (nv && /^\d{8,17}$/.test(nv)) return nv;
    if (lv && /\d{5,}/.test(lv)) return lv;
    if (hv && /\d{5,}/.test(hv)) return hv;
    return nv || lv || hv || mv || '';
  }

  if (field === 'firstName' || field === 'lastName') {
    if (nv && nv.length >= 2 && /[A-Za-z]{2,}/.test(nv)) return nv;
    if (lv && lv.length >= 2 && /[A-Za-z]{2,}/.test(lv)) return lv;
    return nv || lv || hv || mv || '';
  }

  if (field === 'birthPlace') {
    if (nv && nv.length >= 2) return nv;
    if (hv && hv.length >= 2) return hv;
    if (lv && lv.length >= 2) return lv;
    return nv || hv || lv || '';
  }

  if (field.includes('Date') || field.includes('date')) {
    const isValid = v => /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (isValid(nv)) return nv;
    if (isValid(lv)) return lv;
    if (isValid(hv)) return hv;
    return nv || lv || hv || mv || '';
  }

  // Default: NID first
  return nv || lv || hv || mv || '';
}

/** Pick best value for passport — MRZ is king */
function mergePick(field, mrzVal, labelVal, heuristicVal) {
  const mv = (mrzVal || '').trim();
  const lv = (labelVal || '').trim();
  const hv = (heuristicVal || '').trim();

  if (field === 'passportNumber') {
    const isGoodPP = v => /^[A-Z]{1,3}\d{5,10}$/.test(v);
    if (isGoodPP(mv)) return mv;
    if (isGoodPP(lv)) return lv;
    if (isGoodPP(hv)) return hv;
    return mv || lv || hv || '';
  }

  if (field === 'firstName' || field === 'lastName') {
    if (mv && mv.length >= 2 && /^[A-Z\s]+$/i.test(mv) && !isHeaderNoise(mv)) return mv;
    if (lv && lv.length >= 2 && lv.length <= 40 && /^[A-Z\s.\-']+$/i.test(lv) && !isHeaderNoise(lv)) return lv;
    return mv || lv || hv || '';
  }

  if (field === 'birthPlace') {
    if (lv && lv.length >= 2 && isValidPlaceName(lv)) return lv;
    if (hv && hv.length >= 2 && isValidPlaceName(hv)) return hv;
    return lv || hv || '';
  }

  if (field.includes('Date') || field.includes('date')) {
    const isValidDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (isValidDate(lv)) return lv;
    if (isValidDate(mv)) return mv;
    if (isValidDate(hv)) return hv;
    return lv || mv || hv || '';
  }

  return mv || lv || hv || '';
}

function normalizeDate(dateStr) {
  if (!dateStr) return '';
  // Convert any remaining Bangla digits
  dateStr = convertBanglaNumbers(dateStr);

  const months = {
    JAN:'01', FEB:'02', MAR:'03', APR:'04', MAY:'05', JUN:'06',
    JUL:'07', AUG:'08', SEP:'09', OCT:'10', NOV:'11', DEC:'12',
    JANUARY:'01', FEBRUARY:'02', MARCH:'03', APRIL:'04',
    JUNE:'06', JULY:'07', AUGUST:'08', SEPTEMBER:'09',
    OCTOBER:'10', NOVEMBER:'11', DECEMBER:'12',
  };

  // "04 Jul 1997" or "4 JUL 1997"
  const m1 = dateStr.match(/(\d{1,2})\s*[\/\-\.\s]\s*([A-Z]+)\s*[\/\-\.\s]\s*(\d{4})/i);
  if (m1) {
    const dd = m1[1].padStart(2, '0');
    const mm = months[m1[2].toUpperCase()] || null;
    if (mm) return `${m1[3]}-${mm}-${dd}`;
  }

  // "Jul 04, 1997"
  const m1b = dateStr.match(/([A-Z]+)\s+(\d{1,2}),?\s*(\d{4})/i);
  if (m1b) {
    const dd = m1b[2].padStart(2, '0');
    const mm = months[m1b[1].toUpperCase()] || null;
    if (mm) return `${m1b[3]}-${mm}-${dd}`;
  }

  // "19/02/2024" or "19-02-2024"
  const m2 = dateStr.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{4})/);
  if (m2) {
    const dd = m2[1].padStart(2, '0');
    const mm = m2[2].padStart(2, '0');
    return `${m2[3]}-${mm}-${dd}`;
  }

  // "2024-02-19"
  const m3 = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (m3) return m3[0];

  // "19/02/24"
  const m4 = dateStr.match(/(\d{1,2})\s*[\/\-\.]\s*(\d{1,2})\s*[\/\-\.]\s*(\d{2})/);
  if (m4) {
    const dd = m4[1].padStart(2, '0');
    const mm = m4[2].padStart(2, '0');
    const yy = parseInt(m4[3]);
    const yyyy = yy > 50 ? 1900 + yy : 2000 + yy;
    return `${yyyy}-${mm}-${dd}`;
  }

  return '';
}

function validateDate(d) {
  if (!d || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return d || '';
  const [y, m, dd] = d.split('-').map(Number);
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || dd < 1 || dd > 31) return '';
  return d;
}

function cleanDocNumber(pp) {
  if (!pp) return '';
  return pp.replace(/[^A-Z0-9]/gi, '').toUpperCase();
}

function cleanName(name) {
  if (!name) return '';
  name = name.replace(/[^A-Za-z\s\-'.]/g, '').trim();
  name = name.replace(/^[A-Z]\s+(?=[A-Z]{2})/i, '');
  const noiseWords = [
    'PERSONAL', 'DATA', 'EMERGENCY', 'CONTACT', 'PASSPORT', 'REPUBLIC',
    'BANGLADESH', 'PEOPLES', 'TYPE', 'CODE', 'COUNTRY', 'NUMBER',
    'GOVERNMENT', 'MACHINE', 'READABLE', 'ZONE', 'DOCUMENT', 'TRAVEL',
    'NATIONAL', 'IDENTITY', 'CARD', 'SMART',
  ];
  const words = name.split(/\s+/).filter(w => !noiseWords.includes(w.toUpperCase()));
  name = words.join(' ').trim();
  if (name.length > 45) name = name.substring(0, 45).trim();
  return name;
}

function cleanPlace(place) {
  if (!place) return '';
  // Don't strip non-ASCII if it's already a translated English name
  if (/^[A-Za-z\s,\-']+$/.test(place)) {
    return titleCase(place.trim());
  }
  place = place.replace(/[^A-Za-z\s,\-']/g, '').trim();
  const noise = ['PERSONAL', 'DATA', 'EMERGENCY', 'CONTACT', 'PASSPORT', 'REPUBLIC',
    'BANGLADESH', 'SEX', 'MALE', 'FEMALE', 'ISSUING', 'AUTHORITY', 'M', 'F'];
  const words = place.split(/\s+/).filter(w => !noise.includes(w.toUpperCase()));
  place = words.join(' ').trim();
  if (place.length <= 1) return '';
  if (place.length > 30) place = place.substring(0, 30).trim();
  return titleCase(place);
}

/**
 * Resolve any country input (2-letter, 3-letter, full name, demonym) 
 * into { name: "Full Country Name", code3: "XXX" }
 */
function resolveCountryFull(c) {
  const empty = { name: '', code3: '' };
  if (!c) return empty;
  c = c.replace(/[^A-Z]/gi, '').toUpperCase();
  if (!c) return empty;

  const COUNTRIES = {
    BD:['Bangladesh','BGD'], BGD:['Bangladesh','BGD'], BANGLADESH:['Bangladesh','BGD'], BANGLADESHI:['Bangladesh','BGD'],
    IN:['India','IND'], IND:['India','IND'], INDIA:['India','IND'], INDIAN:['India','IND'],
    US:['United States','USA'], USA:['United States','USA'], UNITEDSTATES:['United States','USA'], AMERICAN:['United States','USA'],
    GB:['United Kingdom','GBR'], GBR:['United Kingdom','GBR'], UNITEDKINGDOM:['United Kingdom','GBR'], BRITISH:['United Kingdom','GBR'],
    PK:['Pakistan','PAK'], PAK:['Pakistan','PAK'], PAKISTAN:['Pakistan','PAK'], PAKISTANI:['Pakistan','PAK'],
    NP:['Nepal','NPL'], NPL:['Nepal','NPL'], NEPAL:['Nepal','NPL'], NEPALESE:['Nepal','NPL'], NEPALI:['Nepal','NPL'],
    LK:['Sri Lanka','LKA'], LKA:['Sri Lanka','LKA'], SRILANKA:['Sri Lanka','LKA'], SRILANKAN:['Sri Lanka','LKA'],
    MM:['Myanmar','MMR'], MMR:['Myanmar','MMR'], MYANMAR:['Myanmar','MMR'], BURMA:['Myanmar','MMR'],
    MY:['Malaysia','MYS'], MYS:['Malaysia','MYS'], MALAYSIA:['Malaysia','MYS'], MALAYSIAN:['Malaysia','MYS'],
    SG:['Singapore','SGP'], SGP:['Singapore','SGP'], SINGAPORE:['Singapore','SGP'], SINGAPOREAN:['Singapore','SGP'],
    AE:['United Arab Emirates','ARE'], ARE:['United Arab Emirates','ARE'], UAE:['United Arab Emirates','ARE'],
    SA:['Saudi Arabia','SAU'], SAU:['Saudi Arabia','SAU'], SAUDIARABIA:['Saudi Arabia','SAU'], SAUDI:['Saudi Arabia','SAU'],
    KW:['Kuwait','KWT'], KWT:['Kuwait','KWT'], KUWAIT:['Kuwait','KWT'], KUWAITI:['Kuwait','KWT'],
    QA:['Qatar','QAT'], QAT:['Qatar','QAT'], QATAR:['Qatar','QAT'], QATARI:['Qatar','QAT'],
    BH:['Bahrain','BHR'], BHR:['Bahrain','BHR'], BAHRAIN:['Bahrain','BHR'], BAHRAINI:['Bahrain','BHR'],
    OM:['Oman','OMN'], OMN:['Oman','OMN'], OMAN:['Oman','OMN'], OMANI:['Oman','OMN'],
    CA:['Canada','CAN'], CAN:['Canada','CAN'], CANADA:['Canada','CAN'], CANADIAN:['Canada','CAN'],
    AU:['Australia','AUS'], AUS:['Australia','AUS'], AUSTRALIA:['Australia','AUS'], AUSTRALIAN:['Australia','AUS'],
    JP:['Japan','JPN'], JPN:['Japan','JPN'], JAPAN:['Japan','JPN'], JAPANESE:['Japan','JPN'],
    KR:['South Korea','KOR'], KOR:['South Korea','KOR'], KOREA:['South Korea','KOR'], KOREAN:['South Korea','KOR'],
    CN:['China','CHN'], CHN:['China','CHN'], CHINA:['China','CHN'], CHINESE:['China','CHN'],
    TH:['Thailand','THA'], THA:['Thailand','THA'], THAILAND:['Thailand','THA'], THAI:['Thailand','THA'],
    ID:['Indonesia','IDN'], IDN:['Indonesia','IDN'], INDONESIA:['Indonesia','IDN'], INDONESIAN:['Indonesia','IDN'],
    PH:['Philippines','PHL'], PHL:['Philippines','PHL'], PHILIPPINES:['Philippines','PHL'], FILIPINO:['Philippines','PHL'],
    TR:['Turkey','TUR'], TUR:['Turkey','TUR'], TURKEY:['Turkey','TUR'], TURKISH:['Turkey','TUR'], TURKIYE:['Turkey','TUR'],
    EG:['Egypt','EGY'], EGY:['Egypt','EGY'], EGYPT:['Egypt','EGY'], EGYPTIAN:['Egypt','EGY'],
    DE:['Germany','DEU'], DEU:['Germany','DEU'], GERMANY:['Germany','DEU'], GERMAN:['Germany','DEU'],
    FR:['France','FRA'], FRA:['France','FRA'], FRANCE:['France','FRA'], FRENCH:['France','FRA'],
    IT:['Italy','ITA'], ITA:['Italy','ITA'], ITALY:['Italy','ITA'], ITALIAN:['Italy','ITA'],
    ES:['Spain','ESP'], ESP:['Spain','ESP'], SPAIN:['Spain','ESP'], SPANISH:['Spain','ESP'],
    NL:['Netherlands','NLD'], NLD:['Netherlands','NLD'], NETHERLANDS:['Netherlands','NLD'], DUTCH:['Netherlands','NLD'],
    BE:['Belgium','BEL'], BEL:['Belgium','BEL'], BELGIUM:['Belgium','BEL'],
    CH:['Switzerland','CHE'], CHE:['Switzerland','CHE'], SWITZERLAND:['Switzerland','CHE'], SWISS:['Switzerland','CHE'],
    SE:['Sweden','SWE'], SWE:['Sweden','SWE'], SWEDEN:['Sweden','SWE'],
    NO:['Norway','NOR'], NOR:['Norway','NOR'], NORWAY:['Norway','NOR'],
    DK:['Denmark','DNK'], DNK:['Denmark','DNK'], DENMARK:['Denmark','DNK'],
    FI:['Finland','FIN'], FIN:['Finland','FIN'], FINLAND:['Finland','FIN'],
    IE:['Ireland','IRL'], IRL:['Ireland','IRL'], IRELAND:['Ireland','IRL'],
    PT:['Portugal','PRT'], PRT:['Portugal','PRT'], PORTUGAL:['Portugal','PRT'],
    GR:['Greece','GRC'], GRC:['Greece','GRC'], GREECE:['Greece','GRC'],
    PL:['Poland','POL'], POL:['Poland','POL'], POLAND:['Poland','POL'],
    RO:['Romania','ROU'], ROU:['Romania','ROU'], ROMANIA:['Romania','ROU'],
    RU:['Russia','RUS'], RUS:['Russia','RUS'], RUSSIA:['Russia','RUS'],
    BR:['Brazil','BRA'], BRA:['Brazil','BRA'], BRAZIL:['Brazil','BRA'],
    MX:['Mexico','MEX'], MEX:['Mexico','MEX'], MEXICO:['Mexico','MEX'],
    AR:['Argentina','ARG'], ARG:['Argentina','ARG'], ARGENTINA:['Argentina','ARG'],
    CO:['Colombia','COL'], COL:['Colombia','COL'], COLOMBIA:['Colombia','COL'],
    ZA:['South Africa','ZAF'], ZAF:['South Africa','ZAF'], SOUTHAFRICA:['South Africa','ZAF'],
    NG:['Nigeria','NGA'], NGA:['Nigeria','NGA'], NIGERIA:['Nigeria','NGA'],
    KE:['Kenya','KEN'], KEN:['Kenya','KEN'], KENYA:['Kenya','KEN'],
    ET:['Ethiopia','ETH'], ETH:['Ethiopia','ETH'], ETHIOPIA:['Ethiopia','ETH'],
    GH:['Ghana','GHA'], GHA:['Ghana','GHA'], GHANA:['Ghana','GHA'],
    AF:['Afghanistan','AFG'], AFG:['Afghanistan','AFG'], AFGHANISTAN:['Afghanistan','AFG'],
    IQ:['Iraq','IRQ'], IRQ:['Iraq','IRQ'], IRAQ:['Iraq','IRQ'],
    IR:['Iran','IRN'], IRN:['Iran','IRN'], IRAN:['Iran','IRN'],
    JO:['Jordan','JOR'], JOR:['Jordan','JOR'], JORDAN:['Jordan','JOR'],
    LB:['Lebanon','LBN'], LBN:['Lebanon','LBN'], LEBANON:['Lebanon','LBN'],
    SY:['Syria','SYR'], SYR:['Syria','SYR'], SYRIA:['Syria','SYR'],
    YE:['Yemen','YEM'], YEM:['Yemen','YEM'], YEMEN:['Yemen','YEM'],
    VN:['Vietnam','VNM'], VNM:['Vietnam','VNM'], VIETNAM:['Vietnam','VNM'],
    KH:['Cambodia','KHM'], KHM:['Cambodia','KHM'], CAMBODIA:['Cambodia','KHM'],
    LA:['Laos','LAO'], LAO:['Laos','LAO'], LAOS:['Laos','LAO'],
    BT:['Bhutan','BTN'], BTN:['Bhutan','BTN'], BHUTAN:['Bhutan','BTN'],
    MV:['Maldives','MDV'], MDV:['Maldives','MDV'], MALDIVES:['Maldives','MDV'],
  };

  const match = COUNTRIES[c];
  if (match) return { name: match[0], code3: match[1] };
  // Unknown code — return as-is
  if (c.length === 3) return { name: c, code3: c };
  if (c.length === 2) return { name: c, code3: c };
  return { name: c, code3: '' };
}

function normalizeCountryCode(c) {
  return resolveCountryFull(c).name;
}

function titleCase(str) {
  if (!str) return '';
  return str.split(/\s+/).map(w =>
    w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()
  ).join(' ');
}
