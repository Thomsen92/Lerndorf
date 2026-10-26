import manifest from '../../../content/avatar/wardrobe.json';
import { tr } from '../i18n';
import type { CharacterKind } from '../render/character';
import type { AvatarSlot } from './look';
export interface AvatarPart {
  id: string;
  runtimeId: string;
  character: CharacterKind;
  name: string;
  price: number;
  slot: AvatarSlot;
  url: string;
  thumbnail: string;
  bone?: string;
  binding?: string;
  attachmentMatrix?: number[];
  conflicts: string[];
  hideMeshes?: string[];
  showMeshes?: string[];
  triangles: number;
  bytes: number;
}
export const avatarCatalog = (manifest.items as AvatarPart[]).map((part) => ({
  ...part,
  name: tr(part.name),
}));
export const partById = (id: string): AvatarPart | undefined => avatarCatalog.find((i) => i.id === id);
export function partUrl(part: AvatarPart, thumbnail = false): string {
  return `${import.meta.env.BASE_URL}assets/characters/wardrobe/${part.character}/${thumbnail ? part.thumbnail : part.url}`;
}
export const ASSET_REVISION = '20261026-wardrobe-1';
