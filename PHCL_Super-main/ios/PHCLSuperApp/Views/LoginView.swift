import SwiftUI

struct LoginView: View {
    @StateObject private var vm = AuthViewModel()

    var body: some View {
        VStack(spacing: 12) {
            Text("PHCL Admin").font(.title2).bold()

            TextField("Email", text: $vm.email)
                .textInputAutocapitalization(.never)
                .autocorrectionDisabled()
                .textFieldStyle(.roundedBorder)

            SecureField("Password", text: $vm.password)
                .textFieldStyle(.roundedBorder)

            Button(vm.isLoading ? "Loading..." : "Login") {
                Task { await vm.signIn() }
            }
            .buttonStyle(.borderedProminent)
            .disabled(vm.isLoading || vm.password.isEmpty)

            if let err = vm.errorMessage {
                Text(err).foregroundColor(.red).font(.caption)
            }

            if vm.isAuthenticated {
                Text("Logged in successfully").foregroundColor(.green)
            }
        }
        .padding()
    }
}