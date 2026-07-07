import React from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"
import RadarChartCanvas from "../canvas/RadarChartCanvas"
import { Shield, Zap, Users, Shuffle, Sparkles, HelpCircle } from "lucide-react"

const TRILEMMA_DETAILS = {
  pow: {
    scalability: {
      why: "Requires every node to process every transaction sequentially and mine computationally heavy proof-of-work hash puzzles, yielding low throughput.",
      pros: "Extremely predictable execution times; immune to network latency splits.",
      cons: "Very low base TPS (~7 TPS on Bitcoin), long average block times (~10 minutes).",
      example: "Bitcoin, Litecoin"
    },
    security: {
      why: "Protected by physical electricity consumption (sunk cost). Tampering with transactions requires rebuilding subsequent blocks, which consumes billions of dollars of electricity.",
      pros: "Immense physical hash barrier makes double-signing financially suicide.",
      cons: "Vulnerable to centralization if ASIC manufacturing or mining pools aggregate in single countries.",
      example: "Bitcoin Network SHA-256"
    },
    decentralization: {
      why: "Anyone can boot up a mining machine and join without permissions. No capital token balance required to participate.",
      pros: "True censorship resistance; no central developer or corporation controls node entry.",
      cons: "Industrial economies of scale concentrate mining power in massive corporate data centers.",
      example: "Bitcoin's global pool spread"
    }
  },
  pos: {
    scalability: {
      why: "Replaces raw computational mining loops with digital validator signatures, reducing transaction settlement intervals to seconds.",
      pros: "Faster block confirmations (12 seconds on Ethereum), support for scaling shards and rollups.",
      cons: "Validator signature aggregation burdens node networks as validators grow.",
      example: "Ethereum EVM layer"
    },
    security: {
      why: "Protected by financial collateral (stakes). Validators who sign conflicting paths or double-sign blocks are caught and have their stakes burned (slashed).",
      pros: "Economic deterrent: attacks are self-destructive since validators lose their assets.",
      cons: "Liquid staking derivatives concentration (e.g. Lido) can pool validator voting keys.",
      example: "Ethereum Beacon Chain"
    },
    decentralization: {
      why: "Requires locking up capital (e.g. 32 ETH) to run a validator node. High initial capital entry barrier.",
      pros: "No heavy hardware or industrial power access required to run validator nodes.",
      cons: "Rich-get-richer dynamics: entities with higher tokens capture higher selection probability.",
      example: "Ethereum's 1M+ validators roster"
    }
  },
  dpos: {
    scalability: {
      why: "Transactions are coordinated by a small pool of elected block producers (typically 21 delegates), optimizing message speeds.",
      pros: "Sub-second block times, TPS exceeding 10,000+ without sharding delays.",
      cons: "High reliance on network bandwidth between the few active delegates.",
      example: "EOS, TRON"
    },
    security: {
      why: "Relies on voter reputation checks and delegate recall cycles. Security rests entirely on the integrity of the active 21 delegates.",
      pros: "Instant recall voting: malicious delegates are voted out in minutes.",
      cons: "Vulnerable to delegate collusions (cartels) and vote-buying networks.",
      example: "TRON Super Representatives"
    },
    decentralization: {
      why: "Very centralized. Token holders vote for delegates, but voting is capital-weighted and suffers from low turnout.",
      pros: "Highly structured governance with explicit representatives.",
      cons: "Only 21 nodes control transaction processing, creating central targets.",
      example: "EOS delegate groups"
    }
  },
  poa: {
    scalability: {
      why: "Identities of validators are verified. Blocks are signed in turn without puzzles or vote aggregation rounds.",
      pros: "Super high speeds, stable predictable fees, and instant transaction finality.",
      cons: "Private networks cannot scale permissionlessly to public operators.",
      example: "VeChain, Palm Network"
    },
    security: {
      why: "Relies on the legal risk of validator identity. If a validator acts maliciously, their corporate credentials are known, leading to lawsuits.",
      pros: "Immune to Sybil attacks since unauthorized nodes are ignored.",
      cons: "If validator private signing keys are hacked, attackers command the ledger.",
      example: "VeChain Masternodes"
    },
    decentralization: {
      why: "Complete centralization. Only pre-approved consortium members or corporate partners are granted signing slots.",
      pros: "Predictable, legal consortium alignment; no volatile token inflation needs.",
      cons: "Users must trust a closed corporation cartel to settle ledger history.",
      example: "Palm Network NFT sidechain"
    }
  },
  pbft: {
    scalability: {
      why: "Achieves instant transaction finality via N^2 prepare/commit multicasts, but messages grow quadratically with nodes.",
      pros: "No fork risks; transactions are final immediately when committing.",
      cons: "Validator count is constrained; node sizes above 100 stall communication.",
      example: "Hyperledger Fabric, Zilliqa"
    },
    security: {
      why: "Mathematically proven to remain safe and liveness-locked if less than 33.3% of the total network nodes are Byzantine.",
      pros: "Rigorous state-machine replication mathematics.",
      cons: "Network splits can cause complete liveness freezes.",
      example: "Hyperledger Fabric Raft/PBFT channels"
    },
    decentralization: {
      why: "Permissioned setups with a fixed validator membership list.",
      pros: "Maximum transaction privacy for enterprise logistics.",
      cons: "Not open to public validator participation.",
      example: "Hyperledger consortium channels"
    }
  },
  poh: {
    scalability: {
      why: "Uses a continuous VDF clock SHA-256 loop to tag transactions with timestamps, allowing parallel transaction execution.",
      pros: "Vast throughput matching NASDAQ speeds (~50,000+ TPS) with low block intervals (400ms).",
      cons: "Enormous network bandwidth demands to coordinate ledger synchronization.",
      example: "Solana mainnet"
    },
    security: {
      why: "VDF clock proof prevents reorganizing or pre-dating blocks. Backed by PoS stakes.",
      pros: "Solves the timestamp problem cryptographically without network delays.",
      cons: "Attacking VDF ASICs could allow ahead-of-time transaction previews.",
      example: "Solana Sealevel execution"
    },
    decentralization: {
      why: "High hardware and bandwidth entry limits restrict validators to specialized server configurations.",
      pros: "Single global ledger state without sharding complexity.",
      cons: "Staking pools and validator infrastructure costs aggregate in data centers.",
      example: "Solana's validator list"
    }
  },
  poet: {
    scalability: {
      why: "Lottery model using TEE sleep timers. Yields medium block intervals (10-30s) and moderate throughput.",
      pros: "Zero CPU power waste; nodes stay asleep until their timers expire.",
      cons: "Throughput is limited by the minimum sleep interval configuration.",
      example: "Sawtooth networks"
    },
    security: {
      why: "Relies entirely on CPU hardware enclaves (Intel SGX) to generate random signed sleep timers.",
      pros: "Fair lottery selection without computational mining or stakes.",
      cons: "Hardware side-channel exploits in CPU chips can ruin security.",
      example: "Hyperledger Sawtooth enclaves"
    },
    decentralization: {
      why: "Restricted to companies possessing TEE-compatible hardware architectures in permissioned networks.",
      pros: "Low barrier to entry for consortium participants without staking volatile tokens.",
      cons: "Consortium-driven; dependent on hardware manufacturer (Intel) keys.",
      example: "Sawtooth enterprise setups"
    }
  },
  avalanche: {
    scalability: {
      why: "Metastable random sub-sampling consensus propagates checks in logarithmic steps, allowing near-instant finality.",
      pros: "Sub-second block confirmation; scales validator size to millions without latency spikes.",
      cons: "Requires active gossip connectivity; prone to message loss in congested links.",
      example: "Avalanche C-Chain"
    },
    security: {
      why: "Safe against up to 80% Sybil attack weight, backed by mathematical tipping bounds.",
      pros: "Extremely secure; double-spend bounds are mathematically robust.",
      cons: "Vulnerable if large validator cartels lock up massive subnets.",
      example: "Avalanche Primary Network"
    },
    decentralization: {
      why: "Low validator hardware requirements allow thousands of concurrent participants to run nodes.",
      pros: "Very low entry barriers; nodes run on standard computing hardware.",
      cons: "Stake pooling in primary networks remains a centralization pressure.",
      example: "Avalanche validator subnet hubs"
    }
  }
}

