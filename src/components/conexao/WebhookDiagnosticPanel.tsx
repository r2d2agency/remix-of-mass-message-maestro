import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { toast } from "sonner";
import {
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Link,
  Server,
  Webhook,
  MessageSquare,
  Trash2,
  ExternalLink,
  Copy,
  Play,
} from "lucide-react";

interface Connection {
  id: string;
  name: string;
  instance_name: string;
  status: string;
  phone_number?: string;
}

interface DiagnosticResult {
  connection: {
    id: string;
    name: string;
    instanceName: string;
    status: string;
    webhookUrl: string | null;
  };
  evolutionApi: {
    configured: boolean;
    url: string;
  };
  webhookBase: {
    configured: boolean;
    url: string;
    expectedEndpoint: string;
  };
  lastWebhookReceived: {
    at: string;
    event: string | null;
    dataKeys: string[];
  } | null;
  evolutionWebhook: {
    url: string | null;
    enabled: boolean;
    events: string[];
    webhookBase64: boolean | null;
  } | null;
  instanceStatus: {
    state: string;
    phoneNumber: string | null;
  } | null;
  webhookReachability?: {
    url: string;
    reachable: boolean;
    status?: number;
    error?: string;
  };
  healthy: boolean;
  errors: string[];
}

interface WebhookEvent {
  at: string;
  instanceName: string | null;
  event: string | null;
  normalizedEvent: string | null;
  headers: Record<string, string>;
  preview: string;
}

interface Props {
  connection: Connection;
  onClose?: () => void;
}

