# Design System Master File — Score Cripto (Dark)

> **LÓGICA DE USO:** Ao construir uma página específica, verifique primeiro `design-system/score-cripto/pages/[page-name].md`.
> Se o arquivo existir, suas regras **sobrescrevem** este Master.
> Se não existir, siga estritamente as regras abaixo.

---

**Projeto:** Score Cripto
**Atualizado:** 2026-04-13
**Versão:** 2.0
**Categoria:** Fintech / Crypto SaaS
**Tema:** Dark Mode (OLED)
**Status:** Implementado em `design-system/*.html`

---

## 1. Tokens de Cor

| Role | Hex | CSS Variable | Uso |
|------|-----|--------------|-----|
| Primary (Gold) | `#F59E0B` | `--gold` | CTAs, scores, destaques, borders ativos |
| Primary Light | `#FBBF24` | `--gold-light` | Gradientes, hover do gold |
| Gold Dim | `rgba(245,158,11,0.12)` | `--gold-dim` | Backgrounds de ícones, badges, hover states |
| Gold Border | `rgba(245,158,11,0.25)` | `--border-gold` | Borders de cards em destaque |
| Accent (Purple) | `#8B5CF6` | `--purple` | IA badges, features secundárias, accent |
| Purple Dim | `rgba(139,92,246,0.12)` | `--purple-dim` | Backgrounds de ícones purple |
| Background Base | `#0A1220` | `--bg` | Background do body (OLED-friendly) |
| Background Card | `#111827` | `--bg-card` | Cards, sidebar, modais |
| Background Card 2 | `#162032` | `--bg-card2` | Hover de cards, alternância de rows |
| Background Sidebar | `#0D1625` | `--bg-sidebar` | Sidebar de navegação |
| Text Primary | `#F8FAFC` | `--text` | Títulos e texto principal |
| Text Muted | `#94A3B8` | `--text-muted` | Corpo de texto, labels, descrições |
| Text Dim | `#475569` | `--text-dim` | Texto desabilitado, placeholders, timestamps |
| Border Default | `rgba(255,255,255,0.06)` | `--border` | Borders de cards e separadores |
| Success (Green) | `#10B981` | `--green` | Score alto, carteira confiável, status positivo |
| Danger (Red) | `#EF4444` | `--red` | Score baixo, risco alto, erros |
| Info (Blue) | `#3B82F6` | `--blue` | Informativo, links secundários |

### Cores semânticas de score

| Range | Cor | CSS Variable | Significado |
|-------|-----|--------------|-------------|
| 70–100 | `#10B981` | `--green` | Confiável |
| 40–69 | `#F59E0B` | `--gold` | Atenção |
| 0–39 | `#EF4444` | `--red` | Risco alto |

### Cores por blockchain

| Chain | Hex | Uso |
|-------|-----|-----|
| Ethereum | `#627EEA` | Badge ETH |
| Bitcoin | `#F7931A` | Badge BTC |
| Polygon | `#8247E5` | Badge MATIC |
| Solana | `#9945FF` | Badge SOL |
| BNB Chain | `#F0B90B` | Badge BNB |
| Arbitrum | `#2D374B` | Badge ARB (com borda `#96BEDC`) |

---

## 2. Tipografia

| Papel | Fonte | Pesos | Uso |
|-------|-------|-------|-----|
| Heading | **Orbitron** | 400, 500, 600, 700, 800 | Títulos, scores, logo, números, labels de seção |
| Body | **Exo 2** | 300, 400, 500, 600, 700 | Todo texto de corpo, botões, formulários |
| Monospace | `'Courier New', monospace` | — | Endereços de carteira, hashes, código |

```css
@import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=Orbitron:wght@400;500;600;700;800&display=swap');

:root {
  --font-heading: 'Orbitron', monospace;
  --font-body: 'Exo 2', sans-serif;
}
```

### Escala tipográfica

| Token | Tamanho | Uso |
|-------|---------|-----|
| `text-hero` | `clamp(2.4rem, 6vw, 4.5rem)` | H1 da landing |
| `text-section` | `clamp(1.8rem, 4vw, 3rem)` | Títulos de seção |
| `text-card-title` | `0.9–1rem` | Títulos de cards, font: Orbitron |
| `text-body` | `0.85–0.95rem` | Corpo geral |
| `text-small` | `0.78–0.82rem` | Labels, timestamps, metadados |
| `text-micro` | `0.65–0.75rem` | Section labels uppercase, badges |
| `text-score` | `2.8–3.5rem` | Número do score, font: Orbitron |

### Regras gerais de tipografia

