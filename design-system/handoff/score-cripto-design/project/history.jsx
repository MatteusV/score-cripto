Object.assign(window, (function () {
  const { useState, useMemo } = React;
  const { I, Btn, Badge, StatusPill, ChainBlock, Card, Eyebrow } = window;

  // ── Mock data ──────────────────────────────────────────────────────
  const ADDR_POOL = [
    ["0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", "vitalik.eth"],
    ["0x742d35Cc6634C0532925a3b844Bc9e7595f4e2bc", null],
    ["bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", "Cold wallet"],
    ["0x00000000219ab540356cBB839Cbe05303d7705Fa", "Beacon Deposit"],
    ["9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", "Mixer suspect"],
    ["0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13", null],
    ["0x28C6c06298d514Db089934071355E5743bf21d60", "Binance 14"],
    ["0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", "Uniswap token"],
    ["0xdAC17F958D2ee523a2206206994597C13D831ec7", "Tether USDT"],
    ["0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", "USDC"],
    ["bc1p0xlxvlhemja6c4dqv22uapctqupfhlxm9h8z3k", null],
    ["0x388C818CA8B9251b393131C08a736A67ccB19297", "Lido Exec"],
    ["0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", "Binance 7"],
    ["0x503828976D22510aad0201ac7EC88293211D23Da", "Coinbase 2"],
    ["0x2f60D06Fa05Cb1B5533D4C1DA9D8A1B4BaBB6aB0", null],
    ["0x467d543e5e4e41aeddf3b6d1997350dd9820a173", null],
    ["9LnrBeiNQ2oGRcRGdQxRkjJE2W5qf1U1rWaYgKvRpHwQ", null],
    ["0xBa12222222228d8Ba445958a75a0704d566BF2C8", "Balancer Vault"],
  ];
  const CHAINS = ["ethereum","bitcoin","polygon","solana","arbitrum","optimism","avalanche"];
  const TAGS = [
    null, "Exchange", "Contrato", "Mixer", "Bridge", "DeFi", "Whale", "NFT", "Airdrop",
  ];
  const REASONS = [
    "Histórico consistente, diversidade DeFi acima da média, sem presença em listas.",
    "Interação com mixer detectada em outubro; padrão posterior sugere uso isolado.",
    "Alta concentração em único token; movimentações sincronizadas sugerem atividade de whale.",
    "Múltiplas transações em janela curta com contraparte sancionada. Bloqueio recomendado.",
    "Carteira recém-criada com volume desproporcional; padrão típico de airdrop farming.",
    "Contraparte conhecida de exchange institucional; operações dentro do esperado.",
    "Bridge ativa com liquidez balanceada; sem sinais de fluxo suspeito.",
    "Peak de atividade 24h atípico; requer monitoramento manual adicional.",
  ];

  const seed = (i) => ((i*9301 + 49297) % 233280) / 233280;
  function genRow(i) {
    const r = seed(i);
    const r2 = seed(i+91);
    const r3 = seed(i+231);
    const [addr, label] = ADDR_POOL[Math.floor(r*ADDR_POOL.length)];
    const chain = CHAINS[Math.floor(r2*CHAINS.length)];
    const score = Math.floor(5 + r3*94);
    const verdict = score>=70 ? "trusted" : score>=40 ? "attention" : "risk";
    const days = Math.floor(r*40);
    const hours = Math.floor(r2*23);
    const mins = Math.floor(r3*59);
    const when = days > 0 ? `há ${days}d` : hours > 0 ? `há ${hours}h` : `há ${mins} min`;
    const confidence = Math.floor(78 + r*22);
    const reason = REASONS[i % REASONS.length];
    const tag = TAGS[Math.floor(r3*TAGS.length)];
    const starred = (i*7) % 11 === 0;
    return { id:`scn-${String(10480-i).padStart(5,"0")}`, addr, label, chain, score, verdict, when, days, confidence, reason, tag, starred };
  }
  const ALL = Array.from({length: 128}, (_,i) => genRow(i));

  const verdictCounts = ALL.reduce((a,r)=>{ a[r.verdict]=(a[r.verdict]||0)+1; return a;}, {});
  const chainCounts = ALL.reduce((a,r)=>{ a[r.chain]=(a[r.chain]||0)+1; return a;}, {});

  // ── Row ────────────────────────────────────────────────────────────
  function Row({ r, expanded, onToggle }) {
    const pct = r.score;
    const color = pct>=70 ? "var(--primary)" : pct>=40 ? "oklch(0.74 0.16 85)" : "var(--destructive)";
    return (
      <>
        <div onClick={onToggle} style={{
          display:"grid",
          gridTemplateColumns:"36px 52px 1.6fr 90px 200px 1fr 110px 70px 60px",
          alignItems:"center",gap:16,padding:"14px 18px",
          borderBottom: expanded ? "1px solid transparent" : "1px solid var(--border)",
          cursor:"pointer",transition:"background .15s",
          background: expanded ? "color-mix(in oklab, var(--primary), transparent 94%)" : "transparent",
        }}
        onMouseEnter={e=>{if(!expanded)e.currentTarget.style.background="color-mix(in oklab, var(--foreground), transparent 96%)";}}
        onMouseLeave={e=>{if(!expanded)e.currentTarget.style.background="transparent";}}>
          <button onClick={e=>{e.stopPropagation();}} style={{width:24,height:24,border:"none",background:"transparent",cursor:"pointer",color: r.starred?"var(--primary)":"var(--muted-foreground)",display:"flex",alignItems:"center",justifyContent:"center",opacity:r.starred?1:.4}}>
            <svg viewBox="0 0 24 24" width="13" height="13" fill={r.starred?"currentColor":"none"} stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
          <ChainBlock chain={r.chain} size="sm"/>
          <div style={{minWidth:0}}>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
              <span style={{fontSize:13,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:200}}>
                {r.label || `${r.addr.slice(0,8)}…${r.addr.slice(-6)}`}
              </span>
              {r.tag && <Badge variant="outline" style={{fontSize:9,padding:"1px 6px",fontFamily:"var(--font-sans)"}}>{r.tag}</Badge>}
            </div>
            <div style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--muted-foreground)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.addr}</div>
          </div>
          {/* Score */}
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:20,color,lineHeight:1}}>{r.score}</div>
            <div style={{fontSize:9,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",lineHeight:1.2}}>/100<br/>{r.confidence}%</div>
          </div>
          {/* Bar */}
          <div style={{height:4,borderRadius:999,background:"color-mix(in oklab, var(--foreground), transparent 94%)",overflow:"hidden"}}>
            <div style={{height:"100%",width:`${r.score}%`,background:color,boxShadow:`0 0 8px ${color}`}}/>
          </div>
          <StatusPill verdict={r.verdict} pulse={false}/>
          <span style={{fontFamily:"var(--font-mono)",fontSize:11,color:"var(--muted-foreground)"}}>{r.when}</span>
          <span style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--muted-foreground)"}}>{r.id}</span>
          <div style={{display:"flex",gap:2,justifyContent:"flex-end"}}>
            <button onClick={e=>e.stopPropagation()} title="Recalcular" style={{width:26,height:26,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--muted-foreground)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{width:11,height:11}}><I.refresh/></span>
            </button>
            <span style={{width:22,height:26,display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted-foreground)",transform:expanded?"rotate(90deg)":"rotate(0)",transition:"transform .2s"}}>
              <span style={{width:12,height:12}}><I.arrow sw={2}/></span>
            </span>
          </div>
        </div>
        {expanded && (
          <div style={{padding:"4px 18px 20px 106px",borderBottom:"1px solid var(--border)",background:"color-mix(in oklab, var(--primary), transparent 94%)"}}>
            <div style={{display:"grid",gridTemplateColumns:"1.4fr 1fr 1fr",gap:16}}>
              <div style={{padding:14,borderRadius:12,background:"color-mix(in oklab, var(--card), transparent 30%)",border:"1px solid var(--border)"}}>
                <Eyebrow style={{fontSize:9,marginBottom:8}}>REASONING (v3.2)</Eyebrow>
                <p style={{fontSize:12,lineHeight:1.6,margin:0,color:"color-mix(in oklab,var(--foreground),transparent 10%)"}}>{r.reason}</p>
              </div>
              <div style={{padding:14,borderRadius:12,background:"color-mix(in oklab, var(--card), transparent 30%)",border:"1px solid var(--border)"}}>
                <Eyebrow style={{fontSize:9,marginBottom:10}}>BREAKDOWN</Eyebrow>
                <div style={{display:"flex",flexDirection:"column",gap:6}}>
                  {[["Histórico",Math.min(100,r.score+8)],["Sanções",r.verdict==="risk"?30:100],["DeFi",Math.max(20,r.score-6)],["Mixers",r.verdict==="risk"?20:r.verdict==="attention"?55:85]].map(([l,v])=>(
                    <div key={l} style={{display:"flex",alignItems:"center",gap:8,fontSize:10.5,fontFamily:"var(--font-mono)"}}>
                      <span style={{width:60,color:"var(--muted-foreground)"}}>{l}</span>
                      <div style={{flex:1,height:3,background:"color-mix(in oklab,var(--foreground),transparent 94%)",borderRadius:999,overflow:"hidden"}}>
                        <div style={{height:"100%",width:`${v}%`,background: v>=70?"var(--primary)":v>=40?"oklch(0.74 0.16 85)":"var(--destructive)"}}/>
                      </div>
                      <span style={{width:24,textAlign:"right",color:"var(--foreground)"}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{padding:14,borderRadius:12,background:"color-mix(in oklab, var(--card), transparent 30%)",border:"1px solid var(--border)",display:"flex",flexDirection:"column",gap:10}}>
                <Eyebrow style={{fontSize:9}}>AÇÕES</Eyebrow>
                <Btn variant="tinted" size="sm" icon={<I.search sw={2.5}/>}>Ver análise completa</Btn>
                <Btn variant="outline" size="sm" icon={<I.refresh/>}>Recalcular agora</Btn>
                <Btn variant="outline" size="sm" icon={<I.copy/>}>Copiar endereço</Btn>
                <Btn variant="ghost" size="sm">Adicionar à watchlist</Btn>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────
  function History() {
    const [query, setQuery] = useState("");
    const [verdict, setVerdict] = useState("all");
    const [chain, setChain] = useState("all");
    const [range, setRange] = useState("30d");
    const [sort, setSort] = useState("recent");
    const [expanded, setExpanded] = useState(new Set([2]));
    const [selected, setSelected] = useState(new Set());

    const filtered = useMemo(() => {
      let out = ALL.filter(r => {
        if (verdict !== "all" && r.verdict !== verdict) return false;
        if (chain !== "all" && r.chain !== chain) return false;
        if (range === "7d" && r.days > 7) return false;
        if (range === "30d" && r.days > 30) return false;
        if (query.trim()) {
          const q = query.toLowerCase();
          if (!r.addr.toLowerCase().includes(q) && !(r.label||"").toLowerCase().includes(q) && !r.id.includes(q)) return false;
        }
        return true;
      });
      if (sort === "score-high") out = [...out].sort((a,b)=>b.score-a.score);
      else if (sort === "score-low") out = [...out].sort((a,b)=>a.score-b.score);
      else if (sort === "risk") out = [...out].sort((a,b)=>a.score-b.score);
      return out;
    }, [query, verdict, chain, range, sort]);

    const toggle = (i) => {
      const next = new Set(expanded);
      next.has(i) ? next.delete(i) : next.add(i);
      setExpanded(next);
    };

    const VERDICTS = [
      ["all",   "Todos",     ALL.length, "var(--foreground)"],
      ["trusted",   "Confiável", verdictCounts.trusted||0, "oklch(0.69 0.19 162)"],
      ["attention", "Atenção",   verdictCounts.attention||0, "oklch(0.74 0.16 85)"],
      ["risk",      "Risco",     verdictCounts.risk||0, "var(--destructive)"],
    ];

    return (
      <div style={{padding:"28px 28px 48px"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",gap:16,flexWrap:"wrap",marginBottom:20}}>
          <div>
            <Eyebrow style={{marginBottom:8}}>HISTÓRICO</Eyebrow>
            <h1 style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:30,margin:0,letterSpacing:"0.01em"}}>
              <span style={{color:"var(--primary)"}}>{ALL.length}</span> análises
            </h1>
            <div style={{fontSize:12,color:"var(--muted-foreground)",marginTop:6}}>Tudo que você analisou até hoje — reasoning versionado e auditável.</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <Btn variant="outline" size="sm" icon={<I.arrow sw={2.5}/>}>Exportar CSV</Btn>
            <Btn variant="tinted" size="sm" icon={<I.search sw={2.5}/>}>Nova análise</Btn>
          </div>
        </div>

        {/* Verdict stat tabs */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
          {VERDICTS.map(([v,l,c,clr]) => (
            <button key={v} onClick={()=>setVerdict(v)} style={{
              textAlign:"left",padding:"16px 18px",borderRadius:14,cursor:"pointer",transition:"all .2s",
              border: verdict===v ? "1px solid var(--gold-ring)" : "1px solid var(--border)",
              background: verdict===v ? "color-mix(in oklab, var(--primary), transparent 90%)" : "var(--card)",
              boxShadow: verdict===v ? "inset 0 0 20px oklch(0.74 0.19 66 / 12%), 0 0 0 1px oklch(0.74 0.19 66 / 20%)" : "none",
            }}>
              <Eyebrow style={{fontSize:9,color: verdict===v ? "var(--primary)" : "var(--muted-foreground)"}}>{l}</Eyebrow>
              <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:6}}>
                <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:26,color:clr,lineHeight:1}}>{c}</span>
                <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>{Math.round(c/ALL.length*100)}%</span>
              </div>
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <Card variant="glass" style={{padding:"14px 18px",marginBottom:16,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
          <div style={{position:"relative",flex:"1 1 320px",minWidth:260}}>
            <span style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",width:14,height:14,color:"var(--muted-foreground)"}}><I.search/></span>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por endereço, label ou ID (scn-…)" style={{width:"100%",height:40,borderRadius:10,border:"1px solid var(--border)",background:"var(--input)",color:"var(--foreground)",padding:"0 36px",fontSize:12,outline:"none",fontFamily:"var(--font-mono)"}}/>
            {query && <button onClick={()=>setQuery("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",width:18,height:18,border:"none",background:"var(--muted)",borderRadius:999,color:"var(--muted-foreground)",cursor:"pointer",fontSize:11,lineHeight:1}}>×</button>}
          </div>
          {/* Chain */}
          <div style={{display:"flex",alignItems:"center",gap:6}}>
            <span style={{fontSize:10,fontFamily:"var(--font-heading)",letterSpacing:"0.2em",color:"var(--muted-foreground)",textTransform:"uppercase"}}>Chain</span>
            <select value={chain} onChange={e=>setChain(e.target.value)} style={{height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--input)",color:"var(--foreground)",padding:"0 10px",fontSize:11,fontFamily:"var(--font-mono)",cursor:"pointer"}}>
              <option value="all">Todas</option>
              {CHAINS.map(c=><option key={c} value={c}>{c} ({chainCounts[c]||0})</option>)}
            </select>
          </div>
          {/* Range */}
          <div style={{display:"flex",gap:2,padding:2,background:"var(--muted)",borderRadius:9,border:"1px solid var(--border)"}}>
            {[["7d","7 dias"],["30d","30 dias"],["all","Tudo"]].map(([v,l])=>(
              <button key={v} onClick={()=>setRange(v)} style={{padding:"5px 12px",borderRadius:7,border:"none",background: range===v?"var(--card)":"transparent",color: range===v?"var(--foreground)":"var(--muted-foreground)",fontSize:10.5,fontFamily:"var(--font-heading)",letterSpacing:"0.12em",textTransform:"uppercase",cursor:"pointer",fontWeight:600}}>{l}</button>
            ))}
          </div>
          {/* Sort */}
          <div style={{display:"flex",alignItems:"center",gap:6,marginLeft:"auto"}}>
            <span style={{fontSize:10,fontFamily:"var(--font-heading)",letterSpacing:"0.2em",color:"var(--muted-foreground)",textTransform:"uppercase"}}>Ordenar</span>
            <select value={sort} onChange={e=>setSort(e.target.value)} style={{height:32,borderRadius:8,border:"1px solid var(--border)",background:"var(--input)",color:"var(--foreground)",padding:"0 10px",fontSize:11,fontFamily:"var(--font-mono)",cursor:"pointer"}}>
              <option value="recent">Mais recentes</option>
              <option value="score-high">Score alto → baixo</option>
              <option value="score-low">Score baixo → alto</option>
              <option value="risk">Mais arriscadas</option>
            </select>
          </div>
        </Card>

        {/* Active filters strip */}
        {(query || verdict!=="all" || chain!=="all" || range!=="all") && (
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14,flexWrap:"wrap"}}>
            <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-heading)",letterSpacing:"0.2em",textTransform:"uppercase"}}>Filtros ativos:</span>
            {query && <Badge variant="outline" style={{fontSize:10}}>“{query}” <button onClick={()=>setQuery("")} style={{marginLeft:6,border:"none",background:"transparent",cursor:"pointer",color:"var(--muted-foreground)"}}>×</button></Badge>}
            {verdict!=="all" && <Badge variant="outline" style={{fontSize:10}}>{verdict} <button onClick={()=>setVerdict("all")} style={{marginLeft:6,border:"none",background:"transparent",cursor:"pointer",color:"var(--muted-foreground)"}}>×</button></Badge>}
            {chain!=="all" && <Badge variant="outline" style={{fontSize:10}}>{chain} <button onClick={()=>setChain("all")} style={{marginLeft:6,border:"none",background:"transparent",cursor:"pointer",color:"var(--muted-foreground)"}}>×</button></Badge>}
            {range!=="all" && <Badge variant="outline" style={{fontSize:10}}>{range} <button onClick={()=>setRange("all")} style={{marginLeft:6,border:"none",background:"transparent",cursor:"pointer",color:"var(--muted-foreground)"}}>×</button></Badge>}
            <button onClick={()=>{setQuery("");setVerdict("all");setChain("all");setRange("all");}} style={{fontSize:10,color:"var(--primary)",background:"transparent",border:"none",cursor:"pointer",fontFamily:"var(--font-heading)",letterSpacing:"0.2em",textTransform:"uppercase",marginLeft:4}}>Limpar tudo</button>
          </div>
        )}

        {/* Table */}
        <Card style={{padding:0,overflow:"hidden"}}>
          {/* Header row */}
          <div style={{
            display:"grid",gridTemplateColumns:"36px 52px 1.6fr 90px 200px 1fr 110px 70px 60px",
            alignItems:"center",gap:16,padding:"12px 18px",
            borderBottom:"1px solid var(--border)",
            background:"color-mix(in oklab, var(--card-2), transparent 40%)",
          }}>
            {["","CHAIN","ENDEREÇO","SCORE","","VERDICT","ANALISADA","ID",""].map((h,i) => (
              <Eyebrow key={i} style={{fontSize:9,letterSpacing:"0.25em",textAlign: i>=8 ? "right" : "left"}}>{h}</Eyebrow>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{padding:"60px 24px",textAlign:"center",color:"var(--muted-foreground)"}}>
              <div style={{width:56,height:56,margin:"0 auto 14px",borderRadius:16,background:"var(--muted)",display:"flex",alignItems:"center",justifyContent:"center",color:"var(--muted-foreground)"}}>
                <span style={{width:24,height:24}}><I.search/></span>
              </div>
              <div style={{fontSize:14,fontWeight:600,color:"var(--foreground)",marginBottom:4}}>Nenhum resultado</div>
              <div style={{fontSize:12}}>Ajuste os filtros ou limpe a busca.</div>
            </div>
          ) : filtered.map((r,idx) => (
            <Row key={r.id} r={r} expanded={expanded.has(idx)} onToggle={()=>toggle(idx)}/>
          ))}

          {/* Footer / pagination */}
          <div style={{padding:"14px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",borderTop:"1px solid var(--border)",background:"color-mix(in oklab, var(--card-2), transparent 60%)"}}>
            <div style={{fontSize:11,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>
              Mostrando <span style={{color:"var(--foreground)"}}>{filtered.length}</span> de {ALL.length} análises
            </div>
            <div style={{display:"flex",gap:4,alignItems:"center"}}>
              <Btn variant="outline" size="sm">← Anterior</Btn>
              {[1,2,3].map(n => (
                <button key={n} style={{width:30,height:30,borderRadius:8,border: n===1?"1px solid var(--gold-ring)":"1px solid var(--border)",background: n===1?"var(--primary-dim)":"transparent",color:n===1?"var(--primary)":"var(--muted-foreground)",fontFamily:"var(--font-mono)",fontSize:11,cursor:"pointer",fontWeight:600}}>{n}</button>
              ))}
              <span style={{color:"var(--muted-foreground)",fontSize:11,padding:"0 6px"}}>…</span>
              <button style={{width:30,height:30,borderRadius:8,border:"1px solid var(--border)",background:"transparent",color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",fontSize:11,cursor:"pointer"}}>9</button>
              <Btn variant="outline" size="sm">Próxima →</Btn>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return { History };
})());
