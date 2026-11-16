// Inicio de sesión Microsoft (MSAL). Solo usa el ID de aplicación: NO hay claves secretas.
import { cfg } from "./util.js";
const SCOPES = ["User.Read", "Sites.ReadWrite.All"];
let app = null, account = null;

export async function initAuth() {
  const base = location.origin + location.pathname.replace(/[^/]*$/, "");
  app = new msal.PublicClientApplication({
    auth: { clientId: cfg.clientId, authority: `https://login.microsoftonline.com/${cfg.tenant}`, redirectUri: base },
    cache: { cacheLocation: "localStorage" }
  });
  await app.initialize();
  const r = await app.handleRedirectPromise();
  account = (r && r.account) || app.getAllAccounts()[0] || null;
  if (account) app.setActiveAccount(account);
  return account;
}
export const sesion = () => account;
export const entrar = () => app.loginRedirect({ scopes: SCOPES });
export const salir = () => app.logoutRedirect({ account });

export async function token(scopes = SCOPES) {
  if (!account) throw new Error("Sin sesión. Inicia sesión con tu cuenta de la empresa.");
  try {
    return (await app.acquireTokenSilent({ scopes, account })).accessToken;
  } catch (e) {
    if (e && e.name === "InteractionRequiredAuthError") { await app.acquireTokenRedirect({ scopes, account }); }
    throw e;
  }
}
