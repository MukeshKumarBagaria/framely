// §8.3 Global interrupts — checked *before* state routing, in every language.
//
// These patterns are deliberately generous: a false "help" costs one escalation
// (cheap, and you wanted to read that thread anyway); a missed "help" costs a
// customer who thinks nobody is listening.
import type { Input } from "./normalize.ts";

const HELP = [
  /\b(agent|help|human|support|call|talk|complain)\b/i,
  /मदद|मदत|बात|बोला|एजेंट|शिकायत|तक्रार|फोन/, // hi / mr — both spellings of "help"
  /મદદ|વાત|ફરિયાદ/, // gu
  /సహాయం|మాట్లాడ|ఫిర్యాదు/, // te
  /உதவி|பேச|புகார்/, // ta
  /ಸಹಾಯ|ಮಾತನಾಡ|ದೂರು/, // kn
];

const RESTART = [
  /^\s*(restart|start over|reset|new order|fresh)\s*$/i,
  /फिर से|दुबारा|नया ऑर्डर/,
  /પુન:|ફરીથી|નવો ઓર્ડર/,
  /మళ్లీ|కొత్త ఆర్డర్/,
  /மீண்டும்|புதிய ஆர்டர்/,
  /ಮತ್ತೆ|ಹೊಸ ಆರ್ಡರ್/,
];

const UNDO = [
  /^\s*(undo|remove|delete last|back)\s*$/i,
  /^\s*(हटाओ|हटाएं|वापस)\s*$/,
  /^\s*(काढा|मागे)\s*$/,
  /^\s*(કાઢો|પાછું)\s*$/,
  /^\s*(తీసేయ్|వెనక్కి)\s*$/,
  /^\s*(நீக்கு|பின்)\s*$/,
  /^\s*(ತೆಗೆ|ಹಿಂದೆ)\s*$/,
];

const SKIP = /^\s*(skip|छोड़ें|छोड़|सोडा|છોડો|దాటవేయి|தவிர்|ಬಿಟ್ಟುಬಿಡಿ|-)\s*$/i;

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((re) => re.test(text));
}

export function isHelpRequest(input: Input): boolean {
  return input.kind === "text" && matchesAny(input.text, HELP);
}

export function isRestart(input: Input): boolean {
  return input.kind === "text" && matchesAny(input.text, RESTART);
}

export function isUndo(input: Input): boolean {
  return input.kind === "text" && matchesAny(input.text, UNDO);
}

export function isSkip(text: string): boolean {
  return SKIP.test(text);
}
