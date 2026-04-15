# Design System Master File — Score Cripto (Light)

> **LÓGICA DE USO:** Ao construir uma página específica, verifique primeiro `design-system/score-cripto-light/pages/[page-name].md`.
> Se o arquivo existir, suas regras **sobrescrevem** este Master.
> Se não existir, siga estritamente as regras abaixo.
>
> **RELAÇÃO COM DARK:** Este arquivo é o tema light do Score Cripto. A estrutura de componentes, layout e tipografia são **idênticos** ao `score-cripto/MASTER.md`. As diferenças estão exclusivamente em cores, sombras, bordas e opacidades. Quando em dúvida sobre estrutura, consulte o MASTER dark como referência de verdade.

---

**Projeto:** Score Cripto — Tema Light
**Atualizado:** 2026-04-13
**Versão:** 2.0
**Categoria:** Fintech / Crypto SaaS
**Tema:** Light Mode (Premium Clean)
**Referência base:** `design-system/score-cripto/MASTER.md`

---

## 1. Tokens de Cor

| Role | Dark (referência) | Light (este tema) | CSS Variable |
|------|-------------------|-------------------|--------------|
| Primary (Gold) | `#F59E0B` | `#D97706` | `--gold` |
| Primary Light | `#FBBF24` | `#F59E0B` | `--gold-light` |
| Gold Dim | `rgba(245,158,11,0.12)` | `rgba(217,119,6,0.10)` | `--gold-dim` |
| Gold Border | `rgba(245,158,11,0.25)` | `rgba(217,119,6,0.30)` | `--border-gold` |
| Accent (Purple) | `#8B5CF6` | `#7C3AED` | `--purple` |
| Purple Dim | `rgba(139,92,246,0.12)` | `rgba(124,58,237,0.10)` | `--purple-dim` |
| Background Base | `#0A1220` | `#F8FAFC` | `--bg` |
| Background Card | `#111827` | `#FFFFFF` | `--bg-card` |
| Background Card 2 | `#162032` | `#F1F5F9` | `--bg-card2` |
| Background Sidebar | `#0D1625` | `#F8FAFC` | `--bg-sidebar` |
| Text Primary | `#F8FAFC` | `#0F172A` | `--text` |
| Text Muted | `#94A3B8` | `#475569` | `--text-muted` |
| Text Dim | `#475569` | `#94A3B8` | `--text-dim` |
| Border Default | `rgba(255,255,255,0.06)` | `rgba(15,23,42,0.08)` | `--border` |
| Success (Green) | `#10B981` | `#059669` | `--green` |
| Danger (Red) | `#EF4444` | `#DC2626` | `--red` |
| Info (Blue) | `#3B82F6` | `#2563EB` | `--blue` |

### Regra crítica de contraste no tema light

> No tema light, o principal risco é contraste insuficiente. As regras abaixo são obrigatórias:

- **Texto de corpo:** mínimo `#475569` (slate-600) — nunca `#94A3B8` ou mais claro
- **Texto principal:** `#0F172A` (slate-900) — nunca cinza médio
- **Borders de cards:** mínimo `rgba(15,23,42,0.08)` — nunca `rgba(255,255,255,0.x)`
- **Glass/frosted cards:** `background: rgba(255,255,255,0.80)` ou mais — nunca `rgba(255,255,255,0.10–0.30)`
- **Ícones:** mínimo `#64748B` em fundos brancos

### Cores semânticas de score (iguais ao dark)

| Range | Hex | Significado |
|-------|-----|-------------|
| 70–100 | `#059669` | Confiável (verde ligeiramente mais escuro no light) |
| 40–69 | `#D97706` | Atenção (âmbar) |
| 0–39 | `#DC2626` | Risco alto (vermelho mais escuro) |

### Cores por blockchain (iguais ao dark — não alterar)

| Chain | Hex |
|-------|-----|
| Ethereum | `#627EEA` |
| Bitcoin | `#F7931A` |
| Polygon | `#8247E5` |
| Solana | `#9945FF` |
| BNB Chain | `#F0B90B` |
| Arbitrum | `#2D374B` |

---

## 2. Tipografia

**Idêntica ao tema dark.** Mesmas fontes, mesmos pesos, mesma escala.

```css
@import url('https://fonts.googleapis.com/css2?family=Exo+2:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300&family=Orbitron:wght@400;500;600;700;800&display=swap');

:root {
  --font-heading: 'Orbitron', monospace;
  --font-body: 'Exo 2', sans-serif;
}
```

**Diferença no light:** Headings usam `#0F172A` ao invés de `#F8FAFC`. O `accent-gold` em títulos usa `#D97706` ao invés de `#F59E0B` para manter legibilidade no fundo branco.

---

## 3. Espaçamento e Bordas

**Idênticos ao tema dark.** Mesmos tokens de espaçamento e raios de borda.

---

## 4. Efeitos Visuais

