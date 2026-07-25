import { useState } from 'react'
import type { FormEvent } from 'react'

import { supabase } from '@/infrastructure/supabase/client'
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

export function LoginPage() {
  const [registerMode, setRegisterMode] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setLoading(true)
    setMessage('')

    try {
      if (registerMode) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        })

        if (error) {
          throw error
        }

        setMessage(
          'Cadastro realizado. Verifique seu e-mail para confirmar a conta.',
        )
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (error) {
          throw error
        }
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Não foi possível concluir a operação.'

      setMessage(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  function toggleMode() {
    setRegisterMode((currentMode) => !currentMode)
    setMessage('')
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold">
            Loterias Inteligentes
          </CardTitle>

          <CardDescription>
            {registerMode ? 'Crie sua conta' : 'Entre na sua área'}
          </CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>

              <Input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={
                  registerMode ? 'new-password' : 'current-password'
                }
                minLength={6}
                required
              />
            </div>

            <Button className="w-full" type="submit" disabled={loading}>
              {loading
                ? 'Aguarde...'
                : registerMode
                  ? 'Criar conta'
                  : 'Entrar'}
            </Button>
          </form>

          {message && (
            <p className="mt-5 rounded-md bg-muted p-3 text-center text-sm">
              {message}
            </p>
          )}

          <Button
            className="mt-4 w-full"
            type="button"
            variant="ghost"
            onClick={toggleMode}
          >
            {registerMode
              ? 'Já tenho uma conta'
              : 'Ainda não tenho uma conta'}
          </Button>
        </CardContent>
      </Card>
    </main>
  )
}