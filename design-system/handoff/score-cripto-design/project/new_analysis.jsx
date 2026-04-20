Object.assign(window, (function () {
  const { useState, useEffect, useRef } = React;
  const { I, Logo, Btn, Badge, StatusPill, ChainBlock, ChainChip, ScoreRing, Card, Eyebrow } = window;

  // ── Pipeline stages ────────────────────────────────────────────────
  const STAGES = [
    { id:"detect",   label:"Detectando rede",      detail:"Identificando chain a partir do formato do endereço" },
    { id:"fetch",    label:"Coletando on-chain",   detail:"transações, contrapartes, idade, volume" },
    { id:"normalize",label:"Normalização",         detail:"agregando sinais em 42 features" },
    { id:"sanctions",label:"Checando sanções",     detail:"OFAC + listas comunitárias" },
    { id:"mixer",    label:"Detectando mixers",    detail:"Tornado Cash, Wasabi, Samourai" },
    { id:"ai",       label:"Reasoning da IA",      detail:"gpt-5 · prompt v3.2 · 1.2k tokens" },
    { id:"score",    label:"Score final",          detail:"confiança validada" },
  ];

  function useCountUp(target, duration=1400, run=true) {
    const [v, setV] = useState(0);
    useEffect(() => {
      if (!run) { setV(0); return; }
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
    }, [target, run]);
    return v;
  }

  // ── Input screen ───────────────────────────────────────────────────
  function InputPanel({ chain, setChain, addr, setAddr, onAnalyze, error }) {
    const CHAINS = [
      ["ethereum","ETH","Ethereum"],
      ["bitcoin","BTC","Bitcoin"],
      ["polygon","MATIC","Polygon"],
      ["solana","SOL","Solana"],
      ["arbitrum","ARB","Arbitrum"],
      ["optimism","OP","Optimism"],
      ["avalanche","AVAX","Avalanche"],
    ];
    const RECENTS = [
      { chain:"ethereum", address:"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", label:"vitalik.eth", score:82 },
      { chain:"polygon",  address:"0x742d35Cc6634C0532925a3b844Bc9e7595f4e2bc", label:null, score:45 },
      { chain:"bitcoin",  address:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", label:"Cold wallet", score:68 },
    ];
    const SAMPLES = [
      { chain:"ethereum", address:"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", tag:"Trusted" },
      { chain:"ethereum", address:"0x00000000219ab540356cBB839Cbe05303d7705Fa", tag:"Contrato" },
      { chain:"solana",   address:"9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", tag:"Alto risco" },
    ];

    return (
      <div style={{padding:28, display:"grid", gridTemplateColumns:"1fr 320px", gap:24}}>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {/* Hero input card */}
          <Card variant="glow" style={{padding:0, overflow:"hidden", position:"relative"}}>
            <div style={{position:"absolute",inset:0,background:"radial-gradient(70% 80% at 100% 0%, oklch(0.74 0.19 66 / 14%), transparent 60%), radial-gradient(50% 70% at 0% 100%, oklch(0.59 0.22 295 / 10%), transparent 60%)",pointerEvents:"none"}}/>
            <div style={{position:"relative",padding:"32px 32px 28px"}}>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <span style={{width:32,height:32,borderRadius:10,background:"var(--primary-dim)",border:"1px solid var(--gold-ring)",color:"var(--primary)",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{width:16,height:16}}><I.search sw={2.5}/></span>
                </span>
                <Eyebrow style={{color:"var(--primary)"}}>NOVA ANÁLISE</Eyebrow>
              </div>
              <h1 style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:30,letterSpacing:"0.01em",margin:0,lineHeight:1.1}}>
                Cole um endereço e receba um <span style={{color:"var(--primary)",textShadow:"0 0 28px oklch(0.74 0.19 66 / 45%)"}}>score auditável</span>
              </h1>
              <p style={{fontSize:13.5,lineHeight:1.6,color:"var(--muted-foreground)",marginTop:10,maxWidth:540}}>
                Nosso pipeline coleta dados on-chain, checa sanções e mixers, e gera um reasoning completo com a IA em menos de 3 segundos.
              </p>

              {/* Input */}
              <div style={{marginTop:22,position:"relative"}}>
                <label style={{display:"block",fontSize:10,fontFamily:"var(--font-heading)",letterSpacing:"0.3em",color:"var(--muted-foreground)",textTransform:"uppercase",marginBottom:8}}>Endereço da carteira</label>
                <div style={{position:"relative"}}>
                  <span style={{position:"absolute",left:16,top:"50%",transform:"translateY(-50%)",width:16,height:16,color:error?"var(--destructive)":"color-mix(in oklab,var(--muted-foreground),transparent 30%)"}}><I.wallet sw={2}/></span>
                  <input
                    value={addr}
                    onChange={e=>setAddr(e.target.value)}
                    onKeyDown={e=>{if(e.key==="Enter") onAnalyze();}}
                    placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f4e2bc"
                    style={{width:"100%",height:60,borderRadius:14,border:`1px solid ${error?"var(--destructive)":"var(--border)"}`,background:"var(--input)",color:"var(--foreground)",padding:"0 20px 0 48px",fontFamily:"var(--font-mono)",fontSize:15,outline:"none",letterSpacing:"0.01em"}}
                  />
                  <button onClick={()=>navigator.clipboard?.readText?.().then(t=>setAddr(t||addr))} style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",background:"var(--muted)",padding:"5px 10px",borderRadius:7,border:"1px solid var(--border)",cursor:"pointer"}}>
                    colar
                  </button>
                </div>
                {error && (
                  <div style={{marginTop:8,display:"flex",alignItems:"center",gap:6,fontSize:11.5,color:"var(--destructive)"}}>
                    <span style={{width:12,height:12}}><I.alert sw={2.5}/></span>
                    {error}
                  </div>
                )}
              </div>

              {/* Chain picker */}
              <div style={{marginTop:18}}>
                <div style={{fontSize:10,fontFamily:"var(--font-heading)",letterSpacing:"0.3em",color:"var(--muted-foreground)",textTransform:"uppercase",marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                  Rede
                  <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--muted-foreground)",letterSpacing:0,textTransform:"none",opacity:.7}}>(auto-detecção disponível)</span>
                </div>
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {CHAINS.map(([id,l,name]) => (
                    <button key={id} onClick={()=>setChain(id)} style={{
                      display:"inline-flex",alignItems:"center",gap:8,padding:"7px 12px",borderRadius:10,
                      border: chain===id ? "1px solid var(--gold-ring)" : "1px solid var(--border)",
                      background: chain===id ? "var(--primary-dim)" : "transparent",
                      color: chain===id ? "var(--primary)" : "var(--muted-foreground)",
                      fontFamily:"var(--font-sans)",fontSize:12,fontWeight:600,cursor:"pointer",transition:"all .2s",
                      boxShadow: chain===id ? "0 0 12px oklch(0.74 0.19 66 / 20%)" : "none",
                    }}>
                      <ChainBlock chain={id} size="sm"/>
                      <span>{name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div style={{marginTop:24,display:"flex",gap:10,alignItems:"center"}}>
                <Btn variant="primary" size="lg" icon={<I.brain sw={2.5}/>} onClick={onAnalyze} style={{flex:"0 0 auto",height:52,padding:"0 28px",fontSize:15}}>
                  Analisar com IA
                </Btn>
                <Btn variant="outline" size="lg" style={{height:52}} onClick={()=>setAddr("")}>Limpar</Btn>
                <div style={{flex:1}}/>
                <div style={{display:"flex",alignItems:"center",gap:14,color:"var(--muted-foreground)",fontSize:11,fontFamily:"var(--font-mono)"}}>
                  <span style={{display:"inline-flex",alignItems:"center",gap:5}}><span style={{width:6,height:6,borderRadius:999,background:"oklch(0.69 0.19 162)",animation:"scDotPulse 2s ease-in-out infinite"}}/>pipeline online</span>
                  <span>·</span>
                  <span>&lt;3s · 2/15 restantes</span>
                </div>
              </div>
            </div>

            {/* Bottom strip: samples */}
            <div style={{position:"relative",borderTop:"1px solid var(--border)",background:"color-mix(in oklab, var(--card-2), transparent 50%)",padding:"14px 32px",display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <span style={{fontSize:10,fontFamily:"var(--font-heading)",letterSpacing:"0.3em",color:"var(--muted-foreground)",textTransform:"uppercase"}}>Tente um exemplo</span>
              {SAMPLES.map((s,i) => (
                <button key={i} onClick={()=>{setChain(s.chain); setAddr(s.address);}} style={{display:"inline-flex",alignItems:"center",gap:8,padding:"6px 12px",borderRadius:999,border:"1px solid var(--border)",background:"var(--card)",color:"var(--foreground)",fontFamily:"var(--font-mono)",fontSize:11,cursor:"pointer"}}>
                  <ChainBlock chain={s.chain} size="sm"/>
                  <span>{s.address.slice(0,6)}…{s.address.slice(-4)}</span>
                  <Badge variant="outline" style={{fontSize:9,padding:"1px 6px",fontFamily:"var(--font-sans)"}}>{s.tag}</Badge>
                </button>
              ))}
            </div>
          </Card>

          {/* What we analyze */}
          <Card style={{padding:22}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <Eyebrow>O QUE A IA ANALISA</Eyebrow>
              <Badge variant="purple" style={{fontSize:9}}>42 sinais</Badge>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:14}}>
              {[
                {i:<I.clock/>,  t:"Histórico on-chain", d:"Idade, volume, consistência, pausas suspeitas"},
                {i:<I.shield/>, t:"Sanções & listas",   d:"OFAC + listas comunitárias de risco"},
                {i:<I.zap/>,    t:"Mixers & bridges",   d:"Tornado Cash, Wasabi, Samourai, CEX deposits"},
                {i:<I.brain/>,  t:"Padrões DeFi",       d:"Diversidade de contrapartes, farming, NFTs"},
                {i:<I.alert/>,  t:"Concentração",       d:"Token único, whale moves, peak activity"},
                {i:<I.dash/>,   t:"Reasoning da IA",    d:"Reasoning auditável, gpt-5 + prompt versionado"},
              ].map((f,i) => (
                <div key={i} style={{display:"flex",gap:12,padding:14,borderRadius:12,border:"1px solid var(--border)",background:"color-mix(in oklab, var(--card-2), transparent 40%)"}}>
                  <div style={{width:32,height:32,borderRadius:9,background:"var(--primary-dim)",color:"var(--primary)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{width:15,height:15}}>{f.i}</span>
                  </div>
                  <div>
                    <div style={{fontSize:12.5,fontWeight:600}}>{f.t}</div>
                    <div style={{fontSize:11,color:"var(--muted-foreground)",marginTop:3,lineHeight:1.4}}>{f.d}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <aside style={{display:"flex",flexDirection:"column",gap:16}}>
          <Card style={{padding:18}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
              <Eyebrow style={{fontSize:10}}>ANÁLISES RECENTES</Eyebrow>
              <Btn variant="ghost" size="sm">Ver todas</Btn>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {RECENTS.map((r,i) => (
                <button key={i} onClick={()=>{setChain(r.chain); setAddr(r.address);}} style={{display:"flex",alignItems:"center",gap:10,padding:10,borderRadius:10,border:"1px solid var(--border)",background:"transparent",cursor:"pointer",textAlign:"left",width:"100%"}}>
                  <ChainBlock chain={r.chain} size="sm"/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:11.5,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.label || `${r.address.slice(0,8)}…${r.address.slice(-4)}`}</div>
                    <div style={{fontFamily:"var(--font-mono)",fontSize:9.5,color:"var(--muted-foreground)",marginTop:2}}>{r.label ? `${r.address.slice(0,6)}…${r.address.slice(-4)}` : r.chain}</div>
                  </div>
                  <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:13,color: r.score>=70?"var(--primary)":r.score>=40?"oklch(0.74 0.16 85)":"var(--destructive)"}}>{r.score}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card variant="dim" style={{padding:18}}>
            <Eyebrow style={{fontSize:10,marginBottom:10}}>DICAS</Eyebrow>
            <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:10}}>
              {[
                "Cache de 20 min retorna imediatamente e agenda refresh em segundo plano.",
                "Reasoning é versionado — você pode auditar a resposta da IA no futuro.",
                "Recalcular força uma nova execução ignorando o cache.",
              ].map((t,i)=>(
                <li key={i} style={{fontSize:11.5,lineHeight:1.5,color:"var(--muted-foreground)",display:"flex",gap:8}}>
                  <span style={{color:"var(--primary)",flexShrink:0}}>→</span>{t}
                </li>
              ))}
            </ul>
          </Card>
        </aside>
      </div>
    );
  }

  // ── Live pipeline screen ───────────────────────────────────────────
  function PipelinePanel({ chain, address, onComplete, onCancel }) {
    const [stageIdx, setStageIdx] = useState(0);
    const [pct, setPct] = useState(0);
    useEffect(() => {
      const per = 520; // ms per stage
      let i = 0;
      const tick = () => {
        i++;
        if (i > STAGES.length) { onComplete(); return; }
        setStageIdx(i);
        setPct(Math.min(100, (i / STAGES.length) * 100));
        if (i < STAGES.length + 1) setTimeout(tick, per);
      };
      setTimeout(tick, 300);
    }, []);

    return (
      <div style={{padding:28,display:"grid",gridTemplateColumns:"1fr",gap:20,maxWidth:880,margin:"0 auto"}}>
        <Card variant="glow" style={{padding:0,overflow:"hidden",position:"relative"}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(60% 80% at 50% 0%, oklch(0.59 0.22 295 / 14%), transparent 60%)",pointerEvents:"none"}}/>
          <div style={{position:"relative",padding:"32px 36px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <span style={{width:32,height:32,borderRadius:9,background:"var(--accent-dim)",color:"var(--accent)",display:"flex",alignItems:"center",justifyContent:"center",animation:"scSpin 2s linear infinite"}}>
                  <span style={{width:16,height:16}}><I.refresh sw={2.5}/></span>
                </span>
                <div>
                  <Eyebrow style={{color:"var(--accent)"}}>ANALISANDO</Eyebrow>
                  <div style={{fontFamily:"var(--font-mono)",fontSize:12,color:"var(--muted-foreground)",marginTop:2}}>{chain} · {address.slice(0,10)}…{address.slice(-6)}</div>
                </div>
              </div>
              <Btn variant="ghost" size="sm" onClick={onCancel}>Cancelar</Btn>
            </div>

            {/* Central visual */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"14px 0 22px"}}>
              <div style={{position:"relative",width:200,height:200,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <svg width="200" height="200" style={{transform:"rotate(-90deg)",position:"absolute",inset:0}}>
                  <circle cx="100" cy="100" r="84" fill="none" stroke="oklch(1 0 0 / 6%)" strokeWidth="10"/>
                  <circle cx="100" cy="100" r="84" fill="none" stroke="var(--primary)" strokeWidth="10" strokeLinecap="round" strokeDasharray={2*Math.PI*84} strokeDashoffset={2*Math.PI*84 - (pct/100)*2*Math.PI*84} style={{transition:"stroke-dashoffset 0.5s cubic-bezier(0.4,0,0.2,1)",filter:"drop-shadow(0 0 12px var(--primary))"}}/>
                </svg>
                <div style={{textAlign:"center"}}>
                  <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:44,color:"var(--primary)",lineHeight:1}}>{Math.round(pct)}<span style={{fontSize:18,color:"var(--muted-foreground)"}}>%</span></div>
                  <div style={{fontFamily:"var(--font-heading)",fontSize:9,letterSpacing:"0.3em",color:"var(--muted-foreground)",textTransform:"uppercase",marginTop:6}}>processando</div>
                </div>
              </div>
            </div>

            {/* Stages */}
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {STAGES.map((s, i) => {
                const done = i < stageIdx;
                const active = i === stageIdx - 1;
                return (
                  <div key={s.id} style={{
                    display:"flex",alignItems:"center",gap:14,padding:"10px 14px",borderRadius:10,
                    background: active ? "color-mix(in oklab, var(--primary), transparent 92%)" : "transparent",
                    border: active ? "1px solid var(--gold-ring)" : "1px solid transparent",
                    transition:"all .3s",
                    opacity: i > stageIdx ? .4 : 1,
                  }}>
                    <span style={{width:20,height:20,borderRadius:999,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,
                      background: done ? "oklch(0.69 0.19 162)" : active ? "var(--primary)" : "var(--muted)",
                      color: (done||active) ? "white" : "var(--muted-foreground)",
                    }}>
                      {done ? <span style={{width:11,height:11}}><I.check sw={3.5}/></span>
                        : active ? <span style={{width:8,height:8,borderRadius:999,background:"white",animation:"scDotPulse 1s ease-in-out infinite"}}/>
                        : <span style={{fontFamily:"var(--font-mono)",fontSize:9,fontWeight:700}}>{String(i+1).padStart(2,"0")}</span>}
                    </span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12.5,fontWeight:600,color: active ? "var(--primary)" : done ? "var(--foreground)" : "var(--muted-foreground)"}}>{s.label}</div>
                      <div style={{fontSize:10.5,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",marginTop:2}}>{s.detail}</div>
                    </div>
                    {active && <span style={{fontSize:10,color:"var(--primary)",fontFamily:"var(--font-mono)"}}>em andamento…</span>}
                    {done && <span style={{fontSize:10,color:"oklch(0.69 0.19 162)",fontFamily:"var(--font-mono)"}}>ok</span>}
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // ── Result screen ──────────────────────────────────────────────────
  function ResultPanel({ chain, address, onBack, onReanalyze }) {
    const score = 80;
    const confidence = 92;
    const animScore = useCountUp(score, 1400);
    const animConf = useCountUp(confidence, 1400);

    const FACTORS_POS = [
      { pts:+24, title:"Histórico de 3 anos", detail:"Carteira ativa desde 2022, sem pausas suspeitas." },
      { pts:+18, title:"Diversidade DeFi alta", detail:"Interage com 47+ contrapartes distintas em 8 protocolos." },
      { pts:+12, title:"Volume consistente", detail:"Movimentação estável sem picos anormais nos últimos 6m." },
      { pts:+8,  title:"Contratos verificados", detail:"88% das interações com contratos auditados publicamente." },
    ];
    const FACTORS_NEG = [
      { pts:-12, title:"Interação com mixer", detail:"Uma operação via Tornado Cash em 2023-10-14." },
      { pts:-8,  title:"Concentração moderada", detail:"72% do balance em um único token (USDC)." },
      { pts:-4,  title:"Pico de atividade 24h", detail:"Janela de 14 transações em 2h em 2024-12-03." },
    ];

    const BREAKDOWN = [
      { label:"Histórico", value:88, color:"var(--primary)" },
      { label:"Diversidade", value:82, color:"var(--primary)" },
      { label:"Sanções", value:100, color:"oklch(0.69 0.19 162)" },
      { label:"Mixers", value:54, color:"oklch(0.74 0.16 85)" },
      { label:"Concentração", value:62, color:"oklch(0.74 0.16 85)" },
      { label:"DeFi", value:91, color:"var(--primary)" },
    ];

    const [copied, setCopied] = useState(false);
    const copy = () => {
      navigator.clipboard?.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    };

    return (
      <div style={{padding:28,display:"grid",gridTemplateColumns:"1fr 320px",gap:24}}>
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          {/* Header row */}
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <Btn variant="ghost" size="sm" onClick={onBack}>← Nova análise</Btn>
              <div style={{height:18,width:1,background:"var(--border)"}}/>
              <ChainBlock chain={chain} size="sm"/>
              <Badge variant="gold" style={{fontSize:10}}>{chain}</Badge>
              <Badge variant="purple" style={{fontSize:9,fontFamily:"var(--font-heading)",letterSpacing:"0.2em"}}>CONCLUÍDO</Badge>
              <Badge variant="outline" style={{fontSize:9,fontFamily:"var(--font-heading)",letterSpacing:"0.2em"}}>EM CACHE · 18 min</Badge>
            </div>
            <div style={{display:"flex",gap:8}}>
              <Btn variant="outline" size="sm" icon={<I.copy/>} onClick={copy}>{copied?"Copiado!":"Compartilhar"}</Btn>
              <Btn variant="outline" size="sm" icon={<I.refresh/>} onClick={onReanalyze}>Recalcular</Btn>
              <Btn variant="tinted" size="sm" icon={<I.arrow sw={2.5}/>}>Exportar PDF</Btn>
            </div>
          </div>

          {/* Address bar */}
          <Card variant="dim" style={{padding:"14px 18px",display:"flex",justifyContent:"space-between",alignItems:"center",gap:16,flexWrap:"wrap"}}>
            <div style={{minWidth:0,flex:1}}>
              <Eyebrow style={{fontSize:9,opacity:.6}}>Carteira analisada</Eyebrow>
              <div style={{fontFamily:"var(--font-mono)",fontSize:13.5,marginTop:4,color:"color-mix(in oklab,var(--foreground),transparent 5%)",wordBreak:"break-all"}}>{address}</div>
            </div>
            <button onClick={copy} style={{width:32,height:32,borderRadius:9,border:"1px solid var(--border)",background:"transparent",color:"var(--muted-foreground)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
              <span style={{width:14,height:14}}><I.copy/></span>
            </button>
          </Card>

          {/* Score + reasoning */}
          <div style={{display:"grid",gridTemplateColumns:"300px 1fr",gap:20}}>
            <Card variant="glow" style={{padding:24,display:"flex",flexDirection:"column",alignItems:"center",gap:14,position:"relative",overflow:"hidden"}}>
              <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 50% 40%, oklch(0.74 0.19 66 / 10%), transparent 60%)",pointerEvents:"none"}}/>
              <div style={{position:"relative"}}>
                <ScoreRing score={score} confidence={confidence/100} size={200}/>
              </div>
              <StatusPill verdict="trusted"/>
              <div style={{fontSize:11,color:"var(--muted-foreground)",textAlign:"center",fontFamily:"var(--font-mono)"}}>
                confiança {animConf}% · 42 sinais analisados
              </div>
            </Card>

            <Card variant="glass" style={{padding:24}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
                <span style={{width:18,height:18,color:"var(--accent)"}}><I.brain sw={2}/></span>
                <Eyebrow style={{fontSize:10,color:"var(--accent)"}}>REASONING DA IA</Eyebrow>
                <div style={{flex:1}}/>
                <Badge variant="outline" style={{fontSize:9,fontFamily:"var(--font-mono)"}}>v3.2</Badge>
              </div>
              <p style={{fontSize:14,lineHeight:1.75,marginTop:10,color:"color-mix(in oklab,var(--foreground),transparent 8%)"}}>
                A carteira apresenta <strong style={{color:"var(--primary)"}}>alto padrão de confiabilidade</strong>. Histórico consistente de 3 anos com transações regulares, diversidade DeFi acima da média (47+ contrapartes) e ausência total em listas de sanções.
              </p>
              <p style={{fontSize:14,lineHeight:1.75,marginTop:12,color:"color-mix(in oklab,var(--foreground),transparent 8%)"}}>
                Uma <strong style={{color:"var(--destructive)"}}>interação com mixer Tornado Cash</strong> foi detectada em 2023-10-14, mas o padrão posterior sugere uso isolado e não sistemático. Concentração atual em USDC (72%) é característica de wallets operacionais e não reduz significativamente o score.
              </p>
              <p style={{fontSize:14,lineHeight:1.75,marginTop:12,color:"color-mix(in oklab,var(--foreground),transparent 8%)"}}>
                <strong>Verdict</strong>: <span style={{color:"var(--primary)"}}>Confiável</span> com monitoramento recomendado para futuros eventos de mixer.
              </p>
              <div style={{marginTop:18,paddingTop:14,borderTop:"1px solid var(--border)",display:"flex",gap:16,fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",flexWrap:"wrap"}}>
                <span>model: <span style={{color:"var(--foreground)"}}>gpt-5</span></span>
                <span>prompt: <span style={{color:"var(--foreground)"}}>trust-v3.2</span></span>
                <span>tokens: <span style={{color:"var(--foreground)"}}>1,248</span></span>
                <span>latência: <span style={{color:"var(--foreground)"}}>2.1s</span></span>
              </div>
            </Card>
          </div>

          {/* Breakdown bars */}
          <Card style={{padding:22}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
              <Eyebrow>BREAKDOWN POR DIMENSÃO</Eyebrow>
              <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>6 dimensões · 0-100 cada</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
              {BREAKDOWN.map((b,i) => (
                <div key={b.label}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:6}}>
                    <span style={{fontFamily:"var(--font-heading)",fontSize:10,letterSpacing:"0.2em",color:"var(--muted-foreground)",textTransform:"uppercase"}}>{b.label}</span>
                    <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:14,color:b.color}}>{b.value}</span>
                  </div>
                  <div style={{height:6,borderRadius:999,background:"color-mix(in oklab, var(--foreground), transparent 94%)",overflow:"hidden"}}>
                    <div style={{height:"100%",width:`${b.value}%`,background:b.color,borderRadius:999,boxShadow:`0 0 8px ${b.color}`,transition:"width 1s cubic-bezier(0.4,0,0.2,1)"}}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Factors */}
          <Card variant="glass" style={{padding:24}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
              <Eyebrow>FATORES DETECTADOS</Eyebrow>
              <div style={{display:"flex",gap:12,fontSize:11,fontFamily:"var(--font-mono)",color:"var(--muted-foreground)"}}>
                <span>{FACTORS_POS.length} positivos</span>
                <span>·</span>
                <span>{FACTORS_NEG.length} riscos</span>
              </div>
            </div>
            <p style={{fontSize:12,color:"var(--muted-foreground)",marginTop:4,marginBottom:20}}>Sinais concretos que o pipeline de IA extraiu dos dados on-chain.</p>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              <div>
                <Eyebrow style={{color:"oklch(0.69 0.19 162)",fontSize:10,marginBottom:12,letterSpacing:"0.2em"}}>✓ FATORES POSITIVOS</Eyebrow>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {FACTORS_POS.map((f,i)=>(
                    <div key={i} style={{padding:"12px 14px",borderRadius:10,background:"oklch(0.69 0.19 162 / 5%)",border:"1px solid oklch(0.69 0.19 162 / 18%)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:12.5,fontWeight:600}}>{f.title}</span>
                        <Badge variant="outline" style={{fontSize:10,color:"oklch(0.69 0.19 162)",borderColor:"oklch(0.69 0.19 162 / 30%)",fontFamily:"var(--font-mono)"}}>{f.pts>0?"+":""}{f.pts} pts</Badge>
                      </div>
                      <div style={{fontSize:11.5,lineHeight:1.5,color:"var(--muted-foreground)"}}>{f.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <Eyebrow style={{color:"var(--destructive)",fontSize:10,marginBottom:12,letterSpacing:"0.2em"}}>△ FATORES DE RISCO</Eyebrow>
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  {FACTORS_NEG.map((f,i)=>(
                    <div key={i} style={{padding:"12px 14px",borderRadius:10,background:"oklch(0.63 0.24 28 / 5%)",border:"1px solid oklch(0.63 0.24 28 / 18%)"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                        <span style={{fontSize:12.5,fontWeight:600}}>{f.title}</span>
                        <Badge variant="outline" style={{fontSize:10,color:"var(--destructive)",borderColor:"oklch(0.63 0.24 28 / 30%)",fontFamily:"var(--font-mono)"}}>{f.pts} pts</Badge>
                      </div>
                      <div style={{fontSize:11.5,lineHeight:1.5,color:"var(--muted-foreground)"}}>{f.detail}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>

          {/* Summary strip */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:14}}>
            {[
              ["Score",`${animScore}/100`, "var(--primary)"],
              ["Confiança",`${animConf}%`, "var(--accent)"],
              ["Verdict","Confiável","oklch(0.69 0.19 162)"],
              ["Latência","2.1s","var(--foreground)"],
            ].map(([l,v,c]) => (
              <Card variant="dim" style={{padding:"14px 18px"}} key={l}>
                <Eyebrow style={{fontSize:9,opacity:.6}}>{l}</Eyebrow>
                <div style={{fontFamily:"var(--font-heading)",fontSize:18,fontWeight:700,marginTop:6,color:c}}>{v}</div>
              </Card>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <aside style={{display:"flex",flexDirection:"column",gap:16}}>
          {/* Checklist */}
          <Card style={{padding:18}}>
            <Eyebrow style={{fontSize:10,marginBottom:14}}>PIPELINE</Eyebrow>
            <ul style={{listStyle:"none",padding:0,margin:0,display:"flex",flexDirection:"column",gap:10}}>
              {STAGES.map((s,i) => (
                <li key={s.id} style={{display:"flex",alignItems:"center",gap:10,fontSize:12}}>
                  <span style={{width:18,height:18,borderRadius:999,background:"oklch(0.69 0.19 162 / 15%)",color:"oklch(0.69 0.19 162)",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    <span style={{width:10,height:10}}><I.check sw={3.5}/></span>
                  </span>
                  <span style={{flex:1,color:"var(--foreground)"}}>{s.label}</span>
                  <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>{(0.1 + i*0.25).toFixed(1)}s</span>
                </li>
              ))}
            </ul>
          </Card>

          {/* Quick stats */}
          <Card style={{padding:18}}>
            <Eyebrow style={{fontSize:10,marginBottom:14}}>DADOS ON-CHAIN</Eyebrow>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              {[
                ["Idade da carteira","3 anos, 2 meses"],
                ["Transações","4,218"],
                ["Contrapartes únicas","47"],
                ["Balance total","$284k"],
                ["Primeiro tx","2022-02-14"],
                ["Último tx","há 6 horas"],
              ].map(([l,v]) => (
                <div key={l} style={{display:"flex",justifyContent:"space-between",fontSize:12}}>
                  <span style={{color:"var(--muted-foreground)"}}>{l}</span>
                  <span style={{fontFamily:"var(--font-mono)",color:"var(--foreground)"}}>{v}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Warning */}
          <Card variant="dim" style={{padding:18,border:"1px solid color-mix(in oklab, var(--primary), transparent 75%)"}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:8}}>
              <span style={{width:14,height:14,color:"var(--primary)"}}><I.alert sw={2}/></span>
              <Eyebrow style={{fontSize:10,color:"var(--primary)"}}>O QUE OBSERVAR</Eyebrow>
            </div>
            <p style={{fontSize:12,lineHeight:1.6,color:"var(--muted-foreground)",margin:0}}>
              Score alto indica confiança geral, mas verifique sempre os fatores de risco, histórico de mixers e concentração antes de grandes transações.
            </p>
          </Card>
        </aside>
      </div>
    );
  }

  // ── Main screen wrapper ────────────────────────────────────────────
  function NewAnalysis({ initial="input" }) {
    const [state, setState] = useState(initial); // "input" | "pipeline" | "result"
    const [chain, setChain] = useState("ethereum");
    const [addr, setAddr]   = useState("");
    const [error, setError] = useState("");

    useEffect(() => { setState(initial); }, [initial]);

    const validate = () => {
      if (!addr.trim()) { setError("Endereço obrigatório."); return false; }
      if (chain === "ethereum" && !/^0x[a-fA-F0-9]{40}$/.test(addr.trim())) {
        setError("Endereço inválido. Use formato 0x com 40 caracteres hex."); return false;
      }
      setError(""); return true;
    };

    const onAnalyze = () => {
      if (!validate()) return;
      setState("pipeline");
    };

    if (state === "pipeline") {
      return <PipelinePanel chain={chain} address={addr||"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"} onComplete={()=>setState("result")} onCancel={()=>setState("input")}/>;
    }
    if (state === "result") {
      return <ResultPanel chain={chain} address={addr||"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"} onBack={()=>setState("input")} onReanalyze={()=>{setState("pipeline");}}/>;
    }
    return <InputPanel chain={chain} setChain={setChain} addr={addr} setAddr={setAddr} onAnalyze={onAnalyze} error={error}/>;
  }

  return { NewAnalysis };
})());
