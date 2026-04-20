Object.assign(window, (function () {
  const { useState, useMemo } = React;
  const { I, Btn, Badge, StatusPill, ChainBlock, Card, Eyebrow } = window;

  // ── Curated data ───────────────────────────────────────────────────
  const TRENDING = [
    { addr:"0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045", label:"vitalik.eth", chain:"ethereum", score:82, verdict:"trusted", delta:"+2", lookups:"4.1k", reason:"Movimento ETH → stablecoins nas últimas 24h; atividade on-chain aumentou 38%." },
    { addr:"0x00000000219ab540356cBB839Cbe05303d7705Fa", label:"Beacon Deposit", chain:"ethereum", score:98, verdict:"trusted", delta:"0",  lookups:"3.8k", reason:"Contrato oficial; volume estável. Entrada no top por alto interesse." },
    { addr:"0x742d35Cc6634C0532925a3b844Bc9e7595f4e2bc", label:null, chain:"polygon", score:45, verdict:"attention", delta:"-12", lookups:"2.4k", reason:"Pico de atividade com 3 novas contrapartes de alto risco. Investigação em curso." },
    { addr:"9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", label:"Mixer suspect", chain:"solana", score:22, verdict:"risk", delta:"-8", lookups:"1.9k", reason:"Dois hops até endereço em lista OFAC. Múltiplos relatos da comunidade." },
    { addr:"0xBa12222222228d8Ba445958a75a0704d566BF2C8", label:"Balancer Vault", chain:"ethereum", score:88, verdict:"trusted", delta:"+1", lookups:"1.6k", reason:"Protocolo verificado; picos de TVL após novo pool." },
    { addr:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", label:"Cold wallet", chain:"bitcoin", score:68, verdict:"attention", delta:"+4", lookups:"1.2k", reason:"Retirada de 340 BTC após 2 anos dormindo." },
  ];

  const LEADERBOARD = [
    { rank:1, addr:"0x00000000219ab540356cBB839Cbe05303d7705Fa", label:"Beacon Deposit", chain:"ethereum", score:98, note:"Infraestrutura Ethereum" },
    { rank:2, addr:"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", label:"Circle · USDC", chain:"ethereum", score:96, note:"Issuer verificado" },
    { rank:3, addr:"0xBa12222222228d8Ba445958a75a0704d566BF2C8", label:"Balancer Vault", chain:"ethereum", score:94, note:"Protocolo auditado" },
    { rank:4, addr:"0x388C818CA8B9251b393131C08a736A67ccB19297", label:"Lido Exec", chain:"ethereum", score:93, note:"Staking líquido" },
    { rank:5, addr:"0xBE0eB53F46cd790Cd13851d5EFf43D12404d33E8", label:"Binance 7", chain:"ethereum", score:91, note:"Exchange custodial" },
    { rank:6, addr:"bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh", label:"Satoshi-era wallet", chain:"bitcoin", score:89, note:"Carteira histórica" },
    { rank:7, addr:"0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984", label:"Uniswap Token", chain:"ethereum", score:88, note:"Governance token" },
  ];

  const RISK = [
    { addr:"0x8589427373D6D84E98730D7795D8f6f8731FDA16", label:"Tornado Router", chain:"ethereum", score:8,  why:"Sancionado OFAC · 2022-08-08" },
    { addr:"bc1qw4g4...5xj8q", label:"CSAM-linked", chain:"bitcoin", score:11, why:"Múltiplos reports comunitários + law enforcement flag" },
    { addr:"9LnrBeiNQ2oGRcRGdQxRkjJE2W5qf1U1rWaYgKvRpHwQ", label:null, chain:"solana", score:16, why:"Hop único até endereço sancionado; criado há 18 dias" },
    { addr:"0xae2Fc483527B8EF99EB5D9B44875F005ba1FaE13", label:null, chain:"ethereum", score:22, why:"Pattern de wash-trading em DEX; 94% contraparte circular" },
    { addr:"0x467d543e5e4e41aeddf3b6d1997350dd9820a173", label:null, chain:"polygon", score:27, why:"Farm de airdrop sybil; 11 wallets correlacionadas" },
  ];

  const CATEGORIES = [
    { id:"exchange",   label:"Exchanges",       count:412, icon:<I.card/>,    color:"oklch(0.60 0.17 253)", desc:"CEX custodiais · hot & cold wallets verificadas" },
    { id:"defi",       label:"DeFi",            count:1843, icon:<I.brain/>,  color:"oklch(0.59 0.22 295)", desc:"Protocolos auditados · vaults · routers" },
    { id:"mixer",      label:"Mixers",          count:87,  icon:<I.zap/>,     color:"oklch(0.63 0.24 28)",  desc:"Tornado · Wasabi · Samourai · proxies" },
    { id:"sanctions",  label:"Sanções",         count:2410,icon:<I.alert/>,   color:"oklch(0.63 0.24 28)",  desc:"OFAC · UK HMT · EU consolidated" },
    { id:"bridge",     label:"Bridges",         count:64,  icon:<I.arrow/>,   color:"oklch(0.74 0.16 85)",  desc:"Wormhole · Across · Stargate · LayerZero" },
    { id:"nft",        label:"NFT",             count:512, icon:<I.compass/>, color:"oklch(0.74 0.19 66)",  desc:"Marketplaces · creator contracts · royalty splitters" },
    { id:"stablecoin", label:"Stablecoins",     count:18,  icon:<I.shield/>,  color:"oklch(0.69 0.19 162)", desc:"USDC · USDT · DAI · PYUSD · issuers" },
    { id:"whale",      label:"Whales",          count:240, icon:<I.wallet/>,  color:"oklch(0.74 0.19 66)",  desc:"Carteiras com >$10M em movimentação anual" },
  ];

  const TAGS = ["Tornado Cash", "Binance", "Coinbase", "Lido", "Uniswap v4", "Aave", "Curve", "OFAC 2024", "Chicago Exchange", "Base L2", "Solana DeFi", "Ordinals", "CEX deposit", "MEV bot", "Flashloan"];

  const RECENT_SEARCHES = [
    { q:"vitalik.eth",      results:1,  when:"há 4 min" },
    { q:"tornado cash",     results:14, when:"há 2h"    },
    { q:"coinbase prime",   results:7,  when:"há 8h"    },
    { q:"0x742d35Cc…e2bc",  results:1,  when:"ontem"    },
  ];

  // ── Sparkline ──────────────────────────────────────────────────────
  function Spark({ values, color, w=60, h=22 }) {
    const max = Math.max(...values), min = Math.min(...values);
    const d = values.map((v,i) => {
      const x = (i/(values.length-1))*w;
      const y = h - ((v-min)/(max-min||1))*h;
      return (i===0?"M":"L") + x.toFixed(1) + "," + y.toFixed(1);
    }).join(" ");
    return (
      <svg width={w} height={h}>
        <path d={d} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────
  function Explore() {
    const [q, setQ] = useState("");
    const [tab, setTab] = useState("trending"); // trending | risk | leaderboard
    const [chainFilter, setChainFilter] = useState("all");

    const trendingFiltered = TRENDING.filter(r => chainFilter==="all" || r.chain===chainFilter);

    return (
      <div style={{padding:"28px 28px 48px"}}>
        {/* Hero search */}
        <Card variant="glow" style={{padding:0,overflow:"hidden",position:"relative",marginBottom:24}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(70% 100% at 20% 0%, oklch(0.59 0.22 295 / 16%), transparent 60%), radial-gradient(60% 90% at 100% 100%, oklch(0.74 0.19 66 / 12%), transparent 60%)",pointerEvents:"none"}}/>
          <div style={{position:"relative",padding:"36px 36px 28px"}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:14}}>
              <span style={{width:32,height:32,borderRadius:10,background:"var(--accent-dim)",border:"1px solid color-mix(in oklab,var(--accent),transparent 70%)",color:"var(--accent)",display:"inline-flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{width:16,height:16}}><I.compass sw={2.5}/></span>
              </span>
              <Eyebrow style={{color:"var(--accent)"}}>EXPLORAR</Eyebrow>
            </div>
            <h1 style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:32,letterSpacing:"0.01em",margin:0,lineHeight:1.1}}>
              Descubra carteiras, <span style={{color:"var(--accent)",textShadow:"0 0 28px oklch(0.59 0.22 295 / 45%)"}}>entidades</span> e padrões on-chain
            </h1>
            <p style={{fontSize:13.5,lineHeight:1.6,color:"var(--muted-foreground)",marginTop:10,maxWidth:620}}>
              2.4M endereços indexados em 7 redes. Busque por label, endereço, categoria ou descubra o que está em alta na comunidade.
            </p>

            <div style={{marginTop:22,position:"relative"}}>
              <span style={{position:"absolute",left:18,top:"50%",transform:"translateY(-50%)",width:18,height:18,color:"var(--muted-foreground)"}}><I.search sw={2}/></span>
              <input
                value={q}
                onChange={e=>setQ(e.target.value)}
                placeholder="Buscar por endereço, label, ENS, domain, categoria…"
                style={{width:"100%",height:56,borderRadius:14,border:"1px solid var(--border)",background:"var(--input)",color:"var(--foreground)",padding:"0 120px 0 52px",fontFamily:"var(--font-mono)",fontSize:14,outline:"none"}}
              />
              <div style={{position:"absolute",right:12,top:"50%",transform:"translateY(-50%)",display:"flex",alignItems:"center",gap:6}}>
                <Badge variant="outline" style={{fontSize:10,fontFamily:"var(--font-mono)"}}>⌘ K</Badge>
                <Btn variant="primary" size="sm" icon={<I.arrow sw={2.5}/>}>Buscar</Btn>
              </div>
            </div>

            {/* Suggested tags */}
            <div style={{marginTop:16,display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              <span style={{fontSize:10,fontFamily:"var(--font-heading)",letterSpacing:"0.3em",color:"var(--muted-foreground)",textTransform:"uppercase"}}>Sugeridos</span>
              {TAGS.slice(0,9).map(t => (
                <button key={t} onClick={()=>setQ(t)} style={{padding:"4px 10px",borderRadius:999,border:"1px solid var(--border)",background:"transparent",color:"var(--muted-foreground)",fontSize:11,cursor:"pointer",fontFamily:"var(--font-sans)",transition:"all .15s"}}
                  onMouseEnter={e=>{e.currentTarget.style.color="var(--foreground)";e.currentTarget.style.borderColor="var(--gold-ring)";}}
                  onMouseLeave={e=>{e.currentTarget.style.color="var(--muted-foreground)";e.currentTarget.style.borderColor="var(--border)";}}>{t}</button>
              ))}
            </div>
          </div>

          {/* Stats strip */}
          <div style={{position:"relative",borderTop:"1px solid var(--border)",background:"color-mix(in oklab, var(--card-2), transparent 50%)",padding:"16px 36px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:24}}>
            {[
              ["2.4M",  "endereços indexados", "var(--primary)"],
              ["7",     "blockchains",          "var(--accent)"],
              ["2,410", "sancionados (OFAC)",   "var(--destructive)"],
              ["24h",   "refresh contínuo",     "oklch(0.69 0.19 162)"],
            ].map(([v,l,c],i) => (
              <div key={i} style={{display:"flex",flexDirection:"column",gap:2}}>
                <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:22,color:c,lineHeight:1}}>{v}</div>
                <div style={{fontSize:11,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>{l}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Categories grid */}
        <div style={{marginBottom:28}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
            <Eyebrow>CATEGORIAS · NAVEGAR POR ENTIDADE</Eyebrow>
            <span style={{fontSize:11,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>{CATEGORIES.reduce((s,c)=>s+c.count,0).toLocaleString()} endereços</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>
            {CATEGORIES.map(c => (
              <button key={c.id} style={{
                textAlign:"left",padding:18,borderRadius:16,border:"1px solid var(--border)",background:"var(--card)",cursor:"pointer",transition:"all .2s",position:"relative",overflow:"hidden",
              }}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=c.color; e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 8px 24px -12px ${c.color}`;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor="var(--border)"; e.currentTarget.style.transform="translateY(0)"; e.currentTarget.style.boxShadow="none";}}>
                <div style={{position:"absolute",top:-20,right:-20,width:80,height:80,borderRadius:"50%",background:`radial-gradient(circle, ${c.color}22, transparent 70%)`,pointerEvents:"none"}}/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                  <span style={{width:36,height:36,borderRadius:10,background:`color-mix(in oklab, ${c.color}, transparent 85%)`,color:c.color,display:"flex",alignItems:"center",justifyContent:"center"}}>
                    <span style={{width:16,height:16}}>{c.icon}</span>
                  </span>
                  <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:16,color:c.color}}>{c.count.toLocaleString()}</span>
                </div>
                <div style={{fontSize:13.5,fontWeight:600,marginBottom:4}}>{c.label}</div>
                <div style={{fontSize:11,color:"var(--muted-foreground)",lineHeight:1.4}}>{c.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Content layout */}
        <div style={{display:"grid",gridTemplateColumns:"1fr 320px",gap:24}}>
          <div style={{display:"flex",flexDirection:"column",gap:20}}>
            {/* Tabs */}
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:2,padding:3,background:"var(--muted)",borderRadius:11,border:"1px solid var(--border)"}}>
                {[
                  ["trending","🔥 Trending","var(--primary)"],
                  ["risk","△ Risk list","var(--destructive)"],
                  ["leaderboard","↑ Top score","oklch(0.69 0.19 162)"],
                ].map(([v,l,c])=>(
                  <button key={v} onClick={()=>setTab(v)} style={{
                    padding:"8px 16px",borderRadius:9,border:"none",
                    background: tab===v?"var(--card)":"transparent",
                    color: tab===v?c:"var(--muted-foreground)",
                    fontSize:12,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-sans)",transition:"all .15s",
                    boxShadow: tab===v?"0 1px 3px oklch(0 0 0 / 20%)":"none",
                  }}>{l}</button>
                ))}
              </div>
              {tab==="trending" && (
                <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
                  {["all","ethereum","bitcoin","polygon","solana"].map(c=>(
                    <button key={c} onClick={()=>setChainFilter(c)} style={{
                      padding:"5px 11px",borderRadius:8,border: chainFilter===c?"1px solid var(--gold-ring)":"1px solid var(--border)",
                      background: chainFilter===c?"var(--primary-dim)":"transparent",color: chainFilter===c?"var(--primary)":"var(--muted-foreground)",
                      fontSize:10.5,fontFamily:"var(--font-heading)",letterSpacing:"0.15em",textTransform:"uppercase",cursor:"pointer",fontWeight:600,
                    }}>{c==="all"?"Todas":c}</button>
                  ))}
                </div>
              )}
            </div>

            {/* TRENDING */}
            {tab==="trending" && (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {trendingFiltered.map((t,i) => {
                  const color = t.score>=70?"var(--primary)":t.score>=40?"oklch(0.74 0.16 85)":"var(--destructive)";
                  const deltaNum = parseInt(t.delta);
                  const deltaColor = deltaNum>0?"oklch(0.69 0.19 162)":deltaNum<0?"var(--destructive)":"var(--muted-foreground)";
                  const sparkData = Array.from({length:12},(_,x)=>Math.sin(i+x*0.6)*10 + t.score + (x*deltaNum/8));
                  return (
                    <Card key={i} style={{padding:18,display:"grid",gridTemplateColumns:"28px 44px 1fr 140px 110px 110px auto",alignItems:"center",gap:14}}>
                      <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:13,color:"var(--muted-foreground)",textAlign:"center"}}>#{i+1}</span>
                      <ChainBlock chain={t.chain} size="sm"/>
                      <div style={{minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:3}}>
                          <span style={{fontSize:13,fontWeight:600}}>{t.label || `${t.addr.slice(0,8)}…${t.addr.slice(-6)}`}</span>
                          <StatusPill verdict={t.verdict} pulse={false}/>
                        </div>
                        <div style={{fontSize:11,color:"var(--muted-foreground)",lineHeight:1.45,textWrap:"pretty"}}>{t.reason}</div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <Spark values={sparkData} color={color}/>
                        <div>
                          <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:18,color,lineHeight:1}}>{t.score}</div>
                          <div style={{fontSize:9,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>score</div>
                        </div>
                      </div>
                      <div style={{display:"flex",alignItems:"center",gap:6}}>
                        <span style={{fontFamily:"var(--font-mono)",fontSize:13,fontWeight:700,color:deltaColor}}>
                          {deltaNum>0?"↑":deltaNum<0?"↓":"·"}{t.delta!=="0"?Math.abs(deltaNum):""}
                        </span>
                        <span style={{fontSize:10,color:"var(--muted-foreground)"}}>24h</span>
                      </div>
                      <div style={{fontSize:11,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>
                        <div style={{color:"var(--foreground)",fontWeight:600,fontSize:13}}>{t.lookups}</div>
                        <div>consultas 24h</div>
                      </div>
                      <Btn variant="outline" size="sm" icon={<I.arrow sw={2.5}/>}>Ver</Btn>
                    </Card>
                  );
                })}
              </div>
            )}

            {/* RISK */}
            {tab==="risk" && (
              <Card style={{padding:0,overflow:"hidden"}}>
                <div style={{padding:"14px 18px",background:"color-mix(in oklab, var(--destructive), transparent 92%)",borderBottom:"1px solid color-mix(in oklab, var(--destructive), transparent 70%)",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{width:16,height:16,color:"var(--destructive)"}}><I.alert sw={2.5}/></span>
                  <Eyebrow style={{color:"var(--destructive)"}}>CARTEIRAS DE RISCO EM ALTA</Eyebrow>
                  <div style={{flex:1}}/>
                  <span style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>atualizado há 6 min</span>
                </div>
                {RISK.map((r,i) => (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"44px 52px 1fr auto auto",alignItems:"center",gap:14,padding:"14px 18px",borderBottom: i<RISK.length-1 ? "1px solid var(--border)":"none"}}>
                    <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:24,color:"var(--destructive)",textAlign:"center",lineHeight:1}}>{r.score}</div>
                    <ChainBlock chain={r.chain} size="sm"/>
                    <div style={{minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:13,fontWeight:600}}>{r.label || `${r.addr.slice(0,10)}…${r.addr.slice(-6)}`}</span>
                        <Badge variant="outline" style={{fontSize:9,color:"var(--destructive)",borderColor:"color-mix(in oklab,var(--destructive),transparent 60%)",fontFamily:"var(--font-sans)"}}>Alto risco</Badge>
                      </div>
                      <div style={{fontSize:11,color:"var(--muted-foreground)",marginTop:3,fontFamily:"var(--font-mono)"}}>{r.addr.length>20?`${r.addr.slice(0,14)}…${r.addr.slice(-8)}`:r.addr} · {r.why}</div>
                    </div>
                    <Btn variant="ghost" size="sm">Reportar</Btn>
                    <Btn variant="outline" size="sm" icon={<I.arrow sw={2.5}/>}>Investigar</Btn>
                  </div>
                ))}
              </Card>
            )}

            {/* LEADERBOARD */}
            {tab==="leaderboard" && (
              <Card style={{padding:0,overflow:"hidden"}}>
                <div style={{padding:"14px 18px",background:"color-mix(in oklab, oklch(0.69 0.19 162), transparent 92%)",borderBottom:"1px solid color-mix(in oklab, oklch(0.69 0.19 162), transparent 70%)",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{width:16,height:16,color:"oklch(0.69 0.19 162)"}}><I.shield sw={2.5}/></span>
                  <Eyebrow style={{color:"oklch(0.69 0.19 162)"}}>TOP SCORES · CARTEIRAS E PROTOCOLOS</Eyebrow>
                </div>
                {LEADERBOARD.map((l,i) => (
                  <div key={i} style={{display:"grid",gridTemplateColumns:"48px 52px 1fr 200px 80px auto",alignItems:"center",gap:14,padding:"14px 18px",borderBottom: i<LEADERBOARD.length-1 ? "1px solid var(--border)":"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      {l.rank<=3 && <span style={{fontSize:15}}>{["🥇","🥈","🥉"][l.rank-1]}</span>}
                      <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:13,color:"var(--muted-foreground)"}}>#{l.rank}</span>
                    </div>
                    <ChainBlock chain={l.chain} size="sm"/>
                    <div style={{minWidth:0}}>
                      <div style={{fontSize:13,fontWeight:600}}>{l.label}</div>
                      <div style={{fontFamily:"var(--font-mono)",fontSize:10,color:"var(--muted-foreground)",marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{l.addr}</div>
                    </div>
                    <div style={{fontSize:11,color:"var(--muted-foreground)"}}>{l.note}</div>
                    <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:22,color:"oklch(0.69 0.19 162)",textAlign:"right",lineHeight:1}}>{l.score}</div>
                    <Btn variant="outline" size="sm">Detalhes</Btn>
                  </div>
                ))}
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <aside style={{display:"flex",flexDirection:"column",gap:16}}>
            <Card style={{padding:18}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
                <span style={{width:14,height:14,color:"var(--muted-foreground)"}}><I.clock/></span>
                <Eyebrow style={{fontSize:10}}>BUSCAS RECENTES</Eyebrow>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:2}}>
                {RECENT_SEARCHES.map((s,i)=>(
                  <button key={i} onClick={()=>setQ(s.q)} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 10px",borderRadius:10,border:"none",background:"transparent",cursor:"pointer",textAlign:"left"}}
                    onMouseEnter={e=>e.currentTarget.style.background="color-mix(in oklab, var(--foreground), transparent 95%)"}
                    onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                    <span style={{width:12,height:12,color:"var(--muted-foreground)"}}><I.search/></span>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontSize:12,fontWeight:500,color:"var(--foreground)",fontFamily:s.q.startsWith("0x")?"var(--font-mono)":"var(--font-sans)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.q}</div>
                      <div style={{fontSize:10,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",marginTop:2}}>{s.results} resultado{s.results!==1?"s":""} · {s.when}</div>
                    </div>
                  </button>
                ))}
              </div>
              <button style={{marginTop:10,fontSize:11,color:"var(--muted-foreground)",background:"transparent",border:"none",cursor:"pointer",fontFamily:"var(--font-heading)",letterSpacing:"0.2em",textTransform:"uppercase",padding:"6px 10px"}}>Limpar histórico →</button>
            </Card>

            <Card variant="glass" style={{padding:18}}>
              <Eyebrow style={{fontSize:10,marginBottom:12}}>DISTRIBUIÇÃO POR CHAIN</Eyebrow>
              <div style={{display:"flex",flexDirection:"column",gap:9}}>
                {[
                  ["ethereum", "Ethereum", 48, "oklch(0.60 0.17 253)"],
                  ["bitcoin",  "Bitcoin",  22, "oklch(0.74 0.16 85)"],
                  ["polygon",  "Polygon",  12, "oklch(0.59 0.22 295)"],
                  ["solana",   "Solana",   10, "oklch(0.69 0.19 162)"],
                  ["arbitrum", "Arbitrum", 5,  "oklch(0.60 0.17 253)"],
                  ["outros",   "Outros",   3,  "var(--muted-foreground)"],
                ].map(([id,l,pct,c])=>(
                  <div key={id}>
                    <div style={{display:"flex",justifyContent:"space-between",fontSize:11,marginBottom:4}}>
                      <span style={{color:"var(--foreground)"}}>{l}</span>
                      <span style={{color:"var(--muted-foreground)",fontFamily:"var(--font-mono)"}}>{pct}%</span>
                    </div>
                    <div style={{height:4,borderRadius:999,background:"color-mix(in oklab, var(--foreground), transparent 94%)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${pct}%`,background:c,boxShadow:`0 0 6px ${c}`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            <Card variant="dim" style={{padding:18}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <span style={{width:14,height:14,color:"var(--primary)"}}><I.zap sw={2.5}/></span>
                <Eyebrow style={{fontSize:10,color:"var(--primary)"}}>EXPLORAR + PRO</Eyebrow>
              </div>
              <p style={{fontSize:12,lineHeight:1.55,color:"var(--muted-foreground)",margin:"0 0 12px"}}>
                Filtros avançados, alertas em tempo real por categoria, exportação de listas e API.
              </p>
              <Btn variant="tinted" size="sm" icon={<I.arrow sw={2.5}/>}>Conhecer o plano Pro</Btn>
            </Card>
          </aside>
        </div>
      </div>
    );
  }

  return { Explore };
})());
