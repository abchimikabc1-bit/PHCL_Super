import 'package:flutter/material.dart';
import 'views/biometric_login_view.dart';
import 'views/marketplace_view.dart';
import 'views/exchange_view.dart';
import 'views/kyc_liveness_view.dart';

void main() {
  runApp(const PhclApp());
}

class PhclApp extends StatelessWidget {
  const PhclApp({Key? key}) : super(key: key);

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PHCL Super App',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: const Color(0xFF040711),
        primaryColor: const Color(0xFF38BDF8),
        colorScheme: const ColorScheme.dark(
          primary: Color(0xFF38BDF8),
          secondary: Color(0xFFF59E0B),
          surface: Color(0xFF0F172A),
        ),
        useMaterial3: true,
      ),
      home: const PhclMainScreen(),
    );
  }
}

class PhclMainScreen extends StatefulWidget {
  const PhclMainScreen({Key? key}) : super(key: key);

  @override
  State<PhclMainScreen> createState() => _PhclMainScreenState();
}

class _PhclMainScreenState extends State<PhclMainScreen> {
  bool _isLoggedIn = false;
  int _currentIndex = 0;

  final List<Widget> _pages = const [
    MarketplaceView(),
    ExchangeView(),
    KycLivenessView(),
  ];

  @override
  Widget build(BuildContext context) {
    if (!_isLoggedIn) {
      return BiometricLoginView(
        onLoginSuccess: () {
          setState(() => _isLoggedIn = true);
        },
      );
    }

    return Scaffold(
      appBar: AppBar(
        backgroundColor: const Color(0xFF0F172A),
        elevation: 4,
        title: Row(
          children: const [
            Text('🥧', style: TextStyle(fontSize: 22)),
            SizedBox(width: 8),
            Text(
              'PHCL SUPER APP',
              style: TextStyle(
                color: Color(0xFFFDE047),
                fontSize: 16,
                fontWeight: FontWeight.bold,
                letterSpacing: 1.2,
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.lock, color: Color(0xFF10B981)),
            title: const Text('Logout / Lock App'),
            onPressed: () {
              setState(() => _isLoggedIn = false);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('🔒 App Locked for Security.')),
              );
            },
          ),
        ],
      ),
      body: _pages[_currentIndex],
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _currentIndex,
        onTap: (idx) => setState(() => _currentIndex = idx),
        backgroundColor: const Color(0xFF0F172A),
        selectedItemColor: const Color(0xFFF59E0B),
        unselectedItemColor: Colors.white54,
        items: const [
          BottomNavigationBarItem(
            icon: Icon(Icons.storefront),
            label: 'Marketplace',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.currency_exchange),
            label: 'Exchange',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.verified_user),
            label: 'KYC & Safety',
          ),
        ],
      ),
    );
  }
}
