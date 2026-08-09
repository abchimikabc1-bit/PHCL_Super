import 'package:flutter/material.dart';

class MarketplaceView extends StatelessWidget {
  const MarketplaceView({Key? key}) : super(key: key);

  final List<Map<String, dynamic>> products = const [
    {
      'title': 'John Deere 6R 250 Heavy Tractor (2025)',
      'price': '\$125,000 USD',
      'pi': '0.3978 Pi (GCV)',
      'category': 'Machinery',
      'icon': '🚜',
    },
    {
      'title': 'Tesla Model S Plaid 2025 EV (1020 HP)',
      'price': '\$99,990 USD',
      'pi': '0.3182 Pi (GCV)',
      'category': 'EV Vehicles',
      'icon': '⚡',
    },
    {
      'title': 'Rolls-Royce Cullinan Series II (2025)',
      'price': '\$480,000 USD',
      'pi': '1.5278 Pi (GCV)',
      'category': 'Luxury Auto',
      'icon': '👑',
    },
    {
      'title': 'Yamaha YZF-R1M Superbike 1000cc',
      'price': '\$27,999 USD',
      'pi': '0.0891 Pi (GCV)',
      'category': 'Motorcycles',
      'icon': '🏍️',
    },
    {
      'title': 'Samsung Galaxy Z Fold 7 (512GB, 16GB RAM)',
      'price': '\$1,899.99 USD',
      'pi': '0.006047 Pi (GCV)',
      'category': 'Electronics',
      'icon': '📱',
    },
    {
      'title': 'iPhone 16 Pro Max 1TB Titanium',
      'price': '\$1,599 USD',
      'pi': '0.005089 Pi (GCV)',
      'category': 'Electronics',
      'icon': '🍎',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // GCV STANDARD HERO CAROUSEL
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF18092D), Color(0xFF3A1066)],
            ),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFFFBBF24), width: 2),
            boxShadow: [
              BoxShadow(
                color: const Color(0xFFF59E0B).withOpacity(0.3),
                blurRadius: 20,
              )
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF59E0B).withOpacity(0.25),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFFBBF24)),
                    ),
                    child: const Text(
                      '🥧 GCV STANDARD BENCHMARK',
                      style: TextStyle(color: Color(0xFFFDE047), fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                  const Text('🛡️ 100% Escrow', style: TextStyle(color: Color(0xFF34D399), fontSize: 11, fontWeight: FontWeight.bold)),
                ],
              ),
              const SizedBox(height: 10),
              const Text(
                '1 Pi = \$314,159.00 USD',
                style: TextStyle(color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 4),
              const Text(
                '🇹🇿 848,229,300 TZS per Pi Coin',
                style: TextStyle(color: Color(0xFF34D399), fontSize: 12, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
        const SizedBox(height: 20),

        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: const [
            Text('🛍️ Soko la Marketplace (Pre-Order)', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
            Text('Verified Sellers', style: TextStyle(color: Color(0xFF38BDF8), fontSize: 11)),
          ],
        ),
        const SizedBox(height: 12),

        // PRODUCTS GRID LIST
        ...products.map((item) => Card(
          margin: const EdgeInsets.only(bottom: 12),
          color: const Color(0xFF0F172A),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: const BorderSide(color: Colors.white12),
          ),
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Container(
                  width: 50,
                  height: 50,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.white10,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(item['icon'], style: const TextStyle(fontSize: 26)),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(item['title'], style: const TextStyle(color: Colors.white, fontSize: 13, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      Row(
                        children: [
                          Text(item['price'], style: const TextStyle(color: Color(0xFF38BDF8), fontSize: 12, fontWeight: FontWeight.w700)),
                          const SizedBox(width: 8),
                          Text(item['pi'], style: const TextStyle(color: Color(0xFFFDE047), fontSize: 11, fontWeight: FontWeight.bold)),
                        ],
                      ),
                    ],
                  ),
                ),
                ElevatedButton(
                  onPressed: () {
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text('🛍️ Order for "${item['title']}" placed into Escrow Protection!')),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                  ),
                  child: const Text('Agiza', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          ),
        )).toList(),
      ],
    );
  }
}
