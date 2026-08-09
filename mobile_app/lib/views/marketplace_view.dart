import 'package:flutter/material.dart';
import '../services/api_service.dart';

class MobileMarketplaceView extends StatefulWidget {
  const MobileMarketplaceView({super.key});

  @override
  State<MobileMarketplaceView> createState() => _MobileMarketplaceViewState();
}

class _MobileMarketplaceViewState extends State<MobileMarketplaceView> {
  late Future<List<dynamic>> _productsFuture;

  @override
  void initState() {
    super.initState();
    _productsFuture = MobileApiService.fetchMarketplaceProducts();
  }

  void _showCheckoutBottomSheet(BuildContext context, Map<String, dynamic> item) {
    String selectedProvider = 'MPESA';
    final phoneController = TextEditingController();

    showModalBottomSheet(
      context: context,
      backgroundColor: const Color(0xFF0F172A),
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) {
        return StatefulBuilder(
          builder: (context, setModalState) {
            return Padding(
              padding: EdgeInsets.only(
                left: 20,
                right: 20,
                top: 24,
                bottom: MediaQuery.of(context).viewInsets.bottom + 24,
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Lipa kwa Escrow Protection',
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${item['title']} - \$${item['price']}',
                    style: const TextStyle(color: Color(0xFF10B981), fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 16),

                  DropdownButtonFormField<String>(
                    value: selectedProvider,
                    dropdownColor: const Color(0xFF1E293B),
                    decoration: const InputDecoration(
                      labelText: 'Chagua Njia ya Malipo',
                      border: OutlineInputBorder(),
                    ),
                    items: const [
                      DropdownMenuItem(value: 'MPESA', child: Text('🟢 Vodacom M-Pesa')),
                      DropdownMenuItem(value: 'TIGOPESA', child: Text('🔵 Tigo Pesa')),
                      DropdownMenuItem(value: 'AIRTELMONEY', child: Text('🔴 Airtel Money')),
                      DropdownMenuItem(value: 'PAYPAL', child: Text('🅿️ PayPal Checkout')),
                      DropdownMenuItem(value: 'VISACARD', child: Text('💳 VISA / Mastercard')),
                      DropdownMenuItem(value: 'BANKTRANSFER', child: Text('🏦 Bank Wire Transfer')),
                    ],
                    onChanged: (val) => setModalState(() => selectedProvider = val!),
                  ),
                  const SizedBox(height: 12),

                  TextField(
                    controller: phoneController,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Nambari ya Simu (k.m. 0755123456)',
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 20),

                  SizedBox(
                    width: double.infinity,
                    child: ElevatedButton(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF6366F1),
                        padding: const EdgeInsets.symmetric(vertical: 14),
                      ),
                      onPressed: () async {
                        Navigator.pop(ctx);
                        final res = await MobileApiService.initiatePayment(
                          listingId: item['id'].toString(),
                          amount: (item['price'] as num).toDouble(),
                          provider: selectedProvider,
                          phoneNumber: phoneController.text,
                          userUid: 'usr_mobile_demo',
                        );

                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text(res['message'] ?? 'Muamala umeanzishwa!'),
                              backgroundColor: const Color(0xFF10B981),
                            ),
                          );
                        }
                      },
                      child: const Text('Tekeleza Malipo 📲', style: TextStyle(fontSize: 16, color: Colors.white)),
                    ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<List<dynamic>>(
      future: _productsFuture,
      builder: (context, snapshot) {
        if (snapshot.connectionState == ConnectionState.waiting) {
          return const Center(child: CircularProgressIndicator());
        }

        if (!snapshot.hasData || snapshot.data!.isEmpty) {
          return const Center(child: Text('Hakuna bidhaa sokoni kwa sasa.'));
        }

        final products = snapshot.data!;
        return ListView.builder(
          padding: const EdgeInsets.all(16),
          itemCount: products.length,
          itemBuilder: (context, index) {
            final item = products[index];
            return Card(
              color: const Color(0xFF0F172A),
              margin: const EdgeInsets.only(bottom: 16),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Chip(
                          label: Text(item['category'] ?? 'General', style: const TextStyle(fontSize: 11)),
                          backgroundColor: const Color(0xFF6366F1).withOpacity(0.2),
                        ),
                        Text(
                          'Verified Tier ${item['sellerKycTier'] ?? 1}',
                          style: const TextStyle(color: Color(0xFF10B981), fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    Text(item['title'] ?? '', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Colors.white)),
                    const SizedBox(height: 4),
                    Text('\$${item['price']} ${item['currency'] ?? 'USD'}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.extrabold, color: Color(0xFF10B981))),
                    const SizedBox(height: 8),
                    Text(item['description'] ?? '', style: const TextStyle(color: Colors.grey, fontSize: 13)),
                    const SizedBox(height: 16),
                    SizedBox(
                      width: double.infinity,
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.shopping_cart, color: Colors.white),
                        label: const Text('Nunua kwa M-Pesa / Card', style: TextStyle(color: Colors.white)),
                        style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF6366F1)),
                        onPressed: () => _showCheckoutBottomSheet(context, item),
                      ),
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }
}
