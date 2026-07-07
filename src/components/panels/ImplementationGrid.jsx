import React from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"
import { Database, Code2, Cpu, Layers, ArrowRight, Sparkles, AlertCircle } from "lucide-react"

const BLOCKCHAIN_RATIONALES = {
  "Bitcoin": {
    why: "Prioritizes absolute decentralization and maximum security to act as global digital gold, accepting slow speed as a necessary tradeoff.",
    fact: "Mining difficulty adjusts every 2,016 blocks, and the total BTC supply is mathematically capped at 21 million."
  },
  "Litecoin": {
    why: "Designed for fast transaction settlements (2.5 min blocks) to serve as silver to Bitcoin's gold.",
    fact: "Swapped SHA-256 for Scrypt, which was initially resistant to specialized ASIC mining chips."
  },
  "Ethereum": {
    why: "Replaced expensive PoW in 2022 to reduce network electricity consumption by 99.9% while keeping high smart contract programmability.",
    fact: "Transitioning to PoS is known as 'The Merge' and was successfully completed without halting a single live transaction."
  },
  "Cardano": {
    why: "Built using peer-reviewed academic research to ensure formal verification and security proofs.",
    fact: "Uses Cardano's Ouroboros consensus, dividing history into epochs and slots."
  },
  "EOS": {
    why: "Created for high-speed decentralized apps with zero transaction fees for users.",
    fact: "Employs 21 block producers elected by token holder votes, achieving sub-second block times."
  },
  "TRON": {
    why: "Optimized for gaming dApps and cheap stablecoin transfers, maximizing transactional throughput.",
    fact: "Currently hosts the largest supply of USDT stablecoins in circulation globally."
  },
  "VeChain Thor": {
    why: "Tailored for logistics and enterprise tracking, offering a dual-token model to stabilize transaction costs.",
    fact: "Governed by a steering committee that pre-approves KYC-registered masternodes."
  },
  "Palm Network": {
    why: "A specialized Ethereum-aligned sidechain for art and NFTs, prioritizing low carbon emissions and low gas.",
    fact: "Cuts NFT minting gas fees by over 99% compared to Ethereum mainnet."
  },
  "Hyperledger Fabric": {
    why: "For private enterprise syndicates where transactions are confidential and only verified members can participate.",
    fact: "Totally tokenless; transactions are finalized using Docker chaincode containers immediately."
  },
  "Zilliqa": {
    why: "First public ledger to implement transaction sharding, splitting the network into parallel commit committees.",
    fact: "Uses PBFT within shards but PoW to prevent Sybil attacks."
  },
  "Solana": {
    why: "Engineered to replicate NASDAQ speeds, processing transactions concurrently in parallel.",
    fact: "Proof of History sequencer clock ticks over 2 million hashes per second."
  },
  "Hyperledger Sawtooth": {
    why: "For industrial logistics tracking using secure enclaves to keep mining CPU usage low.",
    fact: "Originally contributed by Intel, utilizing SGX secure enclaves."
  },
  "Avalanche": {
    why: "Created to spawn custom subnets with sub-second finality.",
    fact: "Resolves conflict states using metastable sub-sampling queries."
  }
}

