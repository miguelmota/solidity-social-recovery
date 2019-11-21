pragma solidity ^0.5.2;

import './ECDSA.sol';
import './MerkleProof.sol';

contract Account {
  using ECDSA for *;
  using MerkleProof for *;

  bytes32 public recoveryRoot;
  address public owner;
  uint256 public sigsRequired;
  uint256 public seq;
  mapping (uint256 => address) sigs;

  event Log(address a);
  event LogHash(bytes32 a);

  modifier isOwner {
    require(msg.sender == owner, "Invalid sender");
    _;
  }

  constructor() public {
    owner = msg.sender;
    sigsRequired = 1;
  }

  function setOwner(address newOwner) external isOwner {
    owner = newOwner;
  }

  function setRecoveryRoot(bytes32 root) external isOwner {
    recoveryRoot = root;
  }

  function setSigsRequired(uint256 num) external isOwner {
    sigsRequired = num;
  }

  function recover(bytes32[] memory proof, bytes memory signature, address newOwner) public {
    bytes32 hash = keccak256(abi.encodePacked(newOwner));

    address recoveryKey = hash.toEthSignedMessageHash().recover(signature);
    bytes32 leaf = keccak256(abi.encodePacked(recoveryKey));
    require(proof.verify(recoveryRoot, leaf), "Invalid proof");
    sigs[seq] = newOwner;
    seq++;

    if (seq == sigsRequired) {
      address proposedOwner;
      for (uint8 i = 0; i < seq; i++) {
        if (i > 0 && proposedOwner != sigs[i]) {
          revert("Invalid new owner");
        }

        proposedOwner = sigs[i];
      }

      owner = newOwner;
    }
  }
}
