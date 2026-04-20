Object.assign(window, (function () {
  const { useState, useEffect, useRef, useMemo } = React;
  const { I, Logo, Btn, Badge, StatusPill, ChainBlock, ChainChip, ScoreRing, Card, Eyebrow } = window;

  // ── Mock data ──────────────────────────────────────────────────────
  const MOCK_HISTORY = [
    { id:"1", chain:"ethereum", address:"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", label:"vitalik.eth", score:82, conf:94, date:"há 2 horas", verdict:"trusted", delta:+3, tag:"Contato frequente" },
    { id:"2", chain:"polygon",  address:"0x742d35Cc6634C0532925a3b844Bc9e7595f4e2bc", label:null, score:45, conf:78, date:"há 5 horas", verdict:"attention", delta:-8, tag:null },
    { id:"3", chain:"bitcoin",  address:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", label:"Cold wallet", score:68, conf:82, date:"ontem, 19:42", verdict:"attention", delta:+1, tag:"Pessoal" },
    { id:"4", chain:"solana",   address:"9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", label:null, score:22, conf:91, date:"há 2 dias", verdict:"risk", delta:-14, tag:"Flag: mixer" },
    { id:"5", chain:"arbitrum", address:"0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE", label:"Tesouraria DAO", score:74, conf:88, date:"há 3 dias", verdict:"trusted", delta:0, tag:null },
    { id:"6", chain:"ethereum", address:"0x00000000219ab540356cBB839Cbe05303d7705Fa", label:"Beacon Deposit", score:91, conf:97, date:"há 4 dias", verdict:"trusted", delta:+2, tag:"Contrato verificado" },
  ];

  const WATCHLIST = [
    { chain:"ethereum", address:"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", label:"vitalik.eth", score:82, prev:79 },
    { chain:"arbitrum", address:"0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE", label:"Tesouraria DAO", score:74, prev:74 },
    { chain:"bitcoin",  address:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", label:"Cold wallet", score:68, prev:67 },
    { chain:"solana",   address:"9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", label:"Conta secundária", score:22, prev:36 },
  ];

  const ALERTS = [
    { kind:"risk", title:"Queda de score detectada", body:"Conta secundária (SOL) caiu 14 pts em 48h após interação com mixer.", when:"há 3h" },
    { kind:"info", title:"Refresh em cache concluído", body:"3 carteiras no watchlist foram recalculadas automaticamente.", when:"há 6h" },
    { kind:"gold", title:"2 análises restantes", body:"Seu plano reseta em 14 dias. Faça upgrade para análises ilimitadas.", when:"hoje" },
  ];

  // ── Animated counter ───────────────────────────────────────────────
  function useCountUp(target, duration=1200) {
    const [v, setV] = useState(0);
    useEffect(() => {
      let raf, start;
      const step = (t) => {
        if (!start) start = t;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 4);
        setV(Math.round(target * eased));
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
      return () => cancelAnimationFrame(raf);
    }, [target]);
    return v;
  }

  // ── Sparkline ──────────────────────────────────────────────────────
  function Sparkline({ points, w=64, h=20, color="var(--primary)" }) {
    const min = Math.min(...points), max = Math.max(...points);
    const range = max - min || 1;
    const step = w / (points.length - 1);
    const path = points.map((p,i) => `${i===0?"M":"L"} ${i*step} ${h - ((p-min)/range)*h}`).join(" ");
    return (
      <svg width={w} height={h} style={{overflow:"visible"}}>
        <path d={path} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" style={{filter:`drop-shadow(0 0 4px ${color})`,opacity:.9}}/>
        <circle cx={(points.length-1)*step} cy={h - ((points[points.length-1]-min)/range)*h} r={2.5} fill={color}/>
      </svg>
    );
  }

  // ── Hero Analyze Bar (primary action) ──────────────────────────────
  function AnalyzeHero({ chain, setChain, addr, setAddr, onAnalyze, remaining }) {
    const CHAINS = [["ethereum","ETH"],["bitcoin","BTC"],["polygon","MATIC"],["solana","SOL"],["arbitrum","ARB"],["optimism","OP"]];
    return (
      <Card variant="glow" style={{padding:0, overflow:"hidden", position:"relative"}}>
        {/* aurora */}
        <div style={{position:"absolute",inset:0,background:"radial-gradient(60% 80% at 100% 0%, oklch(0.74 0.19 66 / 12%), transparent 60%), radial-gradient(50% 70% at 0% 100%, oklch(0.59 0.22 295 / 10%), transparent 60%)",pointerEvents:"none"}}/>
        <div style={{position:"relative",padding:"24px 28px"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:18}}>
            <div>
              <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:8}}>
                <Eyebrow style={{color:"var(--primary)"}}>ANÁLISE RÁPIDA</Eyebrow>
                <span style={{width:6,height:6,borderRadius:999,background:"var(--primary)",animation:"scDotPulse 2s ease-in-out infinite"}}/>
                <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>pipeline ativo · gpt-5 · &lt;3s</span>
              </div>
              <h2 style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:22,letterSpacing:"0.02em",margin:0}}>
                Cole um endereço e veja o score em segundos
              </h2>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <Badge variant="purple" style={{fontSize:10}}>pro</Badge>
              <span style={{fontSize:11,color:"var(--muted-foreground)"}}>{remaining} de 15 restantes</span>
            </div>
          </div>

          <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <div style={{position:"relative",flex:"1 1 320px",minWidth:260}}>
              <span style={{position:"absolute",left:14,top:"50%",transform:"translateY(-50%)",width:16,height:16,color:"color-mix(in oklab,var(--muted-foreground),transparent 30%)"}}><I.search sw={2}/></span>
              <input
                value={addr}
                onChange={e=>setAddr(e.target.value)}
                onKeyDown={e=>{if(e.key==="Enter") onAnalyze();}}
                placeholder="0x… ou bc1… ou 9WzD…"
                style={{width:"100%",height:52,borderRadius:14,border:"1px solid var(--border)",background:"var(--input)",color:"var(--foreground)",padding:"0 16px 0 44px",fontFamily:"var(--font-mono)",fontSize:14,outline:"none"}}
              />
              <span style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",background:"var(--muted)",padding:"3px 7px",borderRadius:6,border:"1px solid var(--border)"}}>⏎ enter</span>
            </div>
            <Btn variant="primary" size="lg" icon={<I.brain sw={2.5}/>} onClick={onAnalyze} style={{height:52,padding:"0 22px"}}>
              Analisar carteira
            </Btn>
          </div>

          <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:14,alignItems:"center"}}>
            <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-heading)",letterSpacing:"0.2em",marginRight:4,textTransform:"uppercase"}}>Rede</span>
            {CHAINS.map(([id,l]) => (
              <ChainChip key={id} chain={id} label={l} active={chain===id} onClick={()=>setChain(id)}/>
            ))}
            <div style={{flex:1}}/>
            <button style={{display:"inline-flex",alignItems:"center",gap:6,padding:"6px 10px",border:"1px dashed var(--border)",borderRadius:8,background:"transparent",color:"var(--muted-foreground)",fontSize:11,cursor:"pointer",fontFamily:"var(--font-mono)"}}>
              <span style={{width:12,height:12}}><I.copy/></span> colar do clipboard
            </button>
          </div>

          <div style={{borderTop:"1px solid var(--border)",marginTop:20,paddingTop:14,display:"flex",alignItems:"center",gap:16}}>
            <div style={{flex:1}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--muted-foreground)",marginBottom:6}}>
                <span>Uso mensal · 13 de 15 análises</span>
                <span style={{color:"var(--primary)",fontFamily:"var(--font-mono)"}}>86%</span>
              </div>
              <div style={{height:5,borderRadius:999,background:"color-mix(in oklab, var(--foreground), transparent 94%)",overflow:"hidden",position:"relative"}}>
                <div style={{height:"100%",width:"86%",background:"linear-gradient(90deg, var(--primary), oklch(0.74 0.16 85))",borderRadius:999,boxShadow:"0 0 12px oklch(0.74 0.19 66 / 50%)"}}/>
              </div>
            </div>
            <Btn variant="tinted" size="sm" icon={<I.zap sw={2.5}/>}>Upgrade</Btn>
          </div>
        </div>
      </Card>
    );
  }

  // ── Stat tile ──────────────────────────────────────────────────────
  function StatTile({ label, value, suffix, delta, icon, color="var(--primary)", sparkline, compact }) {
    const n = typeof value === "number" ? useCountUp(value) : null;
    return (
      <Card style={{padding: compact?16:20, position:"relative", overflow:"hidden"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <Eyebrow style={{fontSize:9}}>{label}</Eyebrow>
          <div style={{width:28,height:28,borderRadius:8,background:`color-mix(in oklab, ${color}, transparent 88%)`,display:"flex",alignItems:"center",justifyContent:"center",color}}>
            <span style={{width:13,height:13}}>{icon}</span>
          </div>
        </div>
        <div style={{display:"flex",alignItems:"baseline",gap:6,marginTop:compact?8:12}}>
          <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:compact?22:28,color,lineHeight:1}}>
            {n !== null ? n : value}
          </div>
          {suffix && <span style={{fontSize:12,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>{suffix}</span>}
        </div>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginTop:10,minHeight:20}}>
          {delta !== undefined ? (
            <div style={{display:"inline-flex",alignItems:"center",gap:4,fontSize:11,fontFamily:"var(--font-mono)",fontWeight:600,
              color: delta > 0 ? "oklch(0.69 0.19 162)" : delta < 0 ? "var(--destructive)" : "var(--muted-foreground)"}}>
              <span style={{fontSize:10}}>{delta > 0 ? "▲" : delta < 0 ? "▼" : "—"}</span>
              {delta !== 0 && <span>{Math.abs(delta)}{typeof delta === "number" && Math.abs(delta) < 1 ? "" : ""}{label === "Score médio" ? " pts" : ""}</span>}
              {delta === 0 && <span>estável</span>}
              <span style={{color:"var(--muted-foreground)",fontWeight:400,marginLeft:4}}>7d</span>
            </div>
          ) : <span/>}
          {sparkline && <Sparkline points={sparkline} color={color}/>}
        </div>
      </Card>
    );
  }

  // ── Alert row ──────────────────────────────────────────────────────
  function AlertRow({ alert, onDismiss }) {
    const cfg = {
      risk: { c:"var(--destructive)", bg:"oklch(0.63 0.24 28 / 6%)", border:"oklch(0.63 0.24 28 / 20%)", icon:<I.alert sw={2}/> },
      info: { c:"var(--accent)",      bg:"oklch(0.59 0.22 295 / 6%)", border:"oklch(0.59 0.22 295 / 20%)", icon:<I.refresh sw={2}/> },
      gold: { c:"var(--primary)",     bg:"oklch(0.74 0.19 66 / 6%)", border:"oklch(0.74 0.19 66 / 20%)", icon:<I.zap sw={2}/> },
    }[alert.kind];
    return (
      <div style={{display:"flex",gap:12,padding:14,borderRadius:12,background:cfg.bg,border:`1px solid ${cfg.border}`,alignItems:"flex-start"}}>
        <div style={{width:30,height:30,borderRadius:9,background:`color-mix(in oklab, ${cfg.c}, transparent 85%)`,color:cfg.c,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          <span style={{width:14,height:14}}>{cfg.icon}</span>
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8,justifyContent:"space-between"}}>
            <div style={{fontSize:12,fontWeight:600,color:"var(--foreground)"}}>{alert.title}</div>
            <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",flexShrink:0}}>{alert.when}</span>
          </div>
          <p style={{fontSize:11.5,lineHeight:1.5,color:"var(--muted-foreground)",margin:"4px 0 0"}}>{alert.body}</p>
        </div>
      </div>
    );
  }

  // ── Recent analyses row ────────────────────────────────────────────
  function RecentRow({ h, onClick, density }) {
    const pad = density === "compact" ? "10px 16px" : "14px 18px";
    return (
      <div onClick={onClick} style={{
        display:"grid",
        gridTemplateColumns:"36px 1fr auto auto auto",
        gap:14,alignItems:"center",
        padding:pad,
        borderBottom:"1px solid var(--border)",
        cursor:"pointer",
        transition:"background .15s",
      }}
      onMouseEnter={e=>e.currentTarget.style.background="color-mix(in oklab, var(--primary), transparent 96%)"}
      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
        <ChainBlock chain={h.chain} size="sm"/>
        <div style={{minWidth:0}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            {h.label && <span style={{fontSize:13,fontWeight:600,color:"var(--foreground)"}}>{h.label}</span>}
            <span style={{fontFamily:"var(--font-mono)",fontSize:11,color: h.label ? "var(--muted-foreground)" : "color-mix(in oklab,var(--foreground),transparent 15%)"}}>
              {h.address.slice(0,h.label?6:12)}…{h.address.slice(-4)}
            </span>
            {h.tag && <Badge variant="outline" style={{fontSize:9,padding:"1px 7px",fontFamily:"var(--font-sans)"}}>{h.tag}</Badge>}
          </div>
          <div style={{fontSize:10,color:"var(--muted-foreground)",marginTop:3,display:"flex",gap:8,alignItems:"center"}}>
            <span>{h.date}</span>
            <span>·</span>
            <span style={{fontFamily:"var(--font-mono)"}}>{h.conf}% conf.</span>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:2}}>
          <span style={{
            padding:"4px 10px",borderRadius:999,fontFamily:"var(--font-heading)",fontWeight:700,fontSize:12,
            background: h.score>=70?"color-mix(in oklab, var(--primary), transparent 85%)":h.score>=40?"oklch(0.74 0.16 85 / 15%)":"color-mix(in oklab, var(--destructive), transparent 85%)",
            color: h.score>=70?"var(--primary)":h.score>=40?"oklch(0.74 0.16 85)":"var(--destructive)",
          }}>{h.score}</span>
          {h.delta !== 0 && (
            <span style={{fontSize:9,fontFamily:"var(--font-mono)",color: h.delta > 0 ? "oklch(0.69 0.19 162)" : "var(--destructive)"}}>
              {h.delta > 0 ? "▲" : "▼"} {Math.abs(h.delta)}
            </span>
          )}
        </div>
        <StatusPill verdict={h.verdict} pulse={false}/>
        <span style={{width:16,height:16,color:"var(--muted-foreground)",opacity:.5}}><I.arrow sw={2}/></span>
      </div>
    );
  }

  // ── Watchlist tile ─────────────────────────────────────────────────
  function WatchlistTile({ w }) {
    const delta = w.score - w.prev;
    return (
      <div style={{display:"flex",alignItems:"center",gap:12,padding:12,borderRadius:12,border:"1px solid var(--border)",background:"color-mix(in oklab, var(--card-2), transparent 30%)"}}>
        <ChainBlock chain={w.chain} size="sm"/>
        <div style={{flex:1,minWidth:0}}>
          <div style={{fontSize:12,fontWeight:600,color:"var(--foreground)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{w.label}</div>
          <div style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--muted-foreground)",marginTop:2}}>{w.address.slice(0,8)}…{w.address.slice(-4)}</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:16,color: w.score>=70?"var(--primary)":w.score>=40?"oklch(0.74 0.16 85)":"var(--destructive)"}}>{w.score}</div>
          {delta !== 0 && (
            <div style={{fontSize:9,fontFamily:"var(--font-mono)",color: delta > 0 ? "oklch(0.69 0.19 162)" : "var(--destructive)"}}>
              {delta > 0 ? "▲" : "▼"} {Math.abs(delta)}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Chain distribution bar ─────────────────────────────────────────
  function ChainDistribution() {
    const data = [
      { chain:"ethereum", pct:42, color:"oklch(0.60 0.17 253)" },
      { chain:"polygon",  pct:22, color:"oklch(0.59 0.22 295)" },
      { chain:"bitcoin",  pct:14, color:"oklch(0.74 0.16 85)" },
      { chain:"solana",   pct:12, color:"oklch(0.69 0.19 162)" },
      { chain:"arbitrum", pct:6,  color:"oklch(0.60 0.17 253)" },
      { chain:"outros",   pct:4,  color:"oklch(0.59 0.02 230)" },
    ];
    return (
      <div>
        <div style={{display:"flex",height:8,borderRadius:999,overflow:"hidden",background:"var(--muted)"}}>
          {data.map(d => <div key={d.chain} style={{width:`${d.pct}%`,background:d.color,boxShadow:`inset 0 0 6px ${d.color}`}}/>)}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}>
          {data.map(d => (
            <div key={d.chain} style={{display:"flex",alignItems:"center",gap:8,fontSize:11}}>
              <span style={{width:8,height:8,borderRadius:2,background:d.color}}/>
              <span style={{color:"var(--muted-foreground)",fontFamily:"var(--font-heading)",letterSpacing:"0.15em",fontSize:9,textTransform:"uppercase",flex:1}}>{d.chain}</span>
              <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--foreground)"}}>{d.pct}%</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Full Dashboard ─────────────────────────────────────────────────
  function Dashboard({ density="comfortable", showWatchlist=true, userName="Matteus", emptyState=false }) {
    const [chain, setChain] = useState("ethereum");
    const [addr, setAddr] = useState("");
    const history = emptyState ? [] : MOCK_HISTORY;

    const onAnalyze = () => {
      const ring = document.getElementById("toast-analyzing");
      if (ring) {
        ring.style.opacity = "1";
        ring.style.transform = "translateY(0)";
        setTimeout(() => { ring.style.opacity = "0"; ring.style.transform = "translateY(12px)"; }, 2200);
      }
    };

    const gap = density === "compact" ? 16 : 24;

    return (
      <div style={{padding:density==="compact"?20:28, display:"flex", flexDirection:"column", gap}}>
        {/* Greeting */}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
          <div>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Eyebrow>{new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"})}</Eyebrow>
              <span style={{width:4,height:4,borderRadius:999,background:"var(--muted-foreground)",opacity:.4}}/>
              <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",display:"flex",alignItems:"center",gap:5}}>
                <span style={{width:6,height:6,borderRadius:999,background:"oklch(0.69 0.19 162)",animation:"scDotPulse 2s ease-in-out infinite"}}/>
                6 redes online
              </span>
            </div>
            <h1 style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:28,letterSpacing:"0.02em",margin:0,color:"var(--foreground)"}}>
              Olá, <span style={{color:"var(--primary)",textShadow:"0 0 24px oklch(0.74 0.19 66 / 40%)"}}>{userName}</span>
            </h1>
            <p style={{fontSize:13,color:"var(--muted-foreground)",marginTop:6,margin:"6px 0 0"}}>
              {emptyState
                ? "Nenhuma análise ainda — comece analisando sua primeira carteira."
                : `Você tem 3 alertas novos e 2 análises recalculadas automaticamente em cache.`}
            </p>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="sm" icon={<I.refresh sw={2}/>}>Atualizar cache</Btn>
            <Btn variant="tinted" size="sm" icon={<I.arrow sw={2.5}/>}>Relatório mensal</Btn>
          </div>
        </div>

        {/* Hero analyze */}
        <AnalyzeHero chain={chain} setChain={setChain} addr={addr} setAddr={setAddr} onAnalyze={onAnalyze} remaining={2}/>

        {/* Stat row */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16}}>
          <StatTile label="Análises totais" value={emptyState?0:128} delta={emptyState?0:+12} icon={<I.dash sw={2}/>} color="var(--primary)" sparkline={[9,11,10,13,12,15,14,18,16,20,19,22]} compact={density==="compact"}/>
          <StatTile label="Score médio" value={emptyState?0:68} delta={emptyState?0:+4} icon={<I.brain sw={2}/>} color="var(--accent)" sparkline={[62,64,63,65,66,65,67,66,68,67,68,68]} compact={density==="compact"}/>
          <StatTile label="Confiáveis" value={emptyState?0:84} suffix={emptyState?"":"/ 128"} delta={+6} icon={<I.shield sw={2}/>} color="oklch(0.69 0.19 162)" sparkline={[50,55,58,60,64,68,72,74,78,80,82,84]} compact={density==="compact"}/>
          <StatTile label="Alto risco" value={emptyState?0:12} suffix={emptyState?"":"/ 128"} delta={-2} icon={<I.alert sw={2}/>} color="var(--destructive)" sparkline={[18,17,16,15,14,14,13,13,13,12,12,12]} compact={density==="compact"}/>
        </div>

        {/* Main grid */}
        <div style={{display:"grid",gridTemplateColumns: showWatchlist ? "1fr 320px" : "1fr", gap}}>
          {/* Recent analyses */}
          <div style={{display:"flex",flexDirection:"column",gap}}>
            <Card style={{padding:0,overflow:"hidden"}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"16px 20px",borderBottom:"1px solid var(--border)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{width:14,height:14,color:"color-mix(in oklab,var(--primary),transparent 30%)"}}><I.clock sw={2}/></span>
                  <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:12,letterSpacing:"0.2em",textTransform:"uppercase"}}>Análises recentes</span>
                  <Badge variant="outline" style={{fontSize:10,padding:"1px 8px"}}>{history.length}</Badge>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button style={{fontSize:11,color:"var(--foreground)",fontFamily:"var(--font-heading)",letterSpacing:"0.1em",background:"color-mix(in oklab, var(--primary), transparent 92%)",border:"1px solid var(--gold-ring)",borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>Todas</button>
                  <button style={{fontSize:11,color:"var(--muted-foreground)",fontFamily:"var(--font-heading)",letterSpacing:"0.1em",background:"transparent",border:"1px solid var(--border)",borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>Risco</button>
                  <button style={{fontSize:11,color:"var(--muted-foreground)",fontFamily:"var(--font-heading)",letterSpacing:"0.1em",background:"transparent",border:"1px solid var(--border)",borderRadius:8,padding:"4px 10px",cursor:"pointer"}}>Confiáveis</button>
                  <Btn variant="ghost" size="sm">Ver todas →</Btn>
                </div>
              </div>
              {emptyState ? (
                <div style={{padding:"48px 24px",textAlign:"center"}}>
                  <div style={{width:56,height:56,borderRadius:16,background:"var(--primary-dim)",color:"var(--primary)",display:"inline-flex",alignItems:"center",justifyContent:"center",marginBottom:14}}>
                    <span style={{width:24,height:24}}><I.search sw={2}/></span>
                  </div>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:14,fontWeight:700,letterSpacing:"0.1em"}}>Nenhuma análise ainda — comece agora!</div>
                  <p style={{fontSize:12,color:"var(--muted-foreground)",marginTop:6,maxWidth:320,margin:"6px auto 0"}}>Cole um endereço acima e receba um score completo em menos de 3 segundos.</p>
                </div>
              ) : (
                <div>{history.slice(0,5).map((h,i) => <RecentRow key={h.id} h={h} density={density} onClick={()=>{}}/>)}</div>
              )}
            </Card>

            {/* Bottom row: highlighted + distribution */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:gap}}>
              {/* Highlight card */}
              <Card variant="glow" style={{padding:0,overflow:"hidden",position:"relative"}}>
                <div style={{padding:"20px 22px"}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                    <div>
                      <Eyebrow style={{color:"var(--primary)",fontSize:9}}>DESTAQUE DA SEMANA</Eyebrow>
                      <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:16,marginTop:8,letterSpacing:"0.05em"}}>Maior subida de score</div>
                    </div>
                    <Badge variant="gold" style={{fontSize:9}}>+9 pts</Badge>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:16,marginTop:18}}>
                    <ScoreRing score={91} confidence={0.97} size={86}/>
                    <div style={{flex:1}}>
                      <div style={{fontSize:12,fontWeight:600}}>Beacon Deposit</div>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--muted-foreground)",marginTop:2}}>0x0000…705Fa</div>
                      <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                        <Badge variant="outline" style={{fontSize:9,padding:"2px 7px",fontFamily:"var(--font-sans)"}}>ethereum</Badge>
                        <Badge variant="outline" style={{fontSize:9,padding:"2px 7px",fontFamily:"var(--font-sans)"}}>contrato verificado</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Chain distribution */}
              <Card style={{padding:"20px 22px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <Eyebrow style={{fontSize:9}}>DISTRIBUIÇÃO POR REDE</Eyebrow>
                  <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>últimos 30d</span>
                </div>
                <ChainDistribution/>
              </Card>
            </div>
          </div>

          {/* Sidebar: alerts + watchlist */}
          {showWatchlist && (
            <aside style={{display:"flex",flexDirection:"column",gap}}>
              {/* Alerts */}
              <Card style={{padding:"18px 20px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:14,height:14,color:"var(--primary)"}}><I.bell sw={2}/></span>
                    <Eyebrow style={{fontSize:10}}>ALERTAS</Eyebrow>
                    <Badge variant="gold" style={{fontSize:9,padding:"1px 7px"}}>{ALERTS.length}</Badge>
                  </div>
                  <Btn variant="ghost" size="sm">Todas</Btn>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:10}}>
                  {ALERTS.map((a,i) => <AlertRow key={i} alert={a}/>)}
                </div>
              </Card>

              {/* Watchlist */}
              <Card style={{padding:"18px 20px"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{width:14,height:14,color:"var(--accent)"}}><I.wallet sw={2}/></span>
                    <Eyebrow style={{fontSize:10}}>WATCHLIST</Eyebrow>
                  </div>
                  <button style={{background:"transparent",border:"none",color:"var(--primary)",fontSize:18,cursor:"pointer",lineHeight:1,padding:0,width:22,height:22}}>+</button>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {WATCHLIST.map((w,i) => <WatchlistTile key={i} w={w}/>)}
                </div>
                <div style={{marginTop:12,paddingTop:12,borderTop:"1px solid var(--border)",display:"flex",justifyContent:"space-between",fontSize:11,color:"var(--muted-foreground)"}}>
                  <span>Score médio do watchlist</span>
                  <span style={{fontFamily:"var(--font-heading)",fontWeight:700,color:"var(--foreground)"}}>61.5</span>
                </div>
              </Card>
            </aside>
          )}
        </div>

        {/* Toast */}
        <div id="toast-analyzing" style={{
          position:"fixed",bottom:24,right:24,zIndex:1000,
          padding:"14px 18px",borderRadius:12,
          background:"color-mix(in oklab, var(--card), transparent 10%)",
          border:"1px solid var(--gold-ring)",
          boxShadow:"0 12px 40px -12px oklch(0.74 0.19 66 / 40%), 0 0 0 1px oklch(0.74 0.19 66 / 20%)",
          backdropFilter:"blur(20px)",
          opacity:0,transform:"translateY(12px)",
          transition:"opacity .3s, transform .3s",
          display:"flex",alignItems:"center",gap:12,
        }}>
          <div style={{width:28,height:28,borderRadius:8,background:"var(--primary-dim)",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",animation:"scSpin 1s linear infinite"}}>
            <span style={{width:14,height:14}}><I.refresh sw={2.5}/></span>
          </div>
          <div>
            <div style={{fontSize:12,fontWeight:600}}>Analisando carteira…</div>
            <div style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",marginTop:2}}>coletando dados on-chain · gpt-5</div>
          </div>
        </div>
      </div>
    );
  }

  return { Dashboard };
})());
