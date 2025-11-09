import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export const useSnapshots = (symbol = 'AAPL') =>
  useQuery(['snapshots', symbol], async () => {
    const res = await api.get(`/api/v1/snapshots?symbol=${symbol}`);
    return res.data;
  }, {
    refetchInterval: 5000,
    staleTime: 2000,
  });
