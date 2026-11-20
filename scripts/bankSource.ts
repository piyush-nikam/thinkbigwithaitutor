// Hand-authored source for the static BODMAS question bank.
// Numeric questions are fully computed by code (answers AND distractors), text questions are
// reviewed by hand. `npm run bank:build` validates everything and writes shared/bank/bodmas.json.

export const TAGS: Record<string, string> = {
  add_before_sub: "Treats addition as higher priority than subtraction",
  mul_before_div: "Treats multiplication as higher priority than division",
  left_to_right_ignore_precedence: "Works strictly left to right, ignoring that × and ÷ outrank + and −",
  right_to_left_chain: "Works a chain of subtractions or divisions from right to left",
  brackets_ignored: "Ignores brackets and evaluates as if they were not there",
  brackets_not_first: "Does not realise brackets must be worked out before everything else",
  bracket_swallows_rest: "Believes a bracket extends to the end of the expression",
  orders_after_multiplication: "Does × or ÷ before applying the power (order)",
  power_as_multiplication: "Reads a power such as 3² as 3 × 2",
  add_before_everything: "Does all additions first, whatever the other operations are",
  bodmas_as_strict_sequence: "Believes each letter of BODMAS is its own step, so A always comes before S",
  equal_priority_means_simultaneous: "Thinks operations with equal priority are done at the same time instead of left to right",
  operations_any_order: "Believes operations can be done in any order without changing the answer",
  operation_order_by_size: "Chooses what to do first by the size of the numbers instead of the rules",
};

export interface TextRow {
  expression: string;
  /** For spot_mistake: the full prompt. Otherwise the prompt is built from the expression. */
  prompt?: string;
  correct: string;
  wrongs: Array<[text: string, tag: string]>;
  hint: string;
  explanation: string;
}

export interface NumericRow {
  expression: string;
  wrongs: Array<[expression: string, tag: string]>;
  hint: string;
  explanation: string;
}

