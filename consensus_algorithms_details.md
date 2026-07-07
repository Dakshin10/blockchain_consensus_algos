# Consensus Algorithms Details

This document contains the filled templates with the details for the consensus algorithms: Proof of Work (PoW), Proof of Stake (PoS), Delegated Proof of Stake (DPoS), Proof of Authority (PoA), Practical Byzantine Fault Tolerance (PBFT), Proof of History (PoH), Proof of Elapsed Time (PoET), and Avalanche Consensus.
---

### Proof of Work (PoW)

- Name: Proof of Work (PoW)
- Core Mechanism: A competitive, computationally-intensive consensus model where miners race to solve a cryptographic puzzle to earn the right to append the next block.
- Step by step explanation:
  1. Pending transactions are collected into a candidate block by miner nodes.
  2. Miners repeatedly hash the block header with a changing nonce, searching for an output below a target difficulty threshold.
  3. The first miner to find a valid hash broadcasts the solved block to the network.
  4. Other nodes independently verify the hash and the transactions inside the block.
  5. Once verified, nodes append the block to their local chain and miners restart the race on the new chain tip; the longest valid chain is treated as canonical.

- Trilemma analysis:
    - Scalability (based on block creation time, TPS): Score 3/10 (~10 min block time on Bitcoin, ~13 sec on legacy Ethereum, 3-30 TPS)
    - Security: Score 9/10 (51% Attack Threshold - extremely resilient due to massive real-world energy/hardware cost required to attack)
    - Decentralisation: Score 9/10 (High node participation, tens of thousands of nodes; permissionless mining open to anyone with hardware)

- Cryptocurrencies/Blockchain:
    - Currencies using this mechanism: Bitcoin (BTC), Litecoin (LTC)
    - How this algo suits the blockchain:
      - **Bitcoin (BTC)**: Prioritizes maximal security and censorship-resistance as a decentralized store of value, accepting low throughput as a tradeoff.
      - **Litecoin (LTC)**: Uses a faster-block-time PoW variant (Scrypt) to function as a lighter, quicker-settling payments-focused counterpart to Bitcoin.

- Smart contract language: None natively (Bitcoin script is intentionally non-Turing-complete); Solidity (legacy pre-Merge Ethereum)

- Layer classification:
    - Layer 1 or 2: Layer 1
    - Brief explanation: Both operate as standalone base ledgers providing native settlement and security without depending on another chain.

---

### Proof of Stake (PoS)

- Name: Proof of Stake (PoS)
- Core Mechanism: A capital-based consensus model where validators lock up (stake) native tokens as collateral, earning the right to propose and attest to blocks proportional to their stake.
- Step by step explanation:
  1. Validators deposit a minimum stake of the native token into a protocol contract to become eligible.
  2. The protocol pseudo-randomly selects a validator to propose the next block, weighted by stake size.
  3. A committee of other validators is randomly selected to attest to the validity of the proposed block.
  4. Once enough attestations are collected, the block is finalized and added to the chain.
  5. Validators acting maliciously (e.g., double-signing) have a portion of their stake destroyed, a penalty known as "slashing."

- Trilemma analysis:
    - Scalability (based on block creation time, TPS): Score 7/10 (~12 sec block time on Ethereum, 15-100 TPS base layer, much higher with rollups)
    - Security: Score 8/10 (Economic Slashing Deterrent - attacks are financially self-destructive since malicious stake gets burned)
    - Decentralisation: Score 7/10 (High validator count, ~1 million+ validators on Ethereum, though influenced by staking-pool concentration)

- Cryptocurrencies/Blockchain:
    - Currencies using this mechanism: Ethereum (ETH), Cardano (ADA)
    - How this algo suits the blockchain:
      - **Ethereum (ETH)**: Transitioned from PoW to PoS ("The Merge") to cut energy use drastically while retaining a large, open validator set.
      - **Cardano (ADA)**: Uses the Ouroboros PoS protocol, built on peer-reviewed academic research emphasizing formal security proofs.

- Smart contract language: Solidity, Vyper (Ethereum); Plutus, Marlowe (Cardano)

- Layer classification:
    - Layer 1 or 2: Layer 1
    - Brief explanation: Both serve as base settlement layers, with Layer 2 rollups built on top to scale throughput.

---

### Delegated Proof of Stake (DPoS)

- Name: Delegated Proof of Stake (DPoS)
- Core Mechanism: A representative-democracy consensus model where token holders vote to elect a small set of delegates who take turns producing blocks.
- Step by step explanation:
  1. Token holders cast stake-weighted votes to elect a fixed number of block producers (e.g., 21 on EOS).
  2. Elected delegates are placed into a rotating schedule to take turns producing blocks.
  3. Each delegate produces a block during their assigned slot, and other delegates verify it.
  4. Token holders continuously monitor performance and can vote out underperforming or malicious delegates at any time.
  5. Block producers typically share a portion of block rewards back with the voters who elected them.

