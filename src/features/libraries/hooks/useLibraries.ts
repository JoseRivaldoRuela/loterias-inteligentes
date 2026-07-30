import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { LibraryService } from '@/features/libraries/services/LibraryService'

export const libraryQueryKeys = {
  all: ['libraries'] as const,
}

export function useLibraries() {
  return useQuery({
    queryKey: libraryQueryKeys.all,
    queryFn: () => LibraryService.list(),
    staleTime: 5 * 60 * 1000,
  })
}

export function useCreateLibrary() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      name,
      description,
    }: {
      name: string
      description?: string
    }) => LibraryService.create(name, description),

    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: libraryQueryKeys.all,
      })
    },
  })
}