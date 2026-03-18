import UserAvatar from './UserAvatar';

type Member = { id: string; name?: string; avatarUrl?: string | null };

type Props = {
  members: Member[];
  myId?: string | null;
  size?: number;
  style?: React.CSSProperties;
};

/** 그룹채팅 아바타: 멤버 프로필을 겹쳐서 표시 (카카오톡/슬랙 스타일) */
export default function GroupAvatar({ members, myId, size = 32, style }: Props) {
  const safeMembers = Array.isArray(members) ? members : [];
  const others = safeMembers.filter((m) => m.id !== myId);
  const displayMembers = others.length > 0 ? others : safeMembers;
  const slice = displayMembers.slice(0, 4);
  const count = slice.length;

  if (count === 0) return <div style={{ width: size, height: size, borderRadius: 10, background: '#e2e8f0', ...style }} />;

  const itemSize = count <= 2 ? size * 0.65 : size * 0.55;
  const positions: { left: string; top: string }[] =
    count === 1
      ? [{ left: '50%', top: '50%' }]
      : count === 2
        ? [{ left: '30%', top: '50%' }, { left: '70%', top: '50%' }]
        : count === 3
          ? [{ left: '50%', top: '28%' }, { left: '28%', top: '72%' }, { left: '72%', top: '72%' }]
          : [
              { left: '30%', top: '30%' },
              { left: '70%', top: '30%' },
              { left: '30%', top: '70%' },
              { left: '70%', top: '70%' },
            ];

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0,
        overflow: 'hidden',
        borderRadius: 10,
        ...style,
      }}
    >
      {slice.map((m, i) => (
        <GroupAvatarItem
          key={m.id}
          member={m}
          size={itemSize}
          position={positions[i]}
        />
      ))}
    </div>
  );
}

function GroupAvatarItem({
  member,
  size,
  position,
}: {
  member: Member;
  size: number;
  position: { left: string; top: string };
}) {
  const common: React.CSSProperties = {
    position: 'absolute',
    width: size,
    height: size,
    borderRadius: 8,
    overflow: 'hidden',
    transform: 'translate(-50%, -50%)',
    left: position.left,
    top: position.top,
    background: '#e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: Math.max(10, size * 0.4),
    fontWeight: 700,
    color: 'rgba(60,30,30,0.85)',
  };

  return (
    <div style={common}>
      <UserAvatar
        userId={member.id}
        name={member.name || ''}
        avatarUrlPath={member.avatarUrl}
        imgStyle={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8 }}
        initialStyle={{ fontSize: Math.max(10, size * 0.4), fontWeight: 700, color: 'rgba(60,30,30,0.85)' }}
      />
    </div>
  );
}
