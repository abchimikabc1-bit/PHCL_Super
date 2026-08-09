/**
 * Multilingual AI Assistant Engine
 * Provides AI response synthesis across 4 Languages: Swahili (sw), English (en), French (fr), and Chinese (zh).
 */

class AIAssistantEngine {
  constructor() {
    this.knowledgeBase = {
      sw: {
        welcome: 'Habari ya Heshima! Mimi ni Msaidizi Rasmi wa AI ndani ya PHCL Super (PHCL Assistant). Niko hapa na niko tayari kabisa kutoa ushirikiano wa hali ya juu na kukusaidia kupata huduma zote za Marketplace, Uhakiki wa KYC, Miamala ya Escrow, na Malipo kwa haraka na usalama. Nikupe msaada gani leo?',
        kycHelp: 'KYC ina viwango vitatu:\n- Tier 1: OTP ya Barua pepe na Simu.\n- Tier 2: NIDA/Passport + Liveness Selfie (Inakuruhusu Kuuza Sokoni).\n- Tier 3: Hati ya Makazi (Proof of Address) + AML Check (Inakuruhusu miamala > $1,000).',
        sellHelp: 'Ili kuuza au kununua bidhaa sokoni, mfumo wa PHCL unakupa ulinzi wa 100% kupitia Escrow. Kama una maswali ya jinsi ya kuanza, niko tayari kusaidiana nawe hatua kwa hatua.',
        securityHelp: 'Mfumo wetu unalindwa na AES-256 PII Encryption, Firestore Security Rules, Uhakiki wa Biometric Liveness Selfie, na Token Revocation on Logout.',
        defaultResponse: 'Asante sana! Mimi ni Msaidizi Rasmi wa AI ndani ya PHCL Super na niko tayari kutoa ushirikiano kamili kwa ajili yako. Ninaweza kusaidia kutoa maelekezo kuhusu Uhakiki wa KYC, Nunua/Uza Sokoni, Escrow Vaults, na Usalama wa Akaunti yako.',
      },
      en: {
        welcome: 'Hello! I am the official PHCL Super AI Assistant. I am here and fully ready to cooperate with you and assist you in seamlessly accessing all our Marketplace, KYC Verification, Escrow, and Payment services. How may I assist you today?',
        kycHelp: 'KYC has three levels:\n- Tier 1: Email and Phone OTP.\n- Tier 2: Government ID + Liveness Selfie (Unlocks Selling).\n- Tier 3: Proof of Address + AML Screening (Unlocks transactions > $1,000).',
        sellHelp: 'To trade items safely in the Marketplace, PHCL guarantees 100% Escrow Protection. I am fully ready to assist you step by step.',
        securityHelp: 'Our platform is secured with AES-256 PII Encryption, Biometric Liveness Verification, and Firestore Security Rules.',
        defaultResponse: 'Thank you for your inquiry! I am the official PHCL Super AI Assistant and I am ready to cooperate with you for all Marketplace, KYC, and Security assistance.',
      },
      fr: {
        welcome: 'Bonjour! Je suis l\'assistant IA officiel de PHCL Super. Je suis entièrement prêt à coopérer avec vous et à vous aider à accéder à tous nos services de marché, vérification KYC et paiements Escrow.',
        kycHelp: 'Le KYC comporte trois niveaux:\n- Niveau 1: OTP Email et Téléphone.\n- Niveau 2: Pièce d’identité + Selfie Liveness (Débloque la vente).\n- Niveau 3: Justificatif de domicile + Contrôle AML.',
        sellHelp: 'Pour vendre ou acheter sur le marché, PHCL garantit une protection à 100% par séquestre Escrow. Je suis à votre entière disposition.',
        securityHelp: 'Notre plateforme est sécurisée par le chiffrement AES-256 PII et la vérification biométrique.',
        defaultResponse: 'Merci pour votre question! Je suis l\'assistant IA officiel de PHCL Super et je suis prêt à vous apporter tout le soutien nécessaire.',
      },
      zh: {
        welcome: '您好！我是 PHCL Super 官方 AI 助手。我已准备好竭诚与您合作，协助您安全高效地体验我们的 Marketplace 市场、KYC 认证和 Escrow 托管支付服务。请问今天有什么可以帮您？',
        kycHelp: 'KYC身份验证包含三个级别：\n- 级别 1：邮箱和手机验证码。\n- 级别 2：政府身份证件 + 活体自拍（解锁卖家权限）。\n- 级别 3：地址证明 + 反洗钱审查。',
        sellHelp: '在 Marketplace 进行交易受 PHCL 100% 托管保护。我非常乐意协助您完成每一步。',
        securityHelp: '我们的平台采用 AES-256 个人信息加密、生物识别活体检测和安全控制。',
        defaultResponse: '感谢您的提问！我是 PHCL Super 官方 AI 助手，时刻准备着为您在 Marketplace、KYC 和安全方面提供全面合作与协助。',
      },
    };
  }

  getResponse(query, lang = 'sw') {
    const language = this.knowledgeBase[lang] ? lang : 'sw';
    const dict = this.knowledgeBase[language];
    const q = (query || '').toLowerCase();

    if (q.includes('habari') || q.includes('jambo') || q.includes('hello') || q.includes('hi') || q.includes('mambo') || q.includes('shikamoo')) {
      return dict.welcome;
    }
    if (q.includes('kyc') || q.includes('nida') || q.includes('tier') || q.includes('level') || q.includes('身份验证')) {
      return dict.kycHelp;
    }
    if (q.includes('kuuza') || q.includes('sell') || q.includes('vendre') || q.includes('soko') || q.includes('market') || q.includes('出售') || q.includes('交易')) {
      return dict.sellHelp;
    }
    if (q.includes('usalama') || q.includes('security') || q.includes('sécurité') || q.includes('safe') || q.includes('安全')) {
      return dict.securityHelp;
    }

    return dict.defaultResponse;
  }
}

module.exports = { AIAssistantEngine };
