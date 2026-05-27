import React, { useEffect, useState } from 'react';

const COLORS = ['#6366F1','#EC4899','#10B981','#F59E0B','#3B82F6','#8B5CF6','#EF4444','#14B8A6'];
const getColor = name => COLORS[(name?.charCodeAt(0) || 0) % COLORS.length];

export default function PresenceBar({ socket, projectId, currentUser }) {
  const [presence, setPresence] = useState([]);

  useEffect(() => {
    if (!socket || !projectId || !currentUser) return;

    socket.emit('presence:join', { projectId, user: { id: currentUser._id, name: currentUser.name } });

    const handleUpdate = (users) => {
      setPresence(users.filter(u => u.id !== currentUser._id && u.userId !== currentUser._id));
    };

    socket.on('presence:update', handleUpdate);

    return () => {
      socket.off('presence:update', handleUpdate);
    };
  }, [socket, projectId, currentUser]);

  if (presence.length === 0) return null;

  return (
    <div className="flex items-center gap-3 px-3 py-1.5 bg-green-50 border border-green-100 rounded-full">
      <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
      <div className="flex items-center">
        {presence.slice(0, 5).map((u, i) => (
          <div key={u.id || u.userId} style={{ marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i, position: 'relative', animation: `popIn 0.3s ease ${i * 0.08}s both` }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid white', background: getColor(u.name), display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>
              {u.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <span style={{ position: 'absolute', bottom: -2, right: -2, width: 10, height: 10, background: '#4ade80', borderRadius: '50%', border: '2px solid white' }} />
          </div>
        ))}
      </div>
      <span className="text-green-700 text-xs font-medium ml-1">
        {presence.length === 1 
          ? `${presence[0].name.split(' ')[0]} is here`
          : `${presence.length} teammates online`}
      </span>
    </div>
  );
}