### Grid de fundo (versão light)
```css
body::before {
  content: '';
  position: fixed;
  inset: 0;
  background-image:
    linear-gradient(rgba(15,23,42,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(15,23,42,0.04) 1px, transparent 1px);
  background-size: 60px 60px;
  pointer-events: none;
  z-index: 0;
}
```

### Glow (versão light — mais sutil)
```css
--glow-gold:       0 0 20px rgba(217,119,6,0.25);
--glow-gold-soft:  0 0 40px rgba(217,119,6,0.08);
--glow-purple:     0 0 20px rgba(124,58,237,0.20);
```

### Radial glows decorativos (hero, backgrounds)
```css
/* Mais suaves no light */
background: radial-gradient(circle, rgba(217,119,6,0.06) 0%, transparent 70%);
background: radial-gradient(circle, rgba(124,58,237,0.06) 0%, transparent 70%);
```

### Backdrop blur (navbar, topbar)
```css
/* Light — branco fosco */
background: rgba(248,250,252,0.85);
backdrop-filter: blur(16px);
border-bottom: 1px solid rgba(15,23,42,0.08);
```

### Drop shadow do score ring
```css
filter: drop-shadow(0 0 8px rgba(217,119,6,0.40));
```

---

## 5. Sombras (light — mais suaves)

| Token | Valor | Uso |
|-------|-------|-----|
| `--shadow-sm` | `0 1px 3px rgba(0,0,0,0.08)` | Lift sutil |
| `--shadow-md` | `0 4px 12px rgba(0,0,0,0.08)` | Cards padrão |
| `--shadow-lg` | `0 16px 40px rgba(0,0,0,0.10)` | Cards em hover |
| `--shadow-xl` | `0 24px 60px rgba(0,0,0,0.12)` | Demo cards, modais |

---

## 6. Animações e Transições

**Idênticas ao tema dark.** Mesmas durações, easings e keyframes.

---

## 7. Layout e Grid

**Idênticos ao tema dark.** Mesmas estruturas de sidebar, topbar, grids e containers.

**Diferenças de cor na estrutura:**

```css
/* Sidebar — light */
.sidebar {
  background: var(--bg-sidebar);       /* #F8FAFC */
  border-right: 1px solid rgba(15,23,42,0.08);
}

/* Topbar — light */
.topbar {
  background: rgba(248,250,252,0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(15,23,42,0.08);
}

/* Navbar flutuante — light */
nav {
  background: rgba(248,250,252,0.90);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(15,23,42,0.08);
}
```

---

## 8. Componentes (diferenças em relação ao dark)

### 8.1 Botão Primário (Gold) — ajuste light

O botão primário mantém o gradiente gold, mas a intensidade do glow é menor:

```css
.btn-primary {
  /* igual ao dark */
  background: linear-gradient(135deg, #D97706, #F59E0B);
  color: #FFFFFF;                       /* branco no light (mais contraste) */
  box-shadow: 0 4px 15px rgba(217,119,6,0.25);
}

.btn-primary:hover {
  box-shadow: var(--glow-gold);         /* 0 0 20px rgba(217,119,6,0.25) */
}
```

### 8.2 Card padrão — light

```css
.card {
  background: #FFFFFF;
  border: 1px solid rgba(15,23,42,0.08);
  border-radius: 16–24px;
  box-shadow: var(--shadow-sm);
  transition: all 0.2–0.3s ease;
}

.card:hover {
  border-color: rgba(217,119,6,0.30);
  box-shadow: var(--shadow-lg), 0 0 30px rgba(217,119,6,0.08);
  transform: translateY(-3–4px);
}
```

### 8.3 Nav item — light

```css
.nav-item {
  color: #94A3B8;                       /* text-dim no light */
}

.nav-item:hover {
  background: rgba(15,23,42,0.04);
  color: #475569;
}

.nav-item.active {
  background: rgba(217,119,6,0.10);
  color: #D97706;
  border: 1px solid rgba(217,119,6,0.25);
}
```

### 8.4 Input de busca — light

```css
.search-bar {
  background: #FFFFFF;
  border: 1px solid rgba(15,23,42,0.10);
}

.search-bar:focus-within {
  border-color: rgba(217,119,6,0.40);
  box-shadow: 0 0 0 3px rgba(217,119,6,0.08);
}

input::placeholder { color: #94A3B8; }
```

### 8.5 Score ring — sem alteração

O ring SVG mantém a mesma paleta gold — funciona bem tanto no dark quanto no light. Apenas o fundo da bolha central muda:

```css
/* Dark */  .score-center { /* sobre background escuro */ }
/* Light */ .score-center { /* sobre background branco #FFF */ }
```

### 8.6 Badge de score / pill — light (cores mais escuras)

```css
.score-high { background: rgba(5,150,105,0.10);  color: #059669; }
.score-mid  { background: rgba(217,119,6,0.10);  color: #D97706; }
.score-low  { background: rgba(220,38,38,0.10);  color: #DC2626; }
```

### 8.7 Section label — light

