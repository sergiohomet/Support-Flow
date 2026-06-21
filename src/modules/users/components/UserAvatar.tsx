import { getInitials } from '@/core/utils/getInitials'

interface UserAvatarProps {
  avatarUrl: string | null
  fullName: string
  size?: 'sm' | 'md'
}

const palette = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-red-500',
  'bg-yellow-500',
  'bg-pink-500',
]

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
}

export function UserAvatar({
  avatarUrl,
  fullName,
  size = 'md',
}: UserAvatarProps): React.JSX.Element {
  const sizeClass = sizeClasses[size]

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={fullName}
        className={`rounded-full object-cover ${sizeClass}`}
      />
    )
  }

  const bgColor = palette[fullName.charCodeAt(0) % palette.length]
  const initials = getInitials(fullName)

  return (
    <span
      className={`inline-flex items-center justify-center rounded-full font-medium text-white ${bgColor} ${sizeClass}`}
      aria-label={fullName}
    >
      {initials}
    </span>
  )
}
