import matplotlib.pyplot as plt
import matplotlib.patches as patches
import os

os.makedirs('diagrams', exist_ok=True)
plt.rcParams['font.sans-serif'] = 'Arial'
plt.rcParams['font.family'] = 'sans-serif'

# 1. Figure 3.3: UML Class Diagram
def create_class_diagram():
    fig, ax = plt.subplots(figsize=(10, 7.5), dpi=200)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 10)
    ax.axis('off')

    # Classes: (name, [(attributes), (methods)], x, y, width, height, color)
    classes = [
        ("VerifiableCredential", 
         ["- id: string", "- type: string[]", "- issuer: IssuerMetadata", "- issuanceDate: string", "- credentialSubject: Subject", "- proof: ProofObject"],
         ["+ generateDigest(): string", "+ serializeCanonical(): string", "+ isExpired(): boolean"],
         0.5, 5.8, 3.4, 3.8, "#eff6ff"),
        
        ("VerifiablePresentation",
         ["- id: string", "- type: string[]", "- verifiableCredential: VC[]", "- holder: string", "- proof: ProofObject"],
         ["+ discloseSelectiveClaims(): Map", "+ createProof(nonce): Proof", "+ verifyHolderBinding(): bool"],
         4.4, 5.8, 3.4, 3.8, "#f0fdf4"),

        ("CryptoEngine",
         ["- ALGORITHM: string = 'Ed25519'", "- HASH_ALG: string = 'SHA-256'"],
         ["+ generateKeyPair(): KeyPair", "+ sign(data, privKey): string", "+ verify(data, sig, pubKey): bool", "+ computeSaltedHash(k,v,s): string", "+ computeRootDigest(hashes): string"],
         8.3, 5.8, 3.4, 3.8, "#fefce8"),

        ("UniversityDIDRegistry (Smart Contract)",
         ["- _issuerRegistry: mapping(address => Issuer)", "- _credentialRoots: mapping(bytes32 => bool)", "- _revocationRegistry: mapping(bytes32 => RevocationEntry)"],
         ["+ registerIssuer(did, name): void", "+ anchorRoot(rootHash, metadata): void", "+ revokeCredential(rootHash, reason): void", "+ verifyCredentialStatus(rootHash): (bool, uint8)"],
         1.5, 0.8, 4.4, 4.2, "#faf5ff"),

        ("VerificationPipeline",
         ["- stages: IVerificationStage[]", "- registryContract: Contract"],
         ["+ executePipeline(vp, options): VerificationResult", "+ stage1_FormatSchema(vc): bool", "+ stage2_IssuerAnchor(vc): bool", "+ stage3_SignatureValidity(vc): bool", "+ stage4_RevocationCheck(vc): bool", "+ stage5_HolderBinding(vp): bool", "+ stage6_ClaimCommitment(vp): bool"],
         6.4, 0.8, 4.8, 4.2, "#fff7ed")
    ]

    for name, attrs, methods, x, y, w, h, bg in classes:
        # Outer box
        rect = patches.FancyBboxPatch((x, y), w, h, boxstyle="round,pad=0.04", facecolor=bg, edgecolor="#1e293b", lw=1.2)
        ax.add_patch(rect)
        # Class title box
        tbox = patches.Rectangle((x, y + h - 0.7), w, 0.7, facecolor="#1e293b")
        ax.add_patch(tbox)
        ax.text(x + w/2, y + h - 0.35, name, ha='center', va='center', fontsize=9, fontweight='bold', color="white")
        
        # Attributes
        curr_y = y + h - 0.95
        for attr in attrs:
            ax.text(x + 0.15, curr_y, attr, va='center', fontsize=7.2, color="#0f172a", fontfamily='monospace')
            curr_y -= 0.32
        
        # Separator line
        ax.plot([x, x + w], [curr_y + 0.1, curr_y + 0.1], color="#94a3b8", lw=0.8)
        curr_y -= 0.15

        # Methods
        for m in methods:
            ax.text(x + 0.15, curr_y, m, va='center', fontsize=7.0, color="#1e3a8a", fontfamily='monospace')
            curr_y -= 0.32

    # Relationship connectors
    ax.annotate("", xy=(3.9, 7.7), xytext=(4.4, 7.7), arrowprops=dict(arrowstyle="<|-", lw=1.5, color="#334155"))
    ax.text(4.15, 7.9, "1..*", ha='center', fontsize=8, fontweight='bold')
    
    ax.annotate("", xy=(6.1, 5.8), xytext=(3.7, 5.0), arrowprops=dict(arrowstyle="->", lw=1.2, ls="--", color="#64748b"))
    ax.annotate("", xy=(6.4, 2.9), xytext=(5.9, 2.9), arrowprops=dict(arrowstyle="<|-", lw=1.5, color="#334155"))
    ax.text(6.15, 3.1, "queries", ha='center', fontsize=7.5, color="#64748b")

    plt.title("Figure 3.3: UML Class Diagram of Decentralized Identity Core Architecture", fontsize=11, fontweight='bold', pad=12)
    plt.savefig('diagrams/fig3_class_diagram.png', bbox_inches='tight', facecolor='white')
    plt.close()
    print("Saved fig3_class_diagram.png")