- `line-height: 1.6–1.7` para corpo de texto
- `letter-spacing: 0.08–0.15em` para labels uppercase (section labels, badges)
- `letter-spacing: -0.01 a -0.02em` para headings grandes
- Endereços de wallet sempre em `font-family: monospace`, tamanho `0.75–0.85rem`

---

## 3. Espaçamento

| Token | Valor | Uso |
|-------|-------|-----|
| `--space-xs` | `4px` | Gaps internos mínimos |
| `--space-sm` | `8px` | Gaps entre ícones e texto, inline |
| `--space-md` | `16px` | Padding padrão de elementos menores |
| `--space-lg` | `24px` | Padding interno de cards |
| `--space-xl` | `32px` | Padding de seções internas |
| `--space-2xl` | `48px` | Margin entre seções |
| `--space-3xl` | `64px–100px` | Padding de seções de página |

---

## 4. Bordas e Raios

| Elemento | Border Radius | Valor |
|----------|--------------|-------|
| Botões pequenos (nav, chips) | `8–10px` | `border-radius: 10px` |
| Botões padrão | `12px` | `border-radius: 12px` |
| Cards padrão | `16–18px` | `border-radius: 16px` |
| Cards de destaque | `20–24px` | `border-radius: 24px` |
| Navbar flutuante | `16px` | `border-radius: 16px` |
| Badges/pills | `100px` | `border-radius: 100px` |
| Avatares/ícones quadrados | `8–12px` | `border-radius: 8px` |
| Ícones de feature | `10–14px` | `border-radius: 12px` |

---

## 5. Efeitos Visuais

### Grid de fundo (obrigatório no body)
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(245,158,11,0.025) 1px, transparent 1px),
    linear-gradient(90deg, rgba(245,158,11,0.025) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
}
```

### Glow do Gold (score, CTAs, cards ativos)
```css
--glow-gold: 0 0 24px rgba(245,158,11,0.4);
--glow-gold-soft: 0 0 40px rgba(245,158,11,0.1);
```

### Glow do Purple (IA badge, features)
```css
--glow-purple: 0 0 20px rgba(139,92,246,0.4);
```

### Radial glows decorativos (hero, backgrounds)
```css
/* Fundo do hero central */
background: radial-gradient(circle, rgba(245,158,11,0.08) 0%, transparent 70%);

/* Lateral esquerda hero */
background: radial-gradient(circle, rgba(139,92,246,0.10) 0%, transparent 70%);
```

### Backdrop blur (navbar, topbar)
```css
background: rgba(10,18,32,0.80–0.85);
backdrop-filter: blur(12–16px);
```

### Drop shadow do score ring (SVG)
```css
filter: drop-shadow(0 0 8–10px rgba(245,158,11,0.5));
```

---

## 6. Sombras

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 2px 8px rgba(0,0,0,0.3)` | Lift sutil em dark mode |
| `--shadow-md` | `0 16px 40px rgba(0,0,0,0.3)` | Cards em hover |
| `--shadow-lg` | `0 40px 100px rgba(0,0,0,0.4)` | Demo cards, modais |
| `--shadow-xl` | `0 20px 50px rgba(0,0,0,0.3)` | Hero cards com glow gold |

---

## 7. Animações e Transições

| Tipo | Duração | Uso |
|------|---------|-----|
| Micro-interações | `150–200ms ease` | Hover de botões, links, chips |
| Transições de estado | `200–300ms ease` | Borders, cores, opacidade |
| Hover de cards | `0.3s ease` | Transform + border + shadow |
| Fade in (hero) | `0.6s ease` | Elementos do hero com delay escalonado |
| Score ring | `1s ease` | Animação do `stroke-dashoffset` |
| Pulse (dot ativo) | `2s infinite` | Status dots, badges ativos |

```css
/* Padrão de fade in hero com delay escalonado */
@keyframes fadeInDown {
  from { opacity: 0; transform: translateY(-20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
```

---

## 8. Layout e Grid

### Sidebar (telas internas)
```css
--sidebar-w: 240px;

.sidebar {
  width: var(--sidebar-w);
  position: fixed;
  top: 0; left: 0; bottom: 0;
  background: var(--bg-sidebar);       /* #0D1625 */
  border-right: 1px solid var(--border);
  padding: 24px 16px;
  z-index: 50;
}

.main { margin-left: var(--sidebar-w); }
```

### Topbar (telas internas)
```css
.topbar {
  padding: 16px 32px;
  border-bottom: 1px solid var(--border);
  background: rgba(10,18,32,0.8);
  backdrop-filter: blur(12px);
  position: sticky;
  top: 0;
  z-index: 40;
}
```