export const WHICH_FIRST: TextRow[] = [
  {
    expression: "10 − 3 + 2",
    correct: "Subtraction (10 − 3): + and − are equals, so they go left to right",
    wrongs: [
      ["Addition (3 + 2): adding is more important than subtracting", "add_before_sub"],
      ["Addition (3 + 2): A comes before S in BODMAS", "bodmas_as_strict_sequence"],
      ["Both together, because they have equal priority", "equal_priority_means_simultaneous"],
    ],
    hint: "Addition and subtraction share one step. What do you do when operations tie?",
    explanation: "+ and − share a step, so work left to right: 10 − 3 = 7, then 7 + 2 = 9.",
  },
  {
    expression: "24 ÷ 4 × 2",
    correct: "Division (24 ÷ 4): ÷ and × are equals, so they go left to right",
    wrongs: [
      ["Multiplication (4 × 2): × is stronger than ÷", "mul_before_div"],
      ["Multiplication (4 × 2): start from the right-hand end", "right_to_left_chain"],
      ["Both together, because they have equal priority", "equal_priority_means_simultaneous"],
    ],
    hint: "Division and multiplication share one step. Which one is on the left?",
    explanation: "÷ and × tie, so go left to right: 24 ÷ 4 = 6, then 6 × 2 = 12.",
  },
  {
    expression: "5 + 3 × 2",
    correct: "Multiplication (3 × 2): × outranks +",
    wrongs: [
      ["Addition (5 + 3): we always start at the left", "left_to_right_ignore_precedence"],
      ["Addition (5 + 3): additions are done first", "add_before_everything"],
      ["Either one: the answer is the same", "operations_any_order"],
    ],
    hint: "Which operation sits on the higher step of the staircase?",
    explanation: "× is on a higher step than +, so 3 × 2 = 6 first, then 5 + 6 = 11.",
  },
  {
    expression: "12 − 2 × 3",
    correct: "Multiplication (2 × 3): × outranks −",
    wrongs: [
      ["Subtraction (12 − 2): left to right", "left_to_right_ignore_precedence"],
      ["Either one: the answer is the same", "operations_any_order"],
      ["Subtraction (12 − 2): it starts with the biggest number", "operation_order_by_size"],
    ],
    hint: "Compare the steps for × and −. Which is higher?",
    explanation: "× outranks −: 2 × 3 = 6, then 12 − 6 = 6.",
  },
  {
    expression: "8 + (6 − 2) × 3",
    correct: "Subtraction (6 − 2): brackets come first",
    wrongs: [
      ["Addition (8 + 6): we always start at the left", "left_to_right_ignore_precedence"],
      ["Multiplication (2 × 3): the brackets can be ignored", "brackets_ignored"],
      ["Addition (8 + 6): additions are done first", "add_before_everything"],
    ],
    hint: "Brackets are the top step of the staircase.",
    explanation: "Brackets first: 6 − 2 = 4, then 4 × 3 = 12, then 8 + 12 = 20.",
  },
  {
    expression: "3 + 4²",
    correct: "Squaring (4²): orders come before addition",
    wrongs: [
      ["Addition (3 + 4): we always start at the left", "left_to_right_ignore_precedence"],
      ["Multiplication (4 × 2): 4² means 4 × 2", "power_as_multiplication"],
      ["Addition (3 + 4): additions are done first", "add_before_everything"],
    ],
    hint: "Orders (powers) sit above addition on the staircase.",
    explanation: "Orders first: 4² = 16, then 3 + 16 = 19.",
  },
  {
    expression: "2 × 3²",
    correct: "Squaring (3²): orders come before multiplication",
    wrongs: [
      ["Multiplication (2 × 3): × comes before the power", "orders_after_multiplication"],
      ["Multiplication (2 × 3): we always start at the left", "left_to_right_ignore_precedence"],
      ["Multiplication (3 × 2): 3² means 3 × 2", "power_as_multiplication"],
    ],
    hint: "The power belongs only to the 3. Which step is higher, orders or ×?",
    explanation: "Orders first: 3² = 9, then 2 × 9 = 18.",
  },
  {
    expression: "20 − 5 − 3",
    correct: "20 − 5: a chain of subtractions goes left to right",
    wrongs: [
      ["5 − 3: work from the right-hand end", "right_to_left_chain"],
      ["Both together, since they are the same operation", "equal_priority_means_simultaneous"],
      ["5 − 3: start with the smaller numbers", "operation_order_by_size"],
    ],
    hint: "Same operation twice in a row. Which direction do ties go?",
    explanation: "Left to right: 20 − 5 = 15, then 15 − 3 = 12.",
  },
  {
    expression: "48 ÷ 6 ÷ 2",
    correct: "48 ÷ 6: a chain of divisions goes left to right",
    wrongs: [
      ["6 ÷ 2: work from the right-hand end", "right_to_left_chain"],
      ["Both together, since they are the same operation", "equal_priority_means_simultaneous"],
      ["6 ÷ 2: start with the smaller numbers", "operation_order_by_size"],
    ],
    hint: "Same operation twice in a row. Which direction do ties go?",
    explanation: "Left to right: 48 ÷ 6 = 8, then 8 ÷ 2 = 4.",
  },
  {
    expression: "7 + 8 ÷ 4",
    correct: "Division (8 ÷ 4): ÷ outranks +",
    wrongs: [
      ["Addition (7 + 8): we always start at the left", "left_to_right_ignore_precedence"],
      ["Addition (7 + 8): additions are done first", "add_before_everything"],
      ["Either one: the answer is the same", "operations_any_order"],
    ],
    hint: "Which sits on the higher step: ÷ or +?",
    explanation: "÷ outranks +: 8 ÷ 4 = 2, then 7 + 2 = 9.",
  },
  {
    expression: "(9 − 4) × 2 + 1",
    correct: "Subtraction (9 − 4): brackets come first",
    wrongs: [
      ["Multiplication (4 × 2): × outranks − and the brackets can be ignored", "brackets_ignored"],
      ["Addition (2 + 1): additions are done first", "add_before_everything"],
      ["Multiplication of the whole bracket by 2: × outranks everything", "brackets_not_first"],
    ],
    hint: "Look for the brackets. They are always worked out first.",
    explanation: "Brackets first: 9 − 4 = 5, then 5 × 2 = 10, then 10 + 1 = 11.",
  },
  {
    expression: "2 + 6 ÷ 3 × 2",
    correct: "Division (6 ÷ 3): ÷ and × tie and go left to right, and both outrank +",
    wrongs: [
      ["Multiplication (3 × 2): × is stronger than ÷", "mul_before_div"],
      ["Addition (2 + 6): we always start at the left", "left_to_right_ignore_precedence"],
      ["Addition (2 + 6): additions are done first", "add_before_everything"],
    ],
    hint: "First decide which step is higher, then settle the tie left to right.",
    explanation: "6 ÷ 3 = 2, then 2 × 2 = 4, then 2 + 4 = 6.",
  },
];

