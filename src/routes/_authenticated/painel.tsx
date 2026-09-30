import { createFileRoute } from "@tanstack/react-router";

import { MinisterialDashboard } from "@/components/ministerial-dashboard";

export const Route = createFileRoute("/_authenticated/painel")({
  head: () => ({
    meta: [
      { title: "Painel — 3Lite Gestão Ministerial" },
      { name: "description", content: "Metas, lançamentos e resultados da sua rede ministerial." },
      { property: "og:title", content: "Painel — 3Lite Gestão Ministerial" },
      { property: "og:description", content: "Metas, lançamentos e resultados da sua rede ministerial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MinisterialDashboard,
});
