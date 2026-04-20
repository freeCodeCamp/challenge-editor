interface SuperBlock {
  title: string;
  intro: string[];
  blocks?: Record<string, { title: string }>;
  modules?: Record<string, string>;
  chapters?: Record<string, string>;
}

export interface Intro {
  [key: string]: SuperBlock;
}
