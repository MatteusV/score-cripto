# Score Cripto — Pivot Estratégico: Investigador de Golpe Cripto

**Data da decisão:** 2026-04-20
**Autor:** Matteus Varlesse (brainstorm com IA)
**Status:** Proposta estratégica — pronta para validação e planejamento de MVP

---

## 1. Resumo Executivo

O Score Cripto muda de posicionamento: deixa de ser um "SaaS genérico de score de confiabilidade de carteira" e passa a ser um **investigador self-service de golpes cripto para o mercado brasileiro**. A ferramenta é vendida primariamente para **vítimas de golpe que acabaram de perder dinheiro em transações cripto** e precisam de um relatório forense rápido, barato e honesto para tomar ação (registrar B.O., acionar exchange, acionar advogado).

O score de confiabilidade original não é descartado — ele é reposicionado como (1) ferramenta pública e gratuita de lookup de wallet, que serve como íman de SEO e ponto de entrada orgânico, e (2) feature interna complementar dentro da plataforma paga, para investigadores que queiram analisar wallets adicionais após a investigação principal.

A meta financeira é modesta e consciente: **aproximadamente R$ 50.000/mês (≈ $10.000/mês)** em receita recorrente ou transacional, compatível com um negócio bootstrap operado por uma pessoa. Não há intenção de captação VC nem de competir com incumbentes globais como Chainalysis, TRM Labs ou Elliptic.

---

## 2. Contexto da Decisão

A ideia original do Score Cripto era genérica demais: "ajudar usuários a verificar a confiabilidade de carteiras cripto com IA". O brainstorm identificou que essa formulação não responde duas perguntas críticas:

- **Quem é o usuário e em que momento ele abre o produto?**
- **Qual é a vantagem injusta do fundador para competir?**

A resposta honesta foi: não havia usuário-alvo claro, e a única vantagem identificável era **velocidade de execução** (capacidade técnica de entregar rápido como engenheiro solo). Sem canal de distribuição, sem audiência prévia, sem expertise de domínio forense, os caminhos óbvios (retail due-diligence de contratos, forense para OTC/advocacia) eram armadilhas: o primeiro pela concorrência esmagadora de ferramentas gratuitas e pela baixíssima disposição de pagamento do público retail cripto; o segundo pela barreira de entrada enorme (attribution data, credibilidade regulatória, ciclos de venda enterprise de 6-12 meses).

A direção escolhida resolve esses problemas combinando três elementos:

- **Intenção de compra alta e impulsiva** (vítima recente de golpe, em desespero, disposta a pagar R$ 99-199 sem hesitar);
- **Canal de aquisição orgânico acessível** (SEO para queries como "como rastrear bitcoin roubado", "caí em golpe de investimento cripto", "recuperar pix convertido em cripto");
- **Reaproveitamento quase integral da infraestrutura já construída** (pipeline `data-search` → `process-data-ia` → `users`), reduzindo o tempo até o MVP para cerca de 3 semanas.

---

## 3. Público-Alvo

### Persona primária — "Vítima recente de golpe"

Pessoa física brasileira, geralmente entre 25 e 55 anos, com conhecimento básico de cripto (conseguiu comprar e transferir, mas não é trader profissional), que acabou de perder entre R$ 5.000 e R$ 200.000 em um dos golpes mais comuns no mercado brasileiro:

- Golpe de "investimento em cripto" (plataforma falsa prometendo rendimento)
- Golpe do pix convertido em USDT para endereço controlado pelo golpista
- Golpe de P2P na Binance, Bitso ou Mercado Bitcoin
- Clonagem de WhatsApp com pedido de transferência em cripto
- Falso suporte de exchange / wallet

Ela chega ao produto via busca no Google, geralmente à noite ou no fim de semana, em estado emocional frágil, disposta a pagar por qualquer coisa que traga uma resposta concreta sobre **pra onde foi o dinheiro e o que ela pode fazer**.

### Persona secundária — "Profissional que atende vítimas"

Advogados criminalistas especializados em crimes cibernéticos, contadores que trabalham com cripto, consultores independentes que recebem casos recorrentes. Pagamento recorrente mensal em troca de uso ilimitado (ou quase ilimitado) da ferramenta. Volume esperado menor, mas retenção maior e LTV superior.

### Persona terciária — "Curioso com desconfiança"

