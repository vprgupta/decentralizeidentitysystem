import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs('diagrams', exist_ok=True)
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'

# 1. Figure 2.1: DID Document
fig, ax = plt.subplots(figsize=(7, 4.5), dpi=200)
ax.set_xlim(0, 10)
ax.set_ylim(0, 7)
ax.axis('off')

# Outer box
box = patches.FancyBboxPatch((0.8, 0.5), 8.4, 5.8, boxstyle="round,pad=0.1", facecolor="#f8fafc", edgecolor="#1e293b", lw=1.5)
ax.add_patch(box)
ax.text(5.0, 5.9, "W3C DID Document (did:ethr:sepolia:0x71C8...)", ha='center', va='center', fontsize=11, fontweight='bold', color="#0f172a")

fields = [
    ("@context", '["https://www.w3.org/ns/did/v1", "https://w3id.org/security/suites/ed25519-2020/v1"]', "#dbeafe"),
    ("id", '"did:ethr:sepolia:0x71C8F8d2F9940A0F482937583693D4468648352A"', "#dcfce7"),
    ("verificationMethod", '[{"id": "...#key-1", "type": "Ed25519VerificationKey2020", "controller": "did:ethr:...", "publicKeyMultibase": "z6Mku..."}]', "#fef3c7"),
    ("authentication", '["did:ethr:sepolia:0x71C8...#key-1"]', "#f3e8ff"),
    ("assertionMethod", '["did:ethr:sepolia:0x71C8...#key-1"]', "#fce7f3"),
]

for idx, (lbl, val, col) in enumerate(fields):
    y = 4.8 - idx*0.95
    f_box = patches.FancyBboxPatch((1.2, y-0.35), 7.6, 0.75, boxstyle="round,pad=0.05", facecolor=col, edgecolor="#94a3b8", lw=1)
    ax.add_patch(f_box)
    ax.text(1.4, y, f'"{lbl}":', va='center', fontsize=8.5, fontweight='bold', color="#0f172a")
    ax.text(3.4, y, val[:50] + "..." if len(val) > 50 else val, va='center', fontsize=7.5, color="#334155", fontfamily='monospace')

plt.title("Figure 2.1: Structure of W3C DID Document & Resolution Schema", fontsize=11, fontweight='bold', pad=10)
plt.savefig('diagrams/fig2_did_document.png', bbox_inches='tight', facecolor='white')
plt.close()

# 2. Figure 3.4: Sequence Diagram
fig, ax = plt.subplots(figsize=(8.5, 6), dpi=200)
ax.set_xlim(0, 10)
ax.set_ylim(0, 9)
ax.axis('off')

# Actors / lifelines
lifelines = [
    (1.5, "Student\n(Holder)", "#dcfce7"),
    (4.0, "University\nRegistrar", "#dbeafe"),
    (6.5, "Verifier\nConsole", "#ffedd5"),
    (9.0, "Ethereum\nSepolia", "#f1f5f9"),
]

for x, label, col in lifelines:
    bx = patches.FancyBboxPatch((x-0.8, 8.0), 1.6, 0.8, boxstyle="round,pad=0.05", facecolor=col, edgecolor="#334155", lw=1.2)
    ax.add_patch(bx)
    ax.text(x, 8.4, label, ha='center', va='center', fontsize=8.5, fontweight='bold', color="#0f172a")
    ax.plot([x, x], [0.8, 8.0], color="#94a3b8", lw=1, ls="--")

# Messages
msgs = [
    (1.5, 9.0, 7.3, "1. Anchor Public Key Hash", "#2563eb", "->"),
    (4.0, 1.5, 6.4, "2. Issue Signed VC (Salted)", "#16a34a", "->"),
    (4.0, 9.0, 5.5, "3. Anchor Revocation Index", "#475569", "->"),
    (6.5, 1.5, 4.6, "4. Presentation Request", "#ea580c", "->"),
    (1.5, 6.5, 3.7, "5. Present Selective VP + Proof", "#16a34a", "->"),
    (6.5, 9.0, 2.8, "6. Verify DID & Revocation", "#ea580c", "->"),
    (9.0, 6.5, 1.9, "7. Status Active (Index #1001)", "#2563eb", "-->"),
    (6.5, 6.5, 1.1, "8. VALID (All 6 Stages Pass)", "#15803d", "circle"),
]

