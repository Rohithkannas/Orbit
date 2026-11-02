import type { CommandPack } from "./types";
import webPack from "./web";
import utilitiesPack from "./utilities";
import productivityPack from "./productivity";

/** All built-in command packs are registered together. */
export const commandPacks: CommandPack[] = [webPack, utilitiesPack, productivityPack];
