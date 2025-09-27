
'use server';

import { createSupabaseServerClient } from '@/lib/supabaseClient';
import { revalidatePath } from 'next/cache';
import type { CertificateTemplate } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function getCertificateTemplateAction(
  templateType: string
): Promise<{ ok: boolean; template?: CertificateTemplate; message?: string }> {
  const supabase = createSupabaseServerClient();
  try {
    const { data, error } = await supabase
      .from('certificate_templates')
      .select('*')
      .eq('template_type', templateType)
      .maybeSingle();

    if (error) {
        if(error.message.includes('relation "public.certificate_templates" does not exist')) {
            return { ok: false, message: "The certificate_templates table does not exist. Please run the SQL migration."};
        }
        throw error;
    }
    return { ok: true, template: data as CertificateTemplate | undefined };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}

export async function saveCertificateTemplateAction(
  templateType: string,
  templateData: Partial<Omit<CertificateTemplate, 'id' | 'template_type' | 'created_at' | 'updated_at'>>,
  backgroundImageFile?: File
): Promise<{ ok: boolean; message: string; template?: CertificateTemplate }> {
  const supabase = createSupabaseServerClient();

  try {
    let background_image_url = templateData.background_image_url;

    if (backgroundImageFile) {
      const sanitizedFileName = backgroundImageFile.name.replace(/[^a-zA-Z0-9_.-]/g, '_');
      const filePath = `public/certificate-templates/${templateType}-${uuidv4()}-${sanitizedFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('campushub')
        .upload(filePath, backgroundImageFile, { upsert: true });

      if (uploadError) throw new Error(`Background image upload failed: ${uploadError.message}`);

      const { data: publicUrlData } = supabase.storage.from('campushub').getPublicUrl(filePath);
      background_image_url = publicUrlData.publicUrl;
    }

    const dataToUpsert = {
      ...templateData,
      template_type: templateType,
      background_image_url,
      updated_at: new Date().toISOString(),
    };
    
    const { data, error } = await supabase
      .from('certificate_templates')
      .upsert(dataToUpsert, { onConflict: 'template_type', ignoreDuplicates: false })
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/superadmin/lms/certificate-templates/${templateType}`);
    return { ok: true, message: 'Template saved successfully.', template: data as CertificateTemplate };
  } catch (e: any) {
    return { ok: false, message: e.message };
  }
}
