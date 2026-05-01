const avatarPairs = [
  ['#20a7df', '#8bd5f5'],
  ['#2448bf', '#79b8ff'],
  ['#0f766e', '#6ee7d8'],
  ['#8f5cf6', '#cbb8ff'],
  ['#1d4ed8', '#93c5fd'],
  ['#ca8a04', '#fde68a'],
];

export function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();
}

export function getAvatarGradient(seed: string) {
  const index =
    seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarPairs.length;
  const [start, end] = avatarPairs[index];
  return `linear-gradient(135deg, ${start}, ${end})`;
}
