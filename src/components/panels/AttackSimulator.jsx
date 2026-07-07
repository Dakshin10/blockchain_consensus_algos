import React from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"
import { ShieldAlert, ShieldCheck, Zap, Shield, HelpCircle, ArrowRight, Skull } from "lucide-react"

export default function AttackSimulator() {
  const { state, dispatch } = useExplorer()
  const { selectedAlgo, activeAttack } = state
  const algo = consensusData[selectedAlgo]

  const attacks = [
    {
      id: "51percent",
      name: "51% Weight Attack",
      description: "Acquire a majority of consensus weight (hashrate, stake, or replicas) to rewrite blocks and double-spend.",
    },
    {
      id: "sybil",
      name: "Sybil Identity Attack",
      description: "Flood the network with dummy identities to dominate communication links, censor blocks, or warp voting.",
    },
    {
      id: "nothingAtStake",
      name: "Nothing at Stake",
      description: "Sign competing forks simultaneously since block creation is cheap, preventing consensus convergence.",
    },
    {
      id: "longRange",
      name: "Long Range History Attack",
      description: "Rebuild an alternate historical ledger starting from the Genesis block using compromised past validator keys.",
    },
  ]

  // Vulnerability assessment values based on active algorithm
  const getVulnerabilityStats = (attackId) => {
    switch (attackId) {
      case "51percent":
        if (algo.id === "pow") return { risk: "MEDIUM", color: "text-amber-400 border-amber-500/30", level: 50 }
        if (algo.id === "pos") return { risk: "LOW", color: "text-emerald-400 border-emerald-500/30", level: 25 }
        if (algo.id === "dpos") return { risk: "HIGH", color: "text-rose-500 border-rose-500/30", level: 75 }
        if (algo.id === "pbft") return { risk: "HIGH", color: "text-rose-500 border-rose-500/30", level: 85 }
        if (algo.id === "poa") return { risk: "MEDIUM", color: "text-amber-400 border-amber-500/30", level: 60 }
        return { risk: "LOW", color: "text-emerald-400 border-emerald-500/30", level: 30 }

      case "sybil":
        if (algo.id === "pow" || algo.id === "pos" || algo.id === "dpos" || algo.id === "avalanche") {
          return { risk: "PREVENTED", color: "text-emerald-450 border-emerald-500/30", level: 5 }
        }
        return { risk: "LOW (KYC BLOCKED)", color: "text-emerald-450 border-emerald-500/30", level: 10 }

      case "nothingAtStake":
        if (algo.id === "pow" || algo.id === "poh" || algo.id === "pbft") {
          return { risk: "PREVENTED", color: "text-emerald-450 border-emerald-500/30", level: 2 }
        }
        return { risk: "LOW (SLASHING FORCE)", color: "text-emerald-400 border-emerald-500/30", level: 15 }

      case "longRange":
        if (algo.id === "pow" || algo.id === "poh" || algo.id === "pbft") {
          return { risk: "PREVENTED", color: "text-emerald-450 border-emerald-500/30", level: 1 }
        }
        return { risk: "LOW (CHECKPOINTED)", color: "text-emerald-400 border-emerald-500/30", level: 12 }

      default:
        return { risk: "NOMINAL", color: "text-slate-400 border-brand-border/40", level: 0 }
    }
  }

  // Narration sequence for educational flowcharting
  const getAttackFlowSteps = (attackId) => {
    switch (attackId) {
      case "51percent":
        return [
          { name: "Attacker", desc: "Monopolizes resources (hashing hardware, staking pool, or replicas)." },
          { name: "Resource Spike", desc: "Acquires >51% consensus weight to control block selections." },
          { name: "Fork Attempt", desc: "Produces alternative private block branch secretly." },
          { name: "L1 Sweep", desc: "Publishes longer chain, forcing nodes to discard honest blocks." },
          { name: "Defense Check", desc: algo.id === "pow" ? "Sunk physical energy cost makes attack economically irrational." : "Slashing rules burn staker collateral." }
        ]
      case "sybil":
        return [
          { name: "Attacker", desc: "Fires up thousands of virtual machines." },
          { name: "Dummy Flood", desc: "Attempts to broadcast node profiles to peer tables." },
          { name: "Weight Check", desc: "Validator weight checks reveal nodes lack required tokens or ASICs." },
          { name: "Rejection", desc: "Consensus remains weighted by capital stake, ignoring node count." },
          { name: "Outcome", desc: "Flood is ignored; network balances remain safe." }
        ]
      case "nothingAtStake":
        return [
          { name: "Split Chain", desc: "A transient network delay causes block history to fork." },
          { name: "Double Sign", desc: "Stakers sign blocks on both Fork A and Fork B paths." },
          { name: "Audit Detect", desc: "Signature logs scan validator block signatures." },
          { name: "Slashing Act", desc: "Double-signing triggers smart contract slashing rules." },
          { name: "Burning", desc: "Stakers collateral is burned; staker is banned from consensus." }
        ]
      default: // longRange
        return [
          { name: "Key Leak", desc: "Attacker buys old compromised staker private keys from genesis epoch." },
          { name: "Alt History", desc: "Builds private history chain from genesis block to current epoch." },
          { name: "Broadcast", desc: "Presents alt history to newly connecting bootstrap nodes." },
          { name: "Audit Rule", desc: "Nodes check weak subjectivity checkpoints." },
          { name: "Rejection", desc: "Chain updates older than checkpoint finality are rejected." }
        ]
    }
  }

  // Custom mitigations and evaluations mapping from dataset
  const getAttackEvaluation = (attackId) => {
    switch (attackId) {
      case "51percent":
        if (algo.id === "pow") {
          return {
            status: "PLAUSIBLE (HIGH COST)",
            succeeds: "Succeeds if an attacker rents or buys >51% of global ASIC hashing power, allowing double-spending.",
            defense: "IMMENSE ENERGY COST: Sunk power costs ($B scale) make it financially irrational compared to mining honestly.",
            risk: "ASIC manufacturing centralization and pool collusion.",
          }
        } else if (algo.id === "pos") {
          return {
            status: "PLAUSIBLE (HIGH COST)",
            succeeds: "Succeeds if an attacker purchases >51% of all staked tokens, controlling proposer schedules.",
            defense: "COLLATERAL SLASHING: Attacking validators have their multi-billion dollar stakes slashed and burned.",
            risk: "Token concentration in liquid staking derivatives.",
          }
        } else if (algo.id === "dpos") {
          return {
            status: "PLAUSIBLE (VOTER COLLUSION)",
            succeeds: "Succeeds if a cartel controls enough voting stake to elect a majority of active delegates.",
            defense: "RECALL VOTING: Token holders can detect censorship and instantly vote out malicious delegates.",
            risk: "Low voter turnout and delegate cartels.",
          }
        } else if (algo.id === "pbft") {
          return {
            status: "PLAUSIBLE (f FAULTS)",
            succeeds: "Succeeds if >33% of closed replicas are compromised (Byzantine threshold exceeded).",
            defense: "CLOSED MEMBERSHIP: Consortium checks restrict node entry. Requires compromising physical firewalls.",
            risk: "Single point of administrative consortium breach.",
          }
        } else if (algo.id === "poa") {
          return {
            status: "PLAUSIBLE (KEY BREACH)",
            succeeds: "Succeeds if an attacker compromises a majority of known signing keys.",
            defense: "LEGAL ACCOUNTABILITY: Corporate identity is known; malicious nodes are legally sued and keys blacklisted.",
            risk: "Insider threat and key custody vulnerability.",
          }
        } else if (algo.id === "poh") {
          return {
            status: "PLAUSIBLE (SHA RENTAL)",
            succeeds: "Succeeds if coupled with PoS stake monopolization (>51%) to sign alternative histories.",
            defense: "VDF SEQUENCING: Attacker cannot compile history faster than the sequential SHA-256 ticks of the VDF clock.",
            risk: "Fast hardware ASIC VDF loop speed improvements.",
          }
        } else if (algo.id === "avalanche") {
          return {
            status: "PLAUSIBLE (>80% SYBILS)",
            succeeds: "Succeeds if the attacker controls >80% of node weights, poisoning random sub-sampling rounds.",
            defense: "METASTABLE RESISTANCE: Mathematical bounds prove security stands up to an unprecedented 80% adversarial weight.",
            risk: "Massive token supply pooling.",
          }
        } else {
          return {
            status: "PLAUSIBLE (TEE BREACH)",
            succeeds: "Succeeds if enclaves are modified to bypass timer wait intervals.",
            defense: "HARDWARE DECRYPTION: Intel SGX signatures certify timer authenticity.",
            risk: "Zero-day hardware bugs.",
          }
        }

      case "sybil":
        if (algo.id === "pow") {
          return {
            status: "BLOCKED",
            succeeds: "Fails because adding fake node identities does not grant hashing power (ASIC checks).",
            defense: "POW PUZZLES: Proposals require expensive CPU cycles, making node replication useless.",
            risk: "Bandwidth DDoS flooding on nodes.",
          }
        } else if (algo.id === "pos" || algo.id === "dpos" || algo.id === "avalanche") {
          return {
            status: "BLOCKED",
            succeeds: "Fails because voting power is weighted by staked token capital, not by node count.",
            defense: "FINANCIAL STAKING: Staking token requirements prevent Sybils from acquiring voting weight.",
            risk: "Dust wallets pooling.",
          }
        } else if (algo.id === "pbft" || algo.id === "poa") {
          return {
            status: "BLOCKED",
            succeeds: "Fails because node addition is restricted to pre-authorized administrative keys.",
            defense: "CERTIFICATE AUTHORITIES: Unauthorized nodes are ignored by peers.",
            risk: "Consortium certificate server compromises.",
          }
        } else {
          return {
            status: "BLOCKED",
            succeeds: "Fails because validators require certified hardware enclaves.",
            defense: "ENCLAVE VALIDATION: TEE attestations verify identity before accepting votes.",
            risk: "Enclave manufacturer security vulnerabilities.",
          }
        }

      case "nothingAtStake":
        if (algo.id === "pow" || algo.id === "poh") {
          return {
            status: "PREVENTED NATIVELY",
            succeeds: "Fails because hashing competing forks splits physical mining power, reducing rewards.",
            defense: "ENERGY COST: Hashing requires electricity. Miners naturally focus resources on the longest chain.",
            risk: "Transient chain splits (forks).",
          }
        } else if (algo.id === "pos" || algo.id === "dpos") {
          return {
            status: "DEFENDED (ECONOMIC)",
            succeeds: "Plausible if proposing blocks has zero cost. Validators sign all forks to guarantee payout.",
            defense: "SLASHING AUDITS: Double-signing competing block slots triggers collateral confiscation.",
            risk: "Late slashing detection under severe network splits.",
          }
        } else if (algo.id === "pbft" || algo.id === "poa") {
          return {
            status: "PREVENTED NATIVELY",
            succeeds: "Fails because state steps require explicit signed consensus rounds (Pre-prepare, Commit).",
            defense: "FINALITY ROUNDS: Three-phase voting guarantees only one block path achieves a 2/3 majority.",
            risk: "Liveness locks if nodes split 50/50.",
          }
        } else {
          return {
            status: "PREVENTED NATIVELY",
            succeeds: "Fails because enclaves reject signing blocks with conflicting timers.",
            defense: "ENCLAVE MEMORY: Secure enclaves enforce monotonic counters, preventing double-signing.",
            risk: "Enclave hardware memory side-channel breaches.",
          }
        }

      default: // longRange
        if (algo.id === "pow" || algo.id === "poh") {
          return {
            status: "BLOCKED",
            succeeds: "Fails because re-writing history requires accumulating more hashing power than the honest chain.",
            defense: "CUMULATIVE WORK: Rebuilding history requires repeating SHA-256 cycles, which is computationally impossible.",
            risk: "None, unless honest mining power drops to near zero.",
          }
        } else if (algo.id === "pos" || algo.id === "dpos") {
          return {
            status: "DEFENDED (CHECKPOINTING)",
            succeeds: "Plausible if validator keys are bought years later to rebuild history from Genesis.",
            defense: "WEAK SUBJECTIVITY: Nodes reject historical chain updates older than a set finality checkpoint.",
            risk: "Bootstrapping new nodes safely without trusted snapshot feeds.",
          }
        } else if (algo.id === "pbft" || algo.id === "poa") {
          return {
            status: "BLOCKED",
            succeeds: "Fails because past keys cannot override consortium signature check thresholds.",
            defense: "KEY REVOCATION: Compromised signing keys are instantly blacklisted across the consortium.",
            risk: "Unmonitored offline validator key leaks.",
          }
        } else {
          return {
            status: "BLOCKED",
            succeeds: "Fails because TEE enclaves reject blocks that bypass sequential sleep proofs.",
            defense: "ELAPSED TIME AUDITS: History must prove timers elapsed in order, preventing instantaneous rebuilds.",
            risk: "TEE key generation compromises.",
          }
        }
    }
  }

  const handleAttackSelect = (id) => {
    dispatch({ type: "TRIGGER_ATTACK", payload: id })
  }

  const activeEval = activeAttack ? getAttackEvaluation(activeAttack) : null
  const flowSteps = activeAttack ? getAttackFlowSteps(activeAttack) : []
  const vul = activeAttack ? getVulnerabilityStats(activeAttack) : null

  return (
    <section className="glass-panel w-full flex flex-col gap-6 border border-brand-border/60 bg-slate-950/20" role="region" aria-label="Consensus Attack Simulator">
      
      {/* Header title */}
      <div className="flex items-center gap-2 border-b border-brand-border/30 pb-3">
        <ShieldAlert className="w-5 h-5 text-rose-500" />
        <h2 className="edu-heading-secondary text-white uppercase">
          Consensus Attack Simulator
        </h2>
      </div>

      <p className="edu-body text-slate-350 leading-relaxed font-light -mt-2">
        Test how the active consensus reacts to cryptographic exploits. Select a vulnerability below. The canvas simulation above will dynamically redirect to show the attack path.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mt-2 items-start">
        
        {/* Left selector cards */}
        <div className="lg:col-span-2 flex flex-col gap-3">
          <span className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase">
            Select Vulnerability Vector
          </span>
          {attacks.map((atk) => {
            const isActive = activeAttack === atk.id
            return (
              <button
                key={atk.id}
                onClick={() => handleAttackSelect(atk.id)}
                className={`p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                  isActive 
                    ? "bg-rose-950/15 border-rose-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.05)]" 
                    : "bg-slate-900/20 border-brand-border/60 text-slate-400 hover:border-brand-border hover:bg-slate-900/35"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono font-bold uppercase tracking-wider">{atk.name}</span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>}
                </div>
                <p className="text-xs font-light leading-relaxed text-slate-400 mt-1.5">{atk.description}</p>
              </button>
            )
          })}
        </div>

        {/* Right diagnostic analysis panels */}
        <div className="lg:col-span-3 bg-slate-950/40 rounded-2xl border border-brand-border p-6 flex flex-col justify-between min-h-[340px]">
          {activeAttack ? (
            <div className="flex flex-col gap-6 animate-fade-in">
              
              {/* Target & Status header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/20 pb-3">
                <div className="flex items-center gap-1.5 text-rose-400">
                  <Skull className="w-5 h-5 text-rose-500" />
                  <span className="text-[10px] font-mono font-bold tracking-wider uppercase">
                    {attacks.find(a => a.id === activeAttack)?.name} Diagnostics
                  </span>
                </div>
                
                <span className={`px-2.5 py-0.5 rounded text-[9px] font-mono font-bold border uppercase ${vul.color}`}>
                  VULNERABILITY: {vul.risk}
                </span>
              </div>

              {/* Exploit Flow Diagram */}
              <div className="flex flex-col gap-2">
                <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wide">Attack Exploit Sequence Flow</span>
                <div className="flex flex-col md:flex-row items-center gap-2 justify-between font-mono text-[9px] text-center w-full">
                  {flowSteps.map((step, idx) => (
                    <React.Fragment key={idx}>
                      <div className="p-3 bg-slate-900 border border-brand-border rounded-xl w-full md:w-[18%] flex flex-col gap-0.5 justify-center h-16" title={step.desc}>
                        <span className="text-white font-extrabold truncate">{step.name}</span>
                        <span className="text-[7.5px] text-slate-450 leading-tight block truncate">{step.desc}</span>
                      </div>
                      {idx < flowSteps.length - 1 && <ArrowRight className="w-4 h-4 text-slate-700 rotate-90 md:rotate-0 flex-shrink-0" />}
                    </React.Fragment>
                  ))}
                </div>
              </div>

              {/* Dynamic stats textboxes */}
              <div className="flex flex-col gap-4 text-xs leading-relaxed text-slate-300">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">How Attack Works on {algo.name}</span>
                  <p className="text-slate-200 font-light">{activeEval.succeeds}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">Protocol Defense Implementation</span>
                  <p className="text-slate-200 font-light">{activeEval.defense}</p>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[9px] font-mono text-slate-500 uppercase tracking-wide">Residual Risk Factor</span>
                  <p className="text-rose-350 font-normal font-sans">⚠ {activeEval.risk}</p>
                </div>
              </div>

              {/* Alert Indicator */}
              <div className="flex items-center gap-2.5 bg-slate-900/50 p-3 rounded-xl border border-brand-border/20 text-[10px] font-mono text-slate-450 mt-1">
                <ShieldCheck className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>CANVAS OVERRIDDEN: Check the canvas above to watch the visual exploit demonstration.</span>
              </div>

            </div>
          ) : (
            <div className="h-full flex-col items-center justify-center text-center p-8 gap-4 flex-grow flex">
              <HelpCircle className="w-10 h-10 text-slate-600 animate-pulse" />
              <div className="flex flex-col gap-2 max-w-[300px]">
                <span className="text-xs font-mono font-bold text-slate-350">ATTACK SIMULATOR DECK READY</span>
                <p className="text-[10px] font-mono text-slate-500 leading-relaxed">
                  Select an exploit vector from the left column to run consensus resilience evaluations and launch canvas overrides.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </section>
  )
}