Qualquer pessoa que recebeu um endereço de carteira e quer conferir publicamente se ele tem histórico suspeito antes de enviar dinheiro. Esse usuário **não paga**, mas é estratégico: alimenta o efeito de rede e gera tráfego orgânico que sustenta o SEO.

---

## 4. Proposta de Valor

Para a vítima, o produto entrega em poucos minutos, por um preço acessível, algo que hoje custa muito tempo ou muito dinheiro:

- **Mapa forense do destino do dinheiro** — para onde a cripto foi depois que saiu da wallet da vítima, identificando se passou por exchanges centralizadas conhecidas (onde ainda há chance de bloqueio).
- **Relatório formatado para ação** — documento pronto para ser anexado em boletim de ocorrência, encaminhado para setor jurídico da exchange, ou apresentado a advogado/delegado.
- **Contexto de reincidência** — se a wallet do golpista já apareceu em outras investigações na plataforma, isso é sinalizado, dando à vítima senso de escala e material para denúncias coletivas.
- **Próximos passos concretos** — guia personalizado com quais canais acionar (delegacia especializada, setor de fraudes da exchange destino, Ministério Público), em qual ordem, e com quais documentos.

O que o produto **não promete**: recuperação do dinheiro. Essa clareza ética é parte do posicionamento — há muita fraude prometendo recuperação mágica, e a credibilidade do Score Cripto vem justamente de ser honesto sobre o que é possível.

---

## 5. Modelo de Negócio

A monetização opera em três camadas:

A primeira é a **investigação one-shot paga**, que é o carro-chefe de receita. Preço proposto entre R$ 99 e R$ 199 por investigação, definido por teste (começar em R$ 149 parece um bom ponto inicial). Pagamento via Stripe ou gateway BR compatível (Pix instantâneo é crítico — a vítima quer resolver agora). Volume necessário para atingir R$ 50.000/mês: aproximadamente 300-500 investigações mensais em regime estável.

A segunda é a **assinatura mensal para profissionais**, voltada à persona secundária (advogados, contadores, consultores). Preço proposto entre R$ 149 e R$ 299/mês, com limite de investigações (ex: 15-30 por mês) e acesso ilimitado ao banco histórico e à ferramenta de score. Essa camada é o que estabiliza a receita contra a volatilidade one-shot.

A terceira, em fase posterior, é a **camada de monitoramento e alertas**, vendida como add-on à vítima após a investigação ("notifique-me se esta carteira do golpista movimentar fundos"). Preço baixo, recorrente, retenção limitada mas não desprezível.

A versão pública gratuita de consulta de wallet **não monetiza diretamente** — ela existe puramente como mecanismo de aquisição orgânica.

---

## 6. Features Detalhadas

### 6.1 Investigação Forense Paga (produto principal)

O usuário paga e informa os dados do caso:

- Endereço de wallet de destino (para onde o dinheiro foi)
- Hash da transação original (opcional, mas recomendado — aumenta qualidade)
- Chain/rede envolvida (Ethereum, Bitcoin, BSC, Polygon, Solana, Tron — esta última é crítica para USDT no Brasil)
- Data aproximada e valor transferido
- Contexto livre do golpe (o que aconteceu, em poucas linhas)

O sistema então executa um pipeline forense que inclui: coleta completa de dados on-chain da wallet de destino e suas transações subsequentes, análise do fluxo de saída (seguindo o dinheiro até 3-5 hops), identificação de exchanges centralizadas conhecidas na cadeia de transferências, detecção de padrões de mixer ou bridge cross-chain, cruzamento com wallets previamente sinalizadas na base interna, e geração de narrativa estruturada pela IA a partir desses sinais.

O entregável final é um relatório PDF + página web navegável contendo:

- Sumário executivo com destino provável do dinheiro
- Diagrama visual do fluxo de transações
- Lista de exchanges centralizadas identificadas no caminho (com indicação de quais têm canal oficial de compliance/fraud BR)
- Padrão de comportamento da wallet do golpista (primeira atividade, volume total recebido, número de vítimas prováveis baseado em transações de entrada semelhantes)
- Classificação de dificuldade de rastreamento (baixa, média, alta)
- Plano de ação personalizado com passos, documentos e canais
- Cartas modelo para anexar a B.O. e para setores de fraude de exchanges

### 6.2 Análise Pública Gratuita (íman de SEO)

Qualquer pessoa, sem login, acessa uma URL do tipo `scorecripto.com.br/wallet/<chain>/<endereço>` e recebe uma visão pública mínima:

