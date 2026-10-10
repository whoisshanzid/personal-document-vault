import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "wagmi";
import { sepolia } from "wagmi/chains";

const projectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "document-vault-dev";

const chainId = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? 11155111);

// Only Sepolia is supported by the deployed DocumentVault contract.
export const supportedChain = chainId === sepolia.id ? sepolia : sepolia;

// Use a custom RPC when provided (Alchemy/Infura); otherwise viem's public RPC.
const sepoliaRpcUrl = process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL;

export const wagmiConfig = getDefaultConfig({
  appName: "Personal Document Vault",
  projectId,
  chains: [supportedChain],
  transports: sepoliaRpcUrl
    ? { [supportedChain.id]: http(sepoliaRpcUrl) }
    : undefined,
  ssr: true,
});

export const contractChainId = supportedChain.id;
