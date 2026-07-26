import {
  LotteryRepository,
  type Lottery,
} from '@/infrastructure/repositories/LotteryRepository'

export const LotteryService = {
  async listActive(): Promise<Lottery[]> {
    return LotteryRepository.getAll()
  },

  async findByCode(code: string): Promise<Lottery | null> {
    const normalizedCode = code.trim().toLowerCase()

    if (!normalizedCode) {
      return null
    }

    return LotteryRepository.getByCode(normalizedCode)
  },
}