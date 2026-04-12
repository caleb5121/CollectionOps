import SwiftUI

struct GuidesView: View {
    var body: some View {
        NavigationStack {
            ZStack {
                CardOpsTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 16) {
                        guideSection(
                            title: "How to Upload",
                            items: [
                                "Go to TCGplayer Seller Portal",
                                "Navigate to Orders > Export",
                                "Select a 7-day date range",
                                "Filter: Shipped + Delivered orders",
                                "Download as CSV",
                                "Open CardOps and tap Upload Data",
                                "Select your exported file"
                            ]
                        )

                        guideSection(
                            title: "What is Momentum?",
                            items: [
                                "Measures your activity trend within a single week",
                                "Compares first 3 days vs last 3 days",
                                "Blends order growth and revenue growth",
                                "Higher score means increasing activity toward end of week",
                                "50 is neutral - no change in trend"
                            ]
                        )

                        guideSection(
                            title: "What is Flow?",
                            items: [
                                "Compares your current week to your historical baseline",
                                "Requires at least 2 weeks of uploaded data",
                                "Measures deviation in orders and revenue from your average",
                                "Higher score means performing above your baseline",
                                "50 is neutral - matching your historical average"
                            ]
                        )

                        guideSection(
                            title: "What is Efficiency?",
                            items: [
                                "Measures structural coherence of your operations",
                                "Looks at AOV consistency across the week",
                                "Checks correlation between orders and revenue",
                                "Optionally factors in shipping cost ratios",
                                "Higher score means tighter operational structure"
                            ]
                        )

                        guideSection(
                            title: "How Shipping Affects Efficiency",
                            items: [
                                "Set up shipping profiles in the Toolbox",
                                "Configure PWE and Bubble Mailer costs",
                                "Set your weekly shipping mix percentage",
                                "Blended shipping cost feeds into Efficiency",
                                "If not configured, Efficiency ignores shipping"
                            ]
                        )
                    }
                    .padding(.horizontal, 16)
                    .padding(.bottom, 32)
                    .padding(.top, 8)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .principal) {
                    Text("Guides")
                        .font(.headline)
                        .foregroundStyle(CardOpsTheme.textPrimary)
                }
            }
        }
    }

    private func guideSection(title: String, items: [String]) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textPrimary)

            VStack(alignment: .leading, spacing: 6) {
                ForEach(Array(items.enumerated()), id: \.offset) { _, item in
                    HStack(alignment: .top, spacing: 8) {
                        Circle()
                            .fill(CardOpsTheme.textTertiary)
                            .frame(width: 4, height: 4)
                            .padding(.top, 7)
                        Text(item)
                            .font(.subheadline)
                            .foregroundStyle(CardOpsTheme.textSecondary)
                    }
                }
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(
            RoundedRectangle(cornerRadius: 14)
                .strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5)
        )
    }
}
