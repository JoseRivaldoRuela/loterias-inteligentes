import type { ReactNode } from 'react'

import { useAuth } from '@/features/auth/context/AuthContext'

type SubscriberGateProps = {
  children: ReactNode
  fallback?: ReactNode
}

export function SubscriberGate({
  children,
  fallback = null,
}: SubscriberGateProps) {
  const { isSubscriber, subscriptionLoading } = useAuth()

  if (subscriptionLoading) {
    return null
  }

  if (!isSubscriber) {
    return <>{fallback}</>
  }

  return <>{children}</>
}