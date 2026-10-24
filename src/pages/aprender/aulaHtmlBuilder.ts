// Gerador do HTML autônomo da Aula Interativa (motor original aprimorado)
import { AulaSlide } from './crimesContraFamiliaData';

export interface AulaBuildOptions {
  materiaNome: string;
  aulaTitulo: string;
  slides: AulaSlide[];
  imagesBaseUrl?: string;
  audioBaseUrl?: string;
}

const HTML_PREFIX = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="color-scheme" content="dark" />
    <link rel="icon" href="data:," />
    <title>Crimes Contra a Família · Direito Penal</title>
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800&family=Source+Sans+3:ital,wght@0,400;0,600;0,700;1,400&display=swap" rel="stylesheet" />
    <style>
      :root{
        --bg:#120409;
        --phone:#1d0810;
        --panel:#2e1219;
        --panel2:#250d14;
        --red:#e23e57;
        --red2:#ff8296;
        --gold:#d4af37;
        --gold2:#e9cd6d;
        --ink:#f8edef;
        --muted:#c9a7ad;
        --line:rgba(212,175,55,.3);
        --ok:#3ecf7a;
        --bad:#ff7a7a;
        color-scheme:dark;
      }
      *{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
      html,body{
        height:100%;
        height:100dvh;
        margin:0;
        padding:0;
        overflow:hidden;
      }
      body{
        font-family:"Source Sans 3",system-ui,-apple-system,"Segoe UI",sans-serif;
        background:
          radial-gradient(900px 500px at 15% -10%, #3a0f1c 0%, transparent 60%),
          radial-gradient(800px 500px at 110% 110%, #2b0812 0%, transparent 55%),
          var(--bg);
        color:var(--ink);
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        height:100%;
        height:100dvh;
        max-height:100dvh;
        overflow:hidden;
      }
      .stage{
        display:flex;
        flex-direction:column;
        align-items:center;
        justify-content:center;
        width:100%;
        max-width:440px;
        height:100%;
        height:100dvh;
        max-height:100dvh;
        flex:1 1 0px;
        min-height:0;
        margin:0 auto;
        padding:0;
        box-sizing:border-box;
        overflow:hidden;
      }
      @media (min-width:520px){
        .stage{
          padding:12px;
        }
      }
      .phone{
        position:relative;
        width:100%;
        height:100%;
        max-height:100%;
        max-width:440px;
        min-width:0;
        flex:1 1 0px;
        min-height:0;
        background:linear-gradient(180deg,#26060f 0%,var(--phone) 30%);
        display:flex;
        flex-direction:column;
        overflow:hidden;
        border-radius:0;
      }
      @media (min-width:520px){
        .phone{
          max-height:min(900px, 94vh);
          border-radius:36px;
          border:1px solid rgba(226,62,87,.45);
          box-shadow:0 24px 70px rgba(0,0,0,.75),0 0 0 8px #0d0206,0 0 50px rgba(226,62,87,.12);
        }
      }
      header{
        padding:14px 18px 10px;
        border-bottom:1px solid rgba(226,62,87,.18);
        background:rgba(20,4,9,.8);
        flex:0 0 auto;
        backdrop-filter:blur(12px);
        -webkit-backdrop-filter:blur(12px);
        position:relative;
        z-index:20;
      }
      .hrow{display:flex;justify-content:space-between;align-items:baseline;gap:10px}
      .subject{color:var(--red2);font-weight:700;font-size:11.5px;letter-spacing:2.4px}
      .design{color:var(--muted);font-size:11px;letter-spacing:1.4px;font-weight:600;white-space:nowrap}
      h1{font-family:"Playfair Display",Georgia,serif;font-size:23px;line-height:1.15;margin:5px 0 2px;font-weight:800}
      .etapa{color:var(--muted);font-size:13px;margin:0 0 8px}
      .etapa b{color:var(--ink);font-weight:600}
      .track{height:6px;border-radius:99px;background:rgba(255,255,255,.09);overflow:hidden}
      .fill{height:100%;background:linear-gradient(90deg,#8f1020,var(--red),var(--gold));border-radius:99px;transition:width .45s ease}
      .sealrow{margin-top:8px}
      .blockseal{
        display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:1.5px;
        color:var(--gold2);border:1px solid var(--line);border-radius:99px;
        padding:3px 10px;background:rgba(212,175,55,.07);text-transform:uppercase;
      }
      .scroll{
        flex:1 1 0px;
        min-height:0;
        height:100%;
        overflow-y:auto;
        overflow-x:hidden;
        -webkit-overflow-scrolling:touch;
        padding:18px 20px 32px;
        scrollbar-width:thin;
        scrollbar-color:rgba(226,62,87,.6) rgba(255,255,255,.04);
        overscroll-behavior:contain;
      }
      .scroll::-webkit-scrollbar{width:5px}
      .scroll::-webkit-scrollbar-track{background:rgba(255,255,255,.04);border-radius:99px}
      .scroll::-webkit-scrollbar-thumb{background:linear-gradient(180deg,var(--red),#7d0c1e);border-radius:99px}
      .banner{
        width:100%;aspect-ratio:5/2;object-fit:cover;display:block;
        border-radius:14px;border:1px solid var(--line);
        margin-bottom:16px;background:#250d14;
      }
      /* ===== CAPA: imagem primeiro, título abaixo ===== */
      .coverimg{
        width:100%;aspect-ratio:7/4.4;object-fit:cover;object-position:center 38%;display:block;
        border-radius:16px;border:1px solid var(--line);
        box-shadow:0 20px 44px rgba(0,0,0,.5),0 0 34px rgba(226,62,87,.12);
        margin-bottom:16px;background:#250d14;
      }
      .covertitle{
        font-family:"Playfair Display",Georgia,serif;font-size:34px;line-height:1.12;
        font-weight:800;margin:0 0 6px;
      }
      .coverrule{
        height:3px;width:72px;border-radius:99px;margin:12px 0 16px;
        background:linear-gradient(90deg,var(--red),var(--gold));
      }
      /* ===== IMAGEM VAZADA NO MEIO DO TEXTO ===== */
      .vazada{
        position:relative;height:138px;border-radius:14px;overflow:hidden;
        margin:16px 0;border:1px solid rgba(212,175,55,.2);background:#250d14;
      }
      .vazada img{
        width:100%;height:100%;object-fit:cover;object-position:center 40%;
        opacity:.42;display:block;
      }
      .vazada::after{
        content:"";position:absolute;inset:0;pointer-events:none;
        background:linear-gradient(180deg,rgba(29,8,16,.72),rgba(29,8,16,0) 38%,rgba(29,8,16,0) 62%,rgba(29,8,16,.72));
      }
      .scroll.enter{animation:fadein .32s ease}
      @keyframes fadein{from{opacity:.25}to{opacity:1}}
      /* ===== TERMO TÉCNICO EM DESTAQUE ===== */
      .term{color:var(--red2);font-weight:700}
      p b.term, ul.tight li b.term, .box p b.term{color:var(--red2)}
      /* ===== FRASE-CHAVE ===== */
      .frasechave{
        background:linear-gradient(160deg,rgba(226,62,87,.17),rgba(226,62,87,.05));
        border:1px solid rgba(226,62,87,.45);border-radius:14px;
        padding:14px 16px;margin:16px 0;
      }
      .frasechave .flabel{color:var(--red2);font-size:11.5px;font-weight:700;letter-spacing:1.8px;margin:0 0 6px;display:flex;align-items:center}
      .frasechave p.fq2{font-family:"Playfair Display",Georgia,serif;font-size:19px;line-height:1.45;margin:0;color:#fdf3f4}
      /* ===== CARTÃO DE FECHAMENTO DE BLOCO ===== */
      .fimbloco{
        background:var(--panel);border:1px solid var(--line);border-radius:14px;
        padding:14px 16px;margin:16px 0 4px;
      }
      .fimbloco .flabel{color:var(--gold2);font-size:11.5px;font-weight:700;letter-spacing:1.8px;margin:0 0 8px;display:flex;align-items:center}
      .fimbloco ul{list-style:none;margin:0;padding:0}
      .fimbloco li{position:relative;font-size:15.5px;line-height:1.5;padding:5px 0 5px 22px;border-bottom:1px dashed rgba(255,255,255,.07)}
      .fimbloco li:last-child{border-bottom:none}
      .fimbloco li::before{content:"◆";position:absolute;left:2px;top:10px;font-size:8px;color:var(--gold)}
      .fimbloco li b{color:var(--gold2);font-weight:700}
      /* ===== ÍCONES DOS BLOCOS ESPECIAIS ===== */
      .bic{display:inline-flex;vertical-align:-2px;margin-right:7px;flex:0 0 auto}
      .bic svg{width:14px;height:14px;display:block}
      .kicker{color:var(--red2);font-size:12px;font-weight:700;letter-spacing:2.2px;text-transform:uppercase;margin:0 0 6px}
      .kicker::before{content:"◆";font-size:8px;vertical-align:2px;margin-right:7px;color:var(--gold)}
      h2{font-family:"Playfair Display",Georgia,serif;font-size:24px;line-height:1.22;margin:0 0 12px;font-weight:700}
      p{font-size:16px;line-height:1.6;margin:0 0 12px;color:var(--ink)}
      p.lead{font-size:17px;color:#fdf3f4}
      ul.tight{list-style:none;margin:4px 0 14px;padding:0}
      ul.tight li{
        position:relative;font-size:16px;line-height:1.55;
        padding:7px 0 7px 24px;border-bottom:1px dashed rgba(255,255,255,.07);
      }
      ul.tight li:last-child{border-bottom:none}
      ul.tight li::before{content:"◆";position:absolute;left:2px;top:12px;font-size:8px;color:var(--gold)}
      ul.tight li b, p b{color:var(--gold2);font-weight:700}
      .box{
        background:var(--panel);border:1px solid var(--line);border-radius:14px;
        padding:14px 16px;margin:14px 0;
      }
      .box .blabel{color:var(--red2);font-size:11.5px;font-weight:700;letter-spacing:1.8px;margin:0 0 6px}
      .box p{margin:0;font-size:15px}
      .box p + p{margin-top:8px}
      .box.exemplo{position:relative;overflow:hidden}
      .box.exemplo .wm{
        position:absolute;top:0;right:0;width:74%;height:100%;object-fit:cover;
        opacity:.15;mix-blend-mode:screen;pointer-events:none;
        -webkit-mask-image:linear-gradient(to left,#000 40%,transparent 96%);
        mask-image:linear-gradient(to left,#000 40%,transparent 96%);
      }
      .box.exemplo .excontent{position:relative;z-index:1}
      .viarow{display:flex;gap:12px;align-items:flex-start;background:var(--panel2);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:13px 14px;margin:10px 0}
      .vianum{
        flex:0 0 auto;width:40px;height:40px;border-radius:50%;
        border:1.5px solid var(--red);color:var(--red2);
        display:flex;align-items:center;justify-content:center;
        font-family:"Playfair Display",serif;font-weight:700;font-size:16px;
      }
      .viarow h3{margin:2px 0 3px;font-size:17px;font-weight:700}
      .viarow p{margin:0;font-size:15px;color:var(--muted);line-height:1.5}
      .chips{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0 4px}
      .chip{border:1px solid var(--line);color:var(--gold2);border-radius:99px;padding:6px 12px;font-size:13.5px;font-weight:600;background:rgba(212,175,55,.07)}
      .qtext{font-size:17px;line-height:1.6;margin-bottom:14px}
      .opt{
        display:flex;gap:11px;align-items:flex-start;width:100%;text-align:left;
        background:var(--panel2);border:1.5px solid rgba(255,255,255,.12);color:var(--ink);
        border-radius:13px;padding:13px 14px;margin:9px 0;font-size:15.5px;line-height:1.45;
        font-family:inherit;cursor:pointer;transition:border-color .15s,background .15s;
      }
      .opt:hover{border-color:rgba(226,62,87,.65)}
      .opt .letter{
        flex:0 0 auto;width:27px;height:27px;border-radius:8px;margin-top:1px;
        border:1.5px solid var(--red);color:var(--red2);
        display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;
      }
      .opt.correct{border-color:var(--ok);background:rgba(62,207,122,.12)}
      .opt.correct .letter{border-color:var(--ok);color:var(--ok)}
      .opt.wrong{border-color:var(--bad);background:rgba(255,122,122,.1)}
      .opt.wrong .letter{border-color:var(--bad);color:var(--bad)}
      .opt:disabled{cursor:default;opacity:.92}
      .feedback{display:none;border-radius:13px;padding:13px 15px;margin-top:13px;font-size:15px;line-height:1.55}
      .feedback.show{display:block}
      .feedback.good{background:rgba(62,207,122,.13);border:1px solid rgba(62,207,122,.5)}
      .feedback.bad{background:rgba(255,122,122,.1);border:1px solid rgba(255,122,122,.45)}
      .feedback b{display:block;margin-bottom:3px;font-size:15.5px}
      .flashwrap{perspective:1200px;margin:6px 0 4px}
      .flash{
        position:relative;width:100%;min-height:240px;cursor:pointer;
        transform-style:preserve-3d;transition:transform .6s cubic-bezier(.3,.7,.3,1);
      }
      .flash.flipped{transform:rotateY(180deg)}
      .face{
        position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;
        border-radius:18px;padding:22px 20px;display:flex;flex-direction:column;justify-content:center;
      }
      .face.front{background:linear-gradient(160deg,#33121b,#200a10);border:1.5px solid var(--line);text-align:center;align-items:center}
      .face.back{background:linear-gradient(160deg,#3d1620,#2a0e16);border:1.5px solid var(--red);transform:rotateY(180deg)}
      .face .flabel{color:var(--red2);font-size:11.5px;font-weight:700;letter-spacing:2px;margin-bottom:12px}
      .face.front .fq{font-family:"Playfair Display",serif;font-size:20px;line-height:1.4}
      .face.back p{font-size:15.5px;line-height:1.6;margin:0}
      .face.back p b{color:var(--gold2)}
      .tap{margin-top:16px;color:var(--muted);font-size:13px}
      .matchscore{color:var(--muted);font-size:14.5px;margin-bottom:10px}
      .matchscore b{color:var(--gold2)}
      .matchgrid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .mbtn{
        background:var(--panel2);border:1.5px solid rgba(255,255,255,.12);color:var(--ink);
        border-radius:12px;padding:11px 11px;font-size:14.5px;line-height:1.4;font-family:inherit;
        cursor:pointer;text-align:left;transition:border-color .15s,background .15s;
      }
      .mbtn.sel{border-color:var(--red);background:rgba(226,62,87,.16)}
      .mbtn.done{border-color:var(--ok);background:rgba(62,207,122,.12);color:#c9f2da;cursor:default}
      .mbtn.shake{animation:shake .35s}
      @keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}
      .matchdone{display:none;margin-top:14px;background:rgba(62,207,122,.13);border:1px solid rgba(62,207,122,.5);border-radius:13px;padding:13px 15px;font-size:15px}
      .matchdone.show{display:block}
      table.cmp{width:100%;border-collapse:collapse;margin:8px 0 6px;font-size:14px}
      table.cmp th{
        background:#33121b;color:var(--gold2);text-align:left;padding:10px 9px;
        font-size:13px;letter-spacing:.4px;border-bottom:2px solid var(--red);
      }
      table.cmp td{padding:10px 9px;border-bottom:1px solid rgba(255,255,255,.09);line-height:1.45;vertical-align:top}
      table.cmp td.t{font-weight:700;color:var(--gold2)}
      .explorebox{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--line);margin:4px 0 12px;background:#250d14}
      .explorebox img{width:100%;display:block}
      .hotspot{
        position:absolute;width:38px;height:38px;margin:-19px 0 0 -19px;border-radius:50%;
        background:rgba(20,4,9,.85);border:2px solid var(--gold);color:var(--gold2);
        font-family:inherit;font-weight:700;font-size:15px;cursor:pointer;z-index:2;
        display:flex;align-items:center;justify-content:center;
      }
      .hotspot::after{
        content:"";position:absolute;inset:-2px;border-radius:50%;
        border:2px solid rgba(212,175,55,.8);animation:pulse 1.8s ease-out infinite;pointer-events:none;
      }
      @keyframes pulse{0%{transform:scale(1);opacity:.9}70%{transform:scale(1.7);opacity:0}100%{transform:scale(1.7);opacity:0}}
      .hotspot.active{background:linear-gradient(180deg,#ff7a8a,#c8102e);border-color:#fff;color:#fff}
      .hotspot.active::after{display:none}
      .hotspot.seen{background:var(--gold);color:#2a0e16;border-color:var(--gold2)}
      .hotspot.seen::after{animation:none;opacity:0}
      .explorecount{color:var(--muted);font-size:14.5px;margin:0 0 10px}
      .explorecount b{color:var(--gold2)}
      .hotpanel{background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:14px 16px;margin:0 0 6px}
      .hotpanel h3{margin:0 0 6px;font-size:18px;font-family:"Playfair Display",serif;font-weight:700}
      .hotpanel p{margin:0;font-size:15px}
      .explorehint{color:var(--muted);font-size:14.5px;margin:0}
      .revealcard{
        display:block;width:100%;text-align:left;cursor:pointer;color:var(--ink);font-family:inherit;
        background:linear-gradient(160deg,#33121b,#200a10);border:1.5px solid var(--line);
        border-radius:14px;padding:15px 16px;margin:10px 0;
      }
      .revealcard .rlabel{color:var(--red2);font-size:11.5px;font-weight:700;letter-spacing:1.8px;margin:0 0 6px}
      .revealcard .rbody{font-size:15.5px;line-height:1.55;margin:0}
      .revealcard .rbody b{color:var(--gold2)}
      .revealcard .rhint{color:var(--muted);font-size:13px;margin:8px 0 0}
      .revealcard.open{border-color:var(--red)}
      .revealcard.done{border-color:var(--gold);background:linear-gradient(160deg,#3a1420,#2a0e16);cursor:default}
      .revealcard.done .rlabel{color:var(--gold2)}
      /* ===== LINHA DO TEMPO ===== */
      .timeline{position:relative;margin:8px 0 4px;padding-left:30px}
      .timeline::before{content:"";position:absolute;left:12px;top:8px;bottom:8px;width:2px;background:linear-gradient(180deg,var(--gold),var(--red))}
      .tlitem{position:relative;margin-bottom:10px}
      .tlbtn{
        width:100%;text-align:left;background:var(--panel2);border:1.5px solid rgba(255,255,255,.12);
        color:var(--ink);border-radius:12px;padding:11px 13px;font-family:inherit;cursor:pointer;
        display:flex;gap:11px;align-items:baseline;
      }
      .tlbtn::before{
        content:"";position:absolute;left:-24px;top:16px;width:11px;height:11px;border-radius:50%;
        background:#1d0810;border:2.5px solid var(--gold);
      }
      .tlbtn.open{border-color:var(--gold)}
      .tlbtn.open::before{background:var(--gold)}
      .tlyear{font-family:"Playfair Display",serif;font-weight:800;color:var(--gold2);font-size:16px;white-space:nowrap}
      .tltitle{font-size:15px;font-weight:600;line-height:1.35}
      .tlbody{display:none;background:var(--panel);border:1px solid var(--line);border-radius:0 0 12px 12px;border-top:none;padding:4px 13px 12px;margin-top:-6px}
      .tlbody.show{display:block}
      .tlbody p{font-size:14.5px;margin:6px 0 2px}
      /* ===== VERDADEIRO OU FALSO ===== */
      .vfstage{position:relative;margin:6px 0 4px;touch-action:pan-y}
      .vfcard{
        background:linear-gradient(160deg,#33121b,#200a10);border:1.5px solid var(--line);border-radius:16px;
        padding:20px 18px;min-height:150px;display:flex;flex-direction:column;justify-content:center;
        cursor:grab;user-select:none;-webkit-user-select:none;position:relative;
      }
      .vfcard .vflabel{color:var(--red2);font-size:11.5px;font-weight:700;letter-spacing:1.8px;margin:0 0 8px}
      .vfcard .vftext{font-size:17px;line-height:1.55;margin:0;font-family:"Playfair Display",serif}
      .vfstamp{
        position:absolute;top:14px;font-weight:800;font-size:14px;letter-spacing:1.5px;
        border:2.5px solid;border-radius:8px;padding:3px 9px;opacity:0;transform:rotate(-8deg);
      }
      .vfstamp.f{left:14px;color:var(--bad);border-color:var(--bad)}
      .vfstamp.v{right:14px;color:var(--ok);border-color:var(--ok);transform:rotate(8deg)}
      .vfbtns{display:flex;gap:10px;margin-top:12px}
      .vfbtn{
        flex:1;padding:13px 8px;border-radius:12px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;
        background:transparent;color:var(--ink);border:1.5px solid rgba(255,255,255,.25);
      }
      .vfbtn.f:hover{border-color:var(--bad);color:var(--bad)}
      .vfbtn.v:hover{border-color:var(--ok);color:var(--ok)}
      /* ===== COMPLETAR A FRASE ===== */
      .filltext{font-size:17px;line-height:1.9;background:var(--panel);border:1px solid var(--line);border-radius:14px;padding:15px 16px;margin:6px 0 12px}
      .blank{
        display:inline-block;min-width:88px;text-align:center;border-bottom:2.5px solid var(--gold);
        color:var(--gold2);font-weight:700;padding:0 6px;margin:0 2px;vertical-align:baseline;
      }
      .blank.empty{color:var(--muted);font-weight:400}
      .blank.next{border-bottom-color:var(--red2);animation:blankglow 1.2s ease-in-out infinite}
      @keyframes blankglow{0%,100%{background:rgba(226,62,87,.05)}50%{background:rgba(226,62,87,.22)}}
      .wordbank{display:flex;flex-wrap:wrap;gap:8px;margin:4px 0 6px}
      .wordchip{
        background:var(--panel2);border:1.5px solid rgba(255,255,255,.2);color:var(--ink);border-radius:99px;
        padding:9px 15px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer;
      }
      .wordchip:hover{border-color:var(--gold)}
      .wordchip.used{opacity:.28;cursor:default;border-style:dashed}
      .wordchip.shake{animation:shake .35s;border-color:var(--bad)}
      /* ===== KARAOKÊ ===== */
      .karaoke{font-size:17px;line-height:1.85}
      .karaoke .sent{border-radius:6px;padding:1px 3px;cursor:pointer;color:#d8bfc4;transition:background .3s,color .3s}
      .karaoke .sent.on{background:rgba(212,175,55,.28);color:#fff}
      .karaoke .sent.done{color:var(--ink)}
      /* ===== COMPARADOR ===== */
      .cmpbox{position:relative;border-radius:16px;overflow:hidden;border:1px solid var(--line);aspect-ratio:4/4.6;margin:6px 0 12px;background:#250d14;touch-action:none}
      .cmpbox img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;pointer-events:none}
      .cmpbox .cmpafter{clip-path:inset(0 0 0 50%)}
      .cmplabel{
        position:absolute;top:10px;z-index:3;background:rgba(20,4,9,.78);color:var(--gold2);
        font-size:12px;font-weight:700;letter-spacing:1.4px;border:1px solid var(--line);
        border-radius:99px;padding:5px 11px;pointer-events:none;
      }
      .cmplabel.l{left:10px}.cmplabel.r{right:10px}
      .cmphandle{
        position:absolute;top:0;bottom:0;left:50%;width:3px;margin-left:-1.5px;z-index:2;
        background:linear-gradient(180deg,var(--gold2),var(--gold));pointer-events:none;
      }
      .cmphandle::after{
        content:"◂ ▸";position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);
        background:linear-gradient(180deg,#ff7a8a,#c8102e);color:#fff;font-size:13px;font-weight:700;
        border-radius:99px;padding:7px 11px;white-space:nowrap;box-shadow:0 4px 14px rgba(0,0,0,.5);
      }
      input.cmprange{width:100%;margin:2px 0 12px;accent-color:var(--gold);height:28px;cursor:pointer}
      /* ===== MAPA MENTAL ===== */
      .mindcenter{
        text-align:center;font-family:"Playfair Display",serif;font-size:19px;font-weight:800;
        background:linear-gradient(160deg,#3d1620,#2a0e16);border:1.5px solid var(--gold);color:var(--gold2);
        border-radius:14px;padding:14px 12px;margin:6px 0 12px;
      }
      .mindbranch{margin-bottom:9px}
      .mindbtn{
        width:100%;text-align:left;background:var(--panel2);border:1.5px solid rgba(255,255,255,.12);color:var(--ink);
        border-radius:12px;padding:12px 14px;font-family:inherit;font-size:15.5px;font-weight:700;cursor:pointer;
        display:flex;justify-content:space-between;align-items:center;gap:8px;
      }
      .mindbtn.open{border-color:var(--red)}
      .mindbtn .marr{color:var(--gold2);font-size:13px}
      .mindbody{display:none;background:var(--panel);border:1px solid var(--line);border-top:none;border-radius:0 0 12px 12px;padding:12px 14px 6px;margin-top:-5px}
      .mindbody.show{display:block}
      .mindbody p{font-size:15px;margin:0 0 8px}
      /* ===== DESAFIO ===== */
      .scorebar{
        display:flex;justify-content:space-between;align-items:center;background:var(--panel);
        border:1px solid var(--line);border-radius:12px;padding:10px 14px;margin:6px 0 12px;
        font-size:14.5px;color:var(--muted);
      }
      .scorebar .pts{color:var(--gold2);font-weight:800;font-size:18px;font-variant-numeric:tabular-nums}
      .finalscore{
        text-align:center;background:linear-gradient(160deg,#3d1620,#2a0e16);border:1.5px solid var(--gold);
        border-radius:16px;padding:20px 16px;margin:8px 0;
      }
      .finalscore .big{font-family:"Playfair Display",serif;font-size:36px;font-weight:800;color:var(--gold2);margin:4px 0}
      .finalscore p{margin:0;font-size:15px}
      .againbtn{
        margin-top:14px;background:linear-gradient(180deg,#ff7a8a,#c8102e);color:#fff;border:none;
        border-radius:12px;padding:12px 22px;font-size:15px;font-weight:700;font-family:inherit;cursor:pointer;
      }

      /* ===== MENU DE RODAPÉ (NOVO PLAYER CENTRALIZADO + BOTÕES LATERAIS) ===== */
      footer{
        flex:0 0 auto;
        position:sticky;
        bottom:0;
        left:0;
        right:0;
        z-index:100;
        display:flex;
        flex-direction:column;
        gap:8px;
        padding:10px 16px calc(12px + env(safe-area-inset-bottom));
        border-top:1px solid rgba(226,62,87,.28);
        background:rgba(18,4,9,.96);
        backdrop-filter:blur(20px);
        -webkit-backdrop-filter:blur(20px);
        box-shadow:0 -8px 25px rgba(0,0,0,.75);
      }
      .audio-progress-row{
        display:flex;
        align-items:center;
        gap:10px;
        width:100%;
      }
      .atime-label{
        font-size:11px;
        color:var(--muted);
        font-variant-numeric:tabular-nums;
        font-weight:600;
        min-width:28px;
        letter-spacing:.4px;
      }
      .atime-label.cur{ text-align:right; }
      .atime-label.total{ text-align:left; }
      .atrack{
        flex:1;
        height:6px;
        border-radius:99px;
        background:rgba(255,255,255,.14);
        overflow:hidden;
        cursor:pointer;
        position:relative;
      }
      .afill{
        height:100%;
        width:0%;
        background:linear-gradient(90deg,var(--red),var(--gold));
        border-radius:99px;
        transition:width .1s linear;
      }
      .footer-nav-row{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:12px;
        width:100%;
      }
      .navbtn{
        flex:1;
        max-width:130px;
        height:44px;
        padding:0 12px;
        border-radius:12px;
        font-size:14.5px;
        font-weight:700;
        font-family:inherit;
        cursor:pointer;
        border:1.5px solid rgba(255,255,255,.18);
        background:rgba(255,255,255,.05);
        color:var(--ink);
        display:flex;
        align-items:center;
        justify-content:center;
        gap:6px;
        transition:all .15s ease;
        user-select:none;
        -webkit-user-select:none;
      }
      .navbtn:hover:not(:disabled){
        background:rgba(255,255,255,.12);
        border-color:rgba(255,255,255,.32);
      }
      .navbtn:active:not(:disabled){
        transform:scale(.97);
      }
      .navbtn.next{
        background:linear-gradient(135deg,#ff7a8a,#c8102e);
        color:#fff;
        border-color:transparent;
        box-shadow:0 4px 14px rgba(226,62,87,.35);
      }
      .navbtn.next:hover:not(:disabled){
        filter:brightness(1.08);
      }
      .navbtn:disabled{
        opacity:.28;
        cursor:default;
        pointer-events:none;
      }
      .navic{
        width:16px;
        height:16px;
        flex:0 0 auto;
      }
      .player-center{
        flex:0 0 auto;
        display:flex;
        align-items:center;
        justify-content:center;
      }
      .playbtn{
        width:52px;
        height:52px;
        border-radius:50%;
        background:linear-gradient(135deg,#ff7a8a 0%,#e23e57 50%,#b3102c 100%);
        border:2px solid rgba(212,175,55,.6);
        cursor:pointer;
        display:flex;
        align-items:center;
        justify-content:center;
        box-shadow:0 4px 18px rgba(226,62,87,.5),0 0 12px rgba(212,175,55,.2);
        transition:transform .15s ease,box-shadow .15s ease,filter .15s ease;
        user-select:none;
        -webkit-user-select:none;
      }
      .playbtn:hover{
        transform:scale(1.06);
        filter:brightness(1.1);
        box-shadow:0 6px 22px rgba(226,62,87,.65),0 0 16px rgba(212,175,55,.35);
      }
      .playbtn:active{
        transform:scale(.95);
      }
      .playbtn svg{
        width:22px;
        height:22px;
        fill:#fff;
        display:block;
        margin-left:2px;
      }
      .playbtn.playing svg{
        margin-left:0;
      }
      @keyframes playPulse{
        0%,100%{ box-shadow:0 4px 18px rgba(226,62,87,.5),0 0 10px rgba(212,175,55,.25); }
        50%{ box-shadow:0 4px 24px rgba(226,62,87,.75),0 0 20px rgba(212,175,55,.5); }
      }
      .playbtn.playing{
        animation:playPulse 2s infinite ease-in-out;
      }
      @media (max-width:400px){
        .navbtn{ max-width:110px; font-size:13.5px; padding:0 8px; }
        .playbtn{ width:48px; height:48px; }
      }
      @media (prefers-reduced-motion:reduce){
        .flash{transition:none}.fill{transition:none}.hotspot::after{animation:none}
        .scroll.enter{animation:none}.playbtn.playing{animation:none}
      }
    </style>
  </head>
  <body>
    <div class="stage">
      <div class="phone" id="phone">
        <header>
          <div class="hrow">
            <span class="subject">DIREITO PENAL</span>
            <span class="design">TEMA VERMELHO</span>
          </div>
          <h1>Crimes Contra a Família</h1>
          <p class="etapa" id="etapaLabel">Etapa 1 de 32</p>
          <div class="track"><div class="fill" id="progressFill" style="width:3.13%"></div></div>
          <div class="sealrow"><span class="blockseal" id="blockSeal">Bloco 1 de 3 · O terreno da família</span></div>
        </header>
        <div class="scroll" id="scrollArea" tabindex="0"></div>
        <footer>
          <div class="audio-progress-row">
            <span class="atime-label cur" id="aTimeCur">0:00</span>
            <div class="atrack" id="aTrack" title="Arrastar ou clicar para navegar no áudio">
              <div class="afill" id="aFill"></div>
            </div>
            <span class="atime-label total" id="aTimeTotal">0:00</span>
            <span id="aTime" style="display:none">0:00 / 0:00</span>
          </div>
          <div class="footer-nav-row">
            <button class="navbtn prev" id="btnPrev" type="button" aria-label="Etapa anterior">
              <svg viewBox="0 0 24 24" class="navic" aria-hidden="true"><path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              <span class="navbtn-label">Anterior</span>
            </button>
            <div class="player-center" id="audioBox" title="Controle de narração">
              <button class="playbtn" id="playBtn" type="button" aria-label="Ouvir a narração" title="Clique para reproduzir ou pausar">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>
              </button>
            </div>
            <button class="navbtn next" id="btnNext" type="button" aria-label="Próxima etapa">
              <span class="navbtn-label" id="btnNextLabel">Próximo</span>
              <svg viewBox="0 0 24 24" class="navic" aria-hidden="true"><path d="M9 18l6-6-6-6" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
          </div>
        </footer>
      </div>
    </div>

    <script>
    var IMG = {
      "capa": "assets/img/capa.webp",
      "mapa": "assets/img/mapa.webp",
      "familia": "assets/img/familia.webp",
      "capitulos": "assets/img/capitulos.webp",
      "balanca": "assets/img/balanca.webp",
      "questao": "assets/img/questao.webp",
      "flashcards": "assets/img/flashcards.webp",
      "bigamia": "assets/img/bigamia.webp",
      "sujeitos": "assets/img/sujeitos.webp",
      "anulacao": "assets/img/anulacao.webp",
      "condicoes": "assets/img/condicoes.webp",
      "dolo": "assets/img/dolo.webp",
      "questao2": "assets/img/questao2.webp",
      "flashcards2": "assets/img/flashcards2.webp",
      "compcivil": "assets/img/compcivil.webp",
      "compreligioso": "assets/img/compreligioso.webp",
      "explorar": "assets/img/explorar.webp",
      "revelar": "assets/img/revelar.webp",
      "ligar": "assets/img/ligar.webp",
      "ligar2": "assets/img/ligar2.webp",
      "lacuna": "assets/img/lacuna.webp",
      "tabela": "assets/img/tabela.webp",
      "cartasvf": "assets/img/cartasvf.webp",
      "timeline": "assets/img/timeline.webp",
      "mapamental": "assets/img/mapamental.webp",
      "pegadinhas": "assets/img/pegadinhas.webp",
      "martelo": "assets/img/martelo.webp",
      "ouro": "assets/img/ouro.webp",
      "fim": "assets/img/fim.webp",
      "panorama": "assets/img/panorama.webp"
    };
    function getImgUrl(key){
      if(!key) return "";
      if(key.indexOf("http://") === 0 || key.indexOf("https://") === 0) return key;
      return IMG[key] || (key.indexOf(".") !== -1 ? key : "assets/img/" + key + ".webp");
    }
`;

const HTML_SUFFIX = `/* ============ ÁUDIO / NAVEGAÇÃO ============ */
    var total = SLIDES.length;
    var idx = 0;
    var userStartedPlayback = false;
    var player = new Audio();
    player.preload = "auto";
    var isTTSActive = false;
    var isTTSPaused = false;
    var ttsUtterance = null;
    var state = {};

    var scrollArea = document.getElementById("scrollArea");
    var etapaLabel = document.getElementById("etapaLabel");
    var progressFill = document.getElementById("progressFill");
    var btnPrev = document.getElementById("btnPrev");
    var btnNext = document.getElementById("btnNext");
    var btnNextLabel = document.getElementById("btnNextLabel");
    var playBtn = document.getElementById("playBtn");
    var aTrack = document.getElementById("aTrack");
    var aFill = document.getElementById("aFill");
    var aTimeCur = document.getElementById("aTimeCur");
    var aTimeTotal = document.getElementById("aTimeTotal");
    var aTime = document.getElementById("aTime");

    var ICON_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5v15l13-7.5z"/></svg>';
    var ICON_PAUSE = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';

    /* ===== ÍCONES DOS BLOCOS ESPECIAIS ===== */
    var BIC = {
      book:'<span class="bic"><svg viewBox="0 0 24 24" fill="none" stroke="#e9cd6d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z"/><path d="M4 19.5A2.5 2.5 0 0 0 6.5 22H20v-5"/></svg></span>',
      bulb:'<span class="bic"><svg viewBox="0 0 24 24" fill="none" stroke="#e9cd6d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg></span>',
      eye:'<span class="bic"><svg viewBox="0 0 24 24" fill="none" stroke="#e9cd6d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></span>',
      contrast:'<span class="bic"><svg viewBox="0 0 24 24" fill="none" stroke="#e9cd6d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 0 18V3z" fill="#e9cd6d" stroke="none"/></svg></span>',
      warn:'<span class="bic"><svg viewBox="0 0 24 24" fill="none" stroke="#e9cd6d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg></span>',
      list:'<span class="bic"><svg viewBox="0 0 24 24" fill="none" stroke="#e9cd6d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 6h13"/><path d="M8 12h13"/><path d="M8 18h13"/><path d="M3.5 6h.01"/><path d="M3.5 12h.01"/><path d="M3.5 18h.01"/></svg></span>',
      check:'<span class="bic"><svg viewBox="0 0 24 24" fill="none" stroke="#e9cd6d" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg></span>',
      key:'<span class="bic"><svg viewBox="0 0 24 24" fill="none" stroke="#e9cd6d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="16" r="4.5"/><path d="M11.2 12.8L20 4"/><path d="M16.5 7.5L19 10"/><path d="M14 10l2.5 2.5"/></svg></span>'
    };
    function iconize(h){
      h = h.split('<p class="blabel">EXEMPLO PRÁTICO</p>').join('<p class="blabel">' + BIC.book + 'EXEMPLO PRÁTICO</p>');
      h = h.split('<p class="blabel">PENSE ASSIM</p>').join('<p class="blabel">' + BIC.bulb + 'PENSE ASSIM</p>');
      h = h.split('<p class="blabel">OLHE COM CUIDADO</p>').join('<p class="blabel">' + BIC.eye + 'OLHE COM CUIDADO</p>');
      h = h.split('<p class="blabel">CONTRASTE RÁPIDO</p>').join('<p class="blabel">' + BIC.contrast + 'CONTRASTE RÁPIDO</p>');
      h = h.split('<p class="blabel">OS PRINCÍPIOS DA NOVA DEFESA SOCIAL</p>').join('<p class="blabel">' + BIC.list + 'OS PRINCÍPIOS DA NOVA DEFESA SOCIAL</p>');
      h = h.replace(/(<p class="blabel">)(PEGADINHA)/g, '$1' + BIC.warn + '$2');
      h = h.split('<p class="flabel">FRASE-CHAVE</p>').join('<p class="flabel">' + BIC.key + 'FRASE-CHAVE</p>');
      h = h.split('<p class="flabel">NESSE BLOCO VOCÊ VIU</p>').join('<p class="flabel">' + BIC.check + 'NESSE BLOCO VOCÊ VIU</p>');
      h = h.split('<p class="blabel">O TEXTO DA LEI</p>').join('<p class="blabel">' + BIC.book + 'O TEXTO DA LEI</p>');
      h = h.replace(/(<p class="blabel">)(CASO REAL)/g, '$1' + BIC.eye + '$2');
      h = h.split('<p class="flabel">NESTE BLOCO VOCÊ VIU</p>').join('<p class="flabel">' + BIC.check + 'NESTE BLOCO VOCÊ VIU</p>');
      h = h.split('<p class="flabel">PONTOS PRINCIPAIS DA AULA</p>').join('<p class="flabel">' + BIC.check + 'PONTOS PRINCIPAIS DA AULA</p>');
      return h;
    }

    function pad(n){ return String(n).padStart(2,"0"); }
    function fmt(t){
      if(!isFinite(t) || t == null) return "0:00";
      t = Math.max(0, Math.floor(t));
      return Math.floor(t/60) + ":" + pad(t%60);
    }
    function audioSrc(i){ return "assets/audio/s" + pad(i+1) + ".mp3"; }

    function updatePlayBtn(playing){
      if(!playBtn) return;
      if(playing){
        playBtn.innerHTML = ICON_PAUSE;
        playBtn.classList.add("playing");
        playBtn.setAttribute("aria-label", "Pausar narração");
        playBtn.setAttribute("title", "Clique para pausar");
      } else {
        playBtn.innerHTML = ICON_PLAY;
        playBtn.classList.remove("playing");
        playBtn.setAttribute("aria-label", "Ouvir narração");
        playBtn.setAttribute("title", "Clique para reproduzir");
      }
    }

    function stopAllAudio(){
      player.pause();
      if('speechSynthesis' in window){
        window.speechSynthesis.cancel();
      }
      isTTSActive = false;
      isTTSPaused = false;
      ttsUtterance = null;
      updatePlayBtn(false);
    }

    function speakFallback(){
      var s = SLIDES[idx];
      if(!s || !s.narr || !('speechSynthesis' in window)) return;
      stopAllAudio();
      ttsUtterance = new SpeechSynthesisUtterance(s.narr);
      ttsUtterance.lang = 'pt-BR';
      ttsUtterance.rate = 1.05;
      ttsUtterance.onstart = function(){
        isTTSActive = true;
        isTTSPaused = false;
        updatePlayBtn(true);
      };
      ttsUtterance.onend = function(){
        isTTSActive = false;
        isTTSPaused = false;
        updatePlayBtn(false);
      };
      ttsUtterance.onerror = function(){
        isTTSActive = false;
        isTTSPaused = false;
        updatePlayBtn(false);
      };
      window.speechSynthesis.speak(ttsUtterance);
    }

    function tryPlay(){
      // Se a narração TTS estava pausada, retoma
      if(isTTSActive && isTTSPaused){
        if('speechSynthesis' in window){
          window.speechSynthesis.resume();
          isTTSPaused = false;
          updatePlayBtn(true);
          return;
        }
      }
      // Cancela qualquer fala TTS anterior
      if('speechSynthesis' in window && window.speechSynthesis.speaking){
        window.speechSynthesis.cancel();
        isTTSActive = false;
        isTTSPaused = false;
      }
      if(!player.src) return;
      var p = player.play();
      if(p && p.then){
        p.then(function(){
          updatePlayBtn(true);
        }).catch(function(err){
          console.warn("Audio HTML5 indisponível, usando fallback de voz:", err);
          speakFallback();
        });
      }
    }

    function doPause(){
      if(isTTSActive){
        if('speechSynthesis' in window){
          window.speechSynthesis.pause();
          isTTSPaused = true;
        }
        updatePlayBtn(false);
        return;
      }
      player.pause();
      updatePlayBtn(false);
    }

    function togglePlay(){
      userStartedPlayback = true;
      var isPlaying = (!player.paused && !player.ended) || (isTTSActive && !isTTSPaused);
      if(isPlaying){
        doPause();
      } else {
        tryPlay();
      }
    }

    player.addEventListener("play", function(){
      updatePlayBtn(true);
    });
    player.addEventListener("pause", function(){
      if(!isTTSActive) updatePlayBtn(false);
    });
    player.addEventListener("ended", function(){
      updatePlayBtn(false);
      if(aFill) aFill.style.width = "0%";
    });
    player.addEventListener("error", function(){
      console.warn("Erro ao carregar MP3 no CDN para a etapa " + (idx+1) + ". Ativando voz de síntese...");
      if(userStartedPlayback){
        speakFallback();
      }
    });
    player.addEventListener("timeupdate", function(){
      if(!player.duration || isNaN(player.duration)) return;
      var pct = (player.currentTime / player.duration) * 100;
      if(aFill) aFill.style.width = pct + "%";
      var cStr = fmt(player.currentTime);
      var dStr = fmt(player.duration);
      if(aTimeCur) aTimeCur.textContent = cStr;
      if(aTimeTotal) aTimeTotal.textContent = dStr;
      if(aTime) aTime.textContent = cStr + " / " + dStr;
      karaSync();
    });
    player.addEventListener("loadedmetadata", function(){
      var dStr = fmt(player.duration);
      if(aTimeTotal) aTimeTotal.textContent = dStr;
      if(aTime) aTime.textContent = "0:00 / " + dStr;
    });

    function bindAudio(){
      if(playBtn){
        playBtn.addEventListener("click", function(ev){
          ev.stopPropagation();
          togglePlay();
        });
      }
      if(aTrack){
        aTrack.addEventListener("click", function(ev){
          ev.stopPropagation();
          if(!player.duration || isNaN(player.duration)) return;
          var r = aTrack.getBoundingClientRect();
          var ratio = Math.max(0, Math.min(1, (ev.clientX - r.left) / r.width));
          player.currentTime = player.duration * ratio;
          userStartedPlayback = true;
          if(player.paused){
            tryPlay();
          }
        });
      }
    }

    function hotPanelHTML(s, es){
      if(es.cur === null || es.cur === undefined){
        return '<p class="explorehint">Toque em uma bolinha dourada sobre a imagem para ler a explicação daquela cena.</p>';
      }
      var pt = s.pontos[es.cur];
      var h = '<h3>' + pt.titulo + '</h3><p>' + pt.texto + '</p>';
      if(es.count === s.pontos.length){
        h += '<p style="margin-top:10px"><b>Exploração completa!</b> Você descobriu os cinco pontos da imagem: cada cena guarda uma regra da bigamia.</p>';
      }
      return h;
    }

    function slideHTML(s){
      if(s.tipo === "Capa"){
        var hc = '<img class="coverimg" src="' + getImgUrl(s.img) + '" alt="' + (s.alt || '') + '">';
        hc += '<p class="kicker">' + (s.kicker || '') + '</p>';
        hc += '<h2 class="covertitle">' + (s.titulo || '') + '</h2>';
        hc += '<div class="coverrule"></div>';
        hc += s.corpo;
        return hc;
      }
      if(s.tipo === "Encerramento"){
        var hf = '<img class="coverimg" src="' + getImgUrl(s.img) + '" alt="' + (s.alt || '') + '">';
        hf += '<p class="kicker">' + (s.kicker || '') + '</p>';
        hf += '<h2 class="covertitle">' + (s.titulo || '') + '</h2>';
        hf += '<div class="coverrule"></div>';
        hf += s.corpo;
        hf += '<div class="fimbloco"><p class="flabel">PONTOS PRINCIPAIS DA AULA</p><ul>'
          + '<li><b>Clássica:</b> razão, legalidade e livre-arbítrio, com um freio no Estado.</li>'
          + '<li><b>Positiva:</b> ciência e determinismo, com os olhos na pessoa que delinque.</li>'
          + '<li><b>Correcionalismo:</b> corrigir a vontade em vez de castigar.</li>'
          + '<li><b>Técnico-Jurídica:</b> método próprio e autonomia da ciência penal.</li>'
          + '<li><b>Defesa Social:</b> proteger a sociedade sem perder a pessoa.</li></ul></div>';
        return iconize(hf);
      }
      var h = '<img class="banner" src="' + getImgUrl(s.img) + '" alt="' + (s.alt || '') + '">';
      h += '<p class="kicker">' + (s.kicker || '') + '</p>';
      if(s.tipo === "Questão" || s.tipo === "Questão de banca"){
        if(s.intro) h += '<p>' + s.intro + '</p>';
        h += '<p class="qtext">' + s.questao + '</p>';
        var letters = ["A","B","C","D","E"];
        s.opcoes.forEach(function(op, oi){
          h += '<button class="opt" type="button" data-opt="' + oi + '"><span class="letter">' + letters[oi] + '</span><span>' + op + '</span></button>';
        });
        h += '<div class="feedback" id="feedback"></div>';
      } else if(s.tipo === "Flashcard"){
        h += '<div class="flashwrap"><div class="flash" id="flashCard">'
          + '<div class="face front"><div><p class="flabel">FLASHCARD · FRENTE</p><p class="fq">' + s.frente + '</p><p class="tap">Toque no cartão para ver a resposta</p></div></div>'
          + '<div class="face back"><div><p class="flabel">RESPOSTA</p>' + s.verso + '<p class="tap">Toque para voltar à pergunta</p></div></div>'
          + '</div></div>';
      } else if(s.tipo === "Ligar termos"){
        var st = state[idx] || (state[idx] = {done:{}, selT:null, selD:null, count:0});
        h += '<p>' + s.instrucao + '</p>';
        h += '<p class="matchscore">Pares encontrados: <b id="matchCount">' + st.count + ' de ' + s.pares.length + '</b></p>';
        h += '<div class="matchgrid"><div id="colTerms">';
        s.pares.forEach(function(p, pi){
          h += '<button class="mbtn term' + (st.done[pi] ? ' done' : '') + '" type="button" data-term="' + pi + '" style="display:block;width:100%;margin-bottom:9px">' + p[0] + '</button>';
        });
        h += '</div><div id="colDefs">';
        s.ordemDefs.forEach(function(pi){
          h += '<button class="mbtn def' + (st.done[pi] ? ' done' : '') + '" type="button" data-def="' + pi + '" style="display:block;width:100%;margin-bottom:9px">' + s.pares[pi][1] + '</button>';
        });
        h += '</div></div>';
        h += '<div class="matchdone' + (st.count === s.pares.length ? ' show' : '') + '" id="matchDone"><b>Muito bem!</b> Todos os pares foram ligados corretamente.</div>';
      } else if(s.tipo === "Explorar"){
        var es = state[idx] || (state[idx] = {seen:{}, cur:null, count:0});
        h = '<p class="kicker">' + s.kicker + '</p>';
        h += '<h2>' + s.titulo + '</h2>';
        h += '<p>' + s.intro + '</p>';
        h += '<p class="explorecount">Pontos descobertos: <b id="exploreCount">' + es.count + ' de ' + s.pontos.length + '</b></p>';
        h += '<div class="explorebox"><img src="' + getImgUrl(s.img) + '" alt="' + (s.alt || '') + '">';
        s.pontos.forEach(function(pt, pi){
          var cls = "hotspot" + (es.cur === pi ? " active" : "") + (es.seen[pi] && es.cur !== pi ? " seen" : "");
          var label = (es.seen[pi] && es.cur !== pi) ? "✓" : (pi + 1);
          h += '<button class="' + cls + '" type="button" data-hot="' + pi + '" style="left:' + pt.x + '%;top:' + pt.y + '%" aria-label="Ponto ' + (pi + 1) + ': ' + pt.titulo + '">' + label + '</button>';
        });
        h += '</div>';
        h += '<div class="hotpanel" id="hotPanel">' + hotPanelHTML(s, es) + '</div>';
      } else if(s.tipo === "Toque e revele"){
        h = '<img class="banner" src="' + getImgUrl(s.img) + '" alt="' + (s.alt || '') + '">';
        h += '<p class="kicker">' + s.kicker + '</p>';
        h += '<h2>' + s.titulo + '</h2>';
        h += '<p>' + s.intro + '</p>';
        var rs = state[idx] || (state[idx] = {stage:{}, count:0});
        h += '<p class="matchscore">Respostas reveladas: <b id="revealCount">' + rs.count + ' de ' + s.cartas.length + '</b></p>';
        s.cartas.forEach(function(c, ci){
          var stage = rs.stage[ci] || 0;
          var cls = "revealcard" + (stage === 1 ? " open" : "") + (stage === 2 ? " done" : "");
          var inner;
          if(stage === 0){ inner = '<p class="rlabel">CARTA ' + (ci + 1) + '</p><p class="rbody">Uma pergunta está escondida aqui.</p><p class="rhint">Toque para ver a pergunta</p>'; }
          else if(stage === 1){ inner = '<p class="rlabel">PERGUNTA</p><p class="rbody">' + c.p + '</p><p class="rhint">Pensou? Toque de novo para revelar a resposta</p>'; }
          else { inner = '<p class="rlabel">RESPOSTA</p><p class="rbody">' + c.r + '</p>'; }
          h += '<button class="' + cls + '" type="button" data-card="' + ci + '">' + inner + '</button>';
        });
      } else if(s.tipo === "Linha do tempo"){
        var ts = state[idx] || (state[idx] = {open:{}, count:0});
        h = '<p class="kicker">' + s.kicker + '</p>';
        h += '<h2>' + s.titulo + '</h2>';
        h += '<p>' + s.intro + '</p>';
        h += '<p class="explorecount">Marcos abertos: <b id="tlCount">' + ts.count + ' de ' + s.marcos.length + '</b></p>';
        h += '<div class="timeline">';
        s.marcos.forEach(function(m, mi){
          var open = !!ts.open[mi];
          h += '<div class="tlitem"><button class="tlbtn' + (open ? ' open' : '') + '" type="button" data-tl="' + mi + '"><span class="tlyear">' + m.ano + '</span><span class="tltitle">' + m.titulo + '</span></button>'
            + '<div class="tlbody' + (open ? ' show' : '') + '" id="tlBody' + mi + '"><p>' + m.texto + '</p></div></div>';
        });
        h += '</div>';
      } else if(s.tipo === "Verdadeiro ou falso"){
        if(!state[idx]) state[idx] = {cur:0, score:0, answered:false, chosen:null, done:false};
        h += '<h2>' + s.titulo + '</h2>';
        h += '<p>' + s.intro + '</p>';
        h += '<div id="vfArea"></div>';
      } else if(s.tipo === "Comparador"){
        h = '<p class="kicker">' + s.kicker + '</p>';
        h += '<h2>' + s.titulo + '</h2>';
        h += '<p>' + s.intro + '</p>';
        h += '<div class="cmpbox" id="cmpBox">'
          + '<img src="' + getImgUrl(s.img) + '" alt="">'
          + '<img class="cmpafter" id="cmpTop" src="' + getImgUrl(s.img2) + '" alt="">'
          + '<span class="cmplabel l">' + s.rotuloL + '</span><span class="cmplabel r">' + s.rotuloR + '</span>'
          + '<div class="cmphandle" id="cmpHandle"></div>'
          + '</div>';
        h += '<input class="cmprange" id="cmpRange" type="range" min="0" max="100" value="50" aria-label="Arraste para comparar as duas escolas">';
      } else if(s.tipo === "Completar"){
        var cs = state[idx] || (state[idx] = {filled:0, used:{}});
        h += '<h2>' + s.titulo + '</h2>';
        h += '<p>' + s.intro + '</p>';
        var ft = '';
        s.partes.forEach(function(part, pi){
          ft += part;
          if(pi < s.respostas.length){
            var filled = cs.filled > pi;
            var isNext = cs.filled === pi;
            ft += '<span class="blank' + (filled ? '' : ' empty') + (isNext ? ' next' : '') + '" data-blank="' + pi + '">' + (filled ? s.respostas[pi] : '· · · · · ·') + '</span>';
          }
        });
        h += '<div class="filltext">' + ft + '</div>';
        h += '<div class="wordbank" id="wordBank">';
        s.banco.forEach(function(w, wi){
          h += '<button class="wordchip' + (cs.used[wi] ? ' used' : '') + '" type="button" data-word="' + wi + '">' + w + '</button>';
        });
        h += '</div>';
        h += '<div class="matchdone' + (cs.filled === s.respostas.length ? ' show' : '') + '" id="fillDone"><b>Frase completa!</b> ' + s.feedbackFinal + '</div>';
      } else if(s.tipo === "Karaokê"){
        h = '<p class="kicker">' + s.kicker + '</p>';
        h += '<h2>' + s.titulo + '</h2>';
        h += '<p class="karaoke" id="karaokeBox">';
        s.frases.forEach(function(f, fi){
          h += '<span class="sent" data-sent="' + fi + '">' + f + '</span> ';
        });
        h += '</p>';
        h += '<p class="explorehint">Toque no botão central do rodapé e acompanhe: cada frase acende na tela no ritmo da narração. Se quiser, toque numa frase para ouvir a partir dela.</p>';
      } else if(s.tipo === "Mapa mental"){
        var ms = state[idx] || (state[idx] = {open:{}, seen:{}, count:0});
        h = '<p class="kicker">' + s.kicker + '</p>';
        h += '<h2>' + s.titulo + '</h2>';
        h += '<p>' + s.intro + '</p>';
        h += '<p class="explorecount">Ramos abertos: <b id="mindCount">' + ms.count + ' de ' + s.ramos.length + '</b></p>';
        h += '<div class="mindcenter">' + s.centro + '</div>';
        s.ramos.forEach(function(r, ri){
          var open = !!ms.open[ri];
          h += '<div class="mindbranch"><button class="mindbtn' + (open ? ' open' : '') + '" type="button" data-mind="' + ri + '"><span>' + r.nome + '</span><span class="marr">' + (open ? '▾ aberto' : '▸ tocar') + '</span></button>'
            + '<div class="mindbody' + (open ? ' show' : '') + '" id="mindBody' + ri + '"><p>' + r.texto + '</p><div class="chips">' + r.chips.map(function(c){ return '<span class="chip">' + c + '</span>'; }).join('') + '</div></div></div>';
        });
      } else if(s.tipo === "Desafio"){
        if(!state[idx]) state[idx] = {q:0, pts:0, answered:false, chosen:null, finished:false};
        h = '<p class="kicker">' + s.kicker + '</p>';
        h += '<h2>' + s.titulo + '</h2>';
        h += '<p>' + s.intro + '</p>';
        h += '<div id="desafioArea"></div>';
      } else {
        h += '<h2>' + s.titulo + '</h2>' + s.corpo;
      }
      return iconize(h);
    }

    var karaIdx = -1;
    function karaFracs(s){
      var totalChars = 0;
      s.frases.forEach(function(f){ totalChars += f.length; });
      var acc = 0, fr = [];
      s.frases.forEach(function(f){
        fr.push([acc / totalChars, (acc + f.length) / totalChars]);
        acc += f.length;
      });
      return fr;
    }
    function karaSync(){
      var s = SLIDES[idx];
      if(!s || s.tipo !== "Karaokê" || !player.duration) return;
      var box = document.getElementById("karaokeBox");
      if(!box) return;
      var fr = karaFracs(s);
      var pos = player.currentTime / player.duration;
      var cur = 0;
      for(var i = 0; i < fr.length; i++){ if(pos >= fr[i][0]) cur = i; }
      if(cur === karaIdx) return;
      karaIdx = cur;
      var spans = box.querySelectorAll(".sent");
      spans.forEach(function(sp, si){
        sp.classList.toggle("on", si === cur);
        sp.classList.toggle("done", si < cur);
      });
      var el = spans[cur];
      if(el) el.scrollIntoView({behavior:"smooth", block:"nearest"});
    }
    function karaSeek(fi){
      var s = SLIDES[idx];
      if(!s || s.tipo !== "Karaokê" || !player.duration) return;
      var fr = karaFracs(s);
      player.currentTime = Math.max(0, fr[fi][0] * player.duration - 0.05);
      karaIdx = -1;
      karaSync();
      userStartedPlayback = true;
      tryPlay();
    }

    var BLOCKS = [[4,"Bloco 1 de 3 · O terreno da família"],[16,"Bloco 2 de 3 · Bigamia"],[28,"Bloco 3 de 3 · Prática e fixação"],[31,"Fechamento"]];
    function blockLabel(i){
      for(var b = 0; b < BLOCKS.length; b++){ if(i <= BLOCKS[b][0]) return BLOCKS[b][1]; }
      return "Fechamento";
    }

    function show(i, autoplay){
      idx = Math.max(0, Math.min(total - 1, i));
      var s = SLIDES[idx];
      karaIdx = -1;
      scrollArea.innerHTML = slideHTML(s);
      scrollArea.scrollTop = 0;
      scrollArea.classList.remove("enter");
      void scrollArea.offsetWidth;
      scrollArea.classList.add("enter");
      var h1El = document.querySelector("header h1");
      if(h1El) h1El.style.display = idx === 0 ? "none" : "";
      var seal = document.getElementById("blockSeal");
      if(seal) seal.textContent = blockLabel(idx);
      etapaLabel.innerHTML = "Etapa <b>" + (idx + 1) + " de " + total + "</b> · " + s.tipo + (s.titulo ? ": " + s.titulo : "");
      progressFill.style.width = ((idx + 1) / total * 100) + "%";
      btnPrev.disabled = idx === 0;
      if(btnNextLabel){
        btnNextLabel.textContent = idx === total - 1 ? "Início" : "Próximo";
      }
      bindInteractions(s);
      stopAllAudio();
      if(aFill) aFill.style.width = "0%";
      if(aTimeCur) aTimeCur.textContent = "0:00";
      if(aTimeTotal) aTimeTotal.textContent = "0:00";
      if(aTime) aTime.textContent = "0:00 / 0:00";
      player.src = audioSrc(idx);
      player.load();
      if(autoplay && userStartedPlayback){
        tryPlay();
      }
    }

    btnPrev.addEventListener("click", function(ev){
      ev.stopPropagation();
      show(idx - 1, true);
    });
    btnNext.addEventListener("click", function(ev){
      ev.stopPropagation();
      if(idx === total - 1){ show(0, false); } else { show(idx + 1, true); }
    });
    document.addEventListener("keydown", function(ev){
      if(ev.target && (ev.target.tagName === "INPUT" || ev.target.tagName === "TEXTAREA")) return;
      if(ev.key === "ArrowRight"){ btnNext.click(); }
      else if(ev.key === "ArrowLeft"){ btnPrev.click(); }
      else if(ev.key === " "){
        ev.preventDefault();
        togglePlay();
      }
    });

    var tx = null, ty = null;
    var phone = document.getElementById("phone");
    phone.addEventListener("touchstart", function(ev){
      if(ev.target.closest("button") || ev.target.closest("input") || ev.target.closest(".atrack") || ev.target.closest(".vfcard") || ev.target.closest(".cmpbox")) return;
      tx = ev.touches[0].clientX; ty = ev.touches[0].clientY;
    }, {passive:true});
    phone.addEventListener("touchend", function(ev){
      if(tx === null) return;
      var dx = ev.changedTouches[0].clientX - tx;
      var dy = ev.changedTouches[0].clientY - ty;
      if(Math.abs(dx) > 64 && Math.abs(dx) > Math.abs(dy) * 1.7){
        if(dx < 0){ btnNext.click(); } else { btnPrev.click(); }
      }
      tx = null; ty = null;
    }, {passive:true});

    function bindInteractions(s){
      if(s.tipo === "Questão" || s.tipo === "Questão de banca"){
        var answered = state[idx] && state[idx].answered;
        var opts = scrollArea.querySelectorAll(".opt");
        var fb = document.getElementById("feedback");
        function paint(chosen){
          opts.forEach(function(o){
            var oi = parseInt(o.getAttribute("data-opt"), 10);
            o.disabled = true;
            if(oi === s.certa) o.classList.add("correct");
            else if(oi === chosen) o.classList.add("wrong");
          });
          fb.className = "feedback show " + (chosen === s.certa ? "good" : "bad");
          fb.innerHTML = "<b>" + (chosen === s.certa ? "Resposta certa!" : "Não foi dessa vez.") + "</b>" + s.feedback;
        }
        if(answered){ paint(state[idx].chosen); }
        opts.forEach(function(o){
          o.addEventListener("click", function(){
            if(state[idx] && state[idx].answered) return;
            var oi = parseInt(o.getAttribute("data-opt"), 10);
            state[idx] = {answered:true, chosen:oi};
            paint(oi);
          });
        });
      } else if(s.tipo === "Flashcard"){
        var card = document.getElementById("flashCard");
        if(card){
          card.addEventListener("click", function(){ card.classList.toggle("flipped"); });
        }
      } else if(s.tipo === "Ligar termos"){
        var st = state[idx];
        var terms = scrollArea.querySelectorAll(".term");
        var defs = scrollArea.querySelectorAll(".def");
        function select(el, group){
          if(el.classList.contains("done")) return;
          var groupBtns = group === "t" ? terms : defs;
          groupBtns.forEach(function(b){ b.classList.remove("sel"); });
          el.classList.add("sel");
          if(group === "t") st.selT = parseInt(el.getAttribute("data-term"), 10);
          else st.selD = parseInt(el.getAttribute("data-def"), 10);
          checkMatch();
        }
        function checkMatch(){
          if(st.selT === null || st.selT === undefined || st.selD === null || st.selD === undefined) return;
          var tBtn = scrollArea.querySelector('.term[data-term="' + st.selT + '"]');
          var dBtn = scrollArea.querySelector('.def[data-def="' + st.selD + '"]');
          if(st.selT === st.selD){
            st.done[st.selT] = true;
            st.count++;
            tBtn.classList.add("done"); dBtn.classList.add("done");
            tBtn.classList.remove("sel"); dBtn.classList.remove("sel");
            var mc = document.getElementById("matchCount");
            if(mc) mc.textContent = st.count + " de " + s.pares.length;
            if(st.count === s.pares.length){
              var md = document.getElementById("matchDone");
              if(md) md.classList.add("show");
            }
          } else {
            [tBtn, dBtn].forEach(function(b){
              b.classList.add("shake");
              setTimeout(function(){ b.classList.remove("shake", "sel"); }, 380);
            });
          }
          st.selT = null; st.selD = null;
        }
        terms.forEach(function(b){ b.addEventListener("click", function(){ select(b, "t"); }); });
        defs.forEach(function(b){ b.addEventListener("click", function(){ select(b, "d"); }); });
      } else if(s.tipo === "Explorar"){
        var es = state[idx];
        var hots = scrollArea.querySelectorAll(".hotspot");
        hots.forEach(function(b){
          b.addEventListener("click", function(){
            var pi = parseInt(b.getAttribute("data-hot"), 10);
            if(!es.seen[pi]){ es.seen[pi] = true; es.count++; }
            es.cur = pi;
            var ec = document.getElementById("exploreCount");
            if(ec) ec.textContent = es.count + " de " + s.pontos.length;
            var panel = document.getElementById("hotPanel");
            if(panel) panel.innerHTML = hotPanelHTML(s, es);
            hots.forEach(function(o){
              var oi = parseInt(o.getAttribute("data-hot"), 10);
              var isCur = oi === pi;
              var isSeen = !!es.seen[oi] && !isCur;
              o.classList.toggle("active", isCur);
              o.classList.toggle("seen", isSeen);
              o.textContent = isSeen ? "✓" : (oi + 1);
            });
            if(panel) panel.scrollIntoView({behavior:"smooth", block:"nearest"});
          });
        });
      } else if(s.tipo === "Toque e revele"){
        var rs = state[idx];
        var cards = scrollArea.querySelectorAll(".revealcard");
        cards.forEach(function(card){
          card.addEventListener("click", function(){
            var ci = parseInt(card.getAttribute("data-card"), 10);
            var stage = rs.stage[ci] || 0;
            if(stage >= 2) return;
            stage++;
            rs.stage[ci] = stage;
            var c = s.cartas[ci];
            if(stage === 2){
              rs.count++;
              var rc = document.getElementById("revealCount");
              if(rc) rc.textContent = rs.count + " de " + s.cartas.length;
              card.classList.remove("open");
              card.classList.add("done");
              card.innerHTML = '<p class="rlabel">RESPOSTA</p><p class="rbody">' + c.r + '</p>';
            } else {
              card.classList.add("open");
              card.innerHTML = '<p class="rlabel">PERGUNTA</p><p class="rbody">' + c.p + '</p><p class="rhint">Pensou? Toque de novo para revelar a resposta</p>';
            }
          });
        });
      } else if(s.tipo === "Linha do tempo"){
        var ts = state[idx];
        scrollArea.querySelectorAll(".tlbtn").forEach(function(b){
          b.addEventListener("click", function(){
            var mi = parseInt(b.getAttribute("data-tl"), 10);
            var body = document.getElementById("tlBody" + mi);
            var opening = !body.classList.contains("show");
            body.classList.toggle("show", opening);
            b.classList.toggle("open", opening);
            ts.open[mi] = opening;
            if(opening && !b.getAttribute("data-counted")){
              b.setAttribute("data-counted", "1");
              ts.count++;
              var tc = document.getElementById("tlCount");
              if(tc) tc.textContent = ts.count + " de " + s.marcos.length;
            }
          });
        });
      } else if(s.tipo === "Verdadeiro ou falso"){
        var vst = state[idx];
        var vfArea = document.getElementById("vfArea");
        function renderVF(){
          if(vst.done){
            vfArea.innerHTML = '<div class="finalscore"><p>Você acertou</p><p class="big">' + vst.score + ' de ' + s.afirmacoes.length + '</p><p>' + (vst.score === s.afirmacoes.length ? "Perfeito! Nenhuma pegadinha te derrubou." : vst.score >= 3 ? "Muito bem! O seu raciocínio está ficando afiado." : "Bom treino! Volte às cartas com calma depois de rever as explicações das etapas.") + '</p></div>';
            return;
          }
          var a = s.afirmacoes[vst.cur];
          var h = '<p class="matchscore">Carta <b>' + (vst.cur + 1) + ' de ' + s.afirmacoes.length + '</b> · Acertos: <b>' + vst.score + '</b></p>';
          h += '<div class="vfstage"><div class="vfcard" id="vfCard"><span class="vfstamp f" id="stampF">FALSO</span><span class="vfstamp v" id="stampV">VERDADEIRO</span><p class="vflabel">AFIRMAÇÃO</p><p class="vftext">' + a.t + '</p></div></div>';
          if(!vst.answered){
            h += '<div class="vfbtns"><button class="vfbtn f" type="button" id="vfFalse">← Falso</button><button class="vfbtn v" type="button" id="vfTrue">Verdadeiro →</button></div>';
            h += '<p class="explorehint" style="margin-top:10px">Você também pode arrastar a carta para o lado da sua resposta.</p>';
          } else {
            h += '<div class="feedback show ' + (vst.chosen === a.v ? 'good' : 'bad') + '"><b>' + (vst.chosen === a.v ? "Acertou! " : "Não foi dessa vez. ") + (a.v ? "É verdadeira." : "É falsa.") + '</b>' + a.exp + '</div>';
            h += '<button class="againbtn" type="button" id="vfNext" style="width:100%">' + (vst.cur === s.afirmacoes.length - 1 ? "Ver o resultado" : "Próxima carta →") + '</button>';
          }
          vfArea.innerHTML = h;
          bindVFCard();
        }
        function answerVF(choice){
          if(vst.answered) return;
          var a = s.afirmacoes[vst.cur];
          vst.answered = true;
          vst.chosen = choice;
          if(choice === a.v) vst.score++;
          renderVF();
        }
        function bindVFCard(){
          var card = document.getElementById("vfCard");
          var bF = document.getElementById("vfFalse");
          var bT = document.getElementById("vfTrue");
          var bN = document.getElementById("vfNext");
          if(bF) bF.addEventListener("click", function(){ answerVF(false); });
          if(bT) bT.addEventListener("click", function(){ answerVF(true); });
          if(bN) bN.addEventListener("click", function(){
            if(vst.cur === s.afirmacoes.length - 1){ vst.done = true; }
            else { vst.cur++; vst.answered = false; vst.chosen = null; }
            renderVF();
          });
          if(!card || vst.answered) return;
          card.addEventListener("touchstart", function(ev){ ev.stopPropagation(); }, {passive:true});
          card.addEventListener("touchend", function(ev){ ev.stopPropagation(); }, {passive:true});
          var startX = null, dx = 0;
          var stampF = document.getElementById("stampF");
          var stampV = document.getElementById("stampV");
          card.addEventListener("pointerdown", function(ev){
            startX = ev.clientX; dx = 0;
            try{ card.setPointerCapture(ev.pointerId); }catch(e){}
          });
          card.addEventListener("pointermove", function(ev){
            if(startX === null) return;
            dx = ev.clientX - startX;
            card.style.transform = "translateX(" + dx + "px) rotate(" + (dx / 22) + "deg)";
            if(stampV) stampV.style.opacity = dx > 12 ? Math.min(1, dx / 80) : 0;
            if(stampF) stampF.style.opacity = dx < -12 ? Math.min(1, -dx / 80) : 0;
          });
          card.addEventListener("pointerup", function(){
            if(startX === null) return;
            var finalDx = dx;
            startX = null;
            card.style.transform = "";
            if(stampV) stampV.style.opacity = 0;
            if(stampF) stampF.style.opacity = 0;
            if(finalDx > 70) answerVF(true);
            else if(finalDx < -70) answerVF(false);
          });
          card.addEventListener("pointercancel", function(){
            startX = null;
            card.style.transform = "";
          });
        }
        renderVF();
      } else if(s.tipo === "Comparador"){
        var top = document.getElementById("cmpTop");
        var handle = document.getElementById("cmpHandle");
        var range = document.getElementById("cmpRange");
        var box = document.getElementById("cmpBox");
        function setCmp(v){
          v = Math.max(0, Math.min(100, v));
          top.style.clipPath = "inset(0 0 0 " + v + "%)";
          handle.style.left = v + "%";
          range.value = v;
        }
        range.addEventListener("input", function(){ setCmp(parseFloat(range.value)); });
        range.addEventListener("touchstart", function(ev){ ev.stopPropagation(); }, {passive:true});
        range.addEventListener("touchend", function(ev){ ev.stopPropagation(); }, {passive:true});
        box.addEventListener("touchstart", function(ev){ ev.stopPropagation(); }, {passive:true});
        box.addEventListener("touchend", function(ev){ ev.stopPropagation(); }, {passive:true});
        var cmpDrag = false;
        function cmpFromEvent(ev){
          var r = box.getBoundingClientRect();
          setCmp((ev.clientX - r.left) / r.width * 100);
        }
        box.addEventListener("pointerdown", function(ev){ cmpDrag = true; try{ box.setPointerCapture(ev.pointerId); }catch(e){} cmpFromEvent(ev); });
        box.addEventListener("pointermove", function(ev){ if(cmpDrag) cmpFromEvent(ev); });
        box.addEventListener("pointerup", function(){ cmpDrag = false; });
        box.addEventListener("pointercancel", function(){ cmpDrag = false; });
        setCmp(50);
      } else if(s.tipo === "Completar"){
        var cs2 = state[idx];
        scrollArea.querySelectorAll(".wordchip").forEach(function(chip){
          chip.addEventListener("click", function(){
            var wi = parseInt(chip.getAttribute("data-word"), 10);
            if(cs2.used[wi] || cs2.filled >= s.respostas.length) return;
            if(s.banco[wi] === s.respostas[cs2.filled]){
              cs2.used[wi] = true;
              chip.classList.add("used");
              var blank = scrollArea.querySelector('.blank[data-blank="' + cs2.filled + '"]');
              if(blank){
                blank.textContent = s.respostas[cs2.filled];
                blank.classList.remove("empty", "next");
              }
              cs2.filled++;
              var nb = scrollArea.querySelector('.blank[data-blank="' + cs2.filled + '"]');
              if(nb) nb.classList.add("next");
              if(cs2.filled === s.respostas.length){
                var fd = document.getElementById("fillDone");
                if(fd) fd.classList.add("show");
              }
            } else {
              chip.classList.add("shake");
              setTimeout(function(){ chip.classList.remove("shake"); }, 380);
            }
          });
        });
      } else if(s.tipo === "Karaokê"){
        var kbox = document.getElementById("karaokeBox");
        if(kbox){
          kbox.querySelectorAll(".sent").forEach(function(sp){
            sp.addEventListener("click", function(){
              karaSeek(parseInt(sp.getAttribute("data-sent"), 10));
            });
          });
        }
      } else if(s.tipo === "Mapa mental"){
        var ms = state[idx];
        scrollArea.querySelectorAll(".mindbtn").forEach(function(b){
          b.addEventListener("click", function(){
            var ri = parseInt(b.getAttribute("data-mind"), 10);
            var body = document.getElementById("mindBody" + ri);
            var opening = !body.classList.contains("show");
            body.classList.toggle("show", opening);
            b.classList.toggle("open", opening);
            ms.open[ri] = opening;
            b.querySelector(".marr").textContent = opening ? "▾ aberto" : "▸ tocar";
            if(opening && !ms.seen[ri]){
              ms.seen[ri] = true; ms.count++;
              var mc = document.getElementById("mindCount");
              if(mc) mc.textContent = ms.count + " de " + s.ramos.length;
            }
          });
        });
      } else if(s.tipo === "Desafio"){
        var dst = state[idx];
        var dArea = document.getElementById("desafioArea");
        var dLetters = ["A","B","C","D","E"];
        function renderDesafio(){
          if(dst.finished){
            var msg = dst.pts >= 500 ? "Pontuação máxima! Você dominou esta aula de ponta a ponta." : dst.pts >= 300 ? "Muito bem! O raciocínio da bigamia já está na sua mão." : "Bom começo! Refaça as questões e os flashcards da aula e tente de novo: o placar sobe rápido.";
            dArea.innerHTML = '<div class="finalscore"><p>SEU PLACAR FINAL</p><p class="big">' + dst.pts + ' pontos</p><p>' + msg + '</p><button class="againbtn" type="button" id="desafioAgain">Jogar de novo</button></div>';
            document.getElementById("desafioAgain").addEventListener("click", function(){
              dst.q = 0; dst.pts = 0; dst.answered = false; dst.chosen = null; dst.finished = false;
              renderDesafio();
            });
            return;
          }
          var pq = s.perguntas[dst.q];
          var h = '<div class="scorebar"><span>Pergunta <b>' + (dst.q + 1) + ' de ' + s.perguntas.length + '</b></span><span class="pts">' + dst.pts + ' pts</span></div>';
          h += '<p class="qtext">' + pq.q + '</p>';
          pq.ops.forEach(function(op, oi){
            var cls = "opt";
            if(dst.answered){
              if(oi === pq.certa) cls += " correct";
              else if(oi === dst.chosen) cls += " wrong";
            }
            h += '<button class="' + cls + '" type="button" data-dopt="' + oi + '"' + (dst.answered ? ' disabled' : '') + '><span class="letter">' + dLetters[oi] + '</span><span>' + op + '</span></button>';
          });
          if(dst.answered){
            h += '<div class="feedback show ' + (dst.chosen === pq.certa ? 'good' : 'bad') + '"><b>' + (dst.chosen === pq.certa ? "Resposta certa! +100 pontos" : "Não foi dessa vez.") + '</b>' + pq.exp + '</div>';
            h += '<button class="againbtn" type="button" id="desafioNext" style="width:100%">' + (dst.q === s.perguntas.length - 1 ? "Ver meu placar" : "Próxima pergunta →") + '</button>';
          }
          dArea.innerHTML = h;
          dArea.querySelectorAll(".opt").forEach(function(o){
            o.addEventListener("click", function(){
              if(dst.answered) return;
              var oi = parseInt(o.getAttribute("data-dopt"), 10);
              dst.answered = true;
              dst.chosen = oi;
              if(oi === pq.certa) dst.pts += 100;
              renderDesafio();
            });
          });
          var nb2 = document.getElementById("desafioNext");
          if(nb2) nb2.addEventListener("click", function(){
            if(dst.q === s.perguntas.length - 1){ dst.finished = true; }
            else { dst.q++; dst.answered = false; dst.chosen = null; }
            renderDesafio();
          });
        }
        renderDesafio();
      }
    }

    bindAudio();
    show(0, false);
    </script>
  </body>
</html>
`;

export function buildAulaHTML(opts: AulaBuildOptions): string {
  const {
    materiaNome,
    aulaTitulo,
    slides,
    imagesBaseUrl = 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/aprender/direito-penal/crimes-contra-a-familia/aula-01/imagens/',
    audioBaseUrl = 'https://pub-0c1a0e4ebbdd44dfa883dd36c269f19f.r2.dev/aprender/direito-penal/crimes-contra-a-familia/aula-01/audio/',
  } = opts;

  // Adapt title and header
  let customPrefix = HTML_PREFIX
    .replace('<title>Crimes Contra a Família · Direito Penal</title>', '<title>' + escapeHtml(aulaTitulo) + ' · ' + escapeHtml(materiaNome) + '</title>')
    .replace('<span class="subject">DIREITO PENAL</span>', '<span class="subject">' + escapeHtml(materiaNome.toUpperCase()) + '</span>')
    .replace('<h1>Crimes Contra a Família</h1>', '<h1>' + escapeHtml(aulaTitulo) + '</h1>');

  // Replace image asset paths with imagesBaseUrl
  customPrefix = customPrefix.replace(/"assets\/img\/([a-zA-Z0-9_-]+)\.webp"/g, (_match, name) => {
    return JSON.stringify(imagesBaseUrl + name + '.webp');
  });

  // Adapt suffix audio path
  const customSuffix = HTML_SUFFIX.replace(
    'function audioSrc(i){ return "assets/audio/s" + pad(i+1) + ".mp3"; }',
    'function audioSrc(i){ return ' + JSON.stringify(audioBaseUrl) + ' + "s" + pad(i+1) + ".mp3"; }'
  );

  // Compose full standalone HTML
  return customPrefix + 'var SLIDES = ' + JSON.stringify(slides, null, 2) + ';\n\n' + customSuffix;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
