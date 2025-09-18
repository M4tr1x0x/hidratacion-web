"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Droplets, Clock, Check, X, Bell } from "lucide-react"
import Link from "next/link"

export default function Dashboard() {
  const [waterIntake, setWaterIntake] = useState(1050)
  const dailyGoal = 2100
  const [history, setHistory] = useState([
    { time: "07:00 AM", amount: 250, status: "taken" },
    { time: "8:30 AM", amount: 250, status: "taken" },
    { time: "10:30 AM", amount: 250, status: "skipped" },
  ])

  const progressPercentage = (waterIntake / dailyGoal) * 100

  const handleDrinkWater = () => {
    const newIntake = waterIntake + 250
    setWaterIntake(newIntake)

    const currentTime = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    setHistory((prev) => [
      ...prev,
      {
        time: currentTime,
        amount: 250,
        status: "taken",
      },
    ])
  }

  const handleSkip = () => {
    const currentTime = new Date().toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    })

    setHistory((prev) => [
      ...prev,
      {
        time: currentTime,
        amount: 250,
        status: "skipped",
      },
    ])
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-400 text-lg">Bienvenido Usuario</p>
          <div className="mt-4">
            <Link href="/" className="text-cyan-400 hover:text-cyan-300 text-sm">
              ← Volver al inicio
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Water Tracking */}
          <div className="lg:col-span-2">
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  {/* Water Stats */}
                  <div className="space-y-6">
                    <div>
                      <p className="text-cyan-400 text-xl font-semibold mb-2">
                        Hoy debes tomar: {dailyGoal.toLocaleString()} ml
                      </p>
                      <p className="text-green-400 text-lg">Has tomado: {waterIntake.toLocaleString()} ml</p>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Progreso diario</span>
                        <span>{Math.round(progressPercentage)}%</span>
                      </div>
                      <Progress value={progressPercentage} className="h-3 bg-gray-800" />
                    </div>
                  </div>

                  {/* Circular Progress Chart */}
                  <div className="flex justify-center">
                    <div className="relative w-48 h-48">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        {/* Background circle */}
                        <circle cx="50" cy="50" r="40" stroke="rgb(31, 41, 55)" strokeWidth="8" fill="transparent" />
                        {/* Progress circle */}
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="url(#gradient)"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray={`${progressPercentage * 2.51} 251`}
                          strokeLinecap="round"
                          className="transition-all duration-500"
                        />
                        <defs>
                          <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="rgb(34, 197, 94)" />
                            <stop offset="100%" stopColor="rgb(6, 182, 212)" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <Droplets className="w-12 h-12 text-cyan-400" />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* History */}
            <Card className="bg-gray-900 border-gray-800 mt-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Historial
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {history.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-4">
                        <span className="text-gray-300 font-mono">{entry.time}</span>
                        <span className="text-gray-400">{entry.amount} ml</span>
                      </div>
                      <span className={`font-semibold ${entry.status === "taken" ? "text-green-400" : "text-red-400"}`}>
                        {entry.status === "taken" ? "Tomado" : "Omitido"}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notifications Panel */}
          <div className="lg:col-span-1">
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="w-5 h-5" />
                  Notificaciones
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="text-center space-y-4">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <h3 className="font-semibold text-lg mb-2">¡Hora de tomar agua!</h3>
                    <p className="text-gray-400 text-sm">Son las 11:00 AM. Te toca hidratarte con 250 ml.</p>
                  </div>

                  <div className="space-y-3">
                    <Button onClick={handleDrinkWater} className="w-full bg-green-600 hover:bg-green-700 text-white">
                      <Check className="w-4 h-4 mr-2" />
                      Sí, ya tomé
                    </Button>

                    <Button
                      onClick={handleSkip}
                      variant="outline"
                      className="w-full border-red-600 text-red-400 hover:bg-red-600 hover:text-white bg-transparent"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Omitir
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
