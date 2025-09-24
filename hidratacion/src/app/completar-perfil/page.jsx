"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Scale, Calendar, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

export default function CompletarPerfilPage() {
  const [profileData, setProfileData] = useState({
    sexo: "",
    edad: "",
    pesoActual: "",
  })
  const router = useRouter()

  useEffect(() => {
    const registrationData = localStorage.getItem("registrationData")
    if (!registrationData) {
      router.push("/crear-cuenta")
    }
  }, [router])

  const handleSubmit = async (e) => {
    e.preventDefault();

    const registrationData = JSON.parse(localStorage.getItem("registrationData") || "{}");
    const completeUserData = { ...registrationData, ...profileData };

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: completeUserData.nombre,
          correo: completeUserData.correo,
          password: completeUserData.contraseña,
          sexo: completeUserData.sexo,
          edad: Number(completeUserData.edad),
          peso_kg: Number(completeUserData.pesoActual),
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Error al registrar:", errorData);
        alert(errorData.error || "Error al registrar usuario");
        return;
      }

      const data = await res.json();
      console.log("Usuario creado:", data);

      localStorage.removeItem("registrationData");

      router.push("/iniciar-sesion");
    } catch (err) {
      console.error("Fallo en la petición:", err.message);
      alert("No se pudo conectar con el servidor");
    }
  };


  const handleInputChange = (field, value) => {
    setProfileData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 dark">
      <Card className="w-full max-w-md border-border/50">
        <CardHeader className="text-center space-y-4">
          <div className="space-y-2">
            <CardTitle className="text-2xl font-bold text-foreground">Completar Perfil</CardTitle>
            <Progress value={66} className="w-full h-2" />
            <p className="text-sm text-muted-foreground">Paso 2 de 3</p>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <Label className="text-foreground font-medium">Sexo</Label>
              <RadioGroup
                value={profileData.sexo}
                onValueChange={(value) => handleInputChange("sexo", value)}
                className="flex gap-6"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="hombre" id="hombre" className="border-border" />
                  <Label htmlFor="hombre" className="text-foreground cursor-pointer">
                    Hombre
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="mujer" id="mujer" className="border-border" />
                  <Label htmlFor="mujer" className="text-foreground cursor-pointer">
                    Mujer
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edad" className="text-foreground font-medium">
                Edad
              </Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="edad"
                  type="number"
                  placeholder="Tu edad en años"
                  value={profileData.edad}
                  onChange={(e) => handleInputChange("edad", e.target.value)}
                  className="pl-10 bg-input border-border text-foreground"
                  min="13"
                  max="120"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pesoActual" className="text-foreground font-medium">
                Peso actual
              </Label>
              <div className="relative">
                <Scale className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="pesoActual"
                  type="number"
                  placeholder="Tu peso en kg"
                  value={profileData.pesoActual}
                  onChange={(e) => handleInputChange("pesoActual", e.target.value)}
                  className="pl-10 bg-input border-border text-foreground"
                  min="30"
                  max="300"
                  step="0.1"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-medium py-3 flex items-center justify-center gap-2"
            >
              Registrarse
              <CheckCircle className="h-4 w-4" />
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
