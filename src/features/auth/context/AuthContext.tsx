import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'

import { supabase } from '@/infrastructure/supabase/client'

type SubscriptionStatus =
  | 'inactive'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired'

type Subscription = {
  id: string
  user_id: string
  plan_code: string
  status: SubscriptionStatus
  started_at: string | null
  expires_at: string | null
  canceled_at: string | null
}

type AuthContextValue = {
  session: Session | null
  user: User | null
  subscription: Subscription | null
  isSubscriber: boolean
  loading: boolean
  subscriptionLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string) => Promise<void>
  resetPassword: (email: string) => Promise<void>
  signOut: () => Promise<void>
  refreshSubscription: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

type AuthProviderProps = {
  children: ReactNode
}

function hasActiveSubscription(subscription: Subscription | null) {
  if (!subscription) {
    return false
  }

  if (!['active', 'trialing'].includes(subscription.status)) {
    return false
  }

  if (!subscription.expires_at) {
    return true
  }

  return new Date(subscription.expires_at).getTime() > Date.now()
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [subscription, setSubscription] =
    useState<Subscription | null>(null)

  const [loading, setLoading] = useState(true)
  const [subscriptionLoading, setSubscriptionLoading] = useState(false)

  const loadSubscription = useCallback(async (userId: string | null) => {
    if (!userId) {
      setSubscription(null)
      setSubscriptionLoading(false)
      return
    }

    setSubscriptionLoading(true)

    try {
      const { data, error } = await supabase
        .from('user_subscriptions')
        .select(
          `
            id,
            user_id,
            plan_code,
            status,
            started_at,
            expires_at,
            canceled_at
          `,
        )
        .eq('user_id', userId)
        .maybeSingle()

      if (error) {
        throw error
      }

      setSubscription((data as Subscription | null) ?? null)
    } catch (error) {
      console.error('Erro ao consultar assinatura:', error)
      setSubscription(null)
    } finally {
      setSubscriptionLoading(false)
    }
  }, [])

  const refreshSubscription = useCallback(async () => {
    await loadSubscription(session?.user.id ?? null)
  }, [loadSubscription, session?.user.id])

  useEffect(() => {
    let mounted = true

    async function loadSession() {
      const { data, error } = await supabase.auth.getSession()

      if (error) {
        console.error('Erro ao recuperar sessão:', error.message)
      }

      if (!mounted) {
        return
      }

      setSession(data.session)
      await loadSubscription(data.session?.user.id ?? null)

      if (mounted) {
        setLoading(false)
      }
    }

    void loadSession()

    const {
      data: { subscription: authSubscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)

      void loadSubscription(newSession?.user.id ?? null).finally(() => {
        if (mounted) {
          setLoading(false)
        }
      })
    })

    return () => {
      mounted = false
      authSubscription.unsubscribe()
    }
  }, [loadSubscription])

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  async function signUp(email: string, password: string) {
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    })

    if (error) {
      throw new Error(error.message)
    }
  }

  async function resetPassword(email: string) {
    const redirectTo = `${window.location.origin}/redefinir-senha`

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo,
      },
    )

    if (error) {
      throw new Error(error.message)
    }
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()

    if (error) {
      throw new Error(error.message)
    }

    setSubscription(null)
  }

  const isSubscriber = useMemo(
    () => hasActiveSubscription(subscription),
    [subscription],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      subscription,
      isSubscriber,
      loading,
      subscriptionLoading,
      signIn,
      signUp,
      resetPassword,
      signOut,
      refreshSubscription,
    }),
    [
      session,
      subscription,
      isSubscriber,
      loading,
      subscriptionLoading,
      refreshSubscription,
    ],
  )

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider.')
  }

  return context
}