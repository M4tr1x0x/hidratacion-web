"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Search, Filter, Edit, Trash2, ArrowLeft, UserCheck, Weight, Droplets } from "lucide-react"

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [filteredUsers, setFilteredUsers] = useState([])

  // Mock data based on the database schema from the endpoint
  useEffect(() => {
    // Simulate API call to fetch users
    const mockUsers = [
      {
        id: 1,
        nombre: "Juan Pérez",
        correo: "juan@email.com",
        sexo: "Hombre",
        edad: 28,
        peso_kg: 75,
        meta_diaria_ml: 2625,
        created_at: "2024-01-15T10:30:00Z",
      },
      {
        id: 2,
        nombre: "María García",
        correo: "maria@email.com",
        sexo: "Mujer",
        edad: 32,
        peso_kg: 60,
        meta_diaria_ml: 2100,
        created_at: "2024-01-16T14:20:00Z",
      },
      {
        id: 3,
        nombre: "Carlos López",
        correo: "carlos@email.com",
        sexo: "Hombre",
        edad: 25,
        peso_kg: 80,
        meta_diaria_ml: 2800,
        created_at: "2024-01-17T09:15:00Z",
      },
      {
        id: 4,
        nombre: "Ana Martínez",
        correo: "ana@email.com",
        sexo: "Mujer",
        edad: null,
        peso_kg: null,
        meta_diaria_ml: 2000,
        created_at: "2024-01-18T16:45:00Z",
      },
    ]

    setTimeout(() => {
      setUsers(mockUsers)
      setFilteredUsers(mockUsers)
      setLoading(false)
    }, 1000)
  }, [])

  // Filter users based on search term
  useEffect(() => {
    const filtered = users.filter(
      (user) =>
        user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.correo.toLowerCase().includes(searchTerm.toLowerCase()),
    )
    setFilteredUsers(filtered)
  }, [searchTerm, users])

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const handleDeleteUser = (userId) => {
    if (confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      setUsers(users.filter((user) => user.id !== userId))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando usuarios...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button
                variant="outline"
                size="sm"
                className="border-gray-700 text-gray-300 hover:bg-gray-800 bg-transparent"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-white">Panel de Administración</h1>
              <p className="text-gray-400">Gestiona todos los usuarios registrados</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8 text-cyan-500" />
            <div className="text-lg px-3 py-1 bg-gray-800 text-cyan-400 border border-gray-700 rounded-md">
              {filteredUsers.length} usuarios
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Usuarios</CardTitle>
              <UserCheck className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-500">{users.length}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Peso Promedio</CardTitle>
              <Weight className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {Math.round(
                  users.filter((u) => u.peso_kg).reduce((acc, u) => acc + u.peso_kg, 0) /
                    users.filter((u) => u.peso_kg).length,
                ) || 0}{" "}
                kg
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Meta Promedio</CardTitle>
              <Droplets className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-500">
                {Math.round(users.reduce((acc, u) => acc + u.meta_diaria_ml, 0) / users.length) || 0} ml
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar por nombre o correo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500"
                />
              </div>
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent">
                <Filter className="h-4 w-4 mr-2" />
                Filtros
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Lista de Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-700">
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Usuario</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Perfil</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Meta Diaria</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Registro</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-400">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-gray-700 hover:bg-gray-700/50 transition-colors">
                      <td className="py-4 px-4">
                        <div>
                          <div className="font-medium text-white">{user.nombre}</div>
                          <div className="text-sm text-gray-400">{user.correo}</div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-xs px-2 py-1 rounded-md ${
                                user.sexo ? "bg-cyan-600 text-white" : "bg-gray-700 text-gray-300"
                              }`}
                            >
                              {user.sexo || "No especificado"}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400">
                            {user.edad ? `${user.edad} años` : "Edad no especificada"}
                            {user.peso_kg && ` • ${user.peso_kg} kg`}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Droplets className="h-4 w-4 text-cyan-500" />
                          <span className="font-medium text-cyan-500">{user.meta_diaria_ml} ml</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="text-sm text-gray-400">{formatDate(user.created_at)}</div>
                      </td>
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="border-gray-600 text-red-400 hover:bg-red-900/20 hover:border-red-500"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400">No se encontraron usuarios</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
