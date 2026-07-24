/**
 * Approval catalog divergence test
 *
 * Verifies that every token used in template approvalDefaults strings and
 * the nodeRegistry approvalGate multiselect options is a member of
 * APPROVAL_CATALOG — the single source of truth.
 *
 * Run with:  node --import tsx/esm scripts/test-approval-catalog.mjs
 * (requires: npm install -D tsx)
 *
 * This test would have caught the original bug in issue #9 where
 * 'transfer call' appeared in template defaults but not in the wizard UI.
 */

import { APPROVAL_CATALOG } from '../src/features/agent-builder/data/approvalCatalog.ts'
import { AGENT_TEMPLATES } from '../src/features/product/data/agentTemplates.ts'
import { NODE_REGISTRY } from '../src/features/agent-builder/data/nodeRegistry.ts'

let passed = 0
let failed = 0

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ ${message}`)
    passed++
  } else {
    console.error(`  ❌ ${message}`)
    failed++
  }
}

console.log('\n── Approval catalog divergence test ──\n')

// 1. Every token in every template's approvalDefaults must be in APPROVAL_CATALOG
console.log('1. Template approvalDefaults vs. APPROVAL_CATALOG')
for (const template of AGENT_TEMPLATES) {
  if (!template.approvalDefaults) continue
  const actions = template.approvalDefaults.split(',').map((s) => s.trim()).filter(Boolean)
  for (const action of actions) {
    assert(
      APPROVAL_CATALOG.includes(action),
      `Template "${template.id}": "${action}" is in APPROVAL_CATALOG`,
    )
  }
}

// 2. The nodeRegistry multiselect options must exactly match APPROVAL_CATALOG (order-independent)
console.log('\n2. nodeRegistry approvalGate multiselect options vs. APPROVAL_CATALOG')
const registryOptions = NODE_REGISTRY.approvalGate.fields[0].options.map((o) => o.value)
const catalogSet = new Set(APPROVAL_CATALOG)
const registrySet = new Set(registryOptions)

for (const action of APPROVAL_CATALOG) {
  assert(registrySet.has(action), `APPROVAL_CATALOG entry "${action}" is in registry options`)
}
for (const option of registryOptions) {
  assert(catalogSet.has(option), `Registry option "${option}" is in APPROVAL_CATALOG`)
}

// 3. The nodeRegistry default config must only contain catalog entries
console.log('\n3. nodeRegistry approvalGate default config vs. APPROVAL_CATALOG')
const defaultConfig = NODE_REGISTRY.approvalGate.config.approvalActions
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)
for (const action of defaultConfig) {
  assert(catalogSet.has(action), `Default config entry "${action}" is in APPROVAL_CATALOG`)
}

// Summary
console.log(`\n── ${passed} passed · ${failed} failed ──\n`)
if (failed > 0) process.exit(1)
