// src/data/eras.ts
export type Era = {
  id: string;
  label: string;
  start: number;
  end: number;
  hint?: string;
};

export const ERAS: Era[] = [
  { id: "1700s", label: "1700s", start: 1700, end: 1799, hint: "Enlightenment, early industrial" },
  { id: "1800s", label: "1800s", start: 1800, end: 1899, hint: "Empires, rail, telegraph" },
  { id: "1900s", label: "1900s", start: 1900, end: 1999, hint: "World wars, Cold War" },
  { id: "2000s", label: "2000s", start: 2000, end: 2009 },
  { id: "2010s", label: "2010s", start: 2010, end: 2019 },
  { id: "2020s", label: "2020s", start: 2020, end: 2029 },
];
