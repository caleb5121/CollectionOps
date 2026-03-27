import SwiftUI

struct SettingsView: View {
    @Bindable var viewModel: DashboardViewModel
    @AppStorage("devModeEnabled") private var devModeEnabled: Bool = false
    @State private var showingClearConfirmation: Bool = false
    @State private var showingSimulator: Bool = false

    var body: some View {
        NavigationStack {
            ZStack {
                CardOpsTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        storageSection
                        actionsSection
                        helpSection
                        developerSection
                        aboutSection
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 12)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    CardOpsWordmark(accent: viewModel.selectedAccent)
                }
            }
            .confirmationDialog("Clear History", isPresented: $showingClearConfirmation, titleVisibility: .visible) {
                Button("Clear History", role: .destructive) {
                    viewModel.clearHistory()
                }
                Button("Cancel", role: .cancel) {}
            } message: {
                Text("This removes all stored weeks from this device.")
            }
            .sheet(isPresented: $showingSimulator) {
                TestSimulatorView(viewModel: viewModel)
            }
        }
    }

    private var storageSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Storage")
                .font(.headline)
                .foregroundStyle(CardOpsTheme.textPrimary)

            row(title: "Stored weeks", value: "\(viewModel.weeks.count)/52")
            row(title: "Location", value: "On this device")
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private var actionsSection: some View {
        VStack(spacing: 10) {
            Button {
                showingClearConfirmation = true
            } label: {
                HStack {
                    Text("Clear History")
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(CardOpsTheme.textPrimary)
                    Spacer()
                    Image(systemName: "trash")
                        .foregroundStyle(CardOpsTheme.textSecondary)
                }
                .padding(.horizontal, 16)
                .frame(height: 48)
                .background(CardOpsTheme.panelBackground)
                .clipShape(.rect(cornerRadius: 12))
            }
        }
    }

    private var helpSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Help & Metrics")
                .font(.headline)
                .foregroundStyle(CardOpsTheme.textPrimary)

            Text("Use Insights for short metric definitions and weekly signals.")
                .font(.subheadline)
                .foregroundStyle(CardOpsTheme.textSecondary)
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private var developerSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("Developer Mode")
                    .font(.headline)
                    .foregroundStyle(CardOpsTheme.textPrimary)
                Spacer()
                Toggle("", isOn: $devModeEnabled)
                    .labelsHidden()
                    .tint(viewModel.selectedAccent)
            }

            if devModeEnabled {
                Button {
                    showingSimulator = true
                } label: {
                    HStack {
                        Text("Testing Simulator")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(CardOpsTheme.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(CardOpsTheme.textTertiary)
                    }
                    .padding(.horizontal, 14)
                    .frame(height: 44)
                    .background(CardOpsTheme.panelBackgroundElevated)
                    .clipShape(.rect(cornerRadius: 10))
                }
            }
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private var aboutSection: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("About")
                .font(.headline)
                .foregroundStyle(CardOpsTheme.textPrimary)
            Text("CardOps 2.0")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textSecondary)
            Text("Performance control panel for small TCG sellers.")
                .font(.subheadline)
                .foregroundStyle(CardOpsTheme.textTertiary)
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private func row(title: String, value: String) -> some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(CardOpsTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textPrimary)
        }
    }
}
