import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { api } from './api';

const MIN = 60_000;

export function useBootstrap() {
  return useQuery({
    queryKey: ['bootstrap'],
    queryFn: api.bootstrap,
    staleTime: 2 * MIN,
  });
}

export function useFixtures() {
  return useQuery({
    queryKey: ['fixtures'],
    queryFn: api.fixtures,
    staleTime: 2 * MIN,
  });
}

export function useFixturesForGw(gw: number | null) {
  return useQuery({
    queryKey: ['fixtures', gw],
    queryFn: () => api.fixturesForGw(gw as number),
    enabled: gw != null,
    staleTime: MIN,
  });
}

// Live route: refetch every 60s (and on focus) while the GW is still progressing.
export function useEntryLive(entryId: number, gw: number | null) {
  return useQuery({
    queryKey: ['entryLive', entryId, gw],
    queryFn: () => api.entryLive(entryId, gw as number),
    enabled: gw != null,
    staleTime: 30_000,
    refetchInterval: (query) => {
      const data = query.state.data;
      const progressing = data ? data.isLive || !data.gwFinished : true;
      return progressing ? 60_000 : false;
    },
    refetchOnWindowFocus: true,
    placeholderData: keepPreviousData,
  });
}

export function useRankHistory(entryId: number, gw: number | null, live: boolean) {
  return useQuery({
    queryKey: ['rankHistory', entryId, gw],
    queryFn: () => api.rankHistory(entryId, gw as number),
    enabled: gw != null,
    staleTime: 30_000,
    refetchInterval: live ? 60_000 : false,
    placeholderData: keepPreviousData,
  });
}

export function useLadder() {
  return useQuery({
    queryKey: ['ladder'],
    queryFn: api.ladder,
    staleTime: 2 * MIN,
    placeholderData: keepPreviousData,
  });
}

export function useSquad(entryId: number) {
  return useQuery({
    queryKey: ['squad', entryId],
    queryFn: () => api.squad(entryId),
    staleTime: MIN,
  });
}

export function useHistory(entryId: number) {
  return useQuery({
    queryKey: ['history', entryId],
    queryFn: () => api.entryHistory(entryId),
    staleTime: 2 * MIN,
  });
}

export function useLeague(id: number, page: number) {
  return useQuery({
    queryKey: ['league', id, page],
    queryFn: () => api.league(id, page),
    staleTime: MIN,
    placeholderData: keepPreviousData,
  });
}

export function useElement(id: number | null) {
  return useQuery({
    queryKey: ['element', id],
    queryFn: () => api.element(id as number),
    enabled: id != null,
    staleTime: 10 * MIN,
  });
}

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: api.health,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}
