Object.assign(window, (function () {
  const { useState } = React;

  // ── Icons (inline SVG, matching Lucide) ────────────────────────────
  const I = {
    shield: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>),
    search: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>),
    clock: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>),
    dash: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>),
    card: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>),
    compass: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/></svg>),
    zap: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>),
    bell: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>),
    check: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||3} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M20 6 9 17l-5-5"/></svg>),
    alert: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>),
    brain: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/></svg>),
    arrow: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||2.5} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>),
    copy: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>),
    refresh: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>),
    wallet: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1"/><path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4"/></svg>),
    sun: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/></svg>),
    moon: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>),
    globe: (p) => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={p.sw||1.75} strokeLinecap="round" strokeLinejoin="round" {...p}><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>),
  };

  // ── Primitives ─────────────────────────────────────────────────────
  function Logo({ size="sm" }) {
    const S = size === "lg" ? { box: 44, icon: 20, text: 18, rad: 14 } : { box: 36, icon: 16, text: 13, rad: 12 };
    return (
      <div style={{display:"flex",alignItems:"center",gap:12}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"center",width:S.box,height:S.box,borderRadius:S.rad,background:"var(--primary-dim)",border:"1px solid var(--gold-ring)"}}>
          <div style={{width:S.icon,height:S.icon,color:"var(--primary)"}}><I.shield sw={2.5} style={{width:"100%",height:"100%"}}/></div>
        </div>
        <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:S.text,letterSpacing:"0.15em",color:"var(--foreground)"}}>
          SCORE<span style={{color:"var(--primary)"}}>CRIPTO</span>
        </div>
      </div>
    );
  }

  function Btn({ variant="primary", size="md", children, onClick, icon, disabled, style }) {
    const pads = size === "sm" ? "6px 12px" : size === "lg" ? "12px 22px" : "10px 18px";
    const fs = size === "sm" ? 12 : size === "lg" ? 15 : 14;
    const variants = {
      primary: { background:"var(--primary)", color:"var(--primary-foreground)", border:"none" },
      outline: { background:"transparent", color:"var(--foreground)", border:"1px solid var(--border)" },
      ghost:   { background:"transparent", color:"var(--muted-foreground)", border:"none" },
      tinted:  { background:"var(--primary-dim)", color:"var(--primary)", border:"1px solid var(--gold-ring)" },
      destructive: { background:"transparent", color:"var(--destructive)", border:"1px solid color-mix(in oklab,var(--destructive),transparent 70%)" },
    };
    return (
      <button onClick={onClick} disabled={disabled} style={{
        fontFamily:"var(--font-sans)", fontWeight:600, fontSize:fs,
        borderRadius:10, padding:pads, cursor:disabled?"not-allowed":"pointer",
        display:"inline-flex", alignItems:"center", gap:8, transition:"all .2s",
        opacity: disabled ? 0.5 : 1,
        ...variants[variant], ...style,
      }}>
        {icon && <span style={{width:16,height:16,display:"inline-flex"}}>{icon}</span>}
        {children}
      </button>
    );
  }

  function Badge({ children, variant="outline", style }) {
    const variants = {
      outline: { background:"transparent", color:"var(--muted-foreground)", border:"1px solid var(--border)" },
      secondary: { background:"var(--secondary)", color:"var(--secondary-foreground)", border:"1px solid var(--border)" },
      gold: { background:"var(--primary-dim)", color:"var(--primary)", border:"1px solid var(--gold-ring)" },
      purple: { background:"var(--accent-dim)", color:"var(--accent)", border:"1px solid color-mix(in oklab,var(--accent),transparent 70%)" },
    };
    return <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"3px 10px",borderRadius:999,fontSize:11,fontFamily:"var(--font-mono)",...variants[variant],...style}}>{children}</span>;
  }

  function StatusPill({ verdict, pulse=true }) {
    const cfg = {
      trusted: { bg:"oklch(0.69 0.19 162 / 10%)", fg:"oklch(0.69 0.19 162)", dot:"oklch(0.69 0.19 162)", label:"Confiável" },
      attention: { bg:"oklch(0.74 0.16 85 / 10%)", fg:"oklch(0.74 0.16 85)", dot:"oklch(0.74 0.16 85)", label:"Atenção" },
      risk: { bg:"oklch(0.63 0.24 28 / 10%)", fg:"oklch(0.63 0.24 28)", dot:"oklch(0.63 0.24 28)", label:"Risco Alto" },
    }[verdict];
    return (
      <span style={{display:"inline-flex",alignItems:"center",gap:6,padding:"5px 12px",background:cfg.bg,color:cfg.fg,borderRadius:999,fontSize:12,fontWeight:600}}>
        <span style={{width:6,height:6,borderRadius:999,background:cfg.dot,animation:pulse?"scDotPulse 2s ease-in-out infinite":""}}/>
        {cfg.label}
      </span>
    );
  }

  function ChainBlock({ chain, size="md" }) {
    const M = {
      ethereum:  { bg:"oklch(0.60 0.17 253 / 15%)", fg:"oklch(0.60 0.17 253)", label:"ETH" },
      bitcoin:   { bg:"oklch(0.74 0.16 85 / 15%)", fg:"oklch(0.74 0.16 85)", label:"BTC" },
      polygon:   { bg:"oklch(0.59 0.22 295 / 15%)", fg:"oklch(0.59 0.22 295)", label:"MATIC" },
      solana:    { bg:"oklch(0.69 0.19 162 / 15%)", fg:"oklch(0.69 0.19 162)", label:"SOL" },
      arbitrum:  { bg:"oklch(0.60 0.17 253 / 15%)", fg:"oklch(0.60 0.17 253)", label:"ARB" },
      optimism:  { bg:"oklch(0.63 0.24 28 / 15%)", fg:"oklch(0.63 0.24 28)", label:"OP" },
      avalanche: { bg:"oklch(0.63 0.24 28 / 15%)", fg:"oklch(0.63 0.24 28)", label:"AVAX" },
    }[chain] || { bg:"oklch(1 0 0 / 10%)", fg:"var(--muted-foreground)", label:chain.slice(0,4).toUpperCase() };
    const s = size === "sm" ? 28 : size === "lg" ? 40 : 32;
    const fs = size === "sm" ? 9 : size === "lg" ? 11 : 10;
    return <div style={{width:s,height:s,borderRadius:8,background:M.bg,color:M.fg,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-heading)",fontWeight:700,fontSize:fs,flexShrink:0}}>{M.label}</div>;
  }

  function ChainChip({ chain, label, active, onClick }) {
    return (
      <button onClick={onClick} style={{
        padding:"6px 10px", borderRadius:8, fontFamily:"var(--font-heading)", fontWeight:700, fontSize:11,
        letterSpacing:"0.1em", cursor:"pointer", transition:"all .2s",
        border: active ? "1px solid var(--gold-ring)" : "1px solid var(--border)",
        background: active ? "var(--primary-dim)" : "transparent",
        color: active ? "var(--primary)" : "var(--muted-foreground)",
        boxShadow: active ? "0 0 8px oklch(0.74 0.19 66 / 20%)" : "none",
      }}>{label}</button>
    );
  }

  function ScoreRing({ score, size=140, confidence }) {
    const stroke = 10;
    const r = (size - stroke - 8) / 2;
    const c = 2 * Math.PI * r;
    const off = c - (score/100) * c;
    const color = score >= 70 ? "oklch(0.74 0.19 66)" : score >= 40 ? "oklch(0.74 0.16 85)" : "oklch(0.63 0.24 28)";
    return (
      <div style={{position:"relative",width:size,height:size,display:"flex",alignItems:"center",justifyContent:"center"}}>
        <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="oklch(1 0 0 / 6%)" strokeWidth={stroke}/>
          <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={c} strokeDashoffset={off} style={{filter:`drop-shadow(0 0 8px ${color})`,transition:"stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)"}}/>
        </svg>
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
          <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:size*0.22,color,lineHeight:1}}>{score}</div>
          <div style={{fontFamily:"var(--font-heading)",fontSize:9,letterSpacing:"0.2em",color:"var(--muted-foreground)",textTransform:"uppercase",marginTop:4}}>Score</div>
          {confidence !== undefined && <div style={{fontSize:9,color:"var(--muted-foreground)",marginTop:1}}>{Math.round(confidence*100)}% conf.</div>}
        </div>
      </div>
    );
  }

  function Card({ children, variant="base", style, onClick }) {
    const variants = {
      base: { background:"var(--card)", border:"1px solid var(--border)" },
      glass: { background:"color-mix(in oklab, var(--card) 80%, transparent)", border:"1px solid var(--border)", backdropFilter:"blur(24px)" },
      glow: { background:"color-mix(in oklab, var(--card) 80%, transparent)", border:"1px solid var(--border)", backdropFilter:"blur(24px)", boxShadow:"0 0 0 1px oklch(0.74 0.19 66 / 15%), 0 0 20px -4px oklch(0.74 0.19 66 / 12%), inset 0 1px 0 oklch(1 0 0 / 4%)" },
      dim: { background:"color-mix(in oklab, var(--card) 20%, transparent)", border:"1px solid color-mix(in oklab, var(--border) 30%, transparent)" },
    };
    return <div onClick={onClick} style={{borderRadius:20,padding:24,...variants[variant],...style}}>{children}</div>;
  }

  function Eyebrow({ children, color, style }) {
    return <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:10,letterSpacing:"0.3em",color:color||"var(--muted-foreground)",textTransform:"uppercase",...style}}>{children}</div>;
  }

  function SidebarNav({ active, onNav, theme, onToggleTheme }) {
    const items = [
      { id:"dashboard", label:"Dashboard", icon:<I.dash/> },
      { id:"analyze", label:"Nova análise", icon:<I.search/> },
      { id:"history", label:"Histórico", icon:<I.clock/> },
      { id:"search", label:"Explorar", icon:<I.compass/> },
    ];
    const account = [{ id:"billing", label:"Planos & Billing", icon:<I.card/> }];
    const NavItem = ({it}) => (
      <button onClick={() => onNav(it.id)} style={{
        display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:12,
        fontFamily:"var(--font-sans)",fontSize:13,fontWeight:500,textAlign:"left",width:"100%",
        cursor:"pointer",transition:"all .2s",
        border: active===it.id ? "1px solid color-mix(in oklab,var(--primary),transparent 80%)" : "1px solid transparent",
        background: active===it.id ? "color-mix(in oklab,var(--primary),transparent 92%)" : "transparent",
        color: active===it.id ? "var(--primary)" : "var(--muted-foreground)",
      }}>
        <span style={{width:16,height:16,display:"inline-flex",flexShrink:0,color: active===it.id ? "var(--primary)":"currentColor"}}>{React.cloneElement(it.icon,{sw: active===it.id?2.5:1.75})}</span>
        {it.label}
      </button>
    );
    return (
      <aside style={{width:240,background:"var(--sidebar)",borderRight:"1px solid var(--border)",padding:"24px 16px",display:"flex",flexDirection:"column",flexShrink:0}}>
        <div style={{marginBottom:32}}><Logo/></div>

        <Eyebrow style={{fontSize:10,padding:"0 12px",marginBottom:8}}>Principal</Eyebrow>
        <div style={{display:"flex",flexDirection:"column",gap:2,marginBottom:24}}>
          {items.map(it => <NavItem key={it.id} it={it}/>)}
        </div>

        <Eyebrow style={{fontSize:10,padding:"0 12px",marginBottom:8}}>Conta</Eyebrow>
        <div style={{display:"flex",flexDirection:"column",gap:2}}>
          {account.map(it => <NavItem key={it.id} it={it}/>)}
        </div>

        <div style={{marginTop:"auto",paddingTop:16,borderTop:"1px solid var(--border)"}}>
          <button onClick={onToggleTheme} style={{
            display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:12,width:"100%",
            border:"none",background:"transparent",cursor:"pointer",color:"var(--muted-foreground)",fontSize:12,
          }}>
            <span style={{width:16,height:16,display:"inline-flex"}}>{theme==="dark"?<I.sun/>:<I.moon/>}</span>
            {theme === "dark" ? "Light theme" : "Dark theme"}
          </button>
          <div style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:12}}>
            <div style={{width:32,height:32,borderRadius:10,background:"var(--primary-dim)",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"var(--font-heading)",fontSize:11,fontWeight:700}}>MV</div>
            <div style={{minWidth:0,flex:1}}>
              <div style={{fontSize:13,fontWeight:500,color:"var(--foreground)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>Matteus V.</div>
              <div style={{fontSize:11,color:"var(--muted-foreground)",display:"flex",alignItems:"center",gap:6}}>
                <span style={{width:6,height:6,borderRadius:999,background:"var(--accent)"}}/>Plano Pro
              </div>
            </div>
          </div>
        </div>
      </aside>
    );
  }

  function Topbar({ title, subtitle, showUpgrade }) {
    return (
      <header style={{height:64,borderBottom:"1px solid var(--border)",background:"color-mix(in oklab, var(--background) 80%, transparent)",backdropFilter:"blur(24px)",padding:"0 24px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:10}}>
        <div>
          <div style={{fontFamily:"var(--font-heading)",fontSize:15,fontWeight:700,letterSpacing:"0.1em",color:"var(--foreground)"}}>{title}</div>
          {subtitle && <div style={{fontSize:11,color:"var(--muted-foreground)",marginTop:2}}>{subtitle}</div>}
        </div>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <button style={{display:"flex",alignItems:"center",gap:6,background:"transparent",border:"1px solid var(--border)",color:"var(--muted-foreground)",borderRadius:10,padding:"6px 10px",fontSize:11,cursor:"pointer"}}>
            <span style={{width:14,height:14}}><I.globe/></span>PT-BR
          </button>
          {showUpgrade && <Btn variant="tinted" size="sm" icon={<I.zap sw={2.5}/>}>Upgrade Pro</Btn>}
          <button style={{position:"relative",width:36,height:36,borderRadius:10,border:"1px solid var(--border)",background:"transparent",color:"var(--muted-foreground)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
            <span style={{width:16,height:16}}><I.bell/></span>
            <span style={{position:"absolute",top:-2,right:-2,width:14,height:14,borderRadius:999,background:"var(--primary)",color:"var(--primary-foreground)",fontSize:8,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center"}}>2</span>
          </button>
        </div>
      </header>
    );
  }

  return { I, Logo, Btn, Badge, StatusPill, ChainBlock, ChainChip, ScoreRing, Card, Eyebrow, SidebarNav, Topbar };
})());