- Endereço, rede e idade da wallet
- Total de transações e volume movimentado (de forma agregada)
- **Sinalização binária: esta carteira aparece em investigações registradas?** (sim, X vezes / não)
- Data da última movimentação
- Link convidativo: "Quer análise completa desta wallet por R$ 149? Inicie uma investigação"

Importante: a versão pública **não mostra o score detalhado nem a narrativa da IA**. Ela é deliberadamente minimalista para não canibalizar o produto pago. A função é indexar a wallet no Google, dar prova social ao curioso, e converter uma fatia dos curiosos em clientes pagantes quando a wallet consultada de fato tem histórico suspeito.

Cada consulta gera uma página indexável, construindo progressivamente um índice público do ecossistema suspeito brasileiro. Em 6-12 meses, o Google começa a rankear essas páginas para buscas como "consultar wallet cripto" ou buscas diretas pelo endereço (comum quando a pessoa copia o endereço do golpista e joga no Google por desconfiança).

### 6.3 Score de Wallet (feature interna pós-pagamento)

Após concluir uma investigação paga, o usuário tem acesso, dentro da conta dele, a uma ferramenta de score plena — o produto original do Score Cripto, agora reposicionado. Ele pode analisar wallets adicionais (com cotas dependendo do plano) recebendo o score 0-100 completo com fatores positivos, fatores de risco, confiança do modelo e narrativa explicativa gerada por IA.

Esse é o componente que faz sentido especialmente para a **persona secundária** (profissionais) — é a razão de assinar o plano mensal em vez de comprar investigações avulsas. Para a vítima one-shot, é um "bônus percebido" que justifica o valor pago sem ser um custo real significativo (reaproveita o mesmo pipeline).

### 6.4 Banco Público de Wallets Sinalizadas

Toda wallet identificada em investigação como destino de golpe entra em um **banco permanente de wallets sinalizadas**. Esse banco alimenta:

- A sinalização na análise pública gratuita
- O score privado (wallet sinalizada puxa o score fortemente para baixo)
- Páginas de "galeria" SEO-friendly por tipo de golpe ("carteiras associadas a golpes de USDT no Tron")
- Efeito de rede: quanto mais investigações, melhor fica o produto para todos os usuários

Existe um comitê de qualidade interno (no MVP, o próprio fundador) que revisa sinalizações antes de entrarem no banco público, evitando ruído e possíveis disputas.

### 6.5 Monitoramento e Alertas (fase 2)

Após a investigação, o usuário pode ativar monitoramento contínuo da wallet do golpista por uma taxa mensal baixa (ex: R$ 19/mês). Ele recebe email ou webhook quando:

- A wallet movimenta saldo após período de inatividade
- A wallet recebe novas entradas (indicativo de que o golpe continua ativo)
- Fundos migram para exchange centralizada (oportunidade para acionar bloqueio)

### 6.6 Painel do Profissional (fase 2)

Para a persona secundária, um dashboard com lista de investigações em aberto, clientes associados, exportação de relatórios em lote, e gerenciamento de cotas.

---

## 7. Fluxos Detalhados

### 7.1 Fluxo da Vítima (caminho principal de receita)

O ponto de entrada mais comum é uma busca no Google do tipo "como rastrear bitcoin roubado" ou "caí em golpe de usdt o que fazer". A vítima cai em uma landing dedicada com copy direta ao ponto, sem jargão técnico, explicando o que o produto entrega e o que não entrega. Há prova social (número de investigações realizadas, exemplos anonimizados de casos resolvidos parcialmente) e uma CTA única: "Iniciar investigação — R$ 149".

Clicando, ela entra num formulário curto (máximo 5 campos obrigatórios), pagamento via Pix/cartão, e é redirecionada para uma tela de processamento que exibe em tempo real os passos da análise forense sendo executados ("coletando transações da wallet", "seguindo fluxo de saída", "identificando exchanges centralizadas", "gerando relatório"). Esse feedback visual é crítico para a percepção de valor — ela precisa sentir que algo sofisticado está acontecendo, mesmo que parte seja apenas pacing visual.

Em 3-8 minutos, o relatório é entregue na tela, disponível em PDF e também como link permanente na conta dela. Ela recebe email com o mesmo conteúdo. Dentro do produto, vê CTA para duas ações imediatas: "Monitorar esta wallet (R$ 19/mês)" e "Analisar outra wallet com nosso score gratuito nesta conta" — este último é o ponto onde a feature de score interna aparece.

