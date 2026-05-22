# 🎬 GIFWARS — Arena de GIFs em Tempo Real

[![Node.js](https://img.shields.io/badge/Node.js-v18%2B-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-v5.0-blue.svg)](https://expressjs.com/)
[![Socket.io](https://img.shields.io/badge/Socket.io-v4.8-lightgrey.svg)](https://socket.io/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-v3.x-blueviolet.svg)](https://tailwindcss.com/)
[![Handlebars](https://img.shields.io/badge/Handlebars-v8.0-orange.svg)](https://handlebarsjs.com/)

**GIFWARS** é um jogo multiplayer online em tempo real onde a criatividade e a rapidez se encontram! O objetivo é simples: sugerir e votar em temas engraçados e, em seguida, batalhar usando os melhores GIFs possíveis que se encaixem no tema vencedor. Quem conseguir os melhores GIFs e acumular mais votos dos adversários ganha a coroa!

---

## 📌 Índice
1. [Características Principais](#-características-principais)
2. [Como Jogar](#%EF%B8%8F-como-jogar)
3. [Estrutura do Projeto](#-estrutura-do-projeto)
4. [Arquitetura Técnica](#%EF%B8%8F-arquitetura-técnica)
5. [Instalação e Execução](#%EF%B8%8F-instalação-e-execução)
6. [Testes e Depuração](#-testes-e-depuração)
7. [Tecnologias Utilizadas](#-tecnologias-utilizadas)

---

## 🚀 Características Principais
* **Multijogador em Tempo Real**: Desenvolvido com **Socket.io** para atualizações dinâmicas e sincronização de salas instantânea.
* **Auto-Ticker no Servidor**: O servidor controla o tempo de cada etapa através de um relógio centralizado, garantindo que o jogo avance mesmo se os jogadores se desconectarem ou ficarem inativos.
* **Sistema de Perfis**: Escolha de nome e avatares (PFP) exclusivos para identificação na arena.
* **Gerenciamento de Salas**: Criação de salas com parâmetros personalizáveis (número de rondas, tempo para sugerir temas, tempo para submeter GIFs).
* **Interface Glassmorphism Moderna**: Estilo visual premium e responsivo criado com Tailwind CSS e Lucide Icons.

---

## 🕹️ Como Jogar

O jogo é estruturado em rondas e fases consecutivas:

1. **Lobby (Sala de Espera)**: O Host cria a sala, define as regras e partilha o código único de acesso. O jogo requer no mínimo 2 jogadores para iniciar.
2. **Submissão de Temas (`THEME_SUBMISSION`)**: Todos os jogadores têm um tempo limite para propor temas para a ronda (ex: *"Segunda-feira às 8h"*).
3. **Votação do Tema (`THEME_VOTING`)**: O sistema sorteia dois temas sugeridos aleatoriamente. Todos os jogadores votam na sua escolha favorita.
4. **Vencedor do Tema (`THEME_WINNER`)**: O tema mais votado é revelado como o tema oficial da ronda.
5. **Submissão de GIFs (`GIF_SUBMISSION`)**: Os jogadores procuram e submetem um URL de um GIF que represente melhor o tema.
6. **Votação de GIFs (`GIF_VOTING`)**: Todos os GIFs submetidos são exibidos anonimamente. Cada jogador vota no melhor GIF (não é permitido votar no próprio GIF).
7. **Resultados da Ronda (`RESULTS`)**: Revela quem submeteu cada GIF e quantos votos recebeu. Cada voto atribui **10 pontos** ao autor do GIF.
8. **Podium Final (`FINAL_RANKING`)**: Ao fim de todas as rondas, é exibida a classificação final com os vencedores da partida.

---

## 📁 Estrutura do Projeto

```text
jogo-dos-gifs/
├── commons/
│   └── errors.mjs          # Mensagens de validação e tratamento de erros do jogo
├── data/
│   └── data.mjs            # Armazenamento e manipulação de estado em memória (players, rooms)
├── docs/
│   └── test.http           # Ficheiro de testes de rotas REST
├── mocks/                  # Pasta reservada para mocks de dados
├── services/
│   └── services.mjs        # Lógica de negócio e regras de transição do jogo
├── web/
│   ├── api/
│   │   └── web-api.mjs     # Rotas HTTP REST exclusivas para testes de integração
│   └── site/
│       ├── public/
│       │   ├── css/
│       │   │   └── style.css  # Configurações globais de Glassmorphism e estilos customizados
│       │   └── images/     # Avatares predefinidos dos jogadores (pfp-1.jpeg, etc.)
│       ├── views/          # Templates Handlebars (.hbs) para renderização no lado do servidor
│       │   ├── partials/   # Componentes reutilizáveis (header, footer)
│       │   └── ...         # Telas de cada fase do jogo (Lobby, Submit, Vote, Podium, etc.)
│       └── web-site.mjs    # Middleware de sessão, definição de rotas web e controle de sockets
├── package.json            # Configuração de dependências e scripts do Node.js
└── server.mjs              # Ponto de entrada da aplicação, servidor Express e Loop do Jogo
```

---

## ⚙️ Arquitetura Técnica

A aplicação segue uma arquitetura modular de camadas limpas:

### 1. Camada de Dados (`data.mjs`)
Controla o estado volátil das salas e jogadores utilizando estruturas `Map` e `Set` em memória. Não necessita de bases de dados externas, sendo ideal para sessões dinâmicas de curta duração.

### 2. Camada de Serviços (`services.mjs`)
Consolida as regras do jogo (atribuição de pontos, seleção de temas do pool, contagem de votos e progressão de rondas). É desacoplada da camada de rede.

### 3. Camada de Apresentação Web (`web-site.mjs`)
Implementa o servidor web em Express utilizando templates dinâmicos Handlebars.
* **Autenticação**: Baseada em Cookies com UUIDs gerados automaticamente para manter a identidade da sessão do jogador.
* **Comunicação Web Sockets**: Sincroniza em tempo real as mudanças de fase e atualizações de novos jogadores na sala através do Socket.io.

### 4. Ciclo de Auto-Avanço (Server-Side Ticker)
No ficheiro `server.mjs`, corre um loop centralizado (`setInterval`) a cada 1 segundo. Ele monitoriza os tempos limites de cada sala e altera automaticamente o estado do jogo para a fase seguinte caso o tempo expire.

---

## 🛠️ Instalação e Execução

### Pré-requisitos
* [Node.js](https://nodejs.org/) v18 ou superior instalado.

### Passos para Instalar
1. Clona este repositório no teu computador.
2. Abre a consola na pasta do projeto e instala as dependências necessárias:
   ```bash
   npm install
   ```

### Executar a Aplicação

* **Modo de Produção**:
  ```bash
  npm start
  ```
* **Modo de Desenvolvimento** (com reinício automático usando nodemon):
  ```bash
  npm run dev
  ```

Após iniciar, abre o teu browser em: **`http://localhost:3750`**

---

## 🧪 Testes e Depuração

O projeto inclui rotas REST sob o prefixo `/api` desenhadas especificamente para testes manuais rápidos.
* O ficheiro [test.http](file:///C:/Users/dr4g0/OneDrive/Ambiente%20de%20Trabalho/Dr4g0nTom/VsStudio/JOGOS/jogo-dos-gifs/docs/test.http) (localizado na pasta `docs/`) permite-te correr cenários completos (criar jogadores virtuais, forçar inícios de jogo, resetar scores) utilizando extensões de HTTP Client do editor (como o *REST Client* para o VS Code).

---

## 🛠️ Tecnologias Utilizadas

* **Runtime**: [Node.js](https://nodejs.org/)
* **Framework Web**: [Express](https://expressjs.com/)
* **Motor de Templates**: [Express Handlebars](https://handlebarsjs.com/)
* **Sockets**: [Socket.io](https://socket.io/)
* **CSS**: [TailwindCSS (CDN)](https://tailwindcss.com/)
* **Ícones**: [Lucide Icons](https://lucide.dev/)
