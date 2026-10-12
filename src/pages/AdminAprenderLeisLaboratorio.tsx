import { useState, useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FlaskConical, 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sparkles, 
  CheckCircle2, 
  XCircle, 
  HelpCircle, 
  BookOpen, 
  Scale, 
  Clock, 
  Lightbulb, 
  ShieldCheck, 
  Users, 
  MessageSquare, 
  Layers, 
  BrainCircuit, 
  ExternalLink,
  Info,
  Maximize2
} from 'lucide-react';
import { toast } from 'sonner';
import DesktopPageLayout from '@/components/layout/DesktopPageLayout';
import { PageHeader } from '@/components/vademecum/PageHeader';
import { useAuth } from '@/hooks/useAuth';
import { isAdminEmail } from '@/lib/adminEmails';

// ==========================================
// DADOS DOS ARTIGOS E DAS 5 MECÂNICAS DE AULA
// ==========================================

export type ArtigoId = 'art1' | 'art2';
export type MecanicaId = 'anatomia' | 'storytelling' | 'dialogo' | 'linha_tempo' | 'mapa_decisao';

interface SlideData {
  id: string;
  badge: string;
  titulo: string;
  subtitulo?: string;
  conteudoPrincipal: React.ReactNode;
  textoAudio: string; // Texto limpo para síntese de voz
  interacaoTipo?: 'flip' | 'quiz' | 'simulador' | 'faq' | 'leitura';
}

interface MecanicaDef {
  id: MecanicaId;
  nome: string;
  icone: any;
  subtitulo: string;
  descricaoPedagogica: string;
  focoLeigo: string;
  slides: Record<ArtigoId, SlideData[]>;
}

