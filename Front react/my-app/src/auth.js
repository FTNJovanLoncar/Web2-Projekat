
export function getJwt() {
  const raw = localStorage.getItem("token");
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}
export function setJwt(token) {
  if (typeof token === "string" && token.split(".").length === 3) {
    localStorage.setItem("token", token);
  }
}
export function clearJwt() {
  localStorage.removeItem("token");
}