### Navbar flutuante (landing)
```css
nav {
  position: fixed;
  top: 16px; left: 16px; right: 16px;
  background: rgba(15,23,42,0.85);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 16px;
  padding: 14px 28px;
  z-index: 100;
}
```

### Grids de conteúdo
```css
/* Dashboard stats — 4 colunas */
.grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }

/* Dashboard principal — 2 colunas assimétrico */
.grid-2 { display: grid; grid-template-columns: 1.4fr 1fr; gap: 20px; }

/* Steps / Features — 3 colunas */
.steps-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }

/* Result page — score + sinais */
.result-grid { display: grid; grid-template-columns: 320px 1fr; gap: 20px; }

/* Wallet stats */
.wallet-stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
```

### Container máximo
```css
.container { max-width: 1200px; margin: 0 auto; }
```

---

## 9. Componentes

### 9.1 Botão Primário (Gold)
```css
.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10–14px 20–32px;
  font-family: var(--font-body);
  font-size: 0.85–1rem;
  font-weight: 700;
  color: #0F172A;                       /* texto escuro no gold */
  background: linear-gradient(135deg, #F59E0B, #FBBF24);
  border: none;
  border-radius: 10–12px;
  cursor: pointer;
  box-shadow: 0 4px 15–20px rgba(245,158,11,0.3);
  transition: all 0.2s;
}

.btn-primary:hover {
  box-shadow: var(--glow-gold);
  transform: translateY(-1–2px);
}
```

### 9.2 Botão Ghost / Outline
```css
.btn-ghost {
  padding: 8–14px 16–32px;
  font-weight: 600;
  color: var(--text-muted);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 10–12px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-ghost:hover {
  color: var(--text);
  border-color: rgba(255,255,255,0.2);
}
```

### 9.3 Card padrão
```css
.card {
  background: var(--bg-card);           /* #111827 */
  border: 1px solid var(--border);      /* rgba(255,255,255,0.06) */
  border-radius: 16–24px;
  padding: 20–32px;
  transition: all 0.2–0.3s ease;
}

.card:hover {
  border-color: var(--border-gold);     /* rgba(245,158,11,0.25) */
  transform: translateY(-3–4px);
  box-shadow: 0 16–20px 40–50px rgba(0,0,0,0.3), var(--glow-gold);
}
```

### 9.4 Input de busca
```css
.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 12–14px;
  padding: 6px 6px 6px 18px;
  transition: all 0.2s;
}

.search-bar:focus-within {
  border-color: var(--border-gold);
  box-shadow: 0 0 0 3px rgba(245,158,11,0.10);
}

.search-bar input {
  background: transparent;
  border: none;
  outline: none;
  font-family: 'Courier New', monospace; /* para endereços */
  font-size: 0.85–0.95rem;
  color: var(--text);
}
```

### 9.5 Nav item (sidebar)
```css
.nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--text-dim);
  text-decoration: none;
  transition: all 0.15s;
}

.nav-item:hover {
  background: rgba(255,255,255,0.04);
  color: var(--text-muted);
}

.nav-item.active {
  background: var(--gold-dim);
  color: var(--gold);
  border: 1px solid rgba(245,158,11,0.20);
}
```

### 9.6 Score Ring (SVG)
```css
/* SVG rotacionado -90deg para começar do topo */
.score-ring svg { transform: rotate(-90deg); }

.ring-bg {
  fill: none;
  stroke: rgba(255,255,255,0.05);
  stroke-width: 8–10;
}

.ring-fill {
  fill: none;
  stroke: url(#scoreGrad);              /* gradiente gold */
  stroke-width: 8–10;
  stroke-linecap: round;
  /* stroke-dasharray = 2πr  (r=65 → 408, r=80 → 503) */
  /* stroke-dashoffset = dasharray × (1 - score/100) */
  filter: drop-shadow(0 0 8–10px rgba(245,158,11,0.5));
  transition: stroke-dashoffset 1s ease;
}

/* Gradiente do score */
<linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
  <stop offset="0%"   stop-color="#F59E0B"/>
  <stop offset="100%" stop-color="#FBBF24"/>
</linearGradient>
```

### 9.7 Badge de score / pill
```css
/* Alto (70-100) */
.score-high { background: rgba(16,185,129,0.12); color: #10B981; }

/* Médio (40-69) */
.score-mid  { background: rgba(245,158,11,0.12); color: #F59E0B; }

/* Baixo (0-39) */
.score-low  { background: rgba(239,68,68,0.12);  color: #EF4444; }

/* Padrão */
.score-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 0.72–0.78rem;
  font-weight: 700;
}
```

