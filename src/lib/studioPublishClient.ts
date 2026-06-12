// Copyright (c) 2026 Skuld, LLC. All rights reserved.
// Proprietary and confidential. Reverse engineering prohibited.

import { invoke } from "@tauri-apps/api/core";
import type { FlowEdge, FlowNode } from "@/types/flow";
import type { StudioPublishGateReadModel } from "@/types/publish-gate";

export interface StudioPublishConnection {
  orchestratorUrl: string;
  accessToken: string;
}

interface CompileResult {
  success: boolean;
  message: string;
  bot_path?: string;
}

interface CompiledPackageInspection {
  packageId: string;
  fileName: string;
  digest: string;
  sizeBytes: number;
  storageKey: string;
}

interface BotIdentity {
  id: string;
  name: string;
  description?: string;
}

interface StudioPublishVerifyInput {
  bot: BotIdentity;
  dsl: Record<string, unknown>;
  nodes: FlowNode[];
  edges: FlowEdge[];
}

export async function verifyStudioPublishPackage(
  connection: StudioPublishConnection,
  input: StudioPublishVerifyInput,
): Promise<StudioPublishGateReadModel> {
  const compiled = await invoke<CompileResult>("compile_dsl", {
    dsl: JSON.stringify(input.dsl),
  });

  if (!compiled.success || !compiled.bot_path) {
    throw new Error(compiled.message || "Studio compiler did not return a package path");
  }

  const packageInspection = await invoke<CompiledPackageInspection>(
    "inspect_compiled_package",
    { botPath: compiled.bot_path },
  );
  const planHash = await sha256Json(input.dsl);
  const runtime = runtimeRequirements(input.nodes);
  const runtimePlane = runtime.requiresDesktopSession
    ? "windows_interactive"
    : "linux_virtual_display";

  return postStudioPublishVerify(connection, {
    contractVersion: "3.0.0",
    subjectKind: "bot",
    subjectId: input.bot.id,
    version: "1.0.0",
    compiledPackage: packageInspection,
    planHash,
    manifest: {
      planHash,
      compiledPackageDigest: packageInspection.digest,
      runtimePlaneGatePassed: false,
      runnerSelectionContractSigned: false,
    },
    sourceDsl: input.dsl,
    runtimeRequirements: runtime,
    evidenceRequirements: {
      manifestRequired: true,
      providerBacked: true,
    },
    placementHint: {
      mode: "capability_match",
      requiredCapabilities: runtime.requiredCapabilities,
      executionTarget: "runner",
      runtimePlane,
      evidenceRequired: true,
      decisionReason:
        "Studio publish verify uses runner placement until a signed placement contract is selected.",
      immutableSnapshot: true,
    },
  });
}

async function postStudioPublishVerify(
  connection: StudioPublishConnection,
  payload: Record<string, unknown>,
): Promise<StudioPublishGateReadModel> {
  const endpoint = studioPublishVerifyUrl(connection.orchestratorUrl);
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? String((body as { message: unknown }).message)
        : `Studio publish verify failed with HTTP ${response.status}`;
    throw new Error(message);
  }

  return body as StudioPublishGateReadModel;
}

function studioPublishVerifyUrl(orchestratorUrl: string): string {
  const trimmed = orchestratorUrl.trim().replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error("Orchestrator URL is required");
  }
  return trimmed.endsWith("/api")
    ? `${trimmed}/studio/publish/verify`
    : `${trimmed}/api/studio/publish/verify`;
}

function runtimeRequirements(nodes: FlowNode[]) {
  const requiresDesktopSession = nodes.some((node) =>
    matchesAny(node.data.nodeType, ["desktop", "windows", "rdp", "citrix"]),
  );
  const requiresUi = nodes.some((node) =>
    matchesAny(node.data.category ?? "", ["web", "desktop"]),
  );
  const requiredCapabilities = [
    ...(requiresUi ? ["graphical_runtime"] : []),
    ...(requiresDesktopSession ? ["windows_interactive"] : []),
  ];

  return {
    requiresUi,
    requiresDesktopSession,
    requiresCustomerLocalNetwork: requiresDesktopSession,
    requiresCustomerLocalSecrets: false,
    requiredCapabilities,
    graphicalRuntimeRequired: requiresUi,
    serverSideOnly: false,
  };
}

function matchesAny(value: string, needles: string[]): boolean {
  const normalized = value.toLowerCase();
  return needles.some((needle) => normalized.includes(needle));
}

async function sha256Json(value: Record<string, unknown>): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return `sha256:${bytesToHex(new Uint8Array(digest))}`;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