export function WebhookDiagnosticPanel({ connection, onClose }: Props) {
  const [loading, setLoading] = useState(true);
  const [reconfiguring, setReconfiguring] = useState(false);
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null);
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);

  const fetchDiagnostic = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api<DiagnosticResult>(`/api/evolution/${connection.id}/webhook-diagnostic`);
      setDiagnostic(result);
    } catch (error: any) {
      toast.error(error.message || "Erro ao carregar diagnóstico");
    } finally {
      setLoading(false);
    }
  }, [connection.id]);

  const fetchEvents = useCallback(async () => {
    setEventsLoading(true);
    try {
      const result = await api<{ events: WebhookEvent[] }>(`/api/evolution/${connection.id}/webhook-events?limit=100`);
      setEvents(result.events || []);
    } catch (error: any) {
      console.error("Error fetching events:", error);
    } finally {
      setEventsLoading(false);
    }
  }, [connection.id]);

  const handleReconfigure = async () => {
    setReconfiguring(true);
    try {
      await api(`/api/evolution/${connection.id}/reconfigure-webhook`, { method: "POST" });
      toast.success("Webhook reconfigurado com sucesso!");
      await fetchDiagnostic();
    } catch (error: any) {
      toast.error(error.message || "Erro ao reconfigurar");
    } finally {
      setReconfiguring(false);
    }
  };

  const handleClearEvents = async () => {
    try {
      await api(`/api/evolution/${connection.id}/webhook-events`, { method: "DELETE" });
      setEvents([]);
      toast.success("Eventos limpos");
    } catch (error: any) {
      toast.error(error.message || "Erro ao limpar eventos");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado!");
  };

  useEffect(() => {
    fetchDiagnostic();
    fetchEvents();
  }, [fetchDiagnostic, fetchEvents]);

  // Auto-refresh events every 3 seconds
  useEffect(() => {
    const interval = setInterval(fetchEvents, 3000);
    return () => clearInterval(interval);
  }, [fetchEvents]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-destructive" />
    );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Diagnóstico: {connection.name}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Instância: <code className="text-xs bg-muted px-1 py-0.5 rounded">{connection.instance_name}</code>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchDiagnostic} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
          {onClose && (
            <Button variant="ghost" size="sm" onClick={onClose}>
              Fechar
            </Button>
          )}
        </div>
      </div>

      {/* Health Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            {diagnostic?.healthy ? (
              <Badge variant="default" className="bg-green-500">
                <CheckCircle className="h-3 w-3 mr-1" />
                Saudável
              </Badge>
            ) : (
              <Badge variant="destructive">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Problemas Detectados
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        {diagnostic?.errors && diagnostic.errors.length > 0 && (
          <CardContent className="pt-0">
            <div className="space-y-2">
              {diagnostic.errors.map((err, i) => (
                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{err}</span>
                </div>
              ))}
            </div>
            <Button 
              onClick={handleReconfigure} 
              disabled={reconfiguring} 
              className="mt-4"
              variant="default"
            >
              {reconfiguring ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Reconfigurando...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Reconfigurar Webhook
                </>
              )}
            </Button>
          </CardContent>
        )}
      </Card>

      <Tabs defaultValue="status" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="config">Configuração</TabsTrigger>
          <TabsTrigger value="events" className="relative">
            Eventos
            {events.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 min-w-5 text-xs">
                {events.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Status Tab */}
        <TabsContent value="status" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4" />
                Estado da Instância
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Estado:</span>
                  <Badge
                    variant={diagnostic?.instanceStatus?.state === "open" ? "default" : "outline"}
                    className={`ml-2 ${diagnostic?.instanceStatus?.state === "open" ? "bg-green-500" : ""}`}
                  >
                    {diagnostic?.instanceStatus?.state || "Desconhecido"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Telefone:</span>
                  <span className="ml-2">{diagnostic?.instanceStatus?.phoneNumber || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Status DB:</span>
                  <span className="ml-2">{diagnostic?.connection.status || "—"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Último Evento Recebido
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnostic?.lastWebhookReceived ? (
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Horário:</span>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {new Date(diagnostic.lastWebhookReceived.at).toLocaleString()}
                    </code>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Evento:</span>
                    <Badge variant="secondary">{diagnostic.lastWebhookReceived.event || "—"}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Campos:</span>
                    <span className="ml-2 text-xs">
                      {diagnostic.lastWebhookReceived.dataKeys.join(", ") || "—"}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Nenhum evento recebido ainda. Envie uma mensagem para testar.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Link className="h-4 w-4" />
                Alcançabilidade
              </CardTitle>
            </CardHeader>
            <CardContent>
              {diagnostic?.webhookReachability ? (
                <div className="flex items-center gap-2 text-sm">
                  <StatusIcon ok={diagnostic.webhookReachability.reachable} />
                  <span>
                    {diagnostic.webhookReachability.reachable
                      ? `Acessível (HTTP ${diagnostic.webhookReachability.status})`
                      : `Inacessível: ${diagnostic.webhookReachability.error || "Erro desconhecido"}`}
                  </span>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Teste não realizado</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Config Tab */}
        <TabsContent value="config" className="space-y-4 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Webhook className="h-4 w-4" />
                Configuração do Webhook na Evolution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <StatusIcon ok={!!diagnostic?.evolutionWebhook?.url} />
                  <span className="text-muted-foreground">URL:</span>
                  {diagnostic?.evolutionWebhook?.url ? (
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      <code className="text-xs bg-muted px-1 py-0.5 rounded truncate flex-1">
                        {diagnostic.evolutionWebhook.url}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                        onClick={() => copyToClipboard(diagnostic.evolutionWebhook!.url!)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-destructive">Não configurado</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon ok={diagnostic?.evolutionWebhook?.enabled !== false} />
                  <span className="text-muted-foreground">Habilitado:</span>
                  <span>{diagnostic?.evolutionWebhook?.enabled !== false ? "Sim" : "Não"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <StatusIcon ok={diagnostic?.evolutionWebhook?.webhookBase64 === false} />
                  <span className="text-muted-foreground">Base64:</span>
                  <span className={diagnostic?.evolutionWebhook?.webhookBase64 ? "text-yellow-500" : ""}>
                    {diagnostic?.evolutionWebhook?.webhookBase64 ? "Ativado (não recomendado)" : "Desativado ✓"}
                  </span>
                </div>
              </div>

              <Separator />

              <div>
                <span className="text-sm text-muted-foreground">Eventos configurados:</span>
                <div className="flex flex-wrap gap-1 mt-2">
                  {diagnostic?.evolutionWebhook?.events?.length ? (
                    diagnostic.evolutionWebhook.events.map((ev, i) => (
                      <Badge
                        key={i}
                        variant={ev.toLowerCase().includes("messages") ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {ev}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-destructive">Nenhum evento configurado</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Server className="h-4 w-4" />
                Configuração do Backend
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <StatusIcon ok={diagnostic?.evolutionApi?.configured || false} />
                <span className="text-muted-foreground">Evolution API:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {diagnostic?.evolutionApi?.url || "NÃO CONFIGURADO"}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <StatusIcon ok={diagnostic?.webhookBase?.configured || false} />
                <span className="text-muted-foreground">Webhook Base URL:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {diagnostic?.webhookBase?.url || "NÃO CONFIGURADO"}
                </code>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Endpoint esperado:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">
                  {diagnostic?.webhookBase?.expectedEndpoint || "—"}
                </code>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Events Tab */}
        <TabsContent value="events" className="space-y-4 mt-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Últimos eventos recebidos (atualização automática a cada 3s)
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchEvents} disabled={eventsLoading}>
                {eventsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button variant="destructive" size="sm" onClick={handleClearEvents}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <ScrollArea className="h-[400px] rounded-md border">
            <div className="p-3 space-y-3">
              {events.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Nenhum evento recebido ainda.</p>
                  <p className="text-xs mt-1">Envie uma mensagem no WhatsApp para testar.</p>
                </div>
              ) : (
                events.map((ev, idx) => (
                  <Card key={idx} className="border-border">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <Badge
                          variant={
                            ev.normalizedEvent?.includes("messages.upsert")
                              ? "default"
                              : ev.normalizedEvent?.includes("connection")
                              ? "secondary"
                              : "outline"
                          }
                        >
                          {ev.normalizedEvent || ev.event || "evento"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ev.at).toLocaleString()}
                        </span>
                      </div>
                      {ev.preview && (
                        <ScrollArea className="h-24">
                          <pre className="text-xs text-foreground/80 whitespace-pre-wrap break-all">
                            {ev.preview.length > 500 ? ev.preview.substring(0, 500) + "..." : ev.preview}
                          </pre>
                        </ScrollArea>
                      )}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
