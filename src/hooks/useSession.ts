import { useAuth } from "./useAuth";

export function useSession() {
  // Alias of useAuth to match requested API
  return useAuth();
}
