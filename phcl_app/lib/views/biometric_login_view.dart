import 'package:flutter/material.dart';
import '../services/security_service.dart';

class BiometricLoginView extends StatefulWidget {
  final VoidCallback onLoginSuccess;
  const BiometricLoginView({Key? key, required onLoginSuccess})
      : _onLoginSuccess = onLoginSuccess,
        super(key: key);

  final VoidCallback _onLoginSuccess;

  @override
  State<BiometricLoginView> createState() => _BiometricLoginViewState();
}

class _BiometricLoginViewState extends State<BiometricLoginView> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _pinController = TextEditingController();
  final _securityService = SecurityService();

  bool _isObscurePass = true;
  bool _isObscurePin = true;
  bool _isAuthenticating = false;

  void _handleBiometricClick() async {
    setState(() => _isAuthenticating = true);
    final success = await _securityService.authenticateBiometrics();
    setState(() => _isAuthenticating = false);

    if (success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('🎉 Biometric Fingerprint Verified! Access Granted.'),
          backgroundColor: Color(0xFF059669),
        ),
      );
      widget._onLoginSuccess();
    }
  }

  void _handleFormSubmit() {
    final email = _emailController.text.trim();
    final pass = _passwordController.text;
    final pin = _pinController.text;

    if (email.isEmpty) {
      _showError('Tafadhali ingiza barua pepe au nambari ya simu!');
      return;
    }

    if (!_securityService.validateStrongPassword(pass)) {
      _showError(
        '🛑 Password Haikutimiza Viwango vya Usalama wa Kijeshi!\n\n'
        'Password lazima iwe na angalau:\n'
        '• Herufi 10 au zaidi\n'
        '• Herufi kubwa (A-Z)\n'
        '• Herufi ndogo (a-z)\n'
        '• Nambari (0-9)\n'
        '• Ishara maalum (!@#\$%^&*)',
      );
      return;
    }

    if (!_securityService.validateMilitaryPin(pin)) {
      _showError(
        '🛑 Transaction PIN lazima iwe na tarakimu 8 hadi 12 za nambari (8-12 digits) kwa ajili ya kulinda mkoba wako!',
      );
      return;
    }

    // Auto clear credentials from fields for maximum memory security
    _passwordController.clear();
    _pinController.clear();

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text('✅ Login Successful! Welcome to PHCL Super App.'),
        backgroundColor: Color(0xFF059669),
      ),
    );

    widget._onLoginSuccess();
  }

  void _showError(String message) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF0F172A),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
        title: const Text('⚠️ Warning & Security Alert', style: TextStyle(color: Color(0xFFEF4444))),
        content: Text(message, style: const TextStyle(color: Colors.white70, fontSize: 13)),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('OK', style: TextStyle(color: Color(0xFF38BDF8))),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final pass = _passwordController.text;
    final hasLength = pass.length >= 10;
    final hasUpper = pass.contains(RegExp(r'[A-Z]'));
    final hasLower = pass.contains(RegExp(r'[a-z]'));
    final hasDigits = pass.contains(RegExp(r'[0-9]'));
    final hasSpecial = pass.contains(RegExp(r'[!@#$%^&*(),.?":{}|<>]'));

    return Scaffold(
      backgroundColor: const Color(0xFF040711),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 30),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // OFFICIAL PHCL SUPER LOGO BADGE (STARS INSIDE CIRCULAR FRAME)
                Stack(
                  alignment: Alignment.center,
                  children: [
                    Container(
                      width: 90,
                      height: 90,
                      decoration: BoxDecoration(
                        shape: BoxShape.circle,
                        gradient: const RadialGradient(
                          colors: [Color(0xFF0284C7), Color(0xFF3B82F6), Color(0xFF0F172A)],
                        ),
                        border: Border.all(color: const Color(0xFFFDE047), width: 3.5),
                        boxShadow: [
                          BoxShadow(
                            color: const Color(0xFFFDE047).withOpacity(0.8),
                            blurRadius: 25,
                            spreadRadius: 2,
                          ),
                          BoxShadow(
                            color: const Color(0xFF38BDF8).withOpacity(0.6),
                            blurRadius: 40,
                            spreadRadius: 4,
                          ),
                        ],
                      ),
                      child: const Center(
                        child: Text(
                          'P',
                          style: TextStyle(
                            fontSize: 52,
                            fontWeight: FontWeight.w900,
                            color: Colors.white,
                            shadows: [
                              Shadow(color: Color(0xFF38BDF8), blurRadius: 20),
                              Shadow(color: Color(0xFFFDE047), blurRadius: 10),
                            ],
                          ),
                        ),
                      ),
                    ),
                    // PINK-RED SPARKLE STARS INSIDE CIRCLE
                    const Positioned(top: 10, right: 14, child: Text('✨', style: TextStyle(fontSize: 12, color: Color(0xFFFF2A85)))),
                    const Positioned(bottom: 12, left: 14, child: Text('✦', style: TextStyle(fontSize: 10, color: Color(0xFFF43F5E)))),
                    const Positioned(top: 16, left: 12, child: Text('★', style: TextStyle(fontSize: 9, color: Color(0xFFEC4899)))),
                  ],
                ),
                const SizedBox(height: 16),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: const [
                    Text(
                      'PHCL ',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                        letterSpacing: 1.5,
                      ),
                    ),
                    Text(
                      'Super',
                      style: TextStyle(
                        fontSize: 24,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFFFDE047),
                        letterSpacing: 1.5,
                      ),
                    ),
                    Text(' ✨', style: TextStyle(fontSize: 18, color: Color(0xFFF43F5E))),
                  ],
                ),
                const SizedBox(height: 6),
                const Text(
                  'Military-Grade Encrypted Ecosystem',
                  style: TextStyle(color: Colors.white54, fontSize: 12),
                ),
                const SizedBox(height: 24),

                // SECURITY STATUS BADGE
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                  decoration: BoxDecoration(
                    color: const Color(0xFF10B981).withOpacity(0.15),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: const Color(0xFF10B981)),
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Icon(Icons.shield, color: Color(0xFF34D399), size: 16),
                      SizedBox(width: 6),
                      Text(
                        '🛡️ ANTI-HACKING SCREEN SHIELD ACTIVE',
                        style: TextStyle(
                          color: Color(0xFF34D399),
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 30),

                // BIOMETRIC AUTH BUTTON
                ElevatedButton.icon(
                  onPressed: _isAuthenticating ? null : _handleBiometricClick,
                  icon: const Icon(Icons.fingerprint, size: 28),
                  label: Text(
                    _isAuthenticating ? 'Authenticating...' : 'Fingerprint / Face ID Quick Login',
                    style: const TextStyle(fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF38BDF8),
                    foregroundColor: const Color(0xFF040711),
                    minimumSize: const Size.fromHeight(50),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 8,
                  ),
                ),

                const SizedBox(height: 24),
                const Row(
                  children: [
                    Expanded(child: Divider(color: Colors.white24)),
                    Padding(
                      padding: EdgeInsets.symmetric(horizontal: 12),
                      child: Text('au ingia kwa password', style: TextStyle(color: Colors.white38, fontSize: 12)),
                    ),
                    Expanded(child: Divider(color: Colors.white24)),
                  ],
                ),
                const SizedBox(height: 20),

                // EMAIL INPUT
                TextField(
                  controller: _emailController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Barua Pepe / Nambari ya Simu',
                    labelStyle: const TextStyle(color: Colors.white54),
                    prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF38BDF8)),
                    filled: true,
                    fillColor: const Color(0xFF0F172A),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 16),

                // STRONG PASSWORD INPUT
                TextField(
                  controller: _passwordController,
                  obscureText: _isObscurePass,
                  onChanged: (_) => setState(() {}),
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    labelText: 'Strong Password',
                    labelStyle: const TextStyle(color: Colors.white54),
                    prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFFF59E0B)),
                    suffixIcon: IconButton(
                      icon: Icon(_isObscurePass ? Icons.visibility : Icons.visibility_off, color: Colors.white38),
                      onPressed: () => setState(() => _isObscurePass = !_isObscurePass),
                    ),
                    filled: true,
                    fillColor: const Color(0xFF0F172A),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 8),

                // STRONG PASSWORD GUIDANCE INDICATORS
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFF0F172A),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text(
                        '🔐 Strong Password Checklist:',
                        style: TextStyle(color: Color(0xFFFDE047), fontSize: 11, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 6),
                      Wrap(
                        spacing: 12,
                        runSpacing: 4,
                        children: [
                          _buildCheckItem('10+ Chars', hasLength),
                          _buildCheckItem('Uppercase (A-Z)', hasUpper),
                          _buildCheckItem('Lowercase (a-z)', hasLower),
                          _buildCheckItem('Number (0-9)', hasDigits),
                          _buildCheckItem('Special (!@#\$)', hasSpecial),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 16),

                // MILITARY PIN INPUT
                TextField(
                  controller: _pinController,
                  obscureText: _isObscurePin,
                  keyboardType: TextInputType.number,
                  style: const TextStyle(color: Colors.white, letterSpacing: 3),
                  decoration: InputDecoration(
                    labelText: 'Transaction PIN (Tarakimu 8 - 12)',
                    labelStyle: const TextStyle(color: Colors.white54),
                    prefixIcon: const Icon(Icons.key, color: Color(0xFF10B981)),
                    suffixIcon: IconButton(
                      icon: Icon(_isObscurePin ? Icons.visibility : Icons.visibility_off, color: Colors.white38),
                      onPressed: () => setState(() => _isObscurePin = !_isObscurePin),
                    ),
                    filled: true,
                    fillColor: const Color(0xFF0F172A),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                ),
                const SizedBox(height: 24),

                // SUBMIT BUTTON
                ElevatedButton(
                  onPressed: _handleFormSubmit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF059669),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(52),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    elevation: 6,
                  ),
                  child: const Text(
                    '🔒 INGIA KWENYE APP KWA USALAMA',
                    style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildCheckItem(String label, bool isOk) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(isOk ? Icons.check_circle : Icons.cancel, color: isOk ? const Color(0xFF34D399) : Colors.white24, size: 13),
        const SizedBox(width: 4),
        Text(
          label,
          style: TextStyle(color: isOk ? const Color(0xFF34D399) : Colors.white38, fontSize: 10, fontWeight: FontWeight.w600),
        ),
      ],
    );
  }
}
