'use client';

import React, { useState } from 'react';
import { createWalletClient, custom, parseEther, formatEther } from 'viem';
import { AmmoraRouteClient } from '@ammora-protocol/sdk';

// Configuration du réseau GIWA Sepolia (Chain ID 91342)
const giwaSepolia = {
  id: 91342,
  name: 'GIWA Sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://giwa.io'] },
  },
  blockExplorers: {
    default: { name: 'GIWA Explorer', url: 'https://giwa.io' },
  },
} as const;

export default function AmmoraSwapApp() {
  const [account, setAccount] = useState<string>('');
  const [tokenIn, setTokenIn] = useState<string>(
    '0x4200000000000000000000000000000000000006'
  ); // WETH GIWA
  const [tokenOut, setTokenOut] = useState<string>(''); // Adresse du jeton cible (ex: tAMM)
  const [amountIn, setAmountIn] = useState<string>('0.01');
  const [quoteResult, setQuoteResult] = useState<string>('');
  const [status, setStatus] = useState<string>('');

  // 1. Connexion au wallet et ajout du réseau GIWA Sepolia
  const connectWallet = async () => {
    if (typeof window === 'undefined' || !(window as any).ethereum) {
      setStatus('Veuillez installer MetaMask ou Rabby Wallet.');
      return;
    }
    try {
      const walletClient = createWalletClient({
        chain: giwaSepolia,
        transport: custom((window as any).ethereum),
      });
      const [address] = await walletClient.requestAddresses();
      await walletClient.addChain({ chain: giwaSepolia });
      await walletClient.switchChain({ id: giwaSepolia.id });
      setAccount(address);
      setStatus('Portefeuille connecté sur GIWA Sepolia.');
    } catch (err: any) {
      setStatus('Erreur de connexion : ' + err.message);
    }
  };

  // 2. Obtenir un prix via le SDK Ammora
  const getQuote = async () => {
    if (!tokenIn || !tokenOut || !amountIn) {
      setStatus('Renseignez les adresses des deux jetons et le montant.');
      return;
    }
    try {
      setStatus('Recherche de la meilleure route sur Ammora...');
      const ammora = await AmmoraRouteClient.create({
        chainId: giwaSepolia.id,
      });

      const quote = await ammora.quoteExactIn({
        tokenIn: tokenIn as `0x${string}`,
        tokenOut: tokenOut as `0x${string}`,
        amountIn: parseEther(amountIn),
      });

      setQuoteResult(formatEther(quote.amountOut));
      setStatus('Cotation trouvée avec succès.');
    } catch (err: any) {
      setStatus('Erreur SDK : ' + err.message);
    }
  };

  // 3. Exécuter la transaction de swap
  const executeSwap = async () => {
    if (!account) {
      setStatus("Connectez d'abord votre portefeuille.");
      return;
    }
    try {
      setStatus('Préparation de la transaction de swap...');
      const ammora = await AmmoraRouteClient.create({
        chainId: giwaSepolia.id,
      });

      const quote = await ammora.quoteExactIn({
        tokenIn: tokenIn as `0x${string}`,
        tokenOut: tokenOut as `0x${string}`,
        amountIn: parseEther(amountIn),
      });

      const walletClient = createWalletClient({
        account: account as `0x${string}`,
        chain: giwaSepolia,
        transport: custom((window as any).ethereum),
      });

      const hash = await walletClient.sendTransaction({
        to: quote.to,
        data: quote.calldata,
        value: quote.value || 0n,
      });

      setStatus(`Swap envoyé ! Hash : ${hash}`);
    } catch (err: any) {
      setStatus('Transaction annulée ou échouée : ' + err.message);
    }
  };

  return (
    <main
      style={{
        maxWidth: 460,
        margin: '60px auto',
        fontFamily: 'sans-serif',
        padding: 24,
        border: '1px solid #e2e8f0',
        borderRadius: 16,
      }}
    >
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
        Ammora GIWA Swap
      </h1>
      <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
        Propulsé par @ammora-protocol/sdk sur GIWA Sepolia
      </p>

      {!account ? (
        <button
          onClick={connectWallet}
          style={{
            width: '100%',
            padding: 12,
            background: '#0f172a',
            color: '#fff',
            borderRadius: 8,
            cursor: 'pointer',
            marginBottom: 20,
          }}
        >
          Connecter le Wallet (GIWA Testnet)
        </button>
      ) : (
        <div
          style={{
            padding: 10,
            background: '#f1f5f9',
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          Connecté : {account.slice(0, 6)}...{account.slice(-4)}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <label style={{ fontSize: 13, fontWeight: 600 }}>
          Adresse Token Source (ex: WETH)
        </label>
        <input
          value={tokenIn}
          onChange={(e) => setTokenIn(e.target.value)}
          style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
        />

        <label style={{ fontSize: 13, fontWeight: 600 }}>
          Adresse Token Cible (ex: $tAMM)
        </label>
        <input
          placeholder="0x..."
          value={tokenOut}
          onChange={(e) => setTokenOut(e.target.value)}
          style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
        />

        <label style={{ fontSize: 13, fontWeight: 600 }}>
          Montant à échanger
        </label>
        <input
          type="number"
          value={amountIn}
          onChange={(e) => setAmountIn(e.target.value)}
          style={{ padding: 10, border: '1px solid #cbd5e1', borderRadius: 8 }}
        />

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button
            onClick={getQuote}
            style={{
              flex: 1,
              padding: 12,
              background: '#e2e8f0',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Calculer le prix
          </button>
          <button
            onClick={executeSwap}
            style={{
              flex: 1,
              padding: 12,
              background: '#2563eb',
              color: '#fff',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Swapper
          </button>
        </div>
      </div>

      {quoteResult && (
        <div
          style={{
            marginTop: 16,
            padding: 12,
            background: '#ecfdf5',
            color: '#065f46',
            borderRadius: 8,
            fontSize: 14,
          }}
        >
          Estimation reçue : <strong>{quoteResult}</strong> jetons
        </div>
      )}

      {status && (
        <p
          style={{
            marginTop: 16,
            fontSize: 13,
            color: '#475569',
            wordBreak: 'break-all',
          }}
        >
          {status}
        </p>
      )}
    </main>
  );
}
