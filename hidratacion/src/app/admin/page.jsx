"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Users, Search, Filter, Edit, Trash2, ArrowLeft, UserCheck, Weight, Droplets, X } from "lucide-react"

export default function AdminDashboard() {
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)
  const [editForm, setEditForm] = useState({
    nombre: "",
    correo: "",
    password: "",
    sexo: "",
    edad: "",
    peso_kg: "",
  })
  const [stats, setStats] = useState({ total_users: 0, avg_peso_kg: 0, avg_meta_diaria_ml: 0 })
  const [error, setError] = useState("")

  const toApiSexo = (v) => (v ? v.toLowerCase() : null) 
  const toUiSexo = (v) => (v ? v.charAt(0).toUpperCase() + v.slice(1) : "")

  const debouncedSearch = useDebounce(searchTerm, 300)

  useEffect(() => {
    let alive = true
    async function load() {
      setLoading(true)
      setError("")
      try {
        const q = debouncedSearch ? `?q=${encodeURIComponent(debouncedSearch)}&limit=100` : `?limit=100`
        const [usersRes, statsRes] = await Promise.all([
          fetch(`/api/admin/users${q}`),
          fetch(`/api/admin/users/stats`),
        ])
        if (!usersRes.ok) throw new Error("Error listando usuarios")
        if (!statsRes.ok) throw new Error("Error obteniendo stats")

        const usersData = await usersRes.json() 
        const statsData = await statsRes.json()

        if (!alive) return
        setUsers(usersData.items || [])
        setTotal(usersData.total || 0)
        setStats({
          total_users: Number(statsData.total_users || 0),
          avg_peso_kg: Number(statsData.avg_peso_kg || 0),
          avg_meta_diaria_ml: Number(statsData.avg_meta_diaria_ml || 0),
        })
      } catch (e) {
        if (!alive) return
        setError(e?.message || "Error cargando datos")
      } finally {
        if (alive) setLoading(false)
      }
    }
    load()
    return () => { alive = false }
  }, [debouncedSearch])

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return users
    return users.filter(
      (u) =>
        (u.nombre || "").toLowerCase().includes(term) ||
        (u.correo || "").toLowerCase().includes(term)
    )
  }, [users, searchTerm])

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const handleDeleteUser = async (userId) => {
    if (!confirm("¿Estás seguro de que quieres eliminar este usuario?")) return
    const prev = users
    setUsers((u) => u.filter((x) => x.id !== userId))
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("No se pudo eliminar")
      const s = await fetch(`/api/admin/users/stats`)
      if (s.ok) setStats(await s.json())
      setTotal((t) => Math.max(0, t - 1))
    } catch (e) {
      setUsers(prev)
      alert("Error eliminando usuario")
      console.error(e)
    }
  }

  const handleEditUser = (user) => {
    setEditingUser(user)
    setEditForm({
      nombre: user.nombre || "",
      correo: user.correo || "",
      password: "",
      sexo: toUiSexo(user.sexo || ""),
      edad: user.edad ?? "",
      peso_kg: user.peso_kg ?? "",
    })
    setIsEditModalOpen(true)
  }

  // guardar (PATCH)
  const handleSaveUser = async () => {
    if (!editingUser) return
    const id = editingUser.id

    const body = {}
    if (editForm.nombre !== editingUser.nombre) body.nombre = editForm.nombre
    if (editForm.correo !== editingUser.correo) body.correo = editForm.correo
    if (editForm.password && editForm.password.length > 0) body.password = editForm.password
    if (toApiSexo(editForm.sexo) !== (editingUser.sexo || null)) body.sexo = toApiSexo(editForm.sexo)
    if (editForm.edad !== (editingUser.edad ?? "")) body.edad = editForm.edad === "" ? null : Number(editForm.edad)
    if (editForm.peso_kg !== (editingUser.peso_kg ?? "")) body.peso_kg = editForm.peso_kg === "" ? null : Number(editForm.peso_kg)

    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const err = await safeJson(res)
        throw new Error(err?.error || "Error actualizando usuario")
      }
      const updated = await res.json()

      setUsers((prev) => prev.map((u) => (u.id === id ? updated : u)))
      const s = await fetch(`/api/admin/users/stats`)
      if (s.ok) setStats(await s.json())

      handleCloseModal()
    } catch (e) {
      alert(e.message || "Error guardando cambios")
      console.error(e)
    }
  }

  const handleCloseModal = () => {
    setIsEditModalOpen(false)
    setEditingUser(null)
    setEditForm({
      nombre: "",
      correo: "",
      password: "",
      sexo: "",
      edad: "",
      peso_kg: "",
    })
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
              {error && <p className="text-red-400 mt-1 text-sm">{error}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-8 w-8 text-cyan-500" />
            <div className="text-lg px-3 py-1 bg-gray-800 text-cyan-400 border border-gray-700 rounded-md">
              {filteredUsers.length}/{total} usuarios
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Total Usuarios</CardTitle>
              <UserCheck className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-cyan-500">{stats.total_users}</div>
            </CardContent>
          </Card>

          <Card className="bg-gray-800 border-gray-700">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-300">Peso Promedio</CardTitle>
              <Weight className="h-4 w-4 text-gray-400" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {Math.round(stats.avg_peso_kg || 0)} kg
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
                {Math.round(stats.avg_meta_diaria_ml || 0)} ml
              </div>
            </CardContent>
          </Card>
        </div>

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
                              {toUiSexo(user.sexo) || "No especificado"}
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
                            onClick={() => handleEditUser(user)}
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

      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-lg border border-gray-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Editar Usuario</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-white hover:bg-gray-700"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre" className="text-gray-300">Nombre</Label>
                <Input
                  id="edit-nombre"
                  value={editForm.nombre}
                  onChange={(e) => setEditForm({ ...editForm, nombre: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500"
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-correo" className="text-gray-300">Correo</Label>
                <Input
                  id="edit-correo"
                  type="email"
                  value={editForm.correo}
                  onChange={(e) => setEditForm({ ...editForm, correo: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-password" className="text-gray-300">Nueva Contraseña</Label>
                <Input
                  id="edit-password"
                  type="password"
                  value={editForm.password}
                  onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500"
                  placeholder="Dejar vacío para mantener actual"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-gray-300">Sexo</Label>
                <RadioGroup
                  value={editForm.sexo}
                  onValueChange={(value) => setEditForm({ ...editForm, sexo: value })}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Hombre" id="edit-hombre" className="border-gray-600 text-cyan-500" />
                    <Label htmlFor="edit-hombre" className="text-gray-300">Hombre</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="Mujer" id="edit-mujer" className="border-gray-600 text-cyan-500" />
                    <Label htmlFor="edit-mujer" className="text-gray-300">Mujer</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-edad" className="text-gray-300">Edad</Label>
                  <Input
                    id="edit-edad"
                    type="number"
                    value={editForm.edad}
                    onChange={(e) => setEditForm({ ...editForm, edad: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500"
                    placeholder="Años"
                    min="1"
                    max="120"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-peso" className="text-gray-300">Peso (kg)</Label>
                  <Input
                    id="edit-peso"
                    type="number"
                    value={editForm.peso_kg}
                    onChange={(e) => setEditForm({ ...editForm, peso_kg: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-cyan-500"
                    placeholder="kg"
                    min="1"
                    max="300"
                    step="0.1"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t border-gray-700">
              <Button
                onClick={handleCloseModal}
                variant="outline"
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700 bg-transparent"
              >
                Cancelar
              </Button>
              <Button onClick={handleSaveUser} className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white">
                Guardar Cambios
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

async function safeJson(res) {
  try { return await res.json() } catch { return null }
}

function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(id)
  }, [value, delay])
  return debounced
}
