'use client';

import { useState } from 'react';
import { UserPlus, Phone } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { addMemberByPhone } from '@/lib/actions/groups';

interface AddMemberByPhoneProps {
  groupId: string;
}

export default function AddMemberByPhone({ groupId }: AddMemberByPhoneProps) {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!phone.trim()) {
      setError('Phone number is required');
      return;
    }

    setLoading(true);
    const result = await addMemberByPhone(groupId, phone.trim());
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess('Member added!');
      setPhone('');
      setTimeout(() => {
        setSuccess('');
        setShowForm(false);
      }, 2000);
    }
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="flex items-center gap-1.5 text-zinc-400 hover:text-zinc-100 transition-colors p-1.5 rounded-lg hover:bg-zinc-800"
        title="Add member by phone"
      >
        <UserPlus size={18} />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-t-2xl p-5 space-y-4 animate-slide-up">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-zinc-100">Add Member by Phone</h3>
          <button
            onClick={() => { setShowForm(false); setError(''); setSuccess(''); }}
            className="text-zinc-500 hover:text-zinc-300 text-sm"
          >
            Cancel
          </button>
        </div>

        <p className="text-xs text-zinc-500">
          The person must have their phone number saved in their Group Gamble profile.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+1 555 123 4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            error={error}
            leftAddon={<Phone size={16} />}
            autoFocus
          />

          {success && (
            <p className="text-sm text-green-400 text-center">✓ {success}</p>
          )}

          <Button type="submit" fullWidth loading={loading}>
            <UserPlus size={18} />
            Add to Group
          </Button>
        </form>
      </div>
    </div>
  );
}
