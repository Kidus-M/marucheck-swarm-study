#!/usr/bin/env node
// MaruCheck CLI - https://github.com/Kidus-M/MaruCheck
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// packages/cli/src/cli.ts
var import_promises18 = require("node:fs/promises");
var import_node_path20 = require("node:path");

// packages/agent/dist/index.js
var import_promises11 = require("node:fs/promises");
var import_node_path13 = require("node:path");

// packages/evidence/dist/index.js
var import_promises10 = require("node:fs/promises");
var import_node_path12 = require("node:path");

// packages/execution/dist/index.js
var import_promises8 = require("node:fs/promises");
var import_node_fs = require("node:fs");
var import_node_path10 = require("node:path");

// packages/planner/dist/index.js
var import_promises6 = require("node:fs/promises");
var import_node_path8 = require("node:path");

// packages/contracts/dist/draft.js
function sentenceList(requirements) {
  return requirements.replace(/^#{1,6}\s+.*$/gmu, "").split(/(?<=[.!?])\s+|\r?\n+/u).map((sentence) => sentence.replace(/^[-*]\s+/u, "").trim()).filter((sentence) => sentence.length >= 8).slice(0, 12);
}
function titleCase(value) {
  return value.split("-").map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(" ");
}
function inferId(requirements) {
  if (/subscription|upgrade|billing|payment|pro users?|free users?/iu.test(requirements)) {
    return "subscription-management";
  }
  if (/auth|sign[ -]?in|login|password|session/iu.test(requirements))
    return "authentication";
  if (/permission|authorization|role|access control/iu.test(requirements))
    return "permissions";
  return "quality-contract";
}
function prefixFor(id) {
  return id.split("-").map((part) => part[0]?.toUpperCase() ?? "").join("").slice(0, 5);
}
function draftQualityContract(requirementsText, options = {}) {
  const sentences = sentenceList(requirementsText);
  if (sentences.length === 0) {
    throw new Error("Requirements must contain at least one meaningful sentence.");
  }
  const id = options.id ?? inferId(requirementsText);
  const prefix = prefixFor(id);
  const requirements = sentences.map((statement, index) => ({
    id: `${prefix}-${String(index + 1).padStart(3, "0")}`,
    statement,
    priority: "required"
  }));
  const invariants = [
    {
      id: `${prefix}-INV-001`,
      statement: /payment|billing|upgrade/iu.test(requirementsText) ? "Client-controlled data must never be accepted as proof of successful payment." : "Authorization and validation must be enforced by a trusted server boundary."
    },
    {
      id: `${prefix}-INV-002`,
      statement: "Retries and duplicate requests must not create contradictory state."
    }
  ];
  return {
    version: 1,
    id,
    title: options.title ?? titleCase(id),
    status: "draft",
    criticality: /payment|billing|security|authorization/iu.test(requirementsText) ? "high" : "medium",
    intent: sentences.join(" "),
    owners: ["product", "engineering"],
    requirements,
    invariants,
    edgeCases: [
      "the operation is retried or submitted concurrently",
      "a dependent service succeeds but local persistence fails"
    ],
    security: [
      /payment|webhook/iu.test(requirementsText) ? "verify payment webhook signatures before changing subscription state" : "enforce authorization and input validation at the server boundary"
    ],
    dataIntegrity: [
      "duplicate or failed operations must not create duplicate or partially committed state"
    ],
    evidencePolicy: {
      blockingRequirements: [requirements[0].id, ...invariants.map((item) => item.id)]
    }
  };
}

// packages/contracts/dist/diff.js
var MECHANICAL_PATHS = /* @__PURE__ */ new Set(["approval", "status", "title"]);
function equal(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}
function change(path, before, after) {
  const semantic = !MECHANICAL_PATHS.has(path.split(".")[0]);
  return {
    kind: before === void 0 ? "added" : after === void 0 ? "removed" : "changed",
    path,
    semantic,
    ...before === void 0 ? {} : { before },
    ...after === void 0 ? {} : { after }
  };
}
function compareValue(path, left, right, changes) {
  if (equal(left, right))
    return;
  if (typeof left === "object" && left !== null && !Array.isArray(left) && typeof right === "object" && right !== null && !Array.isArray(right)) {
    const leftRecord = left;
    const rightRecord = right;
    const keys = [.../* @__PURE__ */ new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])].sort();
    for (const key of keys) {
      compareValue(`${path}.${key}`, leftRecord[key], rightRecord[key], changes);
    }
    return;
  }
  changes.push(change(path, left, right));
}
function compareIdentifiedList(path, left, right, changes) {
  const leftItems = new Map(left.map((item) => [item.id, item]));
  const rightItems = new Map(right.map((item) => [item.id, item]));
  const ids = [.../* @__PURE__ */ new Set([...leftItems.keys(), ...rightItems.keys()])].sort();
  for (const id of ids) {
    const before = leftItems.get(id);
    const after = rightItems.get(id);
    if (before === void 0 || after === void 0) {
      changes.push(change(`${path}[${id}]`, before, after));
      continue;
    }
    for (const key of [.../* @__PURE__ */ new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      if (key !== "id") {
        compareValue(`${path}[${id}].${key}`, before[key], after[key], changes);
      }
    }
  }
}
function diffQualityContracts(left, right) {
  const changes = [];
  const leftRecord = left;
  const rightRecord = right;
  for (const key of [
    .../* @__PURE__ */ new Set([...Object.keys(leftRecord), ...Object.keys(rightRecord)])
  ].sort()) {
    if (key === "requirements") {
      compareIdentifiedList(key, left.requirements, right.requirements, changes);
    } else if (key === "invariants") {
      compareIdentifiedList(key, left.invariants, right.invariants, changes);
    } else {
      compareValue(key, leftRecord[key], rightRecord[key], changes);
    }
  }
  return {
    classification: changes.length === 0 ? "none" : changes.some((item) => item.semantic) ? "semantic" : "mechanical",
    changes
  };
}

// packages/contracts/dist/hash.js
var import_node_crypto = require("node:crypto");
function canonicalize(value) {
  if (Array.isArray(value))
    return value.map(canonicalize);
  if (typeof value !== "object" || value === null)
    return value;
  return Object.fromEntries(Object.entries(value).filter(([, nested]) => nested !== void 0).sort(([left], [right]) => left.localeCompare(right)).map(([key, nested]) => [key, canonicalize(nested)]));
}
function contractVersionHash(contract) {
  const reviewableContent = Object.fromEntries(Object.entries(contract).filter(([key]) => key !== "approval" && key !== "status"));
  return (0, import_node_crypto.createHash)("sha256").update(JSON.stringify(canonicalize(reviewableContent))).digest("hex");
}

// packages/contracts/dist/model.js
var ContractError = class extends Error {
  code;
  remediation;
  issues;
  constructor(code, message, remediation, issues = [], options) {
    super(message, options);
    this.code = code;
    this.remediation = remediation;
    this.issues = issues;
    this.name = "ContractError";
  }
};

// packages/contracts/dist/repository.js
var import_promises = require("node:fs/promises");
var import_node_path = require("node:path");

// packages/contracts/dist/yaml.js
var MAX_DOCUMENT_SIZE = 1024 * 1024;
var FORBIDDEN_YAML_FEATURE = /(^|[\s:[{,])(?:[&*!]|<<:)/u;
function yamlError(message, line) {
  const suffix = line === void 0 ? "" : ` at line ${line}`;
  return new ContractError("CONTRACT_INVALID", `Invalid contract YAML${suffix}: ${message}`, "Fix the YAML syntax and run maru contract validate again.", [{ message, path: line === void 0 ? "yaml" : `yaml.line.${line}` }]);
}
function splitKeyValue(content, line) {
  const separator = content.indexOf(":");
  if (separator <= 0) {
    throw yamlError("Expected a key followed by a colon.", line);
  }
  const key = content.slice(0, separator).trim();
  if (!/^[A-Za-z][A-Za-z0-9_-]*$/u.test(key)) {
    throw yamlError(`Unsupported key: ${key}`, line);
  }
  return [key, content.slice(separator + 1).trim()];
}
function parseScalar(value, line) {
  if (FORBIDDEN_YAML_FEATURE.test(value)) {
    throw yamlError("YAML anchors, aliases, tags, and merge keys are not supported.", line);
  }
  if (value === "true")
    return true;
  if (value === "false")
    return false;
  if (value === "null" || value === "~")
    return null;
  if (/^-?(?:0|[1-9]\d*)$/u.test(value))
    return Number(value);
  if (value.startsWith('"')) {
    try {
      return JSON.parse(value);
    } catch {
      throw yamlError("Invalid double-quoted string.", line);
    }
  }
  if (value.startsWith("'")) {
    if (!value.endsWith("'"))
      throw yamlError("Unterminated single-quoted string.", line);
    return value.slice(1, -1).replaceAll("''", "'");
  }
  return value.replace(/\s+#.*$/u, "").trimEnd();
}
function tokenize(source) {
  if (Buffer.byteLength(source, "utf8") > MAX_DOCUMENT_SIZE) {
    throw yamlError("Contract files cannot exceed 1 MiB.");
  }
  if (source.includes("	")) {
    throw yamlError("Tabs are not allowed for indentation.");
  }
  const lines = [];
  for (const [index, raw] of source.replaceAll("\r\n", "\n").split("\n").entries()) {
    const trimmed = raw.trim();
    if (trimmed.length === 0 || trimmed.startsWith("#") || trimmed === "---")
      continue;
    const indent = raw.length - raw.trimStart().length;
    if (indent % 2 !== 0)
      throw yamlError("Indentation must use multiples of two spaces.", index + 1);
    lines.push({ content: raw.trim(), indent, line: index + 1 });
  }
  return lines;
}
var StrictYamlParser = class {
  lines;
  index = 0;
  constructor(lines) {
    this.lines = lines;
  }
  parse() {
    if (this.lines.length === 0)
      throw yamlError("The contract is empty.");
    if (this.lines[0].indent !== 0)
      throw yamlError("The document must start at indentation zero.");
    const value = this.parseNode(0);
    if (this.index !== this.lines.length) {
      throw yamlError("Unexpected indentation.", this.lines[this.index]?.line);
    }
    return value;
  }
  parseNode(indent) {
    const current = this.lines[this.index];
    if (current === void 0)
      return null;
    return current.content.startsWith("- ") ? this.parseSequence(indent) : this.parseMapping(indent);
  }
  parseMapping(indent) {
    const result = {};
    while (this.index < this.lines.length) {
      const line = this.lines[this.index];
      if (line.indent < indent)
        break;
      if (line.indent > indent || line.content.startsWith("- "))
        break;
      const [key, rawValue] = splitKeyValue(line.content, line.line);
      if (Object.hasOwn(result, key))
        throw yamlError(`Duplicate key: ${key}`, line.line);
      this.index += 1;
      if (rawValue === ">" || rawValue === "|") {
        result[key] = this.parseBlockScalar(indent, rawValue === ">");
      } else if (rawValue.length > 0) {
        result[key] = parseScalar(rawValue, line.line);
      } else {
        const next = this.lines[this.index];
        result[key] = next !== void 0 && next.indent > indent ? this.parseNode(next.indent) : null;
      }
    }
    return result;
  }
  parseSequence(indent) {
    const result = [];
    while (this.index < this.lines.length) {
      const line = this.lines[this.index];
      if (line.indent !== indent || !line.content.startsWith("- "))
        break;
      const item = line.content.slice(2).trim();
      this.index += 1;
      if (item.length === 0) {
        const next = this.lines[this.index];
        result.push(next !== void 0 && next.indent > indent ? this.parseNode(next.indent) : null);
        continue;
      }
      if (/^[A-Za-z][A-Za-z0-9_-]*:(?:\s|$)/u.test(item)) {
        const [key, rawValue] = splitKeyValue(item, line.line);
        const object2 = {};
        object2[key] = rawValue.length > 0 ? parseScalar(rawValue, line.line) : null;
        const next = this.lines[this.index];
        if (next !== void 0 && next.indent > indent) {
          const continuation = this.parseMapping(next.indent);
          for (const [nestedKey, nestedValue] of Object.entries(continuation)) {
            if (Object.hasOwn(object2, nestedKey)) {
              throw yamlError(`Duplicate key: ${nestedKey}`, next.line);
            }
            object2[nestedKey] = nestedValue;
          }
        }
        result.push(object2);
      } else {
        result.push(parseScalar(item, line.line));
      }
    }
    return result;
  }
  parseBlockScalar(parentIndent, folded) {
    const values = [];
    while (this.index < this.lines.length && this.lines[this.index].indent > parentIndent) {
      values.push(this.lines[this.index].content);
      this.index += 1;
    }
    return values.join(folded ? " " : "\n");
  }
};
function parseYaml(source) {
  return new StrictYamlParser(tokenize(source)).parse();
}
function quoteScalar(value) {
  if (value.length === 0 || /^(?:true|false|null|~|-?(?:0|[1-9]\d*))$/u.test(value) || /[:#\n\r]|^[-?!&*!%@`{}[\],]/u.test(value) || value !== value.trim()) {
    return JSON.stringify(value);
  }
  return value;
}
function serializeNode(value, indent) {
  const prefix = " ".repeat(indent);
  if (Array.isArray(value)) {
    const lines2 = [];
    for (const item of value) {
      if (typeof item === "object" && item !== null && !Array.isArray(item)) {
        const entries = Object.entries(item);
        const [firstKey, firstValue] = entries[0] ?? [];
        if (firstKey === void 0)
          continue;
        if (typeof firstValue === "object" && firstValue !== null) {
          lines2.push(`${prefix}- ${firstKey}:`);
          lines2.push(...serializeNode(firstValue, indent + 4));
        } else {
          lines2.push(`${prefix}- ${firstKey}: ${serializeScalar(firstValue)}`);
        }
        for (const [key, nested] of entries.slice(1)) {
          if (typeof nested === "object" && nested !== null) {
            lines2.push(`${prefix}  ${key}:`);
            lines2.push(...serializeNode(nested, indent + 4));
          } else {
            lines2.push(`${prefix}  ${key}: ${serializeScalar(nested)}`);
          }
        }
      } else {
        lines2.push(`${prefix}- ${serializeScalar(item)}`);
      }
    }
    return lines2;
  }
  const lines = [];
  for (const [key, nested] of Object.entries(value)) {
    if (nested === void 0)
      continue;
    if (typeof nested === "object" && nested !== null) {
      lines.push(`${prefix}${key}:`);
      lines.push(...serializeNode(nested, indent + 2));
    } else {
      lines.push(`${prefix}${key}: ${serializeScalar(nested)}`);
    }
  }
  return lines;
}
function serializeScalar(value) {
  if (typeof value === "string")
    return quoteScalar(value);
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value === null)
    return "null";
  throw new TypeError("Unsupported YAML scalar");
}
function serializeYaml(value) {
  return `${serializeNode(value, 0).join("\n")}
`;
}

// packages/contracts/dist/schema.js
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function record(value, path, issues) {
  if (isRecord(value))
    return value;
  issues.push({ message: "must be a mapping", path });
  return {};
}
function text(value, path, issues) {
  if (typeof value === "string" && value.trim().length > 0)
    return value.trim();
  issues.push({ message: "must be a non-empty string", path });
  return "";
}
function stringList(value, path, issues) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ message: "must contain at least one item", path });
    return [];
  }
  return value.map((item, index) => text(item, `${path}.${index}`, issues));
}
function optionalStringList(value, path, issues) {
  if (value === void 0)
    return [];
  return stringList(value, path, issues);
}
function enumValue(value, allowed, path, issues) {
  if (typeof value === "string" && allowed.includes(value))
    return value;
  issues.push({ message: `must be one of: ${allowed.join(", ")}`, path });
  return allowed[0];
}
function requirementList(value, issues) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ message: "must contain at least one requirement", path: "requirements" });
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  return value.map((item, index) => {
    const path = `requirements.${index}`;
    const input = record(item, path, issues);
    const id = text(input.id, `${path}.id`, issues);
    if (seen.has(id))
      issues.push({ message: `duplicate requirement id: ${id}`, path: `${path}.id` });
    seen.add(id);
    return {
      id,
      priority: enumValue(input.priority, ["required", "recommended", "optional"], `${path}.priority`, issues),
      statement: text(input.statement, `${path}.statement`, issues)
    };
  });
}
function invariantList(value, issues) {
  if (!Array.isArray(value) || value.length === 0) {
    issues.push({ message: "must contain at least one invariant", path: "invariants" });
    return [];
  }
  const seen = /* @__PURE__ */ new Set();
  return value.map((item, index) => {
    const path = `invariants.${index}`;
    const input = record(item, path, issues);
    const id = text(input.id, `${path}.id`, issues);
    if (seen.has(id))
      issues.push({ message: `duplicate invariant id: ${id}`, path: `${path}.id` });
    seen.add(id);
    return { id, statement: text(input.statement, `${path}.statement`, issues) };
  });
}
function approvalValue(value, status2, issues) {
  if (value === void 0 || value === null) {
    if (status2 === "approved") {
      issues.push({ message: "is required when status is approved", path: "approval" });
    }
    return void 0;
  }
  const input = record(value, "approval", issues);
  const approvedAt = text(input.approved_at, "approval.approved_at", issues);
  const approvedBy = text(input.approved_by, "approval.approved_by", issues);
  const versionHash = text(input.version_hash, "approval.version_hash", issues);
  if (approvedAt.length > 0 && Number.isNaN(Date.parse(approvedAt))) {
    issues.push({ message: "must be an ISO-8601 timestamp", path: "approval.approved_at" });
  }
  if (versionHash.length > 0 && !/^[a-f0-9]{64}$/u.test(versionHash)) {
    issues.push({ message: "must be a SHA-256 hash", path: "approval.version_hash" });
  }
  return { approvedAt, approvedBy, versionHash };
}
function parseQualityContract(source, sourceName = "contract") {
  let value;
  try {
    value = parseYaml(source);
  } catch (error) {
    if (error instanceof ContractError)
      throw error;
    throw new ContractError("CONTRACT_INVALID", `${sourceName} could not be parsed.`, "Fix the YAML syntax and run maru contract validate again.", [{ message: "could not be parsed", path: "yaml" }], { cause: error });
  }
  const issues = [];
  const input = record(value, "contract", issues);
  if (input.version !== 1)
    issues.push({ message: "must equal 1", path: "version" });
  const id = text(input.id, "id", issues);
  if (id.length > 0 && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(id)) {
    issues.push({ message: "must be a lowercase kebab-case identifier", path: "id" });
  }
  const status2 = enumValue(input.status, ["draft", "review", "approved", "amended", "deprecated"], "status", issues);
  const requirements = requirementList(input.requirements, issues);
  const invariants = invariantList(input.invariants, issues);
  const evidenceInput = record(input.evidence_policy, "evidence_policy", issues);
  const blockingRequirements = stringList(evidenceInput.blocking_requirements, "evidence_policy.blocking_requirements", issues);
  const knownIds = new Set([...requirements, ...invariants].map((item) => item.id));
  for (const [index, blocked] of blockingRequirements.entries()) {
    if (!knownIds.has(blocked)) {
      issues.push({
        message: `references unknown requirement or invariant: ${blocked}`,
        path: `evidence_policy.blocking_requirements.${index}`
      });
    }
  }
  const accessibilityInput = input.accessibility === void 0 ? void 0 : record(input.accessibility, "accessibility", issues);
  const performanceInput = input.performance === void 0 ? void 0 : record(input.performance, "performance", issues);
  const observabilityInput = input.observability === void 0 ? void 0 : record(input.observability, "observability", issues);
  const contract = {
    version: 1,
    id,
    title: text(input.title, "title", issues),
    status: status2,
    criticality: enumValue(input.criticality, ["low", "medium", "high", "critical"], "criticality", issues),
    intent: text(input.intent, "intent", issues),
    owners: stringList(input.owners, "owners", issues),
    requirements,
    invariants,
    edgeCases: stringList(input.edge_cases, "edge_cases", issues),
    security: stringList(input.security, "security", issues),
    dataIntegrity: stringList(input.data_integrity, "data_integrity", issues),
    evidencePolicy: { blockingRequirements },
    approval: approvalValue(input.approval, status2, issues),
    ...accessibilityInput === void 0 ? {} : {
      accessibility: {
        required: typeof accessibilityInput.required === "boolean" ? accessibilityInput.required : (issues.push({ message: "must be a boolean", path: "accessibility.required" }), false),
        ...typeof accessibilityInput.standard === "string" ? { standard: accessibilityInput.standard } : {}
      }
    },
    ...performanceInput === void 0 ? {} : {
      performance: {
        requirements: optionalStringList(performanceInput.requirements, "performance.requirements", issues)
      }
    },
    ...observabilityInput === void 0 ? {} : {
      observability: {
        expectedEvents: optionalStringList(observabilityInput.expected_events, "observability.expected_events", issues)
      }
    }
  };
  if (issues.length > 0) {
    throw new ContractError("CONTRACT_INVALID", `${sourceName} has ${issues.length} validation issue${issues.length === 1 ? "" : "s"}.`, "Correct the reported fields and run maru contract validate again.", issues);
  }
  return contract;
}
function serializeQualityContract(contract) {
  return serializeYaml({
    version: contract.version,
    id: contract.id,
    title: contract.title,
    status: contract.status,
    criticality: contract.criticality,
    intent: contract.intent,
    owners: [...contract.owners],
    requirements: contract.requirements.map((item) => ({ ...item })),
    invariants: contract.invariants.map((item) => ({ ...item })),
    edge_cases: [...contract.edgeCases],
    security: [...contract.security],
    data_integrity: [...contract.dataIntegrity],
    ...contract.accessibility === void 0 ? {} : { accessibility: { ...contract.accessibility } },
    ...contract.performance === void 0 ? {} : { performance: { requirements: [...contract.performance.requirements] } },
    ...contract.observability === void 0 ? {} : { observability: { expected_events: [...contract.observability.expectedEvents] } },
    evidence_policy: { blocking_requirements: [...contract.evidencePolicy.blockingRequirements] },
    ...contract.approval === void 0 ? {} : {
      approval: {
        approved_by: contract.approval.approvedBy,
        approved_at: contract.approval.approvedAt,
        version_hash: contract.approval.versionHash
      }
    }
  });
}

// packages/contracts/dist/repository.js
var CONTRACT_DIRECTORY = ".maru/contracts";
var CONTRACT_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
function portable(path) {
  return path.split(import_node_path.sep).join("/");
}
function safePath(root, path) {
  const absoluteRoot = (0, import_node_path.resolve)(root);
  const target = (0, import_node_path.resolve)(absoluteRoot, path);
  if (target !== absoluteRoot && !target.startsWith(`${absoluteRoot}${import_node_path.sep}`)) {
    throw new ContractError("CONTRACT_ID_INVALID", `Path escapes the project root: ${path}`, "Use a contract identifier or path inside the project root.");
  }
  return target;
}
function assertId(id) {
  if (!CONTRACT_ID.test(id)) {
    throw new ContractError("CONTRACT_ID_INVALID", `Invalid contract identifier: ${id}`, "Use a lowercase kebab-case identifier such as subscription-management.");
  }
}
async function exists(path) {
  try {
    await (0, import_promises.access)(path);
    return true;
  } catch {
    return false;
  }
}
async function requireInitialization(root) {
  if (!await exists(safePath(root, ".maru/maru.yml"))) {
    throw new ContractError("MARU_NOT_INITIALIZED", "MaruCheck is not initialized in this project.", "Run maru init before managing Quality Contracts.");
  }
}
async function readContractFile(root, path) {
  try {
    return parseQualityContract(await (0, import_promises.readFile)(safePath(root, path), "utf8"), path);
  } catch (error) {
    if (error instanceof ContractError)
      throw error;
    throw new ContractError("CONTRACT_READ_FAILED", `Unable to read ${path}.`, "Confirm the contract file exists and is readable.", [], { cause: error });
  }
}
async function writeContractFile(root, path, contract) {
  try {
    const target = safePath(root, path);
    await (0, import_promises.mkdir)((0, import_node_path.dirname)(target), { recursive: true });
    await (0, import_promises.writeFile)(target, serializeQualityContract(contract), "utf8");
  } catch (error) {
    if (error instanceof ContractError)
      throw error;
    throw new ContractError("CONTRACT_WRITE_FAILED", `Unable to write ${path}.`, "Check directory permissions and available disk space.", [], { cause: error });
  }
}
async function writeContractSnapshot(root, path, contract) {
  try {
    const target = safePath(root, path);
    await (0, import_promises.mkdir)((0, import_node_path.dirname)(target), { recursive: true });
    await (0, import_promises.writeFile)(target, serializeQualityContract(contract), { encoding: "utf8", flag: "wx" });
  } catch (error) {
    if (error instanceof ContractError)
      throw error;
    if (error.code === "EEXIST") {
      throw new ContractError("CONTRACT_VERSION_EXISTS", "An immutable snapshot already exists for this contract content.", "Change the contract's reviewable content before approving a new version.", [], { cause: error });
    }
    throw new ContractError("CONTRACT_WRITE_FAILED", `Unable to write ${path}.`, "Check directory permissions and available disk space.", [], { cause: error });
  }
}
function summary(contract, path) {
  return {
    criticality: contract.criticality,
    id: contract.id,
    path,
    status: contract.status,
    title: contract.title,
    versionHash: contractVersionHash(contract)
  };
}
async function createContractFromRequirements(root, requirementsText, options = {}) {
  await requireInitialization(root);
  if (requirementsText.trim().length < 8) {
    throw new ContractError("REQUIREMENTS_INVALID", "Requirements must contain at least one meaningful sentence.", "Provide a readable requirements file with the behavior the product must preserve.");
  }
  if (options.id !== void 0)
    assertId(options.id);
  const contract = draftQualityContract(requirementsText, options);
  assertId(contract.id);
  const path = `${CONTRACT_DIRECTORY}/${contract.id}.yml`;
  if (await exists(safePath(root, path))) {
    throw new ContractError("CONTRACT_ALREADY_EXISTS", `Contract already exists: ${contract.id}`, "Choose another identifier or edit the existing contract intentionally.");
  }
  await writeContractFile(root, path, contract);
  return { contract, path, versionHash: contractVersionHash(contract) };
}
async function listContracts(root) {
  await requireInitialization(root);
  const directory = safePath(root, CONTRACT_DIRECTORY);
  if (!await exists(directory))
    return [];
  try {
    const entries = await (0, import_promises.readdir)(directory, { withFileTypes: true });
    const summaries = [];
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (!entry.isFile() || !/\.ya?ml$/iu.test(entry.name))
        continue;
      const path = `${CONTRACT_DIRECTORY}/${entry.name}`;
      summaries.push(summary(await readContractFile(root, path), path));
    }
    return summaries;
  } catch (error) {
    if (error instanceof ContractError)
      throw error;
    throw new ContractError("CONTRACT_READ_FAILED", "Unable to list Quality Contracts.", "Check that .maru/contracts is readable.", [], { cause: error });
  }
}
async function getContract(root, id) {
  await requireInitialization(root);
  assertId(id);
  const path = `${CONTRACT_DIRECTORY}/${id}.yml`;
  if (!await exists(safePath(root, path))) {
    throw new ContractError("CONTRACT_NOT_FOUND", `Contract not found: ${id}`, "Run maru contract list or create the contract first.");
  }
  return readContractFile(root, path);
}
async function validateContracts(root, requestedPath) {
  await requireInitialization(root);
  let paths;
  if (requestedPath !== void 0) {
    paths = [portable((0, import_node_path.relative)((0, import_node_path.resolve)(root), safePath(root, requestedPath)))];
  } else {
    const directory = safePath(root, CONTRACT_DIRECTORY);
    if (!await exists(directory))
      return { invalid: [], valid: [] };
    paths = (await (0, import_promises.readdir)(directory, { withFileTypes: true })).filter((entry) => entry.isFile() && /\.ya?ml$/iu.test(entry.name)).map((entry) => `${CONTRACT_DIRECTORY}/${entry.name}`).sort();
  }
  const valid = [];
  const invalid3 = [];
  for (const path of paths) {
    try {
      const contract = await readContractFile(root, path);
      valid.push(summary(contract, path));
    } catch (error) {
      if (error instanceof ContractError) {
        invalid3.push({ issues: error.issues, path });
      } else {
        throw error;
      }
    }
  }
  return { invalid: invalid3, valid };
}
async function approveContract(root, id, approval) {
  if (approval.approvedBy.trim().length === 0) {
    throw new ContractError("CONTRACT_INVALID", "An approver is required.", "Pass --by with the accountable owner name or team.", [{ message: "must be a non-empty string", path: "approval.approved_by" }]);
  }
  const current = await getContract(root, id);
  if (current.status === "approved") {
    throw new ContractError("CONTRACT_ALREADY_APPROVED", `Contract is already approved: ${id}`, "Amend the contract content and move it back through review before approving a new version.");
  }
  const versionHash = contractVersionHash(current);
  const contract = {
    ...current,
    status: "approved",
    approval: {
      approvedAt: (approval.approvedAt ?? /* @__PURE__ */ new Date()).toISOString(),
      approvedBy: approval.approvedBy.trim(),
      versionHash
    }
  };
  const path = `${CONTRACT_DIRECTORY}/${id}.yml`;
  const historyPath = `${CONTRACT_DIRECTORY}/.history/${id}/${versionHash}.yml`;
  await writeContractSnapshot(root, historyPath, contract);
  await writeContractFile(root, path, contract);
  return { contract, path, versionHash };
}
async function applyApprovedContractAmendment(root, id, proposedContract, options) {
  if (options.approvedBy.trim().length === 0) {
    throw new ContractError("CONTRACT_INVALID", "An approver is required for a contract amendment.", "Provide the accountable contract owner who approved the semantic change.", [{ message: "must be a non-empty string", path: "approval.approved_by" }]);
  }
  const current = await getContract(root, id);
  if (proposedContract.id !== id) {
    throw new ContractError("CONTRACT_INVALID", "The proposed contract identifier does not match the current contract.", "Create a separate amendment proposal for each contract.");
  }
  if (contractVersionHash(current) !== options.expectedCurrentVersionHash) {
    throw new ContractError("CONTRACT_INVALID", "The current contract changed after this amendment was proposed.", "Review the latest contract and create a new amendment proposal.");
  }
  if (diffQualityContracts(current, proposedContract).classification !== "semantic") {
    throw new ContractError("CONTRACT_INVALID", "The amendment proposal does not contain a semantic contract change.", "Use the normal contract workflow for mechanical metadata edits.");
  }
  const reviewable = {
    ...proposedContract,
    status: "amended",
    approval: void 0
  };
  const versionHash = contractVersionHash(reviewable);
  const contract = {
    ...reviewable,
    status: "approved",
    approval: {
      approvedAt: (options.approvedAt ?? /* @__PURE__ */ new Date()).toISOString(),
      approvedBy: options.approvedBy.trim(),
      versionHash
    }
  };
  const path = `${CONTRACT_DIRECTORY}/${id}.yml`;
  const historyPath = `${CONTRACT_DIRECTORY}/.history/${id}/${versionHash}.yml`;
  await writeContractSnapshot(root, historyPath, contract);
  await writeContractFile(root, path, contract);
  return { contract, path, versionHash };
}
async function contractFromReference(root, reference) {
  if (CONTRACT_ID.test(reference))
    return getContract(root, reference);
  return readContractFile(root, portable((0, import_node_path.relative)((0, import_node_path.resolve)(root), safePath(root, reference))));
}
async function diffContracts(root, leftReference, rightReference) {
  await requireInitialization(root);
  return diffQualityContracts(await contractFromReference(root, leftReference), await contractFromReference(root, rightReference));
}

// packages/shared/dist/index.js
var MARU_CONFIG_DIRECTORY = ".maru";
var MARU_CONFIG_FILENAME = "maru.yml";

// packages/core/dist/project/doctor.js
var import_promises3 = require("node:fs/promises");
var import_node_path3 = require("node:path");

// packages/core/dist/project/workspace.js
var import_promises2 = require("node:fs/promises");
var import_node_path2 = require("node:path");

// packages/core/dist/project/errors.js
var ProjectError = class extends Error {
  code;
  operation;
  remediation;
  constructor(code, operation, message, remediation, options) {
    super(message, options);
    this.code = code;
    this.operation = operation;
    this.remediation = remediation;
    this.name = "ProjectError";
  }
};

// packages/core/dist/project/workspace.js
var IGNORED_DIRECTORIES = /* @__PURE__ */ new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "out"
]);
function toPortablePath(path) {
  return path.split(import_node_path2.sep).join("/");
}
var ProjectWorkspace = class {
  root;
  constructor(root) {
    this.root = (0, import_node_path2.resolve)(root);
  }
  resolve(relativePath2) {
    const candidate = (0, import_node_path2.resolve)(this.root, relativePath2);
    const rootPrefix = `${this.root}${import_node_path2.sep}`;
    if (candidate !== this.root && !candidate.startsWith(rootPrefix)) {
      throw new ProjectError("PROJECT_PATH_OUTSIDE_ROOT", "resolve project path", `Path escapes the project root: ${relativePath2}`, "Use a path inside the project root.");
    }
    return candidate;
  }
  async exists(relativePath2) {
    try {
      await (0, import_promises2.access)(this.resolve(relativePath2));
      return true;
    } catch (error) {
      if (error instanceof ProjectError) {
        throw error;
      }
      return false;
    }
  }
  async createDirectory(relativePath2) {
    try {
      await (0, import_promises2.mkdir)(this.resolve(relativePath2), { recursive: true });
    } catch (error) {
      throw new ProjectError("PROJECT_WRITE_FAILED", "create project directory", `Unable to create ${relativePath2}.`, "Check directory permissions and available disk space.", { cause: error });
    }
  }
  async readText(relativePath2) {
    try {
      return await (0, import_promises2.readFile)(this.resolve(relativePath2), "utf8");
    } catch (error) {
      throw new ProjectError("PROJECT_READ_FAILED", "read project file", `Unable to read ${relativePath2}.`, "Confirm the file exists and is readable.", { cause: error });
    }
  }
  async writeText(relativePath2, content) {
    try {
      const target = this.resolve(relativePath2);
      await (0, import_promises2.mkdir)((0, import_node_path2.dirname)(target), { recursive: true });
      await (0, import_promises2.writeFile)(target, content, "utf8");
    } catch (error) {
      if (error instanceof ProjectError) {
        throw error;
      }
      throw new ProjectError("PROJECT_WRITE_FAILED", "write project file", `Unable to write ${relativePath2}.`, "Check directory permissions and available disk space.", { cause: error });
    }
  }
  async listFiles() {
    const files = [];
    const visit = async (directory) => {
      const entries = await (0, import_promises2.readdir)(directory, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isSymbolicLink()) {
          continue;
        }
        const absolutePath = (0, import_node_path2.resolve)(directory, entry.name);
        if (entry.isDirectory()) {
          if (!IGNORED_DIRECTORIES.has(entry.name)) {
            await visit(absolutePath);
          }
          continue;
        }
        if (entry.isFile()) {
          files.push(toPortablePath((0, import_node_path2.relative)(this.root, absolutePath)));
        }
      }
    };
    try {
      await visit(this.root);
      return files.sort((left, right) => left.localeCompare(right));
    } catch (error) {
      throw new ProjectError("PROJECT_READ_FAILED", "inventory project files", "Unable to enumerate the project.", "Check that the project directory is readable.", { cause: error });
    }
  }
};
async function readPackageManifest(workspace) {
  if (!await workspace.exists("package.json")) {
    return {};
  }
  try {
    const parsed = JSON.parse(await workspace.readText("package.json"));
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      throw new TypeError("package.json must contain an object");
    }
    return parsed;
  } catch (error) {
    if (error instanceof ProjectError && error.code !== "PROJECT_READ_FAILED") {
      throw error;
    }
    throw new ProjectError("INVALID_PROJECT_MANIFEST", "parse package manifest", "package.json is not valid JSON.", "Repair package.json, then run the command again.", { cause: error });
  }
}
function dependencyMap(manifest) {
  const sections = ["dependencies", "devDependencies", "peerDependencies"];
  const dependencies = {};
  for (const section of sections) {
    const value = manifest[section];
    if (typeof value !== "object" || value === null || Array.isArray(value)) {
      continue;
    }
    for (const [name, version] of Object.entries(value)) {
      if (typeof version === "string") {
        dependencies[name] = version;
      }
    }
  }
  return dependencies;
}
function dependencyNames(manifest, section) {
  const value = manifest[section];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return [];
  }
  return Object.keys(value).sort((left, right) => left.localeCompare(right));
}

// packages/core/dist/project/stack-detector.js
var DATABASE_PACKAGES = {
  "@neondatabase/serverless": "neon-postgres",
  "@prisma/client": "prisma",
  "better-sqlite3": "sqlite",
  "drizzle-orm": "drizzle",
  mongoose: "mongodb",
  mysql2: "mysql",
  pg: "postgresql",
  prisma: "prisma",
  sequelize: "sequelize",
  typeorm: "typeorm"
};
var SOURCE_DIRECTORY_CANDIDATES = ["src", "app", "pages", "server", "lib"];
var TEST_DIRECTORY_CANDIDATES = ["__tests__", "cypress/e2e", "e2e", "test", "tests"];
async function detectPackageManager(workspace, manifest) {
  const lockfiles = [
    ["pnpm-lock.yaml", "pnpm"],
    ["yarn.lock", "yarn"],
    ["bun.lock", "bun"],
    ["bun.lockb", "bun"],
    ["package-lock.json", "npm"]
  ];
  for (const [lockfile, packageManager] of lockfiles) {
    if (await workspace.exists(lockfile)) {
      return packageManager;
    }
  }
  if (typeof manifest.packageManager === "string") {
    const declared = manifest.packageManager.split("@", 1)[0];
    if (declared === "bun" || declared === "npm" || declared === "pnpm" || declared === "yarn") {
      return declared;
    }
  }
  return await workspace.exists("package.json") ? "npm" : "unknown";
}
async function existingDirectories(workspace, candidates) {
  const matches = [];
  for (const candidate of candidates) {
    if (await workspace.exists(candidate)) {
      matches.push(candidate);
    }
  }
  return matches.sort((left, right) => left.localeCompare(right));
}
async function detectStack(root) {
  const workspace = new ProjectWorkspace(root);
  const manifest = await readPackageManifest(workspace);
  const dependencies = dependencyMap(manifest);
  const files = await workspace.listFiles();
  const frameworks = [];
  const languages = [];
  const testFrameworks = [];
  if ("next" in dependencies) {
    frameworks.push("nextjs");
  }
  if ("react" in dependencies) {
    frameworks.push("react");
  }
  const hasTypeScript = "typescript" in dependencies || await workspace.exists("tsconfig.json") || files.some((file) => /\.(?:ts|tsx)$/.test(file));
  const hasJavaScript = files.some((file) => /\.(?:js|jsx|mjs|cjs)$/.test(file));
  if (hasJavaScript) {
    languages.push("javascript");
  }
  if (hasTypeScript) {
    languages.push("typescript");
  }
  if ("cypress" in dependencies || files.some((file) => /^cypress\.config\.(?:ts|js|mjs|cjs)$/.test(file))) {
    testFrameworks.push("cypress");
  }
  if ("@playwright/test" in dependencies || "playwright" in dependencies) {
    testFrameworks.push("playwright");
  }
  if ("jest" in dependencies || "@jest/core" in dependencies) {
    testFrameworks.push("jest");
  }
  if ("vitest" in dependencies) {
    testFrameworks.push("vitest");
  }
  const databaseLibraries = [
    ...new Set(Object.keys(dependencies).map((name) => DATABASE_PACKAGES[name]).filter((name) => name !== void 0))
  ].sort((left, right) => left.localeCompare(right));
  const workflowFiles = files.filter((file) => /^\.github\/workflows\/[^/]+\.ya?ml$/.test(file));
  return {
    ci: {
      githubActions: workflowFiles.length > 0,
      workflowFiles
    },
    databaseLibraries,
    frameworks,
    languages,
    packageManager: await detectPackageManager(workspace, manifest),
    sourceDirectories: await existingDirectories(workspace, SOURCE_DIRECTORY_CANDIDATES),
    testDirectories: await existingDirectories(workspace, TEST_DIRECTORY_CANDIDATES),
    testFrameworks
  };
}

// packages/core/dist/project/doctor.js
async function fileExists(path) {
  try {
    await (0, import_promises3.access)(path);
    return true;
  } catch {
    return false;
  }
}
async function executableAvailable(executable) {
  const pathValue = process.env.PATH ?? "";
  const extensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";") : [""];
  for (const directory of pathValue.split(import_node_path3.delimiter).filter((entry) => entry.length > 0)) {
    for (const extension of extensions) {
      if (await fileExists((0, import_node_path3.join)(directory, `${executable}${extension.toLowerCase()}`))) {
        return true;
      }
      if (extension !== extension.toUpperCase() && await fileExists((0, import_node_path3.join)(directory, `${executable}${extension.toUpperCase()}`))) {
        return true;
      }
    }
  }
  return false;
}
var defaultDoctorEnvironment = {
  executableAvailable,
  runtimeVersion: process.version
};
function runtimeCheck(runtimeVersion) {
  const major = Number.parseInt(runtimeVersion.replace(/^v/, "").split(".")[0] ?? "", 10);
  if (!Number.isInteger(major) || major < 24) {
    return {
      code: "runtime",
      details: `Node.js ${runtimeVersion} is unsupported; MaruCheck requires Node.js 24 or newer.`,
      remediation: "Install Node.js 24 LTS or newer.",
      status: "fail"
    };
  }
  return { code: "runtime", details: `Node.js ${runtimeVersion} is supported.`, status: "pass" };
}
async function diagnoseProject(root, environment = defaultDoctorEnvironment) {
  const workspace = new ProjectWorkspace(root);
  const stack = await detectStack(root);
  const checks = [runtimeCheck(environment.runtimeVersion)];
  checks.push(await environment.executableAvailable("git") ? { code: "git", details: "Git is available.", status: "pass" } : {
    code: "git",
    details: "Git is not available on PATH.",
    remediation: "Install Git and ensure the git executable is on PATH.",
    status: "fail"
  });
  checks.push(await workspace.exists(".maru/maru.yml") ? { code: "configuration", details: ".maru/maru.yml is present.", status: "pass" } : {
    code: "configuration",
    details: "MaruCheck configuration is missing.",
    remediation: "Run maru init in the project root.",
    status: "fail"
  });
  if (stack.packageManager === "unknown") {
    checks.push({
      code: "package-manager",
      details: "No supported JavaScript package manager was detected.",
      remediation: "Add a supported lockfile or declare packageManager in package.json.",
      status: "warn"
    });
  } else {
    checks.push(await environment.executableAvailable(stack.packageManager) ? {
      code: "package-manager",
      details: `${stack.packageManager} is available.`,
      status: "pass"
    } : {
      code: "package-manager",
      details: `${stack.packageManager} is detected but unavailable on PATH.`,
      remediation: `Install ${stack.packageManager} before running project tests.`,
      status: "fail"
    });
  }
  checks.push(stack.testFrameworks.length > 0 ? {
    code: "test-frameworks",
    details: `Detected: ${stack.testFrameworks.join(", ")}.`,
    status: "pass"
  } : {
    code: "test-frameworks",
    details: "No supported test framework was detected.",
    remediation: "Add Vitest, Jest, Playwright, or Cypress when verification coverage is introduced.",
    status: "warn"
  });
  checks.push(stack.ci.githubActions ? { code: "github-actions", details: "GitHub Actions workflows are present.", status: "pass" } : {
    code: "github-actions",
    details: "No GitHub Actions workflow was detected.",
    remediation: "Run maru ci init in a later phase if PR verification is required.",
    status: "warn"
  });
  return {
    checks,
    ok: checks.every((check) => check.status !== "fail")
  };
}

// packages/core/dist/project/initialize.js
var import_node_path4 = require("node:path");
var CONFIG_PATH = ".maru/maru.yml";
var MARU_DIRECTORIES = [
  ".maru/artifacts",
  ".maru/contracts",
  ".maru/generated",
  ".maru/memory"
];
var MARU_GITIGNORE_ENTRIES = ["artifacts/", "generated/", "connection.env"];
function yamlString(value) {
  return JSON.stringify(value);
}
function selectedFramework(frameworks, choices) {
  return choices.find((choice) => frameworks.includes(choice));
}
function createConfiguration(name, stack) {
  const unitFramework = selectedFramework(stack.testFrameworks, ["vitest", "jest"]);
  const e2eFramework = selectedFramework(stack.testFrameworks, ["playwright", "cypress"]);
  const testLines = ["test:"];
  if (unitFramework === void 0 && e2eFramework === void 0) {
    testLines.push("  detected: false");
  } else {
    if (unitFramework !== void 0) {
      testLines.push("  unit:", `    framework: ${unitFramework}`);
    }
    if (e2eFramework !== void 0) {
      testLines.push("  e2e:", `    framework: ${e2eFramework}`);
    }
  }
  return [
    "version: 1",
    "",
    "project:",
    `  name: ${yamlString(name)}`,
    "",
    "mode: shadow",
    "",
    ...testLines,
    "",
    "risk:",
    "  historical_memory: true",
    "",
    "llm:",
    "  provider: auto",
    "",
    "security:",
    "  redact_secrets: true",
    "",
    "contracts:",
    "  directory: .maru/contracts",
    "",
    "artifacts:",
    "  directory: .maru/artifacts",
    ""
  ].join("\n");
}
async function initializeProject(root) {
  const workspace = new ProjectWorkspace(root);
  const manifest = await readPackageManifest(workspace);
  const stack = await detectStack(root);
  for (const directory of MARU_DIRECTORIES) {
    await workspace.createDirectory(directory);
  }
  const ignorePath = ".maru/.gitignore";
  const currentIgnore = await workspace.exists(ignorePath) ? await workspace.readText(ignorePath) : "";
  const ignoreLines = currentIgnore.split(/\r?\n/gu).filter(Boolean);
  const missingIgnoreLines = MARU_GITIGNORE_ENTRIES.filter((entry) => !ignoreLines.includes(entry));
  if (missingIgnoreLines.length > 0) {
    await workspace.writeText(ignorePath, `${ignoreLines.join("\n")}${ignoreLines.length > 0 ? "\n" : ""}${missingIgnoreLines.join("\n")}
`);
  }
  const configExists = await workspace.exists(CONFIG_PATH);
  if (!configExists) {
    const projectName = typeof manifest.name === "string" ? manifest.name : (0, import_node_path4.basename)(workspace.root);
    await workspace.writeText(CONFIG_PATH, createConfiguration(projectName, stack));
  }
  return {
    configPath: CONFIG_PATH,
    created: !configExists,
    directories: MARU_DIRECTORIES,
    stack
  };
}

// packages/core/dist/project/scanner.js
var import_node_path5 = require("node:path");
var SOURCE_FILE_PATTERN = /\.(?:cjs|css|js|jsx|json|mjs|scss|ts|tsx)$/;
var TEST_FILE_PATTERN = /(?:^|\/)(?:__tests__|e2e|test|tests)(?:\/|$)|\.(?:cy|spec|test)\.[^.]+$/;
var ROUTE_METHOD_PATTERN = /export\s+(?:async\s+)?(?:function|const)\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g;
function routePath(segments) {
  const visibleSegments = segments.filter((segment) => segment.length > 0 && !segment.startsWith("@") && !(segment.startsWith("(") && segment.endsWith(")")));
  return visibleSegments.length === 0 ? "/" : `/${visibleSegments.join("/")}`;
}
function appRouteFromFile(file) {
  const match = /(?:^|\/)app\/(.*)\/(page|route)\.(?:js|jsx|ts|tsx)$/.exec(file);
  if (match === null) {
    const rootMatch = /(?:^|\/)app\/(page|route)\.(?:js|jsx|ts|tsx)$/.exec(file);
    if (rootMatch === null) {
      return void 0;
    }
    return { kind: rootMatch[1] === "route" ? "api" : "page", path: "/", source: file };
  }
  return {
    kind: match[2] === "route" ? "api" : "page",
    path: routePath(match[1]?.split("/") ?? []),
    source: file
  };
}
function pagesRouteFromFile(file) {
  const match = /(?:^|\/)pages\/(.*)\.(?:js|jsx|ts|tsx)$/.exec(file);
  if (match === null) {
    return void 0;
  }
  const segments = match[1]?.split("/") ?? [];
  const filename = segments.at(-1);
  if (filename === void 0 || filename.startsWith("_")) {
    return void 0;
  }
  if (filename === "index") {
    segments.pop();
  }
  return {
    kind: segments[0] === "api" ? "api" : "page",
    path: routePath(segments),
    source: file
  };
}
async function detectRoutes(workspace, files) {
  const routes = [];
  for (const file of files) {
    const detected = appRouteFromFile(file) ?? pagesRouteFromFile(file);
    if (detected === void 0) {
      continue;
    }
    if (detected.kind === "api") {
      const source = await workspace.readText(file);
      const methods = [...source.matchAll(ROUTE_METHOD_PATTERN)].map((match) => match[1]).filter((method) => method !== void 0).sort((left, right) => left.localeCompare(right));
      routes.push(methods.length > 0 ? { ...detected, methods } : detected);
    } else {
      routes.push(detected);
    }
  }
  return routes;
}
function testFrameworkForFile(file, detectedFrameworks) {
  if (/(?:^|\/)cypress\/e2e\/|\.cy\.(?:js|jsx|ts|tsx)$/.test(file) && detectedFrameworks.includes("cypress")) {
    return "cypress";
  }
  if (/(?:^|\/)e2e\//.test(file) && detectedFrameworks.includes("playwright")) {
    return "playwright";
  }
  if (detectedFrameworks.includes("vitest")) {
    return "vitest";
  }
  if (detectedFrameworks.includes("jest")) {
    return "jest";
  }
  if (detectedFrameworks.includes("playwright")) {
    return "playwright";
  }
  return "unknown";
}
function countExtensions(files) {
  const counts = {};
  for (const file of files) {
    const extension = (0, import_node_path5.extname)(file).toLowerCase();
    counts[extension] = (counts[extension] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right)));
}
async function scanProject(root, now = /* @__PURE__ */ new Date()) {
  const workspace = new ProjectWorkspace(root);
  if (!await workspace.exists(".maru/maru.yml")) {
    throw new ProjectError("MARU_NOT_INITIALIZED", "scan project", "MaruCheck is not initialized in this project.", "Run maru init in the project root, then run maru scan again.");
  }
  const manifest = await readPackageManifest(workspace);
  const stack = await detectStack(root);
  const files = await workspace.listFiles();
  const sourceFiles = files.filter((file) => stack.sourceDirectories.some((directory) => file === directory || file.startsWith(`${directory}/`)) && SOURCE_FILE_PATTERN.test(file));
  const testFiles = files.filter((file) => TEST_FILE_PATTERN.test(file)).map((file) => ({ framework: testFrameworkForFile(file, stack.testFrameworks), path: file }));
  const projectName = typeof manifest.name === "string" ? manifest.name : (0, import_node_path5.basename)(workspace.root);
  return {
    ci: stack.ci,
    dependencies: {
      development: dependencyNames(manifest, "devDependencies"),
      production: dependencyNames(manifest, "dependencies")
    },
    generatedAt: now.toISOString(),
    project: {
      databaseLibraries: stack.databaseLibraries,
      frameworks: stack.frameworks,
      languages: stack.languages,
      name: projectName,
      packageManager: stack.packageManager,
      root: "."
    },
    routes: await detectRoutes(workspace, files),
    schemaVersion: 1,
    source: {
      directories: stack.sourceDirectories,
      fileCount: sourceFiles.length,
      files: sourceFiles,
      filesByExtension: countExtensions(sourceFiles)
    },
    tests: {
      directories: stack.testDirectories,
      files: testFiles,
      frameworks: stack.testFrameworks
    }
  };
}
async function writeProjectScan(root, scan) {
  const workspace = new ProjectWorkspace(root);
  const outputPath = ".maru/generated/project-scan.json";
  await workspace.writeText(outputPath, `${JSON.stringify(scan, null, 2)}
`);
  return outputPath;
}

// packages/core/dist/index.js
var MARU_PRODUCT = {
  command: "maru",
  configDirectory: MARU_CONFIG_DIRECTORY,
  configFilename: MARU_CONFIG_FILENAME,
  name: "MaruCheck",
  positioning: "Test what your AI didn't."
};

// packages/git/dist/index.js
var import_node_child_process = require("node:child_process");
var import_node_util = require("node:util");

// packages/git/dist/classification.js
var SOURCE_EXTENSION = /\.(?:[cm]?[jt]sx?|go|java|kt|php|py|rb|rs|swift)$/u;
var UI_EXTENSION = /\.(?:css|less|sass|scss)$/u;
function has(path, pattern) {
  return pattern.test(path);
}
function classifyChangedPath(path) {
  const normalized2 = path.replaceAll("\\", "/").toLowerCase();
  const classifications = /* @__PURE__ */ new Set();
  if (has(normalized2, /(?:^|\/)(?:docs?|documentation)(?:\/|$)|\.mdx?$/u)) {
    classifications.add("documentation");
  }
  if (has(normalized2, /(?:^|\/)(?:test|tests|__tests__|e2e|specs?)(?:\/|$)|\.(?:spec|test)\./u)) {
    classifications.add("test");
  }
  if (UI_EXTENSION.test(normalized2))
    classifications.add("ui-only");
  if (has(normalized2, /(?:^|\/)(?:components?|ui|styles?)(?:\/|$)/u) || has(normalized2, /(?:^|\/)app\/(?:[^/]+\/)*page\.[jt]sx$/u)) {
    classifications.add("ui-only");
  }
  if (has(normalized2, /authn|authentication|login|logout|oauth|session|sso/u)) {
    classifications.add("authentication");
    classifications.add("security-sensitive");
  }
  if (has(normalized2, /authz|authorization|permission|policy|rbac|roles?|acl/u)) {
    classifications.add("authorization");
    classifications.add("security-sensitive");
  }
  if (has(normalized2, /billing|payments?|stripe|checkout|invoice|subscription/u)) {
    classifications.add("billing");
    classifications.add("security-sensitive");
  }
  if (has(normalized2, /(?:^|\/)(?:migrations?|prisma\/migrations?)(?:\/|$)/u)) {
    classifications.add("migration");
    classifications.add("database");
  } else if (has(normalized2, /(?:^|\/)(?:db|database|prisma|schema)(?:\/|\.)/u)) {
    classifications.add("database");
  }
  if (has(normalized2, /webhooks?|integrations?|third[-_]?party|providers?|clients?|adapters?/u)) {
    classifications.add("external-integration");
  }
  if (has(normalized2, /(?:^|\/)api(?:\/|$)|route\.[jt]s$|openapi|graphql|webhooks?/u)) {
    classifications.add("api-contract");
  }
  if (has(normalized2, /(?:^|\/)(?:jobs?|workers?|queues?|cron|tasks?)(?:\/|\.)/u)) {
    classifications.add("background-job");
  }
  if (has(normalized2, /security|crypto|encrypt|decrypt|secrets?|tokens?/u)) {
    classifications.add("security-sensitive");
  }
  if (has(normalized2, /performance|benchmark|cache|memo|pagination/u)) {
    classifications.add("performance-sensitive");
  }
  if (has(normalized2, /observability|telemetry|tracing|metrics?|logging|sentry/u)) {
    classifications.add("observability");
  }
  if (has(normalized2, /(?:^|\/)(?:package(?:-lock)?\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?)$/u)) {
    classifications.add("dependency-upgrade");
    classifications.add("configuration");
  } else if (has(normalized2, /(?:^|\/)(?:\.env(?:\.|$)|[^/]*config\.[^/]+|tsconfig[^/]*\.json)$/u)) {
    classifications.add("configuration");
  }
  const nonProduction = classifications.has("documentation") || classifications.has("test") || classifications.has("ui-only") || classifications.has("configuration") || classifications.has("dependency-upgrade");
  if (SOURCE_EXTENSION.test(normalized2) && !nonProduction) {
    classifications.add("business-logic");
  }
  return [...classifications].sort();
}

// packages/git/dist/diff.js
var DIFF_ARGS = ["--no-ext-diff", "--no-color", "--unified=0", "--find-renames", "--"];
function portable2(path) {
  return path.replaceAll("\\", "/");
}
function decodeGitPath(raw) {
  const value = raw.split("	", 1)[0].trim();
  if (value === "/dev/null")
    return void 0;
  let decoded = value;
  if (value.startsWith('"') && value.endsWith('"')) {
    try {
      decoded = JSON.parse(value);
    } catch {
      throw new GitAnalysisError();
    }
  }
  return portable2(decoded.replace(/^[ab]\//u, ""));
}
function pathFromDiffHeader(line) {
  const match = /^diff --git (.+) (.+)$/u.exec(line);
  if (match === null)
    throw new GitAnalysisError();
  return { originalPath: decodeGitPath(match[1]), path: decodeGitPath(match[2]) };
}
function symbolFromLine(line) {
  const patterns = [
    /\b(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/u,
    /\bclass\s+([A-Za-z_$][\w$]*)/u,
    /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/u,
    /\bdef\s+([A-Za-z_]\w*)/u,
    /\bfunc\s+(?:\([^)]*\)\s*)?([A-Za-z_]\w*)/u
  ];
  for (const pattern of patterns) {
    const match = pattern.exec(line);
    if (match?.[1] !== void 0)
      return match[1];
  }
  return void 0;
}
function finalize(file) {
  if (file?.path === void 0)
    return void 0;
  return {
    additions: file.additions,
    binary: file.binary,
    deletions: file.deletions,
    hunks: file.hunks,
    ...file.originalPath === void 0 ? {} : { originalPath: file.originalPath },
    path: file.path,
    status: file.status,
    symbols: [...file.symbols].sort()
  };
}
function parseUnifiedDiff(output) {
  const results = [];
  let current;
  for (const line of output.split(/\r?\n/u)) {
    if (line.startsWith("diff --git ")) {
      const completed2 = finalize(current);
      if (completed2 !== void 0)
        results.push(completed2);
      const paths = pathFromDiffHeader(line);
      current = {
        additions: 0,
        binary: false,
        deletions: 0,
        hunks: [],
        ...paths,
        status: "modified",
        symbols: /* @__PURE__ */ new Set()
      };
      continue;
    }
    if (current === void 0)
      continue;
    if (line.startsWith("new file mode "))
      current.status = "added";
    else if (line.startsWith("deleted file mode "))
      current.status = "deleted";
    else if (line.startsWith("rename from ")) {
      current.status = "renamed";
      current.originalPath = decodeGitPath(line.slice("rename from ".length));
    } else if (line.startsWith("rename to ")) {
      current.status = "renamed";
      current.path = decodeGitPath(line.slice("rename to ".length));
    } else if (line.startsWith("copy from ")) {
      current.status = "copied";
      current.originalPath = decodeGitPath(line.slice("copy from ".length));
    } else if (line.startsWith("copy to ")) {
      current.status = "copied";
      current.path = decodeGitPath(line.slice("copy to ".length));
    } else if (line.startsWith("--- ")) {
      current.originalPath = decodeGitPath(line.slice(4));
    } else if (line.startsWith("+++ ")) {
      const nextPath = decodeGitPath(line.slice(4));
      current.path = nextPath ?? current.originalPath;
    } else if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
      current.binary = true;
    } else if (line.startsWith("@@ ")) {
      const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(?:\s?(.*))?$/u.exec(line);
      if (match === null)
        throw new GitAnalysisError();
      const context = match[5]?.trim();
      current.hunks.push({
        ...context === void 0 || context.length === 0 ? {} : { context },
        newLines: Number(match[4] ?? "1"),
        newStart: Number(match[3]),
        oldLines: Number(match[2] ?? "1"),
        oldStart: Number(match[1])
      });
      const symbol = context === void 0 ? void 0 : symbolFromLine(context);
      if (symbol !== void 0)
        current.symbols.add(symbol);
    } else if (line.startsWith("+") && !line.startsWith("+++")) {
      current.additions += 1;
      const symbol = symbolFromLine(line.slice(1));
      if (symbol !== void 0)
        current.symbols.add(symbol);
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      current.deletions += 1;
      const symbol = symbolFromLine(line.slice(1));
      if (symbol !== void 0)
        current.symbols.add(symbol);
    }
  }
  const completed = finalize(current);
  if (completed !== void 0)
    results.push(completed);
  return results;
}
function statusFor(file) {
  const values = [file.indexStatus, file.worktreeStatus];
  const priority = [
    "conflicted",
    "untracked",
    "deleted",
    "renamed",
    "copied",
    "added",
    "modified"
  ];
  return priority.find((candidate) => values.includes(candidate)) ?? "modified";
}
function mergeFile(left, right) {
  return {
    additions: left.additions + right.additions,
    binary: left.binary || right.binary,
    deletions: left.deletions + right.deletions,
    hunks: [...left.hunks, ...right.hunks],
    ...right.originalPath === void 0 && left.originalPath === void 0 ? {} : { originalPath: right.originalPath ?? left.originalPath },
    path: right.path,
    status: right.status === "modified" ? left.status : right.status,
    symbols: [.../* @__PURE__ */ new Set([...left.symbols, ...right.symbols])].sort()
  };
}
var GitBaseError = class extends Error {
  code = "GIT_BASE_UNRESOLVED";
  remediation = "Pass a branch, tag, or commit that exists locally, and fetch full history in CI.";
  constructor(ref, options) {
    super(`Unable to resolve the verification base: ${ref}`, options);
    this.name = "GitBaseError";
  }
};
async function resolveMergeBase(root, ref, runner = defaultGitRunner) {
  if (ref.trim() === "" || ref.startsWith("-"))
    throw new GitBaseError(ref);
  try {
    const commit = (await runner.run(["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], root)).trim();
    return (await runner.run(["merge-base", commit, "HEAD"], root)).trim();
  } catch (error) {
    throw new GitBaseError(ref, { cause: error });
  }
}
async function analyzeGitDiff(root, runner = defaultGitRunner, options = {}) {
  try {
    const workingTree = await analyzeWorkingTree(root, runner);
    const diffs = options.base === void 0 ? await Promise.all([
      runner.run(["diff", "--cached", ...DIFF_ARGS], root),
      runner.run(["diff", ...DIFF_ARGS], root)
    ]) : [
      await runner.run([
        "diff",
        ...DIFF_ARGS.slice(0, -1),
        await resolveMergeBase(root, options.base, runner),
        "--"
      ], root)
    ];
    const files = /* @__PURE__ */ new Map();
    for (const parsed of diffs.flatMap((diff) => parseUnifiedDiff(diff))) {
      const existing = files.get(parsed.path);
      files.set(parsed.path, existing === void 0 ? parsed : mergeFile(existing, parsed));
    }
    for (const changed of workingTree.files) {
      const existing = files.get(changed.path);
      const metadata = {
        additions: 0,
        binary: false,
        deletions: 0,
        hunks: [],
        ...changed.originalPath === void 0 ? {} : { originalPath: changed.originalPath },
        path: changed.path,
        status: statusFor(changed),
        symbols: []
      };
      files.set(changed.path, existing === void 0 ? metadata : {
        ...existing,
        status: metadata.status,
        ...metadata.originalPath === void 0 ? {} : { originalPath: metadata.originalPath }
      });
    }
    const analyzed = [...files.values()].map((file) => ({
      ...file,
      classifications: classifyChangedPath(file.path)
    })).sort((left, right) => left.path.localeCompare(right.path));
    return {
      clean: analyzed.length === 0,
      files: analyzed,
      summary: {
        additions: analyzed.reduce((total, file) => total + file.additions, 0),
        changedFiles: analyzed.length,
        deletions: analyzed.reduce((total, file) => total + file.deletions, 0)
      }
    };
  } catch (error) {
    if (error instanceof GitAnalysisError || error instanceof GitBaseError)
      throw error;
    throw new GitAnalysisError({ cause: error });
  }
}

// packages/git/dist/history.js
var RECORD_SEPARATOR = "";
function parsePathHistory(output) {
  return output.split(RECORD_SEPARATOR).map((chunk) => chunk.split(/\r?\n/u).filter((line) => line.length > 0)).filter((lines) => lines.length > 0).map((lines) => {
    const [committedAt, ...paths] = lines;
    if (committedAt === void 0 || !Number.isFinite(Date.parse(committedAt))) {
      throw new GitAnalysisError();
    }
    return {
      committedAt: new Date(committedAt).toISOString(),
      paths: [...new Set(paths.map((path) => path.replaceAll("\\", "/")))].sort()
    };
  });
}
async function listPathHistory(root, paths, since, runner = defaultGitRunner) {
  if (paths.length === 0)
    return [];
  if (!Number.isFinite(Date.parse(since)))
    throw new GitAnalysisError();
  try {
    return parsePathHistory(await runner.run([
      "-c",
      "core.quotePath=false",
      "log",
      `--since=${new Date(since).toISOString()}`,
      "--format=%x1e%cI",
      "--name-only",
      "--",
      ...paths
    ], root));
  } catch (error) {
    if (error instanceof GitAnalysisError)
      throw error;
    if (/does not have any commits yet/u.test(String(error.stderr))) {
      return [];
    }
    throw new GitAnalysisError({ cause: error });
  }
}

// packages/git/dist/index.js
var GitAnalysisError = class extends Error {
  code = "GIT_ANALYSIS_FAILED";
  remediation = "Confirm this directory is a readable Git repository and Git is installed.";
  constructor(options) {
    super("Unable to inspect the Git working tree.", options);
    this.name = "GitAnalysisError";
  }
};
var runExecFile = (0, import_node_util.promisify)(import_node_child_process.execFile);
var defaultGitRunner = {
  async run(args, cwd) {
    const result = await runExecFile("git", [...args], {
      cwd,
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 1e4,
      windowsHide: true
    });
    return result.stdout;
  }
};
function status(code) {
  if (code === " " || code.length === 0)
    return "unchanged";
  if (code === "?")
    return "untracked";
  if (code === "A")
    return "added";
  if (code === "D")
    return "deleted";
  if (code === "M")
    return "modified";
  if (code === "R")
    return "renamed";
  if (code === "C")
    return "copied";
  return "conflicted";
}
function parsePorcelainStatus(output) {
  const records = output.split("\0");
  const files = [];
  for (let index = 0; index < records.length; index += 1) {
    const record4 = records[index];
    if (record4 === void 0 || record4.length === 0)
      continue;
    if (record4.length < 4 || record4[2] !== " ") {
      throw new GitAnalysisError();
    }
    const indexCode = record4[0];
    const worktreeCode = record4[1];
    const path = record4.slice(3).replaceAll("\\", "/");
    const isRename = indexCode === "R" || indexCode === "C";
    const original = isRename ? records[index + 1] : void 0;
    if (isRename)
      index += 1;
    files.push({
      indexStatus: indexCode === "?" && worktreeCode === "?" ? "untracked" : status(indexCode),
      path,
      worktreeStatus: indexCode === "?" && worktreeCode === "?" ? "untracked" : status(worktreeCode),
      ...original === void 0 ? {} : { originalPath: original.replaceAll("\\", "/") }
    });
  }
  return files;
}
function category(file) {
  if (file.indexStatus === "conflicted" || file.worktreeStatus === "conflicted")
    return "conflicted";
  if (file.indexStatus === "untracked")
    return "untracked";
  if (file.indexStatus === "renamed" || file.worktreeStatus === "renamed")
    return "renamed";
  if (file.indexStatus === "deleted" || file.worktreeStatus === "deleted")
    return "deleted";
  if (file.indexStatus === "added" || file.worktreeStatus === "added")
    return "added";
  return "modified";
}
async function analyzeWorkingTree(root, runner = defaultGitRunner) {
  try {
    const files = parsePorcelainStatus(await runner.run(["status", "--porcelain=v1", "-z", "--untracked-files=all"], root));
    const summary3 = {
      added: 0,
      conflicted: 0,
      deleted: 0,
      modified: 0,
      renamed: 0,
      untracked: 0
    };
    for (const file of files)
      summary3[category(file)] += 1;
    return { clean: files.length === 0, files, summary: summary3 };
  } catch (error) {
    if (error instanceof GitAnalysisError)
      throw error;
    throw new GitAnalysisError({ cause: error });
  }
}

// packages/memory/dist/model.js
var QA_MEMORY_SCHEMA_VERSION = 1;
var MemoryError = class extends Error {
  code;
  remediation;
  constructor(code, message, remediation, options) {
    super(message, options);
    this.code = code;
    this.remediation = remediation;
    this.name = "MemoryError";
  }
};

// packages/memory/dist/relevance.js
var import_promises4 = require("node:fs/promises");
var import_node_path6 = require("node:path");
var MEMORY_RELEVANCE_PENALTIES = {
  age: { overOneYear: 10, overSixMonths: 5 },
  regressionTestsChanged: { rewritten: 20, touched: 10 },
  regressionTestsMissing: 30,
  relatedContractsInactive: 25,
  relatedFilesMissing: 35,
  superseded: 70
};
var HIGH_THRESHOLD = 70;
var MEDIUM_THRESHOLD = 40;
var REWRITTEN_COMMITS = 3;
var DAY = 864e5;
var LISTED_PATHS = 5;
function list(items) {
  const shown = items.slice(0, LISTED_PATHS).join(", ");
  return items.length > LISTED_PATHS ? `${shown}, and ${items.length - LISTED_PATHS} more` : shown;
}
function noun(count2, singular, pluralForm = `${singular}s`) {
  return count2 === 1 ? singular : pluralForm;
}
function counted(count2, singular, pluralForm = `${singular}s`) {
  return `${count2} ${noun(count2, singular, pluralForm)}`;
}
function share(penalty, affected, total) {
  return -Math.round(penalty * affected / total);
}
function supersededBy(records) {
  const result = /* @__PURE__ */ new Map();
  for (const record4 of records) {
    for (const older of record4.supersedes) {
      if (older === record4.id)
        continue;
      result.set(older, [...result.get(older) ?? [], record4.id].sort());
    }
  }
  return result;
}
function memoryRelevanceLevel(score) {
  if (score >= HIGH_THRESHOLD)
    return "high";
  if (score >= MEDIUM_THRESHOLD)
    return "medium";
  return "low";
}
function relatedFilesSignal(record4, existingPaths) {
  const total = record4.relatedFiles.length;
  if (total === 0)
    return void 0;
  const missing = record4.relatedFiles.filter((path) => !existingPaths.has(path)).sort();
  if (missing.length === 0) {
    return {
      code: "related-files-present",
      message: `${total === 1 ? "The originally affected file still exists" : `All ${total} originally affected files still exist`}: ${list([...record4.relatedFiles].sort())}.`,
      paths: [...record4.relatedFiles].sort(),
      points: 0
    };
  }
  return {
    code: "related-files-present",
    message: missing.length === total ? `${total === 1 ? "The originally affected file no longer exists" : `None of the ${total} originally affected files still exist`}: ${list(missing)}.` : `${missing.length} of ${total} originally affected files no longer exist: ${list(missing)}.`,
    paths: missing,
    points: share(MEMORY_RELEVANCE_PENALTIES.relatedFilesMissing, missing.length, total)
  };
}
function regressionTestsSignal(record4, existingPaths) {
  const paths = [...new Set(record4.regressionTests.map((test) => test.path))].sort();
  if (paths.length === 0)
    return void 0;
  const missing = paths.filter((path) => !existingPaths.has(path));
  if (missing.length === 0) {
    return {
      code: "regression-tests-present",
      message: `Recorded regression ${noun(paths.length, "test")} still ${paths.length === 1 ? "exists" : "exist"}: ${list(paths)}.`,
      paths,
      points: 0
    };
  }
  return {
    code: "regression-tests-present",
    message: `Recorded regression ${noun(missing.length, "test")} no longer ${missing.length === 1 ? "exists" : "exist"}: ${list(missing)}.`,
    paths: missing,
    points: share(MEMORY_RELEVANCE_PENALTIES.regressionTestsMissing, missing.length, paths.length)
  };
}
function relatedContractsSignal(record4, contracts) {
  const total = record4.relatedContracts.length;
  if (total === 0)
    return void 0;
  const statuses = new Map(contracts.map((contract) => [contract.id, contract.status]));
  const sorted = [...record4.relatedContracts].sort();
  const missing = sorted.filter((id) => !statuses.has(id));
  const deprecated = sorted.filter((id) => statuses.get(id) === "deprecated");
  const inactive = missing.length + deprecated.length;
  if (inactive === 0) {
    return {
      code: "related-contracts-active",
      message: `Related Quality ${noun(total, "Contract")} ${total === 1 ? "remains" : "remain"} active: ${list(sorted.map((id) => `${id} (${statuses.get(id)})`))}.`,
      points: 0
    };
  }
  const details = [
    ...missing.length === 0 ? [] : [`no longer ${missing.length === 1 ? "exists" : "exist"}: ${list(missing)}`],
    ...deprecated.length === 0 ? [] : [`${deprecated.length === 1 ? "is" : "are"} deprecated: ${list(deprecated)}`]
  ];
  return {
    code: "related-contracts-active",
    message: `Related Quality ${noun(inactive, "Contract")} ${details.join("; ")}.`,
    points: share(MEMORY_RELEVANCE_PENALTIES.relatedContractsInactive, inactive, total)
  };
}
function regressionTestsChangedSignal(record4, history, existingPaths) {
  const paths = [...new Set(record4.regressionTests.map((test) => test.path))].filter((path) => existingPaths === void 0 || existingPaths.has(path)).sort();
  if (paths.length === 0)
    return void 0;
  const commits = new Map(paths.map((path) => [path, 0]));
  for (const commit of history) {
    if (commit.committedAt <= record4.createdAt)
      continue;
    for (const path of commit.paths) {
      const count2 = commits.get(path);
      if (count2 !== void 0)
        commits.set(path, count2 + 1);
    }
  }
  const changed = [...commits].filter(([, count2]) => count2 > 0);
  if (changed.length === 0) {
    return {
      code: "regression-tests-changed",
      message: `Recorded regression ${noun(paths.length, "test")} ${paths.length === 1 ? "is" : "are"} unchanged since the record was created.`,
      paths,
      points: 0
    };
  }
  const most = Math.max(...changed.map(([, count2]) => count2));
  const rewritten = most >= REWRITTEN_COMMITS;
  return {
    code: "regression-tests-changed",
    message: `Recorded regression ${noun(changed.length, "test")} changed${rewritten ? " significantly" : ""} since the record was created (${counted(most, "commit")}): ${list(changed.map(([path]) => path))}.`,
    paths: changed.map(([path]) => path),
    points: rewritten ? -MEMORY_RELEVANCE_PENALTIES.regressionTestsChanged.rewritten : -MEMORY_RELEVANCE_PENALTIES.regressionTestsChanged.touched
  };
}
function ageSignal(record4, now) {
  const days = Math.floor((Date.parse(now) - Date.parse(record4.createdAt)) / DAY);
  if (!Number.isFinite(days) || days < 180)
    return void 0;
  return {
    code: "age",
    message: `Record is ${counted(days, "day")} old.`,
    points: days >= 365 ? -MEMORY_RELEVANCE_PENALTIES.age.overOneYear : -MEMORY_RELEVANCE_PENALTIES.age.overSixMonths
  };
}
function currentChangeSignal(match) {
  if (match.exactFileMatches.length > 0) {
    return {
      code: "current-change",
      message: `Current change modifies ${match.exactFileMatches.length === 1 ? "an originally affected file" : `${match.exactFileMatches.length} originally affected files`}: ${list(match.exactFileMatches)}.`,
      paths: match.exactFileMatches,
      points: 0
    };
  }
  if (match.matchedTerms.length > 0) {
    return {
      code: "current-change",
      message: `Current change matches by shared vocabulary only: ${match.matchedTerms.join(", ")}.`,
      points: 0
    };
  }
  return void 0;
}
function assessMemoryRelevance(record4, records, context = {}, match = {
  exactFileMatches: [],
  matchedTerms: []
}) {
  const newer = supersededBy(records).get(record4.id) ?? [];
  const signals = [
    currentChangeSignal(match),
    newer.length === 0 ? void 0 : {
      code: "superseded",
      message: `Superseded by newer QA ${noun(newer.length, "memory", "memories")}: ${newer.join(", ")}.`,
      points: -MEMORY_RELEVANCE_PENALTIES.superseded
    },
    context.existingPaths === void 0 ? void 0 : relatedFilesSignal(record4, context.existingPaths),
    context.contracts === void 0 ? void 0 : relatedContractsSignal(record4, context.contracts),
    context.existingPaths === void 0 ? void 0 : regressionTestsSignal(record4, context.existingPaths),
    context.history === void 0 ? void 0 : regressionTestsChangedSignal(record4, context.history, context.existingPaths),
    context.now === void 0 ? void 0 : ageSignal(record4, context.now)
  ].filter((signal) => signal !== void 0);
  const score = Math.max(0, Math.min(100, 100 + signals.reduce((total, signal) => total + signal.points, 0)));
  return { level: memoryRelevanceLevel(score), score, signals, supersededBy: newer };
}
async function buildMemoryRelevanceContext(root, records, options = {}) {
  const testPaths = [
    ...new Set(records.flatMap((record4) => record4.regressionTests.map((test) => test.path)))
  ].sort();
  const paths = [
    .../* @__PURE__ */ new Set([...testPaths, ...records.flatMap((record4) => record4.relatedFiles)])
  ].sort();
  const existing = await Promise.all(paths.map(async (path) => {
    try {
      await (0, import_promises4.access)((0, import_node_path6.resolve)(root, path));
      return path;
    } catch {
      return void 0;
    }
  }));
  const since = [...records.map((record4) => record4.createdAt)].sort()[0];
  const history = since === void 0 || testPaths.length === 0 ? [] : await listPathHistory(root, testPaths, since, options.runner);
  return {
    existingPaths: new Set(existing.filter((path) => path !== void 0)),
    history,
    now: (options.now ?? /* @__PURE__ */ new Date()).toISOString()
  };
}

// packages/memory/dist/repository.js
var import_promises5 = require("node:fs/promises");
var import_node_path7 = require("node:path");

// packages/memory/dist/validation.js
var CONTRACT_ID2 = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
var MEMORY_ID = /^MEM-[0-9]{4,}$/u;
var REGRESSION_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
var REQUIREMENT_REF = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}#[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/u;
var SEVERITIES = /* @__PURE__ */ new Set(["critical", "high", "info", "low", "medium"]);
var SOURCES = /* @__PURE__ */ new Set([
  "coding-agent",
  "github",
  "manual",
  "production",
  "verification"
]);
var TYPES = /* @__PURE__ */ new Set([
  "bug",
  "contract-amendment",
  "flaky-test",
  "production-incident",
  "regression",
  "risk-override",
  "security-finding",
  "security-regression",
  "sensitive-integration"
]);
function invalid(message, remediation) {
  throw new MemoryError("MEMORY_INVALID", message, remediation);
}
function record2(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    invalid("A QA memory record must be a JSON object.", "Provide the documented memory fields.");
  }
  return value;
}
function stringValue(input, key, maximum) {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum) {
    invalid(`${key} must be a non-empty string no longer than ${maximum} characters.`, `Correct ${key} in the memory input and retry.`);
  }
  return value.trim();
}
function projectPath(value, field) {
  const normalized2 = value.trim().replaceAll("\\", "/");
  if (normalized2.length === 0 || normalized2.length > 500 || normalized2.startsWith("/") || /^[A-Za-z]:\//u.test(normalized2) || normalized2.split("/").some((segment) => segment === ".." || segment.length === 0)) {
    invalid(`${field} must be a portable path inside the project root: ${value}`, "Use a relative path without parent traversal or empty segments.");
  }
  return normalized2;
}
function strings(input, key, maximumItems, itemMaximum) {
  const value = input[key];
  if (!Array.isArray(value) || value.length > maximumItems) {
    invalid(`${key} must be an array with at most ${maximumItems} items.`, `Correct ${key}.`);
  }
  const result = value.map((item) => {
    if (typeof item !== "string" || item.trim().length === 0 || item.length > itemMaximum) {
      invalid(`${key} contains an invalid string.`, `Correct every item in ${key}.`);
    }
    return item.trim();
  });
  return [...new Set(result)];
}
function regressionTests(input) {
  const value = input.regressionTests;
  if (!Array.isArray(value) || value.length > 50) {
    invalid("regressionTests must contain at most 50 items.", "Correct regressionTests.");
  }
  return value.map((item, index) => {
    const test = record2(item);
    const unknown = Object.keys(test).filter((key) => !["adapter", "id", "path", "requirementRefs"].includes(key));
    const id = stringValue(test, "id", 100);
    if (unknown.length > 0 || test.adapter !== "vitest" && test.adapter !== "jest" && test.adapter !== "playwright" || !REGRESSION_ID.test(id)) {
      invalid(`regressionTests[${index}] is invalid.`, "Use a vitest/jest/playwright adapter, kebab-case ID, project path, and requirement references.");
    }
    const requirementRefs = strings(test, "requirementRefs", 100, 241);
    if (requirementRefs.some((reference) => !REQUIREMENT_REF.test(reference))) {
      invalid(`regressionTests[${index}].requirementRefs contains an invalid reference.`, "Use contract-id#requirement-id references.");
    }
    return {
      adapter: test.adapter,
      id,
      path: projectPath(stringValue(test, "path", 500), `regressionTests[${index}].path`),
      requirementRefs
    };
  });
}
function parseMemoryRecordInput(value, options = {}) {
  const input = record2(value);
  const allowed = /* @__PURE__ */ new Set([
    "regressionTests",
    "relatedContracts",
    "relatedFiles",
    "rootCause",
    "severity",
    "source",
    "summary",
    "supersedes",
    "tags",
    "title",
    "type"
  ]);
  const unknown = Object.keys(input).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    invalid(`Unknown memory field${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}.`, "Remove fields that are not part of schema version 1.");
  }
  const type = stringValue(input, "type", 80);
  const severity2 = stringValue(input, "severity", 20);
  const sourceValue = input.source ?? options.defaultSource ?? "manual";
  if (!TYPES.has(type) || !SEVERITIES.has(severity2) || !SOURCES.has(sourceValue)) {
    invalid("Memory type, severity, or source is unsupported.", "Use a published type, severity, and source value.");
  }
  const relatedContracts = strings(input, "relatedContracts", 50, 120);
  if (relatedContracts.some((id) => !CONTRACT_ID2.test(id))) {
    invalid("relatedContracts contains an invalid ID.", "Use lowercase kebab-case contract IDs.");
  }
  const supersedes = input.supersedes === void 0 ? [] : strings(input, "supersedes", 50, 20).sort();
  if (supersedes.some((id) => !MEMORY_ID.test(id))) {
    invalid("supersedes contains an invalid QA memory ID.", "Use identifiers such as MEM-0001.");
  }
  return {
    regressionTests: regressionTests(input),
    relatedContracts,
    relatedFiles: strings(input, "relatedFiles", 100, 500).map((path) => projectPath(path, "relatedFiles")),
    rootCause: stringValue(input, "rootCause", 5e3),
    severity: severity2,
    source: sourceValue,
    summary: stringValue(input, "summary", 1e4),
    supersedes,
    tags: strings(input, "tags", 100, 80).map((tag) => tag.toLowerCase()),
    title: stringValue(input, "title", 300),
    type
  };
}
function parseStoredMemoryRecord(value, path) {
  const input = record2(value);
  if (input.schemaVersion !== 1 || input.status !== "active" || typeof input.id !== "string" || !MEMORY_ID.test(input.id) || typeof input.createdAt !== "string" || !Number.isFinite(Date.parse(input.createdAt))) {
    throw new MemoryError("MEMORY_READ_FAILED", `Stored QA memory is invalid: ${path}`, "Repair or remove the invalid memory file, then retry.");
  }
  let parsed;
  try {
    parsed = parseMemoryRecordInput({
      regressionTests: input.regressionTests,
      relatedContracts: input.relatedContracts,
      relatedFiles: input.relatedFiles,
      rootCause: input.rootCause,
      severity: input.severity,
      source: input.source,
      summary: input.summary,
      ...input.supersedes === void 0 ? {} : { supersedes: input.supersedes },
      tags: input.tags,
      title: input.title,
      type: input.type
    }, {
      defaultSource: typeof input.source === "string" ? input.source : void 0
    });
  } catch (error) {
    throw new MemoryError("MEMORY_READ_FAILED", `Stored QA memory is invalid: ${path}`, "Repair or remove the invalid memory file, then retry.", { cause: error });
  }
  if (parsed.supersedes?.includes(input.id)) {
    throw new MemoryError("MEMORY_READ_FAILED", `Stored QA memory supersedes itself: ${path}`, "Repair or remove the invalid memory file, then retry.");
  }
  return {
    ...parsed,
    createdAt: input.createdAt,
    id: input.id,
    schemaVersion: 1,
    source: parsed.source ?? "manual",
    status: "active",
    supersedes: parsed.supersedes ?? []
  };
}

// packages/memory/dist/repository.js
var MEMORY_DIRECTORY = ".maru/memory";
var MEMORY_ID2 = /^MEM-([0-9]{4,})$/u;
function safePath2(root, path) {
  const absoluteRoot = (0, import_node_path7.resolve)(root);
  const target = (0, import_node_path7.resolve)(absoluteRoot, path);
  if (target !== absoluteRoot && !target.startsWith(`${absoluteRoot}${import_node_path7.sep}`)) {
    throw new MemoryError("MEMORY_INVALID", `Path escapes the project root: ${path}`, "Use a QA memory identifier or path inside the current project.");
  }
  return target;
}
async function exists2(path) {
  try {
    await (0, import_promises5.access)(path);
    return true;
  } catch {
    return false;
  }
}
async function requireInitialization2(root) {
  if (!await exists2(safePath2(root, ".maru/maru.yml"))) {
    throw new MemoryError("MEMORY_NOT_INITIALIZED", "MaruCheck is not initialized in this project.", "Run maru init before managing QA memory.");
  }
}
async function memoryFileNames(root) {
  const directory = safePath2(root, MEMORY_DIRECTORY);
  if (!await exists2(directory))
    return [];
  try {
    return (await (0, import_promises5.readdir)(directory, { withFileTypes: true })).filter((entry) => entry.isFile() && /^MEM-[0-9]{4,}\.json$/u.test(entry.name)).map((entry) => entry.name).sort();
  } catch (error) {
    throw new MemoryError("MEMORY_READ_FAILED", "Unable to list QA memory records.", "Check that .maru/memory is readable.", { cause: error });
  }
}
async function readMemoryFile(root, path) {
  try {
    const parsed = JSON.parse(await (0, import_promises5.readFile)(safePath2(root, path), "utf8"));
    return parseStoredMemoryRecord(parsed, path);
  } catch (error) {
    if (error instanceof MemoryError)
      throw error;
    throw new MemoryError("MEMORY_READ_FAILED", `Unable to read QA memory: ${path}`, "Confirm the record is readable JSON using the current schema.", { cause: error });
  }
}
function nextSequence(names) {
  return names.reduce((highest, name) => {
    const match = /^MEM-([0-9]{4,})\.json$/u.exec(name);
    return Math.max(highest, match === null ? 0 : Number(match[1]));
  }, 0) + 1;
}
async function createMemoryRecord(root, input, options = {}) {
  await requireInitialization2(root);
  const normalized2 = parseMemoryRecordInput(input);
  const names = await memoryFileNames(root);
  const missing = (normalized2.supersedes ?? []).filter((id) => !names.includes(`${id}.json`));
  if (missing.length > 0) {
    throw new MemoryError("MEMORY_NOT_FOUND", `Superseded QA memory not found: ${missing.join(", ")}`, "Only supersede records listed by maru memory list.");
  }
  let sequence = nextSequence(names);
  for (let attempt = 0; attempt < 100; attempt += 1, sequence += 1) {
    const id = `MEM-${String(sequence).padStart(4, "0")}`;
    const record4 = {
      ...normalized2,
      createdAt: (options.now ?? /* @__PURE__ */ new Date()).toISOString(),
      id,
      schemaVersion: QA_MEMORY_SCHEMA_VERSION,
      source: normalized2.source ?? "manual",
      status: "active",
      supersedes: normalized2.supersedes ?? []
    };
    const path = `${MEMORY_DIRECTORY}/${id}.json`;
    try {
      const target = safePath2(root, path);
      await (0, import_promises5.mkdir)((0, import_node_path7.dirname)(target), { recursive: true });
      await (0, import_promises5.writeFile)(target, `${JSON.stringify(record4, null, 2)}
`, {
        encoding: "utf8",
        flag: "wx"
      });
      return { path, record: record4 };
    } catch (error) {
      if (error.code === "EEXIST")
        continue;
      throw new MemoryError("MEMORY_WRITE_FAILED", "Unable to write the QA memory record.", "Check project permissions and available disk space.", { cause: error });
    }
  }
  throw new MemoryError("MEMORY_WRITE_FAILED", "Unable to allocate a unique QA memory identifier.", "Retry after checking .maru/memory for an unusually high write rate.");
}
async function listMemoryRecords(root) {
  await requireInitialization2(root);
  const records = await Promise.all((await memoryFileNames(root)).map((name) => readMemoryFile(root, `${MEMORY_DIRECTORY}/${name}`)));
  return records.sort((left, right) => right.createdAt.localeCompare(left.createdAt) || right.id.localeCompare(left.id));
}
async function getMemoryRecord(root, id) {
  await requireInitialization2(root);
  if (!MEMORY_ID2.test(id)) {
    throw new MemoryError("MEMORY_INVALID", `Invalid QA memory identifier: ${id}`, "Use an identifier such as MEM-0001 from maru memory list.");
  }
  const path = `${MEMORY_DIRECTORY}/${id}.json`;
  if (!await exists2(safePath2(root, path))) {
    throw new MemoryError("MEMORY_NOT_FOUND", `QA memory not found: ${id}`, "Run maru memory list or search for a related record.");
  }
  return readMemoryFile(root, path);
}

// packages/memory/dist/matching.js
var STOP_WORDS = /* @__PURE__ */ new Set([
  "access",
  "account",
  "active",
  "another",
  "change",
  "could",
  "file",
  "historical",
  "later",
  "manual",
  "missing",
  "record",
  "regression",
  "security",
  "service",
  "services",
  "tests",
  "users",
  "with"
]);
function stem(term) {
  return term.length > 4 && term.endsWith("s") ? term.slice(0, -1) : term;
}
function terms(text2) {
  const separated = text2.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").toLowerCase();
  return new Set(separated.split(/[^a-z0-9]+/u).map(stem).filter((term) => term.length >= 4 && !STOP_WORDS.has(term)));
}
function intersection(left, right) {
  return [...left].filter((term) => right.has(term)).sort();
}
function searchableFields(record4) {
  return {
    id: record4.id,
    regressionTests: record4.regressionTests.map((test) => `${test.id} ${test.path}`).join(" "),
    relatedContracts: record4.relatedContracts.join(" "),
    relatedFiles: record4.relatedFiles.join(" "),
    rootCause: record4.rootCause,
    summary: record4.summary,
    tags: record4.tags.join(" "),
    title: record4.title,
    type: record4.type
  };
}
function searchMemory(records, query) {
  const queryTerms = terms(query);
  if (query.trim().length === 0 || queryTerms.size === 0) {
    throw new MemoryError("MEMORY_INVALID", "A meaningful memory search query is required.", "Search for a bug ID, contract, path, root cause, or tag.");
  }
  return records.map((record4) => {
    const fields = searchableFields(record4);
    const matchedFields = [];
    const matchedTerms = /* @__PURE__ */ new Set();
    let score = 0;
    for (const [field, value] of Object.entries(fields)) {
      const matches = intersection(queryTerms, terms(value));
      if (matches.length === 0)
        continue;
      matchedFields.push(field);
      for (const match of matches)
        matchedTerms.add(match);
      score += matches.length * (field === "tags" || field === "id" ? 4 : 2);
    }
    if (matchedTerms.size === 0)
      return void 0;
    return {
      matchedFields: matchedFields.sort(),
      matchedTerms: [...matchedTerms].sort(),
      record: record4,
      score
    };
  }).filter((match) => match !== void 0).sort((left, right) => right.score - left.score || right.record.createdAt.localeCompare(left.record.createdAt));
}
async function searchMemoryRecords(root, query) {
  return searchMemory(await listMemoryRecords(root), query);
}
function matchHistoricalRisks(analysis, records, context = {}) {
  if (analysis.clean)
    return [];
  const changedPaths = new Set(analysis.files.map((file) => file.path.replaceAll("\\", "/")));
  const changedTerms = terms(analysis.files.flatMap((file) => [file.path, ...file.symbols, ...file.classifications]).join(" "));
  return records.map((record4) => {
    if (record4.status !== "active")
      return void 0;
    const exactFileMatches = record4.relatedFiles.filter((path) => changedPaths.has(path)).sort();
    const memoryTerms = terms(Object.values(searchableFields(record4)).join(" "));
    const matchedTerms = intersection(changedTerms, memoryTerms);
    if (exactFileMatches.length === 0 && matchedTerms.length < 2)
      return void 0;
    const reasons = [
      ...exactFileMatches.length === 0 ? [] : [`Changed ${exactFileMatches.length} file linked to historical memory ${record4.id}.`],
      ...matchedTerms.length === 0 ? [] : [`Matches historical terms for ${record4.id}: ${matchedTerms.join(", ")}.`]
    ];
    return {
      exactFileMatches,
      matchedTerms,
      memoryId: record4.id,
      reasons,
      regressionTests: record4.regressionTests,
      relatedContracts: record4.relatedContracts,
      relevance: assessMemoryRelevance(record4, records, context, {
        exactFileMatches,
        matchedTerms
      }),
      severity: record4.severity,
      title: record4.title,
      type: record4.type
    };
  }).filter((match) => match !== void 0).sort((left, right) => left.memoryId.localeCompare(right.memoryId));
}

// packages/risk/dist/index.js
var STOP_WORDS2 = /* @__PURE__ */ new Set([
  "after",
  "again",
  "against",
  "application",
  "before",
  "change",
  "changes",
  "code",
  "contract",
  "data",
  "default",
  "each",
  "exactly",
  "feature",
  "file",
  "from",
  "function",
  "handle",
  "management",
  "must",
  "never",
  "only",
  "project",
  "remain",
  "return",
  "state",
  "that",
  "their",
  "this",
  "updates",
  "verified",
  "with"
]);
var CLASSIFICATION_POINTS = {
  "api-contract": { message: "Changes an API or webhook contract boundary.", points: 12 },
  authentication: { message: "Touches authentication behavior.", points: 20 },
  authorization: { message: "Touches authorization or permission enforcement.", points: 25 },
  "background-job": { message: "Changes asynchronous or scheduled work.", points: 12 },
  billing: { message: "Touches billing, payments, invoices, or subscriptions.", points: 30 },
  "business-logic": { message: "Changes production business logic.", points: 10 },
  configuration: { message: "Changes runtime or build configuration.", points: 5 },
  database: { message: "Changes database-facing behavior.", points: 15 },
  "dependency-upgrade": { message: "Changes declared or locked dependencies.", points: 12 },
  "external-integration": { message: "Touches an external integration or webhook.", points: 15 },
  migration: { message: "Changes a schema or data migration.", points: 25 },
  observability: { message: "Changes observability behavior.", points: 4 },
  "performance-sensitive": { message: "Touches a performance-sensitive path.", points: 8 },
  "security-sensitive": { message: "Touches a security-sensitive path.", points: 20 },
  "ui-only": { message: "Changes presentation-only code.", points: 2 }
};
var CRITICALITY_POINTS = {
  low: 2,
  medium: 7,
  high: 15,
  critical: 25
};
var MEMORY_SEVERITY_POINTS = { critical: 25, high: 18, info: 2, low: 5, medium: 10 };
function historicalPoints(memory) {
  const points = MEMORY_SEVERITY_POINTS[memory.severity];
  if (memory.relevance.level === "high")
    return points;
  if (memory.relevance.level === "medium")
    return Math.round(points / 2);
  return 0;
}
function terms2(text2) {
  const separated = text2.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").toLowerCase();
  return new Set(separated.split(/[^a-z0-9]+/u).filter((term) => term.length >= 4 && !STOP_WORDS2.has(term)));
}
function changeTerms(files) {
  return terms2(files.map((file) => `${file.path} ${file.symbols.join(" ")}`).join(" "));
}
function intersect(left, right) {
  return [...left].filter((term) => right.has(term)).sort();
}
function matchContract(contract, changedTerms) {
  const allText = [
    contract.id,
    contract.title,
    contract.intent,
    ...contract.owners,
    ...contract.requirements.map((item) => item.statement),
    ...contract.invariants.map((item) => item.statement),
    ...contract.edgeCases,
    ...contract.security,
    ...contract.dataIntegrity
  ].join(" ");
  const matchedTerms = intersect(changedTerms, terms2(allText));
  if (matchedTerms.length === 0)
    return void 0;
  const matchesItem = (statement) => intersect(changedTerms, terms2(statement)).length > 0;
  return {
    contractId: contract.id,
    criticality: contract.criticality,
    invariantIds: contract.invariants.filter((item) => matchesItem(item.statement)).map((item) => item.id),
    matchedTerms,
    requirementIds: contract.requirements.filter((item) => matchesItem(item.statement)).map((item) => item.id),
    status: contract.status,
    title: contract.title
  };
}
function changedPathsFor(analysis, classification) {
  return analysis.files.filter((file) => file.classifications.includes(classification)).map((file) => file.path);
}
function addReason(reasons, code, message, points, paths) {
  reasons.push({ code, message, points, ...paths === void 0 ? {} : { paths } });
}
function riskLevelForScore(score) {
  if (score <= 24)
    return "low";
  if (score <= 49)
    return "moderate";
  if (score <= 74)
    return "high";
  return "critical";
}
function recommendations(level, classifications, relatedContracts, historicalRisks) {
  const result = /* @__PURE__ */ new Set(["unit"]);
  const relevantHistory = historicalRisks.filter((memory) => memory.relevance.level !== "low");
  if (classifications.has("api-contract") || classifications.has("external-integration") || classifications.has("database")) {
    result.add("api");
    result.add("integration");
  }
  if (classifications.has("security-sensitive") || classifications.has("authentication") || classifications.has("authorization") || classifications.has("billing")) {
    result.add("security");
  }
  if (classifications.has("ui-only"))
    result.add("accessibility");
  if (relatedContracts.length > 0 || relevantHistory.length > 0)
    result.add("contract-regression");
  if (relevantHistory.some((memory) => memory.type === "security-finding" || memory.type === "security-regression")) {
    result.add("security");
  }
  if (relevantHistory.some((memory) => memory.regressionTests.some((test) => test.adapter === "playwright"))) {
    result.add("e2e");
  }
  if (level === "high" || level === "critical")
    result.add("e2e");
  if (level === "critical")
    result.add("adversarial-edge-cases");
  return [...result].sort();
}
function assessRisk(analysis, contracts, memories = [], memoryContext = {}) {
  if (analysis.clean) {
    return {
      analysis,
      historicalRisks: [],
      level: "low",
      reasons: [{ code: "clean", message: "The Git working tree has no changes.", points: 0 }],
      recommendedTestCategories: [],
      relatedContracts: [],
      score: 0
    };
  }
  const reasons = [];
  const historicalRisks = matchHistoricalRisks(analysis, memories, {
    ...memoryContext,
    contracts: contracts.map((contract) => ({ id: contract.id, status: contract.status }))
  });
  const classifications = new Set(analysis.files.flatMap((file) => file.classifications));
  for (const [classification, factor] of Object.entries(CLASSIFICATION_POINTS)) {
    if (!classifications.has(classification))
      continue;
    addReason(reasons, classification, factor.message, factor.points, changedPathsFor(analysis, classification));
  }
  const changedLineCount = analysis.summary.additions + analysis.summary.deletions;
  const sizePoints = changedLineCount >= 200 ? 15 : changedLineCount >= 50 ? 10 : changedLineCount >= 10 ? 5 : 0;
  if (sizePoints > 0) {
    addReason(reasons, "change-size", `Changes ${changedLineCount} added or deleted lines.`, sizePoints);
  }
  const blastPoints = analysis.summary.changedFiles >= 20 ? 15 : analysis.summary.changedFiles >= 8 ? 10 : analysis.summary.changedFiles >= 3 ? 5 : 0;
  if (blastPoints > 0) {
    addReason(reasons, "blast-radius", `Touches ${analysis.summary.changedFiles} files.`, blastPoints);
  }
  const relatedContracts = contracts.map((contract) => matchContract(contract, changeTerms(analysis.files))).filter((match) => match !== void 0).sort((left, right) => left.contractId.localeCompare(right.contractId));
  if (relatedContracts.length > 0) {
    const highest = relatedContracts.reduce((left, right) => CRITICALITY_POINTS[left.criticality] >= CRITICALITY_POINTS[right.criticality] ? left : right);
    addReason(reasons, "contract-criticality", `Matches ${highest.criticality} Quality Contract ${highest.contractId}.`, CRITICALITY_POINTS[highest.criticality]);
    const unapproved = relatedContracts.filter((contract) => contract.status !== "approved");
    if (unapproved.length > 0) {
      addReason(reasons, "contract-unapproved", `Related contract intent still requires approval: ${unapproved.map((item) => item.contractId).join(", ")}.`, 5);
    }
  }
  const productionChange = [...classifications].some((classification) => [
    "api-contract",
    "authentication",
    "authorization",
    "background-job",
    "billing",
    "business-logic",
    "database",
    "external-integration",
    "migration",
    "security-sensitive"
  ].includes(classification));
  if (productionChange && relatedContracts.length === 0) {
    addReason(reasons, "missing-contract", "No Quality Contract could be related to this production change.", 8);
  }
  if (productionChange && !classifications.has("test")) {
    addReason(reasons, "tests-unchanged", "Production code changed without a changed test file.", 7);
  }
  const relevantHistory = historicalRisks.filter((memory) => memory.relevance.level !== "low");
  const staleHistory = historicalRisks.filter((memory) => memory.relevance.level === "low");
  if (relevantHistory.length > 0) {
    const highest = relevantHistory.reduce((left, right) => historicalPoints(left) >= historicalPoints(right) ? left : right);
    addReason(reasons, "historical-regression", `Touches code related to ${relevantHistory.length} relevant historical QA memor${relevantHistory.length === 1 ? "y" : "ies"}; highest is ${highest.memoryId} (${highest.severity}, ${highest.relevance.level} relevance): ${highest.title}.`, historicalPoints(highest), [...new Set(relevantHistory.flatMap((memory) => memory.exactFileMatches))].sort());
  }
  if (staleHistory.length > 0) {
    addReason(reasons, "historical-stale", `Preserved ${staleHistory.length} low-relevance historical QA memor${staleHistory.length === 1 ? "y" : "ies"} without a risk increase: ${staleHistory.map((memory) => memory.memoryId).join(", ")}.`, 0);
  }
  const rawScore = reasons.reduce((total, reason) => total + reason.points, 0);
  const score = Math.min(100, rawScore);
  const level = riskLevelForScore(score);
  return {
    analysis,
    historicalRisks,
    level,
    reasons,
    recommendedTestCategories: recommendations(level, classifications, relatedContracts, historicalRisks),
    relatedContracts,
    score
  };
}
async function assessProjectRisk(root, options = {}) {
  const [analysis, summaries, memories] = await Promise.all([
    analyzeGitDiff(root, void 0, options.base === void 0 ? {} : { base: options.base }),
    listContracts(root),
    listMemoryRecords(root)
  ]);
  const [contracts, memoryContext] = await Promise.all([
    Promise.all(summaries.map((summary3) => getContract(root, summary3.id))),
    buildMemoryRelevanceContext(root, memories, { now: options.now ?? /* @__PURE__ */ new Date() })
  ]);
  return assessRisk(analysis, contracts, memories, memoryContext);
}

// packages/planner/dist/index.js
var VERIFICATION_PLAN_SCHEMA_VERSION = 1;
var VERIFICATION_PLAN_PATH = ".maru/generated/verification-plan.json";
var VerificationPlanError = class extends Error {
  code = "PLAN_WRITE_FAILED";
  remediation = "Check project directory permissions and available disk space.";
  constructor(options) {
    super("Unable to write the verification plan.", options);
    this.name = "VerificationPlanError";
  }
};
var STOP_WORDS3 = /* @__PURE__ */ new Set([
  "contract",
  "e2e",
  "exactly",
  "from",
  "management",
  "must",
  "never",
  "only",
  "spec",
  "test",
  "tests",
  "that",
  "this",
  "verified",
  "with"
]);
function terms3(text2) {
  const separated = text2.replace(/([a-z0-9])([A-Z])/gu, "$1 $2").toLowerCase();
  return new Set(separated.split(/[^a-z0-9]+/u).filter((term) => term.length >= 4 && !STOP_WORDS3.has(term)));
}
function intersection2(left, right) {
  return [...left].filter((term) => right.has(term)).sort();
}
function requirementRef(requirement) {
  return `${requirement.contractId}#${requirement.id}`;
}
function selectRequirements(assessment, contracts) {
  const contractsById = new Map(contracts.map((contract) => [contract.id, contract]));
  const selected = [];
  for (const match of assessment.relatedContracts) {
    const contract = contractsById.get(match.contractId);
    if (contract === void 0)
      continue;
    const matchedIds = /* @__PURE__ */ new Set([
      ...match.requirementIds,
      ...match.invariantIds,
      ...contract.evidencePolicy.blockingRequirements
    ]);
    const add = (item, kind, priority) => {
      if (!matchedIds.has(item.id))
        return;
      const policyBlocking = contract.evidencePolicy.blockingRequirements.includes(item.id);
      const blocking = contract.status === "approved" && policyBlocking;
      const reasons = [
        ...match.requirementIds.includes(item.id) || match.invariantIds.includes(item.id) ? [`Matched diff terms: ${match.matchedTerms.join(", ")}.`] : [],
        ...policyBlocking ? [
          contract.status === "approved" ? "Selected by the approved contract evidence policy." : "Listed in the draft contract evidence policy; advisory until approved."
        ] : []
      ];
      selected.push({
        blocking,
        contractId: contract.id,
        contractTitle: contract.title,
        id: item.id,
        kind,
        priority,
        reasons,
        statement: item.statement
      });
    };
    for (const requirement of contract.requirements) {
      add(requirement, "requirement", requirement.priority);
    }
    for (const invariant of contract.invariants)
      add(invariant, "invariant", "invariant");
  }
  return selected.sort((left, right) => left.contractId.localeCompare(right.contractId) || left.id.localeCompare(right.id));
}
function selectEveryApprovedRequirement(contracts) {
  const reasons = ["Selected by the strict full contract sweep."];
  return contracts.filter((contract) => contract.status === "approved").flatMap((contract) => {
    const base = { blocking: true, contractId: contract.id, contractTitle: contract.title };
    return [
      ...contract.requirements.map((item) => ({
        ...base,
        id: item.id,
        kind: "requirement",
        priority: item.priority,
        reasons,
        statement: item.statement
      })),
      ...contract.invariants.map((item) => ({
        ...base,
        id: item.id,
        kind: "invariant",
        priority: "invariant",
        reasons,
        statement: item.statement
      }))
    ];
  }).sort((left, right) => left.contractId.localeCompare(right.contractId) || left.id.localeCompare(right.id));
}
function everyTest(project, requirements) {
  const requirementRefs = requirements.map(requirementRef);
  return project.tests.files.map((test) => ({
    framework: test.framework,
    historicalMemoryIds: [],
    matchedTerms: [],
    path: test.path,
    requirementRefs
  })).sort((left, right) => left.path.localeCompare(right.path));
}
function findAffectedTests(assessment, project, requirements) {
  const changeVocabulary = terms3([
    ...assessment.analysis.files.flatMap((file) => [file.path, ...file.symbols]),
    ...assessment.relatedContracts.flatMap((contract) => contract.matchedTerms),
    ...assessment.relatedContracts.map((contract) => contract.contractId)
  ].join(" "));
  const affected = project.tests.files.map((test) => {
    const testTerms = terms3(test.path);
    const matchedTerms = intersection2(changeVocabulary, testTerms);
    if (matchedTerms.length === 0)
      return void 0;
    const requirementRefs = requirements.filter((requirement) => intersection2(testTerms, terms3(`${requirement.contractId} ${requirement.statement}`)).length > 0).map(requirementRef);
    return {
      framework: test.framework,
      historicalMemoryIds: [],
      matchedTerms,
      path: test.path,
      requirementRefs
    };
  }).filter((test) => test !== void 0);
  const byPath = new Map(affected.map((test) => [test.path, test]));
  const discovered = new Map(project.tests.files.map((test) => [test.path, test]));
  for (const memory of assessment.historicalRisks) {
    if (memory.relevance.level === "low")
      continue;
    for (const regression of memory.regressionTests) {
      const test = discovered.get(regression.path);
      if (test === void 0 || test.framework !== regression.adapter)
        continue;
      const existing = byPath.get(test.path);
      byPath.set(test.path, {
        framework: test.framework,
        historicalMemoryIds: [
          .../* @__PURE__ */ new Set([...existing?.historicalMemoryIds ?? [], memory.memoryId])
        ].sort(),
        matchedTerms: [
          .../* @__PURE__ */ new Set([...existing?.matchedTerms ?? [], ...memory.matchedTerms])
        ].sort(),
        path: test.path,
        requirementRefs: [
          .../* @__PURE__ */ new Set([...existing?.requirementRefs ?? [], ...regression.requirementRefs])
        ].sort()
      });
    }
  }
  return [...byPath.values()].sort((left, right) => left.path.localeCompare(right.path));
}
function historicalRegressions(assessment, project) {
  const discovered = new Map(project.tests.files.map((test) => [test.path, test.framework]));
  return assessment.historicalRisks.map((memory) => {
    const available = memory.regressionTests.filter((test) => discovered.get(test.path) === test.adapter);
    const unavailable = memory.regressionTests.filter((test) => discovered.get(test.path) !== test.adapter);
    return {
      availableTestFiles: available.map((test) => test.path).sort(),
      included: memory.relevance.level !== "low",
      memoryId: memory.memoryId,
      missingTestFiles: unavailable.map((test) => test.path).sort(),
      reasons: memory.reasons,
      relevance: memory.relevance,
      requirementRefs: [
        ...new Set(memory.regressionTests.flatMap((test) => test.requirementRefs))
      ].sort(),
      severity: memory.severity,
      title: memory.title
    };
  });
}
function adapterSelectionsFor(category2, project) {
  if (category2 === "security") {
    return [
      { adapter: "gitleaks", execution: "automated" },
      { adapter: "semgrep", execution: "automated" }
    ];
  }
  if (category2 === "adversarial-edge-cases") {
    return [{ adapter: "manual-review", execution: "manual" }];
  }
  if (category2 === "accessibility") {
    const dependencies = /* @__PURE__ */ new Set([
      ...project.dependencies.development,
      ...project.dependencies.production
    ]);
    return project.tests.frameworks.includes("playwright") && dependencies.has("@axe-core/playwright") ? [{ adapter: "axe", execution: "automated", testFramework: "playwright" }] : [{ adapter: "unavailable", execution: "unavailable" }];
  }
  if (category2 === "e2e") {
    const frameworks = ["playwright", "cypress"].filter((framework) => project.tests.frameworks.includes(framework));
    return frameworks.length > 0 ? frameworks.map((framework) => ({
      adapter: framework,
      execution: "automated",
      testFramework: framework
    })) : [{ adapter: "unavailable", execution: "unavailable" }];
  }
  for (const framework of ["vitest", "jest"]) {
    if (project.tests.frameworks.includes(framework)) {
      return [{ adapter: framework, execution: "automated", testFramework: framework }];
    }
  }
  return [{ adapter: "unavailable", execution: "unavailable" }];
}
function createSteps(assessment, project, requirements, affectedTests, strict = false) {
  const requirementRefs = [
    .../* @__PURE__ */ new Set([
      ...requirements.map(requirementRef),
      ...affectedTests.filter((test) => test.historicalMemoryIds.length > 0).flatMap((test) => test.requirementRefs)
    ])
  ].sort();
  const blocking = strict || assessment.level === "high" || assessment.level === "critical" || requirements.some((requirement) => requirement.blocking);
  const targetFiles = assessment.analysis.files.filter((file) => file.status !== "deleted" && !file.binary).map((file) => file.path).sort();
  const categories = strict ? ["contract-regression"] : [...assessment.recommendedTestCategories].sort();
  const selected = categories.flatMap((category2) => adapterSelectionsFor(category2, project).map((selection) => ({ category: category2, selection })));
  const hasRunnableTests = selected.some(({ selection }) => selection.testFramework !== void 0 && affectedTests.some((test) => test.framework === selection.testFramework));
  return selected.map(({ category: category2, selection }, index) => {
    const testFiles = affectedTests.filter((test) => test.framework === selection.testFramework).map((test) => test.path);
    const reasons = [
      `The ${assessment.level} risk assessment recommends ${category2} verification.`,
      selection.execution === "automated" ? selection.adapter === "axe" ? "@axe-core/playwright and Playwright are detected for automated accessibility execution." : selection.adapter === "semgrep" || selection.adapter === "gitleaks" ? `${selection.adapter} is selected; local executable availability is checked at execution time.` : `${selection.adapter} is detected for automated execution.` : selection.execution === "manual" ? `${category2} requires manual review until a supported adapter is available.` : `No supported ${category2} execution adapter is configured.`,
      testFiles.length > 0 ? `Matched ${testFiles.length} existing affected test file${testFiles.length === 1 ? "" : "s"}.` : "No existing affected test file matches this step.",
      requirementRefs.length > 0 ? `Links ${requirementRefs.length} selected contract requirement${requirementRefs.length === 1 ? "" : "s"}.` : "No related contract requirement was selected.",
      ...affectedTests.some((test) => test.framework === selection.testFramework && test.historicalMemoryIds.length > 0) ? ["Includes regression tests selected by matched historical QA memory."] : []
    ];
    return {
      adapter: selection.adapter,
      blocking: category2 === "e2e" && selection.execution === "unavailable" && hasRunnableTests ? false : blocking || category2 === "security",
      category: category2,
      execution: selection.execution,
      id: `step-${String(index + 1).padStart(2, "0")}-${category2}${category2 === "security" || category2 === "e2e" && project.tests.frameworks.includes("cypress") ? `-${selection.adapter}` : ""}`,
      reasons,
      requirementRefs,
      ...selection.adapter === "semgrep" || selection.adapter === "gitleaks" ? { targetFiles } : {},
      testFiles
    };
  });
}
function buildVerificationPlan(input) {
  const strict = input.options?.strict === true;
  const selectedRequirements = strict ? selectEveryApprovedRequirement(input.contracts) : selectRequirements(input.assessment, input.contracts);
  const affectedTests = strict ? everyTest(input.project, selectedRequirements) : findAffectedTests(input.assessment, input.project, selectedRequirements);
  const memoryRegressions = historicalRegressions(input.assessment, input.project);
  const steps = createSteps(input.assessment, input.project, selectedRequirements, affectedTests, strict);
  const covered = new Set(affectedTests.flatMap((test) => test.requirementRefs));
  const uncoveredRequirements = selectedRequirements.map(requirementRef).filter((reference) => !covered.has(reference));
  return {
    affectedTests,
    ...input.options?.base === void 0 ? {} : { base: input.options.base },
    changeSummary: input.assessment.analysis.summary,
    generatedAt: input.generatedAt,
    historicalRegressions: memoryRegressions,
    project: {
      name: input.project.project.name,
      testFrameworks: input.project.tests.frameworks
    },
    risk: { level: input.assessment.level, score: input.assessment.score },
    schemaVersion: VERIFICATION_PLAN_SCHEMA_VERSION,
    scope: input.options?.base === void 0 ? "working-tree" : "base-range",
    selectedRequirements,
    steps,
    ...strict ? { strict } : {},
    summary: {
      affectedTests: affectedTests.length,
      automatedSteps: steps.filter((step) => step.execution === "automated").length,
      historicalRegressions: memoryRegressions.length,
      manualSteps: steps.filter((step) => step.execution === "manual").length,
      selectedRequirements: selectedRequirements.length,
      unavailableSteps: steps.filter((step) => step.execution === "unavailable").length
    },
    uncoveredRequirements
  };
}
function serializeVerificationPlan(plan) {
  return `${JSON.stringify(plan, null, 2)}
`;
}
async function writeVerificationPlan(root, plan) {
  try {
    const target = (0, import_node_path8.resolve)(root, VERIFICATION_PLAN_PATH);
    await (0, import_promises6.mkdir)((0, import_node_path8.dirname)(target), { recursive: true });
    await (0, import_promises6.writeFile)(target, serializeVerificationPlan(plan), "utf8");
    return VERIFICATION_PLAN_PATH;
  } catch (error) {
    throw new VerificationPlanError({ cause: error });
  }
}
async function createVerificationPlan(root, now = /* @__PURE__ */ new Date(), options = {}) {
  const [assessment, project, summaries] = await Promise.all([
    assessProjectRisk(root, { now, ...options.base === void 0 ? {} : { base: options.base } }),
    scanProject(root, now),
    listContracts(root)
  ]);
  const contracts = await Promise.all(summaries.map((summary3) => getContract(root, summary3.id)));
  return buildVerificationPlan({
    assessment,
    contracts,
    generatedAt: now.toISOString(),
    options,
    project
  });
}
async function createAndWriteVerificationPlan(root, now = /* @__PURE__ */ new Date(), options = {}) {
  const plan = await createVerificationPlan(root, now, options);
  const path = await writeVerificationPlan(root, plan);
  return { path, plan };
}

// packages/execution/dist/runner.js
var import_node_child_process2 = require("node:child_process");
var MAX_CAPTURED_CHARACTERS = 256e3;
function appendBounded(current, chunk) {
  if (current.length >= MAX_CAPTURED_CHARACTERS)
    return current;
  return current + chunk.slice(0, MAX_CAPTURED_CHARACTERS - current.length);
}
var defaultCommandRunner = {
  run(request) {
    return new Promise((resolve18) => {
      const startedAt = Date.now();
      let stderr = "";
      let stdout = "";
      let settled = false;
      let timedOut = false;
      const child = (0, import_node_child_process2.spawn)(request.command, [...request.args], {
        cwd: request.cwd,
        env: { ...process.env, ...request.env },
        shell: false,
        stdio: ["ignore", "pipe", "pipe"],
        windowsHide: true
      });
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout = appendBounded(stdout, chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr = appendBounded(stderr, chunk);
      });
      const finish = (exitCode) => {
        if (settled)
          return;
        settled = true;
        clearTimeout(timer);
        resolve18({ durationMs: Date.now() - startedAt, exitCode, stderr, stdout, timedOut });
      };
      const timer = setTimeout(() => {
        timedOut = true;
        child.kill();
      }, request.timeoutMs);
      timer.unref();
      child.once("error", (error) => {
        stderr = appendBounded(stderr, error.message);
        finish(null);
      });
      child.once("close", (code) => finish(code));
    });
  }
};

// packages/execution/dist/cypress.js
var import_promises7 = require("node:fs/promises");
var import_node_path9 = require("node:path");
var CYPRESS_RUNNER_SOURCE = String.raw`
const { createRequire } = require('node:module');
const { writeFileSync } = require('node:fs');
const { resolve } = require('node:path');
const input = JSON.parse(process.argv[1]);
async function main() {
  try {
    // Electron-based hosts can leak this flag; Cypress needs its browser process.
    delete process.env.ELECTRON_RUN_AS_NODE;
    const cypress = createRequire(resolve(input.project, 'package.json'))('cypress');
    const result = await cypress.run({
      project: input.project,
      spec: input.spec,
      testingType: 'e2e',
      record: false,
      quiet: true,
      config: {
        screenshotsFolder: resolve(input.outputDirectory, 'screenshots'),
        videosFolder: resolve(input.outputDirectory, 'videos'),
        downloadsFolder: resolve(input.outputDirectory, 'downloads'),
      },
    });
    writeFileSync(input.reportPath, JSON.stringify(result, null, 2) + '\n');
    process.exitCode = result.failures || result.totalFailed ? 1 : 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    writeFileSync(input.reportPath, JSON.stringify({ failures: 1, message }, null, 2) + '\n');
    console.error(message);
    process.exitCode = 1;
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
`;
function record3(value) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Expected a Cypress result object.");
  }
  return value;
}
function count(value) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error("Invalid Cypress result count or duration.");
  }
  return value;
}
function executionError(message) {
  const unavailable = /no version of cypress is installed|cypress (?:executable|binary).*(?:missing|not found|does not exist)|could not find.*cypress executable/iu.test(message);
  const configuration = /(?:config(?:uration|file| file)?|cypress\.config\.[a-z]+).*(?:invalid|error|threw|not found|could not|cannot|missing)|(?:could not|cannot|unable to).*(?:config(?:uration|file| file)?)/iu.test(message);
  return {
    status: unavailable ? "unavailable" : "error",
    error: {
      code: unavailable ? "CYPRESS_BINARY_NOT_INSTALLED" : configuration ? "CYPRESS_CONFIG_INVALID" : "ADAPTER_EXECUTION_FAILED",
      message,
      remediation: unavailable ? "Install the project's Cypress binary and required browser dependencies, then retry." : configuration ? "Fix the project's Cypress configuration and confirm Cypress runs locally, then retry." : "Inspect the Cypress report and captured output, then fix the local execution error."
    }
  };
}
async function readCypressOutcome(root, reportPath, testFiles, diagnostics = "") {
  try {
    const report = record3(JSON.parse(await (0, import_promises7.readFile)(reportPath, "utf8")));
    if (report.failures) {
      return executionError([
        diagnostics.trim(),
        typeof report.message === "string" ? report.message : "Cypress could not execute tests."
      ].filter(Boolean).join("\n"));
    }
    if (!Array.isArray(report.runs))
      throw new Error("Missing Cypress spec results.");
    const totalTests = count(report.totalTests);
    const totalFailed = count(report.totalFailed);
    const totalPassed = count(report.totalPassed);
    const totalSkipped = count(report.totalSkipped) + count(report.totalPending);
    const testResults = [];
    const selectedFiles = new Set(testFiles.map((file) => (0, import_node_path9.resolve)(root, file)));
    const executedFiles = /* @__PURE__ */ new Set();
    const specErrors = [];
    for (const value of report.runs) {
      const run = record3(value);
      const spec = record3(run.spec);
      if (typeof spec.relative !== "string")
        throw new Error("Missing Cypress spec path.");
      const absoluteFile = (0, import_node_path9.resolve)(root, spec.relative);
      if (!selectedFiles.has(absoluteFile))
        throw new Error("Cypress ran an unselected spec.");
      executedFiles.add(absoluteFile);
      const file = (0, import_node_path9.relative)((0, import_node_path9.resolve)(root), absoluteFile).split(import_node_path9.sep).join("/");
      if (run.error) {
        specErrors.push(String(run.error));
        continue;
      }
      if (!Array.isArray(run.tests))
        throw new Error("Missing Cypress test results.");
      for (const value2 of run.tests) {
        const test = record3(value2);
        if (!Array.isArray(test.title) || !test.title.every((part) => typeof part === "string")) {
          throw new Error("Missing Cypress test title.");
        }
        if (!["passed", "failed", "pending", "skipped"].includes(String(test.state))) {
          throw new Error("Unknown Cypress test state.");
        }
        testResults.push({
          file,
          name: test.title.join(" > "),
          status: test.state === "pending" ? "skipped" : test.state,
          durationMs: test.duration == null ? 0 : count(test.duration),
          ...typeof test.displayError === "string" && test.displayError.length > 0 ? { error: test.displayError } : {}
        });
      }
    }
    if (specErrors.length > 0)
      return { ...executionError(specErrors.join("\n")), testResults };
    if (executedFiles.size !== selectedFiles.size)
      throw new Error("Cypress omitted selected specs.");
    if (testResults.length !== totalTests || testResults.filter((test) => test.status === "failed").length !== totalFailed || testResults.filter((test) => test.status === "passed").length !== totalPassed || testResults.filter((test) => test.status === "skipped").length !== totalSkipped) {
      throw new Error("Cypress test results disagree with the run totals.");
    }
    testResults.sort((left, right) => left.file.localeCompare(right.file) || left.name.localeCompare(right.name));
    if (totalFailed > 0)
      return { status: "failed", testResults };
    if (totalTests === 0 || totalSkipped > 0) {
      return {
        status: "skipped",
        testResults,
        error: {
          code: totalTests === 0 ? "NO_TESTS_EXECUTED" : "CYPRESS_TESTS_SKIPPED",
          message: totalTests === 0 ? "Cypress executed no tests." : "Selected Cypress tests were skipped or pending.",
          remediation: "Add or enable the selected Cypress tests so verification can complete."
        }
      };
    }
    return { status: "passed", testResults };
  } catch (error) {
    return {
      status: "error",
      error: {
        code: "CYPRESS_REPORT_INVALID",
        message: `Cypress did not produce a complete valid report: ${error instanceof Error ? error.message : String(error)}`,
        remediation: "Inspect the captured Cypress output and raw report, then retry."
      }
    };
  }
}
function validCypressSpecs(root, files) {
  return files.every((file) => {
    const path = (0, import_node_path9.relative)((0, import_node_path9.resolve)(root), (0, import_node_path9.resolve)(root, file));
    return !(0, import_node_path9.isAbsolute)(file) && path !== "" && path !== ".." && !path.startsWith(`..${import_node_path9.sep}`) && !/[,*?{}[\]!()]/u.test(file);
  });
}

// packages/execution/dist/types.js
var VERIFICATION_RUN_SCHEMA_VERSION = 1;
var VERIFICATION_ARTIFACTS_DIRECTORY = ".maru/artifacts/runs";

// packages/execution/dist/index.js
var DEFAULT_TIMEOUT_MS = 12e4;
var MAX_TEMPORARY_TEST_SOURCE_LENGTH = 1e5;
var REQUIREMENT_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,119}#[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/u;
var TEMPORARY_TEST_ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
var TEST_FILE = /\.(?:spec|test)\.(?:c|m)?(?:j|t)sx?$/u;
var VerificationExecutionError = class extends Error {
  code;
  remediation;
  constructor(code, message, remediation, options) {
    super(message, options);
    this.code = code;
    this.remediation = remediation;
    this.name = "VerificationExecutionError";
  }
};
function portablePath(path) {
  return path.split(import_node_path10.sep).join("/");
}
function relativePath(root, path) {
  return portablePath((0, import_node_path10.relative)((0, import_node_path10.resolve)(root), (0, import_node_path10.resolve)(path)));
}
function resolveInsideRoot(root, path) {
  if ((0, import_node_path10.isAbsolute)(path)) {
    throw new VerificationExecutionError("TEMPORARY_TEST_INVALID", `Temporary test path must be relative: ${path}`, "Choose a new test path inside the project root.");
  }
  const absoluteRoot = (0, import_node_path10.resolve)(root);
  const target = (0, import_node_path10.resolve)(absoluteRoot, path);
  if (target === absoluteRoot || !target.startsWith(`${absoluteRoot}${import_node_path10.sep}`)) {
    throw new VerificationExecutionError("TEMPORARY_TEST_INVALID", `Temporary test path escapes the project root: ${path}`, "Choose a new test path inside the project root.");
  }
  return target;
}
async function exists3(path) {
  try {
    await (0, import_promises8.access)(path, import_node_fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}
async function createRunDirectory(root, now) {
  const parent = (0, import_node_path10.resolve)(root, VERIFICATION_ARTIFACTS_DIRECTORY);
  await (0, import_promises8.mkdir)(parent, { recursive: true });
  const base = now.toISOString().replace(/[:.]/gu, "-");
  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const suffix = attempt === 1 ? "" : `-${String(attempt).padStart(2, "0")}`;
    const candidate = (0, import_node_path10.resolve)(parent, `${base}${suffix}`);
    try {
      await (0, import_promises8.mkdir)(candidate);
      return candidate;
    } catch (error) {
      if (error.code !== "EEXIST")
        throw error;
    }
  }
  throw new VerificationExecutionError("RUN_DIRECTORY_UNAVAILABLE", "Unable to allocate a unique verification run directory.", "Retry the verification command with a new timestamp.");
}
function unique(values) {
  return [...new Set(values)].sort();
}
function taggedSource(test) {
  return `// @maru-requirements ${test.requirementRefs.join(", ")}
${test.source}`;
}
async function prepareTemporaryTests(root, runDirectory, tests) {
  const artifacts = [];
  const createdPaths = [];
  const generatedDirectory = (0, import_node_path10.resolve)(runDirectory, "generated");
  if (tests.length > 0)
    await (0, import_promises8.mkdir)(generatedDirectory, { recursive: true });
  try {
    for (const test of tests) {
      if (!TEMPORARY_TEST_ID.test(test.id) || test.id.length > 80) {
        throw new VerificationExecutionError("TEMPORARY_TEST_INVALID", `Temporary test id is invalid: ${test.id}`, "Use a lowercase kebab-case id no longer than 80 characters.");
      }
      if (test.requirementRefs.length === 0 || test.requirementRefs.length > 100 || test.requirementRefs.some((reference) => !REQUIREMENT_REFERENCE.test(reference))) {
        throw new VerificationExecutionError("TEMPORARY_TEST_INVALID", `Temporary test requirement references are invalid: ${test.id}`, "Provide 1 to 100 references in contract-id#requirement-id form.");
      }
      if (test.source.trim().length === 0 || test.source.length > MAX_TEMPORARY_TEST_SOURCE_LENGTH) {
        throw new VerificationExecutionError("TEMPORARY_TEST_INVALID", `Temporary test source is empty or too large: ${test.id}`, "Provide non-empty test source no larger than 100,000 characters.");
      }
      if (!TEST_FILE.test(test.targetPath)) {
        throw new VerificationExecutionError("TEMPORARY_TEST_INVALID", `Temporary test path is not a supported test filename: ${test.targetPath}`, "Use a .test or .spec JavaScript/TypeScript filename inside the project.");
      }
      const target = resolveInsideRoot(root, test.targetPath);
      if (await exists3(target)) {
        throw new VerificationExecutionError("TEMPORARY_TEST_EXISTS", `Refusing to overwrite an existing test: ${test.targetPath}`, "Choose a unique temporary targetPath.");
      }
      const source = taggedSource(test);
      const artifact = (0, import_node_path10.resolve)(generatedDirectory, `${test.adapter}-${test.id}${(0, import_node_path10.extname)(test.targetPath)}`);
      await (0, import_promises8.mkdir)((0, import_node_path10.dirname)(target), { recursive: true });
      await (0, import_promises8.writeFile)(target, source, { encoding: "utf8", flag: "wx" });
      createdPaths.push(target);
      await (0, import_promises8.writeFile)(artifact, source, "utf8");
      artifacts.push({
        adapter: test.adapter,
        artifactPath: relativePath(root, artifact),
        id: test.id,
        requirementRefs: unique(test.requirementRefs),
        targetPath: portablePath(test.targetPath)
      });
    }
    return { artifacts, createdPaths };
  } catch (error) {
    await Promise.all(createdPaths.map((path) => (0, import_promises8.rm)(path, { force: true })));
    throw error;
  }
}
function groupSteps(plan, temporaryTests2) {
  const groups = /* @__PURE__ */ new Map();
  for (const step of plan.steps) {
    const current = groups.get(step.adapter) ?? [];
    current.push(step);
    groups.set(step.adapter, current);
  }
  for (const test of temporaryTests2) {
    if (!groups.has(test.adapter))
      groups.set(test.adapter, []);
  }
  return [...groups].map(([adapter, steps]) => ({
    adapter,
    steps,
    temporaryTests: temporaryTests2.filter((test) => test.adapter === adapter)
  }));
}
function resultError(code, message, remediation) {
  return { code, message, remediation };
}
function passiveResult(group) {
  const manual = group.adapter === "manual-review";
  return {
    adapter: group.adapter,
    artifacts: {},
    blocking: group.steps.some((step) => step.blocking),
    durationMs: 0,
    error: manual ? resultError("MANUAL_REVIEW_REQUIRED", "This verification step requires human review.", "Review the linked requirements and record the result before release.") : resultError("PLAN_ADAPTER_UNAVAILABLE", "The verification plan has no executable adapter for this step.", "Install or configure a supported adapter, then recreate the plan."),
    exitCode: null,
    requirementRefs: unique(group.steps.flatMap((step) => step.requirementRefs)),
    status: manual ? "skipped" : "unavailable",
    stepIds: group.steps.map((step) => step.id),
    targetFiles: unique(group.steps.flatMap((step) => step.targetFiles ?? [])),
    testFiles: unique(group.steps.flatMap((step) => step.testFiles))
  };
}
async function findExecutableOnPath(name) {
  const pathValue = Object.entries(process.env).find(([key]) => key.toLowerCase() === "path")?.[1];
  if (pathValue === void 0)
    return void 0;
  const extensions = process.platform === "win32" ? (process.env.PATHEXT ?? ".COM;.EXE;.BAT;.CMD").split(";").filter(Boolean).map((extension) => extension.toLowerCase()) : [""];
  for (const directory of pathValue.split(import_node_path10.delimiter).filter(Boolean)) {
    for (const extension of extensions) {
      const candidate = (0, import_node_path10.resolve)(directory, `${name}${extension}`);
      try {
        await (0, import_promises8.access)(candidate, process.platform === "win32" ? import_node_fs.constants.F_OK : import_node_fs.constants.X_OK);
        return candidate;
      } catch {
      }
    }
  }
  return void 0;
}
async function findAdapterInvocation(root, adapter) {
  if (adapter === "cypress") {
    return await exists3((0, import_node_path10.resolve)(root, "node_modules/cypress/package.json")) ? { executable: process.execPath, prefixArgs: ["--eval", CYPRESS_RUNNER_SOURCE, "--"] } : void 0;
  }
  if (adapter === "semgrep" || adapter === "gitleaks") {
    const localCandidates = process.platform === "win32" ? [`.venv/Scripts/${adapter}.exe`, `venv/Scripts/${adapter}.exe`] : [`.venv/bin/${adapter}`, `venv/bin/${adapter}`];
    for (const candidate of localCandidates) {
      const path = (0, import_node_path10.resolve)(root, candidate);
      if (await exists3(path))
        return { executable: path, prefixArgs: [] };
    }
    const executable = await findExecutableOnPath(adapter);
    return executable === void 0 ? void 0 : { executable, prefixArgs: [] };
  }
  if (adapter === "axe" && !await exists3((0, import_node_path10.resolve)(root, "node_modules/@axe-core/playwright/package.json"))) {
    return void 0;
  }
  const candidates = adapter === "vitest" ? ["node_modules/vitest/vitest.mjs"] : adapter === "jest" ? ["node_modules/jest/bin/jest.js", "node_modules/jest-cli/bin/jest.js"] : ["node_modules/@playwright/test/cli.js", "node_modules/playwright/cli.js"];
  for (const candidate of candidates) {
    const binary = (0, import_node_path10.resolve)(root, candidate);
    if (await exists3(binary))
      return { executable: process.execPath, prefixArgs: [binary] };
  }
  return void 0;
}
function unavailableAdapterResult(group, testFiles, targetFiles, error) {
  const errors = {
    cypress: resultError("CYPRESS_NOT_INSTALLED", "Cypress is not installed in this project.", "Install Cypress and its required browser dependencies in the project, then retry."),
    axe: resultError("AXE_NOT_INSTALLED", "The axe Playwright accessibility adapter is not installed in this project.", "Install @axe-core/playwright and @playwright/test, add an axe-backed Playwright accessibility test, then retry."),
    jest: resultError("JEST_NOT_INSTALLED", "Jest is not installed in this project.", "Install jest in the project, then retry."),
    gitleaks: resultError("GITLEAKS_NOT_INSTALLED", "Gitleaks is not available in this project or on PATH.", "Install the Gitleaks executable and ensure it is on PATH, then retry."),
    playwright: resultError("PLAYWRIGHT_NOT_INSTALLED", "Playwright is not installed in this project.", "Install @playwright/test in the project and install the required browser, then retry."),
    semgrep: resultError("SEMGREP_NOT_INSTALLED", "Semgrep is not available in this project or on PATH.", "Install the Semgrep executable and ensure it is on PATH, then retry."),
    vitest: resultError("VITEST_NOT_INSTALLED", "Vitest is not installed in this project.", "Install vitest in the project, then retry.")
  };
  return {
    adapter: group.adapter,
    artifacts: {},
    blocking: group.steps.some((step) => step.blocking),
    durationMs: 0,
    error: error ?? errors[group.adapter] ?? resultError("PLAN_ADAPTER_UNAVAILABLE", `${group.adapter} is not available for execution.`, "Install or configure the selected adapter, then retry."),
    exitCode: null,
    requirementRefs: unique([
      ...group.steps.flatMap((step) => step.requirementRefs),
      ...group.temporaryTests.flatMap((test) => test.requirementRefs)
    ]),
    status: "unavailable",
    stepIds: group.steps.map((step) => step.id),
    targetFiles,
    testFiles
  };
}
async function semgrepConfig(root) {
  for (const candidate of [".semgrep.yml", ".semgrep.yaml", "semgrep.yml", "semgrep.yaml"]) {
    if (await exists3((0, import_node_path10.resolve)(root, candidate)))
      return candidate;
  }
  return void 0;
}
async function existingTargets(root, paths) {
  const absoluteRoot = (0, import_node_path10.resolve)(root);
  const result = [];
  for (const path of paths) {
    if ((0, import_node_path10.isAbsolute)(path))
      continue;
    const target = (0, import_node_path10.resolve)(absoluteRoot, path);
    if (!target.startsWith(`${absoluteRoot}${import_node_path10.sep}`) || !await exists3(target))
      continue;
    result.push(portablePath(path));
  }
  return unique(result);
}
async function writeOutputArtifacts(root, runDirectory, adapter, stdout, stderr) {
  const directory = (0, import_node_path10.resolve)(runDirectory, adapter);
  await (0, import_promises8.mkdir)(directory, { recursive: true });
  const stdoutPath = (0, import_node_path10.resolve)(directory, "stdout.txt");
  const stderrPath = (0, import_node_path10.resolve)(directory, "stderr.txt");
  await Promise.all([(0, import_promises8.writeFile)(stdoutPath, stdout, "utf8"), (0, import_promises8.writeFile)(stderrPath, stderr, "utf8")]);
  return { stderr: relativePath(root, stderrPath), stdout: relativePath(root, stdoutPath) };
}
async function executeAutomatedGroup(root, runDirectory, group, options) {
  const testFiles = unique([
    ...group.steps.flatMap((step) => step.testFiles),
    ...group.temporaryTests.map((test) => portablePath(test.targetPath))
  ]);
  const targetFiles = unique(group.steps.flatMap((step) => step.targetFiles ?? []));
  const requirementRefs = unique([
    ...group.steps.flatMap((step) => step.requirementRefs),
    ...group.temporaryTests.flatMap((test) => test.requirementRefs)
  ]);
  const base = {
    adapter: group.adapter,
    blocking: group.steps.some((step) => step.blocking),
    requirementRefs,
    stepIds: group.steps.map((step) => step.id),
    targetFiles,
    testFiles
  };
  const testAdapter = group.adapter === "axe" || group.adapter === "cypress" || group.adapter === "jest" || group.adapter === "playwright" || group.adapter === "vitest";
  if (testAdapter && testFiles.length === 0) {
    const remediation = group.adapter === "axe" ? "Add an affected axe-backed Playwright accessibility test, then retry." : "Add an affected test or provide a generated temporary test, then retry.";
    return {
      ...base,
      artifacts: {},
      durationMs: 0,
      error: resultError("NO_TESTS_SELECTED", `No ${group.adapter} test files were selected for this change.`, remediation),
      exitCode: null,
      status: "skipped"
    };
  }
  if (group.adapter === "cypress" && !validCypressSpecs(root, testFiles)) {
    return {
      ...base,
      artifacts: {},
      durationMs: 0,
      error: resultError("CYPRESS_SPEC_INVALID", "Cypress specs must be literal paths inside the project, without commas or glob characters.", "Use project-relative spec paths without glob characters or commas, then recreate the plan."),
      exitCode: null,
      status: "error"
    };
  }
  const invocation = await findAdapterInvocation(root, group.adapter);
  if (invocation === void 0)
    return unavailableAdapterResult(group, testFiles, targetFiles);
  const outputDirectory = (0, import_node_path10.resolve)(runDirectory, group.adapter, "test-output");
  const reportPath = (0, import_node_path10.resolve)(runDirectory, group.adapter, "report.json");
  const portableReportPath = relativePath(root, reportPath);
  let adapterArgs;
  if (group.adapter === "cypress") {
    await (0, import_promises8.mkdir)((0, import_node_path10.dirname)(reportPath), { recursive: true });
    adapterArgs = [
      JSON.stringify({
        project: (0, import_node_path10.resolve)(root),
        spec: testFiles.join(","),
        reportPath,
        outputDirectory
      })
    ];
  } else if (group.adapter === "vitest") {
    adapterArgs = ["run", ...testFiles, "--reporter=default"];
  } else if (group.adapter === "jest") {
    await (0, import_promises8.mkdir)((0, import_node_path10.dirname)(reportPath), { recursive: true });
    adapterArgs = [
      "--ci",
      "--runTestsByPath",
      ...testFiles,
      "--json",
      "--outputFile",
      portableReportPath
    ];
  } else if (group.adapter === "playwright" || group.adapter === "axe") {
    adapterArgs = ["test", ...testFiles, "--reporter=line", "--output", outputDirectory];
  } else if (group.adapter === "semgrep") {
    const config = await semgrepConfig(root);
    if (config === void 0) {
      return unavailableAdapterResult(group, testFiles, targetFiles, resultError("SEMGREP_CONFIG_NOT_FOUND", "No local Semgrep rule configuration was found.", "Add .semgrep.yml or .semgrep.yaml with reviewed local rules, then retry."));
    }
    const targets = await existingTargets(root, targetFiles);
    if (targets.length === 0) {
      return {
        ...base,
        artifacts: {},
        durationMs: 0,
        error: resultError("NO_SECURITY_TARGETS_SELECTED", "No existing changed source files were selected for Semgrep.", "Recreate the verification plan from a working tree with scannable source changes."),
        exitCode: null,
        status: "skipped"
      };
    }
    await (0, import_promises8.mkdir)((0, import_node_path10.dirname)(reportPath), { recursive: true });
    adapterArgs = [
      "scan",
      "--config",
      config,
      "--json",
      "--output",
      portableReportPath,
      "--error",
      ...targets
    ];
  } else {
    await (0, import_promises8.mkdir)((0, import_node_path10.dirname)(reportPath), { recursive: true });
    adapterArgs = [
      "dir",
      "--no-banner",
      "--no-color",
      "--redact",
      "--report-format",
      "json",
      "--report-path",
      portableReportPath,
      "."
    ];
  }
  const args = [...invocation.prefixArgs, ...adapterArgs];
  const command = { args, executable: invocation.executable };
  try {
    const executed = await options.commandRunner.run({
      args,
      command: invocation.executable,
      cwd: root,
      env: {
        CI: "1",
        FORCE_COLOR: "0",
        NO_COLOR: "1",
        ...group.adapter === "cypress" ? { CYPRESS_CRASH_REPORTS: "0" } : {}
      },
      timeoutMs: options.timeoutMs
    });
    const artifacts = await writeOutputArtifacts(root, runDirectory, group.adapter, executed.stdout, executed.stderr);
    const scanner = group.adapter === "semgrep" || group.adapter === "gitleaks";
    const status2 = executed.timedOut ? "error" : executed.exitCode === 0 ? "passed" : executed.exitCode === null || scanner && executed.exitCode !== 1 ? "error" : "failed";
    const reportExists = (scanner || group.adapter === "jest" || group.adapter === "cypress") && await exists3(reportPath);
    let cypressOutcome = group.adapter === "cypress" && !executed.timedOut && executed.exitCode !== null ? await readCypressOutcome(root, reportPath, testFiles, `${executed.stdout}
${executed.stderr}`) : void 0;
    if (cypressOutcome?.status === "passed" && executed.exitCode !== 0) {
      cypressOutcome = {
        ...cypressOutcome,
        status: "error",
        error: resultError("ADAPTER_EXECUTION_FAILED", "Cypress exited unsuccessfully despite reporting passing tests.", "Inspect the captured Cypress output and retry.")
      };
    }
    return {
      ...base,
      artifacts: {
        ...artifacts,
        ...reportExists ? { report: portableReportPath } : {},
        ...group.adapter === "playwright" || group.adapter === "axe" || group.adapter === "cypress" ? { outputDirectory: relativePath(root, outputDirectory) } : {}
      },
      command,
      durationMs: executed.durationMs,
      ...executed.timedOut ? {
        error: resultError("ADAPTER_TIMEOUT", `${group.adapter} exceeded the ${options.timeoutMs}ms execution timeout.`, "Inspect the captured output, fix hanging tests, or configure a longer timeout.")
      } : executed.exitCode === null || scanner && executed.exitCode !== 1 ? {
        error: resultError("ADAPTER_EXECUTION_FAILED", `${group.adapter} could not start or complete.`, "Inspect the captured stderr artifact and confirm the local test installation works.")
      } : {},
      exitCode: executed.exitCode,
      status: status2,
      ...cypressOutcome
    };
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    const artifacts = await writeOutputArtifacts(root, runDirectory, group.adapter, "", details);
    return {
      ...base,
      artifacts,
      command,
      durationMs: 0,
      error: resultError("ADAPTER_EXECUTION_FAILED", `${group.adapter} execution failed before returning a result.`, "Inspect the captured stderr artifact and confirm the local test installation works."),
      exitCode: null,
      status: "error"
    };
  }
}
function summarize(results) {
  const count2 = (status2) => results.filter((result) => result.status === status2).length;
  return {
    blockingFailures: results.filter((result) => result.blocking && result.status !== "passed").length,
    error: count2("error"),
    failed: count2("failed"),
    passed: count2("passed"),
    skipped: count2("skipped"),
    unavailable: count2("unavailable")
  };
}
function runStatus(summary3) {
  if (summary3.failed > 0)
    return "failed";
  if (summary3.error > 0)
    return "error";
  if (summary3.skipped > 0 || summary3.unavailable > 0)
    return "incomplete";
  return "passed";
}
async function runVerificationPlan(root, plan, options = {}) {
  const now = options.now ?? (() => /* @__PURE__ */ new Date());
  const startedAt = now();
  let runDirectory;
  try {
    runDirectory = await createRunDirectory(root, startedAt);
  } catch (error) {
    if (error instanceof VerificationExecutionError)
      throw error;
    throw new VerificationExecutionError("EXECUTION_ARTIFACT_WRITE_FAILED", "Unable to create the verification artifact directory.", "Check project directory permissions and available disk space.", { cause: error });
  }
  const temporaryTests2 = options.temporaryTests ?? [];
  const prepared = await prepareTemporaryTests(root, runDirectory, temporaryTests2);
  try {
    const results = [];
    for (const group of groupSteps(plan, temporaryTests2)) {
      if (group.adapter === "axe" || group.adapter === "cypress" || group.adapter === "gitleaks" || group.adapter === "jest" || group.adapter === "playwright" || group.adapter === "semgrep" || group.adapter === "vitest") {
        results.push(await executeAutomatedGroup(root, runDirectory, { ...group, adapter: group.adapter }, {
          commandRunner: options.commandRunner ?? defaultCommandRunner,
          timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS
        }));
      } else {
        results.push(passiveResult(group));
      }
    }
    const summary3 = summarize(results);
    const run = {
      artifactDirectory: relativePath(root, runDirectory),
      completedAt: now().toISOString(),
      generatedTests: prepared.artifacts,
      planPath: options.planPath ?? ".maru/generated/verification-plan.json",
      results,
      schemaVersion: VERIFICATION_RUN_SCHEMA_VERSION,
      startedAt: startedAt.toISOString(),
      status: runStatus(summary3),
      summary: summary3
    };
    const path = (0, import_node_path10.resolve)(runDirectory, "run.json");
    await (0, import_promises8.writeFile)(path, `${JSON.stringify(run, null, 2)}
`, "utf8");
    return { path: relativePath(root, path), run };
  } catch (error) {
    if (error instanceof VerificationExecutionError)
      throw error;
    throw new VerificationExecutionError("EXECUTION_ARTIFACT_WRITE_FAILED", "Unable to complete or persist the verification run.", "Inspect .maru/artifacts and check project directory permissions, then retry.", { cause: error });
  } finally {
    await Promise.all(prepared.createdPaths.map((path) => (0, import_promises8.rm)(path, { force: true })));
  }
}

// packages/seal/dist/index.js
var import_node_crypto2 = require("node:crypto");
var import_promises9 = require("node:fs/promises");
var import_node_path11 = require("node:path");
var SEAL_MANIFEST_PATH = ".maru/seal.json";
var SEAL_PUBLIC_KEY_PATH = ".maru/seal.pub";
var SEAL_VERSION = 1;
var RUNNER_CONFIG = /^(?:vitest|vite|jest)\.(?:config|workspace|setup)\.[cm]?[jt]s$/u;
var CONTRACT_TEST = /\.contract\.(?:test|spec)\.[cm]?[jt]sx?$/u;
var SKIPPED_DIRECTORIES = /* @__PURE__ */ new Set([".git", ".maru", "coverage", "dist", "node_modules"]);
var RUNNER_PACKAGE_FIELDS = ["jest", "scripts", "vitest"];
var PACKAGE_ENTRY = "package.json#test-settings";
var SealError = class extends Error {
  code;
  remediation;
  constructor(code, message, remediation, options) {
    super(message, options);
    this.code = code;
    this.remediation = remediation;
    this.name = "SealError";
  }
};
var SealBrokenError = class extends Error {
  issues;
  code = "SEAL_BROKEN";
  remediation = "Restore the protected files, or have the key holder review the change and run maru seal create.";
  constructor(issues) {
    super(`Verification did not run. The seal is broken:
${issues.join("\n")}`);
    this.issues = issues;
    this.name = "SealBrokenError";
  }
};
function sha256(content) {
  return (0, import_node_crypto2.createHash)("sha256").update(content, "utf8").digest("hex");
}
function normalized(content) {
  return content.replaceAll("\r\n", "\n");
}
async function readOptional(path) {
  try {
    return await (0, import_promises9.readFile)(path, "utf8");
  } catch {
    return void 0;
  }
}
async function findContractTests(root, directory) {
  const found = [];
  for (const entry of await (0, import_promises9.readdir)(directory, { withFileTypes: true })) {
    const path = (0, import_node_path11.join)(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name))
        found.push(...await findContractTests(root, path));
    } else if (entry.isFile() && CONTRACT_TEST.test(entry.name)) {
      found.push((0, import_node_path11.relative)(root, path).split(import_node_path11.sep).join("/"));
    }
  }
  return found;
}
async function collectProtectedFiles(root) {
  const absolute = (0, import_node_path11.resolve)(root);
  const contractDirectory = (0, import_node_path11.join)(absolute, ".maru", "contracts");
  const contracts = (await (0, import_promises9.readdir)(contractDirectory, { withFileTypes: true }).catch(() => [])).filter((entry) => entry.isFile() && /\.ya?ml$/u.test(entry.name)).map((entry) => `.maru/contracts/${entry.name}`);
  const runnerConfig = (await (0, import_promises9.readdir)(absolute, { withFileTypes: true })).filter((entry) => entry.isFile() && RUNNER_CONFIG.test(entry.name)).map((entry) => entry.name);
  const paths = [
    ".maru/maru.yml",
    ...contracts,
    ...runnerConfig,
    ...await findContractTests(absolute, absolute)
  ].sort();
  const files = {};
  for (const path of paths) {
    const content = await readOptional((0, import_node_path11.join)(absolute, ...path.split("/")));
    if (content !== void 0)
      files[path] = sha256(normalized(content));
  }
  const manifest = await readOptional((0, import_node_path11.join)(absolute, "package.json"));
  if (manifest !== void 0) {
    let settings = { unparsable: sha256(normalized(manifest)) };
    try {
      const parsed = JSON.parse(manifest);
      settings = Object.fromEntries(RUNNER_PACKAGE_FIELDS.map((key) => [key, parsed[key] ?? null]));
    } catch {
    }
    files[PACKAGE_ENTRY] = sha256(JSON.stringify(settings));
  }
  return files;
}
function signedPayload(manifest) {
  const files = Object.fromEntries(Object.entries(manifest.files).sort(([left], [right]) => left.localeCompare(right)));
  return Buffer.from(JSON.stringify({
    createdAt: manifest.createdAt,
    files,
    sequence: manifest.sequence,
    signer: manifest.signer,
    version: manifest.version
  }), "utf8");
}
function parseManifest(raw) {
  if (raw === void 0)
    return void 0;
  try {
    const value = JSON.parse(raw);
    return value.version === SEAL_VERSION && typeof value.createdAt === "string" && typeof value.sequence === "number" && typeof value.signature === "string" && typeof value.signer === "string" && typeof value.files === "object" && value.files !== null ? value : void 0;
  } catch {
    return void 0;
  }
}
async function generateSealKey(root, outputPath) {
  const absoluteRoot = (0, import_node_path11.resolve)(root);
  const target = (0, import_node_path11.isAbsolute)(outputPath) ? outputPath : (0, import_node_path11.resolve)(absoluteRoot, outputPath);
  const inside2 = (0, import_node_path11.relative)(absoluteRoot, target);
  if (inside2 === "" || !inside2.startsWith("..") && !(0, import_node_path11.isAbsolute)(inside2)) {
    throw new SealError("SEAL_KEY_INSIDE_PROJECT", "The seal key must live outside the project.", "Any agent that can write to the repository could read a key stored in it. Pick a path outside the project.");
  }
  const { privateKey, publicKey } = (0, import_node_crypto2.generateKeyPairSync)("ed25519");
  await (0, import_promises9.mkdir)((0, import_node_path11.dirname)(target), { recursive: true });
  await (0, import_promises9.writeFile)(target, privateKey.export({ format: "pem", type: "pkcs8" }), {
    flag: "wx",
    mode: 384
  });
  const publicPath = (0, import_node_path11.join)(absoluteRoot, ...SEAL_PUBLIC_KEY_PATH.split("/"));
  await (0, import_promises9.mkdir)((0, import_node_path11.dirname)(publicPath), { recursive: true });
  await (0, import_promises9.writeFile)(publicPath, publicKey.export({ format: "pem", type: "spki" }), "utf8");
  return target;
}
async function createSeal(root, options) {
  if (options.signer.trim() === "") {
    throw new SealError("SEAL_SIGNER_REQUIRED", "A signer is required.", "Pass --by with the person accountable for this seal.");
  }
  let key;
  try {
    key = (0, import_node_crypto2.createPrivateKey)(await (0, import_promises9.readFile)(options.keyPath, "utf8"));
  } catch (error) {
    throw new SealError("SEAL_KEY_UNREADABLE", `Unable to read the seal key: ${options.keyPath}`, "Check the path, or create a key with maru seal keygen.", { cause: error });
  }
  const absolute = (0, import_node_path11.resolve)(root);
  const manifestPath = (0, import_node_path11.join)(absolute, ...SEAL_MANIFEST_PATH.split("/"));
  const previous = parseManifest(await readOptional(manifestPath));
  const unsigned = {
    createdAt: (options.now ?? /* @__PURE__ */ new Date()).toISOString(),
    files: await collectProtectedFiles(absolute),
    sequence: (previous?.sequence ?? 0) + 1,
    signer: options.signer,
    version: SEAL_VERSION
  };
  const manifest = {
    ...unsigned,
    signature: (0, import_node_crypto2.sign)(null, signedPayload(unsigned), key).toString("base64")
  };
  await (0, import_promises9.writeFile)(manifestPath, `${JSON.stringify(manifest, null, 2)}
`, "utf8");
  return manifest;
}
async function showAtCommit(root, commit, path, runner) {
  try {
    return await runner.run(["show", `${commit}:${path}`], root);
  } catch {
    return void 0;
  }
}
function signatureHolds(manifest, publicKeyPem) {
  try {
    return (0, import_node_crypto2.verify)(null, signedPayload(manifest), (0, import_node_crypto2.createPublicKey)(publicKeyPem), Buffer.from(manifest.signature, "base64"));
  } catch {
    return false;
  }
}
async function verifySeal(root, base, runner = defaultGitRunner) {
  const absolute = (0, import_node_path11.resolve)(root);
  const commit = await resolveMergeBase(absolute, base, runner);
  const trustedKey = await showAtCommit(absolute, commit, SEAL_PUBLIC_KEY_PATH, runner);
  if (trustedKey === void 0)
    return [];
  const manifest = parseManifest(await readOptional((0, import_node_path11.join)(absolute, ...SEAL_MANIFEST_PATH.split("/"))));
  if (manifest === void 0)
    return ["The seal manifest is missing or unreadable."];
  if (!signatureHolds(manifest, trustedKey)) {
    return ["The seal signature does not match the public key at the trusted base."];
  }
  const issues = [];
  const trusted = parseManifest(await showAtCommit(absolute, commit, SEAL_MANIFEST_PATH, runner));
  if (trusted !== void 0 && manifest.sequence < trusted.sequence) {
    issues.push(`The seal is older than the base (sequence ${String(manifest.sequence)} < ${String(trusted.sequence)}), so an earlier state may have been restored.`);
  }
  const current = await collectProtectedFiles(absolute);
  for (const path of Object.keys(manifest.files)) {
    if (current[path] === void 0)
      issues.push(`Sealed file is missing: ${path}`);
    else if (current[path] !== manifest.files[path])
      issues.push(`Sealed file changed: ${path}`);
  }
  for (const path of Object.keys(current)) {
    if (manifest.files[path] === void 0)
      issues.push(`Protected file is not sealed: ${path}`);
  }
  return issues.sort();
}

// packages/evidence/dist/types.js
var VERIFICATION_REPORT_SCHEMA_VERSION = 1;

// packages/evidence/dist/index.js
var MAX_DIAGNOSTIC_LENGTH = 500;
var EvidenceReportError = class extends Error {
  code = "EVIDENCE_REPORT_WRITE_FAILED";
  remediation = "Inspect the raw run artifacts and check project directory permissions, then retry.";
  constructor(options) {
    super("Unable to create or persist the verification evidence report.", options);
    this.name = "EvidenceReportError";
  }
};
function portablePath2(path) {
  return path.split(import_node_path12.sep).join("/");
}
function unique2(values) {
  return [...new Set(values)].sort();
}
function runId(artifactDirectory) {
  return portablePath2(artifactDirectory).split("/").filter(Boolean).at(-1) ?? "unknown-run";
}
function safeId(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "");
}
function diagnosticExcerpt(value, fallback) {
  const lines = value.replaceAll("\0", "").split(/\r?\n/u).map((line) => line.trim()).filter(Boolean);
  const preferred = lines.find((line) => /received:/iu.test(line)) ?? lines.find((line) => /assertionerror|expected.+(?:to|but)/iu.test(line)) ?? lines[0] ?? fallback;
  return preferred.slice(0, MAX_DIAGNOSTIC_LENGTH);
}
function evidenceStatus(status2) {
  if (status2 === "passed")
    return "passed";
  if (status2 === "failed")
    return "failed";
  return "inconclusive";
}
function categoriesFor(result, stepsById) {
  return unique2(result.stepIds.map((id) => stepsById.get(id)?.category).filter((category2) => category2 !== void 0));
}
function evidenceType(adapter, categories) {
  if (adapter === "manual-review")
    return "manual";
  if (adapter === "semgrep" || adapter === "gitleaks")
    return "security-scan";
  if (categories.length === 1 && categories[0] === "accessibility")
    return "accessibility";
  if (adapter === "cypress" || adapter === "playwright" || categories.includes("e2e"))
    return "e2e-test";
  if (categories.length === 1 && categories[0] === "api")
    return "api-test";
  return "unit-test";
}
function artifactRefs(result, generated, generatedTestArtifacts) {
  return unique2([
    ...Object.values(result.artifacts).filter((path) => path !== void 0),
    ...generatedTestArtifacts,
    generated.run
  ]);
}
function resultEvidence(plan, run, diagnostics, artifacts) {
  const stepsById = new Map(plan.steps.map((step) => [step.id, step]));
  const id = runId(run.artifactDirectory);
  return run.results.map((result, index) => {
    const categories = categoriesFor(result, stepsById);
    const fallback = result.error?.message ?? (result.status === "passed" ? `${result.adapter} completed successfully.` : `${result.adapter} returned ${result.status}.`);
    return {
      adapter: result.adapter,
      artifactRefs: artifactRefs(result, artifacts, run.generatedTests.filter((test) => test.adapter === result.adapter).map((test) => test.artifactPath)),
      categories,
      createdAt: run.completedAt,
      diagnostic: diagnosticExcerpt(result.adapter === "cypress" ? result.error?.message ?? result.testResults?.find((test) => test.status === "failed")?.error ?? diagnostics[index] ?? "" : diagnostics[index] ?? "", fallback),
      durationMs: result.durationMs,
      ...result.error === void 0 ? {} : { errorCode: result.error.code },
      exitCode: result.exitCode,
      id: `evidence-${String(index + 1).padStart(3, "0")}-${safeId(result.adapter)}`,
      requirementRefs: unique2(result.requirementRefs),
      runId: id,
      status: evidenceStatus(result.status),
      stepIds: unique2(result.stepIds),
      ...result.targetFiles === void 0 ? {} : { targetFiles: unique2(result.targetFiles) },
      testFiles: unique2(result.testFiles),
      ...result.testResults === void 0 ? {} : { testResults: result.testResults },
      tool: result.adapter,
      type: evidenceType(result.adapter, categories)
    };
  });
}
function requirementRef2(requirement) {
  return `${requirement.contractId}#${requirement.id}`;
}
function requirementStatus(allEvidence) {
  if (allEvidence.length === 0)
    return "unverified";
  const ran = allEvidence.filter((item) => item.adapter !== "unavailable");
  const evidence = ran.length > 0 ? ran : allEvidence;
  if (evidence.some((item) => item.status === "failed"))
    return "failed";
  if (evidence.some((item) => item.status === "inconclusive"))
    return "inconclusive";
  return "passed";
}
function planningGapEvidence(reportRunId, requirement, planPath, createdAt, index) {
  const reference = requirementRef2(requirement);
  return {
    adapter: "planner",
    artifactRefs: [planPath],
    categories: [],
    createdAt,
    diagnostic: "No verification result referenced this selected requirement.",
    durationMs: 0,
    exitCode: null,
    id: `evidence-gap-${String(index + 1).padStart(3, "0")}-${safeId(reference)}`,
    requirementRefs: [reference],
    runId: reportRunId,
    status: "inconclusive",
    stepIds: [],
    testFiles: [],
    tool: "planner",
    type: "planning-gap"
  };
}
function severity(kind, blocking, risk) {
  if (kind === "requirement-failure") {
    if (blocking && risk === "critical")
      return "critical";
    if (blocking || risk === "critical" || risk === "high")
      return "high";
    return "medium";
  }
  if (kind === "execution-error")
    return blocking ? "high" : "medium";
  return blocking ? "high" : "low";
}
function findingKind(evidence, status2) {
  if (status2 === "failed")
    return "requirement-failure";
  if (evidence.some((item) => item.errorCode === "ADAPTER_EXECUTION_FAILED" || item.errorCode === "ADAPTER_TIMEOUT" || item.errorCode === "CYPRESS_CONFIG_INVALID" || item.errorCode === "CYPRESS_REPORT_INVALID" || item.errorCode === "CYPRESS_SPEC_INVALID" || /could not start|execution failed|exceeded.+timeout/iu.test(item.diagnostic))) {
    return "execution-error";
  }
  return "verification-gap";
}
function reproduction(requirement, evidence) {
  const files = unique2(evidence.flatMap((item) => item.testFiles));
  return {
    command: "maru verify --diff",
    steps: [
      "Run verification from the project root with the same working-tree change.",
      ...files.length === 0 ? [] : [`Inspect the selected test files: ${files.join(", ")}.`],
      requirement === void 0 ? "Inspect the linked raw artifacts for the adapter failure." : `Compare the observed result with ${requirement.requirementRef}: ${requirement.expected}`
    ]
  };
}
function requirementFinding(requirement, evidence, risk, index) {
  const relevant = evidence.filter((item) => requirement.evidenceIds.includes(item.id));
  const observed = relevant.find((item) => item.status === "failed") ?? relevant.find((item) => item.status === "inconclusive") ?? relevant[0];
  const kind = findingKind(relevant, requirement.status);
  const common = {
    actual: observed?.diagnostic ?? "No verification evidence was produced.",
    artifactRefs: unique2(relevant.flatMap((item) => item.artifactRefs)),
    evidenceIds: requirement.evidenceIds,
    explanation: kind === "requirement-failure" ? "A selected automated check failed while verifying this requirement." : kind === "execution-error" ? "The selected adapter could not complete, so this requirement remains unverified." : "The available verification was inconclusive, so this requirement remains unverified.",
    id: `finding-${String(index + 1).padStart(3, "0")}-${safeId(requirement.requirementRef)}`,
    kind,
    reproduction: reproduction(requirement, relevant),
    severity: severity(kind, requirement.blocking, risk),
    sourceLocations: unique2(relevant.flatMap((item) => item.testFiles)).map((file) => ({ file })),
    status: "open",
    title: kind === "requirement-failure" ? `${requirement.requirementId} verification failed` : `${requirement.requirementId} lacks conclusive verification`
  };
  if (requirement.blocking) {
    const finding2 = {
      ...common,
      blocking: true,
      contractId: requirement.contractId,
      contractTitle: requirement.contractTitle,
      expected: requirement.expected,
      requirementId: requirement.requirementId,
      requirementRef: requirement.requirementRef
    };
    return finding2;
  }
  const finding = {
    ...common,
    blocking: false,
    contractId: requirement.contractId,
    contractTitle: requirement.contractTitle,
    expected: requirement.expected,
    requirementId: requirement.requirementId,
    requirementRef: requirement.requirementRef
  };
  return finding;
}
function unlinkedFinding(evidence, risk, index) {
  const kind = findingKind([evidence], evidence.status);
  return {
    actual: evidence.diagnostic,
    artifactRefs: evidence.artifactRefs,
    blocking: false,
    evidenceIds: [evidence.id],
    explanation: "This non-passing execution result was not linked to a selected requirement.",
    id: `finding-unlinked-${String(index + 1).padStart(3, "0")}-${safeId(evidence.adapter)}`,
    kind,
    reproduction: reproduction(void 0, [evidence]),
    severity: severity(kind, false, risk),
    sourceLocations: evidence.testFiles.map((file) => ({ file })),
    status: "open",
    title: `${evidence.tool} produced an unlinked ${evidence.status} result`
  };
}
function summary2(evidence, requirements, findings) {
  const evidenceCount = (status2) => evidence.filter((item) => item.status === status2).length;
  const requirementCount = (status2) => requirements.filter((item) => item.status === status2).length;
  return {
    blockingFindings: findings.filter((finding) => finding.blocking).length,
    evidence: evidence.length,
    failedEvidence: evidenceCount("failed"),
    findings: findings.length,
    inconclusiveEvidence: evidenceCount("inconclusive"),
    passedEvidence: evidenceCount("passed"),
    requirementsFailed: requirementCount("failed"),
    requirementsInconclusive: requirementCount("inconclusive"),
    requirementsPassed: requirementCount("passed"),
    requirementsUnverified: requirementCount("unverified")
  };
}
function buildVerificationReport(input) {
  const id = runId(input.run.artifactDirectory);
  const artifacts = {
    plan: input.run.planPath,
    report: `${portablePath2(input.run.artifactDirectory)}/report.json`,
    run: `${portablePath2(input.run.artifactDirectory)}/run.json`
  };
  const evidence = resultEvidence(input.plan, input.run, input.diagnostics ?? [], artifacts);
  for (const [index, requirement] of input.plan.selectedRequirements.entries()) {
    const reference = requirementRef2(requirement);
    if (!evidence.some((item) => item.requirementRefs.includes(reference))) {
      evidence.push(planningGapEvidence(id, requirement, artifacts.plan, input.generatedAt, index));
    }
  }
  const requirements = input.plan.selectedRequirements.map((requirement) => {
    const reference = requirementRef2(requirement);
    const linked = evidence.filter((item) => item.requirementRefs.includes(reference));
    const blocking = requirement.blocking || input.plan.steps.some((step) => step.blocking && step.requirementRefs.includes(reference));
    return {
      blocking,
      contractId: requirement.contractId,
      contractTitle: requirement.contractTitle,
      evidenceIds: linked.map((item) => item.id),
      expected: requirement.statement,
      kind: requirement.kind,
      requirementId: requirement.id,
      requirementRef: reference,
      status: requirementStatus(linked)
    };
  });
  const findings = requirements.filter((requirement) => requirement.status !== "passed").map((requirement, index) => requirementFinding(requirement, evidence, input.plan.risk.level, index));
  const linkedEvidenceIds = new Set(requirements.flatMap((requirement) => requirement.evidenceIds));
  findings.push(...evidence.filter((item) => item.status !== "passed" && !linkedEvidenceIds.has(item.id)).map((item, index) => unlinkedFinding(item, input.plan.risk.level, index)));
  const reportSummary = summary2(evidence, requirements, findings);
  const reasons = [
    ...input.run.status === "failed" || input.run.status === "error" ? [`The raw verification run ended with status ${input.run.status}.`] : [],
    ...input.run.summary.blockingFailures > 0 ? [`${input.run.summary.blockingFailures} raw blocking verification result(s) did not pass.`] : [],
    ...reportSummary.blockingFindings > 0 ? [`${reportSummary.blockingFindings} blocking finding(s) remain open.`] : [],
    ...input.plan.strict === true && input.plan.selectedRequirements.length === 0 ? ["Strict verification found no approved requirement to verify."] : [],
    ...input.sealIssues ?? []
  ];
  return {
    artifacts,
    evidence,
    findings,
    gate: { reasons, status: reasons.length > 0 ? "blocked" : "passed" },
    generatedAt: input.generatedAt,
    project: { name: input.plan.project.name },
    requirementEvidence: requirements,
    risk: input.plan.risk,
    runId: id,
    runStatus: input.run.status,
    schemaVersion: VERIFICATION_REPORT_SCHEMA_VERSION,
    summary: reportSummary
  };
}
function serializeVerificationReport(report) {
  return `${JSON.stringify(report, null, 2)}
`;
}
function resolveInsideRoot2(root, path) {
  if ((0, import_node_path12.isAbsolute)(path))
    throw new EvidenceReportError();
  const absoluteRoot = (0, import_node_path12.resolve)(root);
  const target = (0, import_node_path12.resolve)(absoluteRoot, path);
  if (target === absoluteRoot || !target.startsWith(`${absoluteRoot}${import_node_path12.sep}`)) {
    throw new EvidenceReportError();
  }
  return target;
}
async function writeVerificationReport(root, report) {
  try {
    const target = resolveInsideRoot2(root, report.artifacts.report);
    await (0, import_promises10.mkdir)((0, import_node_path12.dirname)(target), { recursive: true });
    await (0, import_promises10.writeFile)(target, serializeVerificationReport(report), "utf8");
    return portablePath2((0, import_node_path12.relative)((0, import_node_path12.resolve)(root), target));
  } catch (error) {
    if (error instanceof EvidenceReportError)
      throw error;
    throw new EvidenceReportError({ cause: error });
  }
}
async function readDiagnostic(root, result) {
  const sources = [];
  for (const path of [result.artifacts.stderr, result.artifacts.stdout]) {
    if (path === void 0)
      continue;
    try {
      const source = await (0, import_promises10.readFile)(resolveInsideRoot2(root, path), "utf8");
      if (source.trim().length > 0)
        sources.push(source);
    } catch {
    }
  }
  return sources.join("\n").slice(0, 4e3);
}
async function createAndWriteVerificationReport(root, now = /* @__PURE__ */ new Date(), options = {}) {
  const sealBase = options.strict === true ? options.base : void 0;
  if (sealBase !== void 0) {
    const issues = await verifySeal(root, sealBase);
    if (issues.length > 0)
      throw new SealBrokenError(issues);
  }
  const planned = await (options.createPlan ?? ((planRoot, planNow) => createAndWriteVerificationPlan(planRoot, planNow, {
    ...options.base === void 0 ? {} : { base: options.base },
    ...options.strict === void 0 ? {} : { strict: options.strict }
  })))(root, now);
  const runOptions = {
    ...options.commandRunner === void 0 ? {} : { commandRunner: options.commandRunner },
    now: options.now ?? (() => now),
    planPath: planned.path,
    temporaryTests: options.temporaryTests ?? [],
    ...options.timeoutMs === void 0 ? {} : { timeoutMs: options.timeoutMs }
  };
  const executed = await (options.runPlan ?? runVerificationPlan)(root, planned.plan, runOptions);
  const diagnostics = await Promise.all(executed.run.results.map((result) => readDiagnostic(root, result)));
  const sealIssues = sealBase === void 0 ? [] : await verifySeal(root, sealBase);
  const report = buildVerificationReport({
    diagnostics,
    generatedAt: (options.now?.() ?? now).toISOString(),
    plan: planned.plan,
    run: executed.run,
    sealIssues
  });
  const path = await writeVerificationReport(root, report);
  return {
    path,
    planPath: planned.path,
    report,
    run: executed.run,
    runPath: executed.path
  };
}
function findingLines(finding) {
  return [
    `[${finding.severity.toUpperCase()}] ${finding.blocking ? "BLOCKING" : "ADVISORY"} ${finding.id}: ${finding.title}`,
    ...finding.contractId === void 0 ? [] : [`Contract: ${finding.contractId}`],
    ...finding.requirementId === void 0 ? [] : [`Requirement: ${finding.requirementId}`],
    ...finding.expected === void 0 ? [] : [`Expected: ${finding.expected}`],
    `Actual: ${finding.actual}`,
    `Reproduce: ${finding.reproduction.command}`,
    `Evidence: ${finding.evidenceIds.join(", ")}`,
    `Artifacts: ${finding.artifactRefs.join(", ") || "none"}`
  ];
}
function formatVerificationReport(result) {
  const { report } = result;
  return [
    `Verification gate: ${report.gate.status.toUpperCase()}`,
    `Run: ${report.runId} (${report.runStatus})`,
    `Evidence: ${report.summary.evidence} (${report.summary.passedEvidence} passed, ${report.summary.failedEvidence} failed, ${report.summary.inconclusiveEvidence} inconclusive)`,
    `Requirements: ${report.summary.requirementsPassed} passed, ${report.summary.requirementsFailed} failed, ${report.summary.requirementsInconclusive} inconclusive, ${report.summary.requirementsUnverified} unverified`,
    `Findings: ${report.summary.findings} (${report.summary.blockingFindings} blocking)`,
    ...report.findings.flatMap((finding) => ["", ...findingLines(finding)]),
    "",
    `JSON report: ${result.path}`
  ].join("\n");
}

// packages/agent/dist/types.js
var AGENT_HOOK_SETTINGS_PATH = ".claude/settings.json";
var AGENT_GATE_STATE_PATH = ".maru/generated/agent-gate.json";
var AGENT_HOOK_COMMAND = "npx --no-install maru hook run";
var AGENT_HOOK_EVENT = "Stop";
var AGENT_GATE_MAX_CONSECUTIVE_BLOCKS = 3;

// packages/agent/dist/index.js
var MAX_REPORTED_FINDINGS = 5;
var HOOK_TIMEOUT_SECONDS = 600;
var AgentError = class extends Error {
  code;
  remediation;
  constructor(code, message, remediation, options) {
    super(message, options);
    this.code = code;
    this.remediation = remediation;
    this.name = "AgentError";
  }
};
function settingsFile(root) {
  return (0, import_node_path13.join)((0, import_node_path13.resolve)(root), ...AGENT_HOOK_SETTINGS_PATH.split("/"));
}
async function exists4(path) {
  try {
    await (0, import_promises11.access)(path);
    return true;
  } catch {
    return false;
  }
}
async function initialized(root) {
  return exists4((0, import_node_path13.join)((0, import_node_path13.resolve)(root), ".maru", "maru.yml"));
}
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function createStopHookGroup(command = AGENT_HOOK_COMMAND) {
  return {
    hooks: [
      {
        command,
        statusMessage: "Verifying the change against approved Quality Contracts",
        timeout: HOOK_TIMEOUT_SECONDS,
        type: "command"
      }
    ]
  };
}
function isMaruHookGroup(group) {
  if (!isRecord2(group) || !Array.isArray(group.hooks))
    return false;
  return group.hooks.some((hook) => isRecord2(hook) && typeof hook.command === "string" && hook.command.includes("maru hook run"));
}
async function readSettings(path) {
  if (!await exists4(path))
    return {};
  let raw;
  try {
    raw = await (0, import_promises11.readFile)(path, "utf8");
  } catch (error) {
    throw new AgentError("AGENT_HOOK_WRITE_FAILED", `Unable to read ${AGENT_HOOK_SETTINGS_PATH}.`, "Check file permissions, then run maru hook install again.", { cause: error });
  }
  if (raw.trim() === "")
    return {};
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    throw new AgentError("AGENT_HOOK_SETTINGS_INVALID", `${AGENT_HOOK_SETTINGS_PATH} is not valid JSON.`, "Repair the settings file by hand, then run maru hook install again; it was not overwritten.", { cause: error });
  }
  if (!isRecord2(parsed)) {
    throw new AgentError("AGENT_HOOK_SETTINGS_INVALID", `${AGENT_HOOK_SETTINGS_PATH} does not contain a JSON object.`, "Repair the settings file by hand, then run maru hook install again; it was not overwritten.");
  }
  return parsed;
}
async function writeSettings(path, settings) {
  try {
    await (0, import_promises11.mkdir)((0, import_node_path13.dirname)(path), { recursive: true });
    await (0, import_promises11.writeFile)(path, `${JSON.stringify(settings, null, 2)}
`, "utf8");
  } catch (error) {
    throw new AgentError("AGENT_HOOK_WRITE_FAILED", `Unable to write ${AGENT_HOOK_SETTINGS_PATH}.`, "Check directory permissions and available disk space, then retry.", { cause: error });
  }
}
async function installAgentHook(root, options = {}) {
  if (!await initialized(root)) {
    throw new AgentError("AGENT_HOOK_NOT_INITIALIZED", "MaruCheck must be initialized before the agent gate can be installed.", "Run maru init from the repository root, then run maru hook install again.");
  }
  const path = settingsFile(root);
  const settings = await readSettings(path);
  const hooks = isRecord2(settings.hooks) ? { ...settings.hooks } : {};
  const declared = hooks[AGENT_HOOK_EVENT];
  const existing = Array.isArray(declared) ? [...declared] : [];
  const command = [
    AGENT_HOOK_COMMAND,
    ...options.strict === true ? ["--strict"] : [],
    ...options.base === void 0 ? [] : ["--base", options.base]
  ].join(" ");
  const base = { command, path: AGENT_HOOK_SETTINGS_PATH };
  if (existing.some((group) => isMaruHookGroup(group))) {
    return { ...base, created: false, updated: false };
  }
  hooks[AGENT_HOOK_EVENT] = [...existing, createStopHookGroup(command)];
  await writeSettings(path, { ...settings, hooks });
  return { ...base, created: existing.length === 0, updated: existing.length > 0 };
}
async function uninstallAgentHook(root) {
  const path = settingsFile(root);
  const settings = await readSettings(path);
  const hooks = isRecord2(settings.hooks) ? { ...settings.hooks } : {};
  const declared = hooks[AGENT_HOOK_EVENT];
  const existing = Array.isArray(declared) ? declared : [];
  const remaining = existing.filter((group) => !isMaruHookGroup(group));
  if (remaining.length === existing.length) {
    return { path: AGENT_HOOK_SETTINGS_PATH, removed: false };
  }
  if (remaining.length === 0) {
    delete hooks[AGENT_HOOK_EVENT];
  } else {
    hooks[AGENT_HOOK_EVENT] = remaining;
  }
  const next = { ...settings, hooks };
  if (Object.keys(hooks).length === 0)
    delete next.hooks;
  await writeSettings(path, next);
  return { path: AGENT_HOOK_SETTINGS_PATH, removed: true };
}
function parseAgentHookInput(raw) {
  if (raw.trim() === "")
    return {};
  try {
    const parsed = JSON.parse(raw);
    return isRecord2(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
function statePath(root) {
  return (0, import_node_path13.join)((0, import_node_path13.resolve)(root), ...AGENT_GATE_STATE_PATH.split("/"));
}
async function readState(root) {
  try {
    const parsed = JSON.parse(await (0, import_promises11.readFile)(statePath(root), "utf8"));
    if (!isRecord2(parsed) || typeof parsed.consecutiveBlocks !== "number")
      return void 0;
    return {
      consecutiveBlocks: parsed.consecutiveBlocks,
      lastBlockedAt: typeof parsed.lastBlockedAt === "string" ? parsed.lastBlockedAt : "",
      sessionId: typeof parsed.sessionId === "string" ? parsed.sessionId : ""
    };
  } catch {
    return void 0;
  }
}
async function writeState(root, state) {
  const path = statePath(root);
  try {
    await (0, import_promises11.mkdir)((0, import_node_path13.dirname)(path), { recursive: true });
    await (0, import_promises11.writeFile)(path, `${JSON.stringify(state, null, 2)}
`, "utf8");
  } catch {
  }
}
function bounded(value, limit = 200) {
  const normalized2 = value.replace(/\s+/gu, " ").trim();
  return normalized2.length <= limit ? normalized2 : `${normalized2.slice(0, limit - 1)}...`;
}
function formatAgentGateReason(report) {
  const blocking = report.findings.filter((finding) => finding.blocking);
  const lines = [
    "MaruCheck gate: BLOCKED.",
    `Risk ${report.risk.level} (${String(report.risk.score)}). ${String(report.summary.requirementsFailed)} requirement(s) failed, ${String(report.summary.requirementsInconclusive)} inconclusive.`,
    ""
  ];
  for (const reason of report.gate.reasons.slice(0, MAX_REPORTED_FINDINGS)) {
    lines.push(`- ${bounded(reason)}`);
  }
  if (blocking.length > 0) {
    lines.push("", "Blocking findings:");
    for (const finding of blocking.slice(0, MAX_REPORTED_FINDINGS)) {
      lines.push(`- ${finding.requirementRef}: ${bounded(finding.title)}`);
      lines.push(`    expected:  ${bounded(finding.expected)}`);
      lines.push(`    actual:    ${bounded(finding.actual)}`);
      lines.push(`    reproduce: ${bounded(finding.reproduction.command)}`);
    }
    if (blocking.length > MAX_REPORTED_FINDINGS) {
      lines.push(`- ...and ${String(blocking.length - MAX_REPORTED_FINDINGS)} more.`);
    }
  }
  lines.push("", `Full evidence: ${report.artifacts.report}`, "Change the code so the approved contract holds. Do not edit or re-approve the", "contract to make this pass; if the contract itself is wrong, stop and tell the", "human to run maru drift propose.");
  return lines.join("\n");
}
function blockedPayload(reason) {
  return {
    hookSpecificOutput: {
      continue: true,
      hookEventName: AGENT_HOOK_EVENT,
      stopReason: reason,
      suppressOutput: false
    },
    systemMessage: reason
  };
}
function passthroughPayload(systemMessage) {
  return systemMessage === void 0 ? {} : { systemMessage };
}
function failClosed(reason) {
  return { blocked: true, exitCode: 2, payload: blockedPayload(reason), reason };
}
async function runAgentGate(root, options = {}) {
  const input = options.input ?? {};
  const now = options.now ?? /* @__PURE__ */ new Date();
  const sessionId = input.session_id ?? "";
  const strict = options.strict === true;
  if (!await initialized(root)) {
    if (strict) {
      return failClosed("MaruCheck gate: BLOCKED. .maru/maru.yml is missing, so nothing can be verified. Restore the MaruCheck configuration; do not end the turn without it.");
    }
    return { blocked: false, exitCode: 0, payload: {}, reason: "", skipped: "not-initialized" };
  }
  const previous = await readState(root);
  const priorBlocks = previous?.sessionId === sessionId ? previous.consecutiveBlocks : 0;
  if (strict && priorBlocks >= AGENT_GATE_MAX_CONSECUTIVE_BLOCKS) {
    const message = `MaruCheck gate: UNVERIFIED after ${String(priorBlocks)} blocked attempt(s). This work has not passed verification and the merge gate will reject it.`;
    return {
      blocked: false,
      exitCode: 0,
      payload: passthroughPayload(message),
      reason: message,
      skipped: "loop-guard"
    };
  }
  if (!strict && (input.stop_hook_active === true || priorBlocks >= AGENT_GATE_MAX_CONSECUTIVE_BLOCKS)) {
    const message = `MaruCheck gate is still blocked after ${String(priorBlocks)} attempt(s). Returning control to the human instead of looping; run maru verify --diff to see why.`;
    await writeState(root, { consecutiveBlocks: 0, lastBlockedAt: now.toISOString(), sessionId });
    return {
      blocked: false,
      exitCode: 0,
      payload: passthroughPayload(message),
      reason: message,
      skipped: "loop-guard"
    };
  }
  let result;
  try {
    result = await (options.createReport ?? createAndWriteVerificationReport)(root, now, {
      ...options.base === void 0 ? {} : { base: options.base },
      ...options.strict === void 0 ? {} : { strict: options.strict }
    });
  } catch (error) {
    const detail = error instanceof Error ? bounded(error.message) : "unknown error";
    if (strict) {
      await writeState(root, {
        consecutiveBlocks: priorBlocks + 1,
        lastBlockedAt: now.toISOString(),
        sessionId
      });
      return failClosed(`MaruCheck gate: BLOCKED. Verification could not run: ${detail}`);
    }
    const message = `MaruCheck gate did not run: ${detail} The turn was not blocked.`;
    return {
      blocked: false,
      exitCode: 0,
      payload: passthroughPayload(message),
      reason: message,
      skipped: "verification-unavailable"
    };
  }
  if (result.report.gate.status !== "blocked") {
    await writeState(root, { consecutiveBlocks: 0, lastBlockedAt: "", sessionId });
    const message = `MaruCheck gate: passed. Evidence: ${result.report.artifacts.report}`;
    return {
      blocked: false,
      exitCode: 0,
      payload: passthroughPayload(message),
      reason: message,
      report: result.report,
      skipped: "gate-passed"
    };
  }
  const reason = formatAgentGateReason(result.report);
  await writeState(root, {
    consecutiveBlocks: priorBlocks + 1,
    lastBlockedAt: now.toISOString(),
    sessionId
  });
  return {
    blocked: true,
    exitCode: 2,
    payload: blockedPayload(reason),
    reason,
    report: result.report
  };
}

// packages/challenger/dist/index.js
var import_node_crypto3 = require("node:crypto");
var import_promises12 = require("node:fs/promises");
var import_node_path14 = require("node:path");

// packages/challenger/dist/model.js
var CHALLENGE_BRIEF_SCHEMA_VERSION = 1;
var CHALLENGE_REPORT_SCHEMA_VERSION = 1;
var CHALLENGE_SUBMISSION_SCHEMA_VERSION = 1;
var CHALLENGE_ARTIFACT_DIRECTORY = ".maru/artifacts/challenges";
var ChallengeError = class extends Error {
  code;
  remediation;
  constructor(code, message, remediation, options) {
    super(message, options);
    this.code = code;
    this.remediation = remediation;
    this.name = "ChallengeError";
  }
};

// packages/challenger/dist/validation.js
var CATEGORIES = /* @__PURE__ */ new Set([
  "data-integrity",
  "external-failure",
  "input-boundary",
  "invalid-state-transition",
  "permission-abuse",
  "race-condition",
  "replay-attack",
  "timing"
]);
var PRIORITIES = /* @__PURE__ */ new Set(["critical", "high", "low", "medium"]);
var VERIFICATION_CATEGORIES = /* @__PURE__ */ new Set([
  "api",
  "e2e",
  "integration",
  "manual",
  "security",
  "unit"
]);
var ISOLATION = /* @__PURE__ */ new Set([
  "fresh-thread",
  "separate-agent",
  "subagent",
  "unknown"
]);
var ID = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
var HASH = /^[a-f0-9]{64}$/u;
function invalid2(message) {
  throw new ChallengeError("CHALLENGE_INVALID_SUBMISSION", message, "Use the brief's published response schema and submit only scoped, structured QA output.");
}
function object(value, keys, path) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalid2(`${path} must be an object.`);
  }
  const record4 = value;
  const unknown = Object.keys(record4).filter((key) => !keys.includes(key));
  if (unknown.length > 0)
    return invalid2(`${path} contains unsupported fields: ${unknown.join(", ")}.`);
  return record4;
}
function string(value, path, maximum) {
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum) {
    return invalid2(`${path} must contain 1 to ${maximum} characters.`);
  }
  return value.trim();
}
function optionalString(value, path, maximum) {
  return value === void 0 ? void 0 : string(value, path, maximum);
}
function stringArray(value, path, options) {
  if (!Array.isArray(value) || value.length < (options.minimumItems ?? 0) || value.length > options.maximumItems) {
    return invalid2(`${path} has an invalid item count.`);
  }
  const result = value.map((item, index) => string(item, `${path}[${index}]`, options.maximumLength));
  if (new Set(result).size !== result.length)
    return invalid2(`${path} contains duplicates.`);
  return result;
}
function nullableCount(value, path) {
  if (value === null || value === void 0)
    return null;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    return invalid2(`${path} must be a non-negative integer or null.`);
  }
  return value;
}
function nullableCost(value) {
  if (value === null || value === void 0)
    return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 100) {
    return invalid2("submission.provenance.usage.estimatedCostUsd must be 0 to 100 or null.");
  }
  return value;
}
function usage(value) {
  if (value === void 0) {
    return {
      estimatedCostUsd: null,
      inputTokens: null,
      outputTokens: null,
      source: "not-reported",
      totalTokens: null
    };
  }
  const input = object(value, ["estimatedCostUsd", "inputTokens", "outputTokens", "totalTokens"], "submission.provenance.usage");
  const inputTokens = nullableCount(input.inputTokens, "submission.provenance.usage.inputTokens");
  const outputTokens = nullableCount(input.outputTokens, "submission.provenance.usage.outputTokens");
  const totalTokens = nullableCount(input.totalTokens, "submission.provenance.usage.totalTokens");
  if (inputTokens !== null && outputTokens !== null && totalTokens !== inputTokens + outputTokens) {
    return invalid2("submission.provenance.usage.totalTokens must equal inputTokens plus outputTokens.");
  }
  return {
    estimatedCostUsd: nullableCost(input.estimatedCostUsd),
    inputTokens,
    outputTokens,
    source: "client-reported",
    totalTokens
  };
}
var CHALLENGE_RESPONSE_SCHEMA = {
  additionalProperties: false,
  properties: {
    challenges: {
      items: {
        additionalProperties: false,
        properties: {
          category: { enum: [...CATEGORIES], type: "string" },
          counterexample: { maxLength: 2e3, minLength: 1, type: "string" },
          id: { maxLength: 80, minLength: 1, pattern: ID.source, type: "string" },
          priority: { enum: [...PRIORITIES], type: "string" },
          requirementRefs: {
            items: { maxLength: 241, minLength: 3, type: "string" },
            maxItems: 50,
            type: "array"
          },
          targetFiles: {
            items: { maxLength: 500, minLength: 1, type: "string" },
            maxItems: 50,
            minItems: 1,
            type: "array"
          },
          title: { maxLength: 200, minLength: 1, type: "string" },
          verification: {
            additionalProperties: false,
            properties: {
              category: { enum: [...VERIFICATION_CATEGORIES], type: "string" },
              objective: { maxLength: 2e3, minLength: 1, type: "string" },
              steps: {
                items: { maxLength: 1e3, minLength: 1, type: "string" },
                maxItems: 10,
                minItems: 1,
                type: "array"
              }
            },
            required: ["category", "objective", "steps"],
            type: "object"
          },
          whyLikelyMissed: { maxLength: 2e3, minLength: 1, type: "string" }
        },
        required: [
          "category",
          "counterexample",
          "id",
          "priority",
          "requirementRefs",
          "targetFiles",
          "title",
          "verification",
          "whyLikelyMissed"
        ],
        type: "object"
      },
      maxItems: 20,
      type: "array"
    },
    summary: { maxLength: 2e3, minLength: 1, type: "string" }
  },
  required: ["challenges", "summary"],
  type: "object"
};
function challengeCases(value, allowedRequirementRefs, allowedFiles) {
  if (!Array.isArray(value) || value.length > 20)
    return invalid2("submission.result.challenges is invalid.");
  const ids = /* @__PURE__ */ new Set();
  return value.map((entry, index) => {
    const path = `submission.result.challenges[${index}]`;
    const item = object(entry, [
      "category",
      "counterexample",
      "id",
      "priority",
      "requirementRefs",
      "targetFiles",
      "title",
      "verification",
      "whyLikelyMissed"
    ], path);
    const id = string(item.id, `${path}.id`, 80);
    if (!ID.test(id) || ids.has(id))
      return invalid2(`${path}.id is invalid or duplicated.`);
    ids.add(id);
    if (!CATEGORIES.has(item.category))
      return invalid2(`${path}.category is invalid.`);
    if (!PRIORITIES.has(item.priority))
      return invalid2(`${path}.priority is invalid.`);
    const requirementRefs = stringArray(item.requirementRefs, `${path}.requirementRefs`, {
      maximumItems: 50,
      maximumLength: 241
    });
    if (requirementRefs.some((reference) => !allowedRequirementRefs.has(reference))) {
      return invalid2(`${path}.requirementRefs contains an unknown reference.`);
    }
    const targetFiles = stringArray(item.targetFiles, `${path}.targetFiles`, {
      maximumItems: 50,
      maximumLength: 500,
      minimumItems: 1
    });
    if (targetFiles.some((file) => !allowedFiles.has(file))) {
      return invalid2(`${path}.targetFiles contains a file outside the prepared diff.`);
    }
    const verification = object(item.verification, ["category", "objective", "steps"], `${path}.verification`);
    if (!VERIFICATION_CATEGORIES.has(verification.category)) {
      return invalid2(`${path}.verification.category is invalid.`);
    }
    return {
      category: item.category,
      counterexample: string(item.counterexample, `${path}.counterexample`, 2e3),
      id,
      priority: item.priority,
      requirementRefs,
      targetFiles,
      title: string(item.title, `${path}.title`, 200),
      verification: {
        category: verification.category,
        objective: string(verification.objective, `${path}.verification.objective`, 2e3),
        steps: stringArray(verification.steps, `${path}.verification.steps`, {
          maximumItems: 10,
          maximumLength: 1e3,
          minimumItems: 1
        })
      },
      whyLikelyMissed: string(item.whyLikelyMissed, `${path}.whyLikelyMissed`, 2e3)
    };
  });
}
function parseChallengeSubmission(value, allowedRequirementRefs, allowedFiles) {
  const root = object(value, ["briefHash", "briefId", "provenance", "result", "schemaVersion"], "submission");
  if (root.schemaVersion !== CHALLENGE_SUBMISSION_SCHEMA_VERSION) {
    return invalid2("submission.schemaVersion must be 1.");
  }
  const briefHash = string(root.briefHash, "submission.briefHash", 64);
  if (!HASH.test(briefHash))
    return invalid2("submission.briefHash must be a SHA-256 hash.");
  const briefId2 = string(root.briefId, "submission.briefId", 200);
  if (!ID.test(briefId2))
    return invalid2("submission.briefId is invalid.");
  const provenance = object(root.provenance, ["attested", "client", "isolation", "model", "usage"], "submission.provenance");
  if (typeof provenance.attested !== "boolean")
    return invalid2("submission.provenance.attested must be a boolean.");
  if (!ISOLATION.has(provenance.isolation)) {
    return invalid2("submission.provenance.isolation is invalid.");
  }
  const result = object(root.result, ["challenges", "summary"], "submission.result");
  return {
    briefHash,
    briefId: briefId2,
    provenance: {
      attested: provenance.attested,
      client: string(provenance.client, "submission.provenance.client", 100),
      isolation: provenance.isolation,
      ...provenance.model === void 0 ? {} : { model: optionalString(provenance.model, "submission.provenance.model", 200) },
      usage: usage(provenance.usage)
    },
    result: {
      challenges: challengeCases(result.challenges, allowedRequirementRefs, allowedFiles),
      summary: string(result.summary, "submission.result.summary", 2e3)
    },
    schemaVersion: CHALLENGE_SUBMISSION_SCHEMA_VERSION
  };
}

// packages/challenger/dist/index.js
var MAX_JSON_BYTES = 1e6;
var MAX_FILES = 100;
var MAX_HUNKS_PER_FILE = 20;
var MAX_SYMBOLS_PER_FILE = 50;
var MAX_HISTORICAL_RISKS = 20;
var MAX_REQUIREMENTS = 100;
var MAX_RISK_REASONS = 50;
function portable3(path) {
  return path.split(import_node_path14.sep).join("/");
}
function canonicalize2(value) {
  if (Array.isArray(value))
    return value.map(canonicalize2);
  if (typeof value !== "object" || value === null)
    return value;
  return Object.fromEntries(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => [key, canonicalize2(entry)]));
}
function hash(value) {
  return (0, import_node_crypto3.createHash)("sha256").update(JSON.stringify(canonicalize2(value))).digest("hex");
}
function withoutBriefHash(brief) {
  return Object.fromEntries(Object.entries(brief).filter(([key]) => key !== "briefHash"));
}
function buildChallengeActivation(level, options = {}) {
  const triggers = [
    ...level === "critical" ? ["critical-risk"] : [],
    ...level === "high" ? ["high-risk"] : [],
    ...options.explicit === true ? ["explicit-request"] : [],
    ...options.releaseVerification === true ? ["release-verification"] : []
  ];
  return { activated: triggers.length > 0, triggers };
}
async function defaultContractRequirements(root, assessment) {
  const result = [];
  for (const match of assessment.relatedContracts) {
    const contract = await getContract(root, match.contractId);
    for (const requirement of contract.requirements) {
      if (match.requirementIds.length === 0 || match.requirementIds.includes(requirement.id)) {
        result.push({
          contractId: contract.id,
          id: requirement.id,
          kind: "requirement",
          statement: requirement.statement
        });
      }
    }
    for (const invariant of contract.invariants) {
      if (match.invariantIds.length === 0 || match.invariantIds.includes(invariant.id)) {
        result.push({
          contractId: contract.id,
          id: invariant.id,
          kind: "invariant",
          statement: invariant.statement
        });
      }
    }
  }
  return result.slice(0, MAX_REQUIREMENTS);
}
function briefId(now) {
  return `challenge-${now.toISOString().replaceAll(/[^0-9]/gu, "")}`;
}
async function allocateChallengeDirectory(root, id) {
  const base = (0, import_node_path14.resolve)(root, CHALLENGE_ARTIFACT_DIRECTORY);
  try {
    await (0, import_promises12.mkdir)(base, { recursive: true });
    for (let suffix = 0; suffix < 1e3; suffix += 1) {
      const directory = (0, import_node_path14.resolve)(base, suffix === 0 ? id : `${id}-${suffix}`);
      try {
        await (0, import_promises12.mkdir)(directory);
        return directory;
      } catch (error) {
        if (error.code !== "EEXIST")
          throw error;
      }
    }
  } catch (error) {
    throw new ChallengeError("CHALLENGE_WRITE_FAILED", "Unable to allocate a Challenger artifact directory.", "Check write permissions for .maru/artifacts/challenges, then retry.", { cause: error });
  }
  throw new ChallengeError("CHALLENGE_WRITE_FAILED", "Unable to allocate a unique Challenger artifact directory.", "Retry with a later timestamp.");
}
async function prepareAndWriteChallengeBrief(root, now = /* @__PURE__ */ new Date(), options = {}) {
  const assessment = await (options.assessRisk ?? assessProjectRisk)(root);
  const requirements = await (options.contractRequirements ?? defaultContractRequirements)(root, assessment);
  const id = briefId(now);
  const activation = buildChallengeActivation(assessment.level, options);
  const core = {
    activation,
    briefId: id,
    context: {
      changedFiles: assessment.analysis.files.slice(0, MAX_FILES).map((file) => ({
        additions: file.additions,
        classifications: file.classifications,
        deletions: file.deletions,
        hunks: file.hunks.slice(0, MAX_HUNKS_PER_FILE),
        path: file.path,
        status: file.status,
        symbols: file.symbols.slice(0, MAX_SYMBOLS_PER_FILE)
      })),
      historicalRisks: assessment.historicalRisks.slice(0, MAX_HISTORICAL_RISKS).map((memory) => ({
        memoryId: memory.memoryId,
        reasons: memory.reasons,
        relevance: memory.relevance.level,
        severity: memory.severity,
        title: memory.title
      })),
      requirements: requirements.slice(0, MAX_REQUIREMENTS),
      riskReasons: assessment.reasons.slice(0, MAX_RISK_REASONS)
    },
    createdAt: now.toISOString(),
    instructions: [
      "Analyze this brief in a fresh thread, separate agent, or subagent without the builder conversation.",
      "Act as an adversarial QA reviewer and challenge the implementation assumptions represented by the bounded metadata.",
      "Return JSON only, matching responseSchema exactly; the enclosing client must add briefId, briefHash, and provenance before submission.",
      "Propose concrete counterexamples and verification objectives, not source code, shell commands, contract changes, pass/fail claims, or verified findings.",
      "Reference only requirement IDs and changed file paths present in this brief."
    ],
    responseSchema: CHALLENGE_RESPONSE_SCHEMA,
    risk: { level: assessment.level, score: assessment.score },
    schemaVersion: CHALLENGE_BRIEF_SCHEMA_VERSION,
    scope: "working-tree"
  };
  const brief = { ...core, briefHash: hash(core) };
  const directory = await allocateChallengeDirectory(root, id);
  const target = (0, import_node_path14.resolve)(directory, "brief.json");
  try {
    await (0, import_promises12.writeFile)(target, `${JSON.stringify(brief, null, 2)}
`, {
      encoding: "utf8",
      flag: "wx"
    });
  } catch (error) {
    throw new ChallengeError("CHALLENGE_WRITE_FAILED", "Unable to write the Challenger brief.", "Check project artifact permissions, then retry.", { cause: error });
  }
  return { brief, path: portable3((0, import_node_path14.relative)((0, import_node_path14.resolve)(root), target)) };
}
function invalidBrief(message) {
  throw new ChallengeError("CHALLENGE_INVALID_BRIEF", message, "Prepare a new brief with MaruCheck and do not edit it before submission.");
}
function resolvedProjectFile(root, path, kind) {
  if (path.trim().length === 0 || (0, import_node_path14.isAbsolute)(path)) {
    return invalidBrief(`${kind} path must be project-relative.`);
  }
  const absoluteRoot = (0, import_node_path14.resolve)(root);
  const target = (0, import_node_path14.resolve)(absoluteRoot, path);
  if (target === absoluteRoot || !target.startsWith(`${absoluteRoot}${import_node_path14.sep}`)) {
    return invalidBrief(`${kind} path escapes the project root.`);
  }
  if (kind === "brief") {
    const relativePath2 = portable3((0, import_node_path14.relative)(absoluteRoot, target));
    if (!relativePath2.startsWith(`${CHALLENGE_ARTIFACT_DIRECTORY}/challenge-`) || (0, import_node_path14.basename)(target) !== "brief.json") {
      return invalidBrief("brief path must reference a generated Challenger brief artifact.");
    }
  }
  return target;
}
async function readBoundedJson(root, path, kind) {
  const target = resolvedProjectFile(root, path, kind);
  try {
    const info = await (0, import_promises12.lstat)(target);
    if (!info.isFile() || info.isSymbolicLink() || info.size > MAX_JSON_BYTES) {
      return invalidBrief(`${kind} must be a regular JSON file no larger than ${MAX_JSON_BYTES} bytes.`);
    }
    return JSON.parse(await (0, import_promises12.readFile)(target, "utf8"));
  } catch (error) {
    if (error instanceof ChallengeError)
      throw error;
    throw new ChallengeError("CHALLENGE_READ_FAILED", `Unable to read the Challenger ${kind} JSON.`, `Confirm the ${kind} path is a readable JSON file inside the project, then retry.`, { cause: error });
  }
}
function validateBrief(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return invalidBrief("Challenger brief must be a JSON object.");
  }
  const record4 = value;
  const context = record4.context;
  const risk = record4.risk;
  if (record4.schemaVersion !== CHALLENGE_BRIEF_SCHEMA_VERSION || typeof record4.briefId !== "string" || !/^challenge-[a-z0-9-]+$/u.test(record4.briefId) || typeof record4.briefHash !== "string" || !/^[a-f0-9]{64}$/u.test(record4.briefHash) || typeof record4.createdAt !== "string" || record4.scope !== "working-tree" || typeof context !== "object" || context === null || Array.isArray(context) || !Array.isArray(context.changedFiles) || !Array.isArray(context.requirements) || typeof risk !== "object" || risk === null || Array.isArray(risk)) {
    return invalidBrief("Challenger brief has an invalid structure.");
  }
  if (hash(withoutBriefHash(record4)) !== record4.briefHash) {
    return invalidBrief("Challenger brief hash does not match its contents.");
  }
  return value;
}
async function readChallengeBrief(root, briefPath) {
  return validateBrief(await readBoundedJson(root, briefPath, "brief"));
}
async function submitChallengeResponse(root, briefPath, submissionValue, now = /* @__PURE__ */ new Date()) {
  const brief = await readChallengeBrief(root, briefPath);
  if (!brief.activation.activated) {
    throw new ChallengeError("CHALLENGE_INACTIVE", "This brief was not activated by risk, an explicit request, or release verification.", "Prepare an explicit Challenger brief or use the deterministic verification workflow.");
  }
  const allowedRequirementRefs = new Set(brief.context.requirements.map((item) => `${item.contractId}#${item.id}`));
  const allowedFiles = new Set(brief.context.changedFiles.map((file) => file.path));
  const submission = parseChallengeSubmission(submissionValue, allowedRequirementRefs, allowedFiles);
  if (submission.briefId !== brief.briefId || submission.briefHash !== brief.briefHash) {
    throw new ChallengeError("CHALLENGE_INVALID_SUBMISSION", "Submission briefId or briefHash does not match the prepared brief.", "Submit the response with the exact identifiers from the corresponding brief.json.");
  }
  const attested = submission.provenance.attested && submission.provenance.isolation !== "unknown";
  const reasons = attested ? [] : ["The client did not attest that reasoning occurred in an isolated QA context."];
  const report = {
    brief: { hash: brief.briefHash, id: brief.briefId, path: portable3(briefPath) },
    challenges: submission.result.challenges,
    gate: { reasons, status: attested ? "passed" : "blocked" },
    generatedAt: now.toISOString(),
    provenance: submission.provenance,
    risk: brief.risk,
    schemaVersion: CHALLENGE_REPORT_SCHEMA_VERSION,
    scope: "working-tree",
    status: attested ? "completed" : "unattested",
    summary: submission.result.summary
  };
  const target = (0, import_node_path14.resolve)(resolvedProjectFile(root, briefPath, "brief"), "..", "report.json");
  try {
    await (0, import_promises12.writeFile)(target, `${JSON.stringify(report, null, 2)}
`, {
      encoding: "utf8",
      flag: "wx"
    });
  } catch (error) {
    if (error.code === "EEXIST") {
      throw new ChallengeError("CHALLENGE_ALREADY_SUBMITTED", "This Challenger brief already has a report.", "Inspect the existing report or prepare a new brief for another independent review.", { cause: error });
    }
    throw new ChallengeError("CHALLENGE_WRITE_FAILED", "Unable to write the Challenger report.", "Check project artifact permissions, then retry.", { cause: error });
  }
  return { path: portable3((0, import_node_path14.relative)((0, import_node_path14.resolve)(root), target)), report };
}
async function submitChallengeFromFile(root, briefPath, responsePath, now = /* @__PURE__ */ new Date()) {
  const response2 = await readBoundedJson(root, responsePath, "response");
  return submitChallengeResponse(root, briefPath, response2, now);
}
function formatChallengeBrief(result) {
  const { brief } = result;
  return [
    `Challenger brief written: ${result.path}`,
    `Risk: ${brief.risk.level.toUpperCase()} (${brief.risk.score}/100)`,
    `Activation: ${brief.activation.activated ? brief.activation.triggers.join(", ") : "inactive"}`,
    `Context: ${brief.context.changedFiles.length} changed files, ${brief.context.requirements.length} protected requirements, ${brief.context.historicalRisks.length} historical risks`,
    `Brief hash: ${brief.briefHash}`,
    "Next: give brief.json to a fresh QA thread/subagent, save its attested JSON envelope, then run maru challenge submit --brief <brief.json> --from <response.json>."
  ].join("\n");
}
function formatChallengeReport(result) {
  const { report } = result;
  const usage2 = report.provenance.usage;
  return [
    `Challenger: ${report.gate.status.toUpperCase()} (${report.status})`,
    `Report: ${result.path}`,
    `Reviewer: ${report.provenance.client}${report.provenance.model === void 0 ? "" : ` / ${report.provenance.model}`}`,
    `Isolation: ${report.provenance.isolation} (${report.provenance.attested ? "attested" : "not attested"})`,
    `Usage: ${usage2.source === "not-reported" ? "not reported" : `${usage2.totalTokens ?? "unknown"} tokens, ${usage2.estimatedCostUsd ?? "unknown"} USD`}`,
    `Challenge hypotheses: ${report.challenges.length}`,
    "These are review hypotheses, not verified findings or pass/fail evidence."
  ].join("\n");
}

// packages/ci/dist/index.js
var import_promises13 = require("node:fs/promises");
var import_node_path15 = require("node:path");
var CI_GITHUB_WORKFLOW_PATH = ".github/workflows/marucheck.yml";
var CI_GITHUB_SUMMARY_PATH = ".maru/generated/github-summary.md";
var CiError = class extends Error {
  code;
  remediation;
  constructor(code, message, remediation, options) {
    super(message, options);
    this.code = code;
    this.remediation = remediation;
    this.name = "CiError";
  }
};
function createGitHubWorkflow() {
  return `name: MaruCheck

on:
  pull_request:

permissions:
  contents: read

concurrency:
  group: marucheck-\${{ github.workflow }}-\${{ github.event.pull_request.number || github.ref }}
  cancel-in-progress: true

jobs:
  prooflayer:
    name: ProofLayer
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - name: Checkout pull request
        uses: actions/checkout@v7
        with:
          fetch-depth: 0
          persist-credentials: false

      - name: Set up Node.js
        uses: actions/setup-node@v7
        with:
          node-version: 24
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Verify Quality Contracts
        run: npx --no-install maru ci verify

      - name: Upload verification evidence
        if: always()
        uses: actions/upload-artifact@v7
        with:
          name: marucheck-evidence-\${{ github.run_id }}-\${{ github.run_attempt }}
          path: |
            .maru/artifacts/
            .maru/generated/verification-plan.json
            .maru/generated/github-summary.md
          if-no-files-found: warn
          include-hidden-files: true
          retention-days: 14
`;
}
function isNodeError(error, code) {
  return error instanceof Error && "code" in error && typeof error.code === "string" && error.code === code;
}
async function initialized2(root) {
  try {
    await (0, import_promises13.access)((0, import_node_path15.join)((0, import_node_path15.resolve)(root), ".maru", "maru.yml"));
    return true;
  } catch {
    return false;
  }
}
async function installGitHubWorkflow(root) {
  if (!await initialized2(root)) {
    throw new CiError("CI_NOT_INITIALIZED", "MaruCheck must be initialized before CI can be installed.", "Run maru init from the repository root, then run maru ci init again.");
  }
  const target = (0, import_node_path15.join)((0, import_node_path15.resolve)(root), ...CI_GITHUB_WORKFLOW_PATH.split("/"));
  const workflow = createGitHubWorkflow();
  try {
    await (0, import_promises13.mkdir)((0, import_node_path15.dirname)(target), { recursive: true });
    await (0, import_promises13.writeFile)(target, workflow, { encoding: "utf8", flag: "wx" });
    return { created: true, path: CI_GITHUB_WORKFLOW_PATH };
  } catch (error) {
    if (isNodeError(error, "EEXIST")) {
      try {
        if (await (0, import_promises13.readFile)(target, "utf8") === workflow) {
          return { created: false, path: CI_GITHUB_WORKFLOW_PATH };
        }
      } catch (readError) {
        throw new CiError("CI_WORKFLOW_WRITE_FAILED", `Unable to inspect ${CI_GITHUB_WORKFLOW_PATH}.`, "Check repository permissions and retry.", { cause: readError });
      }
      throw new CiError("CI_WORKFLOW_EXISTS", `${CI_GITHUB_WORKFLOW_PATH} already exists with different content.`, "Review the existing workflow and merge the MaruCheck steps manually; it was not overwritten.");
    }
    throw new CiError("CI_WORKFLOW_WRITE_FAILED", `Unable to write ${CI_GITHUB_WORKFLOW_PATH}.`, "Check repository permissions and available disk space, then retry.", { cause: error });
  }
}
function safeInline(value, limit = 500) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replace(/([\\`*_[\]()!|~])/gu, "\\$1").replace(/\s+/gu, " ").trim().slice(0, limit);
}
function findingSummary(report) {
  if (report.findings.length === 0) {
    return ["## Findings", "", "No open findings were produced."];
  }
  const visible = report.findings.slice(0, 20);
  const lines = visible.flatMap((finding) => [
    `### ${finding.severity.toUpperCase()} \xB7 ${finding.blocking ? "Blocking" : "Advisory"} \xB7 ${safeInline(finding.title)}`,
    "",
    ...finding.requirementRef === void 0 ? [] : [`- Contract requirement: \`${safeInline(finding.requirementRef)}\``],
    ...finding.expected === void 0 ? [] : [`- Expected: ${safeInline(finding.expected)}`],
    `- Actual: ${safeInline(finding.actual)}`,
    `- Reproduce: \`${safeInline(finding.reproduction.command)}\``,
    `- Evidence: ${finding.artifactRefs.map((path) => `\`${safeInline(path)}\``).join(", ") || "none"}`,
    ""
  ]);
  if (report.findings.length > visible.length) {
    lines.push(`_${report.findings.length - visible.length} additional finding(s) are in the JSON report._`);
  }
  return ["## Findings", "", ...lines];
}
function formatGitHubSummary(report) {
  const failed = report.gate.status === "blocked";
  const gate = failed ? "\u274C BLOCKED" : "\u2705 PASSED";
  return [
    "# MaruCheck ProofLayer",
    "",
    `## ${gate}`,
    "",
    "| Result | Value |",
    "| --- | --- |",
    `| Project | ${safeInline(report.project.name)} |`,
    `| Risk | ${report.risk.level.toUpperCase()} (${report.risk.score}/100) |`,
    `| Run | \`${safeInline(report.runId)}\` (${report.runStatus}) |`,
    `| Evidence | ${report.summary.passedEvidence} passed, ${report.summary.failedEvidence} failed, ${report.summary.inconclusiveEvidence} inconclusive |`,
    `| Requirements | ${report.summary.requirementsPassed} passed, ${report.summary.requirementsFailed} failed, ${report.summary.requirementsInconclusive} inconclusive, ${report.summary.requirementsUnverified} unverified |`,
    `| Findings | ${report.summary.findings} total, ${report.summary.blockingFindings} blocking |`,
    "",
    ...report.gate.reasons.length === 0 ? [] : [
      "## Gate reasons",
      "",
      ...report.gate.reasons.slice(0, 10).map((reason) => `- ${safeInline(reason)}`),
      ""
    ],
    ...findingSummary(report),
    "",
    `Full JSON report: \`${safeInline(report.artifacts.report)}\``,
    ""
  ].join("\n");
}
async function writeSummary(root, report, githubStepSummaryPath) {
  const absoluteRoot = (0, import_node_path15.resolve)(root);
  const target = (0, import_node_path15.resolve)(absoluteRoot, ...CI_GITHUB_SUMMARY_PATH.split("/"));
  if (!target.startsWith(`${absoluteRoot}${import_node_path15.sep}`)) {
    throw new CiError("CI_SUMMARY_WRITE_FAILED", "The generated summary path escapes the project root.", "Run CI verification from the repository root.");
  }
  const summary3 = formatGitHubSummary(report);
  try {
    await (0, import_promises13.mkdir)((0, import_node_path15.dirname)(target), { recursive: true });
    await (0, import_promises13.writeFile)(target, summary3, "utf8");
    if (githubStepSummaryPath !== void 0 && githubStepSummaryPath.trim().length > 0) {
      await (0, import_promises13.appendFile)(githubStepSummaryPath, summary3, "utf8");
      return true;
    }
    return false;
  } catch (error) {
    throw new CiError("CI_SUMMARY_WRITE_FAILED", "Unable to persist the pull-request verification summary.", "Check project and GitHub runner summary permissions, then retry.", { cause: error });
  }
}
async function runPullRequestVerification(root, now = /* @__PURE__ */ new Date(), options = {}) {
  const environment = options.environment ?? process.env;
  const base = options.base ?? (environment.GITHUB_BASE_REF ? `origin/${environment.GITHUB_BASE_REF}` : void 0);
  const verification = await (options.verificationReport ?? createAndWriteVerificationReport)(root, now, {
    ...base === void 0 ? {} : { base },
    ...options.strict === void 0 ? {} : { strict: options.strict }
  });
  const nothingVerified = base === void 0 && verification.report.summary.evidence === 0;
  const publishedToGitHub = await writeSummary(root, verification.report, options.githubStepSummaryPath ?? process.env.GITHUB_STEP_SUMMARY);
  return {
    conclusion: verification.report.gate.status === "blocked" || nothingVerified ? "failure" : "success",
    publishedToGitHub,
    reportPath: verification.path,
    summaryPath: portablePath3((0, import_node_path15.relative)((0, import_node_path15.resolve)(root), (0, import_node_path15.resolve)(root, CI_GITHUB_SUMMARY_PATH)))
  };
}
function portablePath3(path) {
  return path.split(import_node_path15.sep).join("/");
}

// packages/drift/dist/model.js
var SEMANTIC_DRIFT_SCHEMA_VERSION = 1;
var CONTRACT_AMENDMENT_SCHEMA_VERSION = 1;
var DriftError = class extends Error {
  code;
  remediation;
  constructor(code, message, remediation, options) {
    super(message, options);
    this.code = code;
    this.remediation = remediation;
    this.name = "DriftError";
  }
};

// packages/drift/dist/guard.js
var REFERENCE = /^([A-Za-z0-9][A-Za-z0-9._-]{0,119})#([A-Za-z0-9][A-Za-z0-9._-]{0,119})$/u;
var ACTIONS = ["mark-implementation-bug", "propose-contract-amendment", "investigate"];
var MAINTENANCE_KINDS = /* @__PURE__ */ new Set([
  "dom-structure",
  "fixture-setup",
  "route-timing",
  "selector",
  "wait-condition"
]);
function normalize(statement) {
  return statement.trim().replace(/\s+/gu, " ");
}
function parseObservedBehaviors(value) {
  const candidate = typeof value === "object" && value !== null && !Array.isArray(value) ? value.observations : value;
  if (!Array.isArray(candidate) || candidate.length === 0 || candidate.length > 100) {
    throw new DriftError("DRIFT_INVALID_INPUT", "Observations must contain between 1 and 100 entries.", "Provide an array, or an object with an observations array, using contract-id#requirement-id references.");
  }
  return candidate.map((item, index) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new DriftError("DRIFT_INVALID_INPUT", `Observation ${index + 1} must be an object.`, "Provide requirementRef and observed strings for every observation.");
    }
    const input = item;
    const unknown = Object.keys(input).filter((key) => !["maintenanceKind", "observed", "requirementRef", "source"].includes(key));
    if (unknown.length > 0 || typeof input.requirementRef !== "string" || !REFERENCE.test(input.requirementRef) || typeof input.observed !== "string" || input.observed.trim().length === 0 || input.observed.length > 1e4 || input.maintenanceKind !== void 0 && (typeof input.maintenanceKind !== "string" || !MAINTENANCE_KINDS.has(input.maintenanceKind))) {
      throw new DriftError("DRIFT_INVALID_INPUT", `Observation ${index + 1} is invalid.`, "Use a valid requirementRef, a non-empty observed statement, and an optional published maintenanceKind.");
    }
    let source;
    if (input.source !== void 0) {
      if (typeof input.source !== "object" || input.source === null || Array.isArray(input.source) || typeof input.source.path !== "string") {
        throw new DriftError("DRIFT_INVALID_INPUT", `Observation ${index + 1} has an invalid source.`, "Use source.path and an optional positive source.line.");
      }
      const raw = input.source;
      const sourcePath = raw.path;
      if (typeof sourcePath !== "string" || sourcePath.length === 0 || sourcePath.length > 500 || raw.line !== void 0 && (typeof raw.line !== "number" || !Number.isInteger(raw.line) || raw.line < 1)) {
        throw new DriftError("DRIFT_INVALID_INPUT", `Observation ${index + 1} has an invalid source.`, "Use source.path and an optional positive source.line.");
      }
      source = {
        path: sourcePath,
        ...typeof raw.line === "number" ? { line: raw.line } : {}
      };
    }
    return {
      ...typeof input.maintenanceKind === "string" ? { maintenanceKind: input.maintenanceKind } : {},
      observed: input.observed.trim(),
      requirementRef: input.requirementRef,
      ...source === void 0 ? {} : { source }
    };
  });
}
function lookup(contracts, reference) {
  const match = REFERENCE.exec(reference);
  if (match === null)
    return void 0;
  const contract = contracts.find((item) => item.id === match[1]);
  if (contract === void 0)
    return void 0;
  const requirement = contract.requirements.find((item) => item.id === match[2]);
  if (requirement !== void 0) {
    return {
      contract,
      expected: requirement.statement,
      kind: "requirement",
      requirementId: requirement.id
    };
  }
  const invariant = contract.invariants.find((item) => item.id === match[2]);
  if (invariant !== void 0) {
    return {
      contract,
      expected: invariant.statement,
      kind: "invariant",
      requirementId: invariant.id
    };
  }
  return void 0;
}
function checkSemanticDrift(contracts, observations, checkedAt = /* @__PURE__ */ new Date()) {
  const conflicts = [];
  const allowedChanges = [];
  for (const observation of observations) {
    const target = lookup(contracts, observation.requirementRef);
    if (target === void 0) {
      const [contractId = "unknown", requirementId = "unknown"] = observation.requirementRef.split("#");
      conflicts.push({
        actions: ACTIONS,
        approvalRequired: true,
        blocking: false,
        contractId,
        expected: "No matching contract requirement or invariant was found.",
        id: `drift-${String(conflicts.length + 1).padStart(3, "0")}`,
        kind: "unknown-reference",
        observed: observation.observed,
        requirementId,
        requirementRef: observation.requirementRef,
        ...observation.source === void 0 ? {} : { source: observation.source }
      });
      continue;
    }
    if (normalize(target.expected) === normalize(observation.observed)) {
      if (observation.maintenanceKind !== void 0) {
        allowedChanges.push({
          kind: observation.maintenanceKind,
          requirementRef: observation.requirementRef,
          ...observation.source === void 0 ? {} : { source: observation.source }
        });
      }
      continue;
    }
    conflicts.push({
      actions: ACTIONS,
      approvalRequired: true,
      blocking: target.contract.status === "approved",
      contractId: target.contract.id,
      contractStatus: target.contract.status,
      expected: target.expected,
      id: `drift-${String(conflicts.length + 1).padStart(3, "0")}`,
      kind: target.kind,
      observed: observation.observed,
      requirementId: target.requirementId,
      requirementRef: observation.requirementRef,
      ...observation.source === void 0 ? {} : { source: observation.source }
    });
  }
  const blockingConflicts = conflicts.filter((item) => item.blocking).length;
  return {
    allowedChanges,
    checkedAt: checkedAt.toISOString(),
    classification: conflicts.length > 0 ? "semantic" : allowedChanges.length > 0 ? "mechanical" : "none",
    conflicts,
    gate: {
      reasons: blockingConflicts === 0 ? [] : [
        `${blockingConflicts} approved contract expectation${blockingConflicts === 1 ? "" : "s"} conflict with observed behavior.`,
        "Fix the implementation or obtain explicit approval for a contract amendment."
      ],
      status: blockingConflicts > 0 ? "blocked" : "passed"
    },
    schemaVersion: SEMANTIC_DRIFT_SCHEMA_VERSION,
    summary: {
      allowedMechanicalChanges: allowedChanges.length,
      blockingConflicts,
      observations: observations.length,
      semanticConflicts: conflicts.length
    }
  };
}
function formatSemanticDriftReport(report) {
  const lines = [
    `Semantic drift: ${report.gate.status.toUpperCase()}`,
    `Classification: ${report.classification}`,
    `Conflicts: ${report.summary.semanticConflicts} (${report.summary.blockingConflicts} blocking)`,
    `Allowed mechanical changes: ${report.summary.allowedMechanicalChanges}`
  ];
  for (const conflict of report.conflicts) {
    lines.push("", `[${conflict.requirementRef}] ${conflict.blocking ? "BLOCKING" : "REVIEW"}`, `Contract: ${conflict.expected}`, `Observed: ${conflict.observed}`, "Actions: mark implementation bug, propose contract amendment, or investigate");
  }
  return lines.join("\n");
}

// packages/drift/dist/repository.js
var import_node_crypto4 = require("node:crypto");
var import_promises14 = require("node:fs/promises");
var import_node_path16 = require("node:path");
var PROPOSAL_ROOT = ".maru/contracts/.proposals";
function portable4(path) {
  return path.split(import_node_path16.sep).join("/");
}
function safePath3(root, path) {
  const absoluteRoot = (0, import_node_path16.resolve)(root);
  const target = (0, import_node_path16.resolve)(absoluteRoot, path);
  if (target !== absoluteRoot && !target.startsWith(`${absoluteRoot}${import_node_path16.sep}`)) {
    throw new DriftError("DRIFT_INVALID_INPUT", `Path escapes the project root: ${path}`, "Use an amendment proposal path inside the current project.");
  }
  return target;
}
function proposalId(contractId, createdAt, content) {
  const hash2 = (0, import_node_crypto4.createHash)("sha256").update(JSON.stringify(content)).digest("hex").slice(0, 12);
  return `${contractId}-${createdAt.replace(/[:.]/gu, "-")}-${hash2}`;
}
function amendedContract(contract, observations) {
  const requirementReplacements = /* @__PURE__ */ new Map();
  const invariantReplacements = /* @__PURE__ */ new Map();
  for (const observation of observations) {
    const id = observation.requirementRef.split("#")[1];
    if (id === void 0)
      continue;
    if (contract.requirements.some((item) => item.id === id)) {
      requirementReplacements.set(id, observation.observed);
    } else if (contract.invariants.some((item) => item.id === id)) {
      invariantReplacements.set(id, observation.observed);
    }
  }
  return {
    ...contract,
    approval: void 0,
    invariants: contract.invariants.map((item) => ({
      ...item,
      statement: invariantReplacements.get(item.id) ?? item.statement
    })),
    requirements: contract.requirements.map((item) => ({
      ...item,
      statement: requirementReplacements.get(item.id) ?? item.statement
    })),
    status: "amended"
  };
}
function assertProposal(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DriftError("DRIFT_PROPOSAL_INVALID", "The amendment proposal is not a JSON object.", "Create a new proposal with maru drift propose.");
  }
  const proposal = value;
  if (proposal.schemaVersion !== CONTRACT_AMENDMENT_SCHEMA_VERSION || proposal.status !== "proposed" || typeof proposal.contractId !== "string" || typeof proposal.baseVersionHash !== "string" || typeof proposal.proposalId !== "string" || typeof proposal.proposedBy !== "string" || typeof proposal.reason !== "string" || !Array.isArray(proposal.changes) || !Array.isArray(proposal.observations) || proposal.approval?.required !== true || proposal.approval.status !== "pending" || proposal.proposedContract === void 0) {
    throw new DriftError("DRIFT_PROPOSAL_INVALID", "The amendment proposal is incomplete or uses an unsupported schema.", "Create a new proposal with the current MaruCheck version.");
  }
  const parsedContract = parseQualityContract(serializeQualityContract(proposal.proposedContract), "amendment.proposedContract");
  return { ...proposal, proposedContract: parsedContract };
}
async function proposeContractAmendment(root, contractId, observations, options) {
  if (options.proposedBy.trim().length === 0 || options.reason.trim().length === 0) {
    throw new DriftError("DRIFT_INVALID_INPUT", "A proposer and reason are required.", "Pass --by and --reason so the proposal has an auditable owner and rationale.");
  }
  const contract = await getContract(root, contractId);
  const relevant = observations.filter((item) => item.requirementRef.startsWith(`${contractId}#`));
  const report = checkSemanticDrift([contract], relevant, options.now);
  if (report.conflicts.length === 0) {
    throw new DriftError("DRIFT_NO_SEMANTIC_CHANGE", "No semantic conflict exists for the selected contract.", "Keep mechanical test maintenance separate or provide an observation that changes contract meaning.");
  }
  if (report.conflicts.some((item) => item.kind === "unknown-reference")) {
    throw new DriftError("DRIFT_INVALID_INPUT", "One or more observations do not reference a known requirement or invariant.", "Use contract-id#requirement-id references from maru contract show.");
  }
  const proposedContract = amendedContract(contract, relevant);
  const changes = diffQualityContracts(contract, proposedContract).changes;
  if (!changes.some((item) => item.semantic)) {
    throw new DriftError("DRIFT_NO_SEMANTIC_CHANGE", "The proposal does not change contract meaning.", "Apply selector, timing, wait, fixture, or DOM maintenance directly without amending the contract.");
  }
  const createdAt = (options.now ?? /* @__PURE__ */ new Date()).toISOString();
  const baseVersionHash = contractVersionHash(contract);
  const id = proposalId(contractId, createdAt, { baseVersionHash, observations: relevant });
  const proposal = {
    approval: {
      eligibleApprovers: contract.owners,
      required: true,
      status: "pending"
    },
    baseVersionHash,
    changes,
    contractId,
    createdAt,
    observations: relevant,
    proposalId: id,
    proposedBy: options.proposedBy.trim(),
    proposedContract,
    reason: options.reason.trim(),
    schemaVersion: CONTRACT_AMENDMENT_SCHEMA_VERSION,
    status: "proposed"
  };
  const path = `${PROPOSAL_ROOT}/${contractId}/${id}.json`;
  try {
    const target = safePath3(root, path);
    await (0, import_promises14.mkdir)((0, import_node_path16.dirname)(target), { recursive: true });
    await (0, import_promises14.writeFile)(target, `${JSON.stringify(proposal, null, 2)}
`, {
      encoding: "utf8",
      flag: "wx"
    });
  } catch (error) {
    if (error instanceof DriftError)
      throw error;
    throw new DriftError("DRIFT_WRITE_FAILED", "Unable to write the immutable amendment proposal.", "Check project permissions and create a new proposal.", { cause: error });
  }
  return { path, proposal };
}
async function approveContractAmendment(root, proposalPath, options) {
  if (options.approvedBy.trim().length === 0) {
    throw new DriftError("DRIFT_APPROVAL_REQUIRED", "An explicit contract owner approval is required.", "Review the proposal, then pass --by with an eligible contract owner.");
  }
  const relativePath2 = portable4((0, import_node_path16.relative)((0, import_node_path16.resolve)(root), safePath3(root, proposalPath)));
  if (!relativePath2.startsWith(`${PROPOSAL_ROOT}/`) || !relativePath2.endsWith(".json")) {
    throw new DriftError("DRIFT_PROPOSAL_INVALID", "The proposal path is outside MaruCheck's amendment proposal directory.", "Pass the path returned by maru drift propose.");
  }
  let proposal;
  try {
    proposal = assertProposal(JSON.parse(await (0, import_promises14.readFile)(safePath3(root, relativePath2), "utf8")));
  } catch (error) {
    if (error instanceof DriftError)
      throw error;
    throw new DriftError("DRIFT_PROPOSAL_INVALID", "The amendment proposal could not be read or parsed.", "Pass an unmodified proposal created by maru drift propose.", { cause: error });
  }
  const approvedBy = options.approvedBy.trim();
  const current = await getContract(root, proposal.contractId);
  if (contractVersionHash(current) !== proposal.baseVersionHash) {
    throw new DriftError("DRIFT_PROPOSAL_STALE", "The contract changed after this amendment was proposed.", "Review the current contract and create a new amendment proposal.");
  }
  if (current.owners.length > 0 && !current.owners.some((owner) => owner.trim().toLocaleLowerCase() === approvedBy.toLocaleLowerCase())) {
    throw new DriftError("DRIFT_APPROVAL_REQUIRED", `${approvedBy} is not an eligible owner for ${proposal.contractId}.`, `Use one of the current contract owners: ${current.owners.join(", ")}.`);
  }
  const recordedChanges = JSON.stringify(proposal.changes);
  const actualChanges = JSON.stringify(diffQualityContracts(current, proposal.proposedContract).changes);
  if (recordedChanges !== actualChanges) {
    throw new DriftError("DRIFT_PROPOSAL_INVALID", "The proposal's ContractChange audit does not match its proposed contract.", "Review the file for edits and create a fresh amendment proposal.");
  }
  const approvedAt = options.now ?? /* @__PURE__ */ new Date();
  const applied = await applyApprovedContractAmendment(root, proposal.contractId, proposal.proposedContract, {
    approvedAt,
    approvedBy,
    expectedCurrentVersionHash: proposal.baseVersionHash
  });
  const auditPath = `${PROPOSAL_ROOT}/${proposal.contractId}/${proposal.proposalId}.approved.json`;
  try {
    await (0, import_promises14.writeFile)(safePath3(root, auditPath), `${JSON.stringify({
      approvedAt: approvedAt.toISOString(),
      approvedBy,
      contractId: proposal.contractId,
      proposalId: proposal.proposalId,
      status: "approved",
      versionHash: applied.versionHash
    }, null, 2)}
`, { encoding: "utf8", flag: "wx" });
  } catch (error) {
    throw new DriftError("DRIFT_WRITE_FAILED", "The contract was approved, but its amendment audit record could not be written.", "Preserve the proposal and inspect the contract history before retrying.", { cause: error });
  }
  return { ...applied, auditPath };
}

// packages/mutation/dist/index.js
var import_promises16 = require("node:fs/promises");
var import_node_path18 = require("node:path");
var import_node_perf_hooks2 = require("node:perf_hooks");

// packages/mutation/dist/model.js
var MUTATION_REPORT_SCHEMA_VERSION = 1;
var MUTATION_ARTIFACTS_DIRECTORY = ".maru/artifacts/mutations";
var MutationVerificationError = class extends Error {
  code;
  remediation;
  constructor(code, message, remediation, options) {
    super(message, options);
    this.code = code;
    this.remediation = remediation;
    this.name = "MutationVerificationError";
  }
};

// packages/mutation/dist/transforms.js
var ts = __toESM(require("typescript"), 1);
var OWNERSHIP_TERM = /\b(?:account|access|authori[sz](?:ation|e|ed)?|member|organi[sz]ation|owner|permission|role|tenant|user)\w*\b/iu;
var COMPARISON_REPLACEMENTS = /* @__PURE__ */ new Map([
  [ts.SyntaxKind.EqualsEqualsToken, "!="],
  [ts.SyntaxKind.EqualsEqualsEqualsToken, "!=="],
  [ts.SyntaxKind.ExclamationEqualsToken, "=="],
  [ts.SyntaxKind.ExclamationEqualsEqualsToken, "==="],
  [ts.SyntaxKind.LessThanToken, "<="],
  [ts.SyntaxKind.LessThanEqualsToken, "<"],
  [ts.SyntaxKind.GreaterThanToken, ">="],
  [ts.SyntaxKind.GreaterThanEqualsToken, ">"]
]);
function isAbrupt(statement) {
  if (ts.isReturnStatement(statement) || ts.isThrowStatement(statement) || ts.isBreakStatement(statement) || ts.isContinueStatement(statement)) {
    return true;
  }
  if (!ts.isBlock(statement) || statement.statements.length === 0)
    return false;
  const last = statement.statements.at(-1);
  return last !== void 0 && isAbrupt(last);
}
function guardKind(node, sourceFile) {
  if (node.elseStatement !== void 0 || !isAbrupt(node.thenStatement))
    return void 0;
  if (!(ts.isSourceFile(node.parent) || ts.isBlock(node.parent)))
    return void 0;
  const condition = node.expression.getText(sourceFile);
  return OWNERSHIP_TERM.test(condition) ? "remove-ownership-condition" : "remove-guard";
}
function location(sourceFile, start) {
  const value = sourceFile.getLineAndCharacterOfPosition(start);
  return { column: value.character + 1, line: value.line + 1 };
}
function draft(input) {
  return {
    ...location(input.sourceFile, input.start),
    description: input.description,
    end: input.end,
    file: input.file,
    kind: input.kind,
    original: input.source.slice(input.start, input.end),
    replacement: input.replacement,
    start: input.start
  };
}
function discoverTypeScriptMutations(file, source) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const drafts = [];
  const visit = (node) => {
    if (node.kind === ts.SyntaxKind.TrueKeyword || node.kind === ts.SyntaxKind.FalseKeyword) {
      const start = node.getStart(sourceFile);
      const replacement = node.kind === ts.SyntaxKind.TrueKeyword ? "false" : "true";
      drafts.push(draft({
        description: `Invert boolean ${source.slice(start, node.end)} to ${replacement}.`,
        end: node.end,
        file,
        kind: "invert-boolean",
        replacement,
        source,
        sourceFile,
        start
      }));
    }
    if (ts.isBinaryExpression(node)) {
      const replacement = COMPARISON_REPLACEMENTS.get(node.operatorToken.kind);
      if (replacement !== void 0) {
        const start = node.operatorToken.getStart(sourceFile);
        drafts.push(draft({
          description: `Change comparison ${node.operatorToken.getText(sourceFile)} to ${replacement}.`,
          end: node.operatorToken.end,
          file,
          kind: "change-comparison",
          replacement,
          source,
          sourceFile,
          start
        }));
      }
    }
    if (ts.isIfStatement(node)) {
      const mutationKind = guardKind(node, sourceFile);
      if (mutationKind !== void 0) {
        const start = node.getStart(sourceFile);
        drafts.push(draft({
          description: mutationKind === "remove-ownership-condition" ? `Remove ownership guard ${node.expression.getText(sourceFile)}.` : `Remove guard ${node.expression.getText(sourceFile)}.`,
          end: node.end,
          file,
          kind: mutationKind,
          replacement: "",
          source,
          sourceFile,
          start
        }));
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return drafts.sort((left, right) => left.start - right.start || left.end - right.end || left.kind.localeCompare(right.kind)).map((candidate, index) => ({
    ...candidate,
    id: `MUT-${String(index + 1).padStart(4, "0")}`
  }));
}
function applyMutation(source, candidate) {
  if (source.slice(candidate.start, candidate.end) !== candidate.original) {
    throw new MutationError("MUTATION_SOURCE_CHANGED", `Mutation ${candidate.id} no longer matches ${candidate.file}.`);
  }
  return `${source.slice(0, candidate.start)}${candidate.replacement}${source.slice(candidate.end)}`;
}
var MutationError = class extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "MutationError";
  }
};

// packages/mutation/dist/worktree.js
var import_node_perf_hooks = require("node:perf_hooks");
var import_promises15 = require("node:fs/promises");
var import_node_os = require("node:os");
var import_node_path17 = require("node:path");
async function exists5(path) {
  try {
    await (0, import_promises15.lstat)(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT")
      return false;
    throw error;
  }
}
function inside(root, path) {
  if ((0, import_node_path17.isAbsolute)(path)) {
    throw new MutationVerificationError("MUTATION_PATH_INVALID", `Mutation path must be relative: ${path}`, "Recreate the Git diff without paths outside the repository.");
  }
  const absoluteRoot = (0, import_node_path17.resolve)(root);
  const target = (0, import_node_path17.resolve)(absoluteRoot, path);
  if (target === absoluteRoot || !target.startsWith(`${absoluteRoot}${import_node_path17.sep}`)) {
    throw new MutationVerificationError("MUTATION_PATH_INVALID", `Mutation path escapes the repository: ${path}`, "Recreate the Git diff without paths outside the repository.");
  }
  return target;
}
async function copyWorkingChanges(root, worktree, analysis) {
  for (const file of analysis.files) {
    if (file.originalPath !== void 0 && file.originalPath !== file.path) {
      await (0, import_promises15.rm)(inside(worktree, file.originalPath), { force: true });
    }
    const target = inside(worktree, file.path);
    if (file.status === "deleted") {
      await (0, import_promises15.rm)(target, { force: true });
      continue;
    }
    const source = inside(root, file.path);
    const stats = await (0, import_promises15.lstat)(source);
    if (!stats.isFile() || stats.isSymbolicLink()) {
      throw new MutationVerificationError("MUTATION_SOURCE_UNSUPPORTED", `Changed path is not a regular file: ${file.path}`, "Use regular repository files as mutation targets.");
    }
    await (0, import_promises15.mkdir)((0, import_node_path17.dirname)(target), { recursive: true });
    await (0, import_promises15.copyFile)(source, target);
  }
}
function assertTemporaryParent(path) {
  const temporaryRoot = (0, import_node_path17.resolve)((0, import_node_os.tmpdir)());
  const absolute = (0, import_node_path17.resolve)(path);
  if (!absolute.startsWith(`${temporaryRoot}${import_node_path17.sep}`) || !(0, import_node_path17.basename)(absolute).startsWith("maru-mutation-")) {
    throw new MutationVerificationError("MUTATION_WORKTREE_UNSAFE", "Refusing to clean an unexpected mutation worktree path.", "Remove the unexpected path manually after confirming it is safe.");
  }
}
async function removeWorktree(input) {
  assertTemporaryParent(input.parent);
  let removed;
  try {
    removed = await input.runner.run(["worktree", "remove", "--force", input.worktree], input.root);
  } catch {
    removed = void 0;
  } finally {
    await (0, import_promises15.rm)(input.parent, { force: true, recursive: true });
  }
  if (removed === void 0 || removed.exitCode !== 0) {
    try {
      await input.runner.run(["worktree", "prune"], input.root);
    } catch {
    }
  }
  return removed;
}
var defaultMutationCommandRunner = {
  async run(args, cwd) {
    const started = import_node_perf_hooks.performance.now();
    const result = await defaultCommandRunner.run({
      args,
      command: "git",
      cwd,
      env: { GIT_TERMINAL_PROMPT: "0" },
      timeoutMs: 3e4
    });
    return {
      durationMs: Math.max(0, Math.round(import_node_perf_hooks.performance.now() - started)),
      exitCode: result.exitCode,
      stderr: result.stderr,
      stdout: result.stdout
    };
  }
};
function createMutationWorktreeManager(runner = defaultMutationCommandRunner) {
  return {
    async create(root, analysis) {
      const parent = await (0, import_promises15.mkdtemp)((0, import_node_path17.join)((0, import_node_os.tmpdir)(), "maru-mutation-"));
      const worktree = (0, import_node_path17.resolve)(parent, "worktree");
      let registered = false;
      try {
        const added = await runner.run(["worktree", "add", "--detach", worktree, "HEAD"], root);
        if (added.exitCode !== 0) {
          throw new MutationVerificationError("MUTATION_WORKTREE_CREATE_FAILED", "Git could not create the isolated mutation worktree.", `Inspect Git worktree state and retry. ${added.stderr.trim()}`.trim());
        }
        registered = true;
        await copyWorkingChanges(root, worktree, analysis);
        const dependencies = (0, import_node_path17.resolve)(root, "node_modules");
        const worktreeDependencies = (0, import_node_path17.resolve)(worktree, "node_modules");
        if (await exists5(dependencies) && !await exists5(worktreeDependencies)) {
          await (0, import_promises15.symlink)(dependencies, worktreeDependencies, process.platform === "win32" ? "junction" : "dir");
        }
        let cleaned = false;
        return {
          path: worktree,
          async cleanup() {
            if (cleaned)
              return;
            cleaned = true;
            const removed = await removeWorktree({ parent, root, runner, worktree });
            if (removed === void 0 || removed.exitCode !== 0) {
              throw new MutationVerificationError("MUTATION_WORKTREE_CLEANUP_FAILED", "The temporary files were removed, but Git could not unregister the mutation worktree.", `Run git worktree prune in ${root}. ${removed?.stderr.trim() ?? ""}`.trim());
            }
          }
        };
      } catch (error) {
        assertTemporaryParent(parent);
        if (registered) {
          await removeWorktree({ parent, root, runner, worktree });
        } else {
          await (0, import_promises15.rm)(parent, { force: true, recursive: true });
        }
        if (error instanceof MutationVerificationError)
          throw error;
        throw new MutationVerificationError("MUTATION_WORKTREE_CREATE_FAILED", "Unable to prepare the isolated mutation worktree.", "Confirm Git can create worktrees and the system temporary directory is writable.", { cause: error });
      }
    }
  };
}
function relativeMutationPath(root, path) {
  return (0, import_node_path17.relative)((0, import_node_path17.resolve)(root), (0, import_node_path17.resolve)(path)).split(import_node_path17.sep).join("/");
}

// packages/mutation/dist/index.js
var DEFAULT_MAX_MUTATIONS = 20;
var MAX_MUTATIONS = 100;
var MAX_SOURCE_CHARACTERS = 2e6;
var MAX_REPORTED_TEXT = 500;
var MUTATION_TEST_ADAPTERS = /* @__PURE__ */ new Set(["axe", "jest", "playwright", "vitest"]);
function portableTimestamp(now) {
  return now.toISOString().replace(/[:.]/gu, "-");
}
function resolveInside(root, path) {
  if ((0, import_node_path18.isAbsolute)(path)) {
    throw new MutationVerificationError("MUTATION_PATH_INVALID", `Mutation path must be relative: ${path}`, "Recreate the Git diff without paths outside the repository.");
  }
  const absoluteRoot = (0, import_node_path18.resolve)(root);
  const target = (0, import_node_path18.resolve)(absoluteRoot, path);
  if (target === absoluteRoot || !target.startsWith(`${absoluteRoot}${import_node_path18.sep}`)) {
    throw new MutationVerificationError("MUTATION_PATH_INVALID", `Mutation path escapes the repository: ${path}`, "Recreate the Git diff without paths outside the repository.");
  }
  return target;
}
function bounded2(value) {
  const normalized2 = value.replace(/\s+/gu, " ").trim();
  return normalized2.length <= MAX_REPORTED_TEXT ? normalized2 : `${normalized2.slice(0, MAX_REPORTED_TEXT - 1)}\u2026`;
}
function publicCandidate(candidate) {
  return {
    column: candidate.column,
    description: bounded2(candidate.description),
    file: candidate.file,
    id: candidate.id,
    kind: candidate.kind,
    line: candidate.line,
    original: bounded2(candidate.original),
    replacement: bounded2(candidate.replacement)
  };
}
function mutationPlan(plan) {
  const steps = plan.steps.filter((step) => MUTATION_TEST_ADAPTERS.has(step.adapter));
  return {
    ...plan,
    steps,
    summary: {
      ...plan.summary,
      automatedSteps: steps.filter((step) => step.execution === "automated").length,
      manualSteps: 0,
      unavailableSteps: 0
    }
  };
}
async function discoverCandidates(root, analysis, maximum) {
  const sourceByFile = /* @__PURE__ */ new Map();
  const candidates = [];
  for (const file of analysis.files) {
    if (file.binary || file.status === "deleted" || file.classifications.includes("test") || !/\.(?:ts|tsx)$/u.test(file.path) || /\.d\.ts$/u.test(file.path)) {
      continue;
    }
    const source = await (0, import_promises16.readFile)(resolveInside(root, file.path), "utf8");
    if (source.length > MAX_SOURCE_CHARACTERS)
      continue;
    sourceByFile.set(file.path, source);
    for (const candidate of discoverTypeScriptMutations(file.path, source)) {
      if (candidates.length >= maximum)
        break;
      candidates.push({
        ...candidate,
        id: `MUT-${String(candidates.length + 1).padStart(4, "0")}`
      });
    }
    if (candidates.length >= maximum)
      break;
  }
  return { candidates, sourceByFile };
}
function resultStatuses(run) {
  return run.run.results.map((result) => result.status);
}
function runDuration(run) {
  return run.run.results.reduce((total, result) => total + result.durationMs, 0);
}
async function pathExists(path) {
  try {
    await (0, import_promises16.lstat)(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT")
      return false;
    throw error;
  }
}
async function archiveRun(originalRoot, worktreeRoot, reportDirectory, name, run) {
  const source = resolveInside(worktreeRoot, run.run.artifactDirectory);
  if (!await pathExists(source))
    return [];
  const target = (0, import_node_path18.resolve)(reportDirectory, "runs", name);
  await (0, import_promises16.mkdir)((0, import_node_path18.dirname)(target), { recursive: true });
  await (0, import_promises16.cp)(source, target, { recursive: true });
  return [relativeMutationPath(originalRoot, target)];
}
async function createReportDirectory(root, now) {
  const parent = (0, import_node_path18.resolve)(root, MUTATION_ARTIFACTS_DIRECTORY);
  await (0, import_promises16.mkdir)(parent, { recursive: true });
  const base = portableTimestamp(now);
  for (let attempt = 1; attempt <= 100; attempt += 1) {
    const suffix = attempt === 1 ? "" : `-${String(attempt).padStart(2, "0")}`;
    const candidate = (0, import_node_path18.resolve)(parent, `${base}${suffix}`);
    try {
      await (0, import_promises16.mkdir)(candidate);
      return candidate;
    } catch (error) {
      if (error.code !== "EEXIST")
        throw error;
    }
  }
  throw new MutationVerificationError("MUTATION_ARTIFACT_DIRECTORY_UNAVAILABLE", "Unable to allocate a unique mutation artifact directory.", "Retry mutation verification with a new timestamp.");
}
function baselineFromRun(run, artifactRefs2) {
  return {
    artifactRefs: artifactRefs2,
    resultStatuses: resultStatuses(run),
    status: run.run.status === "passed" ? "passed" : "inconclusive",
    ...run.run.status === "passed" ? {} : { diagnostic: `Baseline verification returned ${run.run.status}.` }
  };
}
function gateFor(baseline, mutations, candidateCount) {
  if (candidateCount === 0) {
    return {
      reasons: ["No supported TypeScript mutation candidate was found in the current diff."],
      status: "blocked"
    };
  }
  if (baseline.status !== "passed") {
    return {
      reasons: ["Baseline verification did not pass, so mutant outcomes would not be trustworthy."],
      status: "blocked"
    };
  }
  const survived = mutations.filter((mutation) => mutation.outcome === "survived").length;
  const inconclusive = mutations.filter((mutation) => mutation.outcome === "inconclusive").length;
  if (survived > 0 || inconclusive > 0) {
    return {
      reasons: [
        ...survived > 0 ? [`${survived} mutation${survived === 1 ? "" : "s"} survived selected tests.`] : [],
        ...inconclusive > 0 ? [`${inconclusive} mutation${inconclusive === 1 ? " was" : "s were"} inconclusive.`] : []
      ],
      status: "blocked"
    };
  }
  return {
    reasons: [`All ${mutations.length} executed mutations were killed by selected tests.`],
    status: "passed"
  };
}
async function writeReport(root, reportDirectory, report) {
  const path = (0, import_node_path18.resolve)(reportDirectory, "report.json");
  await (0, import_promises16.mkdir)((0, import_node_path18.dirname)(path), { recursive: true });
  await (0, import_promises16.writeFile)(path, `${JSON.stringify(report, null, 2)}
`, "utf8");
  return { path: relativeMutationPath(root, path), report };
}
async function runMutationVerification(root, now = /* @__PURE__ */ new Date(), options = {}) {
  const clock = options.now ?? (() => /* @__PURE__ */ new Date());
  const maximum = options.maxMutations ?? DEFAULT_MAX_MUTATIONS;
  if (!Number.isInteger(maximum) || maximum < 1 || maximum > MAX_MUTATIONS) {
    throw new MutationVerificationError("MUTATION_LIMIT_INVALID", `Mutation limit must be an integer from 1 to ${MAX_MUTATIONS}.`, "Pass --max with a value between 1 and 100.");
  }
  const [analysis, planned] = await Promise.all([
    options.analysis?.() ?? analyzeGitDiff(root),
    options.createPlan?.() ?? createAndWriteVerificationPlan(root, now)
  ]);
  const { candidates, sourceByFile } = await discoverCandidates(root, analysis, maximum);
  const plan = mutationPlan(planned.plan);
  const reportDirectory = await createReportDirectory(root, now);
  const emptyBaseline = {
    artifactRefs: [],
    diagnostic: candidates.length === 0 ? "No mutation candidate was available." : "No Vitest, Playwright, or axe verification step was selected.",
    resultStatuses: [],
    status: "inconclusive"
  };
  if (candidates.length === 0 || plan.steps.length === 0) {
    const completedAt = clock().toISOString();
    const report2 = {
      baseline: emptyBaseline,
      completedAt,
      generatedAt: now.toISOString(),
      gate: gateFor(emptyBaseline, [], candidates.length),
      mutations: [],
      project: { name: planned.plan.project.name },
      schemaVersion: MUTATION_REPORT_SCHEMA_VERSION,
      scope: "working-tree",
      summary: {
        candidates: candidates.length,
        executed: 0,
        inconclusive: 0,
        killed: 0,
        survived: 0
      },
      worktreeCleaned: true
    };
    return writeReport(root, reportDirectory, report2);
  }
  const worktree = await (options.worktrees ?? createMutationWorktreeManager()).create(root, analysis);
  const runPlan = options.runPlan ?? ((worktreeRoot, verificationPlan) => runVerificationPlan(worktreeRoot, verificationPlan, { now: clock }));
  let baseline;
  const executions = [];
  try {
    try {
      const run = await runPlan(worktree.path, plan);
      baseline = baselineFromRun(run, await archiveRun(root, worktree.path, reportDirectory, "baseline", run));
    } catch (error) {
      baseline = {
        artifactRefs: [],
        diagnostic: bounded2(error instanceof Error ? error.message : String(error)),
        resultStatuses: [],
        status: "inconclusive"
      };
    }
    if (baseline.status === "passed") {
      for (const candidate of candidates) {
        const source = sourceByFile.get(candidate.file);
        if (source === void 0)
          continue;
        const target = resolveInside(worktree.path, candidate.file);
        const started = import_node_perf_hooks2.performance.now();
        try {
          await (0, import_promises16.writeFile)(target, applyMutation(source, candidate), "utf8");
          const run = await runPlan(worktree.path, plan);
          const statuses = resultStatuses(run);
          const outcome = run.run.status === "passed" ? "survived" : statuses.some((status2) => status2 === "error" || status2 === "skipped" || status2 === "unavailable") ? "inconclusive" : statuses.some((status2) => status2 === "failed") ? "killed" : "inconclusive";
          executions.push({
            artifactRefs: await archiveRun(root, worktree.path, reportDirectory, candidate.id, run),
            candidate: publicCandidate(candidate),
            durationMs: runDuration(run),
            outcome,
            resultStatuses: statuses
          });
        } catch (error) {
          if (error instanceof MutationError)
            throw error;
          executions.push({
            artifactRefs: [],
            candidate: publicCandidate(candidate),
            diagnostic: bounded2(error instanceof Error ? error.message : String(error)),
            durationMs: Math.max(0, Math.round(import_node_perf_hooks2.performance.now() - started)),
            outcome: "inconclusive",
            resultStatuses: []
          });
        } finally {
          await (0, import_promises16.writeFile)(target, source, "utf8");
        }
      }
    }
  } finally {
    await worktree.cleanup();
  }
  const gate = gateFor(baseline, executions, candidates.length);
  const report = {
    baseline,
    completedAt: clock().toISOString(),
    generatedAt: now.toISOString(),
    gate,
    mutations: executions,
    project: { name: planned.plan.project.name },
    schemaVersion: MUTATION_REPORT_SCHEMA_VERSION,
    scope: "working-tree",
    summary: {
      candidates: candidates.length,
      executed: executions.length,
      inconclusive: executions.filter((execution) => execution.outcome === "inconclusive").length,
      killed: executions.filter((execution) => execution.outcome === "killed").length,
      survived: executions.filter((execution) => execution.outcome === "survived").length
    },
    worktreeCleaned: true
  };
  return writeReport(root, reportDirectory, report);
}
function formatMutationReport(result) {
  const { report } = result;
  const lines = [
    `Mutation gate: ${report.gate.status.toUpperCase()}`,
    `Candidates: ${report.summary.candidates}`,
    `Executed: ${report.summary.executed}`,
    `Killed: ${report.summary.killed}`,
    `Survived: ${report.summary.survived}`,
    `Inconclusive: ${report.summary.inconclusive}`,
    `Worktree cleaned: ${report.worktreeCleaned ? "yes" : "no"}`
  ];
  for (const mutation of report.mutations.filter((item) => item.outcome === "survived")) {
    lines.push("", "WEAK VERIFICATION DETECTED", `${mutation.candidate.id} ${mutation.candidate.file}:${mutation.candidate.line}:${mutation.candidate.column}`, `Mutation: ${mutation.candidate.description}`, "Result: All selected tests still passed.", "Meaning: Existing verification does not prove this behavior.");
  }
  lines.push("", ...report.gate.reasons.map((reason) => `Gate: ${reason}`));
  lines.push(`JSON report: ${result.path}`);
  return lines.join("\n");
}

// packages/mcp-server/dist/tools.js
var CLOSED_EMPTY_SCHEMA = {
  additionalProperties: false,
  properties: {},
  type: "object"
};
var BASE_OUTPUT_SCHEMA = {
  additionalProperties: true,
  properties: { ok: { type: "boolean" } },
  required: ["ok"],
  type: "object"
};
var MAX_CONTEXT_ITEMS = 100;
var CHALLENGE_SUBMISSION_SCHEMA = {
  additionalProperties: false,
  properties: {
    briefHash: { maxLength: 64, minLength: 64, pattern: "^[a-f0-9]{64}$", type: "string" },
    briefId: { maxLength: 200, minLength: 1, type: "string" },
    provenance: {
      additionalProperties: false,
      properties: {
        attested: { type: "boolean" },
        client: { maxLength: 100, minLength: 1, type: "string" },
        isolation: {
          enum: ["fresh-thread", "separate-agent", "subagent", "unknown"],
          type: "string"
        },
        model: { maxLength: 200, minLength: 1, type: "string" },
        usage: {
          additionalProperties: false,
          properties: {
            estimatedCostUsd: { maximum: 100, minimum: 0, type: ["number", "null"] },
            inputTokens: { minimum: 0, type: ["integer", "null"] },
            outputTokens: { minimum: 0, type: ["integer", "null"] },
            totalTokens: { minimum: 0, type: ["integer", "null"] }
          },
          type: "object"
        }
      },
      required: ["attested", "client", "isolation"],
      type: "object"
    },
    result: CHALLENGE_RESPONSE_SCHEMA,
    schemaVersion: { const: 1, type: "integer" }
  },
  required: ["briefHash", "briefId", "provenance", "result", "schemaVersion"],
  type: "object"
};
var OBSERVATION_SCHEMA = {
  additionalProperties: false,
  properties: {
    maintenanceKind: {
      enum: ["dom-structure", "fixture-setup", "route-timing", "selector", "wait-condition"],
      type: "string"
    },
    observed: { maxLength: 1e4, minLength: 1, type: "string" },
    requirementRef: {
      maxLength: 241,
      minLength: 3,
      pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,119}#[A-Za-z0-9][A-Za-z0-9._-]{0,119}$",
      type: "string"
    },
    source: {
      additionalProperties: false,
      properties: {
        line: { minimum: 1, type: "integer" },
        path: { maxLength: 500, minLength: 1, type: "string" }
      },
      required: ["path"],
      type: "object"
    }
  },
  required: ["observed", "requirementRef"],
  type: "object"
};
var MEMORY_REGRESSION_TEST_SCHEMA = {
  additionalProperties: false,
  properties: {
    adapter: { enum: ["jest", "playwright", "vitest"], type: "string" },
    id: {
      maxLength: 100,
      minLength: 1,
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      type: "string"
    },
    path: { maxLength: 500, minLength: 1, type: "string" },
    requirementRefs: {
      items: {
        maxLength: 241,
        minLength: 3,
        pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,119}#[A-Za-z0-9][A-Za-z0-9._-]{0,119}$",
        type: "string"
      },
      maxItems: 100,
      type: "array"
    }
  },
  required: ["adapter", "id", "path", "requirementRefs"],
  type: "object"
};
function schema(properties, required = []) {
  return {
    additionalProperties: false,
    properties,
    ...required.length === 0 ? {} : { required },
    type: "object"
  };
}
function definition(name, title, description, inputSchema, readOnly, openWorld = false) {
  return {
    name,
    title,
    description,
    inputSchema,
    outputSchema: BASE_OUTPUT_SCHEMA,
    annotations: {
      destructiveHint: false,
      idempotentHint: readOnly,
      openWorldHint: openWorld,
      readOnlyHint: readOnly
    }
  };
}
var MARU_MCP_TOOLS = [
  definition("maru_get_project_context", "Get MaruCheck project context", "Inspect the current project architecture and Quality Contract summaries before modifying code.", CLOSED_EMPTY_SCHEMA, true),
  definition("maru_list_contracts", "List Quality Contracts", "List current Quality Contracts with lifecycle state, criticality, and stable version hash.", CLOSED_EMPTY_SCHEMA, true),
  definition("maru_get_contract", "Get a Quality Contract", "Read one validated Quality Contract by its lowercase kebab-case identifier.", schema({ id: { description: "Contract identifier", maxLength: 120, minLength: 1, type: "string" } }, ["id"]), true),
  definition("maru_create_contract", "Create a draft Quality Contract", "Create a local draft from natural-language requirements. This never approves product intent.", schema({
    id: { maxLength: 120, minLength: 1, pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$", type: "string" },
    requirements: {
      description: "Natural-language product requirements",
      maxLength: 1e5,
      minLength: 8,
      type: "string"
    },
    title: { maxLength: 200, minLength: 1, type: "string" }
  }, ["requirements"]), false),
  definition("maru_validate_contract", "Validate Quality Contracts", "Validate every current contract or one YAML path inside the project root.", schema({ path: { maxLength: 500, minLength: 1, type: "string" } }), true),
  definition("maru_analyze_diff", "Analyze the Git diff", "Parse staged and unstaged hunks, classify changed paths, and report bounded change metadata without returning source lines.", CLOSED_EMPTY_SCHEMA, true),
  definition("maru_assess_risk", "Assess deterministic change risk", "Score the current Git diff from 0 to 100 with explicit rule contributions, related contracts, recommended test categories, and matched QA memory with deterministic relevance; low-relevance history is preserved without raising risk.", CLOSED_EMPTY_SCHEMA, true),
  definition("maru_create_verification_plan", "Create a verification plan", "Select related requirements and affected tests, choose risk-based adapters, explain every step, and write the versioned local plan artifact.", CLOSED_EMPTY_SCHEMA, false),
  definition("maru_run_verification", "Run verification", "Rebuild the current-diff plan, execute selected local tests plus optional requirement-tagged temporary tests, and persist raw artifacts plus normalized evidence, requirement mappings, findings, reproduction instructions, and a JSON report. Temporary test source is executed inside the project and removed after the run.", schema({
    temporaryTests: {
      items: {
        additionalProperties: false,
        properties: {
          adapter: { enum: ["jest", "playwright", "vitest"], type: "string" },
          id: {
            maxLength: 80,
            minLength: 1,
            pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
            type: "string"
          },
          requirementRefs: {
            items: {
              maxLength: 241,
              minLength: 3,
              pattern: "^[A-Za-z0-9][A-Za-z0-9._-]{0,119}#[A-Za-z0-9][A-Za-z0-9._-]{0,119}$",
              type: "string"
            },
            maxItems: 100,
            minItems: 1,
            type: "array"
          },
          source: { maxLength: 1e5, minLength: 1, type: "string" },
          targetPath: { maxLength: 500, minLength: 1, type: "string" }
        },
        required: ["adapter", "id", "requirementRefs", "source", "targetPath"],
        type: "object"
      },
      maxItems: 20,
      type: "array"
    }
  }), false),
  definition("maru_run_mutation_verification", "Run isolated mutation verification", "Prove selected local tests reject bounded TypeScript mutations in a detached temporary Git worktree. This executes project tests, writes local artifacts, and never mutates the active checkout.", schema({
    maxMutations: {
      description: "Maximum deterministic mutation candidates to execute",
      maximum: 100,
      minimum: 1,
      type: "integer"
    }
  }), false),
  definition("maru_prepare_challenge", "Prepare an isolated Challenger review", "Write and return a bounded, tamper-evident QA brief. The MCP client should give it to a fresh thread or subagent without builder history, then submit that review separately.", schema({
    releaseVerification: {
      description: "Mark this as release verification in the activation audit",
      type: "boolean"
    }
  }), false),
  definition("maru_submit_challenge", "Submit an isolated Challenger review", "Validate a structured QA response against its prepared brief, record client-reported isolation and usage provenance, and persist hypotheses without executing them or treating them as findings.", schema({
    briefPath: {
      description: "Project-relative path returned by maru_prepare_challenge",
      maxLength: 500,
      minLength: 1,
      type: "string"
    },
    submission: CHALLENGE_SUBMISSION_SCHEMA
  }, ["briefPath", "submission"]), false),
  definition("maru_check_semantic_drift", "Check protected contract expectations", "Compare explicit observed behavior with current contract requirements and invariants. Approved semantic conflicts block; selector, DOM, timing, wait, and fixture maintenance is allowed only when protected meaning is unchanged.", schema({
    observations: {
      items: OBSERVATION_SCHEMA,
      maxItems: 100,
      minItems: 1,
      type: "array"
    }
  }, ["observations"]), true),
  definition("maru_propose_contract_amendment", "Propose a contract amendment", "Write an immutable, pending amendment proposal for a semantic conflict. This tool never approves or rewrites the current contract.", schema({
    contractId: {
      maxLength: 120,
      minLength: 1,
      pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
      type: "string"
    },
    observations: {
      items: OBSERVATION_SCHEMA,
      maxItems: 100,
      minItems: 1,
      type: "array"
    },
    proposedBy: { maxLength: 200, minLength: 1, type: "string" },
    reason: { maxLength: 2e3, minLength: 1, type: "string" }
  }, ["contractId", "observations", "proposedBy", "reason"]), false),
  definition("maru_record_bug", "Record a QA bug memory", "Persist an immutable historical bug, its root cause, affected files/contracts, tags, and executable regression tests for future verification. Optionally list older records it supersedes so their stale context stops raising risk.", schema({
    regressionTests: {
      items: MEMORY_REGRESSION_TEST_SCHEMA,
      maxItems: 50,
      type: "array"
    },
    relatedContracts: {
      items: {
        maxLength: 120,
        minLength: 1,
        pattern: "^[a-z0-9]+(?:-[a-z0-9]+)*$",
        type: "string"
      },
      maxItems: 50,
      type: "array"
    },
    relatedFiles: {
      items: { maxLength: 500, minLength: 1, type: "string" },
      maxItems: 100,
      type: "array"
    },
    rootCause: { maxLength: 5e3, minLength: 1, type: "string" },
    severity: {
      enum: ["critical", "high", "info", "low", "medium"],
      type: "string"
    },
    summary: { maxLength: 1e4, minLength: 1, type: "string" },
    supersedes: {
      items: { maxLength: 20, minLength: 8, pattern: "^MEM-[0-9]{4,}$", type: "string" },
      maxItems: 50,
      type: "array"
    },
    tags: {
      items: { maxLength: 80, minLength: 1, type: "string" },
      maxItems: 100,
      type: "array"
    },
    title: { maxLength: 300, minLength: 1, type: "string" },
    type: {
      enum: [
        "bug",
        "contract-amendment",
        "flaky-test",
        "production-incident",
        "regression",
        "risk-override",
        "security-finding",
        "security-regression",
        "sensitive-integration"
      ],
      type: "string"
    }
  }, [
    "regressionTests",
    "relatedContracts",
    "relatedFiles",
    "rootCause",
    "severity",
    "summary",
    "tags",
    "title",
    "type"
  ]), false),
  definition("maru_query_memory", "Query QA memory", "Search historical bugs, incidents, root causes, paths, contracts, and regression tests with explainable deterministic matches.", schema({ query: { maxLength: 500, minLength: 1, type: "string" } }, ["query"]), true)
];
var ToolInputError = class extends Error {
  code = "INVALID_TOOL_ARGUMENTS";
  remediation = "Use the tool's published inputSchema and remove unknown fields.";
  constructor(message) {
    super(message);
    this.name = "ToolInputError";
  }
};
var UnknownMcpToolError = class extends Error {
  toolName;
  constructor(toolName) {
    super(`Unknown tool: ${toolName}`);
    this.toolName = toolName;
    this.name = "UnknownMcpToolError";
  }
};
function objectArguments(value, allowed) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ToolInputError("Tool arguments must be an object.");
  }
  const input = value;
  const unknown = Object.keys(input).filter((key) => !allowed.includes(key));
  if (unknown.length > 0)
    throw new ToolInputError(`Unknown argument${unknown.length === 1 ? "" : "s"}: ${unknown.join(", ")}`);
  return input;
}
function requiredString(input, key, maximum) {
  const value = input[key];
  if (typeof value !== "string" || value.trim().length === 0 || value.length > maximum) {
    throw new ToolInputError(`${key} must be a non-empty string no longer than ${maximum} characters.`);
  }
  return value.trim();
}
function optionalString2(input, key, maximum) {
  if (input[key] === void 0)
    return void 0;
  return requiredString(input, key, maximum);
}
function temporaryTests(input) {
  const value = input.temporaryTests;
  if (value === void 0)
    return [];
  if (!Array.isArray(value) || value.length > 20) {
    throw new ToolInputError("temporaryTests must be an array containing at most 20 tests.");
  }
  return value.map((item, index) => {
    const test = objectArguments(item, [
      "adapter",
      "id",
      "requirementRefs",
      "source",
      "targetPath"
    ]);
    if (test.adapter !== "vitest" && test.adapter !== "jest" && test.adapter !== "playwright") {
      throw new ToolInputError(`temporaryTests[${index}].adapter must be vitest, jest, or playwright.`);
    }
    if (!Array.isArray(test.requirementRefs) || test.requirementRefs.length === 0 || test.requirementRefs.length > 100 || test.requirementRefs.some((reference) => typeof reference !== "string" || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}#[A-Za-z0-9][A-Za-z0-9._-]{0,119}$/u.test(reference))) {
      throw new ToolInputError(`temporaryTests[${index}].requirementRefs must contain 1 to 100 contract-id#requirement-id strings.`);
    }
    if (typeof test.source !== "string" || test.source.trim().length === 0 || test.source.length > 1e5) {
      throw new ToolInputError(`temporaryTests[${index}].source must be non-empty and no longer than 100000 characters.`);
    }
    return {
      adapter: test.adapter,
      id: requiredString(test, "id", 80),
      requirementRefs: test.requirementRefs,
      source: test.source,
      targetPath: requiredString(test, "targetPath", 500)
    };
  });
}
function success(data) {
  const structuredContent = { ok: true, ...data };
  return {
    content: [{ text: JSON.stringify(structuredContent, null, 2), type: "text" }],
    isError: false,
    structuredContent
  };
}
function boundedProjectContext(scan) {
  return {
    ci: scan.ci,
    dependencies: {
      development: scan.dependencies.development.slice(0, MAX_CONTEXT_ITEMS),
      developmentCount: scan.dependencies.development.length,
      production: scan.dependencies.production.slice(0, MAX_CONTEXT_ITEMS),
      productionCount: scan.dependencies.production.length,
      truncated: scan.dependencies.development.length > MAX_CONTEXT_ITEMS || scan.dependencies.production.length > MAX_CONTEXT_ITEMS
    },
    generatedAt: scan.generatedAt,
    project: scan.project,
    routeCount: scan.routes.length,
    routes: scan.routes.slice(0, MAX_CONTEXT_ITEMS),
    routesTruncated: scan.routes.length > MAX_CONTEXT_ITEMS,
    schemaVersion: scan.schemaVersion,
    source: {
      directories: scan.source.directories,
      fileCount: scan.source.fileCount,
      filesByExtension: scan.source.filesByExtension,
      filesTruncated: scan.source.files.length > MAX_CONTEXT_ITEMS,
      sampleFiles: scan.source.files.slice(0, MAX_CONTEXT_ITEMS)
    },
    tests: {
      directories: scan.tests.directories,
      fileCount: scan.tests.files.length,
      files: scan.tests.files.slice(0, MAX_CONTEXT_ITEMS),
      filesTruncated: scan.tests.files.length > MAX_CONTEXT_ITEMS,
      frameworks: scan.tests.frameworks
    }
  };
}
function failure(error) {
  let code = "MCP_TOOL_EXECUTION_FAILED";
  let message = "The MaruCheck tool could not complete safely.";
  let remediation = "Confirm the project is initialized, then retry with valid arguments.";
  let issues = [];
  if (error instanceof ContractError || error instanceof DriftError || error instanceof MemoryError || error instanceof EvidenceReportError || error instanceof ProjectError || error instanceof GitAnalysisError || error instanceof VerificationExecutionError || error instanceof MutationVerificationError || error instanceof ChallengeError || error instanceof VerificationPlanError || error instanceof ToolInputError) {
    code = error.code;
    message = error.message;
    remediation = error.remediation;
    if (error instanceof ContractError)
      issues = error.issues;
  }
  const structuredContent = { error: { code, issues, message, remediation }, ok: false };
  return {
    content: [{ text: JSON.stringify(structuredContent, null, 2), type: "text" }],
    isError: true,
    structuredContent
  };
}
function isToolName(name) {
  return MARU_MCP_TOOLS.some((tool) => tool.name === name);
}
async function callMaruTool(name, args, dependencies) {
  if (!isToolName(name))
    throw new UnknownMcpToolError(name);
  const { root } = dependencies;
  try {
    if (name === "maru_get_project_context") {
      objectArguments(args, []);
      const [project, contracts, validation] = await Promise.all([
        scanProject(root, dependencies.now?.() ?? /* @__PURE__ */ new Date()),
        listContracts(root),
        validateContracts(root)
      ]);
      return success({
        contractCount: contracts.length,
        contracts: contracts.slice(0, MAX_CONTEXT_ITEMS),
        contractsTruncated: contracts.length > MAX_CONTEXT_ITEMS,
        contractValidation: {
          invalid: validation.invalid,
          validCount: validation.valid.length
        },
        project: boundedProjectContext(project)
      });
    }
    if (name === "maru_list_contracts") {
      objectArguments(args, []);
      return success({ contracts: await listContracts(root) });
    }
    if (name === "maru_get_contract") {
      const input = objectArguments(args, ["id"]);
      const contract = await getContract(root, requiredString(input, "id", 120));
      return success({ contract, versionHash: contractVersionHash(contract) });
    }
    if (name === "maru_create_contract") {
      const input = objectArguments(args, ["id", "requirements", "title"]);
      const created = await createContractFromRequirements(root, requiredString(input, "requirements", 1e5), {
        id: optionalString2(input, "id", 120),
        now: dependencies.now?.() ?? /* @__PURE__ */ new Date(),
        title: optionalString2(input, "title", 200)
      });
      return success({ ...created, reviewRequired: true });
    }
    if (name === "maru_validate_contract") {
      const input = objectArguments(args, ["path"]);
      const validation = await validateContracts(root, optionalString2(input, "path", 500));
      return success({ invalid: validation.invalid, valid: validation.valid });
    }
    if (name === "maru_run_verification") {
      const input = objectArguments(args, ["temporaryTests"]);
      const tests = temporaryTests(input);
      const result2 = await (dependencies.verificationReport ?? createAndWriteVerificationReport)(root, dependencies.now?.() ?? /* @__PURE__ */ new Date(), { temporaryTests: tests });
      return success({
        path: result2.path,
        planPath: result2.planPath,
        report: result2.report,
        run: result2.run,
        runPath: result2.runPath
      });
    }
    if (name === "maru_run_mutation_verification") {
      const input = objectArguments(args, ["maxMutations"]);
      const maximum = input.maxMutations;
      if (maximum !== void 0 && (typeof maximum !== "number" || !Number.isInteger(maximum) || maximum < 1 || maximum > 100)) {
        throw new ToolInputError("maxMutations must be an integer from 1 to 100.");
      }
      const result2 = await (dependencies.mutationVerification ?? runMutationVerification)(root, dependencies.now?.() ?? /* @__PURE__ */ new Date(), { ...maximum === void 0 ? {} : { maxMutations: maximum } });
      return success({ path: result2.path, report: result2.report });
    }
    if (name === "maru_prepare_challenge") {
      const input = objectArguments(args, ["releaseVerification"]);
      const releaseVerification = input.releaseVerification;
      if (releaseVerification !== void 0 && typeof releaseVerification !== "boolean") {
        throw new ToolInputError("releaseVerification must be a boolean.");
      }
      const result2 = await (dependencies.challengeBrief ?? prepareAndWriteChallengeBrief)(root, dependencies.now?.() ?? /* @__PURE__ */ new Date(), {
        explicit: true,
        ...releaseVerification === true ? { releaseVerification: true } : {}
      });
      return success({ brief: result2.brief, path: result2.path });
    }
    if (name === "maru_submit_challenge") {
      const input = objectArguments(args, ["briefPath", "submission"]);
      const result2 = await (dependencies.challengeSubmission ?? submitChallengeResponse)(root, requiredString(input, "briefPath", 500), input.submission, dependencies.now?.() ?? /* @__PURE__ */ new Date());
      return success({ path: result2.path, report: result2.report });
    }
    if (name === "maru_check_semantic_drift") {
      const input = objectArguments(args, ["observations"]);
      const observations = parseObservedBehaviors({ observations: input.observations });
      const summaries = await listContracts(root);
      const contracts = await Promise.all(summaries.map((item) => getContract(root, item.id)));
      return success({
        report: checkSemanticDrift(contracts, observations, dependencies.now?.() ?? /* @__PURE__ */ new Date())
      });
    }
    if (name === "maru_propose_contract_amendment") {
      const input = objectArguments(args, ["contractId", "observations", "proposedBy", "reason"]);
      const result2 = await proposeContractAmendment(root, requiredString(input, "contractId", 120), parseObservedBehaviors({ observations: input.observations }), {
        now: dependencies.now?.() ?? /* @__PURE__ */ new Date(),
        proposedBy: requiredString(input, "proposedBy", 200),
        reason: requiredString(input, "reason", 2e3)
      });
      return success({ ...result2, approvalRequired: true });
    }
    if (name === "maru_record_bug") {
      const input = objectArguments(args, [
        "regressionTests",
        "relatedContracts",
        "relatedFiles",
        "rootCause",
        "severity",
        "summary",
        "supersedes",
        "tags",
        "title",
        "type"
      ]);
      const result2 = await createMemoryRecord(root, parseMemoryRecordInput({ ...input, source: "coding-agent" }), { now: dependencies.now?.() ?? /* @__PURE__ */ new Date() });
      return success(result2);
    }
    if (name === "maru_query_memory") {
      const input = objectArguments(args, ["query"]);
      return success({
        matches: await searchMemoryRecords(root, requiredString(input, "query", 500))
      });
    }
    objectArguments(args, []);
    if (name === "maru_analyze_diff") {
      const diff = await (dependencies.analyzeDiff ?? analyzeGitDiff)(root);
      return success({ diff, scope: "staged-unstaged-untracked" });
    }
    if (name === "maru_assess_risk") {
      const assessment = await (dependencies.assessRisk === void 0 ? assessProjectRisk(root, { now: dependencies.now?.() ?? /* @__PURE__ */ new Date() }) : dependencies.assessRisk(root));
      return success({ assessment });
    }
    const result = await (dependencies.createVerificationPlan ?? createAndWriteVerificationPlan)(root, dependencies.now?.() ?? /* @__PURE__ */ new Date());
    return success({ path: result.path, plan: result.plan });
  } catch (error) {
    return failure(error);
  }
}

// packages/mcp-server/dist/server.js
var MCP_PROTOCOL_VERSION = "2025-11-25";
var SUPPORTED_PROTOCOL_VERSIONS = /* @__PURE__ */ new Set([MCP_PROTOCOL_VERSION, "2025-06-18", "2024-11-05"]);
function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function requestId(value) {
  return typeof value === "string" || typeof value === "number" && Number.isFinite(value) ? value : void 0;
}
function response(id, result) {
  return { id, jsonrpc: "2.0", result };
}
function errorResponse(id, code, message, data) {
  return {
    error: { code, message, ...data === void 0 ? {} : { data } },
    id,
    jsonrpc: "2.0"
  };
}
function requestedProtocol(params) {
  return typeof params.protocolVersion === "string" ? params.protocolVersion : void 0;
}
var MaruMcpServer = class {
  dependencies;
  initializeCompleted = false;
  initialized = false;
  constructor(dependencies) {
    this.dependencies = dependencies;
  }
  async handle(message) {
    if (!isObject(message) || message.jsonrpc !== "2.0" || typeof message.method !== "string") {
      return errorResponse(null, -32600, "Invalid Request");
    }
    const id = requestId(message.id);
    const notification = message.id === void 0;
    if (!notification && id === void 0) {
      return errorResponse(null, -32600, "Request id must be a string or finite number");
    }
    const params = message.params === void 0 ? {} : message.params;
    if (!isObject(params)) {
      return notification ? void 0 : errorResponse(id ?? null, -32602, "Invalid params");
    }
    if (message.method === "ping") {
      return notification ? void 0 : response(id, {});
    }
    if (message.method === "initialize") {
      if (notification || id === void 0)
        return errorResponse(null, -32600, "Initialize must be a request");
      if (this.initializeCompleted)
        return errorResponse(id, -32600, "Server is already initialized");
      const protocolVersion = requestedProtocol(params);
      if (protocolVersion === void 0 || !isObject(params.capabilities) || !isObject(params.clientInfo) || typeof params.clientInfo.name !== "string" || typeof params.clientInfo.version !== "string") {
        return errorResponse(id, -32602, "Invalid initialize parameters");
      }
      this.initializeCompleted = true;
      return response(id, {
        capabilities: { tools: { listChanged: false } },
        instructions: "Query MaruCheck project context, Quality Contracts, and relevant QA memory before changing behavior. Check observed behavior for semantic drift before changing protected expectations. Record confirmed bugs with regression tests so future risk and planning include them. Analyze the diff, assess risk, create an inspectable verification plan, and run verification with evidence and findings after edits. For high-risk or release work, prepare a Challenger brief, give it to a fresh thread or subagent without the builder conversation, then submit the isolated response with truthful provenance. Treat Challenger hypotheses as review inputs rather than verified findings. Drafts and amendment proposals never approve product intent.",
        protocolVersion: SUPPORTED_PROTOCOL_VERSIONS.has(protocolVersion) ? protocolVersion : MCP_PROTOCOL_VERSION,
        serverInfo: {
          description: "Local-first MaruCheck project and Quality Contract tools",
          name: "maru",
          title: "MaruCheck",
          version: "0.6.1"
          // x-release-please-version
        }
      });
    }
    if (message.method === "notifications/initialized") {
      if (this.initializeCompleted)
        this.initialized = true;
      return void 0;
    }
    if (!this.initialized) {
      return notification ? void 0 : errorResponse(id ?? null, -32002, "Server not initialized");
    }
    if (message.method === "tools/list") {
      if (notification || id === void 0)
        return void 0;
      if (params.cursor !== void 0) {
        return errorResponse(id, -32602, "Pagination cursor is not supported for this fixed tool list");
      }
      return response(id, { tools: MARU_MCP_TOOLS });
    }
    if (message.method === "tools/call") {
      if (notification || id === void 0)
        return void 0;
      if (typeof params.name !== "string") {
        return errorResponse(id, -32602, "Tool name must be a string");
      }
      try {
        return response(id, await callMaruTool(params.name, params.arguments ?? {}, this.dependencies));
      } catch (error) {
        if (error instanceof UnknownMcpToolError) {
          return errorResponse(id, -32602, error.message);
        }
        return errorResponse(id, -32603, "Internal error");
      }
    }
    return notification ? void 0 : errorResponse(id ?? null, -32601, "Method not found");
  }
};
async function handleJsonLine(server, line) {
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    return JSON.stringify(errorResponse(null, -32700, "Parse error"));
  }
  const result = await server.handle(message);
  return result === void 0 ? void 0 : JSON.stringify(result);
}

// packages/mcp-server/dist/stdio.js
var import_node_readline = require("node:readline");
async function runStdioMcpServer(options) {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const server = new MaruMcpServer(options);
  const lines = (0, import_node_readline.createInterface)({ crlfDelay: Infinity, input, terminal: false });
  for await (const line of lines) {
    if (line.trim().length === 0)
      continue;
    const serialized = await handleJsonLine(server, line);
    if (serialized !== void 0)
      output.write(`${serialized}
`);
  }
}

// packages/cli/src/hosted.ts
var import_promises17 = require("node:fs/promises");
var import_node_path19 = require("node:path");
var INGEST_PATH = "/api/v1/ingest/runs";
var MAX_REPORT_BYTES = 19e5;
var HostedUploadError = class extends Error {
  code;
  remediation;
  constructor(code, message, remediation, options) {
    super(message, options);
    this.name = "HostedUploadError";
    this.code = code;
    this.remediation = remediation;
  }
};
async function uploadVerificationReport(root, options) {
  const environment = options.environment ?? process.env;
  const runner = options.gitRunner ?? defaultGitRunner;
  const localEnvironment = await readLocalHostedEnvironment(root, runner);
  const token = environment.MARUCHECK_TOKEN?.trim() || localEnvironment.MARUCHECK_TOKEN;
  if (!token || !token.startsWith("maru_") || token.length > 128) {
    throw new HostedUploadError(
      "HOSTED_AUTH_REQUIRED",
      "A valid project token is required for hosted report upload.",
      "Put MARUCHECK_TOKEN in the ignored .maru/connection.env file shown by the dashboard, or set it in the shell/CI environment."
    );
  }
  const baseURL = hostedBaseURL(
    options.baseURL ?? environment.MARUCHECK_URL ?? localEnvironment.MARUCHECK_URL
  );
  const reportPath = options.reportPath ?? await newestReportPath(root);
  const report = await readReport(root, reportPath);
  const metadata = await gitMetadata(root, runner);
  const envelope = {
    schemaVersion: 1,
    branch: metadata.branch,
    commitSha: metadata.commitSha,
    title: metadata.title,
    startedAt: report.generatedAt,
    completedAt: report.generatedAt,
    report: report.report
  };
  const body = JSON.stringify(envelope);
  if (Buffer.byteLength(body, "utf8") > 2e6) {
    throw new HostedUploadError(
      "HOSTED_REPORT_INVALID",
      "The hosted ingestion envelope exceeds the 2 MB limit.",
      "Reduce diagnostic or artifact-reference volume, regenerate the report, and retry."
    );
  }
  const endpoint = new URL(INGEST_PATH, baseURL).toString();
  let response2;
  try {
    response2 = await (options.fetcher ?? globalThis.fetch)(endpoint, {
      body,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      method: "POST",
      signal: AbortSignal.timeout(15e3)
    });
  } catch (error) {
    throw new HostedUploadError(
      "HOSTED_REQUEST_FAILED",
      "The MaruCheck host could not be reached.",
      "Check MARUCHECK_URL and network access, then retry the same report.",
      { cause: error }
    );
  }
  if (response2.status !== 202) {
    const detail = await safeResponseDetail(response2);
    throw new HostedUploadError(
      "HOSTED_REQUEST_FAILED",
      `The MaruCheck host rejected the report (${response2.status})${detail ? `: ${detail}` : "."}`,
      response2.status === 401 ? "Rotate or recopy the project token, update MARUCHECK_TOKEN, and retry." : "Confirm the connected project name matches report.project.name, then retry."
    );
  }
  return {
    dashboardURL: new URL("/projects", baseURL).toString(),
    endpoint,
    reportPath,
    runId: report.runId
  };
}
function hostedBaseURL(value) {
  let url;
  try {
    url = new URL(value ?? "");
  } catch {
    throw invalidHostedURL();
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:") || url.username || url.password || url.search || url.hash) {
    throw invalidHostedURL();
  }
  return new URL(url.origin);
}
function invalidHostedURL() {
  return new HostedUploadError(
    "HOSTED_URL_INVALID",
    "A valid MaruCheck host URL is required.",
    "Put MARUCHECK_URL in .maru/connection.env, pass --url, or set it in the shell/CI environment. HTTP is allowed only for localhost."
  );
}
async function newestReportPath(root) {
  const runsDirectory = (0, import_node_path19.resolve)(root, ".maru", "artifacts", "runs");
  try {
    const entries = await (0, import_promises17.readdir)(runsDirectory, { withFileTypes: true });
    const candidates = [];
    for (const entry of entries.slice(0, 1e3)) {
      if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
      const path = portablePath4((0, import_node_path19.relative)(root, (0, import_node_path19.resolve)(runsDirectory, entry.name, "report.json")));
      try {
        const report = await readReport(root, path);
        candidates.push({ generatedAt: Date.parse(report.generatedAt), path });
      } catch {
      }
    }
    const newest = candidates.sort(
      (left, right) => right.generatedAt - left.generatedAt || right.path.localeCompare(left.path)
    )[0];
    if (newest) return newest.path;
  } catch {
  }
  throw new HostedUploadError(
    "HOSTED_REPORT_NOT_FOUND",
    "No completed MaruCheck verification report was found.",
    "Run maru verify --diff, then run maru upload again."
  );
}
async function readLocalHostedEnvironment(root, runner) {
  const resolved = {
    MARUCHECK_TOKEN: void 0,
    MARUCHECK_URL: void 0
  };
  for (const path of [".maru/connection.env", ".env.local", ".env"]) {
    let content;
    try {
      const target = (0, import_node_path19.resolve)(root, path);
      const stats = await (0, import_promises17.lstat)(target);
      if (!stats.isFile() || stats.isSymbolicLink() || stats.size > 64e3) continue;
      if (!await gitIgnored(root, path, runner)) continue;
      content = await (0, import_promises17.readFile)(target, "utf8");
    } catch {
      continue;
    }
    const values = parseHostedEnvironment(content);
    resolved.MARUCHECK_TOKEN ??= values.MARUCHECK_TOKEN;
    resolved.MARUCHECK_URL ??= values.MARUCHECK_URL;
  }
  return resolved;
}
async function gitIgnored(root, path, runner) {
  try {
    await runner.run(["check-ignore", "--quiet", "--", path], root);
    return true;
  } catch {
    return false;
  }
}
function parseHostedEnvironment(content) {
  const values = {
    MARUCHECK_TOKEN: void 0,
    MARUCHECK_URL: void 0
  };
  for (const line of content.split(/\r?\n/gu)) {
    const match = line.match(/^\s*(?:export\s+)?(MARUCHECK_TOKEN|MARUCHECK_URL)\s*=\s*(.*?)\s*$/u);
    if (!match) continue;
    const name = match[1];
    let value = match[2] ?? "";
    if (value.length >= 2 && (value.startsWith('"') && value.endsWith('"') || value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    } else {
      value = value.replace(/\s+#.*$/u, "").trim();
    }
    if (value) values[name] = value;
  }
  return values;
}
function portablePath4(path) {
  return path.split(import_node_path19.sep).join("/");
}
async function readReport(root, relativePath2) {
  const absoluteRoot = (0, import_node_path19.resolve)(root);
  const target = (0, import_node_path19.resolve)(absoluteRoot, relativePath2);
  if (target === absoluteRoot || !target.startsWith(`${absoluteRoot}${import_node_path19.sep}`)) {
    throw new HostedUploadError(
      "HOSTED_REPORT_UNREADABLE",
      "The report path must stay inside the project root.",
      "Pass the report.json path printed by maru verify --diff."
    );
  }
  try {
    const stats = await (0, import_promises17.lstat)(target);
    if (!stats.isFile() || stats.isSymbolicLink() || stats.size > MAX_REPORT_BYTES) {
      throw new HostedUploadError(
        "HOSTED_REPORT_UNREADABLE",
        "The report must be a regular, non-symlink file smaller than 1.9 MB.",
        "Pass the report.json path printed by maru verify --diff."
      );
    }
    const parsed = JSON.parse(await (0, import_promises17.readFile)(target, "utf8"));
    return reportIdentity(parsed);
  } catch (error) {
    if (error instanceof HostedUploadError) throw error;
    throw new HostedUploadError(
      "HOSTED_REPORT_UNREADABLE",
      "The verification report could not be read.",
      "Pass a valid report.json path inside this project.",
      { cause: error }
    );
  }
}
function reportIdentity(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw invalidReport();
  const report = value;
  const project = report.project;
  if (!project || typeof project !== "object" || Array.isArray(project)) throw invalidReport();
  const projectName = project.name;
  if (report.schemaVersion !== 1 || typeof report.generatedAt !== "string" || Number.isNaN(Date.parse(report.generatedAt)) || typeof report.runId !== "string" || !report.runId.trim() || typeof projectName !== "string" || !projectName.trim()) {
    throw invalidReport();
  }
  return {
    generatedAt: report.generatedAt,
    projectName,
    report: value,
    runId: report.runId
  };
}
function invalidReport() {
  return new HostedUploadError(
    "HOSTED_REPORT_INVALID",
    "The file is not a MaruCheck verification report with schemaVersion 1.",
    "Generate a fresh report with maru verify --diff and pass that report.json file."
  );
}
async function gitMetadata(root, runner) {
  try {
    const [branch, commitSha, title] = await Promise.all([
      runner.run(["rev-parse", "--abbrev-ref", "HEAD"], root),
      runner.run(["rev-parse", "HEAD"], root),
      runner.run(["log", "-1", "--pretty=%s"], root)
    ]);
    const normalized2 = {
      branch: branch.trim().slice(0, 200),
      commitSha: commitSha.trim().slice(0, 100),
      title: title.trim().slice(0, 300)
    };
    if (!normalized2.branch || !normalized2.commitSha || !normalized2.title) throw new Error();
    return normalized2;
  } catch (error) {
    throw new HostedUploadError(
      "HOSTED_GIT_METADATA_FAILED",
      "Git metadata for the verification run could not be read.",
      "Commit the change in a readable Git repository, then retry the upload.",
      { cause: error }
    );
  }
}
async function safeResponseDetail(response2) {
  try {
    const body = await response2.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) return "";
    const detail = body.detail;
    return typeof detail === "string" ? detail.replaceAll(/\s+/gu, " ").slice(0, 500) : "";
  } catch {
    return "";
  }
}

// packages/cli/src/version.ts
var CLI_VERSION = "0.6.1";

// packages/cli/src/cli.ts
function gateFlags(args) {
  const flags = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--strict") {
      flags.strict = true;
      continue;
    }
    const value = args[index + 1];
    if (flag !== "--base" || value === void 0 || !/^[\w][\w./-]*$/u.test(value)) {
      return void 0;
    }
    flags.base = value;
    index += 1;
  }
  return flags;
}
var HELP = `${MARU_PRODUCT.name} \u2014 ${MARU_PRODUCT.positioning}

Usage: maru <command>

Commands:
  challenge  Prepare and submit an isolated adversarial QA review
  init       Initialize MaruCheck in the current repository
  scan       Inventory project architecture, routes, tests, and dependencies
  doctor     Diagnose local prerequisites and configuration
  contract   Create, validate, inspect, diff, and approve Quality Contracts
  drift      Check protected expectations and manage contract amendments
  memory     Record, list, search, and inspect historical QA knowledge
  mutate     Test selected verification by introducing isolated temporary mutations
  risk       Assess the current Git diff with deterministic rules
  plan       Create an inspectable verification plan for the current diff
  verify     Execute tests and write evidence, findings, and a JSON report
  upload     Explicitly send one completed report to a connected dashboard project
  ci         Install and run GitHub pull-request verification
  hook       Gate a coding agent so it cannot finish a turn on a blocked verdict
  mcp        Run the local MaruCheck MCP server over stdio

Contract commands:
  maru contract create [--from requirements.md] [--id contract-id] [--title "Title"]
  maru contract validate [path]
  maru contract list
  maru contract show <id>
  maru contract diff <id-or-path> <id-or-path>
  maru contract approve <id> --by <owner>

Semantic drift commands:
  maru drift check --from observations.json
  maru drift propose <contract-id> --from observations.json --reason "Why" --by <proposer>
  maru drift approve <proposal-path> --by <contract-owner>

QA memory commands:
  maru memory add --from memory.json
  maru memory list
  maru memory search "authorization"
  maru memory show <MEM-id>

Risk commands:
  maru risk --diff

Planning commands:
  maru plan --diff

Verification commands:
  maru verify --diff [--base <ref>] [--strict]

Seal commands:
  maru seal keygen --out <path-outside-project>
  maru seal create --key <path> --by <accountable-owner>
  maru seal verify --base <ref>

Agent gate commands:
  maru hook install [--strict] [--base <ref>]
  maru hook uninstall
  maru hook run [--strict] [--base <ref>]

Hosted report commands:
  maru upload [--report <report.json>] [--url https://marucheck.dev]

Mutation commands:
  maru mutate --diff [--max 20]

Challenger commands:
  maru challenge prepare --diff [--release]
  maru challenge submit --brief <brief.json> --from <response.json>

CI commands:
  maru ci init
  maru ci verify

Options:
  -h, --help       Show help
  -v, --version    Show version`;
function stackSummary(result) {
  const detected = [
    result.stack.packageManager,
    ...result.stack.frameworks,
    ...result.stack.languages,
    ...result.stack.testFrameworks
  ].filter((value) => value !== "unknown");
  return detected.length > 0 ? detected.join(", ") : "no supported stack markers";
}
var MAX_HOOK_INPUT_BYTES = 1e6;
async function readStandardInput() {
  if (process.stdin.isTTY === true) return "";
  const chunks = [];
  let size = 0;
  for await (const chunk of process.stdin) {
    const buffer = chunk;
    size += buffer.byteLength;
    if (size > MAX_HOOK_INPUT_BYTES) break;
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString("utf8");
}
function reportProjectError(error, output) {
  output.error(
    `${error.code}
Operation: ${error.operation}
${error.message}
Fix: ${error.remediation}`
  );
}
function reportContractError(error, output) {
  const issueLines = error.issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n");
  output.error(
    `${error.code}
${error.message}${issueLines.length === 0 ? "" : `
${issueLines}`}
Fix: ${error.remediation}`
  );
}
function reportGitError(error, output) {
  output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
}
function formatHistoricalRisk(memory) {
  const { relevance } = memory;
  return [
    `QA memory ${memory.memoryId}: relevance ${relevance.level.toUpperCase()} (${relevance.score}/100)`,
    ...relevance.signals.map((signal) => `  - ${signal.message}`),
    relevance.level === "low" ? "  Historical record preserved, but no risk increase applied." : `  Risk increased${memory.regressionTests.length === 0 ? "" : " and recorded regression tests are eligible for the verification plan"}.`
  ];
}
function formatRiskAssessment(assessment) {
  const related = assessment.relatedContracts.map((contract) => contract.contractId).join(", ");
  return [
    `Risk: ${assessment.level.toUpperCase()} (${assessment.score}/100)`,
    `Changed files: ${assessment.analysis.summary.changedFiles} (+${assessment.analysis.summary.additions} -${assessment.analysis.summary.deletions})`,
    `Related contracts: ${related.length === 0 ? "none" : related}`,
    `Historical risks: ${assessment.historicalRisks.length === 0 ? "none" : assessment.historicalRisks.map((memory) => `${memory.memoryId} (${memory.relevance.level})`).join(", ")}`,
    ...assessment.historicalRisks.flatMap(formatHistoricalRisk),
    "Why:",
    ...assessment.reasons.map((reason) => `  +${reason.points} ${reason.message}`),
    `Recommended tests: ${assessment.recommendedTestCategories.join(", ") || "none"}`
  ].join("\n");
}
function formatVerificationPlan(result) {
  const { plan } = result;
  return [
    `Verification plan written: ${result.path}`,
    `Risk: ${plan.risk.level.toUpperCase()} (${plan.risk.score}/100)`,
    `Requirements: ${plan.summary.selectedRequirements}`,
    `Affected tests: ${plan.summary.affectedTests}`,
    `Historical regressions: ${plan.summary.historicalRegressions}`,
    `Steps: ${plan.steps.length} (${plan.summary.automatedSteps} automated, ${plan.summary.manualSteps} manual, ${plan.summary.unavailableSteps} unavailable)`,
    `Uncovered requirements: ${plan.uncoveredRequirements.length}`
  ].join("\n");
}
function option(args, name) {
  const index = args.indexOf(name);
  if (index < 0) return void 0;
  const value = args[index + 1];
  if (value === void 0 || value.startsWith("--")) {
    throw new ContractError(
      "CONTRACT_INVALID",
      `Missing value for ${name}.`,
      `Pass a value after ${name}.`
    );
  }
  return value;
}
function hostedUploadOptions(args) {
  if (args.length % 2 !== 0 || args.length > 4) return void 0;
  const values = {};
  const seen = /* @__PURE__ */ new Set();
  for (let index = 0; index < args.length; index += 2) {
    const flag = args[index];
    const value = args[index + 1];
    if (value === void 0 || value.startsWith("--") || flag !== "--report" && flag !== "--url" || seen.has(flag)) {
      return void 0;
    }
    seen.add(flag);
    if (flag === "--report") values.reportPath = value;
    if (flag === "--url") values.baseURL = value;
  }
  return values;
}
function resolveInsideRoot3(root, path) {
  const absoluteRoot = (0, import_node_path20.resolve)(root);
  const target = (0, import_node_path20.resolve)(absoluteRoot, path);
  if (target !== absoluteRoot && !target.startsWith(`${absoluteRoot}${import_node_path20.sep}`)) {
    throw new ContractError(
      "CONTRACT_ID_INVALID",
      `Path escapes the project root: ${path}`,
      "Use a requirements file inside the project root."
    );
  }
  return target;
}
async function runContractCommand(args, root, output, now) {
  const [action, ...actionArgs] = args;
  if (action === "create") {
    const sourcePath = option(actionArgs, "--from");
    const requirements = sourcePath === void 0 ? "The feature must satisfy its approved requirements and preserve expected behavior." : await (0, import_promises18.readFile)(resolveInsideRoot3(root, sourcePath), "utf8");
    const result = await createContractFromRequirements(root, requirements, {
      id: option(actionArgs, "--id"),
      now,
      title: option(actionArgs, "--title")
    });
    output.log(
      `Draft contract created: ${result.path}
Version: ${result.versionHash}
Review the draft before approval.`
    );
    return 0;
  }
  if (action === "list") {
    const contracts = await listContracts(root);
    output.log(
      contracts.length === 0 ? "No Quality Contracts found." : contracts.map(
        (contract) => `${contract.id}	${contract.status}	${contract.criticality}	${contract.versionHash.slice(0, 12)}`
      ).join("\n")
    );
    return 0;
  }
  if (action === "show") {
    const id = actionArgs[0];
    if (id === void 0) {
      throw new ContractError(
        "CONTRACT_INVALID",
        "A contract identifier is required.",
        "Run maru contract show <id>."
      );
    }
    output.log(serializeQualityContract(await getContract(root, id)).trimEnd());
    return 0;
  }
  if (action === "validate") {
    const report = await validateContracts(root, actionArgs[0]);
    for (const invalid3 of report.invalid) {
      output.error(
        `${invalid3.path}
${invalid3.issues.map((issue) => `- ${issue.path}: ${issue.message}`).join("\n")}`
      );
    }
    output.log(
      `Contracts valid: ${report.valid.length}
Contracts invalid: ${report.invalid.length}`
    );
    return report.invalid.length === 0 ? 0 : 1;
  }
  if (action === "diff") {
    const [left, right] = actionArgs;
    if (left === void 0 || right === void 0) {
      throw new ContractError(
        "CONTRACT_INVALID",
        "Two contract identifiers or paths are required.",
        "Run maru contract diff <id-or-path> <id-or-path>."
      );
    }
    const result = await diffContracts(root, left, right);
    output.log(
      [
        `Contract diff: ${result.classification}`,
        ...result.changes.map(
          (item) => `${item.semantic ? "SEMANTIC" : "MECHANICAL"} ${item.kind} ${item.path}`
        )
      ].join("\n")
    );
    return 0;
  }
  if (action === "approve") {
    const id = actionArgs[0];
    const approvedBy = option(actionArgs, "--by");
    if (id === void 0 || approvedBy === void 0) {
      throw new ContractError(
        "CONTRACT_INVALID",
        "A contract identifier and approver are required.",
        "Run maru contract approve <id> --by <owner>."
      );
    }
    const result = await approveContract(root, id, { approvedAt: now, approvedBy });
    output.log(
      `Contract approved: ${result.contract.id}
Version: ${result.versionHash}
Snapshot: .maru/contracts/.history/${result.contract.id}/${result.versionHash}.yml`
    );
    return 0;
  }
  throw new ContractError(
    "CONTRACT_INVALID",
    `Unknown contract command: ${action ?? "(missing)"}`,
    "Run maru --help for contract command usage."
  );
}
async function observationsFromFile(root, path) {
  let parsed;
  try {
    parsed = JSON.parse(await (0, import_promises18.readFile)(resolveInsideRoot3(root, path), "utf8"));
  } catch (error) {
    throw new DriftError(
      "DRIFT_INVALID_INPUT",
      `Unable to read observations from ${path}.`,
      "Provide a valid JSON file inside the project root.",
      { cause: error }
    );
  }
  return parseObservedBehaviors(parsed);
}
async function runDriftCommand(args, root, output, now) {
  const [action, ...actionArgs] = args;
  if (action === "check") {
    const sourcePath = option(actionArgs, "--from");
    if (sourcePath === void 0) {
      throw new DriftError(
        "DRIFT_INVALID_INPUT",
        "An observations file is required.",
        "Run maru drift check --from observations.json."
      );
    }
    const summaries = await listContracts(root);
    const contracts = await Promise.all(summaries.map((item) => getContract(root, item.id)));
    const report = checkSemanticDrift(contracts, await observationsFromFile(root, sourcePath), now);
    output.log(formatSemanticDriftReport(report));
    return report.gate.status === "blocked" ? 1 : 0;
  }
  if (action === "propose") {
    const contractId = actionArgs[0];
    const sourcePath = option(actionArgs, "--from");
    const reason = option(actionArgs, "--reason");
    const proposedBy = option(actionArgs, "--by");
    if (contractId === void 0 || sourcePath === void 0 || reason === void 0 || proposedBy === void 0) {
      throw new DriftError(
        "DRIFT_INVALID_INPUT",
        "A contract, observations file, reason, and proposer are required.",
        'Run maru drift propose <contract-id> --from observations.json --reason "Why" --by <proposer>.'
      );
    }
    const result = await proposeContractAmendment(
      root,
      contractId,
      await observationsFromFile(root, sourcePath),
      { now, proposedBy, reason }
    );
    output.log(
      `Amendment proposed: ${result.path}
Semantic changes: ${result.proposal.changes.filter((item) => item.semantic).length}
Approval required from: ${result.proposal.approval.eligibleApprovers.join(", ") || "an accountable owner"}
The current contract was not changed.`
    );
    return 0;
  }
  if (action === "approve") {
    const proposalPath = actionArgs[0];
    const approvedBy = option(actionArgs, "--by");
    if (proposalPath === void 0 || approvedBy === void 0) {
      throw new DriftError(
        "DRIFT_APPROVAL_REQUIRED",
        "A proposal path and approving contract owner are required.",
        "Run maru drift approve <proposal-path> --by <contract-owner>."
      );
    }
    const result = await approveContractAmendment(root, proposalPath, { approvedBy, now });
    output.log(
      `Amendment approved: ${result.contract.id}
Version: ${result.versionHash}
Audit: ${result.auditPath}`
    );
    return 0;
  }
  throw new DriftError(
    "DRIFT_INVALID_INPUT",
    `Unknown drift command: ${action ?? "(missing)"}`,
    "Run maru --help for semantic drift command usage."
  );
}
async function memoryInputFromFile(root, path) {
  try {
    return parseMemoryRecordInput(
      JSON.parse(await (0, import_promises18.readFile)(resolveInsideRoot3(root, path), "utf8"))
    );
  } catch (error) {
    if (error instanceof MemoryError) throw error;
    throw new MemoryError(
      "MEMORY_INVALID",
      `Unable to read QA memory input from ${path}.`,
      "Provide a valid JSON file inside the project root.",
      { cause: error }
    );
  }
}
async function runMemoryCommand(args, root, output, now) {
  const [action, ...actionArgs] = args;
  if (action === "add") {
    const sourcePath = option(actionArgs, "--from");
    if (sourcePath === void 0) {
      throw new MemoryError(
        "MEMORY_INVALID",
        "A QA memory input file is required.",
        "Run maru memory add --from memory.json."
      );
    }
    const result = await createMemoryRecord(root, await memoryInputFromFile(root, sourcePath), {
      now
    });
    output.log(
      `QA memory recorded: ${result.record.id}
Severity: ${result.record.severity}
Path: ${result.path}
Regression tests: ${result.record.regressionTests.length}`
    );
    return 0;
  }
  if (action === "list") {
    const records = await listMemoryRecords(root);
    const superseded = supersededBy(records);
    output.log(
      records.length === 0 ? "No QA memory records found." : records.map((record4) => {
        const newer = superseded.get(record4.id);
        return `${record4.id}	${record4.severity}	${record4.type}	${record4.title}${newer === void 0 ? "" : `	(superseded by ${newer.join(", ")})`}`;
      }).join("\n")
    );
    return 0;
  }
  if (action === "search") {
    const query = actionArgs.join(" ").trim();
    const matches = await searchMemoryRecords(root, query);
    output.log(
      [
        `Memory matches: ${matches.length}`,
        ...matches.map(
          (match) => `${match.record.id}	${match.record.severity}	${match.record.title}
  Terms: ${match.matchedTerms.join(", ")}
  Fields: ${match.matchedFields.join(", ")}`
        )
      ].join("\n")
    );
    return 0;
  }
  if (action === "show") {
    const id = actionArgs[0];
    if (id === void 0) {
      throw new MemoryError(
        "MEMORY_INVALID",
        "A QA memory identifier is required.",
        "Run maru memory show <MEM-id>."
      );
    }
    output.log(JSON.stringify(await getMemoryRecord(root, id), null, 2));
    return 0;
  }
  throw new MemoryError(
    "MEMORY_INVALID",
    `Unknown memory command: ${action ?? "(missing)"}`,
    "Run maru --help for QA memory command usage."
  );
}
async function runCli(args, output, dependencies = {}) {
  const [command] = args;
  const root = dependencies.cwd ?? process.cwd();
  if (command === void 0 || command === "--help" || command === "-h") {
    output.log(HELP);
    return Promise.resolve(0);
  }
  if (command === "--version" || command === "-v") {
    output.log(CLI_VERSION);
    return Promise.resolve(0);
  }
  try {
    if (command === "init") {
      const result = await initializeProject(root);
      output.log(
        result.created ? `MaruCheck initialized.
Config: ${result.configPath}
Detected: ${stackSummary(result)}
Next: maru scan` : `MaruCheck is already initialized.
Config preserved: ${result.configPath}
Detected: ${stackSummary(result)}`
      );
      return 0;
    }
    if (command === "scan") {
      const scan = await scanProject(root, dependencies.now?.() ?? /* @__PURE__ */ new Date());
      const outputPath = await writeProjectScan(root, scan);
      output.log(
        `Project scan written: ${outputPath}
Routes: ${scan.routes.length}
Tests: ${scan.tests.files.length}
Source files: ${scan.source.fileCount}`
      );
      return 0;
    }
    if (command === "doctor") {
      const report = await diagnoseProject(
        root,
        dependencies.doctorEnvironment ?? defaultDoctorEnvironment
      );
      for (const check of report.checks) {
        const remediation = check.remediation === void 0 ? "" : ` Fix: ${check.remediation}`;
        output.log(`${check.status.toUpperCase()} ${check.code}: ${check.details}${remediation}`);
      }
      output.log(
        report.ok ? "Doctor: all required checks passed." : "Doctor: one or more required checks failed."
      );
      return report.ok ? 0 : 1;
    }
    if (command === "contract") {
      return await runContractCommand(
        args.slice(1),
        root,
        output,
        dependencies.now?.() ?? /* @__PURE__ */ new Date()
      );
    }
    if (command === "drift") {
      return await runDriftCommand(args.slice(1), root, output, dependencies.now?.() ?? /* @__PURE__ */ new Date());
    }
    if (command === "memory") {
      return await runMemoryCommand(
        args.slice(1),
        root,
        output,
        dependencies.now?.() ?? /* @__PURE__ */ new Date()
      );
    }
    if (command === "risk") {
      if (args.length !== 2 || args[1] !== "--diff") {
        output.error("Invalid risk command.\nRun maru risk --diff.");
        return 1;
      }
      const assessment = await (dependencies.riskAssessment === void 0 ? assessProjectRisk(root, { now: dependencies.now?.() ?? /* @__PURE__ */ new Date() }) : dependencies.riskAssessment(root));
      output.log(formatRiskAssessment(assessment));
      return 0;
    }
    if (command === "plan") {
      if (args.length !== 2 || args[1] !== "--diff") {
        output.error("Invalid planning command.\nRun maru plan --diff.");
        return 1;
      }
      const result = await (dependencies.verificationPlan ?? createAndWriteVerificationPlan)(
        root,
        dependencies.now?.() ?? /* @__PURE__ */ new Date()
      );
      output.log(formatVerificationPlan(result));
      return 0;
    }
    if (command === "verify") {
      const verifyOptions = args[1] === "--diff" ? gateFlags(args.slice(2)) : void 0;
      if (verifyOptions === void 0) {
        output.error(
          "Invalid verification command.\nRun maru verify --diff [--base <ref>] [--strict]."
        );
        return 1;
      }
      const result = await (dependencies.verificationReport ?? createAndWriteVerificationReport)(
        root,
        dependencies.now?.() ?? /* @__PURE__ */ new Date(),
        verifyOptions
      );
      output.log(formatVerificationReport(result));
      return result.report.gate.status === "blocked" ? 1 : 0;
    }
    if (command === "upload") {
      const uploadOptions = hostedUploadOptions(args.slice(1));
      if (uploadOptions === void 0) {
        output.error(
          "Invalid upload command.\nRun maru upload [--report <report.json>] [--url https://marucheck.dev]."
        );
        return 1;
      }
      const result = await (dependencies.hostedUpload ?? uploadVerificationReport)(root, {
        environment: dependencies.environment ?? process.env,
        ...uploadOptions
      });
      output.log(
        [
          "Hosted report accepted.",
          `Run: ${result.runId}`,
          `Report: ${result.reportPath}`,
          `Dashboard: ${result.dashboardURL}`,
          "Uploaded: verification metadata and artifact references (no source code)."
        ].join("\n")
      );
      return 0;
    }
    if (command === "mutate") {
      const validShape = args.length === 2 && args[1] === "--diff" || args.length === 4 && args[1] === "--diff" && args[2] === "--max";
      if (!validShape) {
        output.error("Invalid mutation command.\nRun maru mutate --diff [--max 20].");
        return 1;
      }
      const rawMaximum = args[3];
      const maximum = rawMaximum === void 0 ? void 0 : Number(rawMaximum);
      if (maximum !== void 0 && (!Number.isInteger(maximum) || maximum < 1 || maximum > 100)) {
        output.error("Invalid mutation limit.\nPass --max with an integer from 1 to 100.");
        return 1;
      }
      const result = await (dependencies.mutationVerification ?? ((projectRoot, generatedAt, maxMutations) => runMutationVerification(projectRoot, generatedAt, { maxMutations })))(root, dependencies.now?.() ?? /* @__PURE__ */ new Date(), maximum);
      output.log(formatMutationReport(result));
      return result.report.gate.status === "blocked" ? 1 : 0;
    }
    if (command === "challenge") {
      const action = args[1];
      if (action === "prepare" && (args.length === 3 && args[2] === "--diff" || args.length === 4 && args[2] === "--diff" && args[3] === "--release")) {
        const result = await (dependencies.challengeBrief ?? prepareAndWriteChallengeBrief)(
          root,
          dependencies.now?.() ?? /* @__PURE__ */ new Date(),
          { explicit: true, ...args[3] === "--release" ? { releaseVerification: true } : {} }
        );
        output.log(formatChallengeBrief(result));
        return 0;
      }
      if (action === "submit" && args.length === 6) {
        const briefPath = option(args.slice(2), "--brief");
        const responsePath = option(args.slice(2), "--from");
        const allowed = /* @__PURE__ */ new Set(["--brief", briefPath, "--from", responsePath]);
        if (briefPath !== void 0 && responsePath !== void 0 && args.slice(2).every((argument) => allowed.has(argument))) {
          const result = await (dependencies.challengeSubmission ?? submitChallengeFromFile)(
            root,
            briefPath,
            responsePath,
            dependencies.now?.() ?? /* @__PURE__ */ new Date()
          );
          output.log(formatChallengeReport(result));
          return result.report.gate.status === "blocked" ? 1 : 0;
        }
      }
      {
        output.error(
          "Invalid Challenger command.\nRun maru challenge prepare --diff [--release] or maru challenge submit --brief <brief.json> --from <response.json>."
        );
        return 1;
      }
    }
    if (command === "ci") {
      const action = args[1];
      const ciOptions = action === "verify" ? gateFlags(args.slice(2)) : {};
      if (action !== "init" && action !== "verify" || ciOptions === void 0 || action === "init" && args.length !== 2) {
        output.error(
          "Invalid CI command.\nRun maru ci init or maru ci verify [--base <ref>] [--strict]."
        );
        return 1;
      }
      if (action === "init") {
        const result2 = await (dependencies.ciWorkflowInstaller ?? installGitHubWorkflow)(root);
        output.log(
          result2.created ? `GitHub workflow installed: ${result2.path}
Next: commit the workflow and open a pull request.` : `GitHub workflow already installed: ${result2.path}`
        );
        return 0;
      }
      const result = await (dependencies.ciVerification ?? runPullRequestVerification)(
        root,
        dependencies.now?.() ?? /* @__PURE__ */ new Date(),
        ciOptions
      );
      output.log(
        [
          `ProofLayer: ${result.conclusion.toUpperCase()}`,
          `Evidence report: ${result.reportPath}`,
          `GitHub summary: ${result.summaryPath}`,
          `Published to GitHub: ${result.publishedToGitHub ? "yes" : "no (local run)"}`
        ].join("\n")
      );
      return result.conclusion === "failure" ? 1 : 0;
    }
    if (command === "hook") {
      const action = args[1];
      const hookOptions = action === "uninstall" ? {} : gateFlags(args.slice(2));
      if (action !== "install" && action !== "run" && action !== "uninstall" || hookOptions === void 0 || action === "uninstall" && args.length !== 2) {
        output.error(
          "Invalid agent gate command.\nRun maru hook install [--strict] [--base <ref>], maru hook uninstall, or maru hook run [--strict] [--base <ref>]."
        );
        return 1;
      }
      if (action === "install") {
        const result = await (dependencies.agentHookInstaller ?? installAgentHook)(
          root,
          hookOptions
        );
        output.log(
          result.created || result.updated ? [
            `Agent gate installed: ${result.path}`,
            `Stop hook command: ${result.command}`,
            "Claude Code now runs maru verify --diff before it can end a turn,",
            "and a blocked gate is handed back to the agent as the reason."
          ].join("\n") : `Agent gate already installed: ${result.path}`
        );
        return 0;
      }
      if (action === "uninstall") {
        const result = await (dependencies.agentHookUninstaller ?? uninstallAgentHook)(root);
        output.log(
          result.removed ? `Agent gate removed from ${result.path}.` : `No agent gate was installed in ${result.path}.`
        );
        return 0;
      }
      const raw = await (dependencies.agentHookInput ?? readStandardInput)();
      const decision = await (dependencies.agentGate ?? ((projectRoot, hookInput, now) => runAgentGate(projectRoot, {
        input: parseAgentHookInput(hookInput),
        now,
        ...hookOptions
      })))(root, raw, dependencies.now?.() ?? /* @__PURE__ */ new Date());
      if (Object.keys(decision.payload).length > 0) {
        output.log(JSON.stringify(decision.payload));
      }
      if (decision.blocked) output.error(decision.reason);
      return decision.exitCode;
    }
    if (command === "seal") {
      const action = args[1];
      const key = option(args, "--key");
      const signer = option(args, "--by");
      const out = option(args, "--out");
      const base = option(args, "--base");
      if (action === "keygen" && out !== void 0) {
        const path = await generateSealKey(root, out);
        output.log(
          `Seal key written: ${path}
Keep it where agents cannot read it, and commit .maru/seal.pub.`
        );
        return 0;
      }
      if (action === "create" && key !== void 0 && signer !== void 0) {
        const manifest = await createSeal(root, { keyPath: key, signer });
        output.log(
          `Seal ${String(manifest.sequence)} signed by ${manifest.signer}: ${String(Object.keys(manifest.files).length)} protected files.`
        );
        return 0;
      }
      if (action === "verify" && base !== void 0) {
        const issues = await verifySeal(root, base);
        output.log(issues.length === 0 ? "Seal: OK" : ["Seal: BROKEN", ...issues].join("\n"));
        return issues.length === 0 ? 0 : 1;
      }
      output.error(
        "Invalid seal command.\nRun maru seal keygen --out <path>, maru seal create --key <path> --by <owner>, or maru seal verify --base <ref>."
      );
      return 1;
    }
    if (command === "mcp") {
      await (dependencies.mcpServer ?? (async (projectRoot) => runStdioMcpServer({ root: projectRoot })))(root);
      return 0;
    }
  } catch (error) {
    if (error instanceof ContractError) {
      reportContractError(error, output);
      return 1;
    }
    if (error instanceof ProjectError) {
      reportProjectError(error, output);
      return 1;
    }
    if (error instanceof GitAnalysisError) {
      reportGitError(error, output);
      return 1;
    }
    if (error instanceof GitBaseError || error instanceof SealBrokenError || error instanceof SealError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof VerificationPlanError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof VerificationExecutionError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof EvidenceReportError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof DriftError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof MemoryError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof MutationVerificationError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof ChallengeError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof AgentError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof CiError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    if (error instanceof HostedUploadError) {
      output.error(`${error.code}
${error.message}
Fix: ${error.remediation}`);
      return 1;
    }
    output.error(
      "UNEXPECTED_ERROR\nOperation: run CLI command\nThe command failed unexpectedly.\nFix: Run maru doctor, then retry with a readable project directory."
    );
    return 1;
  }
  output.error(`Unknown command: ${command}
Run maru --help for usage.`);
  return 1;
}

// packages/cli/src/index.ts
void runCli(process.argv.slice(2), console).then((exitCode) => {
  process.exitCode = exitCode;
});
