
'use server';
import { createSupabaseServerClient } from '@/lib/supabaseClient';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

export async function updateUserPasswordAction(userId: string, newPassword: string): Promise<{ ok: boolean; message: string }> {
  if (!userId || !newPassword) {
    return { ok: false, message: 'User ID and new password are required.' };
  }
  if (newPassword.length < 6) {
      return { ok: false, message: 'Password must be at least 6 characters long.'};
  }

  const supabase = createSupabaseServerClient();
  try {
    const hashedPassword = await bcrypt.hash(newPassword, SALT_ROUNDS);
    const { error } = await supabase
      .from('users')
      .update({ password_hash: hashedPassword })
      .eq('id', userId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    return { ok: true, message: 'Password updated successfully.' };

  } catch (error: any) {
    console.error('Error updating password:', error);
    return { ok: false, message: `An unexpected error occurred: ${error.message}` };
  }
}

export async function deactivateSelfAction(userId: string): Promise<{ ok: boolean; message: string }> {
  if (!userId) {
    return { ok: false, message: 'User ID is required.' };
  }

  const supabase = createSupabaseServerClient();
  try {
    const { error } = await supabase
      .from('users')
      .update({ status: 'Inactive' })
      .eq('id', userId);

    if (error) {
      throw new Error(`Database error: ${error.message}`);
    }
    
    return { ok: true, message: 'Account deactivated successfully.' };

  } catch (error: any) {
    console.error('Error deactivating account:', error);
    return { ok: false, message: `An unexpected error occurred: ${error.message}` };
  }
}

