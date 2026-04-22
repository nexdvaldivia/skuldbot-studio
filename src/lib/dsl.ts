/**
 * DSL builder — serializes an in-memory bot graph (nodes + edges) to the
 * canonical DSL JSON shape consumed by the compiler and runtime.
 *
 * Contract: `buildExecutionDSL` returns a `BotDSL` object (defined in
 * `../types/flow`). Callers may mutate the returned object to inject
 * triggers / start_node / variables before passing to the compiler.
 *
 * NOTE: this was a missing module re-introduced in the TS tech debt fix
 * (see docs/STUDIO_TECH_DEBT.md). If a richer canonical builder exists
 * elsewhere, re-point imports and delete this file.
 */

import type { Edge, Node } from "reactflow";
import type { BotDSL, DSLNode, FlowNodeData } from "../types/flow";

export interface BotInfo {
  id: string;
  name: string;
  description?: string | null;
}

/**
 * Build an execution-ready DSL object from the Studio graph state.
 *
 * @param bot    Bot metadata (id, name, description)
 * @param nodes  React Flow nodes with FlowNodeData payload
 * @param edges  React Flow edges (source/target + handle ids)
 */
export function buildExecutionDSL(
  bot: BotInfo,
  nodes: Node<FlowNodeData>[],
  edges: Edge[],
): BotDSL {
  // Index edges by (sourceNodeId, sourceHandleKind) → targetNodeId.
  // Default handle treated as "success" to match node outputs shape.
  const edgeByHandle = new Map<string, string>();
  for (const edge of edges) {
    const handleKind = edge.sourceHandle ?? "success";
    const key = `${edge.source}::${handleKind}`;
    if (!edgeByHandle.has(key)) {
      edgeByHandle.set(key, edge.target);
    }
  }

  const dslNodes: DSLNode[] = nodes.map((node) => ({
    id: node.id,
    type: node.data.nodeType,
    label: node.data.label,
    config: (node.data.config as Record<string, unknown>) ?? {},
    outputs: {
      success: edgeByHandle.get(`${node.id}::success`) ?? "",
      error: edgeByHandle.get(`${node.id}::error`) ?? "",
    },
    position: node.position,
  }));

  return {
    version: "1.0",
    bot: {
      id: bot.id,
      name: bot.name,
      description: bot.description ?? undefined,
    },
    nodes: dslNodes,
    variables: {},
  };
}
