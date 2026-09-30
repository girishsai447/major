/**
 * 18-decimal precision math for EduCoin.
 * 1 EDU Coin = 10^18 base units (wei equivalent).
 * 1 EDU Coin = 100 INR.
 * Never uses native floating-point math for monetary or supply tracking.
 */

export const DECIMALS = 18n;
export const BASE_UNIT = 10n ** 18n; // 1 EDU in base units
export const COIN_VALUE_INR = 100;

/** Convert a human coin string or number to 18-decimal BigInt base units. */
export function parseCoinsToBaseUnits(coins: number | string): bigint {
  const str = typeof coins === "number" ? coins.toString() : coins.trim();
  if (!str || str === "0") return 0n;

  // Handle scientific notation if any
  const numVal = Number(str);
  if (isNaN(numVal) || numVal < 0) {
    throw new Error(`Invalid coin amount: ${coins}`);
  }

  const [wholePart, fracPart = ""] = str.split(".");
  const cleanWhole = wholePart.replace(/^0+/, "") || "0";
  const wholeUnits = BigInt(cleanWhole) * BASE_UNIT;

  if (!fracPart) return wholeUnits;

  // Truncate or pad fraction to 18 digits
  const paddedFrac = fracPart.slice(0, 18).padEnd(18, "0");
  const fracUnits = BigInt(paddedFrac);

  return wholeUnits + fracUnits;
}

/** Convert base units BigInt to exact decimal string. */
export function formatBaseUnitsToExact(baseUnits: bigint | string): string {
  const b = typeof baseUnits === "string" ? BigInt(baseUnits) : baseUnits;
  if (b === 0n) return "0";

  const whole = b / BASE_UNIT;
  const rem = b % BASE_UNIT;

  if (rem === 0n) return whole.toString();

  const frac = rem.toString().padStart(18, "0").replace(/0+$/, "");
  return `${whole}.${frac}`;
}

/** Convert base units to human-friendly display number (for labels/charts). */
export function formatBaseUnitsToDisplay(baseUnits: bigint | string, maxDecimals = 4): number {
  const exact = formatBaseUnitsToExact(baseUnits);
  const val = parseFloat(exact);
  return Number(val.toFixed(maxDecimals));
}

/**
 * Calculate INR value from base units:
 * INR Value = Expired Coins x 100
 * Base units * 100 / 10^18
 */
export function baseUnitsToInr(baseUnits: bigint | string): {
  inrWhole: number;
  inrExact: string;
  inrRounded: number;
} {
  const b = typeof baseUnits === "string" ? BigInt(baseUnits) : baseUnits;
  // Multiply by 100 first to avoid losing precision
  const inrBaseUnits = b * 100n;
  const whole = inrBaseUnits / BASE_UNIT;
  const rem = inrBaseUnits % BASE_UNIT;

  if (rem === 0n) {
    const wholeNum = Number(whole);
    return {
      inrWhole: wholeNum,
      inrExact: whole.toString(),
      inrRounded: wholeNum,
    };
  }

  const frac18 = rem.toString().padStart(18, "0").replace(/0+$/, "");
  const inrExact = `${whole}.${frac18}`;
  const inrRounded = Number(parseFloat(inrExact).toFixed(2));

  return {
    inrWhole: Number(whole),
    inrExact,
    inrRounded,
  };
}

/** Maximum whole coins that can be minted from INR reserve. */
export function maxMintableCoins(reserveINR: number): bigint {
  const wholeCoins = BigInt(Math.floor(Math.max(0, reserveINR) / COIN_VALUE_INR));
  return wholeCoins * BASE_UNIT;
}
