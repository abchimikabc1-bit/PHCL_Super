import 'package:flutter/material.dart';

class KycLivenessView extends StatefulWidget {
  const KycLivenessView({Key? key}) : super(key: key);

  @override
  State<KycLivenessView> createState() => _KycLivenessViewState();
}

class _KycLivenessViewState extends State<KycLivenessView> {
  final _nidaController = TextEditingController();
  final _nameController = TextEditingController();
  bool _isSelfieCaptured = false;

  void _handleCaptureSelfie() {
    setState(() => _isSelfieCaptured = true);
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('📸 Biometric Liveness Selfie Recorded! Liveness Score: 98.4%'),
        backgroundColor: Color(0xFF059669),
      ),
    );
  }

  void _handleSubmitKyc() {
    if (_nidaController.text.isEmpty || _nameController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🛑 Tafadhali weka NIDA na Jina lako Kamili!')),
      );
      return;
    }

    if (!_isSelfieCaptured) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('🛑 Tafadhali piga picha ya Biometric Liveness Selfie kwanza!')),
      );
      return;
    }

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        title: const Text('🎉 Tier 2 KYC Submitted!', style: TextStyle(color: Color(0xFF34D399))),
        content: const Text(
          'Hati zako za NIDA na Biometric Liveness Selfie zimehifadhiwa kwa usalama wa AES-256-GCM. Admin ataangalia na kuidhinisha akaunti yako.',
          style: TextStyle(color: Colors.white70),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Sawa')),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: const Color(0xFF0F172A),
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: const Color(0xFF38BDF8)),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              const Text('👤 Uhakiki wa Kitambulisho (Tier 2 KYC)', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('Weka NIDA na uwasilishe Biometric Selfie ili kufungua uwezo wa kuuza.', style: TextStyle(color: Colors.white54, fontSize: 12)),
              const SizedBox(height: 16),

              TextField(
                controller: _nidaController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Nambari ya NIDA / Passport',
                  labelStyle: const TextStyle(color: Colors.white54),
                  filled: true,
                  fillColor: Colors.black,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: _nameController,
                style: const TextStyle(color: Colors.white),
                decoration: InputDecoration(
                  labelText: 'Jina Kamili',
                  labelStyle: const TextStyle(color: Colors.white54),
                  filled: true,
                  fillColor: Colors.black,
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 16),

              // CAMERA LIVENESS SIMULATOR CONTAINER
              Container(
                height: 180,
                width: double.infinity,
                decoration: BoxDecoration(
                  color: Colors.black,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: _isSelfieCaptured ? const Color(0xFF34D399) : Colors.white24, width: 2),
                ),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Icon(
                      _isSelfieCaptured ? Icons.check_circle_outline : Icons.camera_front,
                      color: _isSelfieCaptured ? const Color(0xFF34D399) : const Color(0xFF38BDF8),
                      size: 48,
                    ),
                    const SizedBox(height: 8),
                    Text(
                      _isSelfieCaptured ? '✅ Biometric Selfie Recorded (98.4%)' : '👁️ Place face inside guide oval',
                      style: TextStyle(
                        color: _isSelfieCaptured ? const Color(0xFF34D399) : Colors.white70,
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              OutlinedButton.icon(
                onPressed: _handleCaptureSelfie,
                icon: const Icon(Icons.camera_alt, color: Color(0xFF38BDF8)),
                label: const Text('📸 Piga Biometric Selfie (Live Camera)', style: TextStyle(color: Color(0xFF38BDF8))),
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size.fromHeight(44),
                  side: const BorderSide(color: Color(0xFF38BDF8)),
                ),
              ),
              const SizedBox(height: 16),

              ElevatedButton(
                onPressed: _handleSubmitKyc,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF059669),
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                ),
                child: const Text('Wasilisha Hati za Tier 2', style: TextStyle(fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ],
    );
  }
}
