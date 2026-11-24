import type { AppConfig } from "@forjapp/shared";

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** Pick black or white text for a given background color. */
export function contrastOn(hex: string): string {
  const [r, g, b] = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#111827" : "#FFFFFF";
}

const FONT_STACK: Record<string, string> = {
  Inter: "Inter, system-ui, sans-serif",
  Roboto: "Roboto, system-ui, sans-serif",
  Poppins: "Poppins, system-ui, sans-serif",
  Merriweather: "Merriweather, Georgia, serif",
  Montserrat: "Montserrat, system-ui, sans-serif",
  Lora: "Lora, Georgia, serif",
  Nunito: "Nunito, system-ui, sans-serif",
  "Playfair Display": "'Playfair Display', Georgia, serif",
};

export function themeCss(cfg: AppConfig): string {
  const t = cfg.theme;
  return `:root{--p:${t.primary};--on-p:${contrastOn(t.primary)};--s:${t.secondary};--bg:${t.background};--sf:${t.surface};--tx:${t.text};--r:${t.radius}px;--font:${FONT_STACK[t.font] ?? FONT_STACK.Inter}}`;
}

export const BASE_CSS = `
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent}
html,body{margin:0;height:100%;background:var(--bg);color:var(--tx);font-family:var(--font);font-size:15px;line-height:1.5}
#app{display:flex;flex-direction:column;height:100%;overflow:hidden}
.topbar{display:flex;align-items:center;gap:10px;padding:12px 14px;background:var(--p);color:var(--on-p);min-height:56px;flex-shrink:0;box-shadow:0 1px 4px rgba(0,0,0,.15)}
.topbar h1{font-size:18px;margin:0;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.topbar img.logo{height:30px;width:30px;object-fit:contain;border-radius:8px}
.iconbtn{background:none;border:0;color:inherit;padding:6px;border-radius:50%;display:flex;cursor:pointer}
.iconbtn:active{background:rgba(255,255,255,.2)}
main{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch}
main.full{display:flex;flex-direction:column}
.page{padding:14px;display:flex;flex-direction:column;gap:14px;animation:fade .25s ease}
.page.flush{padding:0;flex:1}
@keyframes fade{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}
.tabbar{display:flex;background:var(--sf);border-top:1px solid rgba(127,127,127,.18);flex-shrink:0;padding-bottom:env(safe-area-inset-bottom)}
.tabbar button{flex:1;background:none;border:0;padding:8px 2px 6px;display:flex;flex-direction:column;align-items:center;gap:2px;color:var(--tx);opacity:.55;font:inherit;font-size:11px;cursor:pointer}
.tabbar button.on{color:var(--p);opacity:1;font-weight:600}
.drawer-bg{position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:20;animation:fadein .2s}
.drawer{position:fixed;top:0;bottom:0;left:0;width:78%;max-width:300px;background:var(--sf);z-index:21;display:flex;flex-direction:column;animation:slide .22s ease}
.drawer header{background:var(--p);color:var(--on-p);padding:28px 18px 18px;font-weight:700;font-size:18px;display:flex;gap:10px;align-items:center}
.drawer button{display:flex;gap:14px;align-items:center;padding:14px 18px;background:none;border:0;color:var(--tx);font:inherit;text-align:left;cursor:pointer}
.drawer button.on{color:var(--p);font-weight:600;background:rgba(127,127,127,.08)}
@keyframes slide{from{transform:translateX(-100%)}to{transform:none}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
h2.hd{margin:0;line-height:1.25}
.hd.lg{font-size:26px}.hd.md{font-size:20px}.hd.sm{font-size:16px}
p.tx{margin:0;white-space:pre-wrap}
.card{background:var(--sf);border-radius:var(--r);box-shadow:0 1px 3px rgba(0,0,0,.08);overflow:hidden}
.img{width:100%;display:block;object-fit:cover;background:rgba(127,127,127,.15)}
.rounded{border-radius:var(--r)}
.caption{font-size:13px;opacity:.7;margin-top:6px}
.btn{display:inline-flex;justify-content:center;align-items:center;gap:8px;border-radius:var(--r);padding:12px 18px;font:inherit;font-weight:600;cursor:pointer;border:2px solid var(--p);width:100%}
.btn.filled{background:var(--p);color:var(--on-p)}
.btn.outline{background:transparent;color:var(--p)}
.btn:active{transform:scale(.98)}
.btn[disabled]{opacity:.6}
a.lnk{color:var(--p);font-weight:600;display:inline-flex;gap:6px;align-items:center;text-decoration:none;cursor:pointer}
.hero{position:relative;border-radius:var(--r);overflow:hidden;min-height:190px;display:flex;align-items:flex-end;background:linear-gradient(135deg,var(--p),var(--s));color:#fff}
.hero img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.hero .ov{position:relative;padding:18px;width:100%;background:linear-gradient(transparent,rgba(0,0,0,.65));display:flex;flex-direction:column;gap:8px}
.hero h2{margin:0;font-size:24px}.hero p{margin:0;opacity:.9}
.hero .btn{width:auto;align-self:flex-start;background:var(--s);border-color:var(--s);color:${"#fff"}}
.cards.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
.cards.list{display:flex;flex-direction:column;gap:12px}
.cards.list .card{display:flex}
.cards.list .card .img{width:96px;height:96px;flex-shrink:0}
.cards.grid .card .img{height:110px}
.card .body{padding:10px 12px;display:flex;flex-direction:column;gap:3px;min-width:0;flex:1}
.card .t{font-weight:600}.card .d{font-size:13px;opacity:.7}
.card .pr{color:var(--p);font-weight:700;font-size:14px}
.gal{display:grid;gap:6px}
.gal img{width:100%;aspect-ratio:1;object-fit:cover;border-radius:calc(var(--r)/2);cursor:pointer}
.lightbox{position:fixed;inset:0;background:rgba(0,0,0,.92);z-index:30;display:flex;align-items:center;justify-content:center;flex-direction:column;color:#fff}
.lightbox img{max-width:100%;max-height:80%}
.lightbox .iconbtn{position:absolute;top:12px;right:12px}
.vid{position:relative;width:100%;aspect-ratio:16/9;background:#000;border-radius:var(--r);overflow:hidden}
.vid iframe,.vid video{position:absolute;inset:0;width:100%;height:100%;border:0}
.radio{display:flex;flex-direction:column;align-items:center;gap:14px;padding:26px 16px;text-align:center}
.radio img{width:200px;height:200px;border-radius:24px;object-fit:cover;box-shadow:0 10px 30px rgba(0,0,0,.3)}
.radio .play{width:78px;height:78px;border-radius:50%;border:0;background:var(--p);color:var(--on-p);display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 6px 20px rgba(0,0,0,.25)}
.radio .st{font-size:22px;font-weight:700}.radio .sl{opacity:.7}
.eq{display:flex;gap:3px;height:18px;align-items:flex-end}.eq i{width:4px;background:var(--p);animation:eq 1s infinite ease-in-out}
.eq i:nth-child(2){animation-delay:.2s}.eq i:nth-child(3){animation-delay:.4s}.eq i:nth-child(4){animation-delay:.6s}
@keyframes eq{0%,100%{height:4px}50%{height:18px}}
.track{display:flex;align-items:center;gap:12px;padding:10px;cursor:pointer}
.track img,.track .ph{width:48px;height:48px;border-radius:10px;object-fit:cover;background:rgba(127,127,127,.2);flex-shrink:0}
.track.on{background:rgba(127,127,127,.1)}
.rss-item{display:flex;gap:12px;padding:10px;cursor:pointer;align-items:flex-start}
.rss-item img{width:88px;height:66px;object-fit:cover;border-radius:10px;flex-shrink:0}
.rss-item .t{font-weight:600;font-size:14px;line-height:1.3}
.rss-item .m{font-size:12px;opacity:.6;margin-top:4px}
.fav{background:none;border:0;color:var(--p);cursor:pointer;padding:4px;flex-shrink:0}
.fav.on svg{fill:currentColor}
.article{display:flex;flex-direction:column;gap:12px}
.article h2{margin:0;font-size:21px;line-height:1.3}
.muted{opacity:.6;font-size:13px}
.center{text-align:center;padding:30px 10px;opacity:.7}
.spinner{width:28px;height:28px;border:3px solid rgba(127,127,127,.25);border-top-color:var(--p);border-radius:50%;animation:spin .8s linear infinite;margin:20px auto}
@keyframes spin{to{transform:rotate(360deg)}}
.web{width:100%;border:0;background:#fff;border-radius:var(--r)}
.page.flush .web{border-radius:0;flex:1;height:100%}
.webwrap{display:flex;flex-direction:column;gap:6px;flex:1}
form.frm{display:flex;flex-direction:column;gap:12px}
.frm label{display:flex;flex-direction:column;gap:5px;font-size:13px;font-weight:600}
.frm input,.frm textarea,.inp{font:inherit;padding:11px 12px;border-radius:calc(var(--r)*.7);border:1px solid rgba(127,127,127,.35);background:var(--sf);color:var(--tx);width:100%}
.frm input:focus,.frm textarea:focus,.inp:focus{outline:2px solid var(--p);border-color:transparent}
.msg{padding:12px;border-radius:var(--r);background:rgba(22,163,74,.12);color:#16a34a;font-weight:600}
.msg.err{background:rgba(220,38,38,.12);color:#dc2626}
.contact{display:flex;flex-direction:column}
.contact .row{display:flex;gap:14px;align-items:center;padding:14px;border-bottom:1px solid rgba(127,127,127,.15);cursor:pointer}
.contact .row:last-child{border-bottom:0}
.contact .ic{width:38px;height:38px;border-radius:50%;background:var(--p);color:var(--on-p);display:flex;align-items:center;justify-content:center;flex-shrink:0}
.mapf{width:100%;height:240px;border:0;border-radius:var(--r)}
.social{display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.social button{width:52px;height:52px;border-radius:50%;border:0;background:var(--p);color:var(--on-p);display:flex;align-items:center;justify-content:center;cursor:pointer}
hr.dv{border:0;border-top:1px solid rgba(127,127,127,.25);margin:0;width:100%}
.splash{position:fixed;inset:0;display:flex;align-items:center;justify-content:center;z-index:50;transition:opacity .4s}
.splash img{width:110px;height:110px;object-fit:contain;border-radius:24px}
.splash .nm{font-size:26px;font-weight:800}
.badge{position:fixed;bottom:70px;left:50%;transform:translateX(-50%);font-size:11px;opacity:.5;pointer-events:none}
[data-block-id].sel{outline:2px dashed var(--s);outline-offset:3px}
.preview [data-block-id]:hover{outline:1px dashed rgba(127,127,127,.6);outline-offset:3px}
`;
