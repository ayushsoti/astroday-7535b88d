/** Query understanding (Part O): question -> category, domains, event key, language. */

import { DOMAINS, EVENT_KEYS, type Domain } from "./constants";
import type { QueryContext } from "./types";

const ALL = [...DOMAINS];

interface Rule {
  re: RegExp;
  category: string;
  domains: Domain[];
  eventKey: string | null;
}

const RULES: Rule[] = [
  { re: /\b(loan|karza|karz|emi|debt|rin)\b/i, category: "MONEY / DEBT", domains: ["money"], eventKey: "debt_closure" },
  { re: /(shaadi|shadi|marriage|wife|husband|rishta|byah|vivah)/i, category: "MARRIAGE / RELATIONSHIP", domains: ["relationships"], eventKey: "marriage" },
  { re: /(breakup|break up|reconcil|patchup|divorce)/i, category: "MARRIAGE / RELATIONSHIP", domains: ["relationships"], eventKey: null },
  { re: /(ghar|flat|plot|property|makan|jameen|zameen)/i, category: "PROPERTY", domains: ["property"], eventKey: "property_purchase" },
  { re: /(gaadi|gadi|car|bike|vehicle|scooter)/i, category: "VEHICLE", domains: ["vehicle"], eventKey: "vehicle_purchase" },
  { re: /(business|dhandha|dhanda|startup|vyapar|dukaan)/i, category: "BUSINESS", domains: ["career", "money"], eventKey: null },
  { re: /(job|naukri|nokri|office|boss|promotion|career|kaam)/i, category: "CAREER / BUSINESS", domains: ["career"], eventKey: null },
  { re: /(baccha|bachcha|child|beta|beti|santan)/i, category: "FAMILY / CHILDREN", domains: ["family"], eventKey: "child_birth" },
  { re: /(papa|father|pita|dad)/i, category: "FAMILY / FATHER", domains: ["family"], eventKey: "father_related_event" },
  { re: /(mummy|mother|maa|mom)/i, category: "FAMILY / MOTHER", domains: ["family"], eventKey: "mother_related_event" },
  { re: /(padhai|padai|exam|course|study|education|padh)/i, category: "EDUCATION", domains: ["education"], eventKey: null },
  { re: /(court|legal|case|mukadma|kes)/i, category: "LEGAL", domains: ["legal"], eventKey: null },
  { re: /(health|bimari|bimaari|sehat|illness|tabiyat)/i, category: "HEALTH", domains: ["health"], eventKey: null },
  { re: /(paisa|paise|salary|income|paisaa|money|kamai)/i, category: "MONEY / DEBT", domains: ["money"], eventKey: null },
  { re: /(relationship|pyaar|pyar|love|prem|partner)/i, category: "MARRIAGE / RELATIONSHIP", domains: ["relationships"], eventKey: null },
  { re: /\b(aaj|today|abhi|ab)\b/i, category: "DAILY DECISION", domains: ALL, eventKey: null },
  { re: /\b(kab|when)\b/i, category: "TIMING", domains: ALL, eventKey: null },
];

const HINGLISH_TOKENS = /\b(aaj|kab|kya|karu|karun|kar|karo|karna|du|lunga|ka|ki|hai|hogi|hoga|mera|meri|mere|liye|abhi|bhai|yaar|paisa|paisaa|naukri|shaadi|ghar|gaadi|kaise|kaisa|theek|sahi|ho|raha|rahi)\b/i;

function detectLanguage(question: string): "english" | "hinglish" {
  return HINGLISH_TOKENS.test(question) ? "hinglish" : "english";
}

export function classify(question: string): QueryContext {
  const q = question.trim();
  const notes: string[] = [];
  for (const rule of RULES) {
    if (rule.re.test(q)) {
      const eventKey = rule.eventKey && EVENT_KEYS[rule.domains[0]]?.includes(rule.eventKey) ? rule.eventKey : rule.eventKey;
      return {
        question: q,
        category: rule.category,
        domains: rule.domains,
        eventKey,
        language: detectLanguage(q),
        notes,
      };
    }
  }
  notes.push("No keyword matched — scanning all domains (general life period).");
  return {
    question: q,
    category: "GENERAL LIFE PERIOD",
    domains: ALL,
    eventKey: null,
    language: detectLanguage(q),
    notes,
  };
}
