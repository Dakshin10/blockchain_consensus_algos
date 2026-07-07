# Consensus Algorithms Details

This document contains the filled templates with the details for the consensus algorithms: Practical Byzantine Fault Tolerance (PBFT), Proof of Authority (PoA), Proof of History (PoH), Proof of Elapsed Time (PoET), and Avalanche Consensus.

---

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
