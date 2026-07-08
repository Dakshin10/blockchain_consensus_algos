export const CONSENSUS_FAMILIES = {
  NAKAMOTO: "nakamoto",
  STAKE: "stake",
  BYZANTINE: "byzantine",
  AUTHORITY: "authority",
  TEE: "tee",
  AVALANCHE: "avalanche",
}

export const consensusData = {
  pow: {
    id: "pow",
    name: "Proof of Work",
    compatibilityGroup: CONSENSUS_FAMILIES.NAKAMOTO,
    family: CONSENSUS_FAMILIES.NAKAMOTO,
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.15)",
    yearIntroduced: 2008,
    primaryBlockchain: "Bitcoin",
    mechanismSummary: "Miners race to solve SHA-256 math puzzles to earn block proposal rights.",
    overview: "A competitive, computationally-intensive consensus model where distributed nodes (miners) race to solve a cryptographic puzzle to append blocks and earn coin rewards.",
    problemStatement: "Solving double-spending and consensus agreement in a completely open, trustless, peer-to-peer network without relying on any centralized ledger coordinator.",
    coreMechanism: "Hash cash puzzle races using SHA-256 or similar algorithms where computational investment (hash rate) serves as Sybil resistance.",
    workflow: "Transactions are package in a block, miners increment a nonce in the header to hash below a target difficulty, the solver broadcasts the proof, and peers verify and sync the longest canonical chain.",
    
    // Ordered sequence of steps
    steps: [
      {
        title: "Transaction Created",
        description: "Alice signs and constructs a transaction request transferring BTC to Bob.",
        purpose: "Create a cryptographically signed intent to change state balances.",
        inputs: "Alice's private key, recipient address, transfer amount.",
        outputs: "Unsigned transaction payload with signature.",
        participants: "Alice's wallet client.",
        securityContribution: "ECDSA cryptographic signing guarantees identity and fund ownership.",
        realWorldExample: "Alice signs a 0.05 BTC transfer to Bob.",
        animationState: "TX_CREATE"
      },
      {
        title: "Broadcast",
        description: "Alice's client broadcasts the signed transaction to neighboring peer routers.",
        purpose: "Propagate the transaction globally to reach miner mempools.",
        inputs: "Signed transaction payload.",
        outputs: "Mempool queue entries.",
        participants: "Gossip routing peers.",
        securityContribution: "Gossip routing checks signatures before relaying, blocking spam transactions.",
        realWorldExample: "Alice's node relays the transaction to 8 neighbors.",
        animationState: "TX_BROADCAST"
      },
      {
        title: "Collected into Candidate Block",
        description: "Miners compile transactions from their mempools and assemble a candidate block.",
        purpose: "Organize raw transactions for consensus serialization.",
        inputs: "Mempool transactions, previous block header.",
        outputs: "Candidate block header with Merkle root.",
        participants: "Miner nodes.",
        securityContribution: "Double-spending validation checks prevent duplicate transaction listings in the block.",
        realWorldExample: "AntPool groups 2,500 transactions into Block #859,321.",
        animationState: "BLOCK_ASSEMBLE"
      },
      {
        title: "Mining Begins",
        description: "Miners retrieve network difficulty parameters and initialize their hardware ASIC arrays.",
        purpose: "Configure target ranges for the cryptographic puzzle race.",
        inputs: "Difficulty target, block header.",
        outputs: "Initialized miner hardware queues.",
        participants: "Miner node processors.",
        securityContribution: "Consistent difficulty adjustments enforce fixed block times.",
        realWorldExample: "ASIC arrays load Block #859,321 difficulty target (19 leading zeros).",
        animationState: "MINING_PREPARE"
      },
      {
        title: "Hash Puzzle",
        description: "ASICs repeatedly compute block header SHA-256 hashes, incrementing a 'nonce' on each cycle.",
        purpose: "Find a header hash value lower than the target difficulty.",
        inputs: "Block header, nonce counter, difficulty threshold.",
        outputs: "Interim hash outputs.",
        participants: "Mining ASIC loops.",
        securityContribution: "Sunk energy costs deter malicious actors from re-writing block history.",
        realWorldExample: "ASIC calculates millions of SHA-256(header) loops per second.",
        animationState: "HASH_RACE"
      },
      {
        title: "Valid Hash Found",
        description: "A miner finds a valid nonce that satisfies the network's difficulty rules.",
        purpose: "Claim proposal rights for Block #859,321.",
        inputs: "Winning nonce hash.",
        outputs: "Cryptographic proof of work.",
        participants: "Winning miner.",
        securityContribution: "Mathematical proof is easy for peers to check but hard to compute.",
        realWorldExample: "Miner finds hash 00000000000000000004a... solving the round.",
        animationState: "HASH_SUCCESS"
      },
      {
        title: "Broadcast Block",
        description: "The winning miner broadcasts the proof and completed block details globally.",
        purpose: "Synchronize nodes with the newly mined block.",
        inputs: "Completed block, valid nonce.",
        outputs: "Global block propagation.",
        participants: "Winning miner, peers.",
        securityContribution: "Rapid propagation reduces the likelihood of stale chain forks.",
        realWorldExample: "Solver broadcasts Block #859,321 globally in under 120ms.",
        animationState: "BLOCK_BROADCAST"
      },
      {
        title: "Verification",
        description: "Peer nodes verify transaction signatures, nonces, and previous block hashes.",
        purpose: "Enforce network validation rules before committing state updates.",
        inputs: "Proposed block, previous block hash, difficulty parameters.",
        outputs: "Valid/Invalid confirmation.",
        participants: "All full nodes.",
        securityContribution: "Independent validation prevents miners from minting fake coins.",
        realWorldExample: "Nodes verify the block header hash starts with required leading zeros.",
        animationState: "PEER_VERIFY"
      },
      {
        title: "Longest Chain Update",
        description: "Nodes append the block to their local chain, updating the ledger tip.",
        purpose: "Update the canonical network state balance log.",
        inputs: "Validated block, local ledger tip.",
        outputs: "Advanced block height tip.",
        participants: "Full node validators.",
        securityContribution: "Consensus follows the chain with the most cumulative proof of work (longest chain rules).",
        realWorldExample: "Nodes sync tip to height 859,321, discarding shorter forks.",
        animationState: "CHAIN_SYNC"
      },
      {
        title: "Mining Reward",
        description: "The solver mints the block reward (3.125 BTC) plus collected transaction fees.",
        purpose: "Incentivize miners to secure the network.",
        inputs: "Coinbase transaction.",
        outputs: "Minted BTC inside winning miner's wallet.",
        participants: "Staking protocol mint.",
        securityContribution: "Financial rewards align miner incentives with network security.",
        realWorldExample: "Miner receives 3.125 BTC reward in the Coinbase transaction.",
        animationState: "MINT_REWARD"
      }
    ],

    trilemma: { scalability: 3, security: 9, decentralization: 9 },
    performance: {
      tps: "3 - 30 TPS",
      blockTime: "~10 min (Bitcoin), ~2.5 min (Litecoin)",
      energy: "Extremely High (TWh/yr scale hash mining arrays)",
      scalability: "Low due to proof search delay and propagation locks",
      security: "Extremely high against history modification due to energy sunk cost",
      decentralization: "High permissionless participation, though concentrated around mining pool hubs",
      overhead: "Vast hardware cost and power waste"
    },
    attackResistance: "51% Hash rate attack boundary. Modifying historical blocks requires controlling a majority of global hashing power to outpace the honest chain.",
    realBlockchains: [
      { name: "Bitcoin", cryptocurrencies: "BTC", smartContractLanguages: ["Bitcoin Script"], executionEnvironment: "Bitcoin Script Interpreter", virtualMachine: "Bitcoin Stack Engine", layerClassification: "Layer 1 (Sovereign Settlement Ledger)", rationale: "Prioritizes maximal security and censorship-resistance as a decentralized store of value, accepting low throughput as a tradeoff." },
      { name: "Litecoin", cryptocurrencies: "LTC", smartContractLanguages: ["Bitcoin Script"], executionEnvironment: "Litecoin Script Interpreter", virtualMachine: "Litecoin Stack Engine", layerClassification: "Layer 1 (Payment Ledger)", rationale: "Uses a faster-block-time PoW variant (Scrypt) to function as a lighter, quicker-settling payments-focused counterpart to Bitcoin." }
    ]
  },
  
  pos: {
    id: "pos",
    name: "Proof of Stake",
    compatibilityGroup: CONSENSUS_FAMILIES.STAKE,
    family: CONSENSUS_FAMILIES.STAKE,
    color: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.15)",
    yearIntroduced: 2011,
    primaryBlockchain: "Ethereum",
    mechanismSummary: "Validators proposal blocks based on locked token deposits, risking slash penalties.",
    overview: "A capital-collateral model where validators lock up native tokens as stake, acquiring selection weight and voting authority proportional to their deposit.",
    problemStatement: "Removing the high electricity costs and hardware obsolescence of PoW while maintaining a secure, open validator pool.",
    coreMechanism: "Collateralized asset staking, slot coordinator selection, attestation voting, and automated financial slashing penalties.",
    workflow: "Validators stake assets, the coordinator selects a slot proposer weighted by stake, a committee attests to the block validity, and finality is achieved when checkpoint weights are satisfied.",
    
    steps: [
      {
        title: "Stake Tokens",
        description: "Users lock native tokens (e.g., 32 ETH) into the network stake deposit contract.",
        purpose: "Establish financial collateral that can be burned (slashed) if the validator misbehaves.",
        inputs: "Native tokens, staking signing key.",
        outputs: "Collateralized balance registered on-chain.",
        participants: "Token holders, stakers.",
        securityContribution: "Sunk capital serves as Sybil resistance and economic safety collateral.",
        realWorldExample: "User deposits 32 ETH into the Ethereum 2.0 Deposit Contract.",
        animationState: "LOCK_STAKE"
      },
      {
        title: "Become Validator",
        description: "The protocol verifies the deposit and adds the validator node to the active validator registry.",
        purpose: "Gain authority to participate in block proposal slots and committee voting.",
        inputs: "Certified deposit proof, public key registration.",
        outputs: "Active status assigned in validator list.",
        participants: "Consensus registrar engine.",
        securityContribution: "Only nodes passing key authentication can sign blocks.",
        realWorldExample: "Operator joins the active Beacon Chain validator candidate queue.",
        animationState: "ACTIVATE_VALIDATOR"
      },
      {
        title: "Validator Selection",
        description: "The system pseudo-randomly selects a validator to propose the next block, weighted by stake size.",
        purpose: "Nominate a single leader for the current execution slot.",
        inputs: "Active stake ratio pool, randomness beacon (e.g., RANDAO).",
        outputs: "Assigned slot proposer index.",
        participants: "Staking protocol engine.",
        securityContribution: "Random selection prevents proposal schedule monopolization and front-running.",
        realWorldExample: "RANDAO selects validator index #194,821 to produce the next block.",
        animationState: "SELECT_LEADER"
      },
      {
        title: "Block Proposal",
        description: "The selected validator compiles pending transactions from the mempool and signs a candidate block.",
        purpose: "Propose the next state transition of the ledger.",
        inputs: "Mempool transactions, previous block hash, proposer private key.",
        outputs: "Signed proposed block header.",
        participants: "Selected slot proposer.",
        securityContribution: "Proposer signatures create undeniable cryptographic proof of authorship.",
        realWorldExample: "Validator index #194,821 compiles transactions, signing with BLS keys.",
        animationState: "PROPOSE_BLOCK"
      },
      {
        title: "Validator Attestation",
        description: "A randomly selected validator committee audits the proposed block and submits signed votes.",
        purpose: "Verify transactions, state balances, and prevent double-signing.",
        inputs: "Proposed block header, committee signatures.",
        outputs: "Attestation votes log.",
        participants: "Attestation committee nodes.",
        securityContribution: "Committee signatures guarantee the block matches protocol rules.",
        realWorldExample: "A committee of 128 validators attests to the proposed block validity.",
        animationState: "ATTEST"
      },
      {
        title: "Consensus",
        description: "The protocol aggregates attestation votes until consensus weight thresholds are satisfied.",
        purpose: "Establish majority agreement across the validator set.",
        inputs: "Attestation collection logs.",
        outputs: "Supermajority vote confirmation.",
        participants: "Consensus voting nodes.",
        securityContribution: "Supermajority agreement (2/3 of validator weight) ensures chain convergence.",
        realWorldExample: "Ethereum aggregates signatures, verifying 2/3 agreement is reached.",
        animationState: "AGGREGATE_VOTES"
      },
      {
        title: "Finalization",
        description: "The block receives checkpoint finality, locking it permanently into historical ledger states.",
        purpose: "Achieve irreversible transaction settlement.",
        inputs: "Consensus proofs.",
        outputs: "Irreversible ledger tip state.",
        participants: "Full validator nodes.",
        securityContribution: "Epoch finalization prevents history reorganization and long range attacks.",
        realWorldExample: "The Beacon Chain finalizes Epoch #284,900, locking in previous slots.",
        animationState: "FINALIZE"
      },
      {
        title: "Rewards / Slashing",
        description: "Honest validators receive mint rewards and transaction fees. Malicious double-signers are slashed.",
        purpose: "Financially align validator behaviors with network security.",
        inputs: "Validator signature logs, double-signing audits.",
        outputs: "Stake rewards release / slashed collateral burn.",
        participants: "Staking protocol governance.",
        securityContribution: "Slashing economically deters validators from signing competing forks.",
        realWorldExample: "Honest nodes receive block payouts; a double-signing validator is slashed 1 ETH.",
        animationState: "REWARDS_SLASH"
      }
    ],

    trilemma: { scalability: 7, security: 8, decentralization: 7 },
    performance: {
      tps: "15 - 100+ TPS (Layer 1 base)",
      blockTime: "~12 sec (Ethereum)",
      energy: "Minimal (No hash computations required)",
      scalability: "Medium; constrained by state execution and validator signatures distribution",
      security: "High economic safety bounds; modifying history requires acquiring and risking a supermajority of staked tokens",
      decentralization: "Medium-high validator count, though capital pooling can lead to centralization in staking providers",
      overhead: "Requires complex state management for staking registration and slashing checks"
    },
    attackResistance: "33% Slashing boundary. Attacks on finality require a 51% stake control, but double-signing or proposing competing blocks results in immediate collateral confiscation.",
    realBlockchains: [
      { name: "Ethereum", cryptocurrencies: "ETH", smartContractLanguages: ["Solidity", "Vyper"], executionEnvironment: "Ethereum Virtual Machine", virtualMachine: "EVM", layerClassification: "Layer 1 Execution & Settlement Platform", rationale: "Transitioned from PoW to PoS ('The Merge') to cut energy use drastically while retaining a large, open validator set." },
      { name: "Cardano", cryptocurrencies: "ADA", smartContractLanguages: ["Plutus", "Marlowe"], executionEnvironment: "Cardano Settlement Layer VM", virtualMachine: "UPLC (Untyped Plutus Core)", layerClassification: "Layer 1 Smart Contract Ledger", rationale: "Uses the Ouroboros PoS protocol, built on peer-reviewed academic research emphasizing formal security proofs." }
    ]
  },

  dpos: {
    id: "dpos",
    name: "Delegated Proof of Stake",
    compatibilityGroup: CONSENSUS_FAMILIES.STAKE,
    family: CONSENSUS_FAMILIES.STAKE,
    color: "#8b5cf6",
    glow: "rgba(139, 92, 246, 0.15)",
    yearIntroduced: 2013,
    primaryBlockchain: "EOS",
    mechanismSummary: "Token holders vote to elect a small set of delegates who rotate block production.",
    overview: "A representative democracy model where token holders vote to elect a small, active committee of block producers who take turns proposal blocks.",
    problemStatement: "The execution delays and network latency of coordinating consensus across thousands of nodes in standard PoS.",
    coreMechanism: "Continuous delegation voting, rotating delegate block production schedules, and active performance monitoring.",
    workflow: "Token holders delegate their vote, the system elects a fixed number of delegates, delegates produce blocks sequentially, and voters replace inactive delegates.",
    
    steps: [
      {
        title: "Delegate Election",
        description: "Token holders cast stake-weighted votes to elect representatives (block producers).",
        purpose: "Select a small, trusted committee to manage block validation.",
        inputs: "Voter stakes, candidate registry list.",
        outputs: "Ranked list of elected delegates.",
        participants: "Token holders, candidates.",
        securityContribution: "Voter governance holds active delegates accountable.",
        realWorldExample: "EOS holders vote to elect the top 21 active Block Producers.",
        animationState: "ELECT"
      },
      {
        title: "Slot Scheduling",
        description: "The protocol orders elected delegates into a sequential round-robin slot schedule.",
        purpose: "Coordinate orderly block production without competition.",
        inputs: "Elected delegate roster.",
        outputs: "Sequential production schedule.",
        participants: "DPoS scheduler engine.",
        securityContribution: "Pre-scheduled slots eliminate timing overlaps and block proposal races.",
        realWorldExample: "System allocates 3-second production slots to the 21 delegates.",
        animationState: "SCHEDULE"
      },
      {
        title: "Block Production",
        description: "The assigned delegate in the active slot structures and signs a block.",
        purpose: "Validate transactions and publish state roots in their scheduled slot.",
        inputs: "Mempool transactions, signer private key.",
        outputs: "Signed candidate block.",
        participants: "Elected slot delegate.",
        securityContribution: "High-spec delegate servers ensure fast transaction execution speeds.",
        realWorldExample: "BP #4 proposes Block #932,180 during their 3-second slot.",
        animationState: "PROPOSE"
      },
      {
        title: "Delegate Verification",
        description: "Other active delegates audit the proposed block's signature and transactions.",
        purpose: "Ensure the proposer signed honest transactions and did not double-propose.",
        inputs: "Signed block, validator roster keys.",
        outputs: "Consensus confirmation signatures.",
        participants: "Delegate committee nodes.",
        securityContribution: "Committee signatures ensure validators act in accordance with consensus rules.",
        realWorldExample: "Peers verify BP #4's signature and commit the block to their ledgers.",
        animationState: "VERIFY"
      },
      {
        title: "Governance Recall",
        description: "Voters dynamically recall and replace delegates who miss slots or censor transactions.",
        purpose: "Ensure high network performance and prevent delegate censorship.",
        inputs: "Performance metrics, voter stake redirects.",
        outputs: "Updated active delegate roster.",
        participants: "Voters, staking governance.",
        securityContribution: "Dynamic voter recall deters delegate collusion and censorship.",
        realWorldExample: "BP #4 misses 10 slots; voters redirect stake, replacing them with a standby node.",
        animationState: "RECALL"
      }
    ],

    trilemma: { scalability: 9, security: 6, decentralization: 3 },
    performance: {
      tps: "1,000 - 4,000+ TPS",
      blockTime: "0.5 - 3 sec",
      energy: "Minimal (Operated by a small set of high-spec servers)",
      scalability: "Extremely high due to minimal coordinator node count and fast schedules",
      security: "Moderate; susceptible to voter apathy and delegate collusion/cartels",
      decentralization: "Low validator count (typically 21-101), though token voting remains open to everyone",
      overhead: "Requires robust continuous on-chain voting governance systems"
    },
    attackResistance: "Voter collusion threshold. If 51% of voting stake is controlled by a coordinated cartel, they can monopolize delegate slots.",
    realBlockchains: [
      { name: "EOS", cryptocurrencies: "EOS", smartContractLanguages: ["C++"], executionEnvironment: "EOS Virtual Machine", virtualMachine: "EOS VM (WebAssembly)", layerClassification: "Layer 1 High-Throughput Ledger", rationale: "Built for high-throughput dApps with fee-less user transactions, trading some decentralization for speed." },
      { name: "TRON", cryptocurrencies: "TRX", smartContractLanguages: ["Solidity"], executionEnvironment: "TRON Virtual Machine", virtualMachine: "TVM", layerClassification: "Layer 1 Payments Platform", rationale: "Optimized for content/media dApps and stablecoin transfers, prioritizing fast, cheap transactions via a small validator set." }
    ]
  },

  poh: {
    id: "poh",
    name: "Proof of History",
    compatibilityGroup: CONSENSUS_FAMILIES.NAKAMOTO,
    family: CONSENSUS_FAMILIES.NAKAMOTO,
    color: "#f59e0b",
    glow: "rgba(245, 158, 11, 0.15)",
    yearIntroduced: 2017,
    primaryBlockchain: "Solana",
    mechanismSummary: "Verifiable Delay Function (VDF) hashing loop creates a shared clock.",
    overview: "A cryptographic clock based on recursive hashing that timestamps transactions before consensus, eliminating validator-to-validator negotiation overhead.",
    problemStatement: "Distributed networks suffer latency bottlenecks because validators must negotiate transaction times before ordering blocks.",
    coreMechanism: "Verifiable Delay Functions (VDF) running recursive SHA-256 loops on specialized hardware.",
    workflow: "A leader node runs continuous SHA-256 loops, incoming transactions are merged into the hash state, validators verify the hash segments in parallel, and PoS votes finalize state changes.",
    
    steps: [
      {
        title: "Sequential Ticking",
        description: "The leader node runs a continuous loop of SHA-256 hashes.",
        purpose: "Create a verifiable chronological timeline of clock 'ticks'.",
        inputs: "Previous hash output, loop counter.",
        outputs: "Sequential tick hash chain.",
        participants: "Active leader node.",
        securityContribution: "VDF math proves time elapsed between tick computations.",
        realWorldExample: "Solana leader node calculates millions of hashes per second.",
        animationState: "TICK_LOOP"
      },
      {
        title: "Transaction Anchoring",
        description: "The leader hashes incoming transactions directly into the recursive clock state.",
        purpose: "Assign a verifiable timestamp to transactions.",
        inputs: "Transaction data, current hash tick.",
        outputs: "Hash tick containing transaction data.",
        participants: "Active leader node.",
        securityContribution: "Hashing transaction data into ticks proves they occurred at a specific time.",
        realWorldExample: "User transaction is hashed into the SHA-256 stream.",
        animationState: "INJECT"
      },
      {
        title: "Block Packaging",
        description: "The leader packages transactions and time proofs, broadcasting them to validators.",
        purpose: "Distribute ordered transactions for validation.",
        inputs: "Transactions, VDF time proofs.",
        outputs: "Broadcast block segments.",
        participants: "Active leader node, validators.",
        securityContribution: "Pre-ordered blocks prevent transaction front-running.",
        realWorldExample: "Leader packages transactions into a block, broadcasting it to validators.",
        animationState: "SEGMENT"
      },
      {
        title: "Parallel Verification",
        description: "Validators split the block's VDF proof and verify the hash segments in parallel.",
        purpose: "Validate the timeline without consensus latency.",
        inputs: "Block hash segments, validator GPU cores.",
        outputs: "Verification status confirmations.",
        participants: "Validator nodes.",
        securityContribution: "Parallel verification ensures nodes can verify block history in milliseconds.",
        realWorldExample: "Validators use GPU threads to verify split segments of the hash chain.",
        animationState: "PARALLEL_CHECK"
      },
      {
        title: "State Finalization",
        description: "Validators cast Proof of Stake votes to finalize the block.",
        purpose: "Achieve economic finality and secure ledger changes.",
        inputs: "Vetted block, PoS voting stakes.",
        outputs: "Finalized ledger tip update.",
        participants: "Validator nodes, PoS protocol.",
        securityContribution: "PoS voting adds economic security to block transactions.",
        realWorldExample: "Validators cast votes, finalizing the block in under 400ms.",
        animationState: "FINALIZE_STATE"
      }
    ],

    trilemma: { scalability: 10, security: 7, decentralization: 5 },
    performance: {
      tps: "50,000+ TPS",
      blockTime: "400 milliseconds",
      energy: "Moderate; requires high-frequency CPU cores for generator ticks",
      scalability: "Extremely high; avoids traditional consensus round-trip delays",
      security: "High; backed by PoS voting rules and cryptographic sequence proofs",
      decentralization: "Medium; high hardware and bandwidth requirements limit validator participation",
      overhead: "Requires high-end, dedicated validator hardware (VDF ASIC/high-end CPUs)"
    },
    attackResistance: "ASIC VDF exploit resistance. Attackers trying to speed up block creation must develop faster SHA-256 loop processors than the global leader.",
    realBlockchains: [
      { name: "Solana", cryptocurrencies: "SOL", smartContractLanguages: ["Rust", "C", "C++"], executionEnvironment: "Sealevel Parallel Execution Runtime", virtualMachine: "LLVM BPF (Solana VM)", layerClassification: "Layer 1 High-Performance Ledger", rationale: "Built to match NASDAQ transaction throughput, keeping a single global state in sync without sharding latency." }
    ]
  },

  poa: {
    id: "poa",
    name: "Proof of Authority",
    compatibilityGroup: CONSENSUS_FAMILIES.AUTHORITY,
    family: CONSENSUS_FAMILIES.AUTHORITY,
    color: "#10b981",
    glow: "rgba(16, 185, 129, 0.15)",
    yearIntroduced: 2017,
    primaryBlockchain: "VeChain Thor",
    mechanismSummary: "Pre-approved validators stake their corporate reputation to sign blocks.",
    overview: "A reputation-based model where pre-approved validator accounts validate transactions, staking their corporate identity rather than capital.",
    problemStatement: "Financial stake volatility is unacceptable for enterprise platforms, and permissionless setups are prone to regulatory non-compliance.",
    coreMechanism: "Identity verification, cryptographic keys authorization, and rotating validator schedules.",
    workflow: "Corporate entities clear legal checks, receive signing keys, produce blocks in turn, and face authority revocation for malicious activities.",
    
    steps: [
      {
        title: "Identity Verification",
        description: "Candidate validators undergo vetting and legal verification by the network consortium.",
        purpose: "Ensure validators are legitimate, accountable organizations.",
        inputs: "Corporate identification, legal agreements.",
        outputs: "Certified validator status.",
        participants: "Candidates, consortium board.",
        securityContribution: "Corporate accountability prevents anonymous attacks.",
        realWorldExample: "Logistics provider completes KYC, getting approved as a validator.",
        animationState: "APPROVE"
      },
      {
        title: "Key Authorization",
        description: "The consortium assigns a certified cryptographic signature key to the approved validator.",
        purpose: "Add the validator's key to the network's authorized signers list.",
        inputs: "Certified validator keys, network node configs.",
        outputs: "Updated authorized key list.",
        participants: "Network administrators.",
        securityContribution: "Only nodes on the key list can propose blocks.",
        realWorldExample: "VeChain adds Masternode #45's public key to the signer list contract.",
        animationState: "ASSIGN"
      },
      {
        title: "Block Proposal",
        description: "The validator in the active slot proposes and signs a block.",
        purpose: "Record transactions and broadcast state roots in a scheduled slot.",
        inputs: "Mempool transactions, validator private key.",
        outputs: "Signed candidate block.",
        participants: "Active validator.",
        securityContribution: "Validator signatures provide cryptographic proof of block authorship.",
        realWorldExample: "Masternode #45 signs Block #18,490,210 during their turn.",
        animationState: "PROPOSE"
      },
      {
        title: "Signature Audit",
        description: "Consortium nodes audit the block header signature against the active signer list.",
        purpose: "Ensure the block was signed by an authorized node.",
        inputs: "Signed block, authorized signer list.",
        outputs: "Consensus confirmation.",
        participants: "Consortium peer nodes.",
        securityContribution: "Verifying signatures against the key list prevents unauthorized block creation.",
        realWorldExample: "Peers verify Masternode #45's signature, updating their ledger states.",
        animationState: "CONFIRM"
      },
      {
        title: "Authority Revocation",
        description: "The consortium revokes keys from validators who sign conflicting blocks.",
        purpose: "Remove dishonest operators and protect ledger integrity.",
        inputs: "Malicious signature proofs, consensus vote.",
        outputs: "Revoked validator keys.",
        participants: "Consortium nodes, auditors.",
        securityContribution: "Revoking validator keys prevents compromised nodes from disrupting the network.",
        realWorldExample: "A validator node is compromised; the consortium votes to remove its public key.",
        animationState: "REVOKE"
      }
    ],

    trilemma: { scalability: 9, security: 7, decentralization: 2 },
    performance: {
      tps: "1,000 - 5,000+ TPS",
      blockTime: "1 - 5 sec",
      energy: "Minimal (No complex cryptographical competitions or voting phases)",
      scalability: "High; limited only by hardware transaction throughput",
      security: "High against anonymous actors, but vulnerable to single-node key compromises and validator coercion",
      decentralization: "Very low; controlled by a closed set of known consortium members",
      overhead: "Low; requires offline legal/corporate onboarding procedures"
    },
    attackResistance: "Consortium compromise threshold. If a majority of authorized validator keys are compromised, attackers control the ledger state.",
    realBlockchains: [
      { name: "VeChain Thor", cryptocurrencies: "VET", smartContractLanguages: ["Solidity"], executionEnvironment: "VeChain Virtual Machine", virtualMachine: "EVM", layerClassification: "Layer 1 Enterprise Supply Chain Ledger", rationale: "Designed to supply supply-chain enterprise operations with predictable, stable gas fees and structured corporate governance." },
      { name: "Palm Network", cryptocurrencies: "PALM", smartContractLanguages: ["Solidity"], executionEnvironment: "Palm EVM Sidechain Node", virtualMachine: "EVM", layerClassification: "Layer 2 Scaling Sidechain", rationale: "An Ethereum-aligned sidechain focused on NFT drops, using PoA to cut transaction costs and environmental footprint." }
    ]
  },

  pbft: {
    id: "pbft",
    name: "Practical Byzantine Fault Tolerance",
    compatibilityGroup: CONSENSUS_FAMILIES.BYZANTINE,
    family: CONSENSUS_FAMILIES.BYZANTINE,
    color: "#06b6d4",
    glow: "rgba(6, 182, 212, 0.15)",
    yearIntroduced: 1999,
    primaryBlockchain: "Fabric",
    mechanismSummary: "Nodes verify state transitions through three rounds of multicast messaging.",
    overview: "A low-latency message-passing consensus model where nodes agree on states through three phases of multicast communication, achieving instant finality.",
    problemStatement: "Reaching agreement in closed clusters where nodes can fail, lag, or actively lie, requiring absolute finality without forks.",
    coreMechanism: "Leader primary node, backup replica nodes, and three-phase multicast message verification (Pre-prepare, Prepare, Commit).",
    workflow: "Client submits requests, the leader proposes with sequence numbers, replicas multicast approvals, and commits are executed once majority thresholds are satisfied.",
    
    steps: [
      {
        title: "Client Request",
        description: "A client signs and sends a transaction request to the primary node (leader).",
        purpose: "Request state changes on the distributed ledger.",
        inputs: "Client signature, transaction payload.",
        outputs: "Request registered at primary node.",
        participants: "Client user, primary leader node.",
        securityContribution: "Client signatures prevent unauthorized transaction creation.",
        realWorldExample: "Client requests to transfer an asset in Hyperledger Fabric.",
        animationState: "REQUEST"
      },
      {
        title: "Pre-Prepare Phase",
        description: "The leader assigns a sequence number to the request and multicasts a pre-prepare message to replica nodes.",
        purpose: "Establish the sequence order for the transaction batch.",
        inputs: "Client transaction, sequence index.",
        outputs: "Pre-prepare message broadcast.",
        participants: "Primary leader node, replica nodes.",
        securityContribution: "Sequence numbers prevent transaction ordering attacks.",
        realWorldExample: "Leader assigns block index #401, broadcasting it to all replica nodes.",
        animationState: "PRE_PREPARE"
      },
      {
        title: "Prepare Phase",
        description: "Replica nodes verify the message and multicast a prepare message to all other nodes.",
        purpose: "Confirm replicas agree on transaction ordering.",
        inputs: "Pre-prepare message, replica keys.",
        outputs: "Prepare message broadcasts.",
        participants: "Replica nodes.",
        securityContribution: "Multicast voting ensures all nodes agree on transaction ordering.",
        realWorldExample: "Nodes exchange messages, confirming block #401 sequence numbers.",
        animationState: "PREPARE"
      },
      {
        title: "Commit Phase",
        description: "Replicas verify prepare messages and multicast commit messages once a threshold is met.",
        purpose: "Ensure all nodes commit to updating their local state ledger.",
        inputs: "2f matching prepare messages.",
        outputs: "Commit message broadcasts.",
        participants: "Replica nodes.",
        securityContribution: "Commit verification guarantees ledger consistency across nodes.",
        realWorldExample: "Replicas verify votes, broadcasting commit messages to peers.",
        animationState: "COMMIT"
      },
      {
        title: "Execution & Reply",
        description: "Nodes execute the block locally once a threshold of commits is reached, replying to the client.",
        purpose: "Write transactions to state and notify the client of finality.",
        inputs: "2f+1 matching commit messages.",
        outputs: "Client confirmation receipt.",
        participants: "Client user, replica nodes.",
        securityContribution: "Requiring 2f+1 matching replies ensures clients only accept finalized states.",
        realWorldExample: "Nodes commit block #401; client receives confirmation from replicas.",
        animationState: "EXECUTE"
      }
    ],

    trilemma: { scalability: 6, security: 8, decentralization: 2 },
    performance: {
      tps: "1,000 - 5,000+ TPS",
      blockTime: "<1 sec (Instant Finality)",
      energy: "Minimal (Pure network message exchanging)",
      scalability: "Low-medium; degrades rapidly as node count grows due to O(N^2) network complexity",
      security: "High; mathematically secure against arbitrary behavior within the fault threshold",
      decentralization: "Very low; restricted to small, closed networks (typically <100 nodes)",
      overhead: "High network message load (heavy bandwidth consumption)"
    },
    attackResistance: "33% Byzantine node threshold. The network is secure if less than 1/3 of the total nodes ($f$ faults in $3f+1$ nodes) are compromised or malicious.",
    realBlockchains: [
      { name: "Hyperledger Fabric", cryptocurrencies: "None (Tokenless)", smartContractLanguages: ["Go", "Java", "JavaScript"], executionEnvironment: "Chaincode Container (Docker)", virtualMachine: "Docker Container Runtime", layerClassification: "Layer 1 Permissioned Enterprise Ledger", rationale: "A private enterprise ledger needing high performance, strict permissioned nodes, and instant finality without a token." },
      { name: "Zilliqa", cryptocurrencies: "ZIL", smartContractLanguages: ["Scilla"], executionEnvironment: "Zilliqa VM Node", virtualMachine: "Zilliqa Runtime (ZVM)", layerClassification: "Layer 1 Sharded Smart Contract Ledger", rationale: "Combines PBFT for transaction processing within sharded committees with PoW for Sybil resistance." }
    ]
  },

  avalanche: {
    id: "avalanche",
    name: "Avalanche Consensus",
    compatibilityGroup: CONSENSUS_FAMILIES.AVALANCHE,
    family: CONSENSUS_FAMILIES.AVALANCHE,
    color: "#f43f5e",
    glow: "rgba(244, 63, 94, 0.15)",
    yearIntroduced: 2018,
    primaryBlockchain: "Avalanche",
    mechanismSummary: "Nodes query random peer subsets to reach uniform consensus.",
    overview: "A leaderless, metastable voting protocol where nodes query random peer subsets recursively until the network settles on a uniform state.",
    problemStatement: "Scaling consensus participation to thousands of concurrent validators without bottlenecking throughput or relying on leaders.",
    coreMechanism: "Repeated random sub-sampling queries, confidence counters, and metastable decision state shifts.",
    workflow: "Nodes choose a preferred transaction state, query small random peer groups, adopt the majority opinion, and finalize when confidence counters hit threshold limits.",
    
    steps: [
      {
        title: "Initial Voting",
        description: "A validator node receives a transaction and adopts an initial preference.",
        purpose: "Set a baseline preference for the transaction state.",
        inputs: "Transaction data.",
        outputs: "Initial state preference.",
        participants: "Validator node.",
        securityContribution: "Initial checks confirm transactions are valid and do not conflict.",
        realWorldExample: "Validator receives a transaction and votes to accept it.",
        animationState: "VOTE"
      },
      {
        title: "Random Sub-Sampling",
        description: "The node queries a small, randomly selected group of validators.",
        purpose: "Query peer consensus opinions.",
        inputs: "Query request, random node list.",
        outputs: "Peer consensus vote logs.",
        participants: "Querying node, sampled peer nodes.",
        securityContribution: "Random sampling prevents attackers from predicting or targeting validator nodes.",
        realWorldExample: "Node queries 20 random validators, asking for their opinions.",
        animationState: "SAMPLE"
      },
      {
        title: "Opinion Update",
        description: "The querying node updates its preference if a supermajority of sampled peers agree.",
        purpose: "Align node preference with peer consensus.",
        inputs: "Sampled peer votes, majority threshold.",
        outputs: "Updated node preference.",
        participants: "Querying node.",
        securityContribution: "Aligning node preferences helps the network converge on a uniform state.",
        realWorldExample: "16 of 20 sampled nodes vote 'Yes'; querying node sets preference to 'Yes'.",
        animationState: "ADOPT"
      },
      {
        title: "Recursive Querying",
        description: "Nodes repeat the random query rounds continuously.",
        purpose: "Converge the entire network's opinion on a single transaction state.",
        inputs: "Peer vote counts, loop configurations.",
        outputs: "Consecutive consensus updates.",
        participants: "Network validator nodes.",
        securityContribution: "Recursive querying propagates consensus, similar to how an avalanche gathers speed.",
        realWorldExample: "Nodes repeat query rounds until the network converges on a decision.",
        animationState: "ITERATE"
      },
      {
        title: "Metastable Settle",
        description: "The network finalizes transactions when confidence counters hit the threshold.",
        purpose: "Achieve irreversible transaction finality.",
        inputs: "Confidence counters, decision thresholds.",
        outputs: "Finalized transaction commitment.",
        participants: "Validator nodes.",
        securityContribution: "High confidence thresholds prevent transaction reversion.",
        realWorldExample: "Confidence counters hit threshold limits, finalizing transactions in seconds.",
        animationState: "SETTLE"
      }
    ],

    trilemma: { scalability: 9, security: 9, decentralization: 8 },
    performance: {
      tps: "4,500+ TPS (per subnet)",
      blockTime: "1 - 2 sec",
      energy: "Minimal (Nodes only process transaction checks and sub-sampling requests)",
      scalability: "High; sub-sampling overhead remains constant as the validator pool scales",
      security: "Extremely high; safe against double-spend attacks even with high malicious node presence",
      decentralization: "High; low hardware requirements permit thousands of concurrent validators",
      overhead: "Low; does not require specialized hardware or vast network bandwidth"
    },
    attackResistance: "80% Sybil attack resistance threshold. Mathematical models prove security is maintained even if up to 80% of nodes act maliciously.",
    realBlockchains: [
      { name: "Avalanche", cryptocurrencies: "AVAX", smartContractLanguages: ["Solidity", "Go"], executionEnvironment: "Avalanche Virtual Machine & EVM", virtualMachine: "AVM & EVM (C-Chain)", layerClassification: "Layer 1 Multi-Subnet Hub", rationale: "Designed to deploy custom, highly compliant enterprise blockchains (Subnets) with sub-second finality." }
    ]
  },

  poet: {
    id: "poet",
    name: "Proof of Elapsed Time",
    compatibilityGroup: CONSENSUS_FAMILIES.TEE,
    family: CONSENSUS_FAMILIES.TEE,
    color: "#34d399",
    glow: "rgba(52, 211, 153, 0.15)",
    yearIntroduced: 2016,
    primaryBlockchain: "Sawtooth",
    mechanismSummary: "Intel CPU secure enclaves assign signed random sleep timers to validators.",
    overview: "A lottery-style consensus protocol that uses CPU Trusted Execution Environments (TEEs) to allocate randomized waiting times to block proposers.",
    problemStatement: "Selecting a block producer fairly in permissioned enterprise networks without the energy waste of PoW or the capital demands of PoS.",
    coreMechanism: "Intel SGX secure enclaves, random timer generators, and signed sleep attestations.",
    workflow: "Nodes request timers from their local CPU TEE enclave, sleep for the assigned duration, the first node to wake signs the block, and peers verify the enclave's proof.",
    
    steps: [
      {
        title: "Timer Request",
        description: "The validator requests a random wait timer from its CPU Trusted Execution Environment (TEE).",
        purpose: "Request a proposal slot timer that cannot be manipulated.",
        inputs: "TEE query command.",
        outputs: "Timer generation signal.",
        participants: "Validator node, Intel CPU TEE.",
        securityContribution: "Enclave isolation prevents nodes from altering wait times.",
        realWorldExample: "Node queries Intel SGX enclave for a random wait time.",
        animationState: "REQUEST"
      },
      {
        title: "Timer Attestation",
        description: "The TEE enclave generates and signs a random wait timer attestation.",
        purpose: "Provide cryptographic proof of the assigned wait time.",
        inputs: "Random entropy source.",
        outputs: "Signed wait time attestation.",
        participants: "CPU TEE enclave.",
        securityContribution: "Enclave signatures prevent nodes from lying about wait times.",
        realWorldExample: "TEE generates a 12.5-second timer, signing it with its private key.",
        animationState: "CERTIFY"
      },
      {
        title: "Idle Sleep",
        description: "The validator's node enters an idle sleep state for the duration of the timer.",
        purpose: "Minimize node power consumption during wait times.",
        inputs: "Signed timer duration.",
        outputs: "Idle node state.",
        participants: "Validator node.",
        securityContribution: "Sleeping nodes keep network energy usage low.",
        realWorldExample: "Node goes into idle sleep for 12.5 seconds.",
        animationState: "SLEEP"
      },
      {
        title: "Wake & Proposal",
        description: "The validator node wakes up when the timer expires, proposing and signing a block.",
        purpose: "Publish transactions and claim the block proposal slot.",
        inputs: "Expired timer signal, mempool transactions.",
        outputs: "Signed block, sleep expiration proof.",
        participants: "Elected proposer node.",
        securityContribution: "Sleep proofs verify nodes waited their assigned times before proposing.",
        realWorldExample: "Timer expires; node wakes up, signs, and proposes Block #840,121.",
        animationState: "WAKE_SIGN"
      },
      {
        title: "Enclave Audit",
        description: "Peer nodes verify the TEE signature and the sleep proof before committing the block.",
        purpose: "Validate block proposal rules before updating the ledger.",
        inputs: "Proposed block, TEE signature key.",
        outputs: "Consensus confirmation, advanced ledger tip.",
        participants: "Consortium nodes.",
        securityContribution: "Consortium verification guarantees only nodes with valid sleep proofs can propose blocks.",
        realWorldExample: "Peers verify the TEE signature, committing Block #840,121 to their ledgers.",
        animationState: "AUDIT"
      }
    ],

    trilemma: { scalability: 7, security: 7, decentralization: 6 },
    performance: {
      tps: "100 - 1,000+ TPS",
      blockTime: "10 - 30 sec",
      energy: "Minimal (Validators spend most of their time in low-power sleep states)",
      scalability: "Medium; constrained by block time intervals and CPU enclave validation times",
      security: "Moderate; security relies entirely on the hardware manufacturer's TEE protection",
      decentralization: "Medium; open to any entity with TEE-compatible hardware in a consortium",
      overhead: "Requires specialized CPUs with built-in TEE capabilities (Intel SGX)"
    },
    attackResistance: "Intel SGX decryption exploit resistance. Vulnerabilities in CPU enclaves (like side-channel attacks) can compromise random timer generation.",
    realBlockchains: [
      { name: "Hyperledger Sawtooth", cryptocurrencies: "None (Tokenless)", smartContractLanguages: ["Python", "Rust", "Go", "Java"], executionEnvironment: "Sawtooth Transaction Processor", virtualMachine: "Sawtooth WebAssembly Runtime (SABRE)", layerClassification: "Layer 1 Enterprise Application Framework", rationale: "Provides highly efficient, tokenless transaction consensus suitable for enterprise logistics and supply chain networks." }
    ]
  }
}

