import React from "react"
import { useExplorer } from "../../context/ExplorerContext"
import { consensusData } from "../../constants/consensusData"
import WorkflowEngine from "../common/WorkflowEngine"
import { AlertTriangle, XOctagon, Lightbulb } from "lucide-react"

const NARRATIVE_INTRO = {
  pow: {
    failTitle: "Why Centralized Ledgers Fail",
    failDesc: "Centralized systems rely on a single point of trust (a bank). If that database goes offline or is corrupted, the entire ledger is compromised.",
    coreIdea: "Nakamoto consensus replaces central trust with a network of computers. Proof of Work secures the ledger by forcing miners to burn physical electricity to solve math puzzles, making history impossible to rewrite."
  },
  pos: {
    failTitle: "Why Proof of Work Fails to Scale",
    failDesc: "Proof of Work requires continuous compute loops, consuming massive electricity and restricting transaction throughput to single digits.",
    coreIdea: "Proof of Stake replaces physical mining with stake capital lockups. Validators deposit native coins as collateral (stake) which are destroyed (slashed) if they cheat."
  },
  dpos: {
    failTitle: "Why Standard Proof of Stake is Slow",
    failDesc: "Standard Proof of Stake requires coordinating agreement across hundreds of thousands of nodes, creating latency bottlenecks.",
    coreIdea: "Delegated Proof of Stake speeds up throughput by having coin holders elect a small representative committee (typically 21 delegates) to produce blocks in a fast rotation."
  },
  poa: {
    failTitle: "Why Stake-Based Coins Fail Enterprises",
    failDesc: "Private corporate consortia cannot base their consensus security on highly volatile public tokens or anonymous validator keys.",
    coreIdea: "Proof of Authority utilizes verified real-world corporate identities as validation keys, establishing direct legal accountability."
  },
  pbft: {
    failTitle: "Why Probabilistic Consensus Fails Enterprise Needs",
    failDesc: "Nakamoto consensus models are probabilistic: transactions are not immediately final, and users must wait for multiple block confirmations.",
    coreIdea: "PBFT achieves 100% mathematical finality instantly. Network nodes broadcast prepared and committed vote states to agree on block ordering."
  },
  poh: {
    failTitle: "Why Traditional Block Timestamps Fail",
    failDesc: "Blockchains usually rely on nodes communicating back-and-forth to agree on chronological sequence, stalling network speeds.",
    coreIdea: "Proof of History creates a decentralized clock. By running a continuous sequential hashing loop (VDF), transactions are stamped with proofs of time."
  },
  poet: {
    failTitle: "Why Heavy Algorithms Fail Consortiums",
    failDesc: "Enterprise networks need a fair block proposal lottery without the carbon footprint of PoW or the financial barriers of PoS.",
    coreIdea: "Proof of Elapsed Time utilizes trusted CPU hardware enclaves (TEEs) to generate secure random sleep timers, electing the fastest woke node."
  },
  avalanche: {
    failTitle: "Why Leader-Based Consensuses Fail",
    failDesc: "Routing every transaction through a single elected leader node creates throughput bottlenecks and makes the system a target for DDoS.",
    coreIdea: "Avalanche is leaderless. Nodes select random validator subsets recursively, tipping their preferences to align with the majority."
  }
}

export default function ProtocolMechanics() {
  const { state } = useExplorer()
  const { selectedAlgo } = state
  const algo = consensusData[selectedAlgo]
  const narrative = NARRATIVE_INTRO[selectedAlgo] || NARRATIVE_INTRO.pow

  return (
    <section className="glass-panel flex flex-col border border-brand-border/60 bg-slate-950/20 gap-4 pb-2" aria-labelledby="mechanics-panel-title">
      
      {/* Primary Header Title (40px) */}
      <div className="flex flex-col gap-1">
        <h1 id="mechanics-panel-title" className="edu-heading-primary text-white tracking-tight">
          How <span className="dynamic-accent-text">{algo.name}</span> Works
        </h1>
        <p className="edu-body text-slate-350 leading-relaxed font-light text-[18px]">
          {algo.overview}
        </p>
      </div>

      {/* Side-by-Side Presentation of Problem & Solution */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
        <div className="p-4 rounded-xl border border-rose-500/20 bg-rose-950/5 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-rose-455">
            <XOctagon className="w-5 h-5" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase">
              {narrative.failTitle}
            </span>
          </div>
          <p className="text-xs text-slate-300 font-light leading-relaxed">
            {narrative.failDesc}
          </p>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-950/5 flex flex-col gap-1">
          <div className="flex items-center gap-2 text-emerald-450">
            <Lightbulb className="w-5 h-5 animate-pulse" />
            <span className="text-[10px] font-mono font-bold tracking-wider uppercase">
              The Protocol Core Solution
            </span>
          </div>
          <p className="text-xs text-slate-300 font-light leading-relaxed">
            {narrative.coreIdea}
          </p>
        </div>
      </div>

      {/* Problem Statement Alert Bar */}
      <div className="p-3 rounded-lg border border-brand-border bg-slate-950/45 flex flex-col gap-1 text-slate-400">
        <div className="flex items-center gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
          <span className="text-[9px] font-mono font-bold tracking-wider text-rose-400 uppercase">
            TARGET DESIGN CHALLENGE
          </span>
        </div>
        <p className="text-xs leading-relaxed font-light text-slate-300">
          {algo.problemStatement}
        </p>
      </div>

      {/* Horizontal Large Card Timeline */}
      <div className="mt-2">
        <WorkflowEngine />
      </div>

    </section>
  )
}
