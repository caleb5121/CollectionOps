import SwiftUI
import UniformTypeIdentifiers

struct UploadView: View {
    @Bindable var viewModel: DashboardViewModel

    var body: some View {
        NavigationStack {
            ZStack {
                CardOpsTheme.background
                    .ignoresSafeArea()

                ScrollView {
                    VStack(alignment: .leading, spacing: 24) {
                        header
                        uploadTargetCard
                        uploadActionsCard
                        if viewModel.isImporting {
                            importProgressCard
                        }
                        if viewModel.uploadSuccess {
                            successCard
                        }
                        recentUploadsCard
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
            .fileImporter(
                isPresented: $viewModel.showingFilePicker,
                allowedContentTypes: [
                    UTType(filenameExtension: "csv") ?? .commaSeparatedText,
                    UTType(filenameExtension: "xlsx") ?? .data
                ],
                allowsMultipleSelection: false
            ) { result in
                if case .success(let urls) = result, let url = urls.first {
                    viewModel.handleFileImport(result: .success(url))
                } else if case .failure(let error) = result {
                    viewModel.handleFileImport(result: .failure(error))
                }
            }
            .fileImporter(
                isPresented: $viewModel.showingHistoryFilePicker,
                allowedContentTypes: [
                    UTType(filenameExtension: "csv") ?? .commaSeparatedText,
                    UTType(filenameExtension: "xlsx") ?? .data
                ],
                allowsMultipleSelection: false
            ) { result in
                if case .success(let urls) = result, let url = urls.first {
                    viewModel.handleHistoryImport(result: .success(url))
                } else if case .failure(let error) = result {
                    viewModel.handleHistoryImport(result: .failure(error))
                }
            }
            .alert("Error", isPresented: .init(get: { viewModel.errorMessage != nil }, set: { if !$0 { viewModel.errorMessage = nil } })) {
                Button("OK") { viewModel.errorMessage = nil }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
            .confirmationDialog("Week already exists for this game.", isPresented: $viewModel.showingDuplicatePrompt, titleVisibility: .visible) {
                Button("Overwrite") { viewModel.confirmOverwritePendingImport() }
                Button("Cancel", role: .cancel) { viewModel.cancelPendingImport() }
            } message: {
                Text("Overwrite or Cancel.")
            }
            .confirmationDialog(
                "\(viewModel.pendingImportConflictCount) week(s) overlap with existing data for this game.",
                isPresented: $viewModel.showingImportConflictPrompt,
                titleVisibility: .visible
            ) {
                Button("Overwrite Overlapping Weeks") { viewModel.confirmImportOverwrite() }
                Button("Cancel Import", role: .cancel) { viewModel.cancelImportOverwrite() }
            } message: {
                Text("Overwrite overlapping weeks or cancel the import.")
            }
            .sheet(isPresented: $viewModel.showingImportSummary) {
                ImportSummaryView(viewModel: viewModel)
                    .presentationDetents([.medium, .large])
                    .presentationContentInteraction(.scrolls)
            }
        }
    }

    private var header: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text("Upload")
                .font(.title2.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textPrimary)
            Text("Select a specific game, then import orders data.")
                .font(.subheadline)
                .foregroundStyle(CardOpsTheme.textSecondary)
        }
    }

    private var uploadTargetCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Upload to")
                .font(.subheadline.weight(.medium))
                .foregroundStyle(CardOpsTheme.textSecondary)

            Picker("Upload Game", selection: $viewModel.selectedUploadGame) {
                ForEach(viewModel.gameUploadOptions, id: \.self) { game in
                    Text(game).tag(game)
                }
            }
            .pickerStyle(.menu)
            .tint(viewModel.selectedAccent)
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private var uploadActionsCard: some View {
        VStack(spacing: 12) {
            Button {
                viewModel.showingFilePicker = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "doc.badge.plus")
                        .font(.subheadline.weight(.semibold))
                    Text("Upload Weekly Export")
                        .font(.headline)
                }
                .frame(maxWidth: .infinity)
                .frame(height: 50)
            }
            .buttonStyle(.borderedProminent)
            .tint(viewModel.selectedAccent)
            .disabled(viewModel.isImporting)

            Button {
                viewModel.showingHistoryFilePicker = true
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "clock.arrow.circlepath")
                        .font(.subheadline.weight(.semibold))
                    Text("Import Full History CSV")
                        .font(.subheadline.weight(.semibold))
                }
                .foregroundStyle(viewModel.selectedAccent)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(viewModel.selectedAccent.opacity(0.1))
                .clipShape(.rect(cornerRadius: 12))
            }
            .disabled(viewModel.isImporting)

            Text("Weekly: 7-day export only. History: any date range, auto-segmented into weeks.")
                .font(.caption)
                .foregroundStyle(CardOpsTheme.textTertiary)
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private var importProgressCard: some View {
        VStack(spacing: 14) {
            HStack(spacing: 10) {
                ProgressView()
                    .tint(viewModel.selectedAccent)
                Text(viewModel.importPhase.label)
                    .font(.subheadline.weight(.medium))
                    .foregroundStyle(CardOpsTheme.textPrimary)
                Spacer()
            }

            ProgressView(value: viewModel.importPhase.progress)
                .tint(viewModel.selectedAccent)

            Text("Do not close the app during import.")
                .font(.caption)
                .foregroundStyle(CardOpsTheme.textTertiary)
        }
        .padding(16)
        .background(CardOpsTheme.panelBackgroundElevated)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(viewModel.selectedAccent.opacity(0.3), lineWidth: 0.5))
    }

    private var successCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Saved")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textSecondary)
            Text(viewModel.uploadMessage ?? "")
                .font(.subheadline)
                .foregroundStyle(CardOpsTheme.textPrimary)
            Text("Stored locally on this device.")
                .font(.caption)
                .foregroundStyle(CardOpsTheme.textTertiary)
        }
        .padding(16)
        .background(CardOpsTheme.panelBackgroundElevated)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }

    private var recentUploadsCard: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Recent Uploads")
                .font(.subheadline.weight(.semibold))
                .foregroundStyle(CardOpsTheme.textPrimary)

            if viewModel.recentUploads.isEmpty {
                Text("No uploads yet")
                    .font(.subheadline)
                    .foregroundStyle(CardOpsTheme.textTertiary)
            } else {
                ForEach(viewModel.recentUploads) { week in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(week.game)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(CardOpsTheme.textPrimary)
                            HStack(spacing: 4) {
                                Text(week.weekLabel)
                                    .font(.caption)
                                    .foregroundStyle(CardOpsTheme.textTertiary)
                                if week.isPartial {
                                    Text("PARTIAL")
                                        .font(.system(size: 8, weight: .bold))
                                        .foregroundStyle(CardOpsTheme.efficiencyAmber)
                                        .padding(.horizontal, 4)
                                        .padding(.vertical, 1)
                                        .background(CardOpsTheme.efficiencyAmber.opacity(0.12))
                                        .clipShape(.rect(cornerRadius: 3))
                                }
                            }
                        }
                        Spacer()
                        Text(week.totalRevenue.formatted(.currency(code: "USD").precision(.fractionLength(2))))
                            .font(.subheadline.weight(.semibold))
                            .foregroundStyle(CardOpsTheme.textSecondary)
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .padding(16)
        .background(CardOpsTheme.panelBackground)
        .clipShape(.rect(cornerRadius: 14))
        .overlay(RoundedRectangle(cornerRadius: 14).strokeBorder(CardOpsTheme.panelBorder, lineWidth: 0.5))
    }
}
