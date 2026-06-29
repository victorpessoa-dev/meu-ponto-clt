export function calculateAge(birthDate) {
  if (!birthDate) return null

  const date = new Date(`${birthDate}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  const today = new Date()
  let age = today.getFullYear() - date.getFullYear()
  const hadBirthday =
    today.getMonth() > date.getMonth() ||
    (today.getMonth() === date.getMonth() && today.getDate() >= date.getDate())

  if (!hadBirthday) age -= 1
  return age >= 0 ? age : null
}

export function isAdult(birthDate) {
  const age = calculateAge(birthDate)
  return age != null && age >= 18
}
