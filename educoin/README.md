# EduCoin — Scholarship Blockchain

**Design and Implementation of a Stable Cryptocurrency for a Sector-Specific Requirement**
B.Tech Major Project (2026–2027) · Department of CSE · Team 6
Supervisor: Dr. Deepak Sukheja, Associate Professor

A blockchain-enabled digital currency (**EduCoin / EduCurrency**) that restricts government
scholarship funds to **authorized educational purposes only** — tuition, examination, hostel
and books — with complete, tamper-evident traceability from issuance to utilization.

---

## Quick start

```bash
npm install
npm run dev
```

Open the URL it prints (http://localhost:3000, or 3001 if 3000 is busy).

Build for production:

```bash
npm run build && npm start
```

---

## The 5-stage plan (one review milestone per month)

The project is delivered in **five progressive stages**. Every feature is already written and
shipped — a stage simply decides how much is *unlocked and visible*. Nothing is ever deleted;
raising the stage reveals more of the app.

| Stage | Month | Title | What it adds |
|:---:|:---|:---|:---|
| 1 | Month 1 | Blockchain Foundation | Blocks, SHA-256, proof-of-work, **Merkle proofs**, **Tamper Lab**, block explorer |
| 2 | Month 2 | EduCoin Issuance & Wallets | Roles, **Ed25519 signatures**, **stablecoin peg + collateral reserve**, minting, transfers |
| 3 | Month 3 | Smart Contract Restrictions | **10-rule** policy engine, categories, **spending caps**, **time-bound expiry**, auto-rejection |
| 4 | Month 4 | Traceability & Dashboards | Fund tracing, **settlement/redemption + clawback**, analytics, **fraud alerts**, audit trail |
| 5 | Month 5 | Complete Application | Admin console + search, reports, **whitepaper**, **notifications**, **persona switcher** |

### How to switch stages (the "simple change in code")

Open **`src/config/stage.ts`** and change **one line**:

```ts
export const CURRENT_STAGE: Stage = 1;   // ← set to 1, 2, 3, 4 or 5
```

Save — the app hot-reloads to that stage. Locked features show a 🔒 with the stage that
unlocks them.

You can also switch at runtime using the floating **Stage Selector** button (bottom-right).
It also forwards the chosen stage to the backend so smart-contract enforcement always matches
what is on screen.

---

## Demo Mode (hidden, for the live viva)

`src/config/stage.ts` also has:

```ts
export const DEMO_MODE: boolean = true;  // seeds a full scholarship scenario + presenter overlay
```

When on, the app:
- Seeds a realistic scenario (the four team members appear as students 🙂, plus institutions,
  a vendor and a second college), including **three deliberately rejected attempts** so the
  audit trail is populated.
- Shows a **Demo Mode** banner with **per-stage presenter notes** (talking points for each
  milestone).

You can also toggle Demo Mode from any page with the secret key sequence: type **`d e m o`**.

Re-seed or wipe the chain anytime from the Stage Selector, or from the **Admin Console**.

---

## How it works (architecture)

To keep the demonstration **self-contained and reliable** (no MetaMask, gas or testnet that can
break mid-presentation), the blockchain and the smart contract are implemented **natively in
TypeScript**. The data structures and guarantees mirror an equivalent Solidity contract on an
EVM chain.

```
src/
  config/stage.ts            ← STAGE CONTROL CENTER (edit CURRENT_STAGE / DEMO_MODE here)
  config/features.ts         ← feature-gating helpers
  lib/
    types.ts                 ← domain types (roles, categories, tx, block, caps)
    blockchain/
      crypto.ts              ← SHA-256, Ed25519 key pairs, sign/verify, addresses
      block.ts               ← block hashing, Merkle root/proof, proof-of-work mining
      blockchain.ts          ← the chain: wallets, balances, reserve, submit, mine,
                               settle, clawback, validate, trace
      smartContract.ts       ← the policy engine (10 rules) — the "smart contract"
      store.ts               ← server singleton + JSON persistence (data/chain.json)
    seed.ts                  ← demo scholarship scenario
    serialize.ts             ← API snapshot builder (strips private keys)
  app/
    api/                     ← chain, wallets, mint, transfer, mine, validate, reset,
                               reserve, settle, clawback, merkle-proof, tamper
    (pages)                  ← home, roadmap, explorer, wallets, treasury, mint, transfer,
                               contract, audit, settlements, trace, dashboard, admin,
                               reports, whitepaper, about
  components/                ← UI kit, sidebar, stage selector, demo overlay,
                               blockchain lab, stage-5 bar (personas + notifications)
```

### The smart-contract rules (Stage 3+)

1. **R1** Registered participants only
2. **R2** Government-only issuance (mint), directly to a student
3. **R3** Only students may spend scholarship funds
4. **R4** Spending only to an Institution or Approved Vendor (never student→student)
5. **R5** An approved educational category, valid for the recipient
6. **R6** Sufficient verifiable on-chain balance
7. **R7** Positive amount
8. **R8** Per-category cumulative spending cap (Exam ₹10k, Hostel ₹20k, Books ₹5k; Tuition uncapped)
9. **R9** Within the scholarship's validity term (expired funds are frozen for clawback)
10. **R10** Valid Ed25519 digital signature from the sender's wallet

Any violation is **automatically rejected** and recorded in the **Audit Trail**.

### Beyond the abstract — what makes it a bigger project

- **Stablecoin peg & reserve** — EduCoin is fully INR-collateralised (1 EDU = ₹1); minting is blocked if it would break the peg. Directly realises the *"stable* cryptocurrency" in the project title.
- **Real cryptography** — every wallet has an Ed25519 key pair, addresses are derived from public keys, and every transaction is signed and verified.
- **Merkle trees** — each block commits to a Merkle root; the Blockchain Lab produces inclusion proofs and the Tamper Lab proves tamper-evidence live.
- **Full fund lifecycle** — issuance → spend → **settlement/redemption** (institutions cash out to INR) → **clawback** of expired scholarships.
- **Intelligence & UX** — fraud/anomaly alerts, ledger search, a live notifications feed, a role **persona switcher**, and a project **whitepaper**.

---

## Suggested viva flow

1. **Home / Roadmap** — explain the 5 monthly stages.
2. **Block Explorer** — show hashes, links, proof-of-work; run *Validate Chain*.
3. **Issue Scholarship** — mint EduCoin to a student, mine it, watch the balance.
4. **Smart Contract** — open the Policy Simulator, click the ✗ preset scenarios to show
   rejections, then a ✓ valid tuition payment.
5. **Fund Tracing** — pick a student and follow issuance → utilization.
6. **Analytics + Audit Trail** — spending by category/institution; blocked attempts.
7. **Admin + Reports** — full ledger, then *Print / Export PDF* a committee report.

---

*Team 6: Girish Sai Tipirneni (23071A05P4), Ravva Sai Sanjeeth (23071A05T9),
Siddhartha Brahmanapally (23071A05U3), Venuturla Jeevan Manikanta Reddy (23071A05U9).*