for x1, x2, y, text, col, style in msgs:
    if style == "circle":
        ax.plot([x1, x1+0.4, x1+0.4, x1], [y+0.2, y+0.2, y-0.2, y-0.2], color=col, lw=1.5)
        ax.text(x1+0.6, y, text, va='center', fontsize=8, fontweight='bold', color=col)
    else:
        ls = "--" if style == "-->" else "-"
        ax.annotate("", xy=(x2, y), xytext=(x1, y), arrowprops=dict(arrowstyle="->", lw=1.5, color=col, ls=ls))
        ax.text((x1+x2)/2, y+0.15, text, ha='center', va='bottom', fontsize=7.5, fontweight='semibold', color="#1e293b")

plt.title("Figure 3.4: UML Sequence Diagram: Credential Issuance & Verification Lifecycle", fontsize=11, fontweight='bold', pad=10)
plt.savefig('diagrams/fig7_sequence.png', bbox_inches='tight', facecolor='white')
plt.close()

# 3. Figure 4.1: Salted Claim Commitment Flow
fig, ax = plt.subplots(figsize=(8.5, 4.8), dpi=200)
ax.set_xlim(0, 10)
ax.set_ylim(0, 6)
ax.axis('off')

# Claim items
claims = [
    ("studentName", "Bishal Gupta", "salt_1", "h1"),
    ("studentNumber", "23053694", "salt_2", "h2"),
    ("program", "B.Tech CSE", "salt_3", "h3"),
    ("enrollmentStatus", "Active", "salt_4", "h4"),
]

for idx, (k, v, s, h) in enumerate(claims):
    y = 5.0 - idx*1.15
    # Raw Claim Box
    b_c = patches.FancyBboxPatch((0.5, y-0.35), 2.8, 0.7, boxstyle="round,pad=0.05", facecolor="#eff6ff", edgecolor="#3b82f6", lw=1)
    ax.add_patch(b_c)
    ax.text(1.9, y, f'{k}: "{v}"', ha='center', va='center', fontsize=7.5, color="#1e3a8a", fontweight='bold')
    
    # Hash Box
    b_h = patches.FancyBboxPatch((4.2, y-0.35), 2.5, 0.7, boxstyle="round,pad=0.05", facecolor="#f0fdf4", edgecolor="#22c55e", lw=1)
    ax.add_patch(b_h)
    ax.text(5.45, y, f'{h} = SHA256({k}:{s})', ha='center', va='center', fontsize=7, color="#14532d", fontfamily='monospace')
    
    ax.annotate("", xy=(4.2, y), xytext=(3.3, y), arrowprops=dict(arrowstyle="->", lw=1.2, color="#64748b"))
    ax.annotate("", xy=(7.6, 2.8), xytext=(6.7, y), arrowprops=dict(arrowstyle="->", lw=1.2, color="#64748b"))

# Root Box
b_root = patches.FancyBboxPatch((7.6, 2.0), 2.1, 1.6, boxstyle="round,pad=0.08", facecolor="#fef3c7", edgecolor="#d97706", lw=1.5)
ax.add_patch(b_root)
ax.text(8.65, 3.1, "H_root", ha='center', va='center', fontsize=9.5, fontweight='bold', color="#92400e")
ax.text(8.65, 2.5, "SHA-256(h1..h4)\nRoot Commitment\n(Signed by Issuer)", ha='center', va='center', fontsize=7, color="#78350f")

plt.title("Figure 4.1: Cryptographic Salted Claim Commitment & Root Digest Derivation Flow", fontsize=11, fontweight='bold', pad=10)
plt.savefig('diagrams/fig10_salted_commitments.png', bbox_inches='tight', facecolor='white')
plt.close()

print("Secondary diagrams successfully generated!")
