import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AuthForm } from "@/components/AuthForm";

export default function Auth() {
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4 overflow-hidden">
      <div className="flex w-full max-w-md flex-col items-center">
        <img
          src="https://i.postimg.cc/8cznx498/Nex-Drive-Logo.png"
          alt="Nex Drive Logo"
          className="h-[500px] w-auto block mt-[50px]"
          loading="eager"
        />
        <div className="w-full -mt-[50px]">
          <AuthForm />
        </div>
      </div>
    </div>
  );
}