export default function TrilemmaScorecard() {
  const { state, dispatch } = useExplorer()
  const { selectedAlgo, compareAlgo } = state

  const algo = consensusData[selectedAlgo]
  const target = algo.trilemma
  
  const compAlgo = compareAlgo ? consensusData[compareAlgo] : null
  const compTarget = compAlgo ? compAlgo.trilemma : null

  const details = TRILEMMA_DETAILS[selectedAlgo] || TRILEMMA_DETAILS.pow
  const compDetails = compAlgo ? (TRILEMMA_DETAILS[compareAlgo] || details) : null

  const handleCompareSelect = (id) => {
    dispatch({ type: "SET_COMPARE_ALGORITHM", payload: id })
  }

  return (
    <section className="glass-panel w-full flex flex-col gap-6 border border-brand-border/60 bg-slate-950/20" aria-labelledby="trilemma-title">
      
      {/* Title block with upgraded text */}
      <div className="flex items-center gap-2 border-b border-brand-border/30 pb-3">
        <Shield className="w-5 h-5 text-indigo-400" />
        <h2 id="trilemma-title" className="edu-heading-secondary text-white uppercase">
          The Blockchain Trilemma Core Tradeoffs
        </h2>
      </div>

      <p className="edu-body text-slate-350 leading-relaxed font-light -mt-2">
        The Blockchain Trilemma states that a decentralized database can only achieve two of three properties at any single time: <strong>Security</strong>, <strong>Scalability</strong>, or <strong>Decentralization</strong>. Consensuses are mathematically engineered tradeoffs.
      </p>

      {/* Main split: chart and progress meters */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center mt-2">
        
        {/* Radar Chart (40% width on large screens) */}
        <div className="lg:col-span-2 flex flex-col items-center justify-center p-4 bg-slate-950/45 border border-brand-border/40 rounded-2xl h-80 relative">
          <span className="absolute top-3 left-4 text-[9px] font-mono text-slate-500 uppercase">
            Radar Coordinate Axis Map
          </span>
          <RadarChartCanvas />
        </div>

        {/* 3 Large Progress Bars (60% width on large screens) */}
        <div className="lg:col-span-3 flex flex-col gap-6">
          
          {/* Scalability Progress Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-mono font-bold tracking-wider">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Zap className="w-4 h-4 text-amber-450" />
                SCALABILITY (TPS & SPEED)
              </span>
              <span className="text-white text-sm">
                {target.scalability}/10
                {compTarget && (
                  <span className="text-[10px] font-normal font-mono ml-2" style={{ color: compAlgo.color }}>
                    vs {compTarget.scalability}/10
                  </span>
                )}
              </span>
            </div>
            
            {/* Taller progress bar */}
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-brand-border/20 relative">
              <div
                className="h-full rounded-full dynamic-accent-bg transition-all duration-300"
                style={{ width: `${target.scalability * 10}%` }}
              />
              {compTarget && (
                <div
                  className="absolute top-0 bottom-0 h-full opacity-65 border-r border-white/60 transition-all duration-300"
                  style={{ 
                    width: `${compTarget.scalability * 10}%`,
                    backgroundColor: compAlgo.color 
                  }}
                />
              )}
            </div>
          </div>

          {/* Security Progress Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-mono font-bold tracking-wider">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Shield className="w-4 h-4 text-indigo-405" />
                SECURITY (ATTACK RESISTANCE)
              </span>
              <span className="text-white text-sm">
                {target.security}/10
                {compTarget && (
                  <span className="text-[10px] font-normal font-mono ml-2" style={{ color: compAlgo.color }}>
                    vs {compTarget.security}/10
                  </span>
                )}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-brand-border/20 relative">
              <div
                className="h-full rounded-full dynamic-accent-bg transition-all duration-300"
                style={{ width: `${target.security * 10}%` }}
              />
              {compTarget && (
                <div
                  className="absolute top-0 bottom-0 h-full opacity-65 border-r border-white/60 transition-all duration-300"
                  style={{ 
                    width: `${compTarget.security * 10}%`,
                    backgroundColor: compAlgo.color 
                  }}
                />
              )}
            </div>
          </div>

          {/* Decentralization Progress Bar */}
          <div className="flex flex-col gap-2">
            <div className="flex justify-between items-center text-xs font-mono font-bold tracking-wider">
              <span className="flex items-center gap-1.5 text-slate-300">
                <Users className="w-4 h-4 text-emerald-450" />
                DECENTRALIZATION (OPERATORS NODES)
              </span>
              <span className="text-white text-sm">
                {target.decentralization}/10
                {compTarget && (
                  <span className="text-[10px] font-normal font-mono ml-2" style={{ color: compAlgo.color }}>
                    vs {compTarget.decentralization}/10
                  </span>
                )}
              </span>
            </div>
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden border border-brand-border/20 relative">
              <div
                className="h-full rounded-full dynamic-accent-bg transition-all duration-300"
                style={{ width: `${target.decentralization * 10}%` }}
              />
              {compTarget && (
                <div
                  className="absolute top-0 bottom-0 h-full opacity-65 border-r border-white/60 transition-all duration-300"
                  style={{ 
                    width: `${compTarget.decentralization * 10}%`,
                    backgroundColor: compAlgo.color 
                  }}
                />
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Side-by-Side Detailed Breakdown Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
        
        {/* Scalability Detailed Panel */}
        <div className="p-5 rounded-2xl bg-slate-900/20 border border-brand-border/40 flex flex-col gap-3">
          <span className="text-[10px] font-mono font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1 border-b border-brand-border/25 pb-2">
            <Zap className="w-3.5 h-3.5" />
            SCALABILITY EXPLAINED
          </span>
          <div className="text-xs text-slate-300 font-light flex flex-col gap-2 leading-relaxed">
            <div>
              <strong className="text-slate-400 font-mono text-[9px] block uppercase">Why this score?</strong>
              <p className="mt-0.5">{details.scalability.why}</p>
            </div>
            <div>
              <strong className="text-slate-400 font-mono text-[9px] block uppercase">Advantages:</strong>
              <p className="text-emerald-400 font-normal mt-0.5">✔ {details.scalability.pros}</p>
            </div>
            <div>
              <strong className="text-slate-400 font-mono text-[9px] block uppercase">Tradeoffs:</strong>
              <p className="text-rose-455 font-normal mt-0.5">✘ {details.scalability.cons}</p>
            </div>
            <div className="mt-1 pt-1 border-t border-brand-border/10">
              <span className="text-[9px] text-slate-500 font-mono uppercase">REAL BLOCKCHAINS:</span>
              <span className="text-white block font-mono text-[10px] mt-0.5">{details.scalability.example}</span>
            </div>
          </div>
        </div>

        {/* Security Detailed Panel */}
        <div className="p-5 rounded-2xl bg-slate-900/20 border border-brand-border/40 flex flex-col gap-3">
          <span className="text-[10px] font-mono font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1 border-b border-brand-border/25 pb-2">
            <Shield className="w-3.5 h-3.5" />
            SECURITY EXPLAINED
          </span>
          <div className="text-xs text-slate-300 font-light flex flex-col gap-2 leading-relaxed">
            <div>
              <strong className="text-slate-400 font-mono text-[9px] block uppercase">Why this score?</strong>
              <p className="mt-0.5">{details.security.why}</p>
            </div>
            <div>
              <strong className="text-slate-400 font-mono text-[9px] block uppercase">Advantages:</strong>
              <p className="text-emerald-400 font-normal mt-0.5">✔ {details.security.pros}</p>
            </div>
            <div>
              <strong className="text-slate-400 font-mono text-[9px] block uppercase">Tradeoffs:</strong>
              <p className="text-rose-455 font-normal mt-0.5">✘ {details.security.cons}</p>
            </div>
            <div className="mt-1 pt-1 border-t border-brand-border/10">
              <span className="text-[9px] text-slate-500 font-mono uppercase">REAL BLOCKCHAINS:</span>
              <span className="text-white block font-mono text-[10px] mt-0.5">{details.security.example}</span>
            </div>
          </div>
        </div>

        {/* Decentralization Detailed Panel */}
        <div className="p-5 rounded-2xl bg-slate-900/20 border border-brand-border/40 flex flex-col gap-3">
          <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1 border-b border-brand-border/25 pb-2">
            <Users className="w-3.5 h-3.5" />
            DECENTRALIZATION EXPLAINED
          </span>
          <div className="text-xs text-slate-300 font-light flex flex-col gap-2 leading-relaxed">
            <div>
              <strong className="text-slate-400 font-mono text-[9px] block uppercase">Why this score?</strong>
              <p className="mt-0.5">{details.decentralization.why}</p>
            </div>
            <div>
              <strong className="text-slate-400 font-mono text-[9px] block uppercase">Advantages:</strong>
              <p className="text-emerald-400 font-normal mt-0.5">✔ {details.decentralization.pros}</p>
            </div>
            <div>
              <strong className="text-slate-400 font-mono text-[9px] block uppercase">Tradeoffs:</strong>
              <p className="text-rose-455 font-normal mt-0.5">✘ {details.decentralization.cons}</p>
            </div>
            <div className="mt-1 pt-1 border-t border-brand-border/10">
              <span className="text-[9px] text-slate-500 font-mono uppercase">REAL BLOCKCHAINS:</span>
              <span className="text-white block font-mono text-[10px] mt-0.5">{details.decentralization.example}</span>
            </div>
          </div>
        </div>

      </div>

      {/* Comparison Selector Matrix footer */}
      <div className="border-t border-brand-border/20 pt-4 mt-4">
        <div className="flex items-center gap-1.5 mb-2.5">
          <Shuffle className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-400 uppercase">
            Interactive Comparison Overlay Mode (Overlay secondary radar plots)
          </span>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {Object.keys(consensusData).map((key) => {
            const current = consensusData[key]
            const isSelf = key === selectedAlgo
            const isCompared = key === compareAlgo

            let btnClass = "border-brand-border/50 text-slate-500 hover:border-brand-border hover:text-slate-300 bg-transparent"
            let style = {}

            if (isSelf) {
              btnClass = "border-transparent text-slate-650 cursor-not-allowed opacity-50 bg-slate-900/60"
            } else if (isCompared) {
              btnClass = "text-white ring-1 ring-white"
              style = {
                borderColor: current.color,
                backgroundColor: current.glow,
              }
            }

            return (
              <button
                key={key}
                disabled={isSelf}
                onClick={() => handleCompareSelect(key)}
                className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold border transition-all duration-200 cursor-pointer ${btnClass}`}
                style={style}
              >
                {current.name.toUpperCase()}
              </button>
            )
          })}
        </div>
      </div>

    </section>
  )
}
