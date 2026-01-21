import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useBranding } from '@/hooks/use-branding';
import { authApi } from '@/lib/api';
import { Loader2, Zap, Check, Wifi, MessageSquare, Users, Receipt, Clock } from 'lucide-react';
import { z } from 'zod';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
  name: z.string().trim().min(2, { message: 'Nome deve ter no mínimo 2 caracteres' }).max(100),
  email: z.string().trim().email({ message: 'Email inválido' }).max(255),
  password: z.string().min(6, { message: 'Senha deve ter no mínimo 6 caracteres' }),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

interface Plan {
  id: string;
  name: string;
  description: string | null;
  max_connections: number;
  max_monthly_messages: number;
  max_users: number;
  price: number;
  billing_period: string;
  trial_days: number;
  has_chat: boolean;
  has_campaigns: boolean;
  has_asaas_integration: boolean;
}

const Cadastro = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const { register } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { branding } = useBranding();

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      const data = await authApi.getSignupPlans();
      setPlans(data);
      // Auto-select first plan if only one available
      if (data.length === 1) {
        setSelectedPlan(data[0].id);
      }
    } catch (error) {
      console.error('Failed to load plans:', error);
    } finally {
      setLoadingPlans(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const result = registerSchema.safeParse({ name, email, password, confirmPassword });
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        fieldErrors[field] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    if (plans.length > 0 && !selectedPlan) {
      toast({
        title: 'Selecione um plano',
        description: 'Escolha um plano para começar seu período de teste',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      await register(email, password, name, selectedPlan || undefined);
      navigate('/');
    } catch (error) {
      toast({
        title: 'Erro ao criar conta',
        description: error instanceof Error ? error.message : 'Tente novamente',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const selectedPlanData = plans.find(p => p.id === selectedPlan);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-8">
      <div className="w-full max-w-4xl space-y-6">
        <Card className="shadow-neon">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              {branding.logo_login ? (
                <img src={branding.logo_login} alt="Logo" className="h-16 max-w-[200px] object-contain" />
              ) : (
                <div className="gradient-primary p-3 rounded-full neon-glow">
                  <Zap className="h-8 w-8 text-primary-foreground" />
                </div>
              )}
            </div>
            <CardTitle className="text-2xl neon-text">Criar Conta</CardTitle>
            <CardDescription>Preencha seus dados para começar</CardDescription>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6">
              {/* Plan Selection */}
              {loadingPlans ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : plans.length > 0 && (
                <div className="space-y-3">
                  <Label className="text-base font-semibold">Escolha seu plano</Label>
                  <p className="text-sm text-muted-foreground">
                    Todos os planos incluem período de teste gratuito
                  </p>
                  <div className={cn(
                    "grid gap-4",
                    plans.length === 1 ? "grid-cols-1" : 
                    plans.length === 2 ? "grid-cols-1 md:grid-cols-2" :
                    "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                  )}>
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        onClick={() => setSelectedPlan(plan.id)}
                        className={cn(
                          "relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:border-primary/50",
                          selectedPlan === plan.id 
                            ? "border-primary bg-primary/5 shadow-md" 
                            : "border-muted hover:bg-muted/50"
                        )}
                      >
                        {selectedPlan === plan.id && (
                          <div className="absolute -top-2 -right-2 rounded-full bg-primary p-1">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="font-semibold">{plan.name}</h3>
                              {plan.description && (
                                <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                              )}
                            </div>
                            <Badge variant="secondary" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {plan.trial_days} dias grátis
                            </Badge>
                          </div>
                          
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-primary">
                              R$ {Number(plan.price).toFixed(2)}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              /{plan.billing_period === 'monthly' ? 'mês' : 'ano'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Wifi className="h-3 w-3" />
                              <span>{plan.max_connections} conexões</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              <span>{plan.max_monthly_messages.toLocaleString()} msgs</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              <span>{plan.max_users} usuários</span>
                            </div>
                            {plan.has_asaas_integration && (
                              <div className="flex items-center gap-1">
                                <Receipt className="h-3 w-3" />
                                <span>Cobrança</span>
                              </div>
                            )}
                          </div>

                          <div className="flex flex-wrap gap-1">
                            {plan.has_chat && (
                              <Badge variant="outline" className="text-xs">Chat</Badge>
                            )}
                            {plan.has_campaigns && (
                              <Badge variant="outline" className="text-xs">Campanhas</Badge>
                            )}
                            {plan.has_asaas_integration && (
                              <Badge variant="outline" className="text-xs">Asaas</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* User Info */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    disabled={isLoading}
                  />
                  {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                  {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                  />
                  {errors.confirmPassword && <p className="text-sm text-destructive">{errors.confirmPassword}</p>}
                </div>
              </div>

              {/* Trial info */}
              {selectedPlanData && (
                <div className="rounded-lg bg-success/10 border border-success/30 p-4 text-center">
                  <p className="text-sm font-medium text-success">
                    🎉 Você terá <strong>{selectedPlanData.trial_days} dias grátis</strong> para testar o plano {selectedPlanData.name}!
                  </p>
                </div>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {selectedPlanData ? `Começar ${selectedPlanData.trial_days} dias grátis` : 'Criar Conta'}
              </Button>
              <p className="text-sm text-muted-foreground text-center">
                Já tem uma conta?{' '}
                <Link to="/login" className="text-primary hover:underline">
                  Entrar
                </Link>
              </p>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Cadastro;