const MECANICAS: MecanicaDef[] = [
  // ----------------------------------------------------
  // MECÂNICA 1: ANATOMIA & TRADUÇÃO PALAVRA POR PALAVRA
  // ----------------------------------------------------
  {
    id: 'anatomia',
    nome: '1. Anatomia & Tradução',
    icone: Layers,
    subtitulo: 'Desconstrução do juridiquês em português claro',
    descricaoPedagogica: 'Divide o texto arcaico em blocos isolados, mostrando o que a lei diz vs o que significa no dia a dia.',
    focoLeigo: 'Elimina o medo do juridiquês e traduz cada termo técnico imediatamente.',
    slides: {
      art1: [
        {
          id: 'art1-anat-1',
          badge: 'Passo 1 de 5 · O Texto Oficial',
          titulo: 'O que o Código Penal realmente diz?',
          subtitulo: 'Decreto-Lei nº 2.848/1940 — Artigo 1º',
          textoAudio: 'Artigo primeiro do Código Penal. Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal. Parece difícil, mas vamos destrinchar cada palavra agora.',
          conteudoPrincipal: (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-teal-400">
                  Texto Literal da Lei
                </span>
                <p className="font-serif text-lg sm:text-xl text-foreground font-medium leading-relaxed italic">
                  “Não há crime sem lei anterior que o defina. Não há pena sem prévia cominação legal.”
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-border bg-card/60 flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  À primeira vista, soa formal e distante. Porém, este pequeno artigo é o seu maior escudo contra abusos do governo. Ele é dividido em duas partes fundamentais. Vamos ver a primeira?
                </p>
              </div>
            </div>
          ),
        },
        {
          id: 'art1-anat-2',
          badge: 'Passo 2 de 5 · Primeira Metade',
          titulo: '“Não há crime sem lei anterior que o defina”',
          subtitulo: 'Tradução: A regra precisa existir antes do jogo começar',
          textoAudio: 'Primeira parte: Não há crime sem lei anterior. Isso significa que ninguém pode inventar uma regra depois que o jogo começou. Você só pode ser punido se a proibição já estava escrita em uma lei aprovada.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Na Lei</span>
                  <p className="text-xs font-mono text-foreground">“...sem lei anterior que o defina”</p>
                  <p className="text-xs text-muted-foreground">Exige anterioridade e reserva legal estrita.</p>
                </div>
                <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Na Vida Real</span>
                  <p className="text-xs font-medium text-emerald-200">“A placa tem que estar lá antes de você passar”</p>
                  <p className="text-xs text-muted-foreground">Se você fez algo hoje que não é proibido, nenhum policial ou juiz pode inventar um crime amanhã para te prender.</p>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-border/60 bg-secondary/30 text-xs text-muted-foreground">
                <strong className="text-foreground">Exemplo prático:</strong> Se amanhã o Congresso inventar que usar boné vermelho é crime, quem usou boné vermelho ontem não pode ser incomodado.
              </div>
            </div>
          ),
        },
        {
          id: 'art1-anat-3',
          badge: 'Passo 3 de 5 · Segunda Metade',
          titulo: '“Não há pena sem prévia cominação legal”',
          subtitulo: 'Tradução: O castigo também já tem que estar tabelado',
          textoAudio: 'Segunda parte: Não há pena sem prévia cominação legal. Cominação significa apenas ameaça ou previsão de castigo. O juiz não pode inventar a punição da própria cabeça.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-teal-500/30 bg-card space-y-2">
                <div className="flex items-center gap-2 text-teal-400 font-semibold text-xs">
                  <Info className="w-4 h-4" />
                  O que significa a palavra "Cominação"?
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <strong>Cominação</strong> vem de cominar (ameaçar, fixar previamente). A lei precisa dizer: <em>"Pena: reclusão de 1 a 4 anos e multa"</em>. O juiz só pode aplicar o que a lei permitiu.
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-border/80 bg-secondary/40 space-y-1">
                <span className="text-xs font-bold text-foreground">O que o juiz NÃO pode fazer:</span>
                <p className="text-xs text-muted-foreground">
                  O juiz não pode dizer: <em>"Achei seu ato feio, então inventei que você vai varrer a praça por 10 anos"</em> se essa punição não existir na lei antes.
                </p>
              </div>
            </div>
          ),
        },
        {
          id: 'art1-anat-4',
          badge: 'Passo 4 de 5 · O Grande Escudo',
          titulo: 'Por que isso protege você?',
          subtitulo: 'O princípio que derrotou a tirania dos governantes',
          textoAudio: 'Antigamente, reis e ditadores mandavam prender qualquer pessoa inventando crimes de surpresa. O artigo primeiro garante segurança jurídica para você viver em paz.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3.5 rounded-xl border border-teal-500/20 bg-teal-950/15">
                <ShieldCheck className="w-6 h-6 text-teal-400 shrink-0 mt-0.5" />
                <div className="text-xs sm:text-sm space-y-1">
                  <strong className="text-foreground">Segurança Jurídica Total:</strong>
                  <p className="text-muted-foreground leading-relaxed">
                    Você pode planejar sua vida e seu trabalho sabendo exatamente o que é proibido e o que é permitido. Ninguém pode ser pego de surpresa pelo Estado.
                  </p>
                </div>
              </div>
              <div className="p-3 rounded-xl border border-border/50 bg-card text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">Como explicar para sua avó:</span> “Vó, ninguém pode te castigar por fazer bolo de fubá hoje se a proibição do bolo só foi inventada amanhã.”
              </div>
            </div>
          ),
        },
        {
          id: 'art1-anat-5',
          badge: 'Passo 5 de 5 · Quiz Rápido',
          titulo: 'Teste o que você aprendeu!',
          subtitulo: 'Situação real de teste',
          textoAudio: 'Quiz rápido. O prefeito da sua cidade fez um decreto proibindo soltar pipa às terças-feiras e mandou a polícia prender quem soltou pipa na semana passada. Isso é permitido?',
          interacaoTipo: 'quiz',
          conteudoPrincipal: <QuizArtigo1Anatomia />,
        },
      ],
      art2: [
        {
          id: 'art2-anat-1',
          badge: 'Passo 1 de 5 · O Texto Oficial',
          titulo: 'O que diz o Artigo 2º do Código Penal?',
          subtitulo: 'A lei penal no tempo e a retroatividade benigna',
          textoAudio: 'Artigo segundo do Código Penal: Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória.',
          conteudoPrincipal: (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-2">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-teal-400">
                  Caput do Artigo 2º
                </span>
                <p className="font-serif text-base sm:text-lg text-foreground font-medium leading-relaxed italic">
                  “Ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando em virtude dela a execução e os efeitos penais da sentença condenatória.”
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border bg-card/60 text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Aqui aprendemos o que acontece quando a lei muda <strong>depois</strong> que o fato já aconteceu. O que ocorre se o ato deixar de ser crime? Ou se a pena diminuir? Vamos ver!
              </div>
            </div>
          ),
        },
        {
          id: 'art2-anat-2',
          badge: 'Passo 2 de 5 · Abolitio Criminis',
          titulo: 'Quando o crime deixa de ser crime',
          subtitulo: 'Se a sociedade não quer mais punir, a cadeia abre',
          textoAudio: 'Abolitio criminis. Se uma nova lei diz que aquilo não é mais crime, quem está preso é solto e a ficha criminal fica limpa desse crime imediatamente.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Efeito Imediato</span>
                <h4 className="text-sm font-bold text-emerald-200">Soltura e Ficha Limpa</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Se a nova lei diz: <em>"Isso não é mais crime"</em>, todos os processos são cancelados. Quem estava preso sai na hora e os antecedentes penais daquele fato são apagados.
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border/60 bg-secondary/30 text-xs text-muted-foreground">
                <strong className="text-foreground">Exemplo real no Brasil:</strong> Até 2005, adultério era considerado crime no Código Penal. Quando a nova lei revogou o crime, todos os processos de adultério foram extintos na hora!
              </div>
            </div>
          ),
        },
        {
          id: 'art2-anat-3',
          badge: 'Passo 3 de 5 · Parágrafo Único',
          titulo: 'A Lei Posterior Mais Favorável',
          subtitulo: 'A lei que ajuda pega a máquina do tempo',
          textoAudio: 'Parágrafo único do artigo segundo: A lei posterior que de qualquer modo favorecer o agente aplica-se aos fatos anteriores, ainda que decididos por sentença condenatória transitada em julgado.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400">Parágrafo Único</span>
                <p className="text-xs font-mono text-foreground">
                  “A lei posterior, que de qualquer modo favorecer o agente, aplica-se aos fatos anteriores...”
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Mesmo que o juiz já tenha batido o martelo final (trânsito em julgado) e a pessoa já esteja na prisão há 3 anos: se a lei nova baixar a pena, a pena dessa pessoa também baixa!
                </p>
              </div>
              <div className="p-3 rounded-xl border border-border/50 bg-card text-xs text-muted-foreground">
                <strong className="text-foreground">Resumo de ouro:</strong> A lei penal nunca volta no tempo para PREJUDICAR, mas sempre volta no tempo para AJUDAR.
              </div>
            </div>
          ),
        },
        {
          id: 'art2-anat-4',
          badge: 'Passo 4 de 5 · Efeitos Civis vs Penais',
          titulo: 'O que apaga e o que continua?',
          subtitulo: '“...cessando os efeitos penais”',
          textoAudio: 'Atenção leiga: a lei nova apaga os efeitos penais, como a prisão e reincidência. Mas se você causou prejuízo financeiro para alguém, a obrigação de pagar a indenização cível continua valendo.',
          conteudoPrincipal: (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/15 space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">O que é cancelado:</span>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Pena de prisão e multa criminal</li>
                  <li>Mancha na ficha criminal (reincidência)</li>
                  <li>Execução penal</li>
                </ul>
              </div>
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/15 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase">O que permanece:</span>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Dever civil de indenizar dano causado</li>
                  <li>Devolução de bens da vítima</li>
                </ul>
              </div>
            </div>
          ),
        },
        {
          id: 'art2-anat-5',
          badge: 'Passo 5 de 5 · Quiz Rápido',
          titulo: 'Teste o que você aprendeu!',
          subtitulo: 'Situação real do Artigo 2º',
          textoAudio: 'Quiz do artigo segundo. Um homem foi condenado a 8 anos e já cumpriu 3 anos. Se hoje for aprovada uma lei reduzindo a pena máxima para 3 anos, o que acontece com ele?',
          interacaoTipo: 'quiz',
          conteudoPrincipal: <QuizArtigo2Anatomia />,
        },
      ],
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 2: STORYTELLING & CASO DA VIDA REAL
  // ----------------------------------------------------
  {
    id: 'storytelling',
    nome: '2. Storytelling & Casos Reais',
    icone: BookOpen,
    subtitulo: 'História em capítulos com dilemas humanos',
    descricaoPedagogica: 'Ensina o princípio através de uma narrativa com personagens do cotidiano, gerando empatia e conexão prática.',
    focoLeigo: 'Mostra o impacto na vida de uma pessoa comum sem termos jurídicos frios.',
    slides: {
      art1: [
        {
          id: 'art1-story-1',
          badge: 'Capítulo 1 · A Rotina Tranquila',
          titulo: 'Conheça Dona Clara e sua quitanda',
          subtitulo: 'Um negócio 100% legal e honesto',
          textoAudio: 'Capítulo 1. Dona Clara tem uma quitanda no bairro e vende um chá de ervas artesanal que ela mesma prepara há mais de 10 anos. Tudo com nota fiscal e dentro da lei.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-border/80 bg-secondary/30 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-2xl shrink-0">
                  👵
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Dona Clara, 62 anos</h4>
                  <p className="text-xs text-muted-foreground">Comerciante de bairro querida por todos. Produz e vende chás naturais de camomila e capim-cidreira.</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Durante anos, Dona Clara vendeu seus chás sem qualquer problema. A atividade era completamente legal e incentivada.
              </p>
            </div>
          ),
        },
        {
          id: 'art1-story-2',
          badge: 'Capítulo 2 · A Reviravolta',
          titulo: 'A nova lei aprovada em Brasília',
          subtitulo: 'Uma proibição inesperada entra em vigor',
          textoAudio: 'Capítulo 2. No dia 1º de junho, o Congresso aprova uma nova lei dizendo que o capim-cidreira concentrado agora é substância controlada sob pena de até 3 anos de prisão.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-1">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">📅 1º de Junho</span>
                <p className="text-xs font-semibold text-foreground">Entra em vigor a Lei nº 99.999</p>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A lei estabelece: <em>"É crime vender extrato concentrado dessa erva sem autorização médica. Pena: 1 a 3 anos de reclusão."</em>
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                No dia 2 de junho, a fiscalização sanitária acompanhada de policiais bate na porta de Dona Clara.
              </p>
            </div>
          ),
        },
        {
          id: 'art1-story-3',
          badge: 'Capítulo 3 · O Conflito',
          titulo: '“A senhora vendeu semana passada!”',
          subtitulo: 'A acusação injusta da fiscalização',
          textoAudio: 'Capítulo 3. O fiscal mostra o caderninho de vendas de Dona Clara do mês de maio e diz: a senhora vendeu 50 frascos semana passada, então vamos te levar presa.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-2">
                <div className="text-xs font-bold text-rose-300">👮 O Fiscal diz:</div>
                <p className="text-xs text-muted-foreground italic">
                  “Dona Clara, temos as notas do mês passado. A senhora cometeu crime ao vender esses frascos!”
                </p>
              </div>
              <div className="p-3.5 rounded-xl border border-teal-500/30 bg-teal-950/20 space-y-2">
                <div className="text-xs font-bold text-teal-300">👵 Dona Clara responde em prantos:</div>
                <p className="text-xs text-muted-foreground italic">
                  “Mas semana passada não era proibido! Como eu ia adivinhar o futuro?”
                </p>
              </div>
            </div>
          ),
        },
        {
          id: 'art1-story-4',
          badge: 'Capítulo 4 · A Justiça em Ação',
          titulo: 'O Artigo 1º protege Dona Clara',
          subtitulo: 'A lei não pode olhar para trás',
          textoAudio: 'Capítulo 4. O advogado de Dona Clara chega e cita o artigo primeiro do Código Penal: Não há crime sem lei anterior que o defina. Dona Clara está livre de qualquer acusação.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-teal-500/30 bg-card space-y-2">
                <div className="flex items-center gap-2 text-teal-400 font-bold text-xs uppercase">
                  <ShieldCheck className="w-4 h-4" />
                  Decisão do Delegado e do Juiz:
                </div>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  O artigo 1º do Código Penal impede que Dona Clara seja punida pelo que fez antes da lei existir. As vendas do mês passado foram 100% lícitas. Ela apenas deve parar de vender a partir de hoje.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Moral da história: a lei penal só anda para a frente, nunca para trás para prejudicar você.
              </p>
            </div>
          ),
        },
        {
          id: 'art1-story-5',
          badge: 'Capítulo 5 · Conclusão Prática',
          titulo: 'O que aprendemos com a história?',
          subtitulo: 'Resumo da lição para a sua vida',
          textoAudio: 'Lição final: Ninguém pode te punir por algo que não era crime no momento em que você fez. Guarde o artigo primeiro como seu escudo de liberdade.',
          conteudoPrincipal: (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">Regra de Ouro Gravada!</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você agora entende perfeitamente o <strong>Princípio da Anterioridade</strong>. Você tem o direito de viver tranquilo sem medo de leis futuras inventadas por surpresa.
              </p>
            </div>
          ),
        },
      ],
      art2: [
        {
          id: 'art2-story-1',
          badge: 'Capítulo 1 · A Prisão de Lucas',
          titulo: 'Lucas e a condenação no passado',
          subtitulo: 'Condenado a 4 anos por um fato de 2021',
          textoAudio: 'Capítulo 1. Lucas foi condenado a 4 anos de prisão em 2021 por uma conduta que na época era considerada crime. Ele já cumpriu 2 anos e o processo já terminou com sentença definitiva.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-border/80 bg-secondary/30 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-2xl shrink-0">
                  👨
                </div>
                <div>
                  <h4 className="text-sm font-bold text-foreground">Lucas, 28 anos</h4>
                  <p className="text-xs text-muted-foreground">Cumprindo pena há 2 anos. Processo transitou em julgado (não cabia mais nenhum recurso).</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                A família de Lucas achava que ele teria que ficar preso até o último dia da condenação de 4 anos.
              </p>
            </div>
          ),
        },
        {
          id: 'art2-story-2',
          badge: 'Capítulo 2 · A Mudança na Lei',
          titulo: 'Uma nova lei revoga o crime',
          subtitulo: 'A sociedade decidiu que aquilo não é mais motivo de cadeia',
          textoAudio: 'Capítulo 2. Em 2024, o Congresso Nacional percebe que aquela conduta não faz sentido como crime e revoga totalmente o artigo da lei.',
          conteudoPrincipal: (
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2">
              <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">📢 Notícia Nacional</span>
              <h4 className="text-sm font-bold text-emerald-200">Aprovada a Descriminalização</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                A conduta de Lucas deixou de ser crime. Mas e agora? O caso dele já estava encerrado e o juiz já tinha batido o martelo anos atrás. Ele continua preso?
              </p>
            </div>
          ),
        },
        {
          id: 'art2-story-3',
          badge: 'Capítulo 3 · O Artigo 2º Abre a Cela',
          titulo: 'O benefício viaja no tempo',
          subtitulo: 'Abolitio Criminis entra em ação',
          textoAudio: 'Capítulo 3. O artigo segundo do Código Penal determina: ninguém pode ser punido por fato que lei posterior deixa de considerar crime, cessando a execução da pena.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-teal-500/30 bg-card space-y-2">
                <span className="text-xs font-bold text-teal-400">O Defensor Público solicita:</span>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  Com base no <strong>Art. 2º do Código Penal</strong>, a execução da pena cessa imediatamente! O juiz da vara de execuções emite o alvará de soltura e Lucas volta para casa hoje mesmo.
                </p>
              </div>
            </div>
          ),
        },
        {
          id: 'art2-story-4',
          badge: 'Capítulo 4 · E a Ficha Criminal?',
          titulo: 'Ficha limpa e réu primário',
          subtitulo: 'O crime é apagado do histórico penal',
          textoAudio: 'Capítulo 4. Lucas não apenas sai da prisão, mas a condenação criminal deixa de constar como reincidência. Ele volta a ter a ficha limpa quanto a esse crime.',
          conteudoPrincipal: (
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-2">
              <span className="text-[10px] font-bold text-blue-400 uppercase">Efeito Jurídico Completo</span>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Diferente de um perdão comum, a <strong>Abolitio Criminis</strong> apaga os efeitos penais. Se amanhã Lucas pedir uma certidão de antecedentes, aquele fato não o prejudica mais.
              </p>
            </div>
          ),
        },
        {
          id: 'art2-story-5',
          badge: 'Capítulo 5 · A Regra que Vale Ouro',
          titulo: 'O resumo da jornada de Lucas',
          subtitulo: 'A lição permanente do Artigo 2º',
          textoAudio: 'Lição final do artigo segundo: Quando a lei melhora, ela alcança todo mundo no passado. Mas se a lei piorasse, Lucas estaria protegido pelo artigo primeiro.',
          conteudoPrincipal: (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">A Lei Sempre Ajuda o Cidadão no Passado</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Agora você sabe: quando uma lei penal melhora ou acaba com um crime, ninguém fica preso por teimosia do Estado. O Artigo 2º é a chave da cela.
              </p>
            </div>
          ),
        },
      ],
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 3: DIÁLOGO TUTOR & ALUNO CURIOSO
  // ----------------------------------------------------
  {
    id: 'dialogo',
    nome: '3. Diálogo Tutor & Aluno',
    icone: MessageSquare,
    subtitulo: 'Bate-papo descontraído com metáforas simples',
    descricaoPedagogica: 'Conversa no formato chat moderno onde um aluno leigo faz perguntas naturais e o tutor responde com clareza cristalina.',
    focoLeigo: 'Dúvidas reais que qualquer pessoa tem sem medo de passar vergonha.',
    slides: {
      art1: [
        {
          id: 'art1-chat-1',
          badge: 'Mensagem 1 de 5 · A Dúvida Sincera',
          titulo: '“Professor, e se o governo inventar uma lei hoje?”',
          subtitulo: 'A pergunta que todo mundo quer fazer',
          textoAudio: 'Aluno pergunta: Professor, se o presidente ou o prefeito acordar de mau humor hoje e disser que usar camiseta regata dá 2 anos de cadeia, eu posso ser preso pelo que fiz ontem?',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="flex gap-2.5 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                  Aluno
                </div>
                <div className="p-3 rounded-2xl rounded-tl-none bg-secondary/80 border border-border text-xs sm:text-sm text-foreground max-w-[85%]">
                  “Professor, se o presidente ou o prefeito acordar de mau humor e inventar que andar de chinelo no centro dá 1 ano de cadeia, eu posso ser preso pelo que fiz ontem?”
                </div>
              </div>
              <div className="flex gap-2.5 items-start justify-end">
                <div className="p-3 rounded-2xl rounded-tr-none bg-teal-500/20 border border-teal-500/30 text-xs sm:text-sm text-foreground max-w-[85%] text-right">
                  “Haha! Excelente pergunta! A resposta é um sonoro <strong>NÃO</strong>. E o seu super-herói aqui é o <strong>Artigo 1º do Código Penal</strong>.”
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold shrink-0">
                  Tutor
                </div>
              </div>
            </div>
          ),
        },
        {
          id: 'art1-chat-2',
          badge: 'Mensagem 2 de 5 · A Metáfora do Futebol',
          titulo: 'A analogia do jogo de bola',
          subtitulo: 'Entendendo sem nenhuma palavra em latim',
          textoAudio: 'Tutor explica: Imagina que você está jogando futebol no domingo. No segundo tempo, o juiz inventa que dar passe de calcanhar dá expulsão e expulsa você pelo passe que deu no primeiro tempo. Faria sentido?',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl border border-teal-500/30 bg-card space-y-2">
                <div className="font-semibold text-xs text-teal-400">⚽ A Pelada de Domingo:</div>
                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  Se o árbitro inventasse uma regra nova aos 40 do segundo tempo e expulsasse alguém por algo feito no início do jogo, seria roubo puro. 
                </p>
                <p className="text-xs text-foreground font-medium">
                  No país é a mesma coisa: a regra precisa existir <strong>antes</strong> do pontapé inicial.
                </p>
              </div>
            </div>
          ),
        },
        {
          id: 'art1-chat-3',
          badge: 'Mensagem 3 de 5 · Reserva Legal',
          titulo: 'Quem pode criar crime no Brasil?',
          subtitulo: 'Prefeito ou governador podem inventar crimes?',
          textoAudio: 'Tutor explica: Só o Congresso Nacional, que são os deputados e senadores eleitos pelo povo brasileiro, pode criar crimes. Prefeito, governador e delegado não podem inventar crime por decreto.',
          conteudoPrincipal: (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-1">
                <span className="font-bold text-emerald-400">✅ PODE:</span>
                <p className="text-muted-foreground">Lei aprovada pelo Congresso Nacional (Deputados e Senadores).</p>
              </div>
              <div className="p-3 rounded-xl border border-rose-500/30 bg-rose-950/20 space-y-1">
                <span className="font-bold text-rose-400">❌ NÃO PODE:</span>
                <p className="text-muted-foreground">Decreto de prefeito, portaria de delegado ou canetada isolada.</p>
              </div>
            </div>
          ),
        },
        {
          id: 'art1-chat-4',
          badge: 'Mensagem 4 de 5 · Dúvidas Rápidas',
          titulo: 'Bate-pronto de dúvidas comuns',
          subtitulo: 'Toque para tirar suas dúvidas',
          textoAudio: 'Tire suas dúvidas. A lei pode ser retroativa para punir? Não. O juiz pode inventar uma pena? Não. Tudo precisa de prévia previsão legal.',
          conteudoPrincipal: (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg border border-border/70 bg-secondary/30">
                <p className="font-semibold text-foreground">P: E se todo mundo achar a conduta errada?</p>
                <p className="text-muted-foreground mt-0.5">R: Não importa! Mesmo sendo imoral, só é crime se estiver escrito na lei penal antes.</p>
              </div>
              <div className="p-2.5 rounded-lg border border-border/70 bg-secondary/30">
                <p className="font-semibold text-foreground">P: E se o juiz quiser dobrar a pena?</p>
                <p className="text-muted-foreground mt-0.5">R: Não pode! Ele é obrigado a ficar dentro do limite fixado pela lei.</p>
              </div>
            </div>
          ),
        },
        {
          id: 'art1-chat-5',
          badge: 'Mensagem 5 de 5 · Fechamento do Chat',
          titulo: 'O que levar desse bate-papo?',
          subtitulo: 'A frase que você nunca mais vai esquecer',
          textoAudio: 'Para guardar: Sem lei prévia, não existe crime nem castigo. Você é livre para fazer tudo o que a lei anterior não proíbe.',
          conteudoPrincipal: (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-2">
              <span className="text-2xl">🎓</span>
              <p className="text-sm font-bold text-teal-300">
                “Sem lei antes, sem crime e sem castigo!”
              </p>
              <p className="text-xs text-muted-foreground">
                Você aprendeu o primeiro artigo da lei penal do seu país com a maior facilidade.
              </p>
            </div>
          ),
        },
      ],
      art2: [
        {
          id: 'art2-chat-1',
          badge: 'Mensagem 1 de 5 · O Paradoxo',
          titulo: '“Mas a lei não podia voltar no tempo?”',
          subtitulo: 'O aluno confronta a regra anterior',
          textoAudio: 'Aluno pergunta: Professor, no artigo primeiro você disse que a lei nunca volta no tempo. Agora no artigo segundo você diz que ela volta? Ficou confuso!',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="flex gap-2.5 items-start">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs font-bold shrink-0">
                  Aluno
                </div>
                <div className="p-3 rounded-2xl rounded-tl-none bg-secondary/80 border border-border text-xs sm:text-sm text-foreground max-w-[85%]">
                  “Professor! No artigo 1º você disse que a lei NÃO volta no tempo. Mas agora você tá dizendo que a lei volta? Não entendi nada!”
                </div>
              </div>
              <div className="flex gap-2.5 items-start justify-end">
                <div className="p-3 rounded-2xl rounded-tr-none bg-teal-500/20 border border-teal-500/30 text-xs sm:text-sm text-foreground max-w-[85%] text-right">
                  “Calma! A regra é simples: <strong>a lei penal tem alergia de voltar no tempo para prejudicar, mas adora voltar para AJUDAR!</strong>”
                </div>
                <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center text-xs font-bold shrink-0">
                  Tutor
                </div>
              </div>
            </div>
          ),
        },
        {
          id: 'art2-chat-2',
          badge: 'Mensagem 2 de 5 · A Metáfora do Desconto',
          titulo: 'A analogia do cupom de desconto',
          subtitulo: 'Entendendo a retroatividade benigna',
          textoAudio: 'Tutor explica: Imagina que você comprou um curso parcelado em dez vezes. Se amanhã a escola der 50% de desconto para todos os alunos antigos, você vai querer? Com certeza! Mas se quisesse cobrar mais, você aceitaria? Claro que não!',
          conteudoPrincipal: (
            <div className="p-3.5 rounded-xl border border-teal-500/30 bg-card space-y-2">
              <div className="font-semibold text-xs text-teal-400">🛍️ O Cupom de Desconto:</div>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Se a lei muda para ser mais boazinha (diminuir pena ou acabar com o crime), ela viaja no tempo e beneficia quem já foi condenado. Mas se a lei for mais severa, ela fica presa no presente.
              </p>
            </div>
          ),
        },
        {
          id: 'art2-chat-3',
          badge: 'Mensagem 3 de 5 · O Caso Real',
          titulo: '“Mesmo se o juiz já bateu o martelo?”',
          subtitulo: 'O trânsito em julgado cai por terra',
          textoAudio: 'Aluno pergunta: Mesmo se o julgamento já acabou e não cabe mais recurso? Tutor responde: Sim! O parágrafo único diz expressamente: ainda que decididos por sentença condenatória transitada em julgado.',
          conteudoPrincipal: (
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-2">
              <span className="text-xs font-bold text-blue-300">⚖️ A Força do Parágrafo Único:</span>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Nem a coisa julgada definitiva resiste a uma lei nova mais benéfica. Se a lei nova favorecer, o juiz é obrigado a recalcular a pena ou soltar o réu imediatamente.
              </p>
            </div>
          ),
        },
        {
          id: 'art2-chat-4',
          badge: 'Mensagem 4 de 5 · Os 3 Cenários Práticos',
          titulo: 'O resumo que resolve qualquer dúvida',
          subtitulo: 'Como funciona no dia a dia dos tribunais',
          textoAudio: 'Três cenários: 1. Lei nova revoga o crime, réu é solto e ficha limpa. 2. Lei nova diminui a pena, pena é reduzida. 3. Lei nova aumenta a pena, não atinge quem já agiu.',
          conteudoPrincipal: (
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 flex items-center justify-between">
                <span>1. Lei revoga o crime</span>
                <span className="font-bold text-emerald-400">Liberdade total</span>
              </div>
              <div className="p-2 rounded-lg border border-blue-500/30 bg-blue-950/20 flex items-center justify-between">
                <span>2. Lei diminui pena</span>
                <span className="font-bold text-blue-400">Pena reduzida</span>
              </div>
              <div className="p-2 rounded-lg border border-rose-500/30 bg-rose-950/20 flex items-center justify-between">
                <span>3. Lei aumenta pena</span>
                <span className="font-bold text-rose-400">Não retroage</span>
              </div>
            </div>
          ),
        },
        {
          id: 'art2-chat-5',
          badge: 'Mensagem 5 de 5 · Síntese do Aluno',
          titulo: 'Aluno dominou o conceito!',
          subtitulo: 'Feedback do tutor',
          textoAudio: 'Excelente! Agora você sabe que a lei penal viaja no tempo apenas quando for para proteger e aliviar a pena do cidadão. Parabéns!',
          conteudoPrincipal: (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-2">
              <span className="text-2xl">🎉</span>
              <p className="text-sm font-bold text-teal-300">
                “Lei boa viaja no tempo, lei ruim fica no presente!”
              </p>
              <p className="text-xs text-muted-foreground">
                Você dominou o artigo 2º de forma simples e definitiva.
              </p>
            </div>
          ),
        },
      ],
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 4: LINHA DO TEMPO VISUAL & SIMULADOR TEMPORAL
  // ----------------------------------------------------
  {
    id: 'linha_tempo',
    nome: '4. Linha do Tempo & Simulador',
    icone: Clock,
    subtitulo: 'Régua cronológica com teste de causa e efeito',
    descricaoPedagogica: 'Apresenta uma linha do tempo interativa onde o usuário clica e vê se a lei retroage ou para no muro do tempo.',
    focoLeigo: 'Visualiza graficamente o passado, presente e futuro da lei penal.',
    slides: {
      art1: [
        {
          id: 'art1-tempo-1',
          badge: 'Etapa 1 de 5 · A Régua Cronológica',
          titulo: 'A linha do tempo do Artigo 1º',
          subtitulo: 'Como o tempo separa a inocência da conduta punível',
          textoAudio: 'Etapa 1. Na linha do tempo, temos o passado quando o fato aconteceu, e o presente quando a nova lei surgiu. Veja como a lei olha para trás.',
          conteudoPrincipal: (
            <div className="space-y-4">
              <div className="relative py-4 px-2">
                <div className="h-1 bg-border rounded-full w-full relative">
                  <div className="absolute left-1/4 -top-2 w-5 h-5 rounded-full bg-blue-500 border-2 border-background flex items-center justify-center text-[10px] text-white font-bold" />
                  <div className="absolute left-3/4 -top-2 w-5 h-5 rounded-full bg-teal-500 border-2 border-background flex items-center justify-center text-[10px] text-white font-bold" />
                </div>
                <div className="flex justify-between text-[11px] text-muted-foreground mt-3">
                  <span className="w-1/2 text-left">
                    <strong className="text-blue-400 block">1. Momento do Fato</strong>
                    Ação praticada (sem lei)
                  </span>
                  <span className="w-1/2 text-right">
                    <strong className="text-teal-400 block">2. Lei Nova Criada</strong>
                    Congresso cria o crime
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                A pergunta é: a Lei Nova pode viajar para trás para pegar a conduta número 1?
              </p>
            </div>
          ),
        },
        {
          id: 'art1-tempo-2',
          badge: 'Etapa 2 de 5 · O Muro de Proteção',
          titulo: 'A barreira impenetrável do tempo',
          subtitulo: 'O princípio da irretroatividade penal maléfica',
          textoAudio: 'Etapa 2. O artigo primeiro funciona como um muro de titânio. A nova lei tenta voltar no tempo para punir quem agiu antes, mas bate na barreira e é bloqueada.',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-rose-500/30 bg-rose-950/20 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-lg font-bold">
                  🛡️
                </div>
                <h4 className="text-sm font-bold text-rose-300">Muro de Proteção do Cidadão</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  A lei que cria crime ou aumenta pena <strong>NÃO TEM PERMISSÃO</strong> para ultrapassar a data de sua publicação. Quem agiu antes está 100% blindado.
                </p>
              </div>
            </div>
          ),
        },
        {
          id: 'art1-tempo-3',
          badge: 'Etapa 3 de 5 · Simulador Interativo',
          titulo: 'Teste você mesmo na linha do tempo!',
          subtitulo: 'Clique nos botões e veja o resultado',
          textoAudio: 'Simulador interativo. Teste o que acontece quando a ação é antes ou depois da lei.',
          interacaoTipo: 'simulador',
          conteudoPrincipal: <SimuladorArtigo1Tempo />,
        },
        {
          id: 'art1-tempo-4',
          badge: 'Etapa 4 de 5 · E se a pena mudar?',
          titulo: 'O aumento de pena também não retroage',
          subtitulo: 'A anterioridade vale para o crime e para a pena',
          textoAudio: 'Etapa 4. Se o crime já existia com pena de 1 ano, e depois do fato a lei aumentou para 10 anos, aplica-se a pena de 1 ano. A pena mais severa não viaja no tempo.',
          conteudoPrincipal: (
            <div className="p-3.5 rounded-xl border border-teal-500/30 bg-card space-y-2">
              <span className="text-xs font-bold text-teal-400">Regra da Pena Prévia:</span>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                Você nunca pode ser surpreendido com um aumento retroativo de castigo. O Estado é obrigado a respeitar a tabela de penas que vigorava no momento do fato.
              </p>
            </div>
          ),
        },
        {
          id: 'art1-tempo-5',
          badge: 'Etapa 5 de 5 · Resumo Temporal',
          titulo: 'Síntese do Relógio da Lei Penal',
          subtitulo: 'Conclusão visual da mecânica',
          textoAudio: 'Conclusão do artigo primeiro: O relógio penal só corre para a frente quando se trata de criar crimes ou aumentar penas. Você está seguro.',
          conteudoPrincipal: (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-2">
              <span className="text-2xl">⏳</span>
              <p className="text-sm font-bold text-foreground">Relógio Penal Travado para Trás</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Essa é a essência do Princípio da Anterioridade: segurança temporal absoluta para a sociedade.
              </p>
            </div>
          ),
        },
      ],
      art2: [
        {
          id: 'art2-tempo-1',
          badge: 'Etapa 1 de 5 · O Portal do Tempo',
          titulo: 'Quando o tempo anda para trás',
          subtitulo: 'A retroatividade da lei benéfica',
          textoAudio: 'Etapa 1 do artigo segundo. No artigo segundo, abrimos um portal no tempo. Quando a lei nova for mais boazinha, ela viaja ao passado para beneficiar quem agiu antes.',
          conteudoPrincipal: (
            <div className="space-y-4">
              <div className="p-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 text-center space-y-2">
                <span className="text-2xl">🌀</span>
                <h4 className="text-sm font-bold text-emerald-300">Portal de Retroatividade Aberto</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Diferente do Artigo 1º que ergue um muro, o Artigo 2º abre uma ponte temporal para trás quando a lei for favorável ao cidadão.
                </p>
              </div>
            </div>
          ),
        },
        {
          id: 'art2-tempo-2',
          badge: 'Etapa 2 de 5 · Simulador dos 3 Efeitos',
          titulo: 'Simulador Temporal do Artigo 2º',
          subtitulo: 'Alterne entre os cenários para ver a reação',
          textoAudio: 'Simulador interativo do artigo segundo. Veja o que acontece quando o crime acaba ou quando a pena diminui.',
          interacaoTipo: 'simulador',
          conteudoPrincipal: <SimuladorArtigo2Tempo />,
        },
        {
          id: 'art2-tempo-3',
          badge: 'Etapa 3 de 5 · A Sentença Definitiva',
          titulo: 'O trânsito em julgado não segura a lei boa',
          subtitulo: 'Mesmo com julgamento encerrado',
          textoAudio: 'Etapa 3. O artigo segundo é tão poderoso que nem a sentença final transitada em julgado impede o benefício. O juiz da execução penal é obrigado a aplicar a nova lei.',
          conteudoPrincipal: (
            <div className="p-3.5 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-2">
              <span className="text-xs font-bold text-blue-300">Súmula 611 do STF:</span>
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                <em>"Transitada em julgado a sentença condenatória, compete ao Juízo das Execuções a aplicação de lei mais benigna."</em>
              </p>
              <p className="text-xs text-foreground font-medium">
                Ou seja: não precisa nem reabrir o processo todo, o juiz que cuida da prisão já aplica o benefício diretamente!
              </p>
            </div>
          ),
        },
        {
          id: 'art2-tempo-4',
          badge: 'Etapa 4 de 5 · Abolitio Criminis vs Lei Benéfica',
          titulo: 'As duas formas de viajar no tempo',
          subtitulo: 'Diferença entre sumir com o crime ou só aliviar',
          textoAudio: 'Etapa 4. Existem duas viagens no tempo: a abolitio criminis, que apaga o crime todo, e a novatio legis in mellius, que só diminui a pena ou dá um benefício.',
          conteudoPrincipal: (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-3 rounded-xl border border-teal-500/30 bg-card space-y-1">
                <span className="font-bold text-teal-400">Abolitio Criminis:</span>
                <p className="text-muted-foreground">O crime é 100% extinto. Liberdade total e ficha limpa.</p>
              </div>
              <div className="p-3 rounded-xl border border-teal-500/30 bg-card space-y-1">
                <span className="font-bold text-blue-400">Lei Mais Suave:</span>
                <p className="text-muted-foreground">O crime continua existindo, mas a pena encolhe.</p>
              </div>
            </div>
          ),
        },
        {
          id: 'art2-tempo-5',
          badge: 'Etapa 5 de 5 · Conclusão da Mecânica',
          titulo: 'Maestria do Relógio Penal',
          subtitulo: 'Você agora domina a aplicação da lei no tempo',
          textoAudio: 'Parabéns! Você compreendeu a dinâmica temporal do artigo segundo do Código Penal com total clareza.',
          conteudoPrincipal: (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-2">
              <span className="text-2xl">🏆</span>
              <p className="text-sm font-bold text-teal-300">O Tempo a Favor da Liberdade</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você visualizou perfeitamente quando a lei penal retroage e quando ela avança.
              </p>
            </div>
          ),
        },
      ],
    },
  },

  // ----------------------------------------------------
  // MECÂNICA 5: MAPA MENTAL & DECISÃO GAMIFICADA
  // ----------------------------------------------------
  {
    id: 'mapa_decisao',
    nome: '5. Mapa Mental & Desafio',
    icone: BrainCircuit,
    subtitulo: 'Árvore de decisão Sim/Não com flashcard 3D',
    descricaoPedagogica: 'Apresenta a regra em formato de fluxograma de decisão visual, flashcards interativos com virada 3D e o desafio "Você é o Juiz".',
    focoLeigo: 'Simplicidade lógica e memorização rápida em 1 clique.',
    slides: {
      art1: [
        {
          id: 'art1-mapa-1',
          badge: 'Desafio 1 de 5 · O Dilema',
          titulo: 'Você é o Juiz: O Caso dos Patinetes',
          subtitulo: 'Resolva este caso usando o Artigo 1º',
          textoAudio: 'Você é o juiz. Em janeiro, Marcos andou de patinete elétrico a 40 por hora na calçada. Em março, saiu uma lei criando o crime de direção perigosa de patinete. O promotor pede a prisão de Marcos. O que você decide?',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-950/20 space-y-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase">Caso Prático</span>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  Em janeiro, Marcos andou de patinete elétrico na calçada. Em março, foi publicada uma lei prevendo prisão de 6 meses para quem andar de patinete na calçada. O Ministério Público denunciou Marcos pelo fato de janeiro.
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Passe para o próximo slide para ver o Flashcard de Julgamento!
              </p>
            </div>
          ),
        },
        {
          id: 'art1-mapa-2',
          badge: 'Desafio 2 de 5 · Flashcard 3D',
          titulo: 'Toque no cartão para revelar a sentença!',
          subtitulo: 'Flip Card Interativo',
          textoAudio: 'Toque para girar o cartão. A decisão é rejeitar a acusação porque em janeiro não existia lei penal definindo a conduta como crime.',
          interacaoTipo: 'flip',
          conteudoPrincipal: (
            <FlipCardItem 
              frente="Marcos pode ser punido criminalmente pelo fato de janeiro?"
              verso="NÃO! Em janeiro o fato era lícito. Pelo Artigo 1º do Código Penal, não há crime sem lei ANTERIOR. A denúncia deve ser rejeitada imediatamente!"
            />
          ),
        },
        {
          id: 'art1-mapa-3',
          badge: 'Desafio 3 de 5 · Árvore de Decisão',
          titulo: 'O Fluxograma de 3 Segundos',
          subtitulo: 'Siga as setas para saber se há crime',
          textoAudio: 'Árvore de decisão simples: Houve uma ação? A lei existia antes da ação? Se sim, pode ser crime. Se não, é fato atípico e pessoa inocente.',
          conteudoPrincipal: (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-card text-center font-bold text-foreground">
                1. Alguém praticou uma conduta?
              </div>
              <div className="text-center text-muted-foreground">↓</div>
              <div className="p-2.5 rounded-lg border border-teal-500/40 bg-teal-950/20 text-center font-bold text-teal-300">
                2. Já havia LEI ESCRITA proibindo no exato momento?
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 rounded-lg border border-rose-500/30 bg-rose-950/20 text-center">
                  <span className="font-bold text-rose-400 block">NÃO</span>
                  <span className="text-[11px] text-muted-foreground">Fato atípico! Sem crime. Livre.</span>
                </div>
                <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-center">
                  <span className="font-bold text-emerald-400 block">SIM</span>
                  <span className="text-[11px] text-muted-foreground">Prossegue julgamento na lei.</span>
                </div>
              </div>
            </div>
          ),
        },
        {
          id: 'art1-mapa-4',
          badge: 'Desafio 4 de 5 · Dicionário do Cidadão',
          titulo: 'Vocabulário Jurídico Descomplicado',
          subtitulo: 'Tradução relâmpago de expressões que assustam',
          textoAudio: 'Vocabulário: Anterioridade significa lei antes do fato. Cominação significa pena tabelada na lei. Fato atípico significa algo que não é crime.',
          conteudoPrincipal: (
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg border border-border/70 bg-secondary/30">
                <strong className="text-teal-400">Anterioridade:</strong> A lei tem que nascer antes da atitude.
              </div>
              <div className="p-2 rounded-lg border border-border/70 bg-secondary/30">
                <strong className="text-teal-400">Cominação Legal:</strong> O castigo fixado previamente na lei pelo Congresso.
              </div>
              <div className="p-2 rounded-lg border border-border/70 bg-secondary/30">
                <strong className="text-teal-400">Fato Atípico:</strong> Quando a conduta não se encaixa em nenhum crime escrito.
              </div>
            </div>
          ),
        },
        {
          id: 'art1-mapa-5',
          badge: 'Desafio 5 de 5 · Conquista',
          titulo: 'Trilha do Artigo 1º Concluída!',
          subtitulo: 'Você dominou o princípio da legalidade',
          textoAudio: 'Parabéns! Você concluiu a trilha do artigo primeiro do Código Penal. Você agora domina o conceito com segurança de um especialista.',
          conteudoPrincipal: (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">Conhecimento Fixado com Sucesso!</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você agora tem o mapa mental do Artigo 1º gravado na mente. Ninguém engana você quando o assunto for criação de crimes e penas.
              </p>
            </div>
          ),
        },
      ],
      art2: [
        {
          id: 'art2-mapa-1',
          badge: 'Desafio 1 de 5 · O Dilema',
          titulo: 'Você é o Juiz: O Caso da Mudança na Lei',
          subtitulo: 'Como você decide este caso real?',
          textoAudio: 'Você é o juiz. Roberto foi condenado a 5 anos de prisão e já cumpriu 2 anos. Hoje o Congresso aprovou uma lei reduzindo a pena máxima para 2 anos. O que você decide?',
          conteudoPrincipal: (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-blue-500/30 bg-blue-950/20 space-y-2">
                <span className="text-[10px] font-bold text-blue-400 uppercase">Caso Prático</span>
                <p className="text-xs sm:text-sm text-foreground leading-relaxed">
                  Roberto foi condenado a 5 anos de reclusão em 2022. Em 2024, após Roberto já ter cumprido 2 anos de cadeia, entra em vigor uma nova lei que reduz a pena máxima desse crime para 2 anos.
                </p>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Passe o slide para virar o Flashcard e ver a resposta jurídica!
              </p>
            </div>
          ),
        },
        {
          id: 'art2-mapa-2',
          badge: 'Desafio 2 de 5 · Flashcard 3D',
          titulo: 'Toque para virar o cartão!',
          subtitulo: 'Decisão do Juiz das Execuções',
          textoAudio: 'Toque para girar o cartão. Roberto deve ser posto em liberdade imediatamente porque ele já cumpriu a nova pena máxima fixada pela nova lei.',
          interacaoTipo: 'flip',
          conteudoPrincipal: (
            <FlipCardItem 
              frente="Roberto deve ser solto imediatamente ou continuar preso?"
              verso="SOLTO IMEDIATAMENTE! Pelo Artigo 2º, parágrafo único, a lei mais benéfica retroage aos fatos anteriores. Como a nova pena máxima é de 2 anos e ele já cumpriu 2 anos, a pena está extinta!"
            />
          ),
        },
        {
          id: 'art2-mapa-3',
          badge: 'Desafio 3 de 5 · Árvore de Decisão',
          titulo: 'Árvore de Decisão do Artigo 2º',
          subtitulo: 'O algoritmo mental da lei no tempo',
          textoAudio: 'Árvore de decisão: A lei nova favorece o agente? Se sim, aplica imediatamente mesmo com sentença final. Se não, não retroage.',
          conteudoPrincipal: (
            <div className="space-y-2 text-xs">
              <div className="p-2.5 rounded-lg border border-border bg-card text-center font-bold text-foreground">
                Surgiu uma LEI NOVA após o fato?
              </div>
              <div className="text-center text-muted-foreground">↓</div>
              <div className="p-2.5 rounded-lg border border-teal-500/40 bg-teal-950/20 text-center font-bold text-teal-300">
                Ela FAVORECE o réu de alguma forma?
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="p-2 rounded-lg border border-emerald-500/30 bg-emerald-950/20 text-center">
                  <span className="font-bold text-emerald-400 block">SIM</span>
                  <span className="text-[11px] text-muted-foreground">Retroage na hora! (Mesmo após sentença final).</span>
                </div>
                <div className="p-2 rounded-lg border border-rose-500/30 bg-rose-950/20 text-center">
                  <span className="font-bold text-rose-400 block">NÃO (Piora)</span>
                  <span className="text-[11px] text-muted-foreground">Não retroage! Vale a lei antiga suave.</span>
                </div>
              </div>
            </div>
          ),
        },
        {
          id: 'art2-mapa-4',
          badge: 'Desafio 4 de 5 · Termômetro Penal',
          titulo: 'Glossário Descomplicado',
          subtitulo: 'Palavras que você agora conhece de cor',
          textoAudio: 'Glossário: Abolitio criminis significa extinção do crime. Trânsito em julgado significa processo finalizado sem recursos. Lex mitior significa lei mais benéfica.',
          conteudoPrincipal: (
            <div className="space-y-2 text-xs">
              <div className="p-2 rounded-lg border border-border/70 bg-secondary/30">
                <strong className="text-blue-400">Abolitio Criminis:</strong> O crime deixou de existir na lei. Ficha limpa e soltura.
              </div>
              <div className="p-2 rounded-lg border border-border/70 bg-secondary/30">
                <strong className="text-blue-400">Trânsito em Julgado:</strong> Decisão definitiva onde não cabe mais recurso.
              </div>
              <div className="p-2 rounded-lg border border-border/70 bg-secondary/30">
                <strong className="text-blue-400">Lex Mitior:</strong> Expressão em latim que significa apenas "lei mais boazinha".
              </div>
            </div>
          ),
        },
        {
          id: 'art2-mapa-5',
          badge: 'Desafio 5 de 5 · Conquista',
          titulo: 'Trilha do Artigo 2º Concluída!',
          subtitulo: 'Você é mestre na retroatividade benigna',
          textoAudio: 'Parabéns! Você concluiu a trilha do artigo segundo do Código Penal. Você agora sabe exatamente como a lei viaja no tempo para beneficiar qualquer cidadão.',
          conteudoPrincipal: (
            <div className="p-4 rounded-xl border border-teal-500/30 bg-teal-950/20 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-teal-400 mx-auto" />
              <h4 className="text-sm font-bold text-foreground">Conhecimento Fixado com Sucesso!</h4>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Você dominou o Artigo 2º do Código Penal. Você entende os efeitos práticos da lei penal no tempo como poucos profissionais dominam!
              </p>
            </div>
          ),
        },
      ],
    },
  },
];

// ==========================================
// COMPONENTES INTERATIVOS AUXILIARES
// ==========================================

function FlipCardItem({ frente, verso }: { frente: string; verso: string }) {
  const [virado, setVirado] = useState(false);

  return (
    <div 
      onClick={() => setVirado(!virado)}
      role="button"
      tabIndex={0}
      className="cursor-pointer perspective-[1000px] select-none py-1"
    >
      <div 
        className={`relative min-h-[160px] rounded-2xl border transition-all duration-500 p-5 flex flex-col items-center justify-center text-center shadow-md ${
          virado 
            ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-100 rotate-y-180' 
            : 'border-teal-500/30 bg-secondary/40 text-foreground hover:bg-secondary/60'
        }`}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider text-teal-400 mb-2">
          {virado ? '💡 Resposta Fundamentada' : '❓ Toque para Virar'}
        </div>
        <p className="text-xs sm:text-sm font-medium leading-relaxed">
          {virado ? verso : frente}
        </p>
        <span className="text-[10px] text-muted-foreground mt-3 underline">
          {virado ? 'Toque para voltar à pergunta' : 'Toque para ver a resposta'}
        </span>
      </div>
    </div>
  );
}

function QuizArtigo1Anatomia() {
  const [resposta, setResposta] = useState<number | null>(null);

  const opcoes = [
    { texto: 'Sim! O prefeito manda na cidade e o decreto é suficiente.', correta: false, feedback: 'Errado! Prefeito não pode criar crimes, e mesmo que pudesse, não poderia punir fatos passados.' },
    { texto: 'Não! Fere o Artigo 1º (falta lei anterior e falta competência federal).', correta: true, feedback: 'Perfeito! O Artigo 1º impede punição retroativa e só o Congresso Nacional cria crimes.' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-foreground">
        O prefeito pode baixar decreto proibindo soltar pipa e mandar prender quem soltou semana passada?
      </p>
      <div className="space-y-2">
        {opcoes.map((op, idx) => (
          <button
            key={idx}
            onClick={() => setResposta(idx)}
            className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
              resposta === idx
                ? op.correta
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                  : 'border-rose-500 bg-rose-950/40 text-rose-200'
                : 'border-border bg-card/60 hover:bg-secondary/50 text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center shrink-0 text-[10px]">
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{op.texto}</span>
            </div>
            {resposta === idx && (
              <p className={`mt-2 pt-2 border-t text-[11px] leading-relaxed ${op.correta ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'}`}>
                {op.feedback}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function QuizArtigo2Anatomia() {
  const [resposta, setResposta] = useState<number | null>(null);

  const opcoes = [
    { texto: 'Ele continua preso até completar os 8 anos, pois o juiz já tinha encerrado o caso.', correta: false, feedback: 'Incorreto! A lei penal benéfica retroage mesmo com sentença transitada em julgado!' },
    { texto: 'Ele é solto imediatamente, pois já cumpriu os 3 anos previstos pela nova lei.', correta: true, feedback: 'Correto! O parágrafo único do Art. 2º aplica a lei favorável aos fatos anteriores imediatamente!' },
  ];

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-foreground">
        Um homem foi condenado a 8 anos e já cumpriu 3 anos. Se hoje for aprovada lei diminuindo a pena máxima para 3 anos, o que acontece?
      </p>
      <div className="space-y-2">
        {opcoes.map((op, idx) => (
          <button
            key={idx}
            onClick={() => setResposta(idx)}
            className={`w-full text-left p-3 rounded-xl border text-xs transition-all ${
              resposta === idx
                ? op.correta
                  ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                  : 'border-rose-500 bg-rose-950/40 text-rose-200'
                : 'border-border bg-card/60 hover:bg-secondary/50 text-foreground'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full border border-border flex items-center justify-center shrink-0 text-[10px]">
                {String.fromCharCode(65 + idx)}
              </span>
              <span>{op.texto}</span>
            </div>
            {resposta === idx && (
              <p className={`mt-2 pt-2 border-t text-[11px] leading-relaxed ${op.correta ? 'border-emerald-500/30 text-emerald-300' : 'border-rose-500/30 text-rose-300'}`}>
                {op.feedback}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function SimuladorArtigo1Tempo() {
  const [cenario, setCenario] = useState<'antes' | 'depois' | null>('antes');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => setCenario('antes')}
          className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
            cenario === 'antes'
              ? 'border-teal-500 bg-teal-950/40 text-teal-300'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Ação ANTES da Lei
        </button>
        <button
          onClick={() => setCenario('depois')}
          className={`p-2.5 rounded-xl border text-xs font-medium transition-all ${
            cenario === 'depois'
              ? 'border-teal-500 bg-teal-950/40 text-teal-300'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Ação DEPOIS da Lei
        </button>
      </div>

      <div className="p-3.5 rounded-xl border border-border bg-card/80 text-center space-y-1.5">
        {cenario === 'antes' ? (
          <>
            <div className="text-xl">🟢</div>
            <span className="text-xs font-bold text-emerald-400">Conduta Totalmente Lícita</span>
            <p className="text-xs text-muted-foreground">
              Como a ação ocorreu antes da publicação da lei, a pessoa é inocente. O Artigo 1º bloqueia qualquer punição.
            </p>
          </>
        ) : (
          <>
            <div className="text-xl">⚠️</div>
            <span className="text-xs font-bold text-amber-400">Crime Configurado</span>
            <p className="text-xs text-muted-foreground">
              Como a ação ocorreu após a lei entrar em vigor, a pessoa tinha a obrigação de conhecer e obedecer a proibição.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

function SimuladorArtigo2Tempo() {
  const [cenario, setCenario] = useState<'revogado' | 'diminuiu' | 'piorou'>('revogado');

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-1.5 text-[11px]">
        <button
          onClick={() => setCenario('revogado')}
          className={`p-2 rounded-lg border font-medium transition-all ${
            cenario === 'revogado'
              ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Crime Acabou
        </button>
        <button
          onClick={() => setCenario('diminuiu')}
          className={`p-2 rounded-lg border font-medium transition-all ${
            cenario === 'diminuiu'
              ? 'border-blue-500 bg-blue-950/40 text-blue-300'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Pena Diminuiu
        </button>
        <button
          onClick={() => setCenario('piorou')}
          className={`p-2 rounded-lg border font-medium transition-all ${
            cenario === 'piorou'
              ? 'border-rose-500 bg-rose-950/40 text-rose-300'
              : 'border-border bg-secondary/30 text-muted-foreground'
          }`}
        >
          Pena Aumentou
        </button>
      </div>

      <div className="p-3.5 rounded-xl border border-border bg-card/80 text-center space-y-1.5">
        {cenario === 'revogado' && (
          <>
            <span className="text-xs font-bold text-emerald-400">Abolitio Criminis</span>
            <p className="text-xs text-muted-foreground">
              Quem está preso sai imediatamente! Os efeitos penais são extintos e a ficha criminal fica limpa.
            </p>
          </>
        )}
        {cenario === 'diminuiu' && (
          <>
            <span className="text-xs font-bold text-blue-400">Novatio Legis in Mellius</span>
            <p className="text-xs text-muted-foreground">
              A lei retroage para aplicar a pena mais baixa a todos que cometeram o fato no passado.
            </p>
          </>
        )}
        {cenario === 'piorou' && (
          <>
            <span className="text-xs font-bold text-rose-400">Irretroatividade Maléfica</span>
            <p className="text-xs text-muted-foreground">
              A lei mais severa NÃO retroage! Quem cometeu o crime antes continua respondendo pela lei antiga mais suave.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ==========================================
// PÁGINA PRINCIPAL DO LABORATÓRIO
// ==========================================

const AdminAprenderLeisLaboratorio = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = isAdminEmail(user?.email);

  // Estados de navegação do Laboratório
  const [artigoAtual, setArtigoAtual] = useState<ArtigoId>('art1');
  const [mecanicaAtual, setMecanicaAtual] = useState<MecanicaId>('anatomia');
  const [slideIndex, setSlideIndex] = useState(0);
  const [falando, setFalando] = useState(false);

  // Recupera mecânica e slides atuais
  const mecanica = useMemo(() => {
    return MECANICAS.find(m => m.id === mecanicaAtual) || MECANICAS[0];
  }, [mecanicaAtual]);

  const slides = useMemo(() => {
    return mecanica.slides[artigoAtual] || [];
  }, [mecanica, artigoAtual]);

  const slideAtual = useMemo(() => {
    return slides[slideIndex] || slides[0];
  }, [slides, slideIndex]);

  // Reseta o slide index ao trocar de artigo ou mecânica
  const handleTrocarArtigo = (art: ArtigoId) => {
    pararVoz();
    setArtigoAtual(art);
    setSlideIndex(0);
  };

  const handleTrocarMecanica = (mec: MecanicaId) => {
    pararVoz();
    setMecanicaAtual(mec);
    setSlideIndex(0);
  };

  // Controles de slide
  const proximoSlide = () => {
    if (slideIndex < slides.length - 1) {
      pararVoz();
      setSlideIndex(prev => prev + 1);
    }
  };

  const slideAnterior = () => {
    if (slideIndex > 0) {
      pararVoz();
      setSlideIndex(prev => prev - 1);
    }
  };

  // Suporte a teclado (setas esquerda e direita)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') proximoSlide();
      if (e.key === 'ArrowLeft') slideAnterior();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [slideIndex, slides.length]);

  // Síntese de Voz (Text-to-Speech nativo)
  const falarSlide = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      toast.info('Síntese de voz não suportada neste navegador.');
      return;
    }

    if (falando) {
      window.speechSynthesis.cancel();
      setFalando(false);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(slideAtual.textoAudio);
    utterance.lang = 'pt-BR';
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    utterance.onend = () => setFalando(false);
    utterance.onerror = () => setFalando(false);

    setFalando(true);
    window.speechSynthesis.speak(utterance);
  };

  const pararVoz = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setFalando(false);
  };

  useEffect(() => {
    return () => pararVoz();
  }, []);

  const mobileHeader = (
    <PageHeader 
      title="Laboratório — Aprender Leis" 
      onBack={() => {
        pararVoz();
        navigate('/admin-aprender-leis');
      }} 
    />
  );

  return (
    <DesktopPageLayout
      activeId="admin"
      title="Laboratório de Aulas de Leis"
      subtitle="Teste e valide 5 mecânicas de aulas do Código Penal para pessoas leigas"
      mobileHeader={mobileHeader}
    >
      <div className="px-4 sm:px-6 py-4 lg:px-0 lg:py-0 max-w-4xl mx-auto w-full space-y-5">
        
        {/* Barra Superior: Seletor de Artigo (Art 1º vs Art 2º) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border border-border/80 bg-card">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-teal-400 shrink-0" />
            <div>
              <span className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Legislação Modelo: Código Penal (DL 2.848/1940)
              </span>
              <h3 className="text-sm font-bold text-foreground">
                {artigoAtual === 'art1' ? 'Art. 1º — Anterioridade da Lei' : 'Art. 2º — Lei Penal no Tempo'}
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => handleTrocarArtigo('art1')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                artigoAtual === 'art1'
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Artigo 1º (Anterioridade)
            </button>
            <button
              onClick={() => handleTrocarArtigo('art2')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                artigoAtual === 'art2'
                  ? 'bg-teal-500 text-white shadow-md shadow-teal-500/20'
                  : 'bg-secondary/60 text-muted-foreground hover:text-foreground'
              }`}
            >
              Artigo 2º (Retroatividade)
            </button>
          </div>
        </div>

        {/* Barra de Abas das 5 Mecânicas de Aula */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-muted-foreground uppercase tracking-wider text-[11px]">
              Escolha a Mecânica Didática:
            </span>
            <span className="text-teal-400 font-medium text-[11px]">
              {mecanica.subtitulo}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {MECANICAS.map(mec => {
              const Icon = mec.icone;
              const ativa = mec.id === mecanicaAtual;
              return (
                <button
                  key={mec.id}
                  onClick={() => handleTrocarMecanica(mec.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    ativa
                      ? 'border-teal-500 bg-teal-500/10 text-teal-300 shadow-sm'
                      : 'border-border/60 bg-secondary/30 hover:bg-secondary/60 text-muted-foreground'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Icon className={`w-4 h-4 ${ativa ? 'text-teal-400' : 'text-muted-foreground'}`} />
                    {ativa && <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />}
                  </div>
                  <span className="text-xs font-bold truncate">{mec.nome}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Card Explicativo da Mecânica Ativa */}
        <div className="p-3.5 rounded-xl border border-teal-500/20 bg-teal-950/20 flex items-start gap-3 text-xs">
          <Sparkles className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-teal-200">
              {mecanica.descricaoPedagogica}
            </p>
            <p className="text-muted-foreground mt-0.5">
              <strong>Foco para leigos:</strong> {mecanica.focoLeigo}
            </p>
          </div>
        </div>

        {/* ============================================================== */}
        {/* PLAYER DE AULA / SLIDE DECK INTERATIVO */}
        {/* ============================================================== */}
        <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-xl flex flex-col min-h-[480px]">
          
          {/* Topo do Player: Barra de Progresso tipo Stories */}
          <div className="p-4 border-b border-border/50 bg-secondary/20 flex flex-col gap-3">
            
            {/* Linhas de Progresso */}
            <div className="flex items-center gap-1.5 w-full">
              {slides.map((_, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    pararVoz();
                    setSlideIndex(idx);
                  }}
                  className="flex-1 h-1.5 rounded-full cursor-pointer overflow-hidden bg-muted/40 transition-all hover:h-2"
                >
                  <div
                    className={`h-full transition-all duration-300 ${
                      idx < slideIndex
                        ? 'bg-teal-400'
                        : idx === slideIndex
                        ? 'bg-teal-400 shadow-sm'
                        : 'bg-transparent'
                    }`}
                  />
                </div>
              ))}
            </div>

            {/* Cabeçalho do Slide: Badge, Título e Botão de Áudio */}
            <div className="flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-400">
                  {slideAtual.badge}
                </span>
                <h3 className="text-base sm:text-lg font-bold text-foreground">
                  {slideAtual.titulo}
                </h3>
                {slideAtual.subtitulo && (
                  <p className="text-xs text-muted-foreground">
                    {slideAtual.subtitulo}
                  </p>
                )}
              </div>

              {/* Botão de Narração em Áudio (TTS) */}
              <button
                onClick={falarSlide}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all shrink-0 ${
                  falando
                    ? 'border-teal-500 bg-teal-500 text-white animate-pulse'
                    : 'border-border bg-secondary/60 hover:bg-secondary text-foreground'
                }`}
                title="Ouvir explicação do slide com voz"
              >
                {falando ? (
                  <>
                    <VolumeX className="w-3.5 h-3.5" />
                    <span>Pausar</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="w-3.5 h-3.5 text-teal-400" />
                    <span>Ouvir Aula</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Área Central: Conteúdo Animado do Slide Atual */}
          <div className="p-5 sm:p-6 flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              <motion.div
                key={slideAtual.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="w-full max-w-2xl mx-auto"
              >
                {slideAtual.conteudoPrincipal}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Rodapé do Player: Controles de Navegação */}
          <div className="p-4 border-t border-border/50 bg-secondary/30 flex items-center justify-between gap-3">
            <button
              onClick={slideAnterior}
              disabled={slideIndex === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background hover:bg-secondary text-foreground font-semibold text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Anterior</span>
            </button>

            <div className="text-xs text-muted-foreground font-medium">
              Slide <strong>{slideIndex + 1}</strong> de <strong>{slides.length}</strong>
            </div>

            {slideIndex < slides.length - 1 ? (
              <button
                onClick={proximoSlide}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs shadow-md shadow-teal-500/20 transition-all"
              >
                <span>Próximo</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => {
                  pararVoz();
                  setSlideIndex(0);
                  toast.success('Você concluiu esta aula! Reiniciando...');
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-600 text-white font-bold text-xs transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reiniciar Aula</span>
              </button>
            )}
          </div>

        </div>

        {/* Atalho Rápido para Criar Aulas via OmniRoute */}
        <div className="p-4 rounded-2xl border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-foreground">
              Gostou destas mecânicas?
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Utilize o <strong>OmniRoute</strong> para gerar automaticamente aulas no mesmo formato para todos os artigos do Código Penal, CLT, CF/88 ou Código Civil.
            </p>
          </div>
          <button
            onClick={() => {
              pararVoz();
              navigate('/admin-aprender-leis/criar');
            }}
            className="px-4 py-2 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-bold text-xs shrink-0 transition-colors shadow-sm"
          >
            Abrir Criador OmniRoute
          </button>
        </div>

      </div>
    </DesktopPageLayout>
  );
};

export default AdminAprenderLeisLaboratorio;
