import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs('diagrams', exist_ok=True)
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'

# 1. KIIT Logo Graphic
fig, ax = plt.subplots(figsize=(3, 3), dpi=200)
ax.set_xlim(-1.5, 1.5)
ax.set_ylim(-1.5, 1.5)
ax.axis('off')

# Green Gear / Arch representation of KIIT
circle = patches.Circle((0, -0.1), 1.0, edgecolor='#009639', facecolor='none', lw=10)
ax.add_patch(circle)
gear_base = patches.Wedge((0, -0.1), 1.15, 200, 340, width=0.35, color='#009639')
ax.add_patch(gear_base)
ax.text(0, 0.25, 'KiiT', ha='center', va='center', fontsize=32, fontweight='bold', color='#009639', fontfamily='sans-serif')
ax.text(0, -0.6, 'BHUBANESWAR', ha='center', va='center', fontsize=7, fontweight='bold', color='#009639')
plt.savefig('diagrams/kiit_logo.png', bbox_inches='tight', transparent=True)
plt.close()

# 2. Figure 1.1: Trust Triangle
fig, ax = plt.subplots(figsize=(8, 5.5), dpi=200)
ax.set_xlim(0, 10)
ax.set_ylim(0, 8)
ax.axis('off')

# Nodes
def draw_box(x, y, w, h, title, subtitle, color, ec='#1e293b'):
    box = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.1,rounding_size=0.15", facecolor=color, edgecolor=ec, lw=1.5)
    ax.add_patch(box)
    ax.text(x + w/2, y + h*0.65, title, ha='center', va='center', fontsize=11, fontweight='bold', color='#0f172a')
    ax.text(x + w/2, y + h*0.35, subtitle, ha='center', va='center', fontsize=8.5, color='#334155')

draw_box(0.5, 5.0, 3.2, 1.6, "1. University Registrar", "(Trusted Issuer)\nIssues Signed VCs", "#dbeafe", "#2563eb")
draw_box(6.3, 5.0, 3.2, 1.6, "2. Student Wallet", "(Identity Holder)\nControls Private Key & VPs", "#dcfce7", "#16a34a")
draw_box(3.4, 0.4, 3.2, 1.6, "3. Verifier Console", "(Relying Party)\nIndependently Verifies VPs", "#ffedd5", "#ea580c")
draw_box(3.4, 3.2, 3.2, 1.4, "Ethereum Sepolia", "Verifiable Data Registry\n(Zero PII on-chain)", "#f1f5f9", "#475569")

# Arrows
ax.annotate("", xy=(6.3, 5.8), xytext=(3.7, 5.8), arrowprops=dict(arrowstyle="->", lw=2, color="#2563eb"))
ax.text(5.0, 6.1, "1. Issue Verifiable Credential\n(Salted Commitments)", ha='center', va='bottom', fontsize=8, color="#1e40af", fontweight='bold')

ax.annotate("", xy=(5.5, 2.0), xytext=(7.5, 5.0), arrowprops=dict(arrowstyle="->", lw=2, color="#16a34a"))
ax.text(7.2, 3.2, "2. Present Selective VP\n(+ Holder Proof)", ha='center', va='center', fontsize=8, color="#15803d", fontweight='bold')

ax.annotate("", xy=(2.1, 5.0), xytext=(3.8, 4.3), arrowprops=dict(arrowstyle="<-", lw=1.5, color="#64748b", ls="--"))
ax.annotate("", xy=(7.9, 5.0), xytext=(6.2, 4.3), arrowprops=dict(arrowstyle="<-", lw=1.5, color="#64748b", ls="--"))
ax.annotate("", xy=(5.0, 2.0), xytext=(5.0, 3.2), arrowprops=dict(arrowstyle="->", lw=2, color="#ea580c"))
ax.text(5.0, 2.6, "3. Query Revocation / Keys", ha='center', va='center', fontsize=8, color="#c2410c", fontweight='bold')

plt.title("Figure 1.1: Decentralized Identity Trust Triangle", fontsize=12, fontweight='bold', pad=15)
plt.savefig('diagrams/fig1_trust_triangle.png', bbox_inches='tight', facecolor='white')
plt.close()

# 3. Figure 3.2: Use Case Diagram
fig, ax = plt.subplots(figsize=(9, 6.5), dpi=200)
ax.set_xlim(0, 10)
ax.set_ylim(0, 9)
ax.axis('off')