# 2. Figure 3.6: Data Flow Diagram (DFD Level 1)
def create_dfd_diagram():
    fig, ax = plt.subplots(figsize=(9.5, 6), dpi=200)
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis('off')

    # External Entities
    entities = [
        ("Student (Holder)", 0.6, 5.0, 2.2, 1.2, "#dcfce7"),
        ("University Admin", 0.6, 1.8, 2.2, 1.2, "#dbeafe"),
        ("Third-Party Verifier", 9.2, 3.4, 2.2, 1.2, "#ffedd5")
    ]
    for name, x, y, w, h, bg in entities:
        bx = patches.Rectangle((x, y), w, h, facecolor=bg, edgecolor="#1e293b", lw=1.5)
        ax.add_patch(bx)
        ax.text(x + w/2, y + h/2, name, ha='center', va='center', fontsize=8.5, fontweight='bold', color="#0f172a")

    # Processes
    processes = [
        ("1.0\nGenerate DID\n& Keypair", 3.8, 5.0, 1.8, "#f1f5f9"),
        ("2.0\nIssue & Sign\nCredential", 3.8, 1.8, 1.8, "#f1f5f9"),
        ("3.0\nAnchor Root &\nRevocation", 6.8, 1.8, 1.8, "#f1f5f9"),
        ("4.0\nSelective\nPresentation", 6.8, 5.0, 1.8, "#f1f5f9"),
        ("5.0\nFail-Closed\nVerification", 9.2, 5.0, 1.8, "#f1f5f9")
    ]
    for label, cx, cy, r, bg in processes:
        circle = patches.Circle((cx, cy), r/2, facecolor=bg, edgecolor="#0f172a", lw=1.4)
        ax.add_patch(circle)
        ax.text(cx, cy, label, ha='center', va='center', fontsize=7.5, fontweight='bold', color="#0f172a")

    # Data Store
    ds_x, ds_y, ds_w, ds_h = 5.0, 0.2, 3.2, 0.8
    ax.plot([ds_x, ds_x + ds_w], [ds_y + ds_h, ds_y + ds_h], color="#1e293b", lw=1.5)
    ax.plot([ds_x, ds_x + ds_w], [ds_y, ds_y], color="#1e293b", lw=1.5)
    ax.text(ds_x + ds_w/2, ds_y + ds_h/2, "D1: Sepolia Smart Contract Registry", ha='center', va='center', fontsize=8, fontweight='bold', color="#1e293b")

    # Data flows (arrows)
    flows = [
        ((2.8, 5.6), (3.0, 5.6), "Ed25519 PubKey"),
        ((2.8, 2.4), (3.0, 2.4), "Student Data & Claims"),
        ((4.6, 2.4), (6.0, 2.4), "Digest & Roots"),
        ((6.8, 1.0), (6.8, 1.8), "Anchor Tx"),
        ((4.6, 5.6), (6.0, 5.6), "Salted VP"),
        ((6.8, 5.8), (9.2, 5.8), "Disclosed Claims + VP"),
        ((9.2, 4.6), (9.2, 4.0), "Verification Result"),
        ((6.8, 2.6), (6.8, 4.2), "Status Lookup")
    ]
    for (x1, y1), (x2, y2), lbl in flows:
        ax.annotate("", xy=(x2, y2), xytext=(x1, y1), arrowprops=dict(arrowstyle="->", lw=1.2, color="#2563eb"))
        ax.text((x1+x2)/2, (y1+y2)/2 + 0.15, lbl, ha='center', va='bottom', fontsize=7, color="#1e293b", fontweight='semibold')

    plt.title("Figure 3.6: Level-1 Data Flow Diagram (DFD) for Credential Lifecycle", fontsize=11, fontweight='bold', pad=12)
    plt.savefig('diagrams/fig8_dfd_level1.png', bbox_inches='tight', facecolor='white')
    plt.close()
    print("Saved fig8_dfd_level1.png")

if __name__ == '__main__':
    create_class_diagram()
    create_dfd_diagram()