export const NEXT_STEP: TextRow[] = [
  {
    expression: "8 + (6 − 2) × 3",
    correct: "6 − 2 = 4",
    wrongs: [
      ["8 + 6 = 14", "left_to_right_ignore_precedence"],
      ["2 × 3 = 6", "brackets_ignored"],
      ["8 + 6 − 2 = 12", "add_before_everything"],
    ],
    hint: "Find the bracket. It is the top step.",
    explanation: "Brackets first: 6 − 2 = 4, then 4 × 3 = 12, then 8 + 12 = 20.",
  },
  {
    expression: "5 + 2 × 3²",
    correct: "3² = 9",
    wrongs: [
      ["5 + 2 = 7", "left_to_right_ignore_precedence"],
      ["2 × 3 = 6, then square the result", "orders_after_multiplication"],
      ["Read 3² as 3 × 2 = 6", "power_as_multiplication"],
    ],
    hint: "Orders (powers) come before × and +.",
    explanation: "3² = 9, then 2 × 9 = 18, then 5 + 18 = 23.",
  },
  {
    expression: "30 − 4 × (2 + 3)",
    correct: "2 + 3 = 5",
    wrongs: [
      ["30 − 4 = 26", "left_to_right_ignore_precedence"],
      ["4 × 2 = 8", "brackets_ignored"],
      ["Multiply 4 by the bracket first, then work inside it", "brackets_not_first"],
    ],
    hint: "Work out the inside of the bracket before anything touches it.",
    explanation: "2 + 3 = 5, then 4 × 5 = 20, then 30 − 20 = 10.",
  },
  {
    expression: "18 ÷ 3 × 2 − 4",
    correct: "18 ÷ 3 = 6",
    wrongs: [
      ["3 × 2 = 6", "mul_before_div"],
      ["2 − 4 = −2", "right_to_left_chain"],
      ["Any step first: the order does not matter", "operations_any_order"],
    ],
    hint: "÷ and × tie, and ties go left to right. Both outrank −.",
    explanation: "18 ÷ 3 = 6, then 6 × 2 = 12, then 12 − 4 = 8.",
  },
  {
    expression: "7 + 3 × 4 − 2",
    correct: "3 × 4 = 12",
    wrongs: [
      ["7 + 3 = 10", "left_to_right_ignore_precedence"],
      ["4 − 2 = 2", "right_to_left_chain"],
      ["Any step first: the order does not matter", "operations_any_order"],
    ],
    hint: "Multiplication is on a higher step than + and −.",
    explanation: "3 × 4 = 12, then 7 + 12 = 19, then 19 − 2 = 17.",
  },
  {
    expression: "(2 + 3)² − 4",
    correct: "2 + 3 = 5",
    wrongs: [
      ["3² = 9", "brackets_ignored"],
      ["2 + 3 − 4 = 1", "bracket_swallows_rest"],
      ["Any step first: the order does not matter", "operations_any_order"],
    ],
    hint: "The bracket holds only 2 + 3, and it comes first.",
    explanation: "2 + 3 = 5, then 5² = 25, then 25 − 4 = 21.",
  },
  {
    expression: "40 ÷ (2 + 3) × 2",
    correct: "2 + 3 = 5",
    wrongs: [
      ["40 ÷ 2 = 20", "brackets_ignored"],
      ["3 × 2 = 6", "mul_before_div"],
      ["Any step first: the order does not matter", "operations_any_order"],
    ],
    hint: "Brackets sit above ÷ and ×.",
    explanation: "2 + 3 = 5, then 40 ÷ 5 = 8, then 8 × 2 = 16.",
  },
  {
    expression: "6 + 4 ÷ 2",
    correct: "4 ÷ 2 = 2",
    wrongs: [
      ["6 + 4 = 10, because we always start at the left", "left_to_right_ignore_precedence"],
      ["6 + 4 = 10, because additions go first", "add_before_everything"],
      ["Any step first: the order does not matter", "operations_any_order"],
    ],
    hint: "Which is on the higher step, ÷ or +?",
    explanation: "4 ÷ 2 = 2, then 6 + 2 = 8.",
  },
  {
    expression: "2 × (3 + 4) − 5",
    correct: "3 + 4 = 7",
    wrongs: [
      ["2 × 3 = 6", "brackets_ignored"],
      ["4 − 5 = −1", "right_to_left_chain"],
      ["Any step first: the order does not matter", "operations_any_order"],
    ],
    hint: "Spot the brackets and start inside them.",
    explanation: "3 + 4 = 7, then 2 × 7 = 14, then 14 − 5 = 9.",
  },
  {
    expression: "9 − 3 × 2²",
    correct: "2² = 4",
    wrongs: [
      ["9 − 3 = 6", "left_to_right_ignore_precedence"],
      ["3 × 2 = 6, then square it", "orders_after_multiplication"],
      ["Any step first: the order does not matter", "operations_any_order"],
    ],
    hint: "Orders are above × and −.",
    explanation: "2² = 4, then 3 × 4 = 12, then 9 − 12 = −3.",
  },
  {
    expression: "15 + 5 × 2 − 3",
    correct: "5 × 2 = 10",
    wrongs: [
      ["15 + 5 = 20", "left_to_right_ignore_precedence"],
      ["2 − 3 = −1", "right_to_left_chain"],
      ["Any step first: the order does not matter", "operations_any_order"],
    ],
    hint: "× is on a higher step than + and −.",
    explanation: "5 × 2 = 10, then 15 + 10 = 25, then 25 − 3 = 22.",
  },
  {
    expression: "(12 − 4) ÷ 2 + 3",
    correct: "12 − 4 = 8",
    wrongs: [
      ["4 ÷ 2 = 2", "brackets_ignored"],
      ["2 + 3 = 5", "add_before_everything"],
      ["Any step first: the order does not matter", "operations_any_order"],
    ],
    hint: "Brackets are the top step.",
    explanation: "12 − 4 = 8, then 8 ÷ 2 = 4, then 4 + 3 = 7.",
  },
];

