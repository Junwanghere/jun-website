'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export async function deleteCover(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('covers').delete().eq('id', id)
  if (error) throw error
  revalidatePath('/admin/covers')
  revalidatePath('/covers')
}
