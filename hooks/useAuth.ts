import { useEffect, useState } from "react";
import { supabase } from "../utils/supabase";

export function useAuth() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getUser().then(res => setUser(res.data.user));

    supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });
  }, []);

  return user;
}