export const SPOT_MISTAKE: TextRow[] = [
  {
    expression: "10 − 3 + 2",
    prompt: "Riya solved 10 − 3 + 2 and got 5. Her working: 3 + 2 = 5, then 10 − 5 = 5. What went wrong?",
    correct: "She added before subtracting. + and − are equals, so 10 − 3 comes first, giving 9",
    wrongs: [
      ["Nothing is wrong: addition is higher priority than subtraction, so 5 is right", "add_before_sub"],
      ["She should have worked from the right, so 5 is right", "right_to_left_chain"],
      ["Nothing is wrong: either order gives the same answer", "operations_any_order"],
    ],
    hint: "Check which operation Riya did first, and which direction ties go.",
    explanation: "Left to right: 10 − 3 = 7, then 7 + 2 = 9.",
  },
  {
    expression: "24 ÷ 4 × 2",
    prompt: "Riya solved 24 ÷ 4 × 2 and got 3. Her working: 4 × 2 = 8, then 24 ÷ 8 = 3. What went wrong?",
    correct: "She multiplied before dividing. ÷ and × are equals, so 24 ÷ 4 comes first, giving 12",
    wrongs: [
      ["Nothing is wrong: multiplication is higher priority than division, so 3 is right", "mul_before_div"],
      ["Nothing is wrong: either order gives the same answer", "operations_any_order"],
      ["She should have done 24 ÷ 4 and 4 × 2 at the same time", "equal_priority_means_simultaneous"],
    ],
    hint: "Look at which of ÷ and × is on the left.",
    explanation: "Left to right: 24 ÷ 4 = 6, then 6 × 2 = 12.",
  },
  {
    expression: "5 + 3 × 2",
    prompt: "Riya solved 5 + 3 × 2 and got 16. Her working: 5 + 3 = 8, then 8 × 2 = 16. What went wrong?",
    correct: "She added before multiplying. × outranks +, so 3 × 2 comes first, giving 11",
    wrongs: [
      ["Nothing is wrong: always work left to right, so 16 is right", "left_to_right_ignore_precedence"],
      ["Nothing is wrong: additions are always done first", "add_before_everything"],
      ["Nothing is wrong: any order gives the same answer", "operations_any_order"],
    ],
    hint: "Compare the steps of × and + on the staircase.",
    explanation: "× first: 3 × 2 = 6, then 5 + 6 = 11.",
  },
  {
    expression: "(2 + 3) × 4",
    prompt: "Riya solved (2 + 3) × 4 and got 14. Her working: 3 × 4 = 12, then 2 + 12 = 14. What went wrong?",
    correct: "She ignored the brackets. 2 + 3 must be worked out first, giving 5 × 4 = 20",
    wrongs: [
      ["Nothing is wrong: brackets only group numbers and can be skipped", "brackets_ignored"],
      ["Nothing is wrong: × outranks +, even with brackets", "brackets_not_first"],
      ["Nothing is wrong: any order gives the same answer", "operations_any_order"],
    ],
    hint: "What is the top step of the staircase?",
    explanation: "Brackets first: 2 + 3 = 5, then 5 × 4 = 20.",
  },
  {
    expression: "2 × 3²",
    prompt: "Riya solved 2 × 3² and got 36. Her working: 2 × 3 = 6, then 6² = 36. What went wrong?",
    correct: "She multiplied before squaring. 3² = 9 comes first, giving 2 × 9 = 18",
    wrongs: [
      ["Nothing is wrong: multiplication comes before powers", "orders_after_multiplication"],
      ["She should have read 3² as 3 × 2 = 6, giving 12", "power_as_multiplication"],
      ["Nothing is wrong: always work left to right", "left_to_right_ignore_precedence"],
    ],
    hint: "The little 2 belongs only to the 3.",
    explanation: "Orders first: 3² = 9, then 2 × 9 = 18.",
  },
  {
    expression: "4 + 3²",
    prompt: "Riya solved 4 + 3² and got 49. Her working: 4 + 3 = 7, then 7² = 49. What went wrong?",
    correct: "She added before squaring. 3² = 9 comes first, so 4 + 9 = 13",
    wrongs: [
      ["Nothing is wrong: always work left to right", "left_to_right_ignore_precedence"],
      ["Nothing is wrong: additions are always done first", "add_before_everything"],
      ["She should have read 3² as 3 × 2 = 6, giving 10", "power_as_multiplication"],
    ],
    hint: "Which belongs higher on the staircase, orders or addition?",
    explanation: "Orders first: 3² = 9, then 4 + 9 = 13.",
  },
  {
    expression: "20 − 5 − 3",
    prompt: "Riya solved 20 − 5 − 3 and got 18. Her working: 5 − 3 = 2, then 20 − 2 = 18. What went wrong?",
    correct: "She worked right to left. Subtractions go left to right: 20 − 5 = 15, then 15 − 3 = 12",
    wrongs: [
      ["Nothing is wrong: a chain is worked from the right", "right_to_left_chain"],
      ["Nothing is wrong: the order does not matter for subtraction", "operations_any_order"],
      ["Nothing is wrong: she correctly started with the smaller numbers", "operation_order_by_size"],
    ],
    hint: "Try both orders. Do they give the same answer?",
    explanation: "Left to right: 20 − 5 = 15, then 15 − 3 = 12.",
  },
  {
    expression: "48 ÷ 6 ÷ 2",
    prompt: "Riya solved 48 ÷ 6 ÷ 2 and got 16. Her working: 6 ÷ 2 = 3, then 48 ÷ 3 = 16. What went wrong?",
    correct: "She worked right to left. Divisions go left to right: 48 ÷ 6 = 8, then 8 ÷ 2 = 4",
    wrongs: [
      ["Nothing is wrong: a chain is worked from the right", "right_to_left_chain"],
      ["Nothing is wrong: any order works for division", "operations_any_order"],
      ["Nothing is wrong: she correctly started with the smaller numbers", "operation_order_by_size"],
    ],
    hint: "Ties are settled by reading left to right.",
    explanation: "Left to right: 48 ÷ 6 = 8, then 8 ÷ 2 = 4.",
  },
  {
    expression: "7 + 8 ÷ 4",
    prompt: "Riya solved 7 + 8 ÷ 4 and got 3.75. Her working: 7 + 8 = 15, then 15 ÷ 4 = 3.75. What went wrong?",
    correct: "She added before dividing. ÷ outranks +, so 8 ÷ 4 = 2 comes first, giving 9",
    wrongs: [
      ["Nothing is wrong: always work left to right", "left_to_right_ignore_precedence"],
      ["Nothing is wrong: additions are always done first", "add_before_everything"],
      ["Nothing is wrong: any order gives the same answer", "operations_any_order"],
    ],
    hint: "Which has more power on the staircase, ÷ or +?",
    explanation: "÷ first: 8 ÷ 4 = 2, then 7 + 2 = 9.",
  },
  {
    expression: "(9 − 4) × 2 + 1",
    prompt: "Riya solved (9 − 4) × 2 + 1 and got 2. Her working: 4 × 2 = 8, then 9 − 8 + 1 = 2. What went wrong?",
    correct: "She ignored the brackets. 9 − 4 = 5 comes first, giving 5 × 2 + 1 = 11",
    wrongs: [
      ["Nothing is wrong: brackets can be skipped", "brackets_ignored"],
      ["Nothing is wrong: × outranks −, even with brackets", "brackets_not_first"],
      ["Nothing is wrong: any order gives the same answer", "operations_any_order"],
    ],
    hint: "What did Riya do to the bracket?",
    explanation: "Brackets first: 9 − 4 = 5, then 5 × 2 = 10, then 10 + 1 = 11.",
  },
  {
    expression: "2 + 6 ÷ 3 × 2",
    prompt: "Riya solved 2 + 6 ÷ 3 × 2 and got 3. Her working: 3 × 2 = 6, then 6 ÷ 6 = 1, then 2 + 1 = 3. What went wrong?",
    correct: "She did × before ÷. They tie, so 6 ÷ 3 = 2, then 2 × 2 = 4, then 2 + 4 = 6",
    wrongs: [
      ["Nothing is wrong: × outranks ÷", "mul_before_div"],
      ["She should have done 2 + 6 first, since additions come first", "add_before_everything"],
      ["Nothing is wrong: any order gives the same answer", "operations_any_order"],
    ],
    hint: "Check the order in which she handled ÷ and ×.",
    explanation: "Left to right on the tie: 6 ÷ 3 = 2, then 2 × 2 = 4, then 2 + 4 = 6.",
  },
  {
    expression: "12 − 2 × 3",
    prompt: "Riya solved 12 − 2 × 3 and got 30. Her working: 12 − 2 = 10, then 10 × 3 = 30. What went wrong?",
    correct: "She subtracted before multiplying. × outranks −, so 2 × 3 = 6 comes first, giving 6",
    wrongs: [
      ["Nothing is wrong: always work left to right", "left_to_right_ignore_precedence"],
      ["Nothing is wrong: she correctly started with the bigger numbers", "operation_order_by_size"],
      ["Nothing is wrong: any order gives the same answer", "operations_any_order"],
    ],
    hint: "Compare the steps of × and −.",
    explanation: "× first: 2 × 3 = 6, then 12 − 6 = 6.",
  },
];

