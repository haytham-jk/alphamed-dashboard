const INSTRUMENT_MATCHERS=[
 ["etp",/\bevolis\s+twin\s+plus\b/],
 ["evolis",/\bevolis\s+premium\b/],
 ["d100",/\bd\s*100\b/],["d10",/\bd\s*10\b/],["variant turbo",/\bvariant\s+turbo\b/],["variant ii",/\bvariant\s+(?:ii|2)\b/],["bioplex",/\bbio\s*plex\b/],["geenius",/\bgeenius\b/],["1wa",/\b1\s*wa\b/],
];
const SOURCE_FAMILIES=new Map([["ETP","etp"],["Evolis","evolis"]]);
export function normalizeInstrumentLabel(value){return String(value||"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
export function getInstrumentFamily(value){const exact=SOURCE_FAMILIES.get(String(value||"").trim());if(exact)return exact;const normalized=normalizeInstrumentLabel(value);return INSTRUMENT_MATCHERS.find(([,pattern])=>pattern.test(normalized))?.[0]||"";}
export function sourceMatchesInstrument(source,instrumentName){const family=getInstrumentFamily(source);return Boolean(family)&&family===getInstrumentFamily(instrumentName);}
