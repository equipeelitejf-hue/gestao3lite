import { createFileRoute } from "@tanstack/react-router";

import { MinisterialDashboard } from "@/components/ministerial-dashboard";

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
  return <MinisterialDashboard />;
}
