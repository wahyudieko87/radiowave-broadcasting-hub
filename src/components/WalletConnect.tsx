import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Wallet } from "lucide-react";
import { createPublicClient, http, createWalletClient, custom } from "viem";
import { gnosis } from "viem/chains";

declare global {
  interface Window {
    ethereum?: any;
  }
}

const AUTHORIZED_WALLET = "0x13Dd8b8F54c3b54860F8D41A6FBFF7FFc6bF01eF".toLowerCase();

const WalletConnect = ({ onOwnershipVerified }: { onOwnershipVerified: (verified: boolean) => void }) => {
  const [address, setAddress] = useState<string>("");
  const [isAuthorized, setIsAuthorized] = useState(false);
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

      const isWalletAuthorized = userAddress.toLowerCase() === AUTHORIZED_WALLET;
      setIsAuthorized(isWalletAuthorized);
      onOwnershipVerified(isWalletAuthorized);

      if (!isWalletAuthorized) {
        toast({
          title: "Access Denied",
          description: "Only the authorized wallet address can use this application",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Error",
        description: "Failed to connect wallet",
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
          {isAuthorized ? "✅ Authorized Wallet" : "❌ Unauthorized Wallet"}
        </p>
      )}
    </div>
  );
};

export default WalletConnect;