- Trilemma analysis:
    - Scalability (based on block creation time, TPS): Score 9/10 (0.5-3 sec block time, 1,000-4,000+ TPS)
    - Security: Score 6/10 (Voter Cartel / Collusion Risk - small elected validator set makes collusion among delegates a realistic threat)
    - Decentralisation: Score 3/10 (Very low producer count, ~20-100 active delegates, though voting itself is open to all token holders)

- Cryptocurrencies/Blockchain:
    - Currencies using this mechanism: EOS (EOS), TRON (TRX)
    - How this algo suits the blockchain:
      - **EOS (EOS)**: Built for high-throughput dApps with fee-less user transactions, trading some decentralization for speed.
      - **TRON (TRX)**: Optimized for content/media dApps and stablecoin transfers, prioritizing fast, cheap transactions via a small validator set.

- Smart contract language: C++ (EOS); Solidity (TRON)

- Layer classification:
    - Layer 1 or 2: Layer 1
    - Brief explanation: Both operate as standalone base chains handling native transaction settlement and dApp execution directly.

---

### Proof of Authority (PoA)

- Name: Proof of Authority (PoA)
- Core Mechanism: Reputation-based consensus where pre-approved validator accounts validate transactions, staking their real-world identity and corporate reputation.
- Step by step explanation:
  1. Candidate entities undergo rigorous identity check verification to become certified validators.
  2. Approved validators take turns proposing and signing blocks in a circular queue.
  3. Blocks are verified instantly via cryptographic signature validation of the active validator pool.
  4. Malicious behavior leads to loss of validator status, public identity exposure, and legal consequences.

- Trilemma analysis:
    - Scalability (based on block creation time, TPS): Score 9/10 (1 - 5 sec block time, 1,000 - 5,000+ TPS)
    - Security: Score 7/10 (Single Node / Private Key Compromise - easier to target individual trusted node keys than a broad network)
    - Decentralisation: Score 2/10 (Very Low node participation, ~10 - 50 nodes entirely controlled under trusted consortiums)

- Cryptocurrencies/Blockchain:
    - Currencies using this mechanism: VeChain (VET), Palm Network (PALM)
    - How this algo suits the blockchain:
      - **VeChain (VET)**: Designed to supply supply-chain enterprise operations with predictable, stable gas fees and structured corporate governance.
      - **Palm Network (PALM)**: An Ethereum-aligned sidechain focused on NFT drops, using PoA to cut transaction costs and environmental footprint.

- Smart contract language: Solidity (VeChain & Palm Network)

- Layer classification:
    - Layer 1 or 2: Layer 1 (VeChain) / Layer 2 (Palm Network)
    - Brief explanation: VeChain is a standalone base ledger (Layer 1) while Palm Network acts as an Ethereum-aligned sidechain (Layer 2) to scale NFT transactions.


### Practical Byzantine Fault Tolerance (PBFT)

- Name: Practical Byzantine Fault Tolerance (PBFT)
- Core Mechanism: A low-latency message-passing consensus model where pre-selected nodes exchange state proofs repeatedly to agree on sequential states.
- Step by step explanation: 
  1. A client submits a transaction request to the primary node (leader).
  2. **Pre-prepare**: The leader assigns a sequence number and multicasts the request to backup nodes.
  3. **Prepare**: Backup nodes verify the block and multicast a prepare message to all other nodes.
  4. **Commit**: When a node receives 2f prepare messages (f = tolerated faults), it multicasts a commit message.
  5. Nodes execute transactions and reply to the client after receiving 2f+1 commit messages, achieving instant finality.

- Trilemma analysis:
    - Scalability (based on block creation time, TPS): Score 6/10 (Sub-second / Instant block time, 1,000 - 5,000+ TPS)
    - Security: Score 8/10 (33% Byzantine Threshold - mathematically resilient against malicious action if less than 1/3 of the nodes are faulty)
    - Decentralisation: Score 2/10 (Low node participation, typically < 100 nodes due to intense O(N²) communication overhead)

- Cryptocurrencies/Blockchain:
    - Currencies using this mechanism: Hyperledger Fabric (HLF), Zilliqa (ZIL)
    - How this algo suits the blockchain: 
      - **Hyperledger Fabric (HLF)**: A private enterprise ledger needing high performance, strict permissioned nodes, and instant finality without a token.
      - **Zilliqa (ZIL)**: Combines PBFT for transaction processing within sharded committees with PoW for Sybil resistance.
 
- Smart contract language: Go, Java, JavaScript (Hyperledger Fabric); Scilla (Zilliqa)

- Layer classification:
    - Layer 1 or 2: Layer 1 (Hyperledger Fabric operates as Layer 1 Enterprise, Zilliqa operates as Layer 1)
    - Brief explanation: These blockchains serve as the primary network layer for transaction ledger validation.

---

### Proof of History (PoH)

