import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  RefreshCw, Clock, CheckCircle, AlertCircle, Calendar, 
  Play, Loader2, Settings2, Sun, Moon, Zap
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { api } from "@/lib/api";
import { toast } from "sonner";

interface AutoSyncSettings {
  auto_sync_enabled: boolean;
  sync_time_morning: string;
  check_time_morning: string;
  last_sync_at: string | null;
  last_check_at: string | null;
}

interface SyncResult {
  success: boolean;
  synced_count?: number;
  checked_count?: number;
  updated_count?: number;
  message?: string;
  error?: string;
}

interface SyncStatusPanelProps {
  organizationId: string;
  onSyncComplete?: () => void;
}

export default function SyncStatusPanel({ organizationId, onSyncComplete }: SyncStatusPanelProps) {
  const [settings, setSettings] = useState<AutoSyncSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncMessage, setSyncMessage] = useState("");

  const loadSettings = useCallback(async () => {
    try {
      const data = await api<AutoSyncSettings>(`/api/asaas/auto-sync/${organizationId}`);
      setSettings(data);
    } catch (err) {
      console.error("Error loading auto-sync settings:", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleToggleAutoSync = async () => {
    if (!settings) return;
    
    try {
      const updated = await api<AutoSyncSettings>(`/api/asaas/auto-sync/${organizationId}`, {
        method: "PATCH",
        body: { auto_sync_enabled: !settings.auto_sync_enabled }
      });
      setSettings(updated);
      toast.success(updated.auto_sync_enabled ? "Sincronização automática ativada" : "Sincronização automática desativada");
    } catch (err) {
      toast.error("Erro ao atualizar configurações");
    }
  };

  const handleSyncNow = async () => {
    setSyncing(true);
    setSyncProgress(10);
    setSyncMessage("Iniciando sincronização...");
    
    try {
      setSyncProgress(30);
      setSyncMessage("Buscando boletos no Asaas...");
      
      const result = await api<SyncResult>(`/api/asaas/auto-sync/${organizationId}/sync-now`, {
        method: "POST"
      });
      
      setSyncProgress(100);
      
      if (result.success) {
        setSyncMessage(`✓ ${result.synced_count || 0} boletos sincronizados`);
        toast.success(result.message || "Sincronização concluída!");
        await loadSettings();
        onSyncComplete?.();
      } else {
        setSyncMessage(`✗ ${result.error || "Erro na sincronização"}`);
        toast.error(result.error || "Erro na sincronização");
      }
    } catch (err: any) {
      setSyncProgress(0);
      setSyncMessage("");
      toast.error(err.message || "Erro ao sincronizar");
    } finally {
      setSyncing(false);
      setTimeout(() => {
        setSyncProgress(0);
        setSyncMessage("");
      }, 3000);
    }
  };

  const handleCheckStatus = async () => {
    setChecking(true);
    setSyncProgress(10);
    setSyncMessage("Verificando pagamentos...");
    
    try {
      setSyncProgress(50);
      setSyncMessage("Consultando status no Asaas...");
      
      const result = await api<SyncResult>(`/api/asaas/auto-sync/${organizationId}/check-status`, {
        method: "POST"
      });
      
      setSyncProgress(100);
      
      if (result.success) {
        setSyncMessage(`✓ ${result.checked_count || 0} verificados, ${result.updated_count || 0} atualizados`);
        toast.success(result.message || "Verificação concluída!");
        await loadSettings();
        onSyncComplete?.();
      } else {
        setSyncMessage(`✗ ${result.error || "Erro na verificação"}`);
        toast.error(result.error || "Erro na verificação");
      }
    } catch (err: any) {
      setSyncProgress(0);
      setSyncMessage("");
      toast.error(err.message || "Erro ao verificar status");
    } finally {
      setChecking(false);
      setTimeout(() => {
        setSyncProgress(0);
        setSyncMessage("");
      }, 3000);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isProcessing = syncing || checking;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <RefreshCw className="h-5 w-5 text-primary" />
              Sincronização Automática
            </CardTitle>
            <CardDescription>
              Sincroniza boletos do Asaas automaticamente todos os dias
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Label htmlFor="auto-sync" className="text-sm">
              {settings?.auto_sync_enabled ? "Ativo" : "Inativo"}
            </Label>
            <Switch 
              id="auto-sync"
              checked={settings?.auto_sync_enabled || false}
              onCheckedChange={handleToggleAutoSync}
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Status atual */}
        <div className="flex items-center gap-4">
          {settings?.auto_sync_enabled ? (
            <Badge variant="outline" className="border-green-500 text-green-600 gap-1">
              <CheckCircle className="h-3 w-3" />
              Sincronização Ativa
            </Badge>
          ) : (
            <Badge variant="outline" className="border-muted-foreground text-muted-foreground gap-1">
              <AlertCircle className="h-3 w-3" />
              Sincronização Desativada
            </Badge>
          )}
        </div>

        {/* Horários programados */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-indigo-500/10">
              <Moon className="h-4 w-4 text-indigo-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Sync Boletos</p>
              <p className="text-xs text-muted-foreground">
                Todo dia às {settings?.sync_time_morning || "02:00"}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <div className="p-2 rounded-full bg-amber-500/10">
              <Sun className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <p className="text-sm font-medium">Verificar Status</p>
              <p className="text-xs text-muted-foreground">
                Todo dia às {settings?.check_time_morning || "08:00"}
              </p>
            </div>
          </div>
        </div>

        {/* Última execução */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="space-y-1">
            <p className="text-muted-foreground">Última sincronização:</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {settings?.last_sync_at 
                ? format(parseISO(settings.last_sync_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                : "Nunca executado"
              }
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-muted-foreground">Última verificação:</p>
            <p className="font-medium flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {settings?.last_check_at 
                ? format(parseISO(settings.last_check_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
                : "Nunca executado"
              }
            </p>
          </div>
        </div>

        <Separator />

        {/* Progresso */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{syncMessage}</span>
              <span className="font-medium">{syncProgress}%</span>
            </div>
            <Progress value={syncProgress} className="h-2" />
          </div>
        )}

        {/* Mensagem de resultado */}
        {!isProcessing && syncMessage && (
          <div className={`p-3 rounded-lg text-sm ${syncMessage.startsWith("✓") ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"}`}>
            {syncMessage}
          </div>
        )}

        {/* Ações manuais */}
        <div className="flex gap-2">
          <Button 
            onClick={handleSyncNow} 
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            {syncing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Zap className="mr-2 h-4 w-4" />
            )}
            {syncing ? "Sincronizando..." : "Sincronizar Agora"}
          </Button>
          
          <Button 
            onClick={handleCheckStatus} 
            disabled={isProcessing}
            variant="outline"
            className="flex-1"
          >
            {checking ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            {checking ? "Verificando..." : "Verificar Pagamentos"}
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground space-y-1 pt-2">
          <p><strong>Sincronizar Agora:</strong> Busca boletos que vencem hoje, amanhã e em atraso (executa o job das 02:00).</p>
          <p><strong>Verificar Pagamentos:</strong> Atualiza status de pagamentos pendentes/vencidos (executa o job das 08:00).</p>
        </div>
      </CardContent>
    </Card>
  );
}