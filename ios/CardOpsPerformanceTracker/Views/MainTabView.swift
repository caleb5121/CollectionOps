import SwiftUI

struct MainTabView: View {
    @Bindable var viewModel: DashboardViewModel
    @State private var selectedTab: AppTab = .dashboard

    var body: some View {
        TabView(selection: $selectedTab) {
            Tab("Dashboard", systemImage: "gauge.with.dots.needle.bottom.50percent", value: .dashboard) {
                DashboardView(viewModel: viewModel)
            }
            Tab("Upload", systemImage: "square.and.arrow.up", value: .upload) {
                UploadView(viewModel: viewModel)
            }
            Tab("Logistics", systemImage: "shippingbox", value: .logistics) {
                LogisticsView(viewModel: viewModel)
            }
            Tab("Insights", systemImage: "chart.line.uptrend.xyaxis", value: .insights) {
                InsightsView(viewModel: viewModel)
            }
            Tab("Settings", systemImage: "gearshape", value: .settings) {
                SettingsView(viewModel: viewModel)
            }
        }
        .toolbar(.hidden, for: .tabBar)
        .safeAreaInset(edge: .bottom, spacing: 0) {
            CustomTabBar(selectedTab: $selectedTab, accent: viewModel.selectedAccent)
        }
        .tint(viewModel.selectedAccent)
        .preferredColorScheme(.dark)
    }
}

private struct CustomTabBar: View {
    @Binding var selectedTab: AppTab
    let accent: Color

    private struct TabItem {
        let tab: AppTab
        let icon: String
        let label: String
    }

    private let items: [TabItem] = [
        TabItem(tab: .dashboard, icon: "gauge.with.dots.needle.bottom.50percent", label: "Dashboard"),
        TabItem(tab: .upload,    icon: "square.and.arrow.up",                     label: "Upload"),
        TabItem(tab: .logistics, icon: "shippingbox",                              label: "Logistics"),
        TabItem(tab: .insights,  icon: "chart.line.uptrend.xyaxis",               label: "Insights"),
        TabItem(tab: .settings,  icon: "gearshape",                               label: "Settings"),
    ]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(items, id: \.label) { item in
                let isActive = selectedTab == item.tab
                Button {
                    selectedTab = item.tab
                } label: {
                    VStack(spacing: 4) {
                        Image(systemName: item.icon)
                            .font(.system(size: 21, weight: isActive ? .semibold : .regular))
                            .foregroundStyle(isActive ? accent : Color.white.opacity(0.45))
                            .scaleEffect(isActive ? 1.12 : 1.0)
                            .shadow(
                                color: isActive ? accent.opacity(0.65) : .clear,
                                radius: isActive ? 7 : 0,
                                x: 0, y: 0
                            )
                            .animation(.easeOut(duration: 0.15), value: isActive)

                        Text(item.label)
                            .font(.system(size: 10, weight: isActive ? .semibold : .regular))
                            .foregroundStyle(isActive ? accent : Color.white.opacity(0.45))
                            .animation(.easeOut(duration: 0.15), value: isActive)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.horizontal, 4)
        .background(
            ZStack {
                Color(red: 0.10, green: 0.11, blue: 0.13)
                LinearGradient(
                    colors: [Color.white.opacity(0.04), Color.clear],
                    startPoint: .top,
                    endPoint: .bottom
                )
            }
            .overlay(
                Rectangle()
                    .fill(Color.white.opacity(0.07))
                    .frame(height: 0.5),
                alignment: .top
            )
        )
        .padding(.bottom, 0)
    }
}

enum AppTab: Hashable {
    case dashboard
    case upload
    case logistics
    case insights
    case settings
}
