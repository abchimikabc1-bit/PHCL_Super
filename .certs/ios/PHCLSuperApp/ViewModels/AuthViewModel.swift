import Foundation

@MainActor
final class AuthViewModel: ObservableObject {
    @Published var email = "admin@phclsuper.com"
    @Published var password = ""
    @Published var isAuthenticated = false
    @Published var isLoading = false
    @Published var errorMessage: String?

    func signIn() async {
        isLoading = true
        errorMessage = nil
        defer { isLoading = false }

        do {
            try await APIClient.shared.login(email: email, password: password)
            isAuthenticated = try await APIClient.shared.checkAuth()
        } catch {
            errorMessage = error.localizedDescription
        }
    }
}