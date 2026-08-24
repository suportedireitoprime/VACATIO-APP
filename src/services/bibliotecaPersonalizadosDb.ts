import { get, set, del, keys } from 'idb-keyval';

export interface CustomPdfRecord {
  id: string;
  titulo: string;
  data: string; // base64 string
  createdAt: number;
}

const PREFIX = 'custom-pdf:';

export async function saveCustomPdf(id: string, titulo: string, data: string): Promise<void> {
  const record: CustomPdfRecord = { id, titulo, data, createdAt: Date.now() };
  await set(PREFIX + id, record);
}

export async function listCustomPdfs(): Promise<Omit<CustomPdfRecord, 'data'>[]> {
  const allKeys = await keys();
  const pdfKeys = allKeys.filter(k => typeof k === 'string' && k.startsWith(PREFIX));
  const list: Omit<CustomPdfRecord, 'data'>[] = [];
  
  for (const k of pdfKeys) {
    const item = await get<CustomPdfRecord>(k as string);
    if (item) {
      list.push({ id: item.id, titulo: item.titulo, createdAt: item.createdAt });
    }
  }
  return list.sort((a, b) => b.createdAt - a.createdAt);
}

export async function getCustomPdf(id: string): Promise<CustomPdfRecord | undefined> {
  return get<CustomPdfRecord>(PREFIX + id);
}

export async function removeCustomPdf(id: string): Promise<void> {
  await del(PREFIX + id);
}
