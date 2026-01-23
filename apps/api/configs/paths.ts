import { join } from "path";
import * as dotenv from 'dotenv';
dotenv.config();


export const SUPERBLOCK_META_DIR = join(
  process.cwd(),
  process.env.FCC_REPO_LOCATION!,
  "curriculum",
  "structure",
  "superblocks",
);

export const BLOCK_META_DIR = join(
  process.cwd(),
  process.env.FCC_REPO_LOCATION!,
  "curriculum",
  "structure",
  "blocks",
);

export const CHALLENGE_DIR = join(
  process.cwd(),
  process.env.FCC_REPO_LOCATION!,
  "curriculum",
  "challenges",
  "english",
  "blocks",
);

export const ENGLISH_LANG_DIR = join(
  process.cwd(),
  process.env.FCC_REPO_LOCATION!,
  "client",
  "i18n",
  "locales",
  "english",
);
