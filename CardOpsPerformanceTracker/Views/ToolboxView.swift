import SwiftUI

struct ToolboxView: View {
    @Bindable var viewModel: DashboardViewModel

    var body: some View {
        LogisticsView(viewModel: viewModel)
    }
}