- Name: Proof of History (PoH)
- Core Mechanism: A cryptographic clock sequence generator using Verifiable Delay Functions (VDF) to prove the exact sequence and time passage between events.
- Step by step explanation: 
  1. A leader generator node runs a continuous loop of SHA-256 hashes, feeding output as the next input.
  2. Incoming transactions are merged with the hash outputs, anchoring them to a verifiable time order.
  3. The generated sequence proves that data existed and was sent at a specific timestamp before verification.
  4. Validator nodes verify the sequence in parallel segments, avoiding heavy consensus latency.
  5. Final block validation is committed via standard Proof of Stake (PoS) voting.

- Trilemma analysis:
    - Scalability (based on block creation time, TPS): Score 10/10 (400 ms block time, 50,000+ TPS)
    - Security: Score 7/10 (Turbine Transmission / DDoS Target - relies on high-velocity leader propagation; hardware-level vulnerabilities are potential vectors)
    - Decentralisation: Score 5/10 (Medium node participation, ~1,500 - 2,000 nodes due to high hardware demands)

- Cryptocurrencies/Blockchain:
    - Currencies using this mechanism: Solana (SOL)
    - How this algo suits the blockchain: 
      - **Solana (SOL)**: Built to match NASDAQ transaction throughput, keeping a single global state in sync without sharding latency.
 
- Smart contract language: Rust, C, C++

- Layer classification:
    - Layer 1 or 2: Layer 1
    - Brief explanation: Solana operates as a standalone base protocol providing native execution and security.

---

### Proof of Elapsed Time (PoET)

- Name: Proof of Elapsed Time (PoET)
- Core Mechanism: A lottery-based consensus protocol that uses secure, hardware-enforced trusted execution environments (TEEs) to allocate randomized waiting times for block proposers.
- Step by step explanation: 
  1. Each validator node requests a random wait duration from its local CPU Trusted Execution Environment (TEE, e.g., Intel SGX).
  2. The TEE generates a secure, signed random timer attestation that cannot be altered by the node owner.
  3. The validator node goes into an idle sleep state for the duration of the assigned timer.
  4. The first node whose timer expires wakes up, generates a 'proof of sleep' attestation, and signs the new block.
  5. Other validators verify the attestation signature and the block, accepting it if the proof is valid.

- Trilemma analysis:
    - Scalability (based on block creation time, TPS): Score 7/10 (10 - 30 sec block time in Sawtooth, 100 - 1,000+ TPS)
    - Security: Score 7/10 (Intel SGX/TEE Exploit Resistance - secure unless physical TEE/SGX chip vulnerabilities are exploited)
    - Decentralisation: Score 6/10 (Hundreds of consortium validators - low participation barrier energy-wise, but dependent on Intel's hardware ecosystem)

- Cryptocurrencies/Blockchain:
    - Currencies using this mechanism: Hyperledger Sawtooth (SAW)
    - How this algo suits the blockchain: 
      - **Hyperledger Sawtooth (SAW)**: Provides highly efficient, tokenless transaction consensus suitable for enterprise logistics and supply chain networks.
 
- Smart contract language: Python, Rust, Go, Java

- Layer classification:
    - Layer 1 or 2: Layer 1 (Enterprise)
    - Brief explanation: Hyperledger Sawtooth operates as the base network layer for permissioned enterprise consortium applications.

---

### Avalanche Consensus

- Name: Avalanche Consensus
- Core Mechanism: A leaderless protocol that works through rapid, randomized sub-sampling, where nodes repeatedly query random neighbors until they agree.
- Step by step explanation: 
  1. A node receives a transaction and votes on its preference.
  2. The node queries a small, randomly selected group of validators (e.g. 20 nodes) for their votes.
  3. If a supermajority of the sampled nodes agree, the querying node changes its preference to match.
  4. This sub-sampling query loop is repeated across the network (typically 20-30 rounds).
  5. Decisions propagate like an avalanche, leading to finality across thousands of nodes in seconds.

- Trilemma analysis:
    - Scalability (based on block creation time, TPS): Score 9/10 (1 - 2 sec block time, 4,500+ TPS per subnet)
    - Security: Score 9/10 (80% Safety Sybil Resistance - maintains mathematical safety bounds even if up to 80% of nodes act maliciously)
    - Decentralisation: Score 8/10 (Thousands of active nodes - low hardware needs allow high node counts, though validator staking requirements exist)

- Cryptocurrencies/Blockchain:
    - Currencies using this mechanism: Avalanche (AVAX)
    - How this algo suits the blockchain: 
      - **Avalanche (AVAX)**: Designed to deploy custom, highly compliant enterprise blockchains (Subnets) with sub-second finality.
 
- Smart contract language: Solidity, Go

- Layer classification:
    - Layer 1 or 2: Layer 1
    - Brief explanation: Avalanche serves as the primary, base consensus layer validating both the main network and independent subnets.
