# Project Context: Consensus Algorithms in Blockchain — A Comparative Explorer

This document preserves the project background, requirements, refined design specifications, implementation architecture, and setup instructions.

---

## 1. Original Task Description

Design and develop an interactive, single-page educational website titled **'Consensus Algorithms in Blockchain — A Comparative Explorer.'** The website should present a structured, visual comparison of all major consensus algorithms across the following dimensions:

1. **Algorithm Overview**: Name, core mechanism, and step-by-step explanation of how it works in plain language.
2. **Blockchain Trilemma Analysis**: Rate and explain how each algorithm balances Scalability (Block time and TPS), Security (attack resistance like 51% or Sybil), and Decentralization (node participation degree). Use a dynamic radar/spider chart or visual scorecard.
3. **Real-world Cryptocurrency Mapping**: Show which blockchains use each consensus algorithm and explain why that algorithm suits their design goals.
4. **Smart Contract Language Support**: List languages (e.g., Solidity, Rust) tied to those blockchains and their relation to consensus.
5. **Layer Classification**: Identify whether each blockchain operates at Layer 1 (base chain) or Layer 2 (scaling solution) with brief explanations of the distinction.
6. **Compatibility Matrix**: An interactive table or heatmap showing which pairs of blockchains share the same consensus mechanism (compatible) or use different ones (incompatible).

---

## 2. Refined Implementation Plan

### A. Data Model (`consensusData`)
A single, normalized JavaScript object is the source of truth, containing 9 consensus algorithms:
* **PoW** (Proof of Work)
* **PoS** (Proof of Stake)
* **DPoS** (Delegated Proof of Stake)
* **PBFT** (Practical Byzantine Fault Tolerance)
* **PoA** (Proof of Authority)
* **PoH** (Proof of History)
* **PoSpace** (Proof of Space & Time)
* **FBA** (Federated Byzantine Agreement)
* **Avalanche** (Avalanche Consensus)

### B. Interactive Layout Panels
1. **Header Selector Bar**: Sticky pills/tabs representing each algorithm, styled dynamically.
2. **Panel 1: Protocol Mechanics & Overview**: Textual mechanism description and numbered step timeline.
3. **Panel 2: Blockchain Trilemma Analysis**: Custom SVG radar chart (Scalability, Security, Decentralization) + horizontal progress bars with network stats (Block time, TPS).
4. **Panel 3: Real-World Implementations**: Grid of cards mapping blockchains to consensus with specific design rationales.
5. **Panel 4: Smart Contract Languages**: Tags colored by ecosystem (Solidity, Rust, Plutus, Go, Move, etc.) with VM descriptions.
6. **Panel 5: Protocol Layer Classification**: Badges detailing L1/L2 roles.
7. **Panel 6: Interoperability Matrix**: A 2D grid matrix mapping 19 major blockchains (BTC, DOGE, XMR, ETH, ADA, DOT, BNB, TRX, EOS, SOL, AVAX, XLM, XRP, XCH, FIL, VET, PALM, ZIL, HLF) color-coded by compatibility.

---

## 3. Technical Implementation Details

### A. Radar Chart SVG Geometry
To draw the trilemma radar chart on an inline `<svg viewBox="0 0 200 200">` without external libraries:
* The center is set to $(100, 100)$, with a max score radius of 75px.
* Angles for the 3 axes are:
  * **Scalability**: $-90^\circ$ (pointing straight up)
  * **Security**: $30^\circ$ (pointing down-right)
  * **Decentralization**: $150^\circ$ (pointing down-left)
* JavaScript converts the scores (0-10) to Cartesian $(x,y)$ coordinates:
  $$x_{\text{scalability}} = 100, \quad y_{\text{scalability}} = 100 - (\text{score} \times 7.5)$$
  $$x_{\text{security}} = 100 + (\text{score} \times 7.5 \times \cos(30^\circ)), \quad y_{\text{security}} = 100 + (\text{score} \times 7.5 \times \sin(30^\circ))$$
  $$x_{\text{decentralization}} = 100 - (\text{score} \times 7.5 \times \cos(30^\circ)), \quad y_{\text{decentralization}} = 100 + (\text{score} \times 7.5 \times \sin(30^\circ))$$

### B. Radar Easing Animation
An easing function updates the coordinates smoothly over a 400ms duration:
```javascript
function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}
```
`requestAnimationFrame` interpolates scores from the previous algorithm to the newly selected algorithm's scores to render smooth geometric morphing.

### C. Compatibility Matrix Logic
The 19x19 grid cell relationships are calculated as:
1. **High Compatibility (Full Green/Theme Color)**: Row and column blockchains run the *exact same* consensus algorithm (e.g., Bitcoin & Dogecoin = PoW).
2. **Medium Compatibility (Dashed Theme Border & Translucent Fill)**: Row and column blockchains belong to the *same paradigm family* (e.g., Ethereum (PoS) and BNB Chain (DPoS) = Staking family).
3. **Low Compatibility (Obsidian Slate/Grey)**: Protocols use different families (e.g., Bitcoin (PoW) and Solana (PoH/PoS)).

---

## 4. File Locations & Execution

* **Refined Plan**: [/home/krish/.gemini/antigravity-cli/brain/26c4c0b0-960e-45f5-bce4-1dfa8cb2bbe8/consensus_explorer_plan.md](file:///home/krish/.gemini/antigravity-cli/brain/26c4c0b0-960e-45f5-bce4-1dfa8cb2bbe8/consensus_explorer_plan.md)
* **Application Webpage**: [/home/krish/College/sem5/blockchain/index.html](file:///home/krish/College/sem5/blockchain/index.html)
* **Development Server**: Active background process on port `8080`.
  * Command: `python3 -m http.server 8080` (Run from directory `/home/krish/College/sem5/blockchain`)
  * Address: [http://localhost:8080](http://localhost:8080)
