import { useState } from 'react';
import { pickAsset } from '@/lib/assetUrl';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '@/components/vademecum/PageHeader';
import {
  Monitor,
  QrCode,
  Globe,
  ScanLine,
  Camera,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';
import { scanOnce } from '@/lib/qrScanner';
import desktopImgAsset from '@/assets/desktop-promo-laptop.webp';
const desktopImg = desktopImgAsset;
import vacatioLogoAsset from '@/assets/logo-vacatio-v2.png.asset.json';
import vacatioLogoBundled from '@/assets/bundled/logo-vacatio-v2.webp';
const vacatioLogo = pickAsset(vacatioLogoBundled, vacatioLogoAsset.url);

const SITE_URL = 'www.vacatio.com.br';

const steps = [
  {
    icon: Globe,
    title: 'Acesse pelo computador',
    text: (
      <>
        No navegador do computador, abra{' '}
        <span className="text-primary font-semibold">{SITE_URL}</span>.
      </>
    ),
  },
  {
    icon: QrCode,
    title: 'Um QR-code vai aparecer na tela',
    text: 'A tela de login do desktop já mostra um QR-code grande, pronto pra ser lido.',
  },
  {
    icon: ScanLine,
    title: 'Escaneie com o botão abaixo',
    text: 'Aponte a câmera do celular pro QR na tela do computador. Você entra na hora, sem digitar senha.',
  },
];

const benefits = [
  'Estude de forma mais confortável na tela grande',
  'Visualize artigos e anotações lado a lado',
  'Mapas mentais e resumos em tela expandida',
  'Navegação rápida com atalhos de teclado',
  'Radar legislativo com dashboard completo',
  'Biblioteca de livros com leitura imersiva',
];

const DesktopPromo = () => {
  const navigate = useNavigate();
  const [scanning, setScanning] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySite = async () => {
    try {
      await navigator.clipboard.writeText(`https://${SITE_URL}`);
      setCopied(true);
      toast.success('Endereço copiado');
      setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.error('Não consegui copiar');
    }
  };

  const handleScan = async () => {
    if (!Capacitor.isNativePlatform()) {
      toast.info('A leitura do QR só funciona no app do celular.');
      return;
    }
    setScanning(true);
    try {
      const raw = await scanOnce();
      if (!raw) {
        toast.error('Nenhum QR-code detectado');
        return;
      }
      // Aceita URL absoluta contendo /desktop-link/<uuid> ou o próprio uuid.
      const match =
        raw.match(/\/desktop-link\/([0-9a-f-]{36})/i) ||
        raw.match(/^([0-9a-f-]{36})$/i);
      if (!match) {
        toast.error('QR-code inválido. Escaneie o código exibido no computador.');
        return;
      }
      navigate(`/desktop-link/${match[1]}`);
    } catch (e) {
      toast.error((e as Error)?.message || 'Não foi possível escanear');
    } finally {
      setScanning(false);
    }
  };

  return (
    <div className="min-h-dvh bg-background">
      <div className="sticky top-0 z-30">
        <PageHeader
          title="Versão Desktop"
          onBack={() => navigate(-1)}
          leading={
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
              <Monitor className="w-5 h-5 text-primary" />
            </div>
          }
        />
      </div>

      <div className="p-4 space-y-6 max-w-lg mx-auto pb-24">
        {/* Hero */}
        <div className="relative rounded-2xl overflow-hidden border border-border">
          <img src={desktopImg} alt="Vacatio no Desktop" className="w-full h-44 object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
          <div className="absolute bottom-3 left-4 right-4 flex items-center gap-2">
            <img
              src={vacatioLogo}
              alt="Vacatio"
              className="w-9 h-9 rounded-lg border border-primary/40"
            />
            <div>
              <p className="font-display text-sm font-bold text-foreground">Vacatio Desktop</p>
              <p className="text-[10px] text-muted-foreground">{SITE_URL}</p>
            </div>
          </div>
        </div>

        {/* Explicação principal */}
        <section className="rounded-2xl p-5 bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/25">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-[11px] font-body font-semibold uppercase tracking-wider text-primary">
              Como entrar no desktop
            </span>
          </div>
          <h2 className="font-display text-xl font-black text-foreground leading-tight">
            Entre no computador escaneando um QR-code.
          </h2>
          <p className="mt-2 text-sm text-muted-foreground font-body leading-relaxed">
            Sem digitar senha, sem esquecer login. Você abre o site no computador, aparece um
            QR-code, e escaneia aqui pelo celular pra entrar direto.
          </p>

          {/* Endereço do site — destaque */}
          <button
            onClick={copySite}
            className="mt-4 w-full flex items-center gap-3 p-3 rounded-xl bg-background/70 border border-primary/30 text-left hover:bg-background transition-colors"
          >
            <Globe className="w-5 h-5 text-primary shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-body">
                Abra no computador
              </p>
              <p className="font-display text-base font-bold text-foreground truncate">
                {SITE_URL}
              </p>
            </div>
            {copied ? (
              <Check className="w-4 h-4 text-primary" />
            ) : (
              <Copy className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
        </section>

        {/* Passo a passo */}
        <section className="space-y-2">
          <h3 className="font-display text-sm font-bold text-foreground px-1">Passo a passo</h3>
          {steps.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className="flex gap-3 p-4 rounded-2xl bg-card border border-border"
            >
              <div className="relative shrink-0">
                <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                  <s.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-display font-black flex items-center justify-center">
                  {i + 1}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-display text-sm font-bold text-foreground">{s.title}</p>
                <p className="text-xs text-muted-foreground font-body mt-0.5 leading-relaxed">
                  {s.text}
                </p>
              </div>
            </motion.div>
          ))}
        </section>

        {/* CTA principal — escanear */}
        <motion.button
          onClick={handleScan}
          disabled={scanning}
          whileTap={{ scale: 0.97 }}
          className="w-full flex items-center justify-center gap-3 py-4 rounded-full bg-primary text-primary-foreground font-display font-black text-base shadow-lg shadow-primary/30 disabled:opacity-60"
        >
          {scanning ? (
            <>
              <Camera className="w-5 h-5 animate-pulse" />
              Abrindo a câmera…
            </>
          ) : (
            <>
              <ScanLine className="w-5 h-5" />
              Escanear acesso
            </>
          )}
        </motion.button>

        <div className="flex items-center gap-2 justify-center text-[11px] text-muted-foreground font-body">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          Código válido por 3 minutos e único por acesso
        </div>

        {/* Benefícios */}
        <section className="space-y-2">
          <h3 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Por que usar no desktop
          </h3>
          {benefits.map((b) => (
            <div
              key={b}
              className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border"
            >
              <ChevronRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-sm text-foreground font-body">{b}</p>
            </div>
          ))}
        </section>
      </div>
    </div>
  );
};

export default DesktopPromo;