export default function ImplementationGrid() {
  const { state } = useExplorer()
  const { selectedAlgo } = state
  const algo = consensusData[selectedAlgo]
  const blockchains = algo.realBlockchains || []

  // Dynamic compiler details to draw the flowchart
  const getCompilerPipeline = (chain) => {
    const l = chain.name.toLowerCase()
    if (l.includes("bitcoin") || l.includes("litecoin")) {
      return {
        lang: "Script",
        comp: "Assembler",
        vm: "Stack Engine",
        target: "UTXO Ledger"
      }
    }
    if (l.includes("ethereum") || l.includes("palm") || l.includes("vechain") || l.includes("tron")) {
      return {
        lang: "Solidity",
        comp: "solc",
        vm: "EVM Bytecode",
        target: "State Ledger"
      }
    }
    if (l.includes("solana")) {
      return {
        lang: "Rust",
        comp: "rustc",
        vm: "LLVM BPF",
        target: "Sealevel Ledger"
      }
    }
    if (l.includes("cardano")) {
      return {
        lang: "Plutus / Haskell",
        comp: "GHC / PlutusTx",
        vm: "UPLC (Plutus Core)",
        target: "EUTXO Ledger"
      }
    }
    if (l.includes("fabric")) {
      return {
        lang: "Go / TS",
        comp: "Docker / npm",
        vm: "Docker Sandbox",
        target: "Channel Ledger"
      }
    }
    if (l.includes("sawtooth")) {
      return {
        lang: "Python / Rust",
        comp: "Sabre compiler",
        vm: "WASM bytecode",
        target: "Sawtooth Ledger"
      }
    }
    return {
      lang: "Solidity / Go",
      comp: "solc / compiler",
      vm: "EVM / AVM",
      target: "Subnet Ledger"
    }
  }

  return (
    <div className="flex flex-col gap-10 w-full" role="region" aria-label="Ecosystem & Implementation Mappings">
      
      {/* 1. Real Blockchains presentation cards */}
      <section className="glass-panel w-full border border-brand-border/60 bg-slate-950/20 flex flex-col gap-5">
        <h2 className="edu-heading-secondary text-white uppercase flex items-center gap-2 pb-3 border-b border-brand-border/30">
          <Database className="w-5 h-5 text-indigo-400" />
          Real Blockchain Implementations
        </h2>

        <p className="edu-body text-slate-350 leading-relaxed font-light -mt-2">
          Consensus algorithms are implemented in production ledgers with differing parameter profiles:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
          {blockchains.map((chain) => {
            const rational = BLOCKCHAIN_RATIONALES[chain.name] || {
              why: "Consensus architecture aligned to support the execution of native transactions.",
              fact: "Designed for distributed ledger synchronization."
            }

            return (
              <div 
                key={chain.name}
                className="p-6 bg-slate-900/35 border border-brand-border hover:border-indigo-500 rounded-2xl flex flex-col gap-4 transition-all duration-300"
              >
                {/* Header: Name, Ticker, Year */}
                <div className="flex justify-between items-center border-b border-brand-border/20 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl dynamic-accent-glow-bg dynamic-accent-text border border-brand-border/50 flex items-center justify-center font-extrabold text-sm shadow-[0_0_15px_rgba(255,255,255,0.02)]">
                      {chain.cryptocurrencies.substring(0, 3)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-white leading-tight">{chain.name}</span>
                      <span className="text-[9px] font-mono text-slate-500 font-extrabold uppercase">TICKER: {chain.cryptocurrencies}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[8px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 uppercase">
                    {chain.layerClassification.split(" ")[0]} {chain.layerClassification.split(" ")[1] || ""}
                  </span>
                </div>

                {/* Specs parameters grid */}
                <div className="grid grid-cols-2 gap-y-2 text-[10px] font-mono text-slate-400 border-b border-brand-border/10 pb-3">
                  <div className="flex justify-between pr-4 border-r border-brand-border/15">
                    <span>TPS CAP:</span>
                    <span className="text-white font-bold">{algo.performance.tps.split(" ")[0] || "5,000"}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span>BLOCK TIME:</span>
                    <span className="text-white font-bold">{algo.performance.blockTime.split(" ")[0] || "Sec"}</span>
                  </div>
                  <div className="flex justify-between pr-4 border-r border-brand-border/15">
                    <span>ENERGY PROFILE:</span>
                    <span className="text-white font-bold">{algo.performance.energy.includes("Minimal") || algo.performance.energy.includes("Low") ? "CLEAN" : "HIGH"}</span>
                  </div>
                  <div className="flex justify-between pl-4">
                    <span>COMPILER:</span>
                    <span className="text-white font-bold">{chain.smartContractLanguages[0] || "None"}</span>
                  </div>
                </div>

                {/* Educational narratives: Why & Fact */}
                <div className="flex flex-col gap-3 text-xs leading-relaxed text-slate-350">
                  <div>
                    <span className="font-mono text-[9px] text-slate-500 font-bold block uppercase">Why this consensus was chosen:</span>
                    <p className="font-light text-slate-200 mt-0.5">{rational.why}</p>
                  </div>
                  <div className="p-3 bg-slate-950/60 border border-brand-border/20 rounded-xl flex gap-2 text-[11px] font-light italic text-slate-400">
                    <Sparkles className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-mono text-[8px] font-bold text-indigo-400 block uppercase not-italic">Interesting Fact:</span>
                      "{rational.fact}"
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 2. Smart Contract Compiler flow (Section 11) */}
      <section className="glass-panel w-full border border-brand-border/60 bg-slate-950/20 flex flex-col gap-5">
        <h2 className="edu-heading-secondary text-white uppercase flex items-center gap-2 pb-3 border-b border-brand-border/30">
          <Code2 className="w-5 h-5 text-indigo-400" />
          Smart Contract Execution Pipeline
        </h2>

        <p className="edu-body text-slate-350 leading-relaxed font-light -mt-2">
          Smart contracts are not written directly on blockchain ledgers. They compile from high-level languages into bytecodes interpreted by sandboxed execution environments:
        </p>

        <div className="flex flex-col gap-6 mt-2">
          {blockchains.map((chain) => {
            const pipe = getCompilerPipeline(chain)
            return (
              <div 
                key={`pipe-${chain.name}`} 
                className="p-5 rounded-2xl bg-slate-950 border border-brand-border/50 flex flex-col gap-4"
              >
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  {chain.name} Compilation Chain
                </span>

                {/* Animated steps flex */}
                <div className="flex flex-col md:flex-row items-center gap-4 justify-between font-mono text-[10px] text-center w-full">
                  
                  {/* Step 1: Language */}
                  <div className="p-4 rounded-xl border border-brand-border bg-slate-900 w-full md:w-1/4">
                    <span className="text-[8px] text-slate-500 block uppercase">1. WRITING LANGUAGE</span>
                    <span className="text-white font-bold text-xs mt-1 block">{pipe.lang}</span>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-600 rotate-90 md:rotate-0" />

                  {/* Step 2: Compiler */}
                  <div className="p-4 rounded-xl border border-brand-border bg-slate-900 w-full md:w-1/4">
                    <span className="text-[8px] text-slate-500 block uppercase">2. COMPILING ENGINE</span>
                    <span className="text-indigo-400 font-bold text-xs mt-1 block">{pipe.comp}</span>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-600 rotate-90 md:rotate-0" />

                  {/* Step 3: Virtual Machine */}
                  <div className="p-4 rounded-xl border border-brand-border bg-slate-900 w-full md:w-1/4">
                    <span className="text-[8px] text-slate-500 block uppercase">3. VIRTUAL MACHINE</span>
                    <span className="text-emerald-400 font-bold text-xs mt-1 block">{pipe.vm}</span>
                  </div>

                  <ArrowRight className="w-5 h-5 text-slate-600 rotate-90 md:rotate-0" />

                  {/* Step 4: Blockchain target */}
                  <div className="p-4 rounded-xl border border-brand-border bg-slate-900 w-full md:w-1/4">
                    <span className="text-[8px] text-slate-500 block uppercase">4. LEDGER STATE</span>
                    <span className="text-white font-bold text-xs mt-1 block">{pipe.target}</span>
                  </div>

                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 3. Layer Classification Diagram (Section 12) */}
      <section className="glass-panel w-full border border-brand-border/60 bg-slate-950/20 flex flex-col gap-5">
        <h2 className="edu-heading-secondary text-white uppercase flex items-center gap-2 pb-3 border-b border-brand-border/30">
          <Layers className="w-5 h-5 text-indigo-400" />
          Layer Classification Comparison
        </h2>

        <p className="edu-body text-slate-350 leading-relaxed font-light -mt-2">
          Blockchains classify into layers depending on where transaction execution and consensus finality take place:
        </p>

        {/* Side-by-side Layer 1 vs Layer 2 diagrams */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-2 items-stretch">
          
          {/* Layer 1 Panel */}
          <div className="p-6 bg-slate-900/30 border border-brand-border rounded-2xl flex flex-col gap-4 justify-between">
            <div className="flex flex-col gap-2">
              <span className="px-3 py-1 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-mono text-[9px] font-bold uppercase w-fit">
                Layer 1: Sovereign Settlement
              </span>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Layer 1 blockchains operate their own sovereign consensus nodes. They verify transactions, package them into blocks, and finalize state updates directly on their hardware.
              </p>
            </div>

            <div className="flex flex-col gap-2 bg-slate-950 p-4 rounded-xl font-mono text-[9.5px]">
              <div className="flex justify-between border-b border-brand-border/25 pb-1 text-slate-500">
                <span>PARAMETER:</span>
                <span>L1 PROFILE</span>
              </div>
              <div className="flex justify-between">
                <span>SECURITY SOURCE:</span>
                <span className="text-indigo-400 font-bold">Independent Validators Pool</span>
              </div>
              <div className="flex justify-between">
                <span>CONSENSUS ENGINE:</span>
                <span className="text-indigo-400 font-bold">Native Protocol Rules</span>
              </div>
              <div className="flex justify-between">
                <span>COORDINATES:</span>
                <span className="text-white">Bitcoin, Ethereum, Solana, Cardano</span>
              </div>
            </div>
          </div>

          {/* Layer 2 Panel */}
          <div className="p-6 bg-slate-900/30 border border-brand-border rounded-2xl flex flex-col gap-4 justify-between">
            <div className="flex flex-col gap-2">
              <span className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono text-[9px] font-bold uppercase w-fit">
                Layer 2: Off-Chain Scaling
              </span>
              <p className="text-xs text-slate-300 font-light leading-relaxed">
                Layer 2 networks execute batches of transactions off-chain to achieve lower costs and faster confirmations, but compress and report (anchor) their state roots back to a Layer 1 to inherit its physical/economic security.
              </p>
            </div>

            <div className="flex flex-col gap-2 bg-slate-950 p-4 rounded-xl font-mono text-[9.5px]">
              <div className="flex justify-between border-b border-brand-border/25 pb-1 text-slate-500">
                <span>PARAMETER:</span>
                <span>L2 PROFILE</span>
              </div>
              <div className="flex justify-between">
                <span>SECURITY SOURCE:</span>
                <span className="text-emerald-400 font-bold">Anchored L1 Security base</span>
              </div>
              <div className="flex justify-between">
                <span>EXECUTION RUNTIME:</span>
                <span className="text-emerald-400 font-bold">Off-Chain Rollup / Relays</span>
              </div>
              <div className="flex justify-between">
                <span>COORDINATES:</span>
                <span className="text-white">Lightning Network, Arbitrum, Palm Network</span>
              </div>
            </div>
          </div>

        </div>
      </section>

    </div>
  )
}
