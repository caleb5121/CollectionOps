import SwiftUI

struct DashboardView: View {
    @Bindable var viewModel: DashboardViewModel

    var body: some View {
        NavigationStack {
            ZStack {
                CardOpsTheme.background
                    .ignoresSafeArea()

                if viewModel.hasData {
                    ScrollView {
                        VStack(spacing: 20) {
                            header
                            if viewModel.currentWeekIsPartial {
                                partialWeekBanner
                            }
                            ringsSection
                            weeklyStatsSection
                            if viewModel.selectedDashboardGame == "All Games" {
                                breakdownSection
                            }
                            actionPulseSection
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                } else {
                    ContentUnavailableView("No Performance Data", systemImage: "square.stack.3d.up.slash")
                        .foregroundStyle(CardOpsTheme.textSecondary)
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

    private var header: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                if viewModel.availableGames.count > 2 {
                    Picker("Game", selection: $viewModel.selectedDashboardGame) {
                        ForEach(viewModel.availableGames, id: \.self) { game in
                            Text(game).tag(game)
                        }
                    }
                    .pickerStyle(.menu)
                    .tint(viewModel.selectedAccent)
                }
                Spacer()
                if viewModel.isSimulationMode {
                    Text("Simulation Mode")
                        .font(.caption2.weight(.semibold))
                        .foregroundStyle(CardOpsTheme.brandRed)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 5)
                        .background(CardOpsTheme.brandRed.opacity(0.12))
                        .clipShape(.capsule)
                }
            }
        }
    }

    private var ringsSection: some View {
        HStack(spacing: 6) {
            GaugeRingView(
                value: viewModel.momentum,
                label: "Momentum",
                subLabel: "vs early week",
                color: CardOpsTheme.momentum,
                delta: viewModel.momentumDelta
            )
            GaugeRingView(
                value: viewModel.flow ?? 0,
                label: "Flow",
                subLabel: "vs baseline",
                color: CardOpsTheme.flow,
                delta: viewModel.flowDelta,
                locked: viewModel.flowLocked,
                lockedMessage: "Building baseline"
            )
            GaugeRingView(
                value: viewModel.efficiency,
                label: "Efficiency",
                subLabel: "structure",
                color: CardOpsTheme.efficiency,
                delta: viewModel.efficiencyDelta
            )
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 18)
        .background(
            ZStack {
                CardOpsTheme.panelBackground
                LinearGradient(
                    colors: [Color.white.opacity(0.03), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        )
        .clipShape(.rect(cornerRadius: 18))
        .overlay(
            RoundedRectangle(cornerRadius: 18)
                .strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.4), radius: 12, x: 0, y: 6)
    }

    private var weeklyStatsSection: some View {
        VStack(spacing: 0) {
            statRow(
                title: "Weekly Orders",
                value: "\(viewModel.currentWeek?.totalOrders ?? 0)",
                delta: viewModel.ordersDelta,
                accentColor: CardOpsTheme.efficiencyAmber
            )
            Divider()
                .background(CardOpsTheme.panelBorder)
                .padding(.leading, 16)
            statRow(
                title: "Revenue",
                value: (viewModel.currentWeek?.totalRevenue ?? 0).formatted(.currency(code: "USD").precision(.fractionLength(2))),
                delta: viewModel.revenueDelta,
                accentColor: CardOpsTheme.momentum
            )
            Divider()
                .background(CardOpsTheme.panelBorder)
                .padding(.leading, 16)
            statRow(
                title: "AOV",
                value: (viewModel.currentWeek?.averageOrderValue ?? 0).formatted(.currency(code: "USD").precision(.fractionLength(2))),
                delta: viewModel.aovDelta,
                accentColor: Color(red: 0.38, green: 0.82, blue: 0.90)
            )
        }
        .background(
            ZStack {
                Color(red: 0.14, green: 0.16, blue: 0.20)
                LinearGradient(
                    colors: [Color.white.opacity(0.025), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 4)
    }

    private func statRow(title: String, value: String, delta: Double, accentColor: Color) -> some View {
        HStack(spacing: 0) {
            Rectangle()
                .fill(accentColor)
                .frame(width: 3)
                .clipShape(.rect(topLeadingRadius: 3, bottomLeadingRadius: 3))

            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text(title)
                        .font(.caption)
                        .foregroundStyle(CardOpsTheme.textTertiary)
                    Text(value)
                        .font(.title3.weight(.bold))
                        .foregroundStyle(CardOpsTheme.textPrimary)
                }
                Spacer()
                Text("\(delta >= 0 ? "+" : "")\(delta, specifier: "%.1f")%")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(delta >= 0 ? CardOpsTheme.momentum : CardOpsTheme.brandRed)
            }
            .padding(.horizontal, 14)
            .padding(.vertical, 13)
        }
    }

    private var breakdownSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("This Week by Game")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textPrimary)

            ForEach(viewModel.miniBreakdown, id: \.game) { row in
                HStack {
                    Text(row.game)
                        .font(.subheadline)
                        .foregroundStyle(CardOpsTheme.textSecondary)
                    Spacer()
                    Text(row.revenue.formatted(.currency(code: "USD").precision(.fractionLength(2))))
                        .font(.subheadline.weight(.semibold))
                        .foregroundStyle(CardOpsTheme.textPrimary)
                }
            }
        }
        .padding(16)
        .background(
            ZStack {
                Color(red: 0.14, green: 0.16, blue: 0.20)
                LinearGradient(
                    colors: [Color.white.opacity(0.025), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
        )
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.3), radius: 8, x: 0, y: 4)
    }

    private var partialWeekBanner: some View {
        HStack(spacing: 7) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(CardOpsTheme.efficiencyAmber)
            Text("Current week is partial - deltas suppressed")
                .font(.caption)
                .foregroundStyle(CardOpsTheme.textSecondary)
            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 9)
        .background(.ultraThinMaterial)
        .background(CardOpsTheme.efficiencyAmber.opacity(0.06))
        .clipShape(.rect(cornerRadius: 10))
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .strokeBorder(CardOpsTheme.efficiencyAmber.opacity(0.35), lineWidth: 1)
        )
    }

    private var actionPulseSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack(spacing: 8) {
                Image(systemName: "dot.radiowaves.left.and.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(CardOpsTheme.textTertiary)
                Text("Action Pulse")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(CardOpsTheme.textPrimary)
            }

            Rectangle()
                .fill(CardOpsTheme.panelBorder)
                .frame(height: 1)

            Text(viewModel.actionPulse)
                .font(.subheadline)
                .foregroundStyle(CardOpsTheme.textSecondary)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 13)
        .background(Color(red: 0.12, green: 0.13, blue: 0.16))
        .clipShape(.rect(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5)
        )
        .shadow(color: Color.black.opacity(0.35), radius: 8, x: 0, y: 4)
    }
}
