import { useQuery } from '@tanstack/react-query'

import { CoveringDesignRequestRepository } from '@/infrastructure/repositories/CoveringDesignRequestRepository'

export function useCoveringRequests() {
  return useQuery({
    queryKey: ['covering-requests'],
    queryFn: () => CoveringDesignRequestRepository.listByUser(),
    staleTime: 60 * 1000,
  })
}