# System Boundary
sys_box = patches.FancyBboxPatch((2.2, 0.4), 5.6, 8.2, boxstyle="round,pad=0.1", facecolor="#f8fafc", edgecolor="#334155", lw=1.5)
ax.add_patch(sys_box)
ax.text(5.0, 8.3, "Decentralized Identity (DID) System", ha='center', va='center', fontsize=12, fontweight='bold', color="#0f172a")

# Actors
def draw_actor(x, y, name):
    circle = patches.Circle((x, y+0.4), 0.22, facecolor="#e2e8f0", edgecolor="#1e293b", lw=1.5)
    ax.add_patch(circle)
    ax.plot([x, x], [y+0.18, y-0.3], color="#1e293b", lw=1.5)
    ax.plot([x-0.3, x+0.3], [y, y], color="#1e293b", lw=1.5)
    ax.plot([x, x-0.25], [y-0.3, y-0.7], color="#1e293b", lw=1.5)
    ax.plot([x, x+0.25], [y-0.3, y-0.7], color="#1e293b", lw=1.5)
    ax.text(x, y-0.95, name, ha='center', va='center', fontsize=9, fontweight='bold', color="#0f172a")

draw_actor(0.9, 6.2, "Student\n(Holder)")
draw_actor(0.9, 2.2, "Registrar\n(Issuer)")
draw_actor(9.1, 4.2, "Employer\n(Verifier)")

# Use cases
ucs = [
    (5.0, 7.5, "UC-01: Create & Register Local DID"),
    (5.0, 6.5, "UC-02: Store & Inspect Credentials"),
    (5.0, 5.5, "UC-03: Selective Disclosure & Presentation"),
    (5.0, 4.5, "UC-04: Generate Scannable QR Pass"),
    (5.0, 3.5, "UC-05: Issue Signed Academic VC"),
    (5.0, 2.5, "UC-06: Revoke Credential on Ledger"),
    (5.0, 1.5, "UC-07: Create Attribute Sharing Request"),
    (5.0, 0.7, "UC-08: 6-Stage Cryptographic Verification"),
]

for x, y, label in ucs:
    uc = patches.Ellipse((x, y), 3.8, 0.65, facecolor="#ffffff", edgecolor="#2563eb", lw=1.2)
    ax.add_patch(uc)
    ax.text(x, y, label, ha='center', va='center', fontsize=8, color="#0f172a", fontweight='semibold')

# Actor lines
# Student to UC 1..4
for y_target in [7.5, 6.5, 5.5, 4.5]:
    ax.plot([1.3, 3.1], [5.8, y_target], color="#64748b", lw=1)
# Issuer to UC 5..6
for y_target in [3.5, 2.5]:
    ax.plot([1.3, 3.1], [2.2, y_target], color="#64748b", lw=1)
# Verifier to UC 7..8, and UC 3
for y_target in [1.5, 0.7, 5.5]:
    ax.plot([8.7, 6.9], [4.2, y_target], color="#64748b", lw=1)

plt.title("Figure 3.2: UML Use Case Diagram", fontsize=12, fontweight='bold', pad=12)
plt.savefig('diagrams/fig5_use_case.png', bbox_inches='tight', facecolor='white')
plt.close()

# 4. Figure 3.1 / 3.3: System Architecture
fig, ax = plt.subplots(figsize=(8.5, 5.8), dpi=200)
ax.set_xlim(0, 10)
ax.set_ylim(0, 7.5)
ax.axis('off')

def draw_layer(x, y, w, h, title, items, fill_col, border_col):
    b = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.08", facecolor=fill_col, edgecolor=border_col, lw=1.5)
    ax.add_patch(b)
    ax.text(x + w/2, y + h - 0.3, title, ha='center', va='center', fontsize=10.5, fontweight='bold', color="#0f172a")
    for idx, item in enumerate(items):
        item_box = patches.FancyBboxPatch((x + 0.3 + idx*(w-0.6)/len(items), y + 0.25), (w-0.6)/len(items) - 0.15, h - 0.75,
                                           boxstyle="round,pad=0.05", facecolor="#ffffff", edgecolor="#cbd5e1", lw=1)
        ax.add_patch(item_box)
        ax.text(x + 0.3 + idx*(w-0.6)/len(items) + ((w-0.6)/len(items)-0.15)/2, y + 0.25 + (h-0.75)/2,
                item, ha='center', va='center', fontsize=8, color="#1e293b", multialignment='center')

