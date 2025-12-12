import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

declare global {
  interface Window {
    // MetaMask / EIP-1193 provider
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on?: (event: string, handler: (...args: any[]) => void) => void;
      removeListener?: (event: string, handler: (...args: any[]) => void) => void;
    };
  }
}

export interface WalletContextValue {
  connectedAddress: string | null;
  networkId: string | null;
  networkName: string | null;
  connecting: boolean;
  lastError: string | null;
  connect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

function chainName(chainIdHex: string | null): string | null {
  if (!chainIdHex) return null;
  const id = parseInt(chainIdHex, 16);
  if (id === 1) return "Ethereum Mainnet";
  if (id === 5) return "Goerli";
  if (id === 31337) return "Anvil / Hardhat";
  if (id === 2050) return "VOID Devnet";
  return `Chain ${id}`;
}

export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [networkId, setNetworkId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const syncAccounts = useCallback((accounts: any) => {
    if (Array.isArray(accounts) && accounts.length > 0) {
      setConnectedAddress(accounts[0]);
    } else {
      setConnectedAddress(null);
    }
  }, []);

  const refreshAccounts = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const accounts = await window.ethereum.request({
        method: "eth_accounts",
      });
      syncAccounts(accounts);
    } catch (err: any) {
      console.error("[Wallet] eth_accounts failed", err);
    }
  }, [syncAccounts]);

  const refreshChainId = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      const chainId = await window.ethereum.request({
        method: "eth_chainId",
      });
      setNetworkId(chainId);
    } catch (err: any) {
      console.error("[Wallet] eth_chainId failed", err);
    }
  }, []);

  const connect = useCallback(async () => {
    if (!window.ethereum) {
      setLastError("No injected wallet (window.ethereum) detected.");
      return;
    }

    setConnecting(true);
    setLastError(null);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      syncAccounts(accounts);
      await refreshChainId();
    } catch (err: any) {
      console.error("[Wallet] connect failed", err);
      setLastError(err?.message ?? "Wallet connection failed");
    } finally {
      setConnecting(false);
    }
  }, [refreshChainId, syncAccounts]);

  // On mount: check existing connection + chain
  useEffect(() => {
    if (!window.ethereum) return;

    void refreshAccounts();
    void refreshChainId();

    const handleAccountsChanged = (accounts: any) => {
      syncAccounts(accounts);
    };

    const handleChainChanged = (chainId: string) => {
      setNetworkId(chainId);
    };

    window.ethereum.on?.("accountsChanged", handleAccountsChanged);
    window.ethereum.on?.("chainChanged", handleChainChanged);

    return () => {
      window.ethereum?.removeListener?.("accountsChanged", handleAccountsChanged);
      window.ethereum?.removeListener?.("chainChanged", handleChainChanged);
    };
  }, [refreshAccounts, refreshChainId, syncAccounts]);

  return (
    <WalletContext.Provider
      value={{
        connectedAddress,
        networkId,
        networkName: chainName(networkId),
        connecting,
        lastError,
        connect,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}
