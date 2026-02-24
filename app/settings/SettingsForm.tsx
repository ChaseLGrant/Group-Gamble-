'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Save } from 'lucide-react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Avatar from '@/components/ui/Avatar';
import { updateProfile, signOut } from '@/lib/actions/auth';
import type { Profile } from '@/lib/types';

interface SettingsFormProps {
  profile: Profile | null;
  userEmail?: string;
  isFirstLogin?: boolean;
}

export default function SettingsForm({ profile, userEmail, isFirstLogin }: SettingsFormProps) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSaved(false);

    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }

    setSaving(true);
    const result = await updateProfile(displayName.trim());
    setSaving(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSaved(true);
      if (isFirstLogin) {
        router.push('/app');
      }
    }
  }

  async function handleSignOut() {
    setSigningOut(true);
    await signOut();
  }

  return (
    <div className="space-y-6">
      {/* Avatar preview */}
      <div className="flex flex-col items-center gap-3">
        <Avatar
          src={profile?.avatar_url}
          name={displayName || profile?.display_name || 'You'}
          size="lg"
        />
        <p className="text-xs text-zinc-600">
          {userEmail}
        </p>
      </div>

      {/* Profile form */}
      <form onSubmit={handleSave} className="space-y-4">
        <Input
          label="Display Name"
          type="text"
          placeholder="How you appear to others"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={50}
          hint="Max 50 characters"
          error={error}
        />

        {saved && (
          <p className="text-sm text-green-400 text-center">✓ Profile saved!</p>
        )}

        <Button type="submit" fullWidth loading={saving} size="lg">
          <Save size={18} />
          {isFirstLogin ? 'Create Profile & Continue' : 'Save Profile'}
        </Button>
      </form>

      {/* Sign out */}
      {!isFirstLogin && (
        <div className="pt-4 border-t border-zinc-800">
          <Button
            variant="danger"
            fullWidth
            onClick={handleSignOut}
            loading={signingOut}
          >
            <LogOut size={16} />
            Sign Out
          </Button>
        </div>
      )}

      {/* Beta notice */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
        <p className="text-xs text-zinc-600 text-center">
          Group Gamble Beta — Play-money only. No real money involved.
        </p>
      </div>
    </div>
  );
}
