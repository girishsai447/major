import { promises as fs } from "fs";
import path from "path";
import { Blockchain } from "./blockchain";
import { seedDemoScenario } from "../seed";
import { CURRENT_STAGE, DEMO_MODE } from "@/config/stage";
import type { ChainState } from "../types";

/**
 * Server-side singleton that owns the one true blockchain instance and persists
 * it to disk (data/chain.json) so state survives dev hot-reloads and restarts.
 *
 * We stash it on globalThis so Next.js's module re-evaluation during hot reload
 * doesn't spawn multiple divergent chains.
 */

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "chain.json");

interface GlobalStore {
  chain: Blockchain | null;
  loading: Promise<Blockchain> | null;
}

const g = globalThis as unknown as { __EDUCOIN__?: GlobalStore };
if (!g.__EDUCOIN__) g.__EDUCOIN__ = { chain: null, loading: null };
const store = g.__EDUCOIN__;

async function readFromDisk(): Promise<Blockchain | null> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf8");
    const state = JSON.parse(raw) as ChainState;
    return new Blockchain(state);
  } catch {
    return null;
  }
}

async function persist(chain: Blockchain): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(chain.state, null, 2), "utf8");
}

async function clearPersistedState(): Promise<void> {
  try {
    await fs.rm(DATA_FILE, { force: true });
  } catch {
    // ignore missing file
  }
}

async function initialise(): Promise<Blockchain> {
  const existing = await readFromDisk();
  if (existing) return existing;

  // Fresh chain. In Demo Mode we seed a full scholarship scenario; otherwise we
  // start empty except for a Government Treasury wallet.
  const chain = Blockchain.create(3);
  if (DEMO_MODE) {
    seedDemoScenario(chain, CURRENT_STAGE);
  } else {
    chain.addWallet("Government Treasury", "GOVERNMENT");
  }
  await persist(chain);
  return chain;
}

/** Get (loading/creating once) the shared blockchain instance. */
export async function getChain(): Promise<Blockchain> {
  if (store.chain) return store.chain;
  if (!store.loading) {
    store.loading = initialise().then((c) => {
      store.chain = c;
      return c;
    });
  }
  return store.loading;
}

/** Persist the current in-memory chain to disk. */
export async function saveChain(): Promise<void> {
  if (store.chain) await persist(store.chain);
}

/** Wipe everything and rebuild from scratch (used by the Reset control). */
export async function resetChain(seed: boolean): Promise<Blockchain> {
  store.chain = null;
  store.loading = null;
  await clearPersistedState();

  const chain = Blockchain.create(3);
  if (seed) {
    seedDemoScenario(chain, CURRENT_STAGE);
  } else {
    chain.addWallet("Government Treasury", "GOVERNMENT");
  }

  store.chain = chain;
  store.loading = Promise.resolve(chain);
  await persist(chain);
  return chain;
}
