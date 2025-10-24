"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Mail, Lock, LogIn } from "lucide-react"
import Link from "next/link"

export default function IniciarSesionPage() {
  const router = useRouter()

  const [formData, setFormData] = useState({
    correo: "",
    contraseña: "",
  })
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setMsg(null)
    setLoading(true)

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          correo: formData.correo,
          password: formData.contraseña, // mapeo a "password"
        }),
        credentials: "include", // para cookies httpOnly
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        const text = typeof data?.error === "string" ? data.error : "No se pudo iniciar sesión"
        setMsg({ type: "error", text })
      } else {
        setMsg({ type: "success", text: data?.message || "Inicio de sesión exitoso" })
        setTimeout(() => router.push("/dashboard"), 600)
      }
    } catch (err) {
      setMsg({ type: "error", text: "Error de red o servidor. Intenta de nuevo." })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 dark">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center space-y-4">
          <CardTitle className="text-2xl font-bold text-foreground">Iniciar Sesión</CardTitle>
          <div className="flex justify-center space-x-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-2 h-2 bg-cyan-500 rounded-full" />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {msg && (
            <div
              className={`mb-4 rounded-md border p-3 text-sm ${
                msg.type === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-400"
                  : "border-emerald-500/40 bg-emerald-500/10 text-emerald-400"
              }`}
            >
              {msg.text}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="correo" className="text-foreground font-medium">
                Correo
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="correo"
                  type="email"
                  placeholder="Correo electrónico"
                  value={formData.correo}
                  onChange={(e) => handleInputChange("correo", e.target.value)}
                  className="pl-10 bg-input border-border text-foreground"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contraseña" className="text-foreground font-medium">
                Contraseña
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contraseña"
                  type="password"
                  placeholder="Tu contraseña"
                  value={formData.contraseña}
                  onChange={(e) => handleInputChange("contraseña", e.target.value)}
                  className="pl-10 bg-input border-border text-foreground"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? "Ingresando..." : "Iniciar Sesión"}
              <LogIn className="h-4 w-4" />
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              ¿No tienes cuenta?{" "}
              <Link href="/crear-cuenta" className="text-cyan-500 hover:text-cyan-400 font-medium">
                Crear cuenta
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
