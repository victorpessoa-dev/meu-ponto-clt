"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, ShieldOff } from "lucide-react"
import { useAuth, useStoreData } from "@/lib/auth-context"
import { createUser, deactivateUser, getUsers, updateUser } from "@/lib/store"
import { normalizeEmail, validateEmail, validateStrongPassword } from "@/lib/security-utils"
import { DEFAULT_PUNCH_FIELDS, DEFAULT_SCHEDULE, PUNCH_FIELD_OPTIONS } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { PasswordField } from "@/components/password-field"
import { AvatarPicker, UserAvatar } from "@/components/avatar-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

const DAY_LABELS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export function AdminView() {
  const { user: current } = useAuth()
  const users = useStoreData(() => [...getUsers()].sort((a, b) => a.name.localeCompare(b.name)))
  const [edit, setEdit] = useState({ open: false, user: null })
  const [toDelete, setToDelete] = useState(null)

  if (!current) return null

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-foreground">Usuários</h2>
          <p className="text-xs text-muted-foreground">{users.length} cadastrado(s)</p>
        </div>
        <Button size="sm" onClick={() => setEdit({ open: true, user: null })}>
          <Plus className="mr-1.5 h-4 w-4" />
          Novo
        </Button>
      </div>

      <div className="flex flex-col gap-2.5">
        {users.map((u) => (
          <Card key={u.id}>
            <CardContent className="flex items-center gap-3 px-3 py-3 sm:px-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                <UserAvatar avatarIcon={u.avatarIcon} name={u.name} className="h-10 w-10" iconClassName="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-foreground">{u.name}</span>
                  {u.isAdmin && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                      Admin
                    </Badge>
                  )}
                  {!u.isActive && (
                    <Badge variant="outline" className="h-5 border-destructive/40 px-1.5 text-[10px] text-destructive">
                      Inativo
                    </Badge>
                  )}
                </div>
                <span className="block truncate text-xs text-muted-foreground">
                  {[u.jobTitle, u.companyName].filter(Boolean).join(" • ") || u.email}
                </span>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button variant="ghost" size="icon" onClick={() => setEdit({ open: true, user: u })} aria-label="Editar">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-destructive hover:text-destructive"
                  disabled={u.id === current.id}
                  onClick={() => setToDelete(u)}
                  aria-label="Desativar"
                >
                  <ShieldOff className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <UserDialog state={edit} onClose={() => setEdit({ open: false, user: null })} currentId={current.id} />

      <AlertDialog open={!!toDelete} onOpenChange={(o) => !o && setToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar usuário?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{toDelete?.name}</strong> não conseguirá entrar no sistema até que um administrador reative a
              conta. Os registros de ponto serão preservados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={async () => {
                if (toDelete) {
                  const res = await deactivateUser(toDelete.id)
                  if (res?.error) {
                    toast.error(res.error)
                    return
                  }
                  toast.success("Usuário desativado.")
                }
                setToDelete(null)
              }}
            >
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function UserDialog({ state, onClose, currentId }) {
  const editing = state.user
  const isEditingSelf = editing?.id === currentId
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [avatarIcon, setAvatarIcon] = useState("user")
  const [isAdmin, setIsAdmin] = useState(false)
  const [isActive, setIsActive] = useState(true)
  const [scheduleHours, setScheduleHours] = useState([])
  const [punchFields, setPunchFields] = useState(DEFAULT_PUNCH_FIELDS)
  const [loadedId, setLoadedId] = useState(null)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)

  const key = state.open ? (editing?.id ?? "new") : "closed"

  useEffect(() => {
    if (loadedId === key) return

    setLoadedId(key)
    if (!state.open) return

    setName(editing?.name ?? "")
    setEmail(editing?.email ?? "")
    setPassword("")
    setAvatarIcon(editing?.avatarIcon ?? "user")
    setIsAdmin(editing?.isAdmin ?? false)
    setIsActive(editing?.isActive ?? true)

    const sched = editing?.schedule ?? DEFAULT_SCHEDULE
    setScheduleHours(sched.map((m) => (m === 0 ? "0" : String(+(m / 60).toFixed(2)))))
    setPunchFields(editing?.punchFields ?? DEFAULT_PUNCH_FIELDS)
  }, [editing, key, loadedId, state.open])

  async function save() {
    if (!name.trim() || !email.trim()) {
      toast.error("Preencha nome e e-mail.")
      return
    }
    const emailError = validateEmail(email)
    if (emailError) {
      toast.error(emailError)
      return
    }
    if (password) {
      const passwordError = validateStrongPassword(password)
      if (passwordError) {
        toast.error(passwordError)
        return
      }
    }
    const schedule = scheduleHours.map((h) => Math.max(0, Math.round((Number.parseFloat(h) || 0) * 60)))

    if (editing) {
      const res = await updateUser(editing.id, {
        name: name.trim(),
        email: normalizeEmail(email),
        avatarIcon,
        isAdmin,
        isActive,
        schedule,
        punchFields,
        ...(password ? { password } : {}),
      })
      if (res?.error) {
        toast.error(res.error)
        return
      }
      toast.success("Usuário atualizado.")
      onClose()
    } else {
      if (!password) {
        toast.error("Defina uma senha para o novo usuário.")
        return
      }
      const res = await createUser({
        name: name.trim(),
        email: normalizeEmail(email),
        password,
        avatarIcon,
        isAdmin,
        schedule,
        punchFields,
      })
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Usuário criado.")
      onClose()
    }
  }

  function togglePunchField(dayIndex, fieldKey) {
    setPunchFields((current) =>
      current.map((fields, index) => {
        if (index !== dayIndex) return fields
        const next = fields.includes(fieldKey)
          ? fields.filter((key) => key !== fieldKey)
          : [...fields, fieldKey]
        return PUNCH_FIELD_OPTIONS.map((option) => option.key).filter((key) => next.includes(key))
      }),
    )
  }

  return (
    <>
      <Dialog open={state.open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar usuário" : "Novo usuário"}</DialogTitle>
          <DialogDescription>
            {editing ? "Atualize os dados e a jornada do usuário." : "Cadastre um novo usuário no sistema."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 rounded-lg border border-border bg-muted/40 p-3">
            <UserAvatar avatarIcon={avatarIcon} name={name} className="h-12 w-12" iconClassName="h-6 w-6" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-foreground">{name || "Novo usuário"}</p>
              <p className="truncate text-xs text-muted-foreground">{email || "Escolha um avatar"}</p>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="u-name">Nome</Label>
            <Input id="u-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="u-email">E-mail</Label>
            <Input
              id="u-email"
              type="email"
              value={email}
              disabled={editing && !isEditingSelf}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          {(!editing || isEditingSelf) && (
            <div className="flex flex-col gap-2">
              <Label htmlFor="u-pwd">{editing ? "Nova senha (deixe vazio p/ manter)" : "Senha"}</Label>
              <PasswordField id="u-pwd" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={8} />
            </div>
          )}

          <div className="flex flex-col gap-2">
            <Label>Avatar do perfil</Label>
            <AvatarPicker value={avatarIcon} onChange={setAvatarIcon} label="Avatar do usuário" />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Jornada por dia (horas)</Label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className="flex flex-col items-center gap-1">
                  <span className="text-[11px] font-medium text-muted-foreground">{d}</span>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    inputMode="decimal"
                    className="h-9 px-1 text-center text-sm"
                    value={scheduleHours[i] ?? "0"}
                    onChange={(e) =>
                      setScheduleHours((prev) => prev.map((v, idx) => (idx === i ? e.target.value : v)))
                    }
                  />
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">Ex.: 8 = 8h, 4 = 4h, 0 = folga.</p>
          </div>

          <div className="flex flex-col gap-2">
            <Label>Batidas por dia</Label>
            <div className="flex flex-col gap-2">
              {DAY_LABELS.map((day, dayIndex) => (
                <div key={day} className="rounded-lg border border-border bg-muted/30 p-2">
                  <div className="mb-2 text-xs font-semibold text-foreground">{day}</div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
                    {PUNCH_FIELD_OPTIONS.map((field) => {
                      const active = punchFields[dayIndex]?.includes(field.key)
                      return (
                        <button
                          key={field.key}
                          type="button"
                          onClick={() => togglePunchField(dayIndex, field.key)}
                          className={cn(
                            "h-8 rounded-md border px-2 text-xs font-medium transition-colors",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {field.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground">
              Escolha quais botoes de ponto aparecem em cada dia da semana.
            </p>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <div>
              <Label htmlFor="u-admin" className="cursor-pointer">
                Administrador
              </Label>
              <p className="text-xs text-muted-foreground">Pode gerenciar todos os usuários.</p>
            </div>
            <Switch id="u-admin" checked={isAdmin} onCheckedChange={setIsAdmin} />
          </div>

          {editing && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
              <div>
                <Label htmlFor="u-active" className="cursor-pointer">
                  Conta ativa
                </Label>
                <p className="text-xs text-muted-foreground">Contas inativas não conseguem entrar.</p>
              </div>
              <Switch
                id="u-active"
                checked={isActive}
                disabled={editing.id === currentId}
                onCheckedChange={setIsActive}
              />
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => setConfirmSaveOpen(true)}>{editing ? "Salvar" : "Criar usuário"}</Button>
        </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmSaveOpen} onOpenChange={setConfirmSaveOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{editing ? "Salvar alterações?" : "Criar usuário?"}</AlertDialogTitle>
            <AlertDialogDescription>
              {editing ? "Os dados e permissões do usuário serão atualizados." : "O novo usuário será criado com os dados informados."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmSaveOpen(false)
                await save()
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
