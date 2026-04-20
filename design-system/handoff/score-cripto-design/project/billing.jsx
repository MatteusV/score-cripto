Object.assign(window, (function () {
  const { useState } = React;
  const { I, Btn, Badge, Card, Eyebrow } = window;

  const PLANS = [
    {
      id:"free", name:"Free", price:0, priceLabel:"Grátis", caption:"Para experimentar",
      accent:"var(--muted-foreground)", ring:"var(--border)",
      features:[
        { ok:true,  t:"5 análises por mês" },
        { ok:true,  t:"Reasoning básico da IA" },
        { ok:true,  t:"1 chain (Ethereum)" },
        { ok:false, t:"Watchlist e alertas" },
        { ok:false, t:"API access" },
        { ok:false, t:"Exportar relatórios" },
      ],
    },
    {
      id:"pro", name:"Pro", price:29, priceLabel:"R$ 29", caption:"Para traders e investigadores", featured:true, current:true,
      accent:"var(--primary)", ring:"var(--gold-ring)",
      features:[
        { ok:true, t:"15 análises por mês" },
        { ok:true, t:"Reasoning completo + histórico auditável" },
        { ok:true, t:"7 chains suportadas" },
        { ok:true, t:"Watchlist · até 50 carteiras" },
        { ok:true, t:"Exportar PDF + CSV" },
        { ok:false, t:"API access ilimitado" },
      ],
    },
    {
      id:"team", name:"Team", price:99, priceLabel:"R$ 99", caption:"Para equipes de compliance",
      accent:"var(--accent)", ring:"color-mix(in oklab,var(--accent),transparent 60%)",
      features:[
        { ok:true, t:"Análises ilimitadas" },
        { ok:true, t:"API access · 10k req/mês" },
        { ok:true, t:"Todas as chains (+ L2s custom)" },
        { ok:true, t:"Watchlist ilimitada + alertas em tempo real" },
        { ok:true, t:"Webhooks · Slack · email" },
        { ok:true, t:"Até 5 seats · SSO" },
      ],
    },
  ];

  const USAGE = [
    { label:"Análises de IA",   used:13, cap:15,  color:"var(--primary)" },
    { label:"Watchlist",        used:12, cap:50,  color:"var(--accent)" },
    { label:"Exports PDF · mês",used:4,  cap:25,  color:"oklch(0.69 0.19 162)" },
    { label:"API requests",     used:0,  cap:0,   color:"var(--muted-foreground)", locked:true },
  ];

  const INVOICES = [
    { id:"#INV-2026-04", date:"14 abr 2026", amount:"R$ 29,00", status:"paga",   plan:"Pro · mensal" },
    { id:"#INV-2026-03", date:"14 mar 2026", amount:"R$ 29,00", status:"paga",   plan:"Pro · mensal" },
    { id:"#INV-2026-02", date:"14 fev 2026", amount:"R$ 29,00", status:"paga",   plan:"Pro · mensal" },
    { id:"#INV-2026-01", date:"14 jan 2026", amount:"R$ 29,00", status:"paga",   plan:"Pro · mensal" },
    { id:"#INV-2025-12", date:"14 dez 2025", amount:"R$ 29,00", status:"paga",   plan:"Pro · mensal" },
    { id:"#INV-2025-11", date:"14 nov 2025", amount:"R$ 29,00", status:"estornada", plan:"Pro · mensal" },
  ];

  function Billing() {
    const [cycle, setCycle] = useState("monthly");
    const mul = cycle === "annual" ? 10 : 1;
    const save = cycle === "annual";

    return (
      <div style={{padding:"28px 28px 48px",display:"flex",flexDirection:"column",gap:24}}>
        {/* Current plan hero */}
        <Card variant="glow" style={{padding:0,overflow:"hidden",position:"relative"}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(70% 100% at 0% 0%, oklch(0.74 0.19 66 / 14%), transparent 60%), radial-gradient(60% 90% at 100% 100%, oklch(0.59 0.22 295 / 10%), transparent 60%)",pointerEvents:"none"}}/>
          <div style={{position:"relative",padding:"28px 32px",display:"grid",gridTemplateColumns:"1.4fr 1fr",gap:28}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:12}}>
                <Eyebrow style={{color:"var(--primary)"}}>SEU PLANO</Eyebrow>
                <Badge variant="gold" style={{fontSize:10}}>ATIVO · renova em 14 dias</Badge>
              </div>
              <div style={{display:"flex",alignItems:"baseline",gap:12,marginBottom:6}}>
                <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:44,color:"var(--foreground)",lineHeight:1}}>Pro</span>
                <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:24,color:"var(--primary)"}}>R$ 29<span style={{fontSize:13,color:"var(--muted-foreground)"}}>/mês</span></span>
              </div>
              <p style={{fontSize:13,color:"var(--muted-foreground)",lineHeight:1.55,margin:"6px 0 20px",maxWidth:480}}>
                Você tem <strong style={{color:"var(--foreground)"}}>2 análises restantes</strong> neste ciclo. Passe pra Team e libere análises ilimitadas + API.
              </p>
              <div style={{display:"flex",gap:8}}>
                <Btn variant="tinted" size="sm" icon={<I.zap sw={2.5}/>}>Upgrade para Team</Btn>
                <Btn variant="outline" size="sm">Gerenciar assinatura</Btn>
                <Btn variant="ghost" size="sm">Pausar plano</Btn>
              </div>
            </div>

            {/* Mini usage */}
            <div style={{background:"color-mix(in oklab, var(--card-2), transparent 40%)",borderRadius:14,padding:"18px 20px",border:"1px solid var(--border)"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <Eyebrow style={{fontSize:10}}>USO · CICLO ATUAL</Eyebrow>
                <span style={{fontSize:10,fontFamily:"var(--font-mono)",color:"var(--muted-foreground)"}}>14 abr → 14 mai</span>
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:12}}>
                {USAGE.slice(0,3).map(u => (
                  <div key={u.label}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:4,fontSize:11.5}}>
                      <span style={{color:"var(--muted-foreground)"}}>{u.label}</span>
                      <span style={{fontFamily:"var(--font-mono)",color:"var(--foreground)"}}>{u.used}<span style={{color:"var(--muted-foreground)"}}>/{u.cap}</span></span>
                    </div>
                    <div style={{height:4,borderRadius:999,background:"color-mix(in oklab, var(--foreground), transparent 94%)",overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(u.used/u.cap)*100}%`,background:u.color,boxShadow:`0 0 6px ${u.color}`}}/>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Plans */}
        <div>
          <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",flexWrap:"wrap",gap:12,marginBottom:16}}>
            <div>
              <Eyebrow style={{marginBottom:8}}>PLANOS</Eyebrow>
              <h2 style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:24,margin:0,letterSpacing:"0.01em"}}>Escolha o que faz sentido pra você</h2>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <div style={{display:"flex",gap:2,padding:3,background:"var(--muted)",borderRadius:10,border:"1px solid var(--border)"}}>
                {[["monthly","Mensal"],["annual","Anual"]].map(([v,l])=>(
                  <button key={v} onClick={()=>setCycle(v)} style={{padding:"6px 14px",borderRadius:7,border:"none",background:cycle===v?"var(--card)":"transparent",color:cycle===v?"var(--foreground)":"var(--muted-foreground)",fontSize:11,fontWeight:600,cursor:"pointer",fontFamily:"var(--font-heading)",letterSpacing:"0.12em",textTransform:"uppercase"}}>{l}</button>
                ))}
              </div>
              {save && <Badge variant="gold" style={{fontSize:10}}>economize 2 meses</Badge>}
            </div>
          </div>

          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:16}}>
            {PLANS.map(p => (
              <div key={p.id} style={{
                position:"relative",padding:28,borderRadius:20,
                border: p.featured ? `1px solid ${p.ring}` : "1px solid var(--border)",
                background: p.featured ? "color-mix(in oklab, var(--primary), transparent 92%)" : "var(--card)",
                boxShadow: p.featured ? `0 20px 60px -30px ${p.accent}, inset 0 1px 0 oklch(1 0 0 / 4%)` : "none",
                overflow:"hidden",
              }}>
                {p.featured && <div style={{position:"absolute",top:-20,right:-20,width:100,height:100,borderRadius:"50%",background:`radial-gradient(circle, ${p.accent}30, transparent 70%)`,pointerEvents:"none"}}/>}
                {p.current && <Badge variant="gold" style={{position:"absolute",top:16,right:16,fontSize:9}}>ATUAL</Badge>}

                <Eyebrow style={{color:p.accent,fontSize:10,marginBottom:10}}>{p.name.toUpperCase()}</Eyebrow>
                <div style={{fontSize:12,color:"var(--muted-foreground)",marginBottom:14}}>{p.caption}</div>
                <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:4}}>
                  <span style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:40,color:"var(--foreground)",lineHeight:1}}>
                    {p.price === 0 ? p.priceLabel : `R$ ${p.price * mul}`}
                  </span>
                  {p.price>0 && <span style={{fontSize:12,color:"var(--muted-foreground)"}}>/{cycle==="annual"?"ano":"mês"}</span>}
                </div>
                <div style={{fontSize:10.5,color:"var(--muted-foreground)",fontFamily:"var(--font-mono)",marginBottom:20,minHeight:14}}>
                  {cycle==="annual" && p.price>0 ? `equivale a R$ ${(p.price * mul / 12).toFixed(2)}/mês` : " "}
                </div>

                <Btn
                  variant={p.featured ? "primary" : p.current ? "outline" : "outline"}
                  size="md"
                  style={{width:"100%",justifyContent:"center",marginBottom:20}}
                  disabled={p.current}
                >
                  {p.current ? "Plano atual" : p.id==="free" ? "Começar grátis" : p.id==="team" ? "Fazer upgrade" : "Continuar no Pro"}
                </Btn>

                <div style={{display:"flex",flexDirection:"column",gap:10,paddingTop:20,borderTop:"1px solid var(--border)"}}>
                  {p.features.map((f,i) => (
                    <div key={i} style={{display:"flex",alignItems:"center",gap:10,fontSize:12.5,color: f.ok?"var(--foreground)":"color-mix(in oklab, var(--muted-foreground), transparent 30%)"}}>
                      <span style={{width:16,height:16,borderRadius:999,background: f.ok?"color-mix(in oklab, oklch(0.69 0.19 162), transparent 82%)":"var(--muted)",color: f.ok?"oklch(0.69 0.19 162)":"var(--muted-foreground)",display:"inline-flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {f.ok ? <span style={{width:10,height:10}}><I.check sw={3.5}/></span> : <span style={{width:8,height:2,background:"currentColor",borderRadius:999}}/>}
                      </span>
                      <span style={{lineHeight:1.4,textDecoration: f.ok?"none":"line-through",textDecorationColor:"color-mix(in oklab, var(--muted-foreground), transparent 60%)"}}>{f.t}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Full usage grid + payment */}
        <div style={{display:"grid",gridTemplateColumns:"1.3fr 1fr",gap:20}}>
          <Card style={{padding:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
              <Eyebrow>USO DETALHADO</Eyebrow>
              <span style={{fontSize:10,fontFamily:"var(--font-mono)",color:"var(--muted-foreground)"}}>ciclo: 14 abr → 14 mai</span>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
              {USAGE.map(u => (
                <div key={u.label} style={{padding:16,borderRadius:12,background:"color-mix(in oklab, var(--card-2), transparent 40%)",border:"1px solid var(--border)",position:"relative",opacity:u.locked?.5:1}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                    <span style={{fontSize:11.5,fontWeight:500,color:"var(--foreground)"}}>{u.label}</span>
                    {u.locked && <Badge variant="outline" style={{fontSize:9}}>bloqueado · Team</Badge>}
                  </div>
                  <div style={{fontFamily:"var(--font-heading)",fontWeight:700,fontSize:22,color:u.color,lineHeight:1,marginBottom:8}}>
                    {u.locked ? "—" : u.used}
                    <span style={{fontSize:12,color:"var(--muted-foreground)",marginLeft:4}}>/ {u.locked?"∞":u.cap}</span>
                  </div>
                  <div style={{height:4,borderRadius:999,background:"color-mix(in oklab, var(--foreground), transparent 94%)",overflow:"hidden"}}>
                    <div style={{height:"100%",width: u.locked ? "0%" : `${(u.used/u.cap)*100}%`,background:u.color,boxShadow:`0 0 6px ${u.color}`}}/>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Payment method */}
          <Card style={{padding:22}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <Eyebrow>MÉTODO DE PAGAMENTO</Eyebrow>
              <Btn variant="ghost" size="sm">Editar</Btn>
            </div>
            <div style={{padding:"18px 18px",borderRadius:14,background:"linear-gradient(135deg, oklch(0.28 0.06 285), oklch(0.22 0.05 295))",color:"white",position:"relative",overflow:"hidden",marginBottom:16}}>
              <div style={{position:"absolute",top:-30,right:-30,width:120,height:120,borderRadius:"50%",background:"radial-gradient(circle, oklch(0.74 0.19 66 / 30%), transparent 70%)"}}/>
              <div style={{position:"relative"}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:24}}>
                  <span style={{width:32,height:22,borderRadius:4,background:"oklch(0.74 0.19 66)",display:"inline-block"}}/>
                  <span style={{fontFamily:"var(--font-heading)",fontSize:11,letterSpacing:"0.2em",opacity:.7}}>VISA</span>
                </div>
                <div style={{fontFamily:"var(--font-mono)",fontSize:15,letterSpacing:"0.15em",marginBottom:14}}>•••• •••• •••• 4242</div>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:10,fontFamily:"var(--font-mono)",opacity:.75}}>
                  <span>MATTEUS VITOR</span>
                  <span>12/28</span>
                </div>
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8,fontSize:12}}>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--muted-foreground)"}}>Próxima cobrança</span><span style={{fontFamily:"var(--font-mono)"}}>14 mai 2026 · R$ 29,00</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--muted-foreground)"}}>Endereço de cobrança</span><span>Brasil</span></div>
              <div style={{display:"flex",justifyContent:"space-between"}}><span style={{color:"var(--muted-foreground)"}}>Email de cobrança</span><span style={{fontFamily:"var(--font-mono)",fontSize:11}}>matteus@exemplo.com</span></div>
            </div>
          </Card>
        </div>

        {/* Invoices */}
        <Card style={{padding:0,overflow:"hidden"}}>
          <div style={{padding:"18px 22px",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <Eyebrow style={{marginBottom:4}}>HISTÓRICO DE FATURAS</Eyebrow>
              <div style={{fontSize:11,color:"var(--muted-foreground)"}}>Todas as faturas ficam disponíveis por 7 anos.</div>
            </div>
            <Btn variant="outline" size="sm" icon={<I.arrow sw={2.5}/>}>Baixar todas (ZIP)</Btn>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 1fr 120px 120px 80px",padding:"10px 22px",borderBottom:"1px solid var(--border)",background:"color-mix(in oklab, var(--card-2), transparent 50%)",gap:12}}>
            {["FATURA","DATA","PLANO","STATUS","VALOR",""].map((h,i)=>(
              <Eyebrow key={i} style={{fontSize:9,textAlign: i===5 ? "right" : "left"}}>{h}</Eyebrow>
            ))}
          </div>
          {INVOICES.map((inv,i) => (
            <div key={inv.id} style={{display:"grid",gridTemplateColumns:"1fr 1.2fr 1fr 120px 120px 80px",padding:"14px 22px",borderBottom: i<INVOICES.length-1 ? "1px solid var(--border)" : "none",alignItems:"center",gap:12,fontSize:12.5}}>
              <span style={{fontFamily:"var(--font-mono)",color:"var(--primary)",fontWeight:600}}>{inv.id}</span>
              <span style={{fontFamily:"var(--font-mono)",color:"var(--muted-foreground)"}}>{inv.date}</span>
              <span>{inv.plan}</span>
              <div>
                {inv.status==="paga" ? (
                  <Badge variant="outline" style={{fontSize:10,color:"oklch(0.69 0.19 162)",borderColor:"color-mix(in oklab, oklch(0.69 0.19 162), transparent 60%)"}}>✓ paga</Badge>
                ) : (
                  <Badge variant="outline" style={{fontSize:10,color:"oklch(0.74 0.16 85)",borderColor:"color-mix(in oklab, oklch(0.74 0.16 85), transparent 60%)"}}>↺ estornada</Badge>
                )}
              </div>
              <span style={{fontFamily:"var(--font-mono)",fontWeight:600}}>{inv.amount}</span>
              <div style={{display:"flex",gap:4,justifyContent:"flex-end"}}>
                <button title="Baixar PDF" style={{width:28,height:28,borderRadius:7,border:"1px solid var(--border)",background:"transparent",color:"var(--muted-foreground)",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <span style={{width:12,height:12}}><I.arrow sw={2.5}/></span>
                </button>
              </div>
            </div>
          ))}
        </Card>

        {/* FAQ mini */}
        <div>
          <Eyebrow style={{marginBottom:14}}>PERGUNTAS FREQUENTES</Eyebrow>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:12}}>
            {[
              ["Posso cancelar a qualquer momento?","Sim. O cancelamento é imediato e você mantém acesso até o fim do ciclo já pago. Nenhuma multa."],
              ["Como funciona o upgrade?","Cobramos o pro-rata do período restante. A troca é imediata e os novos limites passam a valer na hora."],
              ["Vocês guardam meus endereços?","Só os que você analisa. Nunca coletamos carteiras automaticamente. Você pode apagar o histórico a qualquer momento."],
              ["Preciso de nota fiscal?","Emitimos NFS-e automaticamente para clientes Brasil. Basta adicionar CNPJ em Gerenciar assinatura."],
            ].map(([q,a],i)=>(
              <div key={i} style={{padding:18,borderRadius:14,border:"1px solid var(--border)",background:"color-mix(in oklab, var(--card), transparent 40%)"}}>
                <div style={{fontSize:13,fontWeight:600,marginBottom:6,color:"var(--foreground)"}}>{q}</div>
                <div style={{fontSize:12,lineHeight:1.55,color:"var(--muted-foreground)"}}>{a}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return { Billing };
})());
