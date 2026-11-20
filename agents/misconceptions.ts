// Canonical misconception tags used as a naming guide for Agent 1 so the question
// bank and remedial lessons share one vocabulary (the same mistake always gets the same tag).
// Agent 1 may still invent a new snake_case tag when none of these fit.

export const CANONICAL_MISCONCEPTIONS: Array<{ tag: string; description: string }> = [
  { tag: "add_before_sub", description: "Treats addition as higher priority than subtraction (follows 'A before S' in the acronym)" },
  { tag: "mul_before_div", description: "Treats multiplication as higher priority than division (follows 'D before M' ordering wrongly)" },
  { tag: "left_to_right_ignore_precedence", description: "Works strictly left to right and ignores that multiplication/division outrank addition/subtraction" },
  { tag: "right_to_left_chain", description: "Evaluates a chain of subtractions or divisions from right to left" },
  { tag: "brackets_ignored", description: "Ignores brackets and evaluates the expression as if they were not there" },
  { tag: "bracket_swallows_rest", description: "Treats a bracket as extending to the end of the expression" },
  { tag: "orders_after_multiplication", description: "Multiplies before applying the power/order (e.g. reads 2 x 3^2 as (2 x 3)^2)" },
  { tag: "power_as_multiplication", description: "Reads a power such as 3^2 as 3 x 2" },
  { tag: "add_before_everything", description: "Does all additions first regardless of other operations" },
  { tag: "bodmas_as_strict_sequence", description: "Believes each letter of BODMAS is a separate step so D always beats M and A always beats S" },
];

export const CANONICAL_TAG_PROMPT = CANONICAL_MISCONCEPTIONS.map((m) => `- ${m.tag}: ${m.description}`).join("\n");

// Themes rotated through when generating the question bank, to keep it varied.
export const BANK_THEMES = [
  "equal priority of + and - (left to right), e.g. 10 - 3 + 2",
  "equal priority of x and / (left to right), e.g. 24 / 4 x 2",
  "multiplication/division before addition/subtraction",
  "brackets first, including nested brackets",
  "orders (powers/squares) before multiplication",
  "mixed expressions combining brackets, orders, x/ and +-",
  "subtraction chains such as 20 - 5 - 3",
  "division chains such as 48 / 6 / 2",
];
