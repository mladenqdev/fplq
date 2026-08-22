import { useMemo } from 'react';
import type { BootstrapDto, ElementDto, ElementTypeDto, EventDto, TeamDto } from '@fplq/shared';

export interface BootstrapIndex {
  bootstrap: BootstrapDto;
  elementById: Map<number, ElementDto>;
  teamById: Map<number, TeamDto>;
  typeById: Map<number, ElementTypeDto>;
  eventById: Map<number, EventDto>;
  teamShort: (teamId: number) => string;
  typeShort: (typeId: number) => string;
}

export function buildBootstrapIndex(bootstrap: BootstrapDto): BootstrapIndex {
  const elementById = new Map(bootstrap.elements.map((e) => [e.id, e]));
  const teamById = new Map(bootstrap.teams.map((t) => [t.id, t]));
  const typeById = new Map(bootstrap.elementTypes.map((t) => [t.id, t]));
  const eventById = new Map(bootstrap.events.map((e) => [e.id, e]));
  return {
    bootstrap,
    elementById,
    teamById,
    typeById,
    eventById,
    teamShort: (teamId) => teamById.get(teamId)?.shortName ?? '?',
    typeShort: (typeId) => typeById.get(typeId)?.singularNameShort ?? '?',
  };
}

export function useBootstrapIndex(bootstrap: BootstrapDto | undefined): BootstrapIndex | null {
  return useMemo(() => (bootstrap ? buildBootstrapIndex(bootstrap) : null), [bootstrap]);
}

const PHOTO_BASE = 'https://resources.premierleague.com/premierleague/photos/players/110x140/p';

// Element `code` (or a pick `photo` like "498016.jpg") -> official headshot URL.
export function playerPhotoUrl(codeOrPhoto: number | string): string {
  const code = String(codeOrPhoto).replace(/\.(png|jpg|jpeg)$/i, '');
  return `${PHOTO_BASE}${code}.png`;
}
