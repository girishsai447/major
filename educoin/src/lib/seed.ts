import { Blockchain } from "./blockchain/blockchain";
import type { Stage } from "@/config/stage";
import type { StudentRecord } from "./types";

/**
 * Seed a realistic scholarship scenario for demonstrations.
 * Featuring the project team as students with academic completion dates,
 * INR reserve funding, puzzle-based coin generation records, hash-chained audit
 * ledger entries, and an expired scholarship record ready for demonstration burn.
 */
export function seedDemoScenario(chain: Blockchain, _stage: Stage): void {
  const SEED_STAGE = 5 as Stage;

  // --- 0) Pre-register Students with Academic Levels & Completion Dates -----
  const students: StudentRecord[] = [
    {
      studentId: "STU001",
      name: "Girish Sai Tipirneni",
      instituteId: "INST-VNR",
      instituteName: "VNR VJIET",
      academicLevel: "3rd Year (B.Tech CSE)",
      // June 30, 2027
      academicCompletionDate: new Date("2027-06-30T23:59:59Z").getTime(),
    },
    {
      studentId: "STU002",
      name: "Ravva Sai Sanjeeth",
      instituteId: "INST-VNR",
      instituteName: "VNR VJIET",
      academicLevel: "3rd Year (B.Tech CSE)",
      academicCompletionDate: new Date("2027-06-30T23:59:59Z").getTime(),
    },
    {
      studentId: "STU003",
      name: "Siddhartha Brahmanapally",
      instituteId: "INST-VNR",
      instituteName: "VNR VJIET",
      academicLevel: "3rd Year (B.Tech CSE)",
      academicCompletionDate: new Date("2027-06-30T23:59:59Z").getTime(),
    },
    {
      studentId: "STU004",
      name: "Venuturla Jeevan Manikanta Reddy",
      instituteId: "INST-CBIT",
      instituteName: "CBIT",
      academicLevel: "3rd Year (B.Tech CSE)",
      academicCompletionDate: new Date("2027-06-30T23:59:59Z").getTime(),
    },
    {
      studentId: "STU005",
      name: "Aisha Khan",
      instituteId: "INST-CBIT",
      instituteName: "CBIT",
      academicLevel: "2nd Year (B.Tech IT)",
      // June 30, 2028
      academicCompletionDate: new Date("2028-06-30T23:59:59Z").getTime(),
    },
    {
      studentId: "STU006",
      name: "Rahul Nair (Lapsed / Expired)",
      instituteId: "INST-CBIT",
      instituteName: "CBIT",
      academicLevel: "Graduated (4th Year)",
      // Past completion date (e.g. June 30, 2025) so expiry and burn can be demonstrated live
      academicCompletionDate: new Date("2025-06-30T23:59:59Z").getTime(),
    },
  ];

  for (const s of students) {
    chain.addStudent(s);
  }

  // --- 1) Wallets for existing transfer/settlement demonstration ----------
  const govt = chain.addWallet("Government Treasury", "GOVERNMENT");
  const vnr = chain.addWallet("VNR VJIET", "INSTITUTION");
  const cbit = chain.addWallet("CBIT", "INSTITUTION");
  const bookstore = chain.addWallet("Campus Book Store", "VENDOR");

  const girishW = chain.addWallet("Girish Sai Tipirneni", "STUDENT", "VNR VJIET");
  girishW.studentId = "STU001";
  girishW.academicLevel = "3rd Year";
  girishW.academicCompletionDate = students[0].academicCompletionDate;

  const sanjeethW = chain.addWallet("Ravva Sai Sanjeeth", "STUDENT", "VNR VJIET");
  sanjeethW.studentId = "STU002";

  const siddharthaW = chain.addWallet("Siddhartha Brahmanapally", "STUDENT", "VNR VJIET");
  siddharthaW.studentId = "STU003";

  const jeevanW = chain.addWallet("Venuturla Jeevan Manikanta Reddy", "STUDENT", "CBIT");
  jeevanW.studentId = "STU004";

  const aishaW = chain.addWallet("Aisha Khan", "STUDENT", "CBIT");
  aishaW.studentId = "STU005";

  const lapsedW = chain.addWallet("Rahul Nair (lapsed)", "STUDENT", "CBIT");
  lapsedW.studentId = "STU006";
  lapsedW.academicCompletionDate = students[5].academicCompletionDate;

  // Link addresses to student records for future wallet team
  students[0].walletAddress = girishW.address;
  students[1].walletAddress = sanjeethW.address;
  students[2].walletAddress = siddharthaW.address;
  students[3].walletAddress = jeevanW.address;
  students[4].walletAddress = aishaW.address;
  students[5].walletAddress = lapsedW.address;

  // --- 2) Fund INR Reserve (1 EDU = ₹100 INR) ------------------------------
  // ₹500,000 INR backs up to 5,000 EDU Coins
  chain.depositReserve(500000);

  // --- 3) Seed Generation Records (Puzzle + Nonce + Block + Audit Chaining) -
  // Generate for Girish (STU001) - 50 EDU (₹5,000 INR)
  chain.generateCoins({
    studentId: "STU001",
    amountCoins: 50,
    governmentAuthorityId: "GOV-MINISTRY-EDU",
  });

  // Generate for Ravva Sai Sanjeeth (STU002) - 50 EDU (₹5,000 INR)
  chain.generateCoins({
    studentId: "STU002",
    amountCoins: 50,
    governmentAuthorityId: "GOV-MINISTRY-EDU",
  });

  // Generate for Siddhartha (STU003) - 50 EDU (₹5,000 INR)
  chain.generateCoins({
    studentId: "STU003",
    amountCoins: 50,
    governmentAuthorityId: "GOV-MINISTRY-EDU",
  });

  // Generate for Aisha (STU005) - 30 EDU (₹3,000 INR)
  chain.generateCoins({
    studentId: "STU005",
    amountCoins: 30,
    governmentAuthorityId: "GOV-MINISTRY-EDU",
  });

  // Generate for Rahul Nair (STU006) - Lapsed student (25 EDU = ₹2,500 INR)
  // Has academic completion date in 2025, so it is already expired and eligible for demonstration burn!
  chain.generateCoins({
    studentId: "STU006",
    amountCoins: 25,
    governmentAuthorityId: "GOV-MINISTRY-EDU",
  });

  // --- 4) Seed standard wallet transfers & spends for existing viva stages --
  const studentWallets = [girishW, sanjeethW, siddharthaW, jeevanW, aishaW, lapsedW];
  for (const s of studentWallets) {
    chain.submit(
      {
        type: "MINT",
        from: govt.address,
        to: s.address,
        amount: 500, // 500 EDU
        category: "ISSUANCE",
        memo: `Scholarship issuance for ${s.name}`,
      },
      SEED_STAGE
    );
  }
  chain.mine("Government Node");

  // Spend tuition, hostel, books
  const spend = (
    from: string,
    to: string,
    amount: number,
    category: "TUITION" | "EXAMINATION" | "HOSTEL" | "BOOKS",
    memo: string
  ) => chain.submit({ type: "TRANSFER", from, to, amount, category, memo }, SEED_STAGE);

  spend(girishW.address, vnr.address, 300, "TUITION", "Semester 5 tuition fee");
  spend(girishW.address, vnr.address, 120, "HOSTEL", "Hostel fee (block A)");
  spend(girishW.address, bookstore.address, 20, "BOOKS", "Reference textbooks");
  spend(sanjeethW.address, vnr.address, 300, "TUITION", "Semester 5 tuition fee");
  spend(sanjeethW.address, vnr.address, 30, "EXAMINATION", "End-sem examination fee");
  chain.mine("EduCoin Validator");

  spend(siddharthaW.address, vnr.address, 300, "TUITION", "Semester 5 tuition fee");
  spend(siddharthaW.address, vnr.address, 120, "HOSTEL", "Hostel fee (block B)");
  spend(jeevanW.address, cbit.address, 280, "TUITION", "Semester 5 tuition fee");
  spend(aishaW.address, bookstore.address, 25, "BOOKS", "Lab manuals & books");
  chain.mine("EduCoin Validator");

  // Institution redeems EDU for INR
  chain.settle(vnr.address, 400);
  chain.mine("EduCoin Validator");

  // --- 5) Attempts the smart contract must REJECT (Audit trail demonstration) ---
  // (a) Cross-college tuition rejection (R5b): Girish (VNR VJIET) tries to pay tuition to CBIT
  chain.submit(
    {
      type: "TRANSFER",
      from: girishW.address,
      to: cbit.address,
      amount: 100,
      category: "TUITION",
      memo: "Attempted cross-college tuition payment to CBIT",
    },
    SEED_STAGE
  );

  // (b) Student tries to cash out to another student (R4)
  chain.submit(
    {
      type: "TRANSFER",
      from: girishW.address,
      to: sanjeethW.address,
      amount: 50,
      category: "TUITION",
      memo: "Attempted peer-to-peer transfer (cash-out)",
    },
    SEED_STAGE
  );

  // (c) Paying tuition to bookstore vendor (R5)
  chain.submit(
    {
      type: "TRANSFER",
      from: sanjeethW.address,
      to: bookstore.address,
      amount: 20,
      category: "TUITION",
      memo: "Attempted tuition payment to campus bookstore",
    },
    SEED_STAGE
  );

  // (d) Overspend beyond balance (R6)
  chain.submit(
    {
      type: "TRANSFER",
      from: jeevanW.address,
      to: cbit.address,
      amount: 999999,
      category: "HOSTEL",
      memo: "Attempted overspend beyond balance",
    },
    SEED_STAGE
  );
}
