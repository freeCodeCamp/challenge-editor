export interface SuperBlock {
  name: string;
  path: string;
}

export interface SuperBlockStage {
  stageName: string;
  superBlocks: SuperBlock[];
}
