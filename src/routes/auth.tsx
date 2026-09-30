import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";

import logoBlue from "@/assets/logotipo-azul.svg.asset.json";
import symbolOrange from "@/assets/simbolo-laranja.svg.asset.json";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — 3Lite Gestão Ministerial" },
      { name: "description", content: "Acesse o painel da sua rede ministerial." },
      { property: "og:title", content: "Entrar — 3Lite Gestão Ministerial" },
      { property: "og:description", content: "Acesse o painel da sua rede ministerial." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";
const emailSchema = z.string().trim().toLowerCase().email("E-mail inválido").max(255);
const passSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres").max(72);

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => { if (data.session) navigate({ to: "/painel", replace: true }); });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setInfo("");
    const em = emailSchema.safeParse(email);
    if (!em.success) return setError(em.error.issues[0]?.message ?? "E-mail inválido");
    if (mode !== "forgot") {
      const pw = passSchema.safeParse(password);
      if (!pw.success) return setError(pw.error.issues[0]?.message ?? "Senha inválida");
    }
    if (mode === "signup" && name.trim().length < 2) return setError("Informe seu nome");
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email: em.data, password });
        if (error) throw new Error(error.message.includes("confirm") ? "Confirme seu e-mail pelo link enviado antes de entrar." : "E-mail ou senha incorretos.");
        navigate({ to: "/painel", replace: true });
      } else if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email: em.data, password, options: { emailRedirectTo: `${window.location.origin}/painel`, data: { name: name.trim().slice(0, 100) } } });
        if (error) throw new Error(error.message.includes("registered") ? "Este e-mail já tem conta. Entre com sua senha." : "Não foi possível criar a conta.");
        if (data.session) navigate({ to: "/painel", replace: true });
        else { setInfo("Enviamos um link de confirmação para o seu e-mail. Confirme e depois entre."); setMode("signin"); }
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(em.data, { redirectTo: `${window.location.origin}/reset-password` });
        if (error) throw new Error("Não foi possível enviar o e-mail. Tente novamente.");
        setInfo("Se o e-mail estiver cadastrado, você receberá um link para criar uma nova senha.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Algo deu errado.");
    } finally {
      setBusy(false);
    }
  }

  const titles: Record<Mode, [string, string]> = {
    signin: ["Entrar", "Acesse o painel da sua rede ministerial."],
    signup: ["Criar conta", "Use o e-mail que o seu líder cadastrou para entrar direto na sua equipe."],
    forgot: ["Recuperar senha", "Enviaremos um link para você criar uma nova senha."],
  };

  return <div className="grid min-h-screen bg-background lg:grid-cols-2">
    <div className="relative hidden overflow-hidden bg-navy lg:block"><img src={symbolOrange.url} alt="" className="absolute -bottom-24 -left-16 h-[520px] w-auto opacity-15" /><div className="relative flex h-full flex-col justify-end p-14 text-primary-foreground"><p className="text-xs font-medium uppercase tracking-[0.24em] text-primary">Gestão ministerial</p><h2 className="mt-4 max-w-md text-4xl font-bold leading-tight">Cada resultado soma para toda a rede.</h2><p className="mt-4 max-w-md font-book text-primary-foreground/65">Metas Parceiro de Deus, arregimentação e membresia da sua equipe em um só lugar.</p></div></div>
    <div className="flex items-center justify-center px-5 py-12">
      <form onSubmit={submit} className="w-full max-w-sm space-y-4">
        <img src={logoBlue.url} alt="3Lite Supernova" className="mb-8 h-12 w-auto" />
        <div><h1 className="text-3xl font-bold text-navy">{titles[mode][0]}</h1><p className="mt-2 text-sm text-muted-foreground">{titles[mode][1]}</p></div>
        {mode === "signup" && <label className="block text-xs text-muted-foreground">Nome completo<Input value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoComplete="name" className="mt-1" /></label>}
        <label className="block text-xs text-muted-foreground">E-mail<Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} autoComplete="email" className="mt-1" /></label>
        {mode !== "forgot" && <label className="block text-xs text-muted-foreground">Senha<Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={72} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="mt-1" /></label>}
        {error && <p className="text-sm text-destructive">{error}</p>}
        {info && <p className="rounded-md bg-primary-soft p-3 text-sm text-primary">{info}</p>}
        <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? "Aguarde..." : mode === "signin" ? "Entrar" : mode === "signup" ? "Criar conta" : "Enviar link"}</Button>
        <div className="flex flex-col items-center gap-2 pt-2 text-sm">
          {mode === "signin" && <><button type="button" className="text-primary hover:underline" onClick={() => { setMode("forgot"); setError(""); }}>Esqueci minha senha</button><p className="text-muted-foreground">Ainda não tem conta? <button type="button" className="font-medium text-primary hover:underline" onClick={() => { setMode("signup"); setError(""); setInfo(""); }}>Criar conta</button></p></>}
          {mode !== "signin" && <button type="button" className="text-primary hover:underline" onClick={() => { setMode("signin"); setError(""); }}>Voltar para entrar</button>}
        </div>
      </form>
    </div>
  </div>;
}
