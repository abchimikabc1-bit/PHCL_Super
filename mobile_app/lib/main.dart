import 'package:flutter/material.dart';
import 'package:local_auth/local_auth.dart';
import 'views/dashboard_view.dart';
import 'views/marketplace_view.dart';
import 'views/kyc_view.dart';

void main() {
  runApp(const AntigravityMobileApp());
}

class AntigravityMobileApp extends StatelessWidget {
  const AntigravityMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Antigravity Mobile',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark().copyWith(
        scaffoldBackgroundColor: const Color(0xFF090D16),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF6366F1),
          secondary: Color(0xFF10B981),
          surface: Color(0xFF0F172A),
        ),
      ),
      home: const MainMobileNavigationScreen(),
    );
  }
}

class MainMobileNavigationScreen extends StatefulWidget {
  const MainMobileNavigationScreen({super.key});

  @override
  State<MainMobileNavigationScreen> createState() => _MainMobileNavigationScreenState();
}

class _MainMobileNavigationScreenState extends State<MainMobileNavigationScreen> {
  int _currentIndex = 0;
  final LocalAuthentication _localAuth = LocalAuthentication();
  bool _isBiometricsAuthenticated = false;

  Future<void> _authenticateBiometrics() async {
    try {
      final bool didAuthenticate = await _localAuth.authenticate(
        localizedReason: 'Tafadhali tumia Fingerprint au FaceID kuingia kwenye akaunti yako',
        options: const AuthenticationOptions(biometricOnly: true),
      );
      setState(() {
        _isBiometricsAuthenticated = didAuthenticate;
      });
      if (didAuthenticate && mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Biometric Login Imefanikiwa!'),
            backgroundColor: Color(0xFF10B981),
          ),
        );
      }
    } catch (e) {
      debugPrint('Biometric Error: $e');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Antigravity Mobile Shield 🛡️', style: TextStyle(fontWeight: FontWeight.bold)),
        backgroundColor: const Color(0xFF0F172A),
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.fingerprint, color: Color(0xFF10B981), size: 28),
            onPressed: _authenticateBiometrics,
            tooltip: 'Native Biometric Login',
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: const [
          MobileDashboardView(),
          MobileMarketplaceView(),
          MobileKycPortalView(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        backgroundColor: const Color(0xFF0F172A),
        selectedItemColor: const Color(0xFF6366F1),
        unselectedItemColor: Colors.grey,
        onTap: (index) => setState(() => _currentIndex = index),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.dashboard), label: 'Dashboard'),
          BottomNavigationBarItem(icon: Icon(Icons.shopping_bag), label: 'Marketplace'),
          BottomNavigationBarItem(icon: Icon(Icons.verified_user), label: 'KYC Portal'),
        ],
      ),
    );
  }
}
