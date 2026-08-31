// Parses OSM `start_date` values, which are only loosely a date.
//
// Confidence tiers, in the order the UI should trust them:
//   'day'    — a real, day-precise date we believe
//   'month'  — month precision, or a YYYY-MM-01 that is probably month precision
//   'year'   — year only
//   'approx' — circa/decade/range/qualified: we know roughly when, not when
//   'none'   — could not be read at all
//
// The month-firsts caveat: across the global set the commonest "birthdays" are
// May 1, Mar 1, Jun 1 — month-precision records padded to -01. A YYYY-MM-01 is
// therefore NOT trusted as day-precise, and never appears in a day-of-year feed.

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/** @returns {{precision: string, year: number|null, month: number|null, day: number|null, approximate: boolean, raw: string, display: string}} */
export function parseStartDate(raw) {
  const value = String(raw ?? '').trim();
  const none = {
    precision: 'none', year: null, month: null, day: null,
    approximate: true, raw: value, display: value,
  };
  if (!value) return none;

  // Qualified or multi-valued: take the first date-looking thing, but never
  // claim more than year precision for it.
  const qualified = /(^|\s)(c\.?|ca\.?|circa|~|before|after|approx\.?|traditionally|first recorded)/i.test(value)
    || value.includes('..')
    || value.includes(';')
    || /\d{4}s\b/.test(value);

  // ISO-ish: YYYY, YYYY-MM, YYYY-MM-DD
  const iso = value.match(/^(\d{3,4})(?:-(\d{2})(?:-(\d{2}))?)?$/);
  if (iso) {
    const [, y, m, d] = iso;
    const year = Number(y);
    const month = m ? Number(m) : null;
    const day = d ? Number(d) : null;
    if (day !== null) {
      // A -01 day is far more often month precision padded out than a real 1st.
      const precision = day === 1 ? 'month' : 'day';
      return { precision, year, month, day: precision === 'day' ? day : null, approximate: false, raw: value, display: format(year, month, precision === 'day' ? day : null) };
    }
    if (month !== null) return { precision: 'month', year, month, day: null, approximate: false, raw: value, display: format(year, month, null) };
    return { precision: 'year', year, month: null, day: null, approximate: false, raw: value, display: String(year) };
  }

  // Dotted European form: DD.MM.YYYY
  const dotted = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted && !qualified) {
    const day = Number(dotted[1]);
    const month = Number(dotted[2]);
    const year = Number(dotted[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      const precision = day === 1 ? 'month' : 'day';
      return { precision, year, month, day: precision === 'day' ? day : null, approximate: false, raw: value, display: format(year, month, precision === 'day' ? day : null) };
    }
  }

  // Anything else: salvage a 3–4 digit year if one is in there.
  const year = value.match(/\b(\d{3,4})\b/);
  if (year) {
    return {
      precision: qualified ? 'approx' : 'year',
      year: Number(year[1]), month: null, day: null,
      approximate: qualified, raw: value, display: value,
    };
  }

  return none;
}

function format(year, month, day) {
  if (day) return `${day} ${cap(MONTHS[month - 1])} ${year}`;
  if (month) return `${cap(MONTHS[month - 1])} ${year}`;
  return String(year);
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

/** Human label for how much we trust a parsed start_date. */
export function confidenceLabel(parsed) {
  switch (parsed.precision) {
    case 'day': return 'exact date';
    case 'month': return 'month only';
    case 'year': return 'year only';
    case 'approx': return 'approximate';
    default: return 'unreadable';
  }
}