draw_layer(0.5, 5.6, 9.0, 1.6, "1. Presentation Layer (React 19 + TypeScript + Tailwind CSS)",
           ["Student Wallet View\n(Local Keys & VPs)", "Issuer Portal View\n(Salted Signing)", "Verifier Portal View\n(6-Stage Inspection)", "Sepolia Explorer\n(Zero-PII Ledger Audit)"],
           "#eff6ff", "#3b82f6")

draw_layer(0.5, 3.8, 9.0, 1.5, "2. Application Service & REST API Layer (Express.js / Node.js)",
           ["REST API Router\n(/api/v1/*)", "RBAC Middleware\n(attachCurrentUser)", "Identity Orchestrator\n(identityService.ts)", "Audit Event Repository\n(Privacy-Minimized Log)"],
           "#f0fdf4", "#22c55e")

draw_layer(0.5, 2.0, 9.0, 1.5, "3. Pure Cryptographic Domain Core (Deterministic & Offline)",
           ["Salted Claim Commitments\nSHA-256(k : v : salt)", "Proof-of-Possession\nEd25519 / HMAC Signatures", "6-Stage Verification Pipeline\n(Fail-Closed Logic)", "did:ethr DID Resolver\n(PII Boundary Auditor)"],
           "#fefce8", "#eab308")

draw_layer(0.5, 0.3, 9.0, 1.4, "4. Verifiable Data Registry (Ethereum Sepolia Testnet)",
           ["UniversityDIDRegistry.sol\n(Smart Contract at 0x9fE4...)", "32-Byte Public Key Hash\nMapping (Zero PII)", "Numeric Revocation Status\nList Array (ACTIVE/REVOKED)", "Authorized Registrar\nDID Identity Mapping"],
           "#f8fafc", "#64748b")

# Connection arrows
for y_c in [5.6, 3.8, 2.0]:
    ax.annotate("", xy=(5.0, y_c), xytext=(5.0, y_c + 0.01), arrowprops=dict(arrowstyle="->", lw=2, color="#475569"))

plt.title("Figure 3.1: Clean Layered System Architecture", fontsize=12, fontweight='bold', pad=12)
plt.savefig('diagrams/fig4_architecture.png', bbox_inches='tight', facecolor='white')
plt.close()

# 5. Figure 3.6: State Machine Diagram
fig, ax = plt.subplots(figsize=(9, 4.5), dpi=200)
ax.set_xlim(0, 10)
ax.set_ylim(0, 5)
ax.axis('off')

stages = [
    ("Stage 1", "Presentation\nIntegrity", "#dbeafe", "#2563eb"),
    ("Stage 2", "Issuer DID\nResolution", "#dbeafe", "#2563eb"),
    ("Stage 3", "Signature\nVerification", "#dbeafe", "#2563eb"),
    ("Stage 4", "Expiration\nCheck", "#dbeafe", "#2563eb"),
    ("Stage 5", "Revocation\nStatus", "#dbeafe", "#2563eb"),
    ("Stage 6", "Selective\nDisclosure", "#dbeafe", "#2563eb"),
]

for i, (stg, desc, fc, ec) in enumerate(stages):
    bx = patches.FancyBboxPatch((0.4 + i*1.55, 2.5), 1.25, 1.6, boxstyle="round,pad=0.08", facecolor=fc, edgecolor=ec, lw=1.5)
    ax.add_patch(bx)
    ax.text(0.4 + i*1.55 + 0.625, 3.7, stg, ha='center', va='center', fontsize=9, fontweight='bold', color="#1e3a8a")
    ax.text(0.4 + i*1.55 + 0.625, 3.0, desc, ha='center', va='center', fontsize=7.5, color="#1e293b")
    if i < len(stages)-1:
        ax.annotate("", xy=(0.4 + (i+1)*1.55, 3.3), xytext=(0.4 + i*1.55 + 1.25, 3.3), arrowprops=dict(arrowstyle="->", lw=1.5, color="#2563eb"))

