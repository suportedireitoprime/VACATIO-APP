import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error("404 Error: rota inexistente:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-background px-6 text-center">
      {/* halo dourado sutil ao fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 40%, hsl(var(--primary) / 0.18) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 flex flex-col items-center max-w-md"
      >
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-primary/30 bg-primary/10 shadow-[0_0_40px_-10px_hsl(var(--primary)/0.6)]">
          <span className="font-display text-3xl font-bold text-primary">
            404
          </span>
        </div>

        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-2 tracking-tight">
          Ops, página não encontrada
        </h1>
        <p className="font-body text-muted-foreground text-sm md:text-base mb-8 leading-relaxed">
          O endereço que você tentou acessar não existe ou foi movido.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link
            to="/"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 font-body font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all hover:shadow-primary/50 hover:brightness-105 active:scale-[0.98] w-full sm:w-auto"
          >
            <Home className="h-4 w-4" />
            Retornar ao início
          </Link>
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border bg-secondary/60 px-5 py-3 font-body text-sm text-foreground/80 hover:bg-secondary hover:text-foreground transition-colors w-full sm:w-auto"
          >
            <ArrowLeft className="h-4 w-4" />
            Voltar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
