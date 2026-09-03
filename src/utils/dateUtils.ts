// Month names array
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

/**
 * Returns ordinal suffix for a given day (1 -> "1st", 2 -> "2nd", 3 -> "3rd", 4 -> "4th", 21 -> "21st", etc.)
 */
export function getOrdinalSuffix(day: number): string {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
}

/**
 * Converts any date representation (ISO string, JS Date, Excel serial number, date string)
 * into a formatted legal date string with ordinal suffix: e.g., "18th May 2025" or "30th November 2023".
 */
export function formatLegalDate(input: any): string {
  if (input === null || input === undefined || input === '') {
    return '';
  }

  // If already in ordinal format like "30th November 2023" or "1st November 2020"
  if (typeof input === 'string' && /\b\d{1,2}(st|nd|rd|th)\s+[A-Za-z]+\s+\d{4}\b/i.test(input.trim())) {
    return input.trim();
  }

  let dateObj: Date | null = null;

  // Check for Excel Serial Number (e.g., 44136)
  if (typeof input === 'number' && input > 10000 && input < 90000) {
    // Excel base date is Dec 30, 1899 due to the 1900 leap year bug in Lotus 1-2-3
    const utcDays = input - 25569;
    const utcValue = utcDays * 86400;
    const dateInfo = new Date(utcValue * 1000);
    dateObj = new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate());
  } else if (input instanceof Date && !isNaN(input.getTime())) {
    dateObj = input;
  } else if (typeof input === 'string') {
    const trimmed = input.trim();
    
    // Check if it's a numeric string that could be an Excel serial
    if (/^\d{5}$/.test(trimmed)) {
      const serial = parseInt(trimmed, 10);
      const utcDays = serial - 25569;
      const utcValue = utcDays * 86400;
      const dateInfo = new Date(utcValue * 1000);
      dateObj = new Date(dateInfo.getFullYear(), dateInfo.getMonth(), dateInfo.getDate());
    } else {
      // Try standard Date parsing (e.g. ISO string "2025-05-18T09:16:00.000Z" or "2023-11-30")
      const parsed = new Date(trimmed);
      if (!isNaN(parsed.getTime())) {
        dateObj = parsed;
      } else {
        // Try parsing DD/MM/YYYY or DD-MM-YYYY
        const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
        if (dmyMatch) {
          const day = parseInt(dmyMatch[1], 10);
          const month = parseInt(dmyMatch[2], 10) - 1;
          const year = parseInt(dmyMatch[3], 10);
          dateObj = new Date(year, month, day);
        }
      }
    }
  }

  if (!dateObj || isNaN(dateObj.getTime())) {
    return typeof input === 'string' ? input : String(input || '');
  }

  const day = dateObj.getDate();
  const suffix = getOrdinalSuffix(day);
  const month = MONTH_NAMES[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${day}${suffix} ${month} ${year}`;
}

/**
 * Formats numeric or string term into legal wording: e.g. "3" -> "Three (3) years"
 */
export function formatLegalTerm(term: string | number | undefined): string {
  if (!term) return 'Three (3) years';
  const str = String(term).trim();
  
  // If already formatted like "Three (3) years" or "Two (2) years"
  if (/^[A-Za-z]+\s*\(\d+\)\s*years?/i.test(str)) {
    return str;
  }

  const numMatch = str.match(/\b(\d+)\b/);
  if (numMatch) {
    const num = parseInt(numMatch[1], 10);
    const words = [
      'Zero', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'
    ];
    const word = words[num] || `${num}`;
    return `${word} (${num}) years`;
  }

  return str.includes('year') ? str : `${str} years`;
}

/**
 * Normalizes revenue share representation (e.g. 50% or 0.5 -> "50%")
 */
export function formatRevenueShare(rev: string | number | undefined): string {
  if (rev === null || rev === undefined || rev === '') return '50%';
  
  if (typeof rev === 'number') {
    if (rev > 0 && rev <= 1) {
      return `${Math.round(rev * 100)}%`;
    }
    return `${rev}%`;
  }

  const str = String(rev).trim();
  if (str.endsWith('%')) {
    return str;
  }

  const num = parseFloat(str);
  if (!isNaN(num)) {
    if (num > 0 && num <= 1) {
      return `${Math.round(num * 100)}%`;
    }
    return `${num}%`;
  }

  return str;
}
