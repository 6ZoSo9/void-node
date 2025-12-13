import React, { createContext, useContext, useMemo, useState } from "react";

export type WalletState = {
  address: string;
};

const DEVNET_DEMO_ADDRESS = "0x1111111111111111111111111111111111111111";

const WalletContext = createContext<WalletState | undefined>(undefined);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // For now this is a fixed devnet demo address. Later we can wire real wallets.
  const [address] = useState<string>(DEVNET_DEMO_ADDRESS);

  const value = useMemo(
    () => ({
      address,
    }),
    [address]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}
