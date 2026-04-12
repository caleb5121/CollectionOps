import SwiftUI

struct TestSimulatorView: View {
    @Bindable var viewModel: DashboardViewModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedScenario: Int? = nil
    @State private var isLoadingRealData: Bool = false
    @State private var realDataMessage: String? = nil
    @State private var realDataLoaded: Bool = false

    var body: some View {
        NavigationStack {
            ZStack {
                CardOpsTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        headerNote
                        realDataSection
                        scenariosStack
                        if viewModel.isSimulationMode {
                            scoreOutputSection
                            exitButton
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 40)
                    .padding(.top, 12)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    HStack(spacing: 6) {
                        Image(systemName: "flask.fill")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(CardOpsTheme.brandRed)
                        Text("Testing Simulator")
                            .font(.headline)
                            .foregroundStyle(CardOpsTheme.textPrimary)
                    }
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                        .foregroundStyle(CardOpsTheme.textSecondary)
                }
            }
        }
    }

    private var headerNote: some View {
        HStack(spacing: 10) {
            Image(systemName: "info.circle")
                .font(.system(size: 13))
                .foregroundStyle(CardOpsTheme.flowBlue.opacity(0.8))
            Text("Load a scenario to validate scoring behavior. Your live data is not modified.")
                .font(.system(size: 12))
                .foregroundStyle(CardOpsTheme.textTertiary)
                .lineSpacing(1.5)
        }
        .padding(14)
        .background(CardOpsTheme.flowBlue.opacity(0.07))
        .clipShape(.rect(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(CardOpsTheme.flowBlue.opacity(0.2), lineWidth: 0.5)
        )
    }

    private var realDataSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("REAL DATA")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(CardOpsTheme.textTertiary)
                .kerning(1.2)

            Button {
                guard !isLoadingRealData else { return }
                isLoadingRealData = true
                realDataMessage = nil
                Task {
                    let error = await viewModel.loadRealSalesData()
                    isLoadingRealData = false
                    if let error {
                        realDataMessage = error
                        realDataLoaded = false
                    } else {
                        realDataLoaded = true
                        realDataMessage = nil
                        selectedScenario = nil
                        dismiss()
                    }
                }
            } label: {
                HStack(spacing: 10) {
                    if isLoadingRealData {
                        ProgressView()
                            .tint(CardOpsTheme.brandRed)
                            .scaleEffect(0.85)
                    } else {
                        Image(systemName: realDataLoaded ? "checkmark.circle.fill" : "tray.and.arrow.down.fill")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(realDataLoaded ? CardOpsTheme.momentumGreen : CardOpsTheme.brandRed)
                    }
                    VStack(alignment: .leading, spacing: 2) {
                        Text(realDataLoaded ? "Sales Data Loaded" : "Load My Sales Data")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(CardOpsTheme.textPrimary)
                        Text("Mar 4 – May 14, 2025 · Pokémon · ~10 weeks")
                            .font(.system(size: 11))
                            .foregroundStyle(CardOpsTheme.textTertiary)
                    }
                    Spacer()
                    if !isLoadingRealData {
                        Image(systemName: "chevron.right")
                            .font(.system(size: 11, weight: .medium))
                            .foregroundStyle(CardOpsTheme.textTertiary)
                    }
                }
                .padding(14)
                .background(CardOpsTheme.panelBackground)
                .clipShape(.rect(cornerRadius: 14))
                .overlay(
                    RoundedRectangle(cornerRadius: 14)
                        .strokeBorder(
                            realDataLoaded ? CardOpsTheme.momentumGreen.opacity(0.4) : CardOpsTheme.brandRed.opacity(0.3),
                            lineWidth: realDataLoaded ? 1 : 0.5
                        )
                )
            }

            if let msg = realDataMessage {
                Text(msg)
                    .font(.system(size: 11))
                    .foregroundStyle(CardOpsTheme.brandRed)
                    .padding(.horizontal, 4)
            }
        }
    }

    private var scenariosStack: some View {
        VStack(spacing: 12) {
            scenarioButton(
                index: 1,
                title: "Scenario 1",
                subtitle: "Small Seller - PWE only",
                detail: "5 orders/wk · ~$31 revenue · 100% PWE",
                expected: "Momentum ≈ 50, Flow active & high, Efficiency moderate"
            ) {
                viewModel.loadScenario1()
                selectedScenario = 1
            }

            scenarioButton(
                index: 2,
                title: "Scenario 2",
                subtitle: "Mid Seller - Mixed shipping",
                detail: "31 orders/wk · ~$475 revenue · 80% PWE / 20% pkg",
                expected: "Momentum depends on late-week, Flow moderate/high, Efficiency high"
            ) {
                viewModel.loadScenario2()
                selectedScenario = 2
            }

            scenarioButton(
                index: 3,
                title: "Scenario 3",
                subtitle: "Large Seller - Bulk + big cards",
                detail: "167 orders/wk · ~$4,270 revenue · 70% PWE / 30% pkg",
                expected: "Momentum >50 (late surge), Flow may drop, Efficiency lower (AOV spikes)"
            ) {
                viewModel.loadScenario3()
                selectedScenario = 3
            }
        }
    }

    private func scenarioButton(
        index: Int,
        title: String,
        subtitle: String,
        detail: String,
        expected: String,
        action: @escaping () -> Void
    ) -> some View {
        let isActive = viewModel.isSimulationMode && selectedScenario == index

        return Button(action: action) {
            VStack(alignment: .leading, spacing: 10) {
                HStack(alignment: .top) {
                    VStack(alignment: .leading, spacing: 3) {
                        HStack(spacing: 8) {
                            Text(title)
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(CardOpsTheme.textPrimary)
                            if isActive {
                                Text("ACTIVE")
                                    .font(.system(size: 9, weight: .bold))
                                    .foregroundStyle(CardOpsTheme.brandRed)
                                    .kerning(0.5)
                                    .padding(.horizontal, 5)
                                    .padding(.vertical, 2)
                                    .background(CardOpsTheme.brandRed.opacity(0.12))
                                    .clipShape(.rect(cornerRadius: 3))
                            }
                        }
                        Text(subtitle)
                            .font(.system(size: 12, weight: .medium))
                            .foregroundStyle(CardOpsTheme.textSecondary)
                    }
                    Spacer()
                    Image(systemName: "play.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(isActive ? CardOpsTheme.brandRed : CardOpsTheme.textTertiary)
                        .padding(7)
                        .background((isActive ? CardOpsTheme.brandRed : CardOpsTheme.panelBorder).opacity(0.12))
                        .clipShape(Circle())
                }

                Text(detail)
                    .font(.system(size: 11))
                    .foregroundStyle(CardOpsTheme.textTertiary)

                HStack(spacing: 4) {
                    Image(systemName: "checkmark.circle")
                        .font(.system(size: 10))
                        .foregroundStyle(CardOpsTheme.momentumGreen.opacity(0.7))
                    Text(expected)
                        .font(.system(size: 10))
                        .foregroundStyle(CardOpsTheme.textTertiary)
                        .lineSpacing(1.5)
                }
                .padding(8)
                .background(CardOpsTheme.momentumGreen.opacity(0.05))
                .clipShape(.rect(cornerRadius: 6))
            }
            .padding(14)
            .background(CardOpsTheme.panelBackground)
            .clipShape(.rect(cornerRadius: 14))
            .overlay(
                RoundedRectangle(cornerRadius: 14)
                    .strokeBorder(
                        isActive ? CardOpsTheme.brandRed.opacity(0.5) : CardOpsTheme.panelBorder.opacity(0.6),
                        lineWidth: isActive ? 1 : 0.5
                    )
            )
        }
    }

    private var scoreOutputSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("COMPUTED SCORES")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(CardOpsTheme.textTertiary)
                .kerning(1.2)

            HStack(spacing: 10) {
                scoreCard(
                    label: "Momentum",
                    value: Int(viewModel.momentum),
                    color: CardOpsTheme.momentumGreen,
                    sub: "vs early week"
                )
                scoreCard(
                    label: "Flow",
                    value: viewModel.flowLocked ? nil : viewModel.flow.map { Int($0) },
                    color: CardOpsTheme.flowBlue,
                    sub: viewModel.flowLocked ? "locked" : "vs baseline"
                )
                scoreCard(
                    label: "Efficiency",
                    value: Int(viewModel.efficiency),
                    color: CardOpsTheme.efficiencyAmber,
                    sub: "structure"
                )
            }
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .strokeBorder(CardOpsTheme.panelBorder.opacity(0.6), lineWidth: 0.5)
        )
    }

    private func scoreCard(label: String, value: Int?, color: Color, sub: String) -> some View {
        VStack(spacing: 5) {
            if let v = value {
                Text("\(v)")
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundStyle(color)
            } else {
                Text("-")
                    .font(.system(size: 28, weight: .heavy, design: .rounded))
                    .foregroundStyle(CardOpsTheme.textTertiary)
            }
            Text(label)
                .font(.system(size: 10, weight: .semibold))
                .foregroundStyle(color.opacity(0.8))
                .kerning(0.3)
            Text(sub)
                .font(.system(size: 9))
                .foregroundStyle(CardOpsTheme.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 12)
        .background(color.opacity(0.06))
        .clipShape(.rect(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(color.opacity(0.15), lineWidth: 0.5)
        )
    }

    private var exitButton: some View {
        Button {
            viewModel.exitSimulation()
            selectedScenario = nil
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "arrow.uturn.backward")
                    .font(.system(size: 13, weight: .medium))
                Text("Back to Live Data")
                    .font(.subheadline.weight(.medium))
            }
            .foregroundStyle(CardOpsTheme.textSecondary)
            .frame(maxWidth: .infinity)
            .frame(height: 44)
            .background(CardOpsTheme.panelBackground)
            .clipShape(.rect(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .strokeBorder(CardOpsTheme.panelBorder.opacity(0.6), lineWidth: 0.5)
            )
        }
    }
}