// 16 Blockchain network nodes mapping for compatibility evaluation matrix
export const MATRIX_CHAINS = [
  { symbol: "BTC", name: "Bitcoin", algo: "pow", family: CONSENSUS_FAMILIES.NAKAMOTO },
  { symbol: "DOGE", name: "Dogecoin", algo: "pow", family: CONSENSUS_FAMILIES.NAKAMOTO },
  { symbol: "XMR", name: "Monero", algo: "pow", family: CONSENSUS_FAMILIES.NAKAMOTO },
  { symbol: "ETH", name: "Ethereum", algo: "pos", family: CONSENSUS_FAMILIES.STAKE },
  { symbol: "ADA", name: "Cardano", algo: "pos", family: CONSENSUS_FAMILIES.STAKE },
  { symbol: "DOT", name: "Polkadot", algo: "pos", family: CONSENSUS_FAMILIES.STAKE },
  { symbol: "BNB", name: "BNB Chain", algo: "dpos", family: CONSENSUS_FAMILIES.STAKE },
  { symbol: "TRX", name: "TRON", algo: "dpos", family: CONSENSUS_FAMILIES.STAKE },
  { symbol: "EOS", name: "EOS", algo: "dpos", family: CONSENSUS_FAMILIES.STAKE },
  { symbol: "SOL", name: "Solana", algo: "poh", family: CONSENSUS_FAMILIES.NAKAMOTO },
  { symbol: "AVAX", name: "Avalanche", algo: "avalanche", family: CONSENSUS_FAMILIES.AVALANCHE },
  { symbol: "SAW", name: "Sawtooth", algo: "poet", family: CONSENSUS_FAMILIES.TEE },
  { symbol: "VET", name: "VeChain", algo: "poa", family: CONSENSUS_FAMILIES.AUTHORITY },
  { symbol: "PALM", name: "Palm Net", algo: "poa", family: CONSENSUS_FAMILIES.AUTHORITY },
  { symbol: "ZIL", name: "Zilliqa", algo: "pbft", family: CONSENSUS_FAMILIES.BYZANTINE },
  { symbol: "HLF", name: "Fabric", algo: "pbft", family: CONSENSUS_FAMILIES.BYZANTINE }
]

// Helper function to calculate compatibility between two chains
export function getCompatibility(chainA, chainB) {
  if (chainA.algo === chainB.algo) {
    return {
      status: "high",
      label: "Full Compatibility",
      description: "Both chains operate the exact same consensus engine, allowing for direct cryptographic state verification and simpler relay structures."
    }
  }
  
  if (chainA.family === chainB.family) {
    return {
      status: "medium",
      label: "Interoperable (Same Family)",
      description: `Both protocols belong to the same paradigm family (${chainA.family.toUpperCase()}). Bridges can share similar security assumptions, though state verification formats differ.`
    }
  }

  return {
    status: "low",
    label: "Low Compatibility",
    description: "These protocols operate on fundamentally different consensus paradigms. Cross-chain state proof verification requires complex trust bridges or multi-signature lockers."
  }
}
