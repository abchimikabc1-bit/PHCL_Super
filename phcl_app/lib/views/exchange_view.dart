import 'package:flutter/material.dart';
import '../services/security_service.dart';

class ExchangeView extends StatefulWidget {
  const ExchangeView({Key? key}) : super(key: key);

  @override
  State<ExchangeView> createState() => _ExchangeViewState();
}

class _ExchangeViewState extends State<ExchangeView> {
  final _amountController = TextEditingController(text: '1000');
  final _pinController = TextEditingController();
  final _securityService = SecurityService();

  String _fromCode = 'TZS';
  String _toCode = 'PI';
  String _calculatedResult = '0.00000117';

  final List<Map<String, String>> _currencies = const [
    {'code': 'PI', 'name': 'Pi Coin (GCV \$314,159)', 'icon': '🥧'},
    {'code': 'USD', 'name': 'US Dollar (\$1.00)', 'icon': '💵'},
    {'code': 'TZS', 'name': 'TZS Shilling', 'icon': '🇹🇿'},
    {'code': 'BTC', 'name': 'Bitcoin (\$96,500)', 'icon': '₿'},
    {'code': 'ETH', 'name': 'Ethereum (\$3,450)', 'icon': 'Ξ'},
    {'code': 'USDT', 'name': 'Tether USD', 'icon': '₮'},
    {'code': 'SOL', 'name': 'Solana (\$215)', 'icon': '◎'},
    {'code': 'BNB', 'name': 'Binance Coin (\$645)', 'icon': '🟡'},
  ];

  void _calculateSwap() {
    final amount = double.tryParse(_amountController.text) ?? 0;
    if (amount <= 0) {
      setState(() => _calculatedResult = '0.00');
      return;
    }

    if (_fromCode == 'TZS' && _toCode == 'PI') {
      final piVal = (amount / 2700.0) / 314159.0;
      setState(() => _calculatedResult = piVal.toStringAsFixed(8));
    } else if (_fromCode == 'USD' && _toCode == 'TZS') {
      final tzsVal = amount * 2700.0;
      setState(() => _calculatedResult = tzsVal.toStringAsFixed(2));
    } else if (_fromCode == 'PI' && _toCode == 'USD') {
      final usdVal = amount * 314159.0;
      setState(() => _calculatedResult = usdVal.toStringAsFixed(2));
    } else {
      setState(() => _calculatedResult = (amount * 0.00125).toStringAsFixed(4));
    }
  }

  void _executeSwap() {
    final pin = _pinController.text;

    if (!_securityService.validateMilitaryPin(pin)) {
      showDialog(
        context: context,
        builder: (ctx) => AlertDialog(
          backgroundColor: const Color(0xFF0F172A),
          title: const Text('🛑 Transaction PIN Alert', style: TextStyle(color: Color(0xFFEF4444))),
          content: const Text(
            'PIN ya Muamala lazima iwe na tarakimu 8 hadi 12 za nambari (8-12 digits) kwa ajili ya usalama wa mkoba wako!',
            style: TextStyle(color: Colors.white70),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('OK')),
          ],
        ),
      );
      return;
    }

    _pinController.clear();

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('🎉 Currency Swap Successful! Received $_calculatedResult $_toCode into Escrow Vault.'),
        backgroundColor: const Color(0xFF059669),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // MARQUEE STATS STRIP
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: const Color(0xFF38BDF8).withOpacity(0.4)),
          ),
          child: const Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('📊 24h Vol: \$18.49M USD', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11, fontWeight: FontWeight.bold)),
              Text('🔥 Bullish 84%', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
              Text('⏱️ Ticks: 5s', style: TextStyle(color: Color(0xFFC084FC), fontSize: 11, fontWeight: FontWeight.bold)),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // INSTANT ATOMIC SWAP CARD
        Card(
          color: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: const BorderSide(color: Color(0xFF38BDF8), width: 1.5),
          ),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: const [
                    Text('⚡ Instant Currency Swap', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                    Text('🛡️ 100% Escrow', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                  ],
                ),
                const SizedBox(height: 16),

                // FROM CURRENCY SELECTOR
                const Text('Unatoa (From Asset):', style: TextStyle(color: Colors.white54, fontSize: 11)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    DropdownButton<String>(
                      value: _fromCode,
                      dropdownColor: const Color(0xFF0F172A),
                      style: const TextStyle(color: Color(0xFFFDE047), fontWeight: FontWeight.bold),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _fromCode = val);
                          _calculateSwap();
                        }
                      },
                      items: _currencies.map((c) {
                        return DropdownMenuItem(
                          value: c['code'],
                          child: Text('${c['icon']} ${c['code']}'),
                        );
                      }).toList(),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: TextField(
                        controller: _amountController,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
                        onChanged: (_) => _calculateSwap(),
                        decoration: InputDecoration(
                          filled: true,
                          fillColor: Colors.black,
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        ),
                      ),
                    ),
                  ],
                ),

                // SWAP BUTTON
                Center(
                  child: IconButton(
                    icon: const Icon(Icons.swap_vert, color: Color(0xFF38BDF8), size: 30),
                    onPressed: () {
                      setState(() {
                        final temp = _fromCode;
                        _fromCode = _toCode;
                        _toCode = temp;
                      });
                      _calculateSwap();
                    },
                  ),
                ),

                // TO CURRENCY SELECTOR
                const Text('Unapokea (To Asset):', style: TextStyle(color: Colors.white54, fontSize: 11)),
                const SizedBox(height: 6),
                Row(
                  children: [
                    DropdownButton<String>(
                      value: _toCode,
                      dropdownColor: const Color(0xFF0F172A),
                      style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold),
                      onChanged: (val) {
                        if (val != null) {
                          setState(() => _toCode = val);
                          _calculateSwap();
                        }
                      },
                      items: _currencies.map((c) {
                        return DropdownMenuItem(
                          value: c['code'],
                          child: Text('${c['icon']} ${c['code']}'),
                        );
                      }).toList(),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                        decoration: BoxDecoration(
                          color: Colors.black,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: const Color(0xFF34D399)),
                        ),
                        child: Text(
                          _calculatedResult,
                          style: const TextStyle(color: Color(0xFF34D399), fontWeight: FontWeight.bold, fontSize: 15),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 16),

                // MILITARY PIN CONFIRMATION
                TextField(
                  controller: _pinController,
                  obscureText: true,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white, letterSpacing: 2),
                  decoration: InputDecoration(
                    labelText: 'PIN ya Muamala (Tarakimu 8 - 12)',
                    labelStyle: const TextStyle(color: Colors.white54, fontSize: 11),
                    prefixIcon: const Icon(Icons.key, color: Color(0xFFF59E0B)),
                    filled: true,
                    fillColor: Colors.black,
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                ),
                const SizedBox(height: 16),

                ElevatedButton(
                  onPressed: _executeSwap,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                  ),
                  child: const Text('🚀 Tekeleza Currency Swap Sasa', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
