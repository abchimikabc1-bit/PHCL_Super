import { cryptoData, tradingPairs, getCryptoPrice } from './crypto-data';

interface ChatContext {
  language: 'en' | 'sw';
  userProfile?: {
    userId: string;
    username: string;
    balance: number;
  };
}

export async function getChatbotResponse(
  userMessage: string,
  context: ChatContext
): Promise<string> {
  const message = userMessage.toLowerCase().trim();
  const lang = context.language;

  // Cryptocurrency price inquiries
  if (
    message.includes('price') ||
    message.includes('bei') ||
    message.includes('cost')
  ) {
    let response = '';
    if (lang === 'en') {
      response = 'Here are current cryptocurrency prices:\n\n';
    } else {
      response = 'Hapa kuna bei za cryptocurrencies sasa:\n\n';
    }

    Object.entries(cryptoData).forEach(([key, crypto]) => {
      if (crypto.currentPrice !== null) {
        const price =
          lang === 'en'
            ? `${crypto.symbol}: $${crypto.currentPrice.toLocaleString()}`
            : `${crypto.symbol}: $${crypto.currentPrice.toLocaleString()}`;
        response += `${price}\n`;
      } else {
        response +=
          lang === 'en'
            ? `${crypto.symbol}: Coming soon\n`
            : `${crypto.symbol}: Inakuja\n`;
      }
    });

    return response;
  }

  // Bitcoin inquiry
  if (message.includes('bitcoin') || message.includes('btc')) {
    const btcPrice = getCryptoPrice('BTC');
    return lang === 'en'
      ? `Bitcoin is currently trading at $${btcPrice?.toLocaleString()}. It's the most established cryptocurrency with a market cap of $850 billion. Would you like to trade BTC or learn more?`
      : `Bitcoin inatambaa $${btcPrice?.toLocaleString()}. Ni cryptocurrency kubwa zaidi. Ungependa kubiashara BTC?`;
  }

  // Ethereum inquiry
  if (message.includes('ethereum') || message.includes('eth')) {
    const ethPrice = getCryptoPrice('ETH');
    return lang === 'en'
      ? `Ethereum is at $${ethPrice?.toLocaleString()}. It powers smart contracts and DeFi applications. Perfect for advanced trading strategies.`
      : `Ethereum iko $${ethPrice?.toLocaleString()}. Inatumika kwa smart contracts. Nzuri kwa biashara advanced.`;
  }

  // Pi Network inquiry
  if (message.includes('pi') && !message.includes('price')) {
    return lang === 'en'
      ? 'Pi Network is an emerging digital currency project. On PHCL Super, you can trade, hold, and use Pi coins in our marketplace. Pi aims to create a more decentralized internet.'
      : 'Pi Network ni digital currency mpya. Kwa PHCL Super, unaweza kubiashara Pi, kuihold, na kuitumia kwa soko. Pi inafikiri decentralized internet.';
  }

  // Marketplace inquiry
  if (message.includes('marketplace') || message.includes('soko')) {
    return lang === 'en'
      ? 'Our marketplace has thousands of products: vehicles, motorcycles, electronics, appliances, and more. You can browse, negotiate prices, and pay with any supported cryptocurrency or TZS.'
      : 'Soko letu lina bidhaa nyingi: magari, pikipiki, electronics, vifaa, na zaidi. Unaweza kutazama, kupatana bei, na kulipia kwa crypto au TZS.';
  }

  // Wallet inquiries
  if (
    message.includes('wallet') ||
    message.includes('deposit') ||
    message.includes('withdraw')
  ) {
    return lang === 'en'
      ? 'Your wallet supports TZS, Bitcoin, Ethereum, USDT, and other cryptocurrencies. You can:\n- Deposit: Add funds via bank transfer or crypto\n- Withdraw: Send to external wallets\n- Transfer: Send to other PHCL users\n\nAll transfers use 256-bit encryption.'
      : 'Wallet yako inasupport TZS, Bitcoin, Ethereum, USDT. Unaweza:\n- Kumweka: Ongeza fedha\n- Kutoa: Tuma kwa wallet nyingine\n- Kuhamisha: Kwa watumiaji wengine\n\nSalama kabisa 256-bit.';
  }

  // Trading inquiries
  if (
    message.includes('trade') ||
    message.includes('biashara') ||
    message.includes('sell') ||
    message.includes('buy')
  ) {
    const pairs = tradingPairs
      .slice(0, 3)
      .map((p) => `${p.pair}: $${p.volume} (${p.change})`)
      .join('\n');

    return lang === 'en'
      ? `Popular trading pairs right now:\n${pairs}\n\nClick on any pair to start trading. Real-time prices update every second.`
      : `Jozi za biashara popular:\n${pairs}\n\nClick kuanza kubiashara. Bei zinarefresh kila sekunde.`;
  }

  // Security inquiries
  if (message.includes('security') || message.includes('safe') || message.includes('usalama')) {
    return lang === 'en'
      ? 'PHCL Super uses:\n- 256-bit encryption for all transactions\n- 2FA (Two-Factor Authentication) for account protection\n- Secure wallets with private key management\n- Regular security audits\n\nEnable 2FA in Settings > Security for extra protection.'
      : 'PHCL Super inatumia:\n- 256-bit encryption kwa kila transaction\n- 2FA kwa akaunti\n- Secure wallets\n- Security audits regular\n\nWezesha 2FA kwa usalama zaidi.';
  }

  // Help/Support
  if (
    message.includes('help') ||
    message.includes('msaada') ||
    message.includes('support')
  ) {
    return lang === 'en'
      ? `I can help you with:
1. Cryptocurrency prices and trading
2. Marketplace browsing and purchases
3. Wallet management and transfers
4. Account security and 2FA setup
5. Order tracking and history

What would you like help with?`
      : `Naweza kukusaidia kwa:
1. Bei za crypto na biashara
2. Soko na ununuzi
3. Wallet na kuhamisha
4. Usalama na 2FA
5. Order tracking

Nini kwa msaada?`;
  }

  // Default response
  return lang === 'en'
    ? `I can help with cryptocurrency trading, marketplace purchases, wallet management, and more. Try asking about Bitcoin prices, trading pairs, or our marketplace features!`
    : `Naweza kukusaidia kwa crypto trading, ununuzi, wallet, na zaidi. Uliza kuhusu Bitcoin, trading, au soko!`;
}
