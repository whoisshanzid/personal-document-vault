const path = require("path");
const fs = require("fs");
require("dotenv").config();

const { ethers } = require("ethers");

async function main() {
  const rpcUrl = process.env.SEPOLIA_RPC_URL;
  const privateKey = process.env.PRIVATE_KEY;

  if (!rpcUrl) {
    throw new Error("SEPOLIA_RPC_URL is not set in document-vault-contracts/.env");
  }
  if (!privateKey) {
    throw new Error(
      "PRIVATE_KEY is not set in document-vault-contracts/.env (testnet-only key)."
    );
  }

  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "documentVault.sol",
    "DocumentVault.json"
  );
  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Compiled artifact not found. Run `npx hardhat compile` first."
    );
  }
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const pk = privateKey.startsWith("0x") ? privateKey : `0x${privateKey}`;
  const wallet = new ethers.Wallet(pk, provider);

  console.log("Deploying from:", wallet.address);
  const balance = await provider.getBalance(wallet.address);
  console.log("Balance:", ethers.formatEther(balance), "ETH");
  if (balance === 0n) {
    throw new Error(
      "Deployer has no Sepolia ETH. Get some from https://sepoliafaucet.com first."
    );
  }

  const factory = new ethers.ContractFactory(
    artifact.abi,
    artifact.bytecode,
    wallet
  );
  const contract = await factory.deploy();
  const tx = contract.deploymentTransaction();
  console.log("Deploy tx:", tx.hash);

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  const receipt = await tx.wait();

  console.log("\nDocumentVault deployed successfully.");
  console.log("Address:", address);
  console.log("Block:  ", receipt.blockNumber);
  console.log("\nAdd these to the app's .env.local:");
  console.log(`NEXT_PUBLIC_CONTRACT_ADDRESS=${address}`);
  console.log(`NEXT_PUBLIC_CONTRACT_DEPLOY_BLOCK=${receipt.blockNumber}`);
}

main().catch((err) => {
  console.error("\nDeployment failed:");
  console.error(err.message || err);
  process.exitCode = 1;
});
