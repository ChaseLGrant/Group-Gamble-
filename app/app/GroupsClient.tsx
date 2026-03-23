'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import GroupCard from '@/components/groups/GroupCard';
import CreateGroupForm from '@/components/groups/CreateGroupForm';
import Button from '@/components/ui/Button';

interface GroupsClientProps {
  initialGroups: any[];
}

export default function GroupsClient({ initialGroups }: GroupsClientProps) {
  const router = useRouter();
  const [groups] = useState(initialGroups);
  const hasGroups = groups.length > 0;
  const [showCreate, setShowCreate] = useState(!hasGroups);

  function handleGroupCreated(id: string) {
    router.push(`/g/${id}`);
  }

  return (
    <div className="space-y-4">
      {/* Create group toggle */}
      {!showCreate ? (
        <Button
          onClick={() => setShowCreate(true)}
          fullWidth
          variant="outline"
          className="border-dashed border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
        >
          <Plus size={18} />
          Create a New Group
        </Button>
      ) : (
        <div className="relative">
          {hasGroups && (
            <button
              onClick={() => setShowCreate(false)}
              className="absolute -top-1 -right-1 z-10 bg-zinc-700 rounded-full p-1"
            >
              <X size={14} className="text-zinc-300" />
            </button>
          )}
          <CreateGroupForm onSuccess={handleGroupCreated} />
        </div>
      )}

      {/* Groups list */}
      {groups.length > 0 ? (
        <div className="space-y-3">
          {groups.map((group) => (
            <GroupCard key={group.id} group={group} />
          ))}
        </div>
      ) : (
        !showCreate && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <div className="text-5xl">🎲</div>
            <div>
              <p className="text-zinc-300 font-semibold">No groups yet</p>
              <p className="text-zinc-500 text-sm mt-1">
                Create one for tonight, or join via an invite link from a friend.
              </p>
            </div>
          </div>
        )
      )}
    </div>
  );
}
