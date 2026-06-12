// Copyright (c) 2026 Skuld, LLC. All rights reserved.
// Proprietary and confidential. Reverse engineering prohibited.

import {
  Play,
  Square,
  Download,
  Save,
  Package,
  Loader2,
  Undo,
  Redo,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useProjectStore } from "../store/projectStore";
import { useTabsStore } from "../store/tabsStore";
import { useFlowStore, FormTriggerConfig } from "../store/flowStore";
import { useHistoryStore } from "../store/historyStore";
import { useToastStore } from "../store/toastStore";
import { useLogsStore } from "../store/logsStore";
import { useDebugStore } from "../store/debugStore";
import { SkuldLogoBox } from "./ui/SkuldLogo";
import { Button } from "./ui/Button";
import FormTriggerModal from "./FormTriggerModal";
import { DSLNode } from "../types/flow";
import { buildExecutionDSL } from "../lib/dsl";
import { verifyStudioPublishPackage } from "../lib/studioPublishClient";
import {
  getSchemaCandidateFromNodeData,
  parseNodeRuntimeTelemetryLine,
} from "../utils/nodeRuntimeTelemetry";
import { PublishGatePanel } from "./publish/PublishGatePanel";
import type { StudioPublishGateReadModel } from "../types/publish-gate";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/Input";

