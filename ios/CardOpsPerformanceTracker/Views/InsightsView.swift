import SwiftUI

struct InsightsView: View {
    @Bindable var viewModel: DashboardViewModel
    @State private var showMetricHelp: Bool = false

    var body: some View {
        NavigationStack {
            ZStack {
                CardOpsTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 24) {
                        snapshotSection
                        signalsSection
                        metricHelpSection
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
        }
    }

    private var snapshotSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Weekly Snapshot")
                .font(.headline)
                .foregroundStyle(CardOpsTheme.textPrimary)

            metricRow("Revenue Δ", value: signedValue(viewModel.revenueDelta, decimals: 1, suffix: "%"))
            metricRow("Orders Δ", value: signedValue(viewModel.ordersDelta, decimals: 1, suffix: "%"))
            metricRow("Efficiency Δ", value: signedValue(viewModel.efficiencyDelta, decimals: 0, suffix: ""))
            metricRow("Top Game", value: viewModel.topGame)
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private func metricRow(_ title: String, value: String) -> some View {
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

    private var signalsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Operational Signals")
                .font(.headline)
                .foregroundStyle(CardOpsTheme.textPrimary)

            ForEach(viewModel.insightSignals.prefix(4), id: \.self) { signal in
                Text(signal)
                    .font(.subheadline)
                    .foregroundStyle(CardOpsTheme.textSecondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.vertical, 6)
            }
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private var metricHelpSection: some View {
        DisclosureGroup(isExpanded: $showMetricHelp) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Momentum: Direction of activity inside this week.")
                Text("Flow: Consistency versus your own baseline.")
                Text("Efficiency: Structural coherence of orders and revenue.")
            }
            .font(.subheadline)
            .foregroundStyle(CardOpsTheme.textSecondary)
            .padding(.top, 8)
        } label: {
            Text("Understanding Your Metrics")
                .font(.headline)
                .foregroundStyle(CardOpsTheme.textPrimary)
        }
        .tint(viewModel.selectedAccent)
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 16))
        .overlay(RoundedRectangle(cornerRadius: 16).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private func signedValue(_ value: Double, decimals: Int, suffix: String) -> String {
        let number = value.formatted(.number.precision(.fractionLength(decimals)))
        let sign = value >= 0 ? "+" : ""
        return "\(sign)\(number)\(suffix)"
    }
}
