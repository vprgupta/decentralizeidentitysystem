// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title UniversityDIDRegistry
 * @notice Privacy-Preserving Decentralized Identity (DID) & Credential Status Registry
 * @dev Implements SRS CS47001-DID-SRS-001 Section 3.3 (Strict On-Chain / Off-Chain Boundary)
 * and Functional Requirement FR-18.
 *
 * CRITICAL PRIVACY INVARIANT (NFR-04 / AC-12):
 * This smart contract NEVER accepts or stores student names, student ID numbers,
 * academic programs, raw credential payloads, or private keys. Only public verification
 * key hashes, authorized issuer status, and privacy-preserving credential status bitmaps
 * are anchored on-chain.
 */
contract UniversityDIDRegistry {
    address public governanceAdmin;

    struct DIDPublicAnchor {
        bytes32 publicKeyCommitment;
        uint64 updatedAt;
        bool active;
    }

    struct IssuerTrustRecord {
        bytes32 issuerPublicKeyHash;
        bool authorized;
        uint64 registeredAt;
    }

    enum OnChainCredentialStatus {
        UNREGISTERED,
        ACTIVE,
        REVOKED,
        SUSPENDED
    }

    // Mapping from controller Ethereum address -> public DID key anchor
    mapping(address => DIDPublicAnchor) private didAnchors;

    // Mapping from issuer Ethereum address -> trusted university issuer record
    mapping(address => IssuerTrustRecord) private trustedIssuers;

    // Mapping from credential status index -> privacy-preserving revocation status
    mapping(uint256 => OnChainCredentialStatus) private credentialStatusList;

    event DIDAnchored(address indexed controller, bytes32 publicKeyCommitment, uint64 timestamp);
    event IssuerAuthorizationChanged(address indexed issuer, bytes32 publicKeyHash, bool authorized);
    event CredentialStatusUpdated(
        uint256 indexed statusListIndex,
        address indexed issuer,
        OnChainCredentialStatus status,
        uint64 timestamp
    );

    modifier onlyAdmin() {
        require(msg.sender == governanceAdmin, "Only governance admin allowed");
        _;
    }

    modifier onlyAuthorizedIssuer() {
        require(trustedIssuers[msg.sender].authorized, "Caller is not an authorized university issuer");
        _;
    }

    constructor() {
        governanceAdmin = msg.sender;
    }

    /**
     * @notice Registers or rotates a holder's public verification key commitment (FR-04).
     * @param publicKeyCommitment SHA-256 hash of the holder's public verification key.
     */
    function registerDIDAnchor(bytes32 publicKeyCommitment) external {
        require(publicKeyCommitment != bytes32(0), "Invalid public key commitment");
        didAnchors[msg.sender] = DIDPublicAnchor({
            publicKeyCommitment: publicKeyCommitment,
            updatedAt: uint64(block.timestamp),
            active: true
        });
        emit DIDAnchored(msg.sender, publicKeyCommitment, uint64(block.timestamp));
    }

    /**
     * @notice Resolves a DID controller's public key commitment (FR-05).
     */
    function resolveDIDAnchor(address controller)
        external
        view
        returns (bytes32 publicKeyCommitment, uint64 updatedAt, bool active)
    {
        DIDPublicAnchor memory record = didAnchors[controller];
        return (record.publicKeyCommitment, record.updatedAt, record.active);
    }

    /**
     * @notice Registers or revokes a University Issuer on the trust list (FR-15).
     */
    function setTrustedIssuer(
        address issuerAddress,
        bytes32 issuerPublicKeyHash,
        bool authorized
    ) external onlyAdmin {
        trustedIssuers[issuerAddress] = IssuerTrustRecord({
            issuerPublicKeyHash: issuerPublicKeyHash,
            authorized: authorized,
            registeredAt: uint64(block.timestamp)
        });
        emit IssuerAuthorizationChanged(issuerAddress, issuerPublicKeyHash, authorized);
    }

    /**
     * @notice Checks if an issuer is trusted on-chain (FR-15).
     */
    function isTrustedIssuer(address issuerAddress)
        external
        view
        returns (bool authorized, bytes32 issuerPublicKeyHash)
    {
        IssuerTrustRecord memory rec = trustedIssuers[issuerAddress];
        return (rec.authorized, rec.issuerPublicKeyHash);
    }

    /**
     * @notice Anchors or updates the revocation status of a credential by its opaque index (FR-17, FR-24).
     * Zero personal data is passed to or emitted by this function (NFR-04).
     */
    function setCredentialStatus(
        uint256 statusListIndex,
        OnChainCredentialStatus newStatus
    ) external onlyAuthorizedIssuer {
        require(newStatus != OnChainCredentialStatus.UNREGISTERED, "Invalid target status");
        credentialStatusList[statusListIndex] = newStatus;
        emit CredentialStatusUpdated(
            statusListIndex,
            msg.sender,
            newStatus,
            uint64(block.timestamp)
        );
    }

    /**
     * @notice Queries the current status of a credential index (FR-17).
     */
    function getCredentialStatus(uint256 statusListIndex)
        external
        view
        returns (OnChainCredentialStatus)
    {
        return credentialStatusList[statusListIndex];
    }
}
