export const consensusStepDetails = {
  pow: [
    {
      why: "Transactions must be signed to cryptographically authorize fund movement and prove spending intent.",
      process: "The user's private key generates a digital signature (ECDSA) for the transaction data, securing identity verification.",
      whatIf: "Anyone could forge transactions and spend coins from other accounts, leading to complete collapse of fund security."
    },
    {
      why: "P2P relaying propagates transaction requests to all node caches globally.",
      process: "Peer nodes verify incoming transaction signatures, add them to local buffers, and broadcast them to their TCP neighbors.",
      whatIf: "Transactions would remain stuck on the sender's computer, never reaching miners to be recorded on the ledger."
    },
    {
      why: "Collected mempools act as temporary buffers, queuing transactions before block serialization.",
      process: "Miner nodes filter transaction requests by gas fee thresholds and store them locally in a memory pool (mempool).",
      whatIf: "Transactions would have to be processed instantly, causing network packet drops when transaction rates spike."
    },
    {
      why: "Grouping transactions into candidate blocks enables batch hashing and ledger indexing.",
      process: "Miners bundle transactions, hash them into a Merkle Tree, and link the Merkle Root to the prior block hash.",
      whatIf: "The network would have to process transactions one-by-one sequentially, dropping transaction throughput."
    },
    {
      why: "Puzzle races establish a resource-bound lottery, preventing spam blocks (Sybil resistance).",
      process: "Miner nodes extract block header metadata and coordinate hardware to execute hashing operations.",
      whatIf: "Any node could flood the network with fake blocks instantly at zero cost, fragmenting the network history."
    },
    {
      why: "Computational hashing locks block history, making ledger records expensive to rewrite.",
      process: "Miners repeatedly alter a header nonce value, running SHA-256 calculations until the output hash is below a target difficulty.",
      whatIf: "Ledger history could be reorganized or rewritten effortlessly, allowing double-spends of previously settled blocks."
    },
    {
      why: "Valid hash discoveries serve as cryptographic proof that the miner expended computational work.",
      process: "A miner's hash lands below the network target difficulty, locking the block header state and ending the puzzle round.",
      whatIf: "Miner nodes would have no mathematical way to prove to peers that they solved the lottery fairly."
    },
    {
      why: "Block broadcasts sync the newly proposed state updates to all network peer databases.",
      process: "The winning miner relays the solved block. Peer nodes receive the block and freeze their active puzzle races.",
      whatIf: "Only the winning miner would record the block, splitting the network state into disjointed branches."
    },
    {
      why: "Peer verification enforces strict ledger rules, preventing miners from committing fraud.",
      process: "Nodes verify the block header hash, execute transaction signatures, and verify that no double-spends occurred.",
      whatIf: "Cheating miners could mint infinite coins or commit invalid transfers, destroying network trust."
    },
    {
      why: "Rewards incentivize miner nodes to dedicate energy and hardware resources to secure the blockchain.",
      process: "The protocol awards the block subsidy (e.g., 3.125 BTC) and transaction fees to the miner's address.",
      whatIf: "No one would dedicate energy and hardware to secure the network, leaving the ledger open to capture."
    }
  ],
  pos: [
    {
      why: "Staking capital creates a lockup hostage mechanism, establishing validator accountability.",
      process: "Validators deposit native tokens (e.g., 32 ETH) into a staking contract, locking collateral that can be burned if they cheat.",
      whatIf: "Validators could censor transactions or double-sign blocks without facing any financial consequences."
    },
    {
      why: "Eco-friendly validation replaces high-power ASIC loops with simple signature checks.",
      process: "Active validator keys are registered, and nodes prepare to verify proposed slots using low-energy servers.",
      whatIf: "The blockchain would consume massive grid power, causing environmental concern and high transaction costs."
    },
    {
      why: "Elections choose slot leaders pseudo-randomly to propose blocks fairly based on stake weight.",
      process: "The protocol runs a randao selection algorithm; validators with larger staked balances have a proportional chance of selection.",
      whatIf: "A single rich validator could monopolize block production, causing centralized control."
    },
    {
      why: "Elected proposers organize transactions, packing them into slot proposals.",
      process: "The chosen validator groups mempool transactions and broadcasts a slot block proposal to attestation committees.",
      whatIf: "Blocks could be proposed by any validator at the same time, leading to constant block collisions."
    },
    {
      why: "Attestation committees verify slot blocks to ensure the proposer is not committing fraud.",
      process: "A committee of validators runs block checks and signs a consensus vote (attestation) using BLS signatures.",
      whatIf: "Proposers could publish invalid blocks containing fake transfers or double-spends."
    },
    {
      why: "Slashing enforces security rules by burning stake collateral if validators attempt fraud.",
      process: "If a validator signs two conflicting blocks, the protocol destroys their locked stake and banishes them.",
      whatIf: "Validators could sign multiple block histories simultaneously, splitting consensus (nothing-at-stake attack)."
    },
    {
      why: "Finality checkpoints lock state permanently, preventing history reorganization attacks.",
      process: "Checks are committed after 2/3 validator committee votes, establishing a point before which history cannot be altered.",
      whatIf: "Attackers could rewrite long histories from months ago, reorganizing entire ledgers."
    },
    {
      why: "Validator rewards motivate nodes to remain online and run rules honestly.",
      process: "The protocol compounds yield to honest attesters and distributes fee cuts to proposers.",
      whatIf: "No one would lock capital or run validator servers, leaving the network without nodes."
    }
  ],
  dpos: [
    {
      why: "Democratic voting allows token holders to elect trusted Block Producers, scaling speeds.",
      process: "Users vote for candidate delegates; voting power is proportional to the number of tokens staked.",
      whatIf: "There would be no way to select validators fairly, causing consensus gridlock."
    },
    {
      why: "Limit validator sets to a fixed size (e.g. 21) to maximize bandwidth throughput.",
      process: "The top 21 candidates with the most delegate votes are confirmed as active Block Producers.",
      whatIf: "Aggregation overhead would spike, causing high latencies and slow transaction times."
    },
    {
      why: "Round-robin schedules prevent block proposer collisions, ensuring blocks are produced sequentially.",
      process: "The 21 delegates are organized into a strict slot rotation schedule, taking turns producing blocks every 0.5s.",
      whatIf: "Elected delegates would produce blocks concurrently, causing forks."
    },
    {
      why: "Block production serializes state updates, committing transaction packets to the ledger.",
      process: "The scheduled Block Producer compiles transactions and signs a block, broadcasting it to peers.",
      whatIf: "Transactions would remain in voter mempools indefinitely, never settling."
    },
    {
      why: "Irreversible block finality locks blocks once a supermajority of delegates sign them.",
      process: "Once a block is verified by 15 of the 21 elected delegates, it is committed as irreversible.",
      whatIf: "Blocks could be reorganized long after production, causing merchant payment uncertainty."
    }
  ],
  poa: [
    {
      why: "KYC checks identify validators, replacing stake metrics with real-world corporate legal reputation.",
      process: "Consortium administrators audit identities, issuing cryptographic signing certificates to verified nodes.",
      whatIf: "Anonymous nodes could join private networks, exposing enterprise transaction logs."
    },
    {
      why: "Authorization locks validator access to pre-approved masternodes.",
      process: "The ledger network is configured to only accept blocks signed by authorized authority keys.",
      whatIf: "Anyone could spin up a client node and propose blocks, corrupting private supply chain flows."
    },
    {
      why: "Masternode rotations ensure blocks are produced fairly without a central coordinator.",
      process: "Masternodes sign blocks in a fixed, round-robin sequence, ensuring equal block production distribution.",
      whatIf: "A single authority could block all blocks, halting consortium settlements."
    },
    {
      why: "Legal finality guarantees that transactions committed by authorities cannot be altered.",
      process: "Once an authority signs the block, peers commit it to local storage. Double-signing leads to legal action.",
      whatIf: "Corporations would have no legal recourse if validators attempted double-spends."
    },
    {
      why: "Malicious or compromised validators must be quickly stripped of their block production rights to prevent network damage.",
      process: "Consortium members submit cryptographic proofs of double-signing, triggering a smart contract vote to revoke the node's authorized key.",
      whatIf: "A compromised authority could continue producing empty or invalid blocks indefinitely, halting or censoring the consortium ledger."
    }
  ],
  pbft: [
    {
      why: "Clients authorize operations by submitting transactions directly to the consensus leader.",
      process: "The client signs a request containing transaction payloads and sends it to the primary replica.",
      whatIf: "Transactions could not be initiated, leaving the ledger network empty."
    },
    {
      why: "Pre-prepare phases establish sequence ordering, preventing transaction reordering attacks.",
      process: "The primary leader assigns a sequence number and multicasts a pre-prepare message to all replica nodes.",
      whatIf: "Replica nodes would execute transactions in different orders, causing state mismatches."
    },
    {
      why: "Prepare phases ensure replicas agree on the order proposed by the leader.",
      process: "Replica nodes verify the proposal and multicast prepare votes. Nodes wait for a 2/3 supermajority.",
      whatIf: "A Byzantine leader could propose different sequences to different replicas, causing split-brain states."
    },
    {
      why: "Commit phases guarantee that all nodes commit to executing the transaction sequence.",
      process: "Once prepared, replicas multicast commit votes. Nodes commit to local logs after receiving 2/3 commits.",
      whatIf: "Replicas could prepare a transaction but fail to commit it, causing ledger state mismatch."
    },
    {
      why: "Execution updates local state databases, returning execution results back to the client.",
      process: "Nodes execute the sequence locally, update state balances, and return execution replies to the client.",
      whatIf: "The client would have no final proof that their transaction was successfully processed."
    }
  ],
  poh: [
    {
      why: "VDF ticks act as a decentralized clock, proving chronological sequence without P2P timestamps.",
      process: "The leader CPU thread executes a continuous, sequential SHA-256 loop, generating clock indices.",
      whatIf: "Nodes would have to coordinate continuously via messages to agree on block times, slowing latency."
    },
    {
      why: "Timestamping records transaction event order relative to clock ticks.",
      process: "Transactions are hashed directly into the active VDF stream, linking their data to a specific tick number.",
      whatIf: "Transactions could be re-ordered or front-run by proposers, leading to MEV exploits."
    },
    {
      why: "Parallel validation speeds up audits by allowing nodes to verify VDF clocks concurrently on GPUs.",
      process: "Validators receive the VDF history stream, splitting checking operations across GPU threads in parallel.",
      whatIf: "Validators would verify clock segments sequentially, causing transaction backlogs."
    },
    {
      why: "PoS votes finalize blocks, securing the clock stream with financial capital.",
      process: "Validators cast PoS votes on the verified VDF block, committing the chronological sequence.",
      whatIf: "The clock history could be forged by high-frequency GPU miners without capital stakes."
    },
    {
      why: "Block commitments finalize history, updating ledger account balances.",
      process: "The block is appended, and transactions are marked as finalized across the network ledger.",
      whatIf: "Settled balances could be reorganized, causing double-spending."
    }
  ],
  poet: [
    {
      why: "Trusted enclaves generate tamper-proof random sleep times, ensuring fair elections.",
      process: "The validator's CPU enclave (TEE) generates a signed random timer that cannot be manipulated.",
      whatIf: "Validators could generate short timers intentionally, monopolizing block production."
    },
    {
      why: "Countdowns execute sleep schedules, preventing high-energy puzzle mining races.",
      process: "Validator nodes enter low-power sleep states, waiting for their enclaves to countdown.",
      whatIf: "Nodes would consume high energy while waiting, losing the core efficiency benefit."
    },
    {
      why: "Shortest wait wins elections fairly, electing the node with the fastest countdown.",
      process: "The validator assigned the shortest sleep interval wakes first, signs the block, and broadcasts it.",
      whatIf: "There would be no way to decide a winner if multiple nodes woke up at the same time."
    },
    {
      why: "TEE verifications prove to peers that the block proposer slept honestly.",
      process: "Peer nodes verify the TEE signature and the sleep proof before committing the block.",
      whatIf: "Cheating nodes could claim they slept without actually waiting, hijacking slots."
    },
    {
      why: "Block commitments finalize consensus, appending transaction updates.",
      process: "Peers write the block to local storage and reset their enclaves for the next timer round.",
      whatIf: "The state history would remain unconfirmed, leaving the ledger open to rewrites."
    }
  ],
  avalanche: [
    {
      why: "Gossip sampling avoids leader bottlenecks, preventing central targets for attack.",
      process: "Nodes query a small, randomly selected group of peers about transaction preferences.",
      whatIf: "A single central leader would handle all transactions, creating a DDoS risk."
    },
    {
      why: "Repeated polling drives consensus convergence towards a single dominant choice.",
      process: "Validators execute multiple query rounds, shifting preferences based on peer majorities.",
      whatIf: "Nodes would fail to agree on a single transaction path, causing double-spends."
    },
    {
      why: "Metastable tipping forces preferences to align rapidly across the entire network.",
      process: "Preferences gather momentum like a snowball, tipping the network to a uniform preference.",
      whatIf: "Consensus would take minutes or hours to resolve, rendering the system unusable."
    },
    {
      why: "Confidence counters track voting rounds, locking preferences once thresholds are met.",
      process: "Nodes increment local counters when queries return supermajority votes for their choice.",
      whatIf: "Nodes would finalize choices prematurely before the wider network converged."
    },
    {
      why: "Consensus finality secures transaction settlement, updating ledger state.",
      process: "Once confidence thresholds are met, transactions are committed to the local ledger.",
      whatIf: "Balances could be reorganized, allowing double-spends."
    }
  ]
}
