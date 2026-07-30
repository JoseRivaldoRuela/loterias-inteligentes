import {
  LibraryRepository,
  type Library,
} from '@/infrastructure/repositories/LibraryRepository'

export const LibraryService = {
  async list(): Promise<Library[]> {
    return LibraryRepository.getAll()
  },

  async create(
    name: string,
    description?: string,
  ): Promise<Library> {
    const trimmedName = name.trim()

    if (!trimmedName) {
      throw new Error('Informe o nome da biblioteca.')
    }

    return LibraryRepository.create(
      trimmedName,
      description,
    )
  },
}