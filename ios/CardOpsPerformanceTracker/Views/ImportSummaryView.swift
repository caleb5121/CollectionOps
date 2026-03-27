import SwiftUI

struct ImportSummaryView: View {
    @Bindable var viewModel: DashboardViewModel
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ZStack {
                CardOpsTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        statusBadge
                        if let summary = viewModel.importSummary {
                            summaryCard(summary)
                            statsGrid(summary)
                            actionsCard
                        }
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, 16)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Import Summary")
                        .font(.headline)
                        .foregroundStyle(CardOpsTheme.textPrimary)
                }
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") {
                        viewModel.dismissImportSummary()
                        dismiss()
                    }
                    .foregroundStyle(CardOpsTheme.textSecondary)
                }
            }
        }
    }

    private var statusBadge: some View {
        HStack(spacing: 10) {
            Image(systemName: "checkmark.circle.fill")
                .font(.title2)
                .foregroundStyle(CardOpsTheme.momentum)
            Text("Import Complete")
                .font(.title3.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textPrimary)
        }
        .frame(maxWidth: .infinity)
        .padding(16)
        .background(CardOpsTheme.momentum.opacity(0.08))
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(CardOpsTheme.momentum.opacity(0.2), lineWidth: 0.5))
    }

    private func summaryCard(_ summary: ImportSummary) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            summaryRow("Game", value: summary.game)
            summaryRow("Date Range", value: summary.dateRangeLabel)
            summaryRow("Total Orders", value: "\(summary.totalOrdersImported)")
            summaryRow("Total Revenue", value: summary.totalRevenueImported.formatted(.currency(code: "USD").precision(.fractionLength(2))))
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private func statsGrid(_ summary: ImportSummary) -> some View {
        VStack(spacing: 12) {
            HStack(spacing: 12) {
                statBlock(
                    label: "Weeks Created",
                    value: "\(summary.weeksCreated)",
                    color: CardOpsTheme.flow
                )
                statBlock(
                    label: "Partial Weeks",
                    value: "\(summary.partialWeeksCount)",
                    color: CardOpsTheme.efficiency
                )
            }
            HStack(spacing: 12) {
                statBlock(
                    label: "Duplicates Removed",
                    value: "\(summary.duplicatesRemoved)",
                    color: CardOpsTheme.textSecondary
                )
                statBlock(
                    label: "Overwritten",
                    value: "\(summary.overwrittenWeeks)",
                    color: CardOpsTheme.brandRed
                )
            }
        }
    }

    private func statBlock(label: String, value: String, color: Color) -> some View {
        VStack(spacing: 6) {
            Text(value)
                .font(.title2.weight(.bold))
                .foregroundStyle(color)
            Text(label)
                .font(.caption)
                .foregroundStyle(CardOpsTheme.textTertiary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 12))
        .overlay(RoundedRectangle(cornerRadius: 12).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private var actionsCard: some View {
        VStack(spacing: 10) {
            Button {
                viewModel.dismissImportSummary()
                dismiss()
            } label: {
                Text("View Dashboard")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
            }
            .buttonStyle(.borderedProminent)
            .tint(viewModel.selectedAccent)

            Button {
                viewModel.dismissImportSummary()
            } label: {
                Text("Import Another Game")
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(viewModel.selectedAccent)
                    .frame(maxWidth: .infinity)
                    .frame(height: 44)
                    .background(viewModel.selectedAccent.opacity(0.1))
                    .clipShape(.rect(cornerRadius: 12))
            }
        }
    }

    private func summaryRow(_ title: String, value: String) -> some View {
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
