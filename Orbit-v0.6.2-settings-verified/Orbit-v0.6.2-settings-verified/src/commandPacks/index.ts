import type { CommandPack } from "./types";
import webPack from "./web";
import utilitiesPack from "./utilities";
import productivityPack from "./productivity";

/** Add a new built-in pack here; each pack owns its own command manifest. */
export const commandPacks: CommandPack[] = [webPack, utilitiesPack, productivityPack];
