// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title DocumentVault
 * @notice Stores document ownership and access permissions on-chain.
 *         Actual files live on IPFS; this contract only stores CIDs and ACL.
 */
contract DocumentVault {
    struct Document {
        uint256 id;
        string cid;              // IPFS CID
        string title;
        address owner;
        uint256 uploadedAt;
        bool exists;
    }

    uint256 public nextDocumentId = 1;

    // documentId => Document
    mapping(uint256 => Document) private documents;

    // owner => list of document IDs
    mapping(address => uint256[]) private ownedDocuments;

    // documentId => (wallet => hasAccess)
    mapping(uint256 => mapping(address => bool)) private accessList;

    // wallet => list of document IDs shared WITH them
    mapping(address => uint256[]) private sharedWithMe;

    // -------------------- Events --------------------
    event DocumentRegistered(
        uint256 indexed documentId,
        address indexed owner,
        string cid,
        string title
    );

    event AccessGranted(
        uint256 indexed documentId,
        address indexed owner,
        address indexed grantee
    );

    event AccessRevoked(
        uint256 indexed documentId,
        address indexed owner,
        address indexed grantee
    );

    // -------------------- Modifiers --------------------
    modifier onlyOwner(uint256 documentId) {
        require(documents[documentId].exists, "Document does not exist");
        require(
            documents[documentId].owner == msg.sender,
            "Not the document owner"
        );
        _;
    }

    // -------------------- Core Functions --------------------

    /**
     * @notice Register a new document owned by msg.sender.
     * @param cid   IPFS CID of the uploaded file
     * @param title Document title
     * @return documentId Newly created document ID
     */
    function registerDocument(string calldata cid, string calldata title)
        external
        returns (uint256 documentId)
    {
        require(bytes(cid).length > 0, "CID required");
        require(bytes(title).length > 0, "Title required");

        documentId = nextDocumentId++;

        documents[documentId] = Document({
            id: documentId,
            cid: cid,
            title: title,
            owner: msg.sender,
            uploadedAt: block.timestamp,
            exists: true
        });

        ownedDocuments[msg.sender].push(documentId);

        emit DocumentRegistered(documentId, msg.sender, cid, title);
    }

    /**
     * @notice Grant access to a document for another wallet.
     */
    function grantAccess(uint256 documentId, address grantee)
        external
        onlyOwner(documentId)
    {
        require(grantee != address(0), "Invalid address");
        require(grantee != msg.sender, "Cannot grant to self");
        require(
            !accessList[documentId][grantee],
            "Access already granted"
        );

        accessList[documentId][grantee] = true;
        sharedWithMe[grantee].push(documentId);

        emit AccessGranted(documentId, msg.sender, grantee);
    }

    /**
     * @notice Revoke previously granted access.
     */
    function revokeAccess(uint256 documentId, address grantee)
        external
        onlyOwner(documentId)
    {
        require(accessList[documentId][grantee], "No access to revoke");

        accessList[documentId][grantee] = false;

        // Remove from sharedWithMe array
        uint256[] storage list = sharedWithMe[grantee];
        for (uint256 i = 0; i < list.length; i++) {
            if (list[i] == documentId) {
                list[i] = list[list.length - 1];
                list.pop();
                break;
            }
        }

        emit AccessRevoked(documentId, msg.sender, grantee);
    }

    // -------------------- View Functions --------------------

    /**
     * @notice Check if a wallet has access to a document.
     *         Owner always has access.
     */
    function checkAccess(uint256 documentId, address wallet)
        public
        view
        returns (bool)
    {
        if (!documents[documentId].exists) return false;
        if (documents[documentId].owner == wallet) return true;
        return accessList[documentId][wallet];
    }

    function getDocument(uint256 documentId)
        external
        view
        returns (Document memory)
    {
        require(documents[documentId].exists, "Document does not exist");
        return documents[documentId];
    }

    function getMyDocuments() external view returns (uint256[] memory) {
        return ownedDocuments[msg.sender];
    }

    function getDocumentsSharedWithMe()
        external
        view
        returns (uint256[] memory)
    {
        return sharedWithMe[msg.sender];
    }

    function getDocumentCount(address owner)
        external
        view
        returns (uint256)
    {
        return ownedDocuments[owner].length;
    }

    function getSharedWithMeCount(address wallet)
        external
        view
        returns (uint256)
    {
        return sharedWithMe[wallet].length;
    }
}