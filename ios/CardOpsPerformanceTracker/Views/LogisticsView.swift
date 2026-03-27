import SwiftUI

struct LogisticsView: View {
    @Bindable var viewModel: DashboardViewModel
    @State private var editingProfile: ShippingProfile?
    @State private var dominantPulse: Bool = false
    @State private var lastDominantID: UUID?

    var body: some View {
        NavigationStack {
            ZStack {
                CardOpsTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        shippingProfilesSection
                        weeklyMixSection
                        blendedCostSection
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
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.addShippingProfile()
                        viewModel.saveShippingConfig()
                    } label: {
                        Image(systemName: "plus")
                    }
                    .disabled(viewModel.shippingConfig.profiles.count >= 10)
                    .foregroundStyle(viewModel.selectedAccent)
                }
            }
            .sheet(item: $editingProfile) { profile in
                ShippingProfileEditorView(profile: profile) { updated in
                    if let index = viewModel.shippingConfig.profiles.firstIndex(where: { $0.id == updated.id }) {
                        viewModel.shippingConfig.profiles[index] = updated
                        viewModel.shippingConfig.ensureValidMixes()
                        viewModel.saveShippingConfig()
                    }
                }
                .presentationDetents([.medium, .large])
                .presentationContentInteraction(.scrolls)
            }
            .onChange(of: viewModel.shippingConfig) { _, _ in
                viewModel.saveShippingConfig()
            }
            .onChange(of: viewModel.shippingConfig.dominantProfileID) { _, newValue in
                guard lastDominantID != nil, lastDominantID != newValue else {
                    lastDominantID = newValue
                    return
                }
                lastDominantID = newValue
                withAnimation(.easeOut(duration: 0.15)) {
                    dominantPulse = true
                }
                Task {
                    try? await Task.sleep(for: .milliseconds(150))
                    await MainActor.run {
                        withAnimation(.easeOut(duration: 0.15)) {
                            dominantPulse = false
                        }
                    }
                }
            }
            .task {
                lastDominantID = viewModel.shippingConfig.dominantProfileID
            }
        }
    }

    private var shippingProfilesSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Shipping Profiles")
                .font(.headline)
                .foregroundStyle(CardOpsTheme.textPrimary)

            ForEach(viewModel.shippingConfig.profiles) { profile in
                profileRow(profile)
            }
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private func profileRow(_ profile: ShippingProfile) -> some View {
        let isDominant = viewModel.shippingConfig.dominantProfileID == profile.id

        return HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(profile.name)
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(CardOpsTheme.textPrimary)
                Text(profile.averageCostPerShipment.formatted(.currency(code: "USD").precision(.fractionLength(2))))
                    .font(.title3.weight(.bold))
                    .foregroundStyle(CardOpsTheme.textPrimary)
                Text(profile.isActive ? "Active" : "Disabled")
                    .font(.caption)
                    .foregroundStyle(profile.isActive ? CardOpsTheme.momentum : CardOpsTheme.textTertiary)
            }

            Spacer()

            Menu {
                Button("Edit") {
                    editingProfile = profile
                }
                Button("Duplicate") {
                    viewModel.duplicateShippingProfile(id: profile.id)
                    viewModel.saveShippingConfig()
                }
                Button("Delete", role: .destructive) {
                    viewModel.deleteShippingProfile(id: profile.id)
                    viewModel.saveShippingConfig()
                }
            } label: {
                Image(systemName: "ellipsis.circle")
                    .font(.title3)
                    .foregroundStyle(CardOpsTheme.textSecondary)
                    .frame(width: 44, height: 44)
            }
        }
        .padding(12)
        .background(isDominant ? CardOpsTheme.panelBackgroundElevated.opacity(dominantPulse ? 1 : 0.9) : CardOpsTheme.panelBackgroundElevated.opacity(0.5))
        .clipShape(.rect(cornerRadius: 12))
        .scaleEffect(isDominant && dominantPulse ? 1.01 : 1)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .strokeBorder(isDominant ? viewModel.selectedAccent.opacity(0.5) : CardOpsTheme.panelBorder.opacity(0.6), lineWidth: 0.5)
        )
    }

    private var weeklyMixSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Weekly Mix")
                .font(.headline)
                .foregroundStyle(CardOpsTheme.textPrimary)

            ForEach(viewModel.shippingConfig.activeProfiles) { profile in
                let current = viewModel.shippingConfig.weeklyMixPercentages[profile.id] ?? 0
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text(profile.name)
                            .font(.subheadline)
                            .foregroundStyle(CardOpsTheme.textSecondary)
                        Spacer()
                        Text("\(Int(current.rounded()))%")
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(CardOpsTheme.textPrimary)
                    }

                    GeometryReader { geo in
                        let width = max(0, min(geo.size.width, geo.size.width * (current / 100)))
                        ZStack(alignment: .leading) {
                            RoundedRectangle(cornerRadius: 7)
                                .fill(CardOpsTheme.panelBackgroundElevated)
                            RoundedRectangle(cornerRadius: 7)
                                .fill(viewModel.selectedAccent.opacity(0.85))
                                .frame(width: width)
                        }
                    }
                    .frame(height: 14)

                    Slider(value: Binding(
                        get: { current },
                        set: { viewModel.setMixPercentage(for: profile.id, percentage: $0) }
                    ), in: 0...100, step: 1)
                    .tint(viewModel.selectedAccent)
                }
                .padding(.vertical, 4)
            }
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private var blendedCostSection: some View {
        VStack(spacing: 8) {
            Text("Blended Shipping Cost")
                .font(.subheadline)
                .foregroundStyle(CardOpsTheme.textSecondary)
            Text(viewModel.shippingConfig.blendedShippingCost.formatted(.currency(code: "USD").precision(.fractionLength(2))))
                .font(.system(size: 38, weight: .bold, design: .default))
                .foregroundStyle(CardOpsTheme.textPrimary)
            Text("Calculated from active profiles + weekly mix.")
                .font(.caption)
                .foregroundStyle(CardOpsTheme.textTertiary)

            Button("Reset Shipping Baseline") {
                viewModel.resetShippingBaseline()
                viewModel.saveShippingConfig()
            }
            .buttonStyle(.bordered)
            .tint(viewModel.selectedAccent)
            .padding(.top, 6)
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }
}

struct ShippingProfileEditorView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var profile: ShippingProfile
    let onSave: (ShippingProfile) -> Void

    init(profile: ShippingProfile, onSave: @escaping (ShippingProfile) -> Void) {
        self._profile = State(initialValue: profile)
        self.onSave = onSave
    }

    var body: some View {
        NavigationStack {
            Form {
                Section("Profile") {
                    TextField("Profile Name", text: $profile.name)
                    TextField("Avg Cost Per Shipment", value: $profile.averageCostPerShipment, format: .number.precision(.fractionLength(2)))
                        .keyboardType(.decimalPad)
                    Toggle("Active", isOn: $profile.isActive)
                }

                Section("Optional") {
                    TextField("Capacity", text: $profile.capacityNote)
                    TextField("Notes", text: $profile.notes, axis: .vertical)
                        .lineLimit(3...5)
                }

                Section("Advanced Breakdown") {
                    ForEach(profile.breakdown) { item in
                        HStack {
                            Text(item.name)
                            Spacer()
                            Text(item.cost.formatted(.currency(code: "USD").precision(.fractionLength(2))))
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        onSave(profile)
                        dismiss()
                    }
                }
            }
        }
    }
}
