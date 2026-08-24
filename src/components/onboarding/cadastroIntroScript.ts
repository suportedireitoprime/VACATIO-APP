export type NarracaoScene = { id: string; startFrame: number; text: string };

// Timings aproximados. Cada cena começa ~ soma(SEQ prévias) - soma(TRANS prévias).
export const CADASTRO_SCRIPT: NarracaoScene[] = [
  { id: 'abertura', startFrame: 0, text: 'Bem-vindo ao Vacatio. Direito, do seu jeito.' },
  { id: 'boas', startFrame: 55, text: 'Vamos montar o app do seu jeito. São três perguntas rápidas.' },
  { id: 'persona', startFrame: 105, text: 'Primeiro, me conta: quem é você agora? Estudante, oabeiro, concurseiro ou advogado?' },
  { id: 'confirma', startFrame: 155, text: 'Perfeito. Anotado.' },
  { id: 'faixa', startFrame: 190, text: 'Agora, sua faixa etária. A gente ajusta a linguagem e o conteúdo pra você.' },
  { id: 'interesses', startFrame: 240, text: 'Todas as grandes áreas do Direito, reunidas num só lugar.' },
  { id: 'featBook', startFrame: 335, text: 'Na biblioteca, milhares de leis explicadas, com códigos comentados e clássicos do Direito.' },
  { id: 'featRadar', startFrame: 440, text: 'O Radar de Leis fica de olho por você. Novas leis e súmulas chegam com resumo pronto.' },
  { id: 'featOwl', startFrame: 545, text: 'O Horus é seu assistente no WhatsApp. Tira dúvidas por texto, foto ou áudio, a qualquer hora.' },
  { id: 'featNotif', startFrame: 650, text: 'E as notificações trazem só o que importa da sua área. Sem spam.' },
  { id: 'encerramento', startFrame: 745, text: 'Pronto! Seu Vacatio já está personalizado. Bora estudar.' },
];