export const NUMERIC: NumericRow[] = [
  {
    expression: "10 − 4 + 2 × 3",
    wrongs: [
      ["(10 − 4 + 2) × 3", "left_to_right_ignore_precedence"],
      ["10 − (4 + 2 × 3)", "add_before_sub"],
      ["10 − (4 + 2) × 3", "add_before_everything"],
    ],
    hint: "Do the multiplication first, then + and − from left to right.",
    explanation: "2 × 3 = 6, then 10 − 4 = 6, then 6 + 6 = 12.",
  },
  {
    expression: "40 ÷ 5 × 2 + 4",
    wrongs: [
      ["40 ÷ (5 × 2) + 4", "mul_before_div"],
      ["40 ÷ 5 × (2 + 4)", "add_before_everything"],
    ],
    hint: "÷ and × tie, so go left to right. Add last.",
    explanation: "40 ÷ 5 = 8, then 8 × 2 = 16, then 16 + 4 = 20.",
  },
  {
    expression: "5 × (2 + 3) − 4",
    wrongs: [
      ["5 × 2 + 3 − 4", "brackets_ignored"],
      ["5 × (2 + 3 − 4)", "bracket_swallows_rest"],
    ],
    hint: "Start inside the bracket, and stop where the bracket stops.",
    explanation: "2 + 3 = 5, then 5 × 5 = 25, then 25 − 4 = 21.",
  },
  {
    expression: "2 + 3² × 2",
    wrongs: [
      ["2 + (3 × 2)²", "orders_after_multiplication"],
      ["(2 + 3)² × 2", "left_to_right_ignore_precedence"],
      ["2 + 3 × 2 × 2", "power_as_multiplication"],
    ],
    hint: "Square first, then multiply, then add.",
    explanation: "3² = 9, then 9 × 2 = 18, then 2 + 18 = 20.",
  },
  {
    expression: "60 − 20 − 10 + 5",
    wrongs: [
      ["60 − 20 − (10 + 5)", "add_before_sub"],
      ["60 − (20 − 10) + 5", "right_to_left_chain"],
    ],
    hint: "Only + and − here. Which direction do ties go?",
    explanation: "Left to right: 60 − 20 = 40, then 40 − 10 = 30, then 30 + 5 = 35.",
  },
  {
    expression: "48 ÷ 6 ÷ 2 + 1",
    wrongs: [
      ["48 ÷ (6 ÷ 2) + 1", "right_to_left_chain"],
      ["48 ÷ (6 ÷ 2 + 1)", "add_before_everything"],
    ],
    hint: "Divide left to right, then add.",
    explanation: "48 ÷ 6 = 8, then 8 ÷ 2 = 4, then 4 + 1 = 5.",
  },
  {
    expression: "6 + 18 ÷ 3 × 2",
    wrongs: [
      ["(6 + 18) ÷ 3 × 2", "left_to_right_ignore_precedence"],
      ["6 + 18 ÷ (3 × 2)", "mul_before_div"],
      ["(6 + 18) ÷ (3 × 2)", "add_before_everything"],
    ],
    hint: "÷ and × first (left to right), then add.",
    explanation: "18 ÷ 3 = 6, then 6 × 2 = 12, then 6 + 12 = 18.",
  },
  {
    expression: "(9 − 4) × 2 + 1",
    wrongs: [
      ["9 − 4 × 2 + 1", "brackets_ignored"],
      ["(9 − 4) × (2 + 1)", "add_before_everything"],
    ],
    hint: "Brackets first, then multiply, then add.",
    explanation: "9 − 4 = 5, then 5 × 2 = 10, then 10 + 1 = 11.",
  },
  {
    expression: "30 − 4 × (2 + 3)",
    wrongs: [
      ["(30 − 4) × (2 + 3)", "left_to_right_ignore_precedence"],
      ["30 − 4 × 2 + 3", "brackets_ignored"],
    ],
    hint: "Bracket, then multiply, then subtract.",
    explanation: "2 + 3 = 5, then 4 × 5 = 20, then 30 − 20 = 10.",
  },
  {
    expression: "2 × 3²",
    wrongs: [
      ["(2 × 3)²", "orders_after_multiplication"],
      ["2 × 3 × 2", "power_as_multiplication"],
    ],
    hint: "The power belongs to the 3 only.",
    explanation: "3² = 9, then 2 × 9 = 18.",
  },
  {
    expression: "100 ÷ 5² + 3",
    wrongs: [
      ["(100 ÷ 5)² + 3", "orders_after_multiplication"],
      ["100 ÷ 5 × 2 + 3", "power_as_multiplication"],
    ],
    hint: "Square the 5 first, then divide, then add.",
    explanation: "5² = 25, then 100 ÷ 25 = 4, then 4 + 3 = 7.",
  },
  {
    expression: "12 + 2 × (10 − 4) ÷ 3",
    wrongs: [
      ["(12 + 2) × (10 − 4) ÷ 3", "left_to_right_ignore_precedence"],
      ["(12 + 2 × (10 − 4)) ÷ 3", "add_before_everything"],
    ],
    hint: "Bracket first, then × and ÷ left to right, then add.",
    explanation: "10 − 4 = 6, then 2 × 6 = 12, then 12 ÷ 3 = 4, then 12 + 4 = 16.",
  },
  {
    expression: "18 − 3 × 4 + 6 ÷ 2",
    wrongs: [
      ["((18 − 3) × 4 + 6) ÷ 2", "left_to_right_ignore_precedence"],
      ["18 − 3 × (4 + 6) ÷ 2", "add_before_everything"],
    ],
    hint: "Do 3 × 4 and 6 ÷ 2 first, then work left to right.",
    explanation: "3 × 4 = 12 and 6 ÷ 2 = 3, then 18 − 12 = 6, then 6 + 3 = 9.",
  },
  {
    expression: "6 × 3 − 8 ÷ 2 + 5",
    wrongs: [
      ["((6 × 3 − 8) ÷ 2) + 5", "left_to_right_ignore_precedence"],
      ["6 × 3 − (8 ÷ 2 + 5)", "add_before_sub"],
    ],
    hint: "× and ÷ first, then + and − from left to right.",
    explanation: "6 × 3 = 18 and 8 ÷ 2 = 4, then 18 − 4 = 14, then 14 + 5 = 19.",
  },
];
