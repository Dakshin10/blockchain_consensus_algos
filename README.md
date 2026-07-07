# ⛓️ Consensus Algorithms in Blockchain — A Comparative Explorer

An interactive, single-page educational web application that visually explains, compares, and simulates the major blockchain consensus algorithms. The project is designed as a modern learning platform for students, developers, and blockchain enthusiasts, combining interactive visualizations with real-world blockchain implementations.

---

## 🌟 Features

### 📖 Interactive Algorithm Explorer
- Proof of Work (PoW)
- Proof of Stake (PoS)
- Delegated Proof of Stake (DPoS)
- Proof of History (PoH + PoS)
- Nominated Proof of Stake (NPoS)
- Tendermint BFT
- Avalanche Consensus
- Proof of Authority (PoA)
- Proof of Elapsed Time (PoET)

---

### 🔄 Dynamic Protocol Workflow

Each consensus algorithm includes:

- Overview
- Core mechanism
- Step-by-step execution
- Animated workflow timeline
- Plain language explanation

---

### 📊 Blockchain Trilemma Analysis

Visual comparison of:

- 🚀 Scalability
  - Transactions Per Second (TPS)
  - Block Time
- 🔒 Security
  - 51% Attack Resistance
  - Sybil Attack Resistance
- 🌐 Decentralization
  - Validator Participation
  - Network Distribution

Includes an animated radar chart and scorecards.

---

### 🌍 Blockchain Ecosystem Mapping

For every consensus algorithm:

- Associated Layer-1 blockchains
- Popular cryptocurrencies
- Design goals
- Consensus family
- Performance metrics

Examples:

- Bitcoin
- Ethereum
- Solana
- Cardano
- Polkadot
- Cosmos Hub
- Avalanche
- EOS
- TRON

---

### 💻 Smart Contract Language Mapping

Displays languages supported by each blockchain.

Examples include:

| Blockchain | Language |
|------------|----------|
| Ethereum | Solidity, Vyper |
| Solana | Rust |
| Cardano | Plutus |
| Polkadot | Rust (ink!) |
| Cosmos | CosmWasm (Rust) |
| Avalanche | Solidity |

---

### 🏗 Layer Classification

Visual distinction between:

- Layer 1 Blockchains
- Layer 2 Scaling Solutions

Includes explanations of:

- Base chains
- Rollups
- Sidechains
- Security inheritance

---

### 🔗 Compatibility Matrix

Interactive blockchain compatibility heatmap showing:

- Shared consensus mechanisms
- Compatible chains
- Different consensus families
- Cross-chain protocol understanding

Example:

| Blockchain A | Blockchain B | Compatibility |
|--------------|--------------|---------------|
| Ethereum | Cardano | ✅ PoS |
| Bitcoin | Solana | ❌ Different Consensus |

---

### 🛡 Attack Simulator

Interactive educational attack panel explaining:

- 51% Attack
- Sybil Attack
- Double Spending
- Long Range Attack
- Nothing-at-Stake
- Eclipse Attack

Each algorithm displays:

- Attack resistance
- Attack difficulty
- Mitigation strategies

---

### 🎨 Dynamic Theme Engine

The interface automatically changes color themes based on the selected consensus family.

Examples:

| Family | Accent Color |
|---------|--------------|
| Nakamoto | Amber |
| Staking | Purple |
| Byzantine | Cyan |
| Authority | Green |
| Avalanche | Rose |

---

### ♿ Accessibility

- Keyboard navigation
- High contrast mode
- Reduced motion support
- Responsive layout
- Screen reader friendly
- Focus indicators

---

## 🛠 Tech Stack

### Frontend

- React 19
- Vite
- Tailwind CSS
- HTML5 Canvas
- Context API
- useReducer

---

### Charts & Visualization

- HTML5 Canvas
- requestAnimationFrame
- Custom Radar Chart Engine
- Interactive Matrix Grid
- Dynamic Simulation Engine

---

### State Management

- React Context API
- useReducer
- CSS Variables
- Modular Component Architecture

---

## 📁 Project Structure

```text
blockchain/
│
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   ├── common/
│   │   ├── layout/
│   │   └── panels/
│   │
│   ├── constants/
│   ├── context/
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── ARCHITECTURE.md
├── README.md
├── package.json
└── vite.config.js
```

---

## 🚀 Installation

### Clone Repository

```bash
git clone https://github.com/<your-username>/blockchain-consensus-explorer.git

cd blockchain-consensus-explorer
```

---

### Install Dependencies

```bash
npm install
```

---

### Start Development Server

```bash
npm run dev
```

Application will be available at

```
http://localhost:5173
```

---

### Build Production

```bash
npm run build
```

---

### Preview Production Build

```bash
npm run preview
```

---

## 🎯 Learning Objectives

This project helps users understand:

- Blockchain Fundamentals
- Consensus Algorithms
- Blockchain Trilemma
- Validator Selection
- Mining
- Staking
- Smart Contracts
- Layer 1 vs Layer 2
- Blockchain Security
- Cross-chain Compatibility
- Blockchain Ecosystems

---

## 📚 Supported Consensus Algorithms

| Algorithm | Family | Example Blockchain |
|------------|--------|-------------------|
| Proof of Work | Nakamoto | Bitcoin |
| Proof of Stake | Staking | Ethereum |
| Delegated PoS | Staking | EOS |
| Proof of History + PoS | Hybrid | Solana |
| Nominated PoS | Staking | Polkadot |
| Tendermint BFT | Byzantine | Cosmos Hub |
| Avalanche | Gossip | Avalanche |
| Proof of Authority | Authority | VeChain |
| Proof of Elapsed Time | Trusted Execution | Hyperledger Sawtooth |

---

## 🎨 Design Principles

- Modern Dark Theme
- Protocol Control Center UI
- Smooth Micro Animations
- Responsive Layout
- Modular Components
- Performance Optimized
- Accessibility First

---

## 📖 Documentation

Additional documentation:

- **ARCHITECTURE.md** — Complete project architecture
- **context.md** — Project context and planning
- **webpage_data_format.md** — Data schema
- **consensus_algorithms_details.md** — Consensus reference

---

## 🤝 Contributing

Contributions are welcome!

1. Fork the repository
2. Create a feature branch

```bash
git checkout -b feature/new-feature
```

3. Commit changes

```bash
git commit -m "Add new feature"
```

4. Push to GitHub

```bash
git push origin feature/new-feature
```

5. Open a Pull Request

---

## 📜 License

This project is released under the **MIT License**.

---

## 👨‍💻 Author

**Dakshin Raj**

B.Tech Computer Science Engineering  
Amrita Vishwa Vidyapeetham, Coimbatore

---

## ⭐ Acknowledgements

This project is inspired by the need to make blockchain consensus mechanisms easier to understand through interactive visualizations and real-world comparisons. It is intended as an educational resource for students, developers, and researchers exploring distributed systems and blockchain technology.