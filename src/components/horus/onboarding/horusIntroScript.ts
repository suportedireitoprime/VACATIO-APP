// Narração por cena — Horus. startFrame ~ início real da cena na composição.
// Editável no admin sem afetar o vídeo.
export type NarracaoScene = { id: string; startFrame: number; text: string };

export const HORUS_INTRO_SCRIPT: NarracaoScene[] = [
  { id: 'abertura', startFrame: 0, text: 'Olá! Eu sou o Horus, seu assistente jurídico dentro do Vacatio.' },
  { id: 'apresentacao', startFrame: 75, text: 'Fui feito pra caminhar do seu lado nos estudos e no dia a dia do Direito.' },
  { id: 'whats', startFrame: 125, text: 'Você conversa comigo direto no WhatsApp. Manda texto, foto ou áudio e eu respondo em segundos, a qualquer hora.' },
  { id: 'docs', startFrame: 260, text: 'Me envia um contrato, edital ou sentença. Eu leio tudo e devolvo o essencial em pontos claros.' },
  { id: 'ocr', startFrame: 395, text: 'Tirou foto do seu caderno ou da prova? Mando a foto e eu transcrevo, explico e resolvo com você.' },
  { id: 'audio', startFrame: 530, text: 'Sem tempo pra digitar? Grava um áudio e eu escuto, entendo e respondo falando também.' },
  { id: 'radar', startFrame: 665, text: 'Fico de olho no Diário Oficial e nos tribunais. Quando algo mudar na sua área, eu te aviso.' },
  { id: 'checklist', startFrame: 795, text: 'Resumindo: converso, leio documentos, reconheço imagens, entendo áudios e monitoro a legislação por você.' },
  { id: 'limites', startFrame: 950, text: 'Duas coisas que eu não faço: não substituo seu advogado e não emito pareceres oficiais. Sou um copiloto.' },
  { id: 'pergunta', startFrame: 1090, text: 'Antes de começar, como você quer que eu te chame?' },
  { id: 'saudacao', startFrame: 1150, text: 'Prazer em conhecer você! Vamos começar.' },
];