```css
.section-label {
  color: #D97706;                       /* gold mais escuro no light */
}

.section-label::before {
  background: #D97706;
}
```

### 8.8 Usage bar — light

```css
.usage-track {
  background: rgba(15,23,42,0.06);
}
/* fill mantém gradiente gold */
```

### 8.9 Hero badge — light

```css
.hero-badge {
  background: rgba(217,119,6,0.10);
  border: 1px solid rgba(217,119,6,0.30);
  color: #D97706;
}
```

### 8.10 Status / verdict badge — light

```css
/* Confiável */
.status-safe {
  background: rgba(5,150,105,0.10);
  border: 1px solid rgba(5,150,105,0.25);
  color: #059669;
}
```

---

## 9. Páginas — Diferenças Específicas

### Landing Page

- Fundo `#F8FAFC` com grid sutil escuro (`rgba(15,23,42,0.04)`)
- Navbar: fundo branco fosco com borda cinza sutil
- Hero: texto principal `#0F172A`, muted `#475569`
- Demo card: fundo branco `#FFFFFF`, sombra suave
- Pricing card featured: `border-color: rgba(217,119,6,0.30)` + `background: rgba(217,119,6,0.02)`
- Testimonial cards: fundo `#FFFFFF`, hover border gold sutil
- CTA box: `background: linear-gradient(135deg, rgba(217,119,6,0.06), rgba(124,58,237,0.04))`

### Dashboard / telas internas

- Sidebar: `background: #F8FAFC`, border direita `rgba(15,23,42,0.08)`
- Topbar: fundo branco fosco
- Stat cards: fundo `#FFFFFF`, sombra `shadow-sm`
- Grid cards: hover com borda gold `rgba(217,119,6,0.30)`
- Analysis rows: hover `rgba(15,23,42,0.02)`

### Resultado

- Wallet header card: fundo `#FFFFFF`, border sutil
- AI explain card: fundo `#FFFFFF`, texto muted `#475569`
- Score card border: `rgba(217,119,6,0.30)`
- Signal items: hover `rgba(15,23,42,0.02)`

### Histórico

- Tabela com fundo branco, rows alternando levemente
- `table-header`: `background: rgba(15,23,42,0.02)`
- Row hover: `rgba(15,23,42,0.025)`

### Billing

- Current plan banner: `background: linear-gradient(135deg, rgba(217,119,6,0.05), rgba(124,58,237,0.03))`
- Danger zone: `background: rgba(220,38,38,0.03)`

---

## 10. Anti-Patterns (Proibido no tema light)

- ❌ **`bg-white/10` ou transparências baixas em cards** — use `rgba(255,255,255,0.80)` mínimo
- ❌ **Texto `#94A3B8` (slate-400) como corpo** — contraste insuficiente no light
- ❌ **Texto muted em `#CBD5E1` ou mais claro** — abaixo de 4.5:1 no fundo branco
- ❌ **Border `rgba(255,255,255,0.x)`** — invisível no light, use `rgba(15,23,42,0.x)`
- ❌ **Glow muito intenso** — reduzir opacidade para máx 25% no light
- ❌ **Background escuro (`#0A1220`) misturado com componentes light** — nunca misturar temas
- ❌ **Mesmos valores de sombra do dark** — sombras dark são muito pesadas no light
- ❌ **Emojis como ícones** — SVG inline, igual ao dark
- ❌ **Cursor default em elementos clicáveis** — `cursor: pointer` obrigatório
- ❌ **Hovers sem transição** — mínimo `transition: all 0.15–0.2s ease`
- ❌ **Font Orbitron em corpo de texto** — apenas headings e números
- ❌ **Score sem cor semântica** — usar versões escuras: `#059669 / #D97706 / #DC2626`

---

## 11. Checklist de Entrega (Light)

- [ ] Background `#F8FAFC` com grid sutil escuro via `body::before`
- [ ] Fontes Orbitron + Exo 2 importadas
- [ ] Todos os textos de corpo com contraste ≥ 4.5:1 (mínimo `#475569`)
- [ ] Cards com fundo `#FFFFFF` e border `rgba(15,23,42,0.08)`
- [ ] Glass/frosted cards com opacidade ≥ 80%
- [ ] Sidebar com border `rgba(15,23,42,0.08)` (não border dark)
- [ ] Topbar com fundo branco fosco
- [ ] Gold em headers/acentos usa `#D97706` (não `#F59E0B` — baixo contraste no branco)
- [ ] Sombras suaves (`rgba(0,0,0,0.06–0.12)`)
- [ ] Glow effects com opacidade máxima 25%
- [ ] Score com cores semânticas escuras (`#059669 / #D97706 / #DC2626`)
- [ ] `cursor: pointer` em todos os interativos
- [ ] Hover states com `transition` 150–300ms
- [ ] Focus states visíveis
- [ ] `prefers-reduced-motion` respeitado
- [ ] Responsivo: 375px, 768px, 1024px, 1440px
- [ ] Sem scroll horizontal em nenhum breakpoint
