import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import symbolWhite from "@/assets/simbolo-branco.svg.asset.json";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "3Lite — Gestão Ministerial" },
      { name: "description", content: "Gestão de metas, resultados e equipes ministeriais em uma visão integrada." },
      { property: "og:title", content: "3Lite — Gestão Ministerial" },
      { property: "og:description", content: "Acompanhe o progresso da liderança, discípulos e toda a rede ministerial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => navigate({ to: data.session ? "/painel" : "/auth", replace: true }));
  }, [navigate]);
  return <div className="grid min-h-screen place-items-center bg-navy"><img src={symbolWhite.url} alt="3Lite" className="splash-symbol h-28 w-auto" /></div>;
}
