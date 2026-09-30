import { Blockchain } from "./blockchain/blockchain";
import type { Stage } from "@/config/stage";

/**
 * Seed a realistic scholarship scenario for demonstrations.
 *
 * Featuring the project team as students is a deliberate, friendly touch for
 * the live viva. The scenario exercises every part of the system: reserve
 * funding, issuance, approved spends across all categories, a redemption
 * (settlement), an expired scholarship awaiting clawback, and several attempts
 * the smart contract must reject — populating the audit trail with variety.
 *
 * We always seed with full smart-contract validation (stage 5) so the data is
 * internally consistent no matter which stage the UI is currently showing.
 */
export function seedDemoScenario(chain: Blockchain, _stage: Stage): void {
  const SEED_STAGE = 5 as Stage;

  // --- Participants -------------------------------------------------------
  chain.addWallet("Government Treasury", "GOVERNMENT");
  const vnr = chain.addWallet("VNR VJIET", "INSTITUTION");
  const cbit = chain.addWallet("CBIT", "INSTITUTION");
  const bookstore = chain.addWallet("Campus Book Store", "VENDOR");

  const girish = chain.addWallet("Girish Sai Tipirneni", "STUDENT", "VNR VJIET");
  const sanjeeth = chain.addWallet("Ravva Sai Sanjeeth", "STUDENT", "VNR VJIET");
  const siddhartha = chain.addWallet("Siddhartha Brahmanapally", "STUDENT", "VNR VJIET");
  const jeevan = chain.addWallet("Venuturla Jeevan Manikanta Reddy", "STUDENT", "CBIT");
  const aisha = chain.addWallet("Aisha Khan", "STUDENT", "CBIT");
  const lapsed = chain.addWallet("Rahul Nair (lapsed)", "STUDENT", "CBIT");

  const students = [girish, sanjeeth, siddhartha, jeevan, aisha, lapsed];

  // --- 0) Government funds the reserve that backs the peg (1 EDU = ₹100) -----
  chain.depositReserve(400000);

  // --- 1) Government issues scholarships (minting) ------------------------
  for (const s of students) {
    chain.submit(
      {
        type: "MINT",
        from: chain.treasury!.address,
        to: s.address,
        amount: 50000,
        category: "ISSUANCE",
        memo: `Merit scholarship 2026–27 issued to ${s.name}`,
      },
      SEED_STAGE
    );
  }
  chain.mine("Government Node");

  // Back-date the lapsed student's scholarship so it is already expired.
  // (Only the validity term is altered — this field is outside the block hash,
  // so chain integrity is preserved.)
  const expiredAt = Date.now() - 1000 * 60 * 60 * 24 * 30; // 30 days ago
  for (const block of chain.state.chain) {
    for (const tx of block.transactions) {
      if (tx.type === "MINT" && tx.to === lapsed.address) tx.expiresAt = expiredAt;
    }
  }

  // --- 2) Students spend on approved educational purposes -----------------
  const spend = (
    from: string,
    to: string,
    amount: number,
    category: "TUITION" | "EXAMINATION" | "HOSTEL" | "BOOKS",
    memo: string
  ) => chain.submit({ type: "TRANSFER", from, to, amount, category, memo }, SEED_STAGE);

  spend(girish.address, vnr.address, 30000, "TUITION", "Semester 5 tuition fee");
  spend(girish.address, vnr.address, 12000, "HOSTEL", "Hostel fee (block A)");
  spend(girish.address, bookstore.address, 2000, "BOOKS", "Reference textbooks");
  spend(sanjeeth.address, vnr.address, 30000, "TUITION", "Semester 5 tuition fee");
  spend(sanjeeth.address, vnr.address, 3000, "EXAMINATION", "End-sem examination fee");
  chain.mine("EduCoin Validator");

  spend(siddhartha.address, vnr.address, 30000, "TUITION", "Semester 5 tuition fee");
  spend(siddhartha.address, vnr.address, 12000, "HOSTEL", "Hostel fee (block B)");
  spend(jeevan.address, cbit.address, 28000, "TUITION", "Semester 5 tuition fee");
  spend(jeevan.address, cbit.address, 3000, "EXAMINATION", "End-sem examination fee");
  spend(aisha.address, cbit.address, 28000, "TUITION", "Semester 5 tuition fee");
  spend(aisha.address, bookstore.address, 2500, "BOOKS", "Lab manuals & books");
  chain.mine("EduCoin Validator");

  // --- 3) An institution redeems EduCoin for INR (settlement) -------------
  chain.settle(vnr.address, 40000);
  chain.mine("EduCoin Validator");

  // --- 4) Attempts the smart contract must REJECT (audit trail) -----------
  // (a) Student tries to cash out to another student.
  chain.submit(
    { type: "TRANSFER", from: girish.address, to: sanjeeth.address, amount: 5000, category: "TUITION", memo: "Attempted peer transfer (cash-out)" },
    SEED_STAGE
  );
  // (b) Wrong category for recipient — paying "tuition" to a vendor.
  chain.submit(
    { type: "TRANSFER", from: sanjeeth.address, to: bookstore.address, amount: 1000, category: "TUITION", memo: "Attempted tuition payment to bookstore" },
    SEED_STAGE
  );
  // (c) Overspend beyond remaining balance.
  chain.submit(
    { type: "TRANSFER", from: jeevan.address, to: cbit.address, amount: 999999, category: "HOSTEL", memo: "Attempted overspend" },
    SEED_STAGE
  );
  // (d) Books cap exceeded (₹5k cap; Girish already spent ₹2k on books).
  chain.submit(
    { type: "TRANSFER", from: girish.address, to: bookstore.address, amount: 4000, category: "BOOKS", memo: "Attempted books spend beyond cap" },
    SEED_STAGE
  );
  // (e) Spending an expired scholarship.
  chain.submit(
    { type: "TRANSFER", from: lapsed.address, to: cbit.address, amount: 10000, category: "TUITION", memo: "Attempted spend after expiry" },
    SEED_STAGE
  );
}
