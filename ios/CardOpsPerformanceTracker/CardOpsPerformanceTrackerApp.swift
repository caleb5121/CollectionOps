import SwiftUI

@main
struct CardOpsPerformanceTrackerApp: App {
    @State private var viewModel = DashboardViewModel()

    var body: some Scene {
        WindowGroup {
            MainTabView(viewModel: viewModel)
                .task { viewModel.loadSavedData() }
        }
    }
}
