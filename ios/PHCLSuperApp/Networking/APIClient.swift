import Foundation

final class APIClient {
    static let shared = APIClient()
    private init() {}

    // Badilisha kwa URL ya backend yako
    private let baseURL = URL(string: "http://localhost:3000")!

    func login(email: String, password: String) async throws {
        let url = baseURL.appendingPathComponent("api/admin/auth")
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        req.httpBody = try JSONSerialization.data(withJSONObject: [
            "email": email,
            "password": password
        ])
        _ = try await URLSession.shared.data(for: req)
    }

    func checkAuth() async throws -> Bool {
        let url = baseURL.appendingPathComponent("api/admin/auth")
        let (_, response) = try await URLSession.shared.data(from: url)
        guard let http = response as? HTTPURLResponse else { return false }
        return http.statusCode == 200
    }
}