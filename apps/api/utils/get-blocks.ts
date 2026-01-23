import { readFile } from "fs/promises";
import { join } from "path";

import {
  SUPERBLOCK_META_DIR,
  BLOCK_META_DIR,
  ENGLISH_LANG_DIR,
} from "../configs/paths";

import { SuperBlockMeta } from "../interfaces/superblock-meta";
import { PartialMeta } from "../interfaces/partial-meta";

import { Intro } from "../interfaces/intro";

type Block = {
  name: string;
  path: string;
};

type BlockLocation = {
  blocks: Block[];
  currentSuperBlock: string;
};

// This will need manual updates as new chapter-based super blocks are added
const chapterBasedSuperBlocks = [
  "full-stack-developer",
  "full-stack-open",
  "a1-professional-spanish",
  "responsive-web-design-v9",
  "javascript-v9",
  "front-end-development-libraries-v9",
  "python-v9",
  "relational-databases-v9",
  "back-end-development-and-apis-v9",
  "full-stack-developer-v9",
  "a1-professional-chinese",
];

export const getBlocks = async (sup: string): Promise<BlockLocation> => {
  const superBlockDataPath = join(SUPERBLOCK_META_DIR, sup + ".json");
  const superBlockMetaFile = await readFile(superBlockDataPath, {
    encoding: "utf8",
  });
  const superBlockMeta = JSON.parse(superBlockMetaFile) as SuperBlockMeta;

  const introDataPath = join(ENGLISH_LANG_DIR, "intro.json");
  const introFile = await readFile(introDataPath, {
    encoding: "utf8",
  });
  const introData = JSON.parse(introFile) as Intro;

  let blocks: { name: string; path: string }[] = [];

  if (chapterBasedSuperBlocks.includes(sup)) {
    blocks = superBlockMeta.chapters!.map((chapter) => {
      const chapters = Object.entries(introData[sup]["chapters"]!);
      const chapterTrueName = chapters.filter(
        (x) => x[0] === chapter.dashedName,
      )[0][1];
      return {
        name: chapterTrueName,
        path: "chapters/" + chapter.dashedName,
      };
    });
  } else {
    blocks = await Promise.all(
      superBlockMeta.blocks!.map(async (block) => {
        const blockStructurePath = join(BLOCK_META_DIR, block + ".json");
        const blockMetaFile = await readFile(blockStructurePath, {
          encoding: "utf8",
        });
        const blockMeta = JSON.parse(blockMetaFile) as PartialMeta;
        return {
          name: blockMeta.name,
          path: block,
        };
      }),
    );
  }

  return { blocks: blocks, currentSuperBlock: introData[sup]?.title };
};