### 7.2 Fluxo do Curioso (caminho de aquisição)

Alguém recebeu um endereço de wallet para onde deveria enviar dinheiro (compra P2P, pagamento a fornecedor cripto, etc.) e tem desconfiança. Googla o próprio endereço ou busca "consultar wallet cripto confiável". Cai em `scorecripto.com.br/wallet/<chain>/<endereço>` — uma página SEO-friendly que mostra a análise pública mínima.

Dois cenários a partir daqui. Se a wallet **tem** histórico sinalizado, a página mostra em destaque "Esta wallet aparece em N investigações de golpe" e oferece análise completa paga por R$ 149. A conversão aqui é alta porque a desconfiança foi confirmada. Se a wallet **não tem** histórico sinalizado, a página mostra estatísticas neutras e orienta sobre limitações ("ausência de registro não significa que seja confiável"). Conversão aqui é baixa, mas a página serviu ao SEO e pode ter captado um email para newsletter.

### 7.3 Fluxo do Profissional (caminho de retenção)

Advogado ou contador é apresentado ao produto via recomendação orgânica (um cliente que usou, um post em comunidade, LinkedIn). Acessa uma landing secundária focada em profissionais, com copy falando de volume, histórico, relatórios exportáveis e cota mensal. Faz teste com uma investigação paga one-shot primeiro; se gostar, converte para assinatura mensal.

### 7.4 Fluxo Técnico (backend, reaproveitando arquitetura)

A requisição entra pelo **api-gateway**, que valida autenticação e entitlement (vítima pagou? profissional tem cota no mês?). Encaminha para o **data-search**, que coleta os dados on-chain da wallet e das transações subsequentes, normaliza e guarda em cache temporário de 20 minutos. O **process-data-ia** recebe o contexto estruturado, verifica se a wallet já foi analisada recentemente (cache de resultado permanente — mudança em relação ao modelo atual), e se não foi, chama a IA para gerar a narrativa forense estruturada. O resultado é persistido permanentemente (não apenas em cache TTL) no banco do process-data-ia, incluindo: input resumido, output da IA, versão do prompt/modelo, sinalizações extraídas, e metadados de auditoria. O serviço **users** registra o consumo, atualiza histórico do cliente e dispara evento de `user.analysis.consumed`.

O relatório é gerado a partir do output persistido e entregue como página web + PDF.

---

## 8. Ajustes Técnicos na Arquitetura Atual

A stack existente (monorepo pnpm com `data-search`, `process-data-ia`, `users`, `api-gateway`, `observability-node`) atende ao pivot com três ajustes principais:

**Persistência permanente de wallets investigadas.** Hoje o `data-search` opera com cache de 20 min no Redis. O pivot exige que wallets investigadas (pagas) e suas derivadas sejam promovidas para tabela permanente no PostgreSQL do `process-data-ia`, para sustentar SEO (URLs estáveis), efeito de rede (sinalização cumulativa) e economia de custo (sem re-fetch).

**Páginas públicas SEO-friendly.** Requer nova rota pública no `api-gateway` ou novo serviço `web-app` (já previsto no monorepo) com server-side rendering adequado para indexação do Google. URLs limpas, metadados estruturados (schema.org), sitemap gerado dinamicamente conforme novas wallets são consultadas.

**Pipeline forense especializado.** O `process-data-ia` atual gera score 0-100. Para o produto forense, precisa gerar um artefato diferente: relatório narrativo estruturado por seções (resumo, fluxo, exchanges, plano de ação). Isso é refactor do prompt e do schema de output da IA, não mudança estrutural. Versionar claramente o prompt forense e o prompt de score — são produtos diferentes usando a mesma infra.

Os limites atuais de cota (FREE_TIER: 5, PRO: 15) serão repensados dentro do novo modelo: investigação é por transação e não por cota livre; o score interno é que opera sob cotas do plano.

---

## 9. Estratégia de Distribuição

A aquisição depende quase integralmente de SEO orgânico em português brasileiro. A construção de autoridade começa no dia 1 com duas frentes paralelas: conteúdo editorial (blog com artigos tipo "o que fazer nas primeiras 24h após um golpe cripto", "como funciona o rastreamento de bitcoin") e conteúdo programático (cada wallet consultada publicamente gera uma página indexável).

Keywords prioritárias para pesquisa e ranqueamento (a validar com ferramenta):

