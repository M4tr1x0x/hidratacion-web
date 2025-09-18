"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 dark">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Bienvenido</CardTitle>
          <CardDescription>Mantente hidratado, mantente saludable</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Link href="/crear-cuenta" className="block">
            <Button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white">Crear Cuenta</Button>
          </Link>
          <Link href="/iniciar-sesion" className="block">
            <Button variant="outline" className="w-full bg-transparent">
              Iniciar Sesión
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
