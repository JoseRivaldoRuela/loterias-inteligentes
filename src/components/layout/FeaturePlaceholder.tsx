import type { LucideIcon } from 'lucide-react'

import { AppLayout } from '@/components/layout/AppLayout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type FeaturePlaceholderProps = {
  title: string
  description: string
  icon: LucideIcon
}

export function FeaturePlaceholder({
  title,
  description,
  icon: Icon,
}: FeaturePlaceholderProps) {
  return (
    <AppLayout>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Icon className="size-5" />
            </div>

            <div>
              <CardTitle>{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-xl border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              Este módulo será implementado nas próximas etapas.
            </p>
          </div>
        </CardContent>
      </Card>
    </AppLayout>
  )
}