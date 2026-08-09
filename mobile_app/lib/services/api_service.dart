import 'dart:convert';
import 'package:http/http.dart' as http;

/// Mobile API Service connecting Flutter app to Antigravity Backend Server
class MobileApiService {
  static const String baseUrl = 'http://localhost:3000/api';

  // 1. REGISTER USER
  static Future<Map<String, dynamic>> registerUser({
    required String email,
    required String password,
    required String displayName,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/register'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
        'displayName': displayName,
      }),
    );
    return jsonDecode(response.body);
  }

  // 2. LOGIN USER
  static Future<Map<String, dynamic>> loginUser({
    required String email,
    required String password,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': email,
        'password': password,
      }),
    );
    return jsonDecode(response.body);
  }

  // 3. FETCH MARKETPLACE PRODUCTS
  static Future<List<dynamic>> fetchMarketplaceProducts() async {
    final response = await http.get(Uri.parse('$baseUrl/marketplace/products'));
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      return data['data'] ?? [];
    }
    return [];
  }

  // 4. INITIATE PAYMENT (M-Pesa STK Push / PayPal / Card / Bank)
  static Future<Map<String, dynamic>> initiatePayment({
    required String listingId,
    required double amount,
    required String provider,
    required String phoneNumber,
    required String userUid,
  }) async {
    final response = await http.post(
      Uri.parse('$baseUrl/payments/initiate'),
      headers: {
        'Content-Type': 'application/json',
        'x-user-uid': userUid,
      },
      body: jsonEncode({
        'listingId': listingId,
        'amount': amount,
        'provider': provider,
        'phoneNumber': phoneNumber,
      }),
    );
    return jsonDecode(response.body);
  }
}