### 9.8 Chain badge (inline com cor da rede)
```css
.chain-icon {
  width: 30–36px;
  height: 30–36px;
  border-radius: 8–10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.65–0.72rem;
  font-weight: 800;
  /* background e color variam por chain — ver seção de cores */
}
```

### 9.9 Section label (uppercase pill com traço)
```css
.section-label {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--gold);
}

.section-label::before {
  content: '';
  width: 24px;
  height: 2px;
  background: var(--gold);
  display: inline-block;
}
```

### 9.10 Usage bar (consumo do plano)
```css
.usage-track {
  flex: 1;
  height: 6–8px;
  background: rgba(255,255,255,0.06);
  border-radius: 3–4px;
  overflow: hidden;
}

.usage-fill {
  height: 100%;
  border-radius: 3–4px;
  background: linear-gradient(90deg, #F59E0B, #FBBF24);
}
```

---

## 10. Páginas e Padrões

### Landing Page (`landing.html`)

**Estrutura de seções (em ordem):**
1. `nav` — navbar flutuante fixed com backdrop blur
2. `section.hero` — headline, subtitle, search box com chain selector, meta info
3. `div.stats-bar` — 4 stats em grid (análises, precisão, velocidade, blockchains)
4. `section#como-funciona` — 3 steps cards com número decorativo
5. `section.demo-section` — layout 2 col: copy + card demo com score ring
6. `section#features` — grid 3 col de feature cards
7. `section#blockchains` — chips de chain centralizados
8. `section` — 3 testimonial cards
9. `section#precos` — 2 pricing cards (Free / Pro)
10. `section.cta-section` — cta box com gradiente border
11. `footer` — logo + links + copyright

**Hero search box:**
```css
.hero-search {
  display: flex;
  align-items: center;
  gap: 0;
  max-width: 620px;
  background: var(--bg-card);
  border: 1px solid var(--border-gold);
  border-radius: 14px;
  padding: 6px 6px 6px 20px;
  box-shadow: 0 0 40px rgba(245,158,11,0.10), inset 0 1px 0 rgba(255,255,255,0.05);
}
```

**Seções `padding`:** `100px 24px` para seções principais

---

### Login/Signup (`login.html`)

**Layout:** Split screen — `left-panel` (formulário) + `right-panel` (promo, 480px)

**Componentes do form:**
- Tab switcher `Entrar / Criar conta` com animação de slide ativo
- Input com ícone à esquerda (SVG 16px) e padding `13px 14px 13px 42px`
- Input senha com toggle de visibilidade à direita
- OAuth social button (Google)
- Link "Esqueceu a senha?" alinhado à direita

**Painel de promo (right):**
- Radial glow central decorativo
- 3 feature items em cards `rgba(255,255,255,0.03)`
- Trust row com avatars sobrepostos (margin-left: -8px) + contagem

---

### Dashboard (`dashboard.html`)

**Layout:** Sidebar fixa (240px) + main content com topbar sticky

**Estrutura do conteúdo:**
1. `search-hero` — barra de busca + seletor de chain em chips + usage bar
2. `grid-4` — 4 stat cards (total, confiáveis, alertas, score médio)
3. `quick-actions` — 3 cards de ação rápida (grid 3 col)
4. `grid-2` — análises recentes (lista) + distribuição de scores (barras + mini chart SVG)

**Stat card:**
```css
.stat-card {
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 20px;
}

/* Delta badge */
.delta-up   { background: rgba(16,185,129,0.1); color: var(--green); }
.delta-down { background: rgba(239,68,68,0.1);  color: var(--red);   }
```

---

### Resultado (`result.html`)

**Layout:** Sidebar + main com max-width 1100px

**Estrutura do conteúdo:**
1. `wallet-header` — endereço completo, chain badge, metadados (data, modelo IA), verdict badge
2. `wallet-stats-row` — 4 métricas da wallet (saldo, txs, idade, mixers) em grid 4 col
3. `ai-explain-card` — bloco de explicação em prosa gerada pela IA com badge do modelo
4. `result-grid` (320px + 1fr):
   - Esquerda: `score-main-card` com ring SVG grande + fatores mini
   - Direita: `signals-card` com lista de sinais detectados e peso (+/- pontos)

**Peso dos sinais:**
```css
.weight-pos  { background: rgba(16,185,129,0.1); color: var(--green); }  /* +N pts */
.weight-neg  { background: rgba(239,68,68,0.1);  color: var(--red);   }  /* -N pts */
.weight-warn { background: rgba(245,158,11,0.1); color: var(--gold);  }  /* ±N pts */
```

