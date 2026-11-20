import type { DomainDef } from "./types";

export const BODMAS_TOPIC_ID = "bodmas";

// Only BODMAS has content for the MVP; everything else is a locked placeholder.
export const CATALOG: DomainDef[] = [
  {
    id: "maths",
    title: "Maths",
    topics: [
      { id: BODMAS_TOPIC_ID, title: "BODMAS: Order of Operations" },
      { id: "fractions", title: "Fractions", placeholder: true },
      { id: "percentages", title: "Percentages", placeholder: true },
    ],
  },
  { id: "science", title: "Science", placeholder: true, topics: [] },
  { id: "ai", title: "AI & Data", placeholder: true, topics: [] },
  { id: "coding", title: "Coding", placeholder: true, topics: [] },
];

/** Topics in learning order, used to unlock the next one after a pass. */
export function topicOrder(): string[] {
  return CATALOG.flatMap((d) => d.topics.map((t) => t.id));
}
