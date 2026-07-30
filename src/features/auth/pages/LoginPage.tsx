import { useState } from 'react'
import type { FormEvent } from 'react'

import { useAuth } from '@/features/auth/context/AuthContext'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type AuthMode = 'login' | 'register' | 'reset'

export function LoginPage() {
  const { signIn, signUp, resetPassword } = useAuth()

  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setMessage('')
    setIsError(false)

    try {
      if (mode === 'register') {
        await signUp(email, password)

        setMessage(
          'Cadastro realizado. Verifique seu e-mail para confirmar a conta.',
        )

        return
      }

      if (mode === 'reset') {
        await resetPassword(email)

        setMessage(
          'Enviamos um link para redefinição de senha. Verifique seu e-mail.',
        )

        return
      }

      await signIn(email, password)
    } catch (error) {
      setIsError(true)

      setMessage(
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a operação.',
      )
    } finally {
      setLoading(false)
    }
  }

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setMessage('')
    setIsError(false)
    setPassword('')
  }

  const title =
    mode === 'login'
      ? 'Entrar'
      : mode === 'register'
        ? 'Criar conta'
        : 'Recuperar senha'

  const description =
    mode === 'login'
      ? 'Entre na sua área'
      : mode === 'register'
        ? 'Crie sua conta gratuita'
        : 'Informe seu e-mail para receber o link de recuperação'

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Loterias Inteligentes
          </CardTitle>

          <CardDescription>{description}</CardDescription>
        </CardHeader>

        <CardContent>
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>

              <Input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
              />
            </div>

            {mode !== 'reset' && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>

                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={
                    mode === 'register'
                      ? 'new-password'
                      : 'current-password'
                  }
                  minLength={6}
                  required
                />
              </div>
            )}

            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? 'Aguarde...' : title}
            </Button>
          </form>

          {message && (
            <p
              className={`mt-5 rounded-md p-3 text-center text-sm ${
                isError
                  ? 'bg-destructive/10 text-destructive'
                  : 'bg-muted text-foreground'
              }`}
            >
              {message}
            </p>
          )}

          <div className="mt-4 space-y-2">
            {mode === 'login' && (
              <>
                <Button
                  className="w-full"
                  type="button"
                  variant="ghost"
                  onClick={() => changeMode('reset')}
                >
                  Esqueci minha senha
                </Button>

                <Button
                  className="w-full"
                  type="button"
                  variant="ghost"
                  onClick={() => changeMode('register')}
                >
                  Ainda não tenho uma conta
                </Button>
              </>
            )}

            {mode !== 'login' && (
              <Button
                className="w-full"
                type="button"
                variant="ghost"
                onClick={() => changeMode('login')}
              >
                Voltar para o login
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  )
}