---

### Histórico (`history.html`)

**Layout:** Sidebar + tabela full-width com paginação

**Estrutura:**
1. `summary-chips` — 5 chips de resumo (total, confiáveis, atenção, risco, score médio)
2. `filters-bar` — search input + 3 selects + botão "Nova análise"
3. `table-card` — tabela com grid 6 colunas + paginação interna

**Grid da tabela:**
```css
.table-header, .table-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr 100px 80px;
  padding: 12–14px 20px;
}
/* Colunas: Carteira | Data | Rede | Resultado | Score | Ações */
```

---

### Planos & Billing (`billing.html`)

**Layout:** Sidebar + conteúdo max-width 1000px

**Estrutura:**
1. `current-plan-banner` — ícone do plano + nome/desc + usage bar grande + data de reset
2. `plans-grid` (2 col) — Free (dimmed + badge "Plano atual") + Pro (featured + badge gold)
3. `billing-section` — método de pagamento
4. `billing-section` — histórico de faturas (empty state)
5. Danger zone — deletar conta (LGPD/GDPR)

**Pricing card featured (Pro):**
```css
.plan-card.featured {
  border-color: var(--border-gold);
  background: linear-gradient(135deg, rgba(245,158,11,0.05), var(--bg-card));
  box-shadow: 0 0 60px rgba(245,158,11,0.07);
}
```

---

## 11. Responsividade

| Breakpoint | Regras |
|------------|--------|
| `≤ 1200px` | `grid-4` passa para 2 colunas |
| `≤ 1000px` | `result-grid` passa para 1 coluna |
| `≤ 900px` | Sidebar se esconde (`transform: translateX(-100%)`); `main` sem margin-left; `grid-2` → 1 col |
| `≤ 768px` | Nav links some; `steps-grid` → 1 col; `pricing-grid` → 1 col; `testimonials-grid` → 1 col |
| `≤ 600px` | `grid-4` → 2 col; content padding reduzido para `20px 16px` |
| `≤ 480px` | `features-grid` → 1 col; `hero-search` → flex-col |

---

## 12. Anti-Patterns (Proibido)

- ❌ **Backgrounds claros** — o tema é exclusivamente dark OLED
- ❌ **Emojis como ícones** — use SVG inline (Heroicons/Lucide style)
- ❌ **`cursor: default` em elementos clicáveis** — todo clicável tem `cursor: pointer`
- ❌ **Hovers sem transição** — mínimo `transition: all 0.15–0.2s ease`
- ❌ **Scale transform em hovers de card** — use `translateY(-3–4px)` ao invés de `scale()`
- ❌ **Texto de corpo em branco puro** — use `--text-muted` (#94A3B8) para corpo
- ❌ **Borders invisíveis** — border mínimo `rgba(255,255,255,0.06)` em cards
- ❌ **Font Orbitron em corpo de texto** — Orbitron apenas para headings e números
- ❌ **Endereços de carteira em fonte não-monospace** — sempre `font-family: monospace`
- ❌ **Score sem cor semântica** — sempre usar a cor correta por range (green/gold/red)
- ❌ **Contraste insuficiente** — mínimo 4.5:1 (WCAG AA)
- ❌ **Focus states invisíveis** — sempre manter visible para keyboard nav
- ❌ **Scroll horizontal em mobile** — conteúdo deve caber no viewport

---

## 13. Checklist de Entrega

Antes de entregar qualquer código de UI para este projeto:

- [ ] Background do body é `#0A1220` com grid sutil via `body::before`
- [ ] Fontes Orbitron + Exo 2 importadas via Google Fonts
- [ ] Todos os ícones são SVG inline (sem emojis, sem icon fonts)
- [ ] `cursor: pointer` em todos os elementos interativos
- [ ] Hover states com `transition` 150–300ms
- [ ] Cards com `transform: translateY()` no hover (sem scale)
- [ ] Score tem cor semântica correta (green/gold/red por range)
- [ ] Endereços de carteira em `font-family: monospace`
- [ ] Sidebar com `position: fixed` e `z-index: 50`
- [ ] Topbar com `position: sticky`, `top: 0`, `z-index: 40`
- [ ] Conteúdo principal com `margin-left: 240px` (sidebar)
- [ ] Focus states visíveis para navegação por teclado
- [ ] `prefers-reduced-motion` respeitado
- [ ] Responsivo: 375px, 768px, 1024px, 1440px
- [ ] Sem scroll horizontal em nenhum breakpoint
