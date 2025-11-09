import { useQuery } from '@tanstack/react-query';
import { api } from './client';

export function useSnapshots() {
  return useQuery(['snapshots'], async () => {
    const res = await api.get('/api/v1/snapshots');
    return res.data;
  }, { refetchInterval: 2000, staleTime: 1000 });
}
