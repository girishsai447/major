import { CURRENT_STAGE, type Stage } from "@/config/stage";

/**
 * Resolve the effective stage for an API request.
 *
 * Defaults to the compile-time CURRENT_STAGE, but honours the `educoin_stage`
 * cookie set by the client stage-selector so runtime overrides keep the API's
 * smart-contract enforcement in sync with the visible UI.
 */
export function getRequestStage(req: Request): Stage {
  const cookie = req.headers.get("cookie") ?? "";
  const match = cookie.match(/educoin_stage=([1-5])/);
  if (match) return Number(match[1]) as Stage;
  return CURRENT_STAGE;
}
