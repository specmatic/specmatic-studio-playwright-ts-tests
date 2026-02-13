export type CurrentPattern =
  | { mode: "exact"; value: string }
  | { mode: "keyOnly"; key: string }
  | { mode: "keyAndAnyNumber"; key: string };

export type Edit = {
  current: CurrentPattern;
  changeTo: string;
};
