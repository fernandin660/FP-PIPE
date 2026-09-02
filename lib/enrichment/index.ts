// Ponto de entrada público do Enrichment Engine.
export { enrich, runProvider, ehValido } from "./engine";
export {
  registrarAttempt,
} from "./attempt";
export {
  lerCache,
  gravarCache,
} from "./cache";
export {
  custoPara,
  custoPadrao,
} from "./cost";
export {
  reservar as reservarCreditos,
  estornar as estornarCreditos,
} from "./credits";
export { selecionarCandidatos } from "./router";
export {
  getAllProviders,
  getProvider,
} from "./registry";
export { CONFIG_PROVIDERS, KEYS } from "./config";
export type {
  Alvo,
  ContextoEnriquecimento,
  DadoTipo,
  EmailTipo,
  Pedido,
  Provider,
  ResultadoEngine,
  ResultadoProvider,
  TelefoneEncontrado,
  TelefoneTipo,
} from "./types";
