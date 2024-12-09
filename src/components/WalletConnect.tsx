import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Wallet } from "lucide-react";
import { createPublicClient, http, createWalletClient, custom, getContract } from "viem";
import { gnosis } from "viem/chains";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const NFT_CONTRACT_ADDRESS = "0x1095f7D414A14Deaa4e89c458eeA837c5DB50E6E";
const NFT_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
] as const;

const WalletConnect = ({ onOwnershipVerified }: { onOwnershipVerified: (verified: boolean) => void }) => {
  const [address, setAddress] = useState<string>("");
  const [hasNFT, setHasNFT] = useState(false);
  const { toast } = useToast();

  const publicClient = createPublicClient({
    chain: gnosis,
    transport: http()
  });

  const connectWallet = async () => {
    try {
      if (!window.ethereum) {
        toast({
          title: "MetaMask Required",
          description: "Please install MetaMask to use this application",
          variant: "destructive",
        });
        return;
      }

      const [userAddress] = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      const client = createWalletClient({
        chain: gnosis,
        transport: custom(window.ethereum)
      });

      setAddress(userAddress);

      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x64' }],
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x64',
              chainName: 'Gnosis Chain',
              nativeCurrency: {
                name: 'xDAI',
                symbol: 'xDAI',
                decimals: 18
              },
              rpcUrls: ['https://rpc.gnosischain.com'],
              blockExplorerUrls: ['https://gnosisscan.io']
            }]
          });
        }
      }

      const contract = getContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        publicClient
      });

      const balance = await publicClient.readContract({
        address: NFT_CONTRACT_ADDRESS,
        abi: NFT_ABI,
        functionName: 'balanceOf',
        args: [userAddress]
      });

      const ownsNFT = Number(balance) > 0;
      setHasNFT(ownsNFT);
      onOwnershipVerified(ownsNFT);

      if (!ownsNFT) {
        toast({
          title: "NFT Required",
          description: "You need to own the required NFT on Gnosis Chain to use this application",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect wallet or verify NFT ownership",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mb-6">
      <Button 
        onClick={connectWallet} 
        variant={address ? "outline" : "default"}
        className="w-full"
      >
        <Wallet className="mr-2" />
        {address ? `Connected: ${address.slice(0, 6)}...${address.slice(-4)}` : "Connect Wallet"}
      </Button>
      {address && (
        <p className="mt-2 text-sm text-muted-foreground">
          {hasNFT ? "✅ NFT Ownership Verified" : "❌ Required NFT not found"}
        </p>
      )}
    </div>
  );
};

export default WalletConnect;