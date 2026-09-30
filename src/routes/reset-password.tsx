import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import logoBlue from "@/assets/logotipo-azul.svg.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — 3Lite Gestão Ministerial" },
      { name: "description", content: "Crie uma nova senha de acesso." },
      { property: "og:title", content: "Nova senha — 3Lite Gestão Ministerial" },
      { property: "og:description", content: "Crie uma nova senha de acesso." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return setError("A senha deve ter pelo menos 8 caracteres");
    if (password !== confirm) return setError("As senhas não conferem");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return setError("O link expirou ou é inválido. Peça um novo link na tela de entrada.");
    navigate({ to: "/painel", replace: true });
  }

  return <div className="flex min-h-screen items-center justify-center bg-background px-5">
    <form onSubmit={submit} className="w-full max-w-sm space-y-4">
      <img src={logoBlue.url} alt="3Lite Supernova" className="mb-8 h-12 w-auto" />
      <h1 className="text-3xl font-bold text-navy">Nova senha</h1>
      <label className="block text-xs text-muted-foreground">Nova senha<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} autoComplete="new-password" className="mt-1" /></label>
      <label className="block text-xs text-muted-foreground">Confirmar senha<Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} maxLength={72} autoComplete="new-password" className="mt-1" /></label>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Salvando..." : "Salvar nova senha"}</Button>
    </form>
  </div>;
}
