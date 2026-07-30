import { supabase } from '@/infrastructure/supabase/client'

export type Library = {
  id: string
  name: string
  description: string | null
  libraryType: 'personal' | 'betting_pool'
  bettingPoolId: string | null
  active: boolean
  createdAt: string
}

type LibraryRow = {
  id: string
  name: string
  description: string | null
  library_type: 'personal' | 'betting_pool'
  betting_pool_id: string | null
  active: boolean
  created_at: string
}

function mapLibrary(row: LibraryRow): Library {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    libraryType: row.library_type,
    bettingPoolId: row.betting_pool_id,
    active: row.active,
    createdAt: row.created_at,
  }
}

const libraryFields = `
  id,
  name,
  description,
  library_type,
  betting_pool_id,
  active,
  created_at
`

export const LibraryRepository = {
  async getAll(): Promise<Library[]> {
    const { data, error } = await supabase
      .from('libraries')
      .select(libraryFields)
      .eq('active', true)
      .order('name')

    if (error) {
      throw new Error(`Erro ao carregar bibliotecas: ${error.message}`)
    }

    return (data as LibraryRow[]).map(mapLibrary)
  },

  async create(name: string, description?: string): Promise<Library> {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError || !user) {
      throw new Error('Usuário não autenticado.')
    }

    const { data, error } = await supabase
      .from('libraries')
      .insert({
        owner_id: user.id,
        name,
        description: description?.trim() || null,
        library_type: 'personal',
      })
      .select(libraryFields)
      .single()

    if (error) {
      throw new Error(`Erro ao criar biblioteca: ${error.message}`)
    }

    return mapLibrary(data as LibraryRow)
  },
}