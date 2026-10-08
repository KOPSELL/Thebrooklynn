import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock } from "lucide-react";

const ADMIN_HASH = "eladmin";

interface AdminLoginProps {
  onAuth: () => void;
}

const AdminLogin = ({ onAuth }: AdminLoginProps) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === ADMIN_HASH) {
      sessionStorage.setItem("the_brooklyn_admin", "1");
      onAuth();
    } else {
      setError(true);
      setPassword("");
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-6 text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
          <Lock className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gold-gradient">Área Restrita</h1>
          <p className="text-sm text-muted-foreground mt-1">Digite a senha para acessar</p>
        </div>
        <div className="space-y-3">
          <Input
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError(false); }}
            className="h-12 bg-secondary border-border text-center text-lg tracking-widest"
            maxLength={50}
            autoFocus
          />
          {error && <p className="text-sm text-destructive">Senha incorreta</p>}
          <Button
            type="submit"
            className="w-full h-12 bg-gold-gradient text-primary-foreground font-semibold"
            disabled={!password.trim()}
          >
            Entrar
          </Button>
        </div>
      </form>
    </div>
  );
};

export default AdminLogin;
