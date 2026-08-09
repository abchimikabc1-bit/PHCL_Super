import 'package:flutter/material.dart';

class MobileKycPortalView extends StatefulWidget {
  const MobileKycPortalView({super.key});

  @override
  State<MobileKycPortalView> createState() => _MobileKycPortalViewState();
}

class _MobileKycPortalViewState extends State<MobileKycPortalView> {
  int currentTier = 2;
  bool isLivenessCaptured = false;
  double livenessScore = 98.6;

  void _triggerCameraSelfie() {
    setState(() {
      isLivenessCaptured = true;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('📸 Biometric Liveness Selfie Captured! Score: $livenessScore%'),
        backgroundColor: const Color(0xFF10B981),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF0F172A),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.white.withOpacity(0.08)),
            ),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Hali yako ya KYC:', style: TextStyle(color: Colors.grey, fontSize: 13)),
                    const SizedBox(height: 4),
                    Text('TIER $currentTier VERIFIED 🛡️', style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold, color: Color(0xFF10B981))),
                  ],
                ),
                Chip(
                  label: Text('TIER $currentTier', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
                  backgroundColor: const Color(0xFF10B981),
                ),
              ],
            ),
          ),
          const SizedBox(height: 20),

          const Text('Biometric Liveness Verification', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          const SizedBox(height: 8),
          const Text('Weka uso wako kwenye kamera kuthibitisha uasili wa binadamu.', style: TextStyle(color: Colors.grey, fontSize: 13)),
          const SizedBox(height: 16),

          // LIVENESS CAMERA PREVIEW BOX
          Container(
            height: 220,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.black,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: const Color(0xFF6366F1), width: 2),
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                const Icon(Icons.person, size: 100, color: Colors.white24),
                if (isLivenessCaptured)
                  Container(
                    color: Colors.black70,
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        const Icon(Icons.check_circle, color: Color(0xFF10B981), size: 48),
                        const SizedBox(height: 8),
                        Text('Liveness Verified ($livenessScore%)', style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                      ],
                    ),
                  ),
              ],
            ),
          ),
          const SizedBox(height: 16),

          SizedBox(
            width: double.infinity,
            child: ElevatedButton.icon(
              icon: const Icon(Icons.camera_alt, color: Colors.white),
              label: const Text('📸 Piga Liveness Selfie', style: TextStyle(color: Colors.white)),
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF6366F1),
                padding: const EdgeInsets.symmetric(vertical: 14),
              ),
              onPressed: _triggerCameraSelfie,
            ),
          ),
        ],
      ),
    );
  }
}