export default function ProjectToolbar() {
  const { project, activeBotId, saveBot, getActiveBot, updateActiveBotNodes, updateActiveBotEdges } = useProjectStore();
  const { tabs, setTabDirty } = useTabsStore();
  useFlowStore(); // Keep store reference for potential future use
  const { undo, redo, canUndo, canRedo } = useHistoryStore();
  const toast = useToastStore();
  const logs = useLogsStore();
  const { stopDebug, state: debugState } = useDebugStore();

  const [isCompiling, setIsCompiling] = useState(false);
  const [isRunning, setIsRunning] = useState(false);

  // Check if any execution is running
  const isExecutionRunning = isRunning || debugState === "running";
  const [isSaving, setIsSaving] = useState(false);
  const [showFormModal, setShowFormModal] = useState(false);
  const [formConfig, setFormConfig] = useState<FormTriggerConfig | null>(null);
  const [showPublishGate, setShowPublishGate] = useState(false);
  const [isVerifyingPublish, setIsVerifyingPublish] = useState(false);
  const [orchestratorUrl, setOrchestratorUrl] = useState("");
  const [orchestratorToken, setOrchestratorToken] = useState("");
  const [publishGateModel, setPublishGateModel] =
    useState<StudioPublishGateReadModel | null>(null);
  const [publishVerifyError, setPublishVerifyError] = useState<string | null>(
    null,
  );

  const activeBot = getActiveBot();
  const activeTab = tabs.find((t) => t.botId === activeBotId);
  const hasNodes = (activeBot?.nodes.length || 0) > 0;
  const isDirty = activeTab?.isDirty || false;

  const buildDslForActiveBot = () => {
    if (!activeBot) return null;

    const dsl = buildExecutionDSL(
      { id: activeBot.id, name: activeBot.name, description: activeBot.description },
      activeBot.nodes,
      activeBot.edges
    );

    const hasTrigger = activeBot.nodes.some(
      (n) => n.data.category === "trigger"
    );

    if (!hasTrigger) {
      const manualTriggerId = `trigger-manual-${Date.now()}`;
      const firstNodeId = dsl.nodes[0]?.id;

      const manualTriggerNode: DSLNode = {
        id: manualTriggerId,
        type: "trigger.manual",
        config: {},
        outputs: {
          success: firstNodeId || "END",
          error: "END",
        },
        label: "Manual Trigger",
      };

      dsl.nodes.unshift(manualTriggerNode);
      dsl.triggers = [manualTriggerId];
      dsl.start_node = manualTriggerId;
    }

    return dsl;
  };

  // Handle undo
  const handleUndo = () => {
    if (!canUndo()) return;
    const previousState = undo();
    if (previousState) {
      updateActiveBotNodes(previousState.nodes);
      updateActiveBotEdges(previousState.edges);
      if (activeBotId) {
        setTabDirty(`bot-${activeBotId}`, true);
      }
    }
  };

  // Handle redo
  const handleRedo = () => {
    if (!canRedo()) return;
    const nextState = redo();
    if (nextState) {
      updateActiveBotNodes(nextState.nodes);
      updateActiveBotEdges(nextState.edges);
      if (activeBotId) {
        setTabDirty(`bot-${activeBotId}`, true);
      }
    }
  };

  // Handle stop execution - uses the debugStore's stopDebug which handles everything
  const handleStop = async () => {
    logs.info("Stopping execution...");

    // IMMEDIATELY reset local running state so Run button becomes enabled
    setIsRunning(false);

    try {
      // Stop both regular bot and debug processes via Tauri
      await Promise.all([
        invoke("stop_bot").catch((e) => console.log("stop_bot error:", e)),
        invoke("debug_stop").catch((e) => console.log("debug_stop error:", e)),
      ]);

      // Also call the store's stopDebug to reset UI state
      await stopDebug();

      logs.success("Execution stopped");
      toast.info("Execution stopped");
    } catch (error) {
      logs.error("Failed to stop execution", String(error));
      // Even on error, ensure we can run again
      setIsRunning(false);
    }
  };

  // Check if bot requires form input
  const requiresFormInput = () => {
    if (!activeBot) return false;
    return activeBot.nodes.some((n) => n.data.nodeType === "trigger.form");
  };

  // Get form trigger config
  const getFormTriggerConfig = (): FormTriggerConfig | null => {
    if (!activeBot) return null;
    const formTrigger = activeBot.nodes.find(
      (n) => n.data.nodeType === "trigger.form"
    );
    if (!formTrigger) return null;

    const config = formTrigger.data.config || {};
    return {
      formTitle: config.formTitle || "Form Input",
      formDescription: config.formDescription || "",
      submitButtonLabel: config.submitButtonLabel || "Run Bot",
      fields: config.fields || [],
    };
  };

  const handleSave = async () => {
    if (!activeBotId) return;

    setIsSaving(true);
    try {
      await saveBot(activeBotId);
      setTabDirty(`bot-${activeBotId}`, false);
      // Note: saveBot already shows a toast, no need to show another one
    } catch (error) {
      toast.error("Save failed", String(error));
    } finally {
      setIsSaving(false);
    }
  };

  const handleCompile = async () => {
    if (!activeBot || !hasNodes) return;

    setIsCompiling(true);
    logs.info("Starting compilation...");
    logs.openPanel();

    try {
      // Generate DSL with auto-trigger if needed
      const dsl = buildExecutionDSL(
        { id: activeBot.id, name: activeBot.name, description: activeBot.description },
        activeBot.nodes,
        activeBot.edges
      );

      // Auto-add manual trigger if none exists
      const hasTrigger = activeBot.nodes.some(
        (n) => n.data.category === "trigger"
      );

      if (!hasTrigger) {
        const manualTriggerId = `trigger-manual-${Date.now()}`;
        const firstNodeId = dsl.nodes[0]?.id;

        const manualTriggerNode: DSLNode = {
          id: manualTriggerId,
          type: "trigger.manual",
          config: {},
          outputs: {
            success: firstNodeId || "END",
            error: "END",
          },
          label: "Manual Trigger",
        };

        dsl.nodes.unshift(manualTriggerNode);
        dsl.triggers = [manualTriggerId];
        dsl.start_node = manualTriggerId;

        logs.info("Auto-added Manual Trigger");
      }

      const result = await invoke<{ success: boolean; message: string; bot_path?: string }>(
        "compile_dsl",
        { dsl: JSON.stringify(dsl) }
      );

      logs.success("Bot compiled successfully", result.bot_path);
      toast.success("Bot compiled", "Package generated");
    } catch (error) {
      logs.error("Compilation error", String(error));
      toast.error("Compilation failed", String(error).substring(0, 100));
    } finally {
      setIsCompiling(false);
    }
  };

  const handleVerifyPublish = async () => {
    if (!activeBot || !hasNodes) return;

    if (!orchestratorUrl.trim() || !orchestratorToken.trim()) {
      setPublishVerifyError("Orchestrator URL and access token are required.");
      return;
    }

    const dsl = buildDslForActiveBot();
    if (!dsl) return;

    setIsVerifyingPublish(true);
    setPublishVerifyError(null);
    logs.info("Verifying publish package against Orchestrator...");

    try {
      const model = await verifyStudioPublishPackage(
        {
          orchestratorUrl,
          accessToken: orchestratorToken,
        },
        {
          bot: {
            id: activeBot.id,
            name: activeBot.name,
            description: activeBot.description,
          },
          dsl: dsl as unknown as Record<string, unknown>,
          nodes: activeBot.nodes,
          edges: activeBot.edges,
        },
      );
      setPublishGateModel(model);
      if (model.canPublish) {
        toast.success("Publish gate verified");
      } else {
        toast.warning("Publish gate blocked");
      }
    } catch (error) {
      const message = String(error).substring(0, 300);
      setPublishVerifyError(message);
      toast.error("Publish verify failed", message);
    } finally {
      setIsVerifyingPublish(false);
    }
  };

  const handleRun = async (formData?: Record<string, any>) => {
    if (!activeBot || !hasNodes) return;

    // Check for form trigger
    if (!formData && requiresFormInput()) {
      const config = getFormTriggerConfig();
      if (config) {
        setFormConfig(config);
        setShowFormModal(true);
        return;
      }
    }

    setIsRunning(true);
    logs.info("Starting bot execution...");
    logs.openPanel();

    try {
      // Generate DSL from project store's active bot
      const dsl = buildExecutionDSL(
        { id: activeBot.id, name: activeBot.name, description: activeBot.description },
        activeBot.nodes,
        activeBot.edges
      );

      // Auto-add manual trigger if none exists
      const hasTrigger = activeBot.nodes.some(
        (n) => n.data.category === "trigger"
      );

      if (!hasTrigger) {
        const manualTriggerId = `trigger-manual-${Date.now()}`;
        const firstNodeId = dsl.nodes[0]?.id;

        const manualTriggerNode: DSLNode = {
          id: manualTriggerId,
          type: "trigger.manual",
          config: {},
          outputs: {
            success: firstNodeId || "END",
            error: "END",
          },
          label: "Manual Trigger",
        };

        dsl.nodes.unshift(manualTriggerNode);
        dsl.triggers = [manualTriggerId];
        dsl.start_node = manualTriggerId;
      }

      // Add form data to DSL if provided
      if (formData && Object.keys(formData).length > 0) {
        dsl.variables = {
          ...dsl.variables,
          formData: {
            type: "json",
            value: formData,
          },
        };
        logs.info("Form data received", JSON.stringify(formData));
      }

      const result = await invoke<{ success: boolean; message: string; output?: string; logs?: string[] }>(
        "run_bot",
        { dsl: JSON.stringify(dsl) }
      );

      // Get debug store for storing execution results
      const debugStore = useDebugStore.getState();

      // Parse and show logs, capture runtime telemetry for schema discovery
      if (result.logs && Array.isArray(result.logs)) {
        result.logs.forEach((log: string) => {
          const runtimeTelemetry = parseNodeRuntimeTelemetryLine(log);
          if (runtimeTelemetry?.nodeId) {
            const { nodeId, data, channel } = runtimeTelemetry;
            if (channel === "input") {
              debugStore.markNodeInput(nodeId, data);
              return;
            }
            debugStore.markNodeStatus(nodeId, "success", data);
            const flowNode = activeBot.nodes.find((n) => n.id === nodeId);
            const schemaCandidate = getSchemaCandidateFromNodeData(data);
            if (flowNode && schemaCandidate && typeof schemaCandidate === "object") {
              debugStore.discoverSchema(nodeId, flowNode.data.nodeType, schemaCandidate);
            }
            return;
          }

          if (log.includes("ERROR")) {
            logs.error(log);
          } else if (log.includes("WARNING")) {
            logs.warning(log);
          } else if (log.includes("SUCCESS")) {
            logs.success(log);
          } else {
            logs.info(log);
          }
        });
      }

      if (result.success) {
        logs.success("Bot executed successfully");
        toast.success("Execution successful");
      } else {
        logs.error("Bot failed during execution");
        toast.error("Execution failed", "Check logs for details");
      }
    } catch (error) {
      logs.error("Execution error", String(error));
      toast.error("Execution failed", String(error).substring(0, 100));
    } finally {
      setIsRunning(false);
      setShowFormModal(false);
    }
  };

  const handleExportDSL = () => {
    if (!activeBot || !hasNodes) return;

    const dsl = buildExecutionDSL(
      { id: activeBot.id, name: activeBot.name, description: activeBot.description },
      activeBot.nodes,
      activeBot.edges
    );

    const blob = new Blob([JSON.stringify(dsl, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeBot.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast.success("DSL exported");
  };

  return (
    <header className="h-12 bg-white border-b border-slate-200 flex items-center justify-between px-4 flex-shrink-0">
      {/* Left: Logo & Project Name */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <SkuldLogoBox size="sm" />
          <div>
            <span className="text-sm font-semibold text-slate-700 leading-tight block">
              {project?.project.name || <>SkuldBot<sup className="text-[8px] font-normal align-super ml-0.5">TM</sup></>}
            </span>
            <span className="text-[10px] text-slate-400 -mt-0.5 block">Automation Designer</span>
          </div>
        </div>

        {activeBot && (
          <>
            <div className="w-px h-5 bg-slate-200" />
            <span className="text-sm text-slate-600">
              {activeBot.name}
              {isDirty && <span className="text-primary-500 ml-1">*</span>}
            </span>
          </>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1">
        {/* Save */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSave}
          disabled={!isDirty || isSaving}
          title="Save (Ctrl+S)"
          className="text-slate-500 hover:text-slate-700"
        >
          {isSaving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span className="ml-1">Save</span>
        </Button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Build */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCompile}
          disabled={isCompiling || !hasNodes}
          title="Build"
          className="text-slate-500 hover:text-slate-700"
        >
          {isCompiling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Package className="h-4 w-4" />
          )}
          <span className="ml-1">Build</span>
        </Button>

        {/* Publish verify */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowPublishGate(true)}
          disabled={!hasNodes}
          title="Verify publish gate"
          className="text-slate-500 hover:text-slate-700"
        >
          <ShieldCheck className="h-4 w-4" />
          <span className="ml-1">Publish</span>
        </Button>

        {/* Run */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRun()}
          disabled={isRunning || !hasNodes}
          title="Run"
          className="text-slate-500 hover:text-slate-700"
        >
          {isRunning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          <span className="ml-1">Run</span>
        </Button>

        {/* Stop - shows animated when execution is running */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleStop}
          title="Stop execution"
          className={isExecutionRunning
            ? "text-red-600 bg-red-100 hover:bg-red-200 animate-pulse"
            : "text-red-500 hover:text-red-700 hover:bg-red-50"
          }
        >
          <Square className="h-4 w-4" fill={isExecutionRunning ? "currentColor" : "none"} />
          <span className="ml-1">Stop</span>
        </Button>

        <div className="w-px h-5 bg-slate-200 mx-1" />

        {/* Export */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleExportDSL}
          disabled={!hasNodes}
          title="Export DSL"
        >
          <Download className="h-4 w-4" />
        </Button>

        {/* Undo/Redo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={handleUndo}
          disabled={!canUndo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleRedo}
          disabled={!canRedo()}
          title="Redo (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>

      {/* Form Trigger Modal */}
      {formConfig && (
        <FormTriggerModal
          isOpen={showFormModal}
          onClose={() => setShowFormModal(false)}
          onSubmit={handleRun}
          isLoading={isRunning}
          formConfig={{
            title: formConfig.formTitle,
            description: formConfig.formDescription,
            fields: formConfig.fields,
            submitButtonLabel: formConfig.submitButtonLabel,
          }}
        />
      )}

      <Dialog open={showPublishGate} onOpenChange={setShowPublishGate}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish gate</DialogTitle>
            <DialogDescription>
              Verify the active bot package against an Orchestrator before publish.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Input
              value={orchestratorUrl}
              onChange={(event) => setOrchestratorUrl(event.target.value)}
              placeholder="https://orchestrator.example.com/api"
              autoComplete="off"
            />
            <Input
              value={orchestratorToken}
              onChange={(event) => setOrchestratorToken(event.target.value)}
              placeholder="Access token"
              type="password"
              autoComplete="off"
            />
            <Button
              onClick={handleVerifyPublish}
              disabled={isVerifyingPublish || !activeBot || !hasNodes}
            >
              {isVerifyingPublish ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ShieldCheck className="mr-2 h-4 w-4" />
              )}
              Verify
            </Button>
          </div>

          {publishVerifyError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {publishVerifyError}
            </div>
          )}

          {publishGateModel && <PublishGatePanel model={publishGateModel} />}
        </DialogContent>
      </Dialog>
    </header>
  );
}
