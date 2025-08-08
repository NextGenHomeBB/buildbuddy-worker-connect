
export function getCurrentOrgId(): string | null {
  // This key is used elsewhere in the app after login
  return localStorage.getItem("employer_org_id");
}
