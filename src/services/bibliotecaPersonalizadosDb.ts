import { createSyncedList, registerForSync } from '@/lib/userSync';
import { supabase } from '@/integrations/supabase/client';
import { extractFirstPageAsCover } from '@/lib/pdfCoverExtractor';

export interface CustomPdfRecord {
  id: string;
  titulo: string;
  autor?: string;
  pdfUrl?: string; // supabase storage public URL or path
  capaUrl?: string; // supabase storage public URL or path
  createdAt: number;
}

const syncList = registerForSync(
  createSyncedList<CustomPdfRecord>({
    escopo: 'custom_pdfs',
    storageKey: 'custom_pdfs:cache',
    keyOf: (item) => item.id,
    atOf: (item) => item.createdAt,
    withAt: (item, at) => ({ ...item, createdAt: at }),
  })
);

export async function uploadCustomPdfWithCover(
  file: File,
  id: string,
  titulo: string,
  autor?: string
): Promise<CustomPdfRecord> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('Você precisa estar logado para salvar PDFs.');
  }

  // 1. Extract the cover locally
  const fileArrayBuffer = await file.arrayBuffer();
  let coverBlob: Blob | null = null;
  try {
    const coverDataUrl = await extractFirstPageAsCover(fileArrayBuffer);
    const res = await fetch(coverDataUrl);
    coverBlob = await res.blob();
  } catch (err) {
    console.warn('Falha ao extrair capa do PDF:', err);
  }

  // 2. Request Signed Upload URLs via Edge Function
  const { data: functionData, error: functionErr } = await supabase.functions.invoke('upload-custom-pdf', {
    body: { pdfId: id }
  });

  if (functionErr) {
    throw new Error('Erro ao preparar envio para nuvem: ' + functionErr.message);
  }

  const { pdfUploadUrl, coverUploadUrl, pdfPublicUrl, coverPublicUrl } = functionData;

  // 3. Upload PDF using Signed URL
  const pdfUploadRes = await fetch(pdfUploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf' },
    body: fileArrayBuffer
  });
  
  if (!pdfUploadRes.ok) {
    throw new Error('Erro ao enviar PDF para nuvem.');
  }

  // 4. Upload Cover using Signed URL
  let finalCoverUrl = undefined;
  if (coverBlob && coverUploadUrl) {
    const coverUploadRes = await fetch(coverUploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'image/jpeg' },
      body: coverBlob
    });
    if (coverUploadRes.ok) {
      finalCoverUrl = coverPublicUrl;
    }
  }

  // 5. Save metadata to synced list
  const record: CustomPdfRecord = {
    id,
    titulo,
    autor: autor || undefined,
    pdfUrl: pdfPublicUrl,
    capaUrl: finalCoverUrl,
    createdAt: Date.now()
  };

  syncList.put(record);
  return record;
}

export function listCustomPdfs(): CustomPdfRecord[] {
  return syncList.read().sort((a, b) => b.createdAt - a.createdAt);
}

export async function removeCustomPdf(id: string): Promise<void> {
  const item = syncList.read().find((i) => i.id === id);
  if (!item) return;

  // Optimistically remove locally and sync metadata
  syncList.remove(id);

  // Attempt to delete physical files from storage if the user owns them
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    try {
      await supabase.storage.from('custom_pdfs').remove([
        `${user.id}/${id}.pdf`,
        `${user.id}/${id}-cover.jpg`
      ]);
    } catch {
      // Ignorar erros de exclusão física se as policies não permitirem
    }
  }
}

export function subscribeCustomPdfs(callback: () => void) {
  // Simples poll ou trigger manual via hook
  const interval = setInterval(() => {
    callback();
  }, 1000);
  return () => clearInterval(interval);
}