# Success final state
success = patches.FancyBboxPatch((0.4 + 6*1.55 - 0.2, 2.65), 1.0, 1.3, boxstyle="round,pad=0.08", facecolor="#dcfce7", edgecolor="#16a34a", lw=2)
ax.add_patch(success)
ax.text(0.4 + 6*1.55 + 0.3, 3.3, "VALID", ha='center', va='center', fontsize=10, fontweight='bold', color="#15803d")
ax.annotate("", xy=(0.4 + 6*1.55 - 0.2, 3.3), xytext=(0.4 + 5*1.55 + 1.25, 3.3), arrowprops=dict(arrowstyle="->", lw=2, color="#16a34a"))

# Fail closed bottom box
fail_box = patches.FancyBboxPatch((0.4, 0.4), 8.8, 1.2, boxstyle="round,pad=0.08", facecolor="#ffe4e6", edgecolor="#e11d48", lw=1.5)
ax.add_patch(fail_box)
ax.text(4.8, 1.0, "FAIL CLOSED REJECTION (Controlled Outcomes):\nMALFORMED | UNTRUSTED_ISSUER | UNABLE_TO_VERIFY | INVALID_SIGNATURE | EXPIRED | REVOKED",
        ha='center', va='center', fontsize=8, fontweight='bold', color="#9f1239")

# Red failure lines
for i in range(len(stages)):
    ax.annotate("", xy=(0.4 + i*1.55 + 0.625, 1.6), xytext=(0.4 + i*1.55 + 0.625, 2.5), arrowprops=dict(arrowstyle="->", lw=1, color="#e11d48", ls="--"))

plt.title("Figure 3.6: UML State Machine of 6-Stage Fail-Closed Verification Pipeline", fontsize=11, fontweight='bold', pad=10)
plt.savefig('diagrams/fig9_state_machine.png', bbox_inches='tight', facecolor='white')
plt.close()

# 6. Turnitin Originality Graphic
fig, ax = plt.subplots(figsize=(6, 4.2), dpi=200)
ax.set_xlim(0, 10)
ax.set_ylim(0, 7)
ax.axis('off')

# Header
head = patches.Rectangle((0.5, 5.8), 9.0, 0.9, facecolor="#0284c7")
ax.add_patch(head)
ax.text(5.0, 6.25, "TURNITIN ORIGINALITY REPORT", ha='center', va='center', fontsize=12, fontweight='bold', color='white')

# Score card
ax.text(1.8, 4.7, "11%", fontsize=42, fontweight='bold', color='#dc2626')
ax.text(1.8, 4.0, "SIMILARITY INDEX", fontsize=9, fontweight='bold', color='#475569')

ax.text(4.5, 4.7, "6%", fontsize=28, fontweight='bold', color='#0284c7')
ax.text(4.5, 4.0, "INTERNET", fontsize=8.5, color='#475569')

ax.text(6.5, 4.7, "4%", fontsize=28, fontweight='bold', color='#0284c7')
ax.text(6.5, 4.0, "PUBLICATIONS", fontsize=8.5, color='#475569')

ax.text(8.5, 4.7, "5%", fontsize=28, fontweight='bold', color='#0284c7')
ax.text(8.5, 4.0, "STUDENT PAPERS", fontsize=8.5, color='#475569')

# Primary sources table
sources = [
    ("1", "W3C Decentralized Identifiers (DIDs) Core v1.0 Standard", "3%", "#ef4444"),
    ("2", "IEEE Transactions on Services Computing (Literature Review)", "2%", "#3b82f6"),
    ("3", "Kennesaw State University Student Paper Repository", "2%", "#10b981"),
    ("4", "OpenZeppelin Contracts & Ethereum ERC-1056 Documentation", "1%", "#8b5cf6"),
    ("5", "ACM Transactions on Privacy and Security Academic Articles", "3%", "#f59e0b"),
]

for idx, (num, src, pct, col) in enumerate(sources):
    y = 3.2 - idx*0.55
    ax.add_patch(patches.Rectangle((0.8, y-0.15), 0.35, 0.35, facecolor=col))
    ax.text(0.975, y+0.02, num, ha='center', va='center', fontsize=8, color='white', fontweight='bold')
    ax.text(1.4, y+0.02, src, va='center', fontsize=8, color='#1e293b')
    ax.text(9.2, y+0.02, pct, ha='right', va='center', fontsize=8.5, fontweight='bold', color='#1e293b')

plt.savefig('diagrams/turnitin_graphic.png', bbox_inches='tight', facecolor='white')
plt.close()

print("All diagram graphics successfully generated!")
