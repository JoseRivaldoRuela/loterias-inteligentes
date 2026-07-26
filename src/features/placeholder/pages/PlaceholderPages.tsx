import {
  BarChart3,
  BrainCircuit,
  CheckCircle2,
  ListChecks,
  Settings,
  Sparkles,
  Trophy,
} from 'lucide-react'

import { FeaturePlaceholder } from '@/components/layout/FeaturePlaceholder'

export function LotteriesPage() {
  return (
    <FeaturePlaceholder
      title="Loterias"
      description="Cadastro e configuração das modalidades."
      icon={Trophy}
    />
  )
}

export function GeneratorPage() {
  return (
    <FeaturePlaceholder
      title="Gerador"
      description="Geração inteligente de jogos e estratégias."
      icon={Sparkles}
    />
  )
}

export function CheckingPage() {
  return (
    <FeaturePlaceholder
      title="Conferência"
      description="Conferência automática de jogos e resultados."
      icon={CheckCircle2}
    />
  )
}

export function StatisticsPage() {
  return (
    <FeaturePlaceholder
      title="Estatísticas"
      description="Análises, frequências, atrasos e gráficos."
      icon={BarChart3}
    />
  )
}

export function SimulationsPage() {
  return (
    <FeaturePlaceholder
      title="Simulações"
      description="Simulações históricas e comparação de resultados."
      icon={ListChecks}
    />
  )
}

export function LaboratoryPage() {
  return (
    <FeaturePlaceholder
      title="Laboratório"
      description="Comparação e ranking de estratégias."
      icon={BrainCircuit}
    />
  )
}

export function SettingsPage() {
  return (
    <FeaturePlaceholder
      title="Configurações"
      description="Preferências da conta e da aplicação."
      icon={Settings}
    />
  )
}