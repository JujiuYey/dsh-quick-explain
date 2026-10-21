/**
 * One stylesheet for the whole surface: hover, focus and motion need real CSS,
 * and every value comes from a DSH theme token so light/dark follow the app.
 */
export const CSS = `
.qe-panel{--qe-logo:#4d6bfe;--qe-logo-soft:#6c86ff;--qe-logo-strong:#3b58e0;
  position:fixed;z-index:92;width:min(400px,calc(100vw - 24px));max-height:min(560px,calc(100vh - 24px));
  display:flex;flex-direction:column;overflow:visible;border-radius:var(--dsw-radius-xl,16px);
  background:transparent;box-shadow:var(--dsw-elevation-panel,0 8px 32px rgba(0,0,0,.12));
  color:var(--dsw-alias-label-primary,#16161a);font-family:inherit;font-size:var(--dsh-content-font-size,14px);
  animation:qe-pop .14s cubic-bezier(.2,.8,.2,1)}
.qe-inner{flex:1 1 auto;min-height:0;display:flex;flex-direction:column;overflow:hidden;border-radius:inherit;
  background:var(--dsw-alias-bg-base,#fff)}
/* Comet border: one short lit segment travels the rounded edge; no static outline. */
.qe-edge{position:absolute;inset:-4px;width:calc(100% + 8px);height:calc(100% + 8px);pointer-events:none;overflow:visible}
.qe-comet{fill:none;stroke:url(#qe-comet-grad);stroke-width:2;stroke-linecap:round;stroke-dasharray:18 82;
  animation:qe-travel 4.2s linear infinite;
  filter:drop-shadow(0 0 6px color-mix(in srgb,#8b5cf6 65%,transparent))}
@keyframes qe-travel{from{stroke-dashoffset:0}to{stroke-dashoffset:-100}}
@keyframes qe-pop{from{transform:scale(.97) translateY(4px);opacity:0}to{transform:none;opacity:1}}
.qe-header{height:52px;flex:none;display:flex;align-items:center;gap:8px;padding:0 10px 0 16px}
.qe-title{font-size:14px;font-weight:600;line-height:20px}
.qe-sub{font-size:12px;line-height:16px;margin-top:1px;color:var(--dsw-alias-label-tertiary,#8a8b91)}
.qe-iconbtn{margin-left:auto;width:28px;height:28px;flex:none;padding:0;border:0;border-radius:var(--dsw-radius-sm,6px);
  background:transparent;color:var(--dsw-alias-label-secondary,#5f6066);display:grid;place-items:center;cursor:pointer}
.qe-iconbtn:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06))}
.qe-iconbtn:focus-visible,.qe-chip:focus-visible,.qe-send:focus-visible,.qe-retry:focus-visible{
  outline:calc(var(--dsw-focus-ring-width,1.5px)) solid var(--dsw-focus-ring-color,var(--dsw-alias-state-business-primary,#4d6bfe));
  outline-offset:1px}
.qe-body{flex:1 1 auto;min-height:0;overflow-y:auto;padding:12px 16px 16px;display:flex;flex-direction:column;gap:14px}
.qe-quote{flex:none;max-height:120px;overflow-y:auto;padding:8px 12px;border-radius:var(--dsw-radius-md,8px);
  background:var(--dsw-alias-bg-layer-1,#f6f6f8);color:var(--dsw-alias-label-secondary,#5f6066);
  font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));
  white-space:pre-wrap;word-break:break-word}
.qe-q{align-self:flex-end;max-width:88%;padding:8px 14px;border-radius:var(--dsw-radius-xl,16px);
  background:var(--dsw-specific-bubble,#e9f0ff);color:var(--dsw-alias-label-primary,#16161a);
  font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px));
  white-space:pre-wrap;word-break:break-word}
.qe-a{font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px));
  white-space:pre-wrap;word-break:break-word;color:var(--dsw-alias-label-primary,#16161a)}
.qe-code{font-family:var(--dsw-font-family-mono,ui-monospace,SFMono-Regular,Menlo,Consolas,monospace);font-size:.92em;
  padding:1px 4px;border-radius:4px;background:var(--dsw-alias-markdown-code-block,var(--dsw-alias-bg-layer-1,#f2f2f4))}
.qe-think{display:flex;align-items:center;gap:6px;color:var(--dsw-alias-label-tertiary,#8a8b91);
  font-size:var(--dsh-content-font-size-secondary,13px);line-height:20px}
.qe-dots{display:inline-flex;align-items:center;gap:3px}
.qe-dot{width:4px;height:4px;border-radius:50%;background:currentColor;animation:qe-bounce 1.1s infinite ease-in-out}
.qe-dot:nth-child(2){animation-delay:.14s}
.qe-dot:nth-child(3){animation-delay:.28s}
@keyframes qe-bounce{0%,80%,100%{opacity:.25;transform:translateY(0)}35%{opacity:1;transform:translateY(-3px)}}
.qe-error{display:flex;align-items:center;gap:10px;flex-wrap:wrap;color:var(--dsw-alias-state-error-primary,#c9433d);
  font-size:var(--dsh-content-font-size-secondary,13px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px))}
.qe-retry{height:26px;padding:0 10px;border:.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));
  border-radius:var(--dsw-radius-sm,6px);background:var(--dsw-alias-bg-layer-1,#f6f6f8);
  color:var(--dsw-alias-label-primary,#16161a);font:inherit;font-size:12px;cursor:pointer}
.qe-retry:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(38,49,72,.06))}
.qe-composer{flex:none;padding:10px 14px 14px}
.qe-inputwrap{display:flex;flex-direction:column;gap:2px;padding:8px 8px 8px 12px;overflow:hidden;
  background:var(--dsw-specific-input-major,#fff);border:.5px solid var(--dsw-alias-border-l2,rgba(0,0,0,.1));
  border-radius:var(--dsw-radius-xl,16px);box-shadow:var(--dsw-elevation-soft,0 4px 16px rgba(0,0,0,.04))}
.qe-input{flex:1 1 auto;min-height:24px;max-height:120px;padding:4px 0;resize:none;border:0;outline:none;
  background:transparent;color:var(--dsw-alias-label-primary,#16161a);font:inherit;
  font-size:var(--dsh-content-font-size,14px);line-height:calc(22px + var(--dsh-content-font-delta,0px))}
.qe-input::placeholder{color:var(--dsw-alias-label-tertiary,#8a8b91)}
.qe-sendrow{display:flex;justify-content:flex-end;align-items:center;gap:8px}
.qe-send{flex:none;width:32px;height:32px;padding:0;border:0;border-radius:50%;display:grid;place-items:center;
  background:linear-gradient(135deg,#ec4899 0%,#8b5cf6 33%,#4d6bfe 62%,#22d3ee 100%);
  color:#fff;cursor:pointer}
  .qe-send:hover:not(:disabled){filter:brightness(1.08)}
.qe-send:active:not(:disabled){filter:brightness(.96)}
.qe-send:disabled{background:var(--dsw-alias-button-primary-dimmed,#e6e9f2);color:var(--dsw-alias-label-dimmed,#9a9ba2);cursor:default}
.qe-footer{flex:none;padding:0 16px 12px;color:var(--dsw-alias-label-tertiary,#8a8b91);font-size:11.5px;line-height:16px}
.qe-chip{position:fixed;z-index:90;display:inline-flex;align-items:center;gap:5px;height:28px;padding:0 10px;
  border:0;border-radius:100px;background:var(--dsw-alias-button-floating-fill,var(--dsw-specific-input-major,#fff));
  color:var(--dsw-alias-label-primary,#16161a);box-shadow:var(--dsw-elevation-panel,0 3px 8px rgba(0,0,0,.08));
  font:inherit;font-size:12px;line-height:1;cursor:pointer;user-select:none}
.qe-chip:hover{background:var(--dsw-alias-button-floating-hover,var(--dsw-alias-bg-layer-2,#f2f2f4))}
.qe-chip svg{color:var(--qe-logo,#4d6bfe)}
@media (prefers-reduced-motion:reduce){.qe-panel{animation:none}.qe-dot{animation:none;opacity:.55}.qe-comet{animation:none;stroke-dashoffset:-40}}
`