- "como recuperar bitcoin roubado"
- "caí em golpe de cripto o que fazer"
- "rastrear carteira bitcoin golpe"
- "pix convertido em usdt golpe"
- "como saber se carteira cripto é golpe"
- "denunciar golpe de investimento cripto"

Canais complementares, em ordem de prioridade descendente: postagens orgânicas em subreddits brasileiros de cripto e finanças, parcerias com canais de YouTube do nicho ("educador financeiro que fala de golpes"), presença em grupos de Telegram de comunidades cripto BR, outreach direto para advogados criminalistas (LinkedIn), Google Ads como complemento pago em keywords de alta intenção quando houver caixa para testar.

---

## 10. Riscos e Mitigações

**Público emocionalmente frágil.** O usuário chega desesperado e pode confundir o produto com promessa de recuperação. Mitigação: copy absolutamente explícito em todos os pontos do funil ("não recuperamos seu dinheiro — entregamos a informação necessária para você agir corretamente"), FAQ claro, termo de uso simples.

**Tráfego one-shot sem retenção.** A vítima paga uma vez e some. Mitigação: camada de profissionais (assinatura recorrente) + monitoramento como upsell + marketing de referência dentro da comunidade profissional.

**Concorrência futura.** Se der certo, alguém copia. Mitigação: efeito de rede do banco de wallets sinalizadas + autoridade SEO acumulada + velocidade de iteração (a única vantagem do fundador).

**Possível atração de golpistas consultando se estão sendo rastreados.** Mitigação: análise pública gratuita não revela detalhes da investigação, apenas existência; logs de consulta de wallets permitem análise de padrões suspeitos.

**Qualidade do rastreamento limitada por dados disponíveis.** Nem todo golpe é rastreável, especialmente quando envolve mixers ou chains com menos ferramental (Monero, por exemplo). Mitigação: triagem automática antes do pagamento ("seu caso tem chance X de rastreamento — deseja prosseguir?"), refund garantido se o relatório for considerado insatisfatório, contratos éticos claros.

**Custo de IA por investigação.** Cada análise consome tokens de modelo. Mitigação: cache de wallets já analisadas, uso de modelos mais baratos para pré-processamento e modelo premium apenas para narrativa final, monitoramento de custo por investigação para garantir margem saudável no preço de R$ 149.

---

## 11. Próximos Passos

O próximo passo concreto, antes de qualquer escrita de código, é **desenhar o artefato final** — o relatório que a vítima recebe. Se o relatório não tiver valor percebido claro em R$ 149, nada mais importa. Essa definição precisa acontecer em três camadas: estrutura das seções, exemplo preenchido com um caso real (pode ser inventado para exercício), e validação com 3-5 potenciais usuários (perguntar: "você pagaria R$ 149 por isto?").

Em paralelo, validar hipótese de SEO com pesquisa de keywords reais (Ahrefs, SEMrush, ou Google Keyword Planner) para confirmar volume e dificuldade. Se as keywords principais tiverem volume abaixo de 500 buscas/mês combinadas, a estratégia precisa ser revista.

Depois disso, MVP técnico em escopo mínimo viável: landing principal + checkout + formulário de caso + pipeline forense para 2-3 chains (Ethereum, Bitcoin, Tron — esta última crítica pelo USDT) + geração de relatório em HTML e PDF. Sem painel de usuário complexo, sem painel de profissional, sem monitoramento — tudo isso é fase 2.

Meta de MVP: ir ao ar em 4 semanas com capacidade de processar 10 investigações reais (amigos, testes, primeiros curiosos) e coletar feedback estruturado antes de investir em SEO ou ads.

---

## 12. Sumário de Features por Fase

**Fase 0 — Pré-MVP (validação):** desenho do relatório, validação com potenciais usuários, pesquisa de SEO.

**Fase 1 — MVP (4 semanas):** landing + checkout + pipeline forense (Ethereum, Bitcoin, Tron) + geração de relatório + análise pública gratuita básica (só existência de sinalização) + painel mínimo de usuário.

**Fase 2 — Pós-validação (2-3 meses após MVP):** score interno reativado como feature pós-investigação, assinatura para profissionais, cobertura de mais chains (BSC, Polygon, Solana), melhoria do SEO programático, primeiras campanhas de Ads se caixa permitir.

**Fase 3 — Consolidação (6+ meses):** monitoramento e alertas, painel do profissional com exportações em lote, integrações (API para quem quiser embedar análise em outros produtos), parcerias com exchanges BR para canal oficial de compliance.
