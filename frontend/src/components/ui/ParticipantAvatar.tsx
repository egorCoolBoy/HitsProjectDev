type ParticipantAvatarProps = {
  name: string;
  color: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
};

const SIZE_CLASSES = {
  sm: 'size-8 text-sm',
  md: 'size-10 text-base',
  lg: 'size-12 text-lg',
} as const;

export function ParticipantAvatar({ name, color, size = 'md', className = '' }: ParticipantAvatarProps) {
  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-semibold shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
