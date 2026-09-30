# Evangelho das Dimenúveis — Calendário Bíblico Lunar & Milenar (v2.3)

[![Version](https://img.shields.io/badge/Vers%C3%A3o-2.3-f59e0b.svg)](https://dimenuvel.github.io/Evangelho-das-Dimenuveis-site/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.x-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-4.x-38bdf8.svg)](https://tailwindcss.com/)
[![Licença: MIT](https://img.shields.io/badge/Licen%C3%A7a-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Um motor avançado de engenharia de calendários e aplicação web/mobile interativa (**v2.3**) que integra o **Tempo Sagrado Bíblico** (13 meses × 28 dias = 364 dias + Dia Zero = 365 dias), os **13 Signos Eclípticos do Zodíaco** (com o **13º Signo restaurado do Dragão** no Mês IX), o **Mapa Astral Natal Interativo de 13 Signos**, o **Zodíaco Chinês, Ciclo Sexagenário (60 Anos) & Os 4 Pilares do Nascimento (*BaZi*)**, **Festas Bíblicas Dependentes de GPS & Hemisfério**, **Indicador Ao Vivo do Sábado com Contagem Regressiva ao Pôr do Sol**, **Oração Diária Bíblica**, **Cálculos Lunares Astronômicos**, **Cronologia Histórica a.C./d.C.** (sem Ano Zero), a **Grande Semana Milenar de 7.000 Anos** e a árvore arquitetônica temporal do **Evangelho das Dimenúveis**.

---

## 🌟 Principais Funcionalidades (Novidades da Versão 2.3)

- **Estrutura do Calendário Sagrado (13 × 28 + Dia 0) & Navegação em Três Abas (Cap. II)**:
  - **Aba I — `I. Calendário Sagrado (13 Meses × 28 Dias)`**:
    - **13 meses sagrados iguais** de exatamente **28 dias** (4 semanas perfeitas de 7 dias por mês).
    - **Dia Zero (0)**: O limiar não numerado do Ano Novo Sagrado que antecede o Mês I, Dia 1.
    - **Sábado Semanal Contínuo**: Ciclo ininterrupto de Sábados de 7 dias preservado através de fronteiras de meses e anos (**52 Sábados semanais** por ano sagrado nos dias **7, 14, 21 e 28**).
    - **Sábado Anual do Dia Zero**: O Dia Zero é classificado como Sábado Anual, ou *Sábado Maior / Grão-Sábado* quando coincide com o 7º dia semanal.
  - **Aba II — `II. Dados Astrais & 13 Signos (Mapa Astral Natal)`**:
    - Dedicada exclusivamente à astronomia eclíptica dos 13 signos (*Mazzaroth*, Jó 38:32), ao 13º Signo restaurado do Dragão (Mês IX) e ao Mapa Astral Natal de 13 Signos.
  - **Aba III — `III. Zodíaco Chinês & 4 Pilares (12 Guardiões)`**:
    - Dedicada à astronomia oriental joviana (~12 anos), ao Ciclo Sexagenário de 60 anos (*Ganzhi* 干支), aos 5 Elementos (*Wu Xing* 五行) e aos 4 Pilares do Nascimento (*BaZi* 四柱八字).

- **Os 13 Signos Eclípticos, O 13º Signo do Dragão & Mapa Astral Natal (Cap. II — Aba II)**:
  - Correlaciona e mapeia todos os **13 Signos do Zodíaco Eclíptico (Mazzaroth — Jó 38:32)** diretamente nos **13 Meses Sagrados de 28 dias** (`360° / 13 ≈ 27,69°` de arco eclíptico por mês):
    - **Mês I**: ♈ Áries (*Cordeiro*) · **Mês II**: ♉ Touro · **Mês III**: ♊ Gêmeos · **Mês IV**: ♋ Câncer · **Mês V**: ♌ Leão · **Mês VI**: ♍ Virgem (*Espiga*) · **Mês VII**: ♎ Libra (*Balança*) · **Mês VIII**: ♏ Escorpião · **Mês IX**: ⛎ **O Dragão (*Ophiuchus / Draco — 13º Signo Restaurado*)** · **Mês X**: ♐ Sagitário · **Mês XI**: ♑ Capricórnio · **Mês XII**: ♒ Aquário · **Mês XIII**: ♓ Peixes.
  - **Mapa Astral Natal Interativo de 13 Signos (Data, Hora Exata e Cidade Natal)**:
    - **Roda Astral SVG de 13 Setores com Rótulos Tangenciais**: Renderiza a posição exata dos astros no momento do nascimento com nomes completos alinhados tangencialmente ao arco de cada signo (sem truncamento) e espaçamento radial/angular anticolisão.
    - **Local de Nascimento Manual (Cidade & País + Coordenadas)**: Permite alternar entre o **GPS Atual / Padrão** e a **Cidade & País de Nascimento (Manual)** (com busca automática de coordenadas via OpenStreetMap Nominatim + gazetteer offline integrado, além de ajuste fino de Latitude e Longitude) para calcular com precisão o **Nascer do Sol Natal**, o **Signo Ascendente (`ASC`)** e o **Meio do Céu (`MC`)**.
    - **Download do Mapa Astral em Alta Resolução (`2400 × 1660 px`)**: Exporta o alinhamento da roda zodiacal de 13 signos, metadados de nascimento, Tríade Natal, Efemérides de 10 Pontos e Aspectos Geométricos como pôster **`.PNG` arquivístico** (`html-to-image` `toCanvas` + quebra automática de linhas + suporte nativo `AndroidBridge.savePngFile` no APK Android).
    - **Inspeção Interativa de 10 Astros & Aspectos Geométricos Natais**:
      - **I. Tríade Natal Principal**: **☉ Sol Natal**, **☽ Lua Natal & Fase na Hora** e **ASC Signo Ascendente** (com a Porta Celeste de 1 Enoque 72 ativa no nascimento).
      - **II. Efemérides Natais nos 13 Signos**: Inspetor interativo ao vivo para **☉ Sol**, **☽ Lua**, **ASC Ascendente**, **MC Meio do Céu**, **☊ Cabeça do Dragão (Nodo Norte)**, **☿ Mercúrio**, **♀ Vênus**, **♂ Marte**, **♃ Júpiter** e **♄ Saturno**.
      - **III. Aspectos Geométricos de Alinhamento Natal**: Seleção individual e leitura detalhada de **Conjunção (0°)**, **Sextil (60°)**, **Quadratura (90°)**, **Trígono (120°)** e **Oposição (180°)**.

- **Zodíaco Chinês, Ciclo Sexagenário (60 Anos) & Os 4 Pilares do Nascimento — BaZi (Cap. II — Aba III)**:
  - **Limiar Astronômico do Ano Novo Lunar Chinês**: Calcula a conjunção exata da Lua Nova mais próxima de *Lichun* (`21 de janeiro a 20 de fevereiro`) para o ano de nascimento, atribuindo nascimentos de janeiro e início de fevereiro ao verdadeiro Ano Lunar Chinês.
  - **Roda Interativa dos 12 Ramos Terrestres (*Dizhi* 地支) & Pentagrama dos 5 Elementos (*Wu Xing* 五行)**:
    - Exibe os **12 Guardiões Terrestres**: 🐀 **Rato (*Zǐ* 子)**, 🐂 **Boi (*Chǒu* 丑)**, 🐅 **Tigre (*Yín* 寅)**, 🐇 **Coelho (*Mǎo* 卯)**, 🐉 **Dragão (*Chén* 辰)**, 🐍 **Serpente (*Sì* 巳)**, 🐎 **Cavalo (*Wǔ* 午)**, 🐐 **Cabra/Cordeiro (*Wèi* 未)**, 🐒 **Macaco (*Shēn* 申)**, 🐓 **Galo (*Yǒu* 酉)**, 🐕 **Cão (*Xū* 戌)** e 🐗 **Javali (*Hài* 亥)**, com suas respectivas **12 Vigílias Solares Duplas (*Shichen* 時辰 de 2 horas)** e o ciclo interno de geração (*Sheng*) e controle (*Ke*) dos **5 Elementos** (**Madeira 木**, **Fogo 火**, **Terra 土**, **Metal 金** e **Água 水**).
  - **Os Quatro Pilares do Nascimento (*BaZi* 四柱八字)**:
    - Sincronizado com a data gregoriana e hora exata de nascimento do usuário para calcular: **I. Pilar do Ano** (Signo Principal e Elemento Natal), **II. Pilar do Mês Solar** (Guardião da Estação), **III. Pilar do Dia** (*Mestre do Dia* / Ciclo Juliano de 60 dias) e **IV. Pilar da Hora Exata** (*Ascendente Oriental / Shichen*), além da **Ponte Cosmológica** entre o Dragão Oriental (*Qinglong / Chén*) e o 13º Signo do Dragão no Mês IX.
  - **Download do Mapa Oriental em Alta Resolução (`Baixar Mapa Oriental` / `Download Chinese Chart`)**: Exporta o pôster completo de `2400 × 1640 px` em formato **`.PNG`** com a Roda de 12 Guardiões, os 4 Pilares (*BaZi*) e o equilíbrio dos 5 Elementos.

- **Festas Bíblicas Dependentes de GPS & Inversão Sazonal de Hemisfério (Cap. III — Festas)**:
  - Cálculo dinâmico das **8 Solenidades de Levítico 23 (*Moedim*)**: *Páscoa (Pesach)*, *Pães Asmos*, *Primícias*, *Pentecostes (Shavuot)*, *Trombetas (Yom Teruah)*, *Dia da Expiação (Yom Kippur)*, *Tabernáculos (Sukkot — 7 dias)* e *Oitavo Dia (Shemini Atzeret — 1 dia)*.
  - **Adaptação Sazonal por Coordenadas GPS (Padrão: Jerusalém `31.7683°N, 35.2137°E`)**:
    - **Hemisfério Norte (`latitude >= 0`, incluindo Jerusalém Padrão)**: Festas da Primavera nos **Meses I–III** (Mar–Mai) e Festas do Outono no **Mês VII** (Set–Out).
    - **Hemisfério Sul (`latitude < 0`)**: Como os hemisférios Norte e Sul invertem as estações do ano, o motor inverte automaticamente o eixo sazonal em 6 Meses Sagrados — **Festas da Primavera Austral** nos **Meses VII–IX** (Set–Nov) e **Festas do Outono Austral** no **Mês I** (Mar–Abr).
  - Calcula o **horário exato do Pôr do Sol local (GPS)** e a iluminação lunar na véspera de cada festa para a latitude e longitude do observador.
  - Sincronização direta com o **Google Agenda Móvel / Web** e exportação de arquivo universal **`.ICS`** com lembretes automáticos.

- **Indicador Persistente do Sábado & Contagem Regressiva ao Pôr do Sol GPS (Cap. I & Cap. IV)**:
  - **Barra Indicadora Compacta no Topo da Página Inicial (`I. Hoje`)**:
    - Avalia a janela astronômica real de **Pôr do Sol a Pôr do Sol** (`getSunTimes`) na localização GPS do usuário para cada Sábado Semanal e Anual.
    - **Brilho Dourado quando o Sábado está Ativo**: Exibe o selo **`Sábado Ativo — Descanso Sagrado`** com o tempo restante até o término ao pôr do sol.
    - **Contagem Regressiva Durante a Semana**: Exibe **`Próximo Sábado`**, a data sagrada alvo, o horário do pôr do sol GPS e um cronômetro regressivo ao vivo (`Xd XXh XXm XXs`), navegando com 1 toque para a página **`IV. Sábado`**.

- **Oração Diária — Reflexão Bíblica Diária (`Cap. I — Hoje`)**:
  - Exibe na tela principal uma reflexão devocional e oração fundamentada nas Escrituras, gerada dinamicamente conforme a posição exata do dia no Calendário de 13 Meses (*Dia Zero*, *Sábado Semanal*, ou o tema espiritual do *Mês Sagrado I a XIII* e seu respectivo quarto semanal).

- **Aniversário Pessoal no Calendário de 13 Meses & Notificação Anual (Guia Interativo & Cap. III)**:
  - Permite inserir a data de nascimento do calendário gregoriano atual durante o **Guia Interativo (Tour)** ou a qualquer momento na página **`III. Festas`**.
  - Converte automaticamente a data de nascimento para seu equivalente perpétuo no **Calendário de 13 Meses × 28 Dias** (ou *Dia Zero*), calcula os ciclos sagrados completos, destaca o dia na grade do calendário com o selo roxo **`ANIV.` / `BDAY`** (semelhante ao selo **`HOJE`**) e ativa uma **Notificação Anual de Aniversário**.

- **Mapa Cosmológico do Livro de Enoque (1 Enoque 72–78) · Projeção de Mercator & 6 Portas Celestes**:
  - **As 6 Portas do Oriente e 6 Portas do Ocidente**: Projeção cilíndrica de Mercator ladeada pelas 6 Portas do Leste (`Porta 1 L` a `Porta 6 L`) e 6 Portas do Oeste (`Porta 1 O` a `Porta 6 O`), distribuídas entre o Trópico de Capricórnio (1ª Porta) e o Trópico de Câncer (6ª Porta).
  - **Travessia de Portais Estilo Pac-Man**: O Sol e a Lua emergem pela Porta Oriental ativa à direita, percorrem o mapa de Leste para Oeste iluminando os continentes, entram na Porta Ocidental correspondente à esquerda e reaparecem simultaneamente no Oriente com arco de retorno pelo Norte (1 Enoque 72:5).
  - **Iluminação Solar Dinâmica vs. Mostrar Tudo**: Alternância entre máscara diurna/noturna real dimensionada pela proporção de 18 partes do dia na Porta ativa e mapa totalmente iluminado.
  - **Especificações Astronômicas de 1 Enoque 72–74**: Exibe em tempo real a **Lei das 18 Partes de Dia e Noite** e a **Luz Lunar em 14 Partes** (`0/14` a `14/14 partes`), com animação contínua e controle deslizante interativo.

- **Motor de Camada Lunar Astronômica & Alertas Nativos**:
  - Cálculos sinódicos de fases da Lua de alta precisão (~29,530588 dias) com 8 fases lunares definidas e 3 modos de ancoragem (*Conjunção Astronômica*, *Primeiro Crescente Visível* e *Modelo Observacional*).
  - **Notificações Astronômicas e Sagradas**: Alertas para Nascer do Sol Diário (GPS), Mudança das 8 Fases da Lua, Sábados, Festas de Levítico 23, Dia Zero e Aniversário Sagrado (com agendamento `AlarmManager` no Android APK).

- **Cronologia Bíblica, Relógio da Grande Semana & Evento de Josué 10 (Cap. V & Cap. VI)**:
  - Motor matemático estrito **Sem Ano Zero** (`1 a.C. -> 1 d.C.`) com suporte a 4 modelos cronológicos (*Ussher 4004 a.C.*, *Rabínico Anno Mundi 3761 a.C.*, *Septuaginta 5508 a.C.* e *Época Sagrada Astronômica / Dimenúveis 4026 a.C.*).
  - **A Grande Semana (7.000 Anos)**: 6.000 anos solares de história humana culminando no 7º Milênio Sabático (2 Pedro 3:8, Apocalipse 20).
  - **Análise do Evento Candidato de Josué 10**: Catálogo de eclipses históricos (incluindo o eclipse anular de 30 de outubro de 1207 a.C.) e alternância opcional do **Ajuste Histórico de +1 Dia**.

- **Arquitetura Canônica do Evangelho das Dimenúveis (Cap. VII) & Impressão PDF**:
  - **Árvore do Tempo de 6 Camadas**, léxico completo de termos e selos de classificação de fonte de dados (`ASTRONOMICAL_CALCULATION`, `BIBLICAL_TEXT`, `HISTORICAL_RECORD`, `TRADITIONAL_CHRONOLOGY`, `INTERPRETIVE_MODEL`, `HYPOTHETICAL_MODEL`).
  - Exportação e impressão em alta resolução do **Almanaque Anual ou Mensal (PDF)** tanto no navegador quanto via spooler nativo de impressão do Android.
  - **Design Editorial Bilingue (Português & Inglês)** com **Modo Dia (Pergaminho Claro de Alto Contraste)** e **Modo Noite (Obsidiana Editorial)**.

---

## 📐 Matemática do Calendário & Eclíptica

$$\text{Ano Sagrado} = 1 \text{ Dia Zero (Sábado Anual)} + (13 \text{ Meses} \times 28 \text{ Dias}) = 365 \text{ Dias}$$

$$\text{Sábados Semanais} = \frac{364 \text{ Dias Numerados}}{7 \text{ Dias / Semana}} = 52 \text{ Sábados Semanais Ininterruptos}$$

$$\text{Arco Eclíptico Mensal} = \frac{364^\circ \text{ Ciclo Solar Numerado}}{13 \text{ Signos Eclípticos}} = 28^\circ \text{ por Mês Sagrado (incluindo o 13º Signo do Dragão no Mês IX)}$$

---

## 🛠 Tecnologia Utilizada

- **Frontend**: React 19, TypeScript 5, Vite 8, Tailwind CSS v4, html-to-image (Exportação PNG do Mapa Astral)
- **Tipografia**: Cormorant Garamond, EB Garamond, Lora (Estética editorial de livro clássico)
- **Ícones & Animações**: Lucide React, Motion (Framer Motion)
- **Astronomia**: SunCalc (Motor de posições solares, pôr do sol GPS e fases lunares) + Motores Natais Eclíptico de 13 Signos (`natalAstralMap.ts`) e Oriental de 12 Ramos / 4 Pilares BaZi (`chineseZodiac.ts`)
- **Android Nativo**: Java 17, Android SDK 34, `WebViewAssetLoader`, `AlarmManager` (Notificações em 2º plano), `PrintManager` (Exportação PDF), `ActivityResultContracts` (Download nativo de `.PNG` e `.ICS`) e `CalendarContract` (Integração Google Agenda)

---

## 🚀 Como Executar o Projeto

### Pré-requisitos

- Node.js (versão 18 ou superior recomendada)
- npm, yarn ou pnpm

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/dimenuvel/Evangelho-das-Dimenuveis-Calendario.git
   cd Evangelho-das-Dimenuveis-Calendario
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
   Acesse a aplicação em `http://localhost:3000`.

---

## 🧪 Bateria de Testes Automatizados

O projeto inclui uma **Suite de Verificação do Motor** dentro do próprio aplicativo (`src/tests/`, acessível na aba **VIII. Ajustes**) que executa 13 testes unitários verificando:

1. **Matemática do Calendário**: $13 \times 28 = 364 + \text{Dia } 0 = 365 \text{ dias}$.
2. **Fronteiras de Mês**: Transições M1 D28 $\rightarrow$ M2 D1 e M13 D28 $\rightarrow$ limiar do Dia Zero.
3. **Unicidade do Dia Zero**: Preservado como Sábado Anual do Dia 0.
4. **Ciclo Semanal Contínuo**: Exatamente 52 Sábados semanais ininterruptos.
5. **Cronologia a.C./d.C.**: Transição 1 a.C. $\rightarrow$ 1 d.C. sem Ano Zero.
6. **Grande Semana Milenar**: Transições do Milênio VI $\rightarrow$ Sábado do Milênio VII.
7. **Precisão Lunar Astronômica**: Exatidão de fase sinódica e iluminação.
8. **Isolamento de Josué 10**: Evento candidato isolado sem distorção forçada do calendário.
9. **Festas de Levítico 23 & Hemisfério GPS**: 8 festas bíblicas calculadas dinamicamente conforme a localização GPS (Norte vs. Sul).
10. **Integridade de Duração de Festas**: Distinção entre Tabernáculos (7d) e Oitavo Dia (1d).
11. **Sobreposição Sábado / Festa**: Detecção de dupla observância.
12. **Diferenciação Anual de Datas**: Conversões gregorianas dinâmicas entre diferentes anos.
13. **Responsividade da Ancoragem Lunar**: Recálculo automático de deslocamentos ao alterar o modo de ancoragem.

Para rodar a verificação de tipos e sintaxe via terminal:
```bash
npm run lint
```

---

## 📦 Build para Produção (Web & Android APK)

### Build Web
Para gerar os arquivos otimizados de produção (`dist/`):
```bash
npm run build
```

Para visualizar a versão de produção localmente:
```bash
npm run preview
```

### 📱 Geração Automática do Android APK (GitHub Actions)
O projeto inclui uma estrutura nativa Android para o aplicativo **Calendário das Dimenúveis** em `/android` (Gradle 8.7, AGP 8.5.2, Java 17, Android SDK 34, `WebViewAssetLoader`) e um workflow automatizado em `.github/workflows/android-apk.yml`.

Ao enviar código para a branch `main`/`master` (ou acionar manualmente em **Actions → Build Android APK → Run workflow** no GitHub):
1. O GitHub Actions instala o Node.js 22, compila o aplicativo Vite (`npm run build`) e sincroniza o bundle em `android/app/src/main/assets/public/`.
2. Configura automaticamente o **Java JDK 17 (Temurin)**, **Android SDK 34** e **Gradle 8.7**, baixando todas as dependências Maven/Gradle na nuvem.
3. Gera e assina os arquivos sincronizados automaticamente com a versão do rodapé (`v2.3`):
   - `Calendario-das-Dimenuveis-v2.3-release.apk` (Artifact: `Calendario-das-Dimenuveis-v2.3-release-apk` — APK Release assinado pronto para instalação)
   - `Calendario-das-Dimenuveis-v2.3-debug.apk` (Artifact: `Calendario-das-Dimenuveis-v2.3-debug-apk` — APK Debug)
4. Disponibiliza ambos os APKs para download direto na seção **Artifacts** da execução do workflow no GitHub.

---

## ✉️ Contato & Links Oficiais

- **Portal Oficial**: [Evangelho das Dimenúveis](https://dimenuvel.github.io/Evangelho-das-Dimenuveis-site/)
- **Contato**: [samuel.tiem@proton.me](mailto:samuel.tiem@proton.me?subject=Calend%C3%A1rio%20das%20Dimen%C3%BAveis)

---

## 📜 Licença

Este projeto está licenciado sob a **Licença MIT** — consulte o arquivo [LICENSE](LICENSE) para mais detalhes